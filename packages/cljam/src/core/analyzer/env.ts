/**
 * cljam analyzer — analysis environment + capture/upvalue machinery.
 *
 * Two layers, kept deliberately distinct:
 *
 *   - `NodeEnv` is the immutable-by-discipline snapshot threaded through the
 *     resolve pass and stamped on every node. A new one is created only when
 *     scope changes (new locals, entering a fn, changing recur target). Nodes in
 *     the same scope share it by reference (cheap in JS). `context` defaults to
 *     'expr' during resolve and is refined per-node by the context pass.
 *
 *   - `ClosureScope` is the mutable accumulation cell for ONE function's upvalue
 *     table. It is shared by reference across all arity-methods of that function,
 *     which is exactly what we want — after analysis the table holds the
 *     function's capture set, and a closure object has ONE upvalue array read by
 *     every arity chunk. This mirrors `VmCompileEnv`'s `upvalueDescriptors` +
 *     `resolveUpvalue` in `vm/compiler.ts`, so the descriptors map 1:1 onto
 *     `VmUpvalueDescriptor` for Phase 1.
 *
 *   - `SlotCounter` is the per-arity slot space. It is deliberately NOT shared
 *     across arities: the runtime calling convention puts call args in slots
 *     `0..n-1` of a fresh frame for whichever arity is invoked, and `FnRecur`
 *     reuses those slots, so each arity-method must number its locals from 0.
 *     This mirrors the VM compiling each arity with a fresh `nextLocalSlot`.
 *
 * `LocalBinding.cell.captured` is a mutable cell so that when a deeply nested
 * thunk captures a binding, the capture becomes visible at the binding's
 * definition site too (the RB-007 signal).
 */

import type {
  CljNamespace,
  CljValue,
  Env,
  EvaluationContext,
  Pos,
} from '../types'
import type { LocalKind } from './nodes'

export type Context = 'statement' | 'expr' | 'return'

/**
 * A single analysis problem, accumulated as data (never thrown in the recursive
 * hot path). `malformed` = a real user error; `unsupported` = a form the
 * analyzer does not yet model (reserved; unused by current call sites).
 */
export type AnalysisErrorKind = 'malformed' | 'unsupported'
export type AnalysisErrorCode =
  | 'malformed/if-arity'
  | 'malformed/binding-vector'
  | 'malformed/binding-even'
  | 'malformed/let-binding-symbol'
  | 'malformed/loop-binding-symbol'
  | 'malformed/letfn-bindings-vector'
  | 'malformed/letfn-bindings-even'
  | 'malformed/letfn-name-symbol'
  | 'malformed/set-arity'
  | 'malformed/set-target-symbol'
  | 'malformed/def-name-symbol'
  | 'malformed/defmacro-name-symbol'
  | 'malformed/var-arg-symbol'
  | 'malformed/amp-once'
  | 'malformed/amp-position'
  | 'malformed/param-symbol'
  | 'malformed/rest-symbol'
  | 'malformed/fn-needs-params'
  | 'malformed/arity-clause-list'
  | 'malformed/arity-clause-vector'
  | 'malformed/single-variadic'
  | 'malformed/fn-shape'
  | 'malformed/recur-outside'
  | 'malformed/recur-tail'
  | 'malformed/recur-arity'

export type AnalysisError = {
  message: string
  form: CljValue
  pos: Pos | null
  kind: AnalysisErrorKind
  code?: AnalysisErrorCode
}

/**
 * The analysis-constant state threaded through the resolve pass: the live
 * runtime env + evaluation context (for macroexpansion / var resolution) and
 * the shared error sink. `NodeEnv` is kept separate because it changes per
 * scope; this bundle is constant for the whole analysis except its `errors`.
 */
export type AnalyzeState = {
  cljEnv: Env
  ctx: EvaluationContext
  errors: AnalysisError[]
}

/** Mutable cell shared between a binding's definition node and its env entry. */
export type CaptureCell = { captured: boolean }

export type LocalBinding = {
  name: string
  kind: LocalKind
  slot: number
  /** Function nesting depth that owns this local (0 = top level). */
  fnDepth: number
  argId?: number
  variadic?: boolean
  cell: CaptureCell
}

/**
 * A resolved upvalue descriptor. `isLocal`/`index` match `VmUpvalueDescriptor`
 * exactly; `name` is carried purely for readable printouts and the RB-007 DoD.
 */
export type Upvalue = {
  name: string
  isLocal: boolean
  index: number
}

export type RecurTarget = {
  kind: 'fn' | 'loop'
  /** Number of fixed params/bindings. */
  arity: number
  variadic: boolean
}

/**
 * Per-closure scope: the upvalue table, shared by reference across all
 * arity-methods of one function. Holds NO slot counter — slots are per-arity.
 */
export type ClosureScope = {
  depth: number
  upvalues: Upvalue[]
  /** Dedup key "isLocal:index" -> upvalue table index. */
  upvalueKey: Map<string, number>
  parent: ClosureScope | null
}

/** Per-arity slot space. Reset to 0 for each arity-method (see module doc). */
export type SlotCounter = { next: number }

export type NodeEnv = {
  context: Context
  nsName: string
  ns: CljNamespace | null
  locals: ReadonlyMap<string, LocalBinding>
  /**
   * All in-scope bindings per name, in declaration order (outermost-first).
   * Unlike `locals` (which is innermost-wins), this retains shadowed bindings
   * so `resolveVarLexicalCandidates` can build the full candidate list for
   * `(var x)` when multiple same-name bindings are in scope.
   */
  lexicalStack: ReadonlyMap<string, readonly LocalBinding[]>
  closure: ClosureScope
  slots: SlotCounter
  recur: RecurTarget | null
}

export function makeClosureScope(parent: ClosureScope | null): ClosureScope {
  return {
    depth: parent === null ? 0 : parent.depth + 1,
    upvalues: [],
    upvalueKey: new Map(),
    parent,
  }
}

export function makeRootEnv(
  nsName: string,
  ns: CljNamespace | null
): NodeEnv {
  return {
    context: 'expr',
    nsName,
    ns,
    locals: new Map(),
    lexicalStack: new Map<string, readonly LocalBinding[]>(),
    closure: makeClosureScope(null),
    slots: { next: 0 },
    recur: null,
  }
}

/** Returns a new env with additional locals layered on top (shadowing allowed). */
export function withLocals(
  env: NodeEnv,
  bindings: Array<[string, LocalBinding]>
): NodeEnv {
  if (bindings.length === 0) return env
  const locals = new Map(env.locals)
  const lexicalStack = new Map(env.lexicalStack)
  for (const [name, binding] of bindings) {
    locals.set(name, binding)
    const existing = lexicalStack.get(name)
    lexicalStack.set(
      name,
      existing !== undefined ? [...existing, binding] : [binding]
    )
  }
  return { ...env, locals, lexicalStack }
}

/** Returns a new env that sets the current recur target. */
export function withRecur(env: NodeEnv, recur: RecurTarget | null): NodeEnv {
  return { ...env, recur }
}

/**
 * Enters a new function scope. Locals from the enclosing function remain visible
 * (so capture can be detected) but anything declared from here on belongs to the
 * new, deeper closure. Recur does not cross fn boundaries, so it is cleared. The
 * slot counter is NOT created here — each arity-method gets its own via
 * `enterArity`, because the runtime numbers each arity's locals from 0.
 */
export function enterFn(env: NodeEnv): NodeEnv {
  return {
    ...env,
    closure: makeClosureScope(env.closure),
    recur: null,
  }
}

/** Starts a fresh per-arity slot space within the current closure. */
export function enterArity(env: NodeEnv): NodeEnv {
  return { ...env, slots: { next: 0 } }
}

/** Allocates the next local slot in the given per-arity slot space. */
export function allocSlot(slots: SlotCounter): number {
  return slots.next++
}

export function declareLocal(
  env: NodeEnv,
  name: string,
  kind: LocalKind,
  opts: { argId?: number; variadic?: boolean } = {}
): LocalBinding {
  return {
    name,
    kind,
    slot: allocSlot(env.slots),
    fnDepth: env.closure.depth,
    argId: opts.argId,
    variadic: opts.variadic,
    cell: { captured: false },
  }
}

function addUpvalue(
  closure: ClosureScope,
  name: string,
  isLocal: boolean,
  index: number
): number {
  const key = `${isLocal ? 1 : 0}:${index}`
  const existing = closure.upvalueKey.get(key)
  if (existing !== undefined) return existing
  const idx = closure.upvalues.length
  closure.upvalues.push({ name, isLocal, index })
  closure.upvalueKey.set(key, idx)
  return idx
}

/**
 * Threads an upvalue from its owning closure down to `closure`, adding a
 * descriptor at every intervening level. Returns the upvalue index within
 * `closure`. Mirrors `resolveUpvalueFromEnv` in `vm/compiler.ts`.
 */
function captureUpvalue(
  closure: ClosureScope,
  ownerDepth: number,
  ownerSlot: number,
  name: string
): number {
  const parent = closure.parent!
  if (parent.depth === ownerDepth) {
    return addUpvalue(closure, name, true, ownerSlot)
  }
  const parentIndex = captureUpvalue(parent, ownerDepth, ownerSlot, name)
  return addUpvalue(closure, name, false, parentIndex)
}

export type ResolvedLocal =
  | { resolved: 'local'; binding: LocalBinding }
  | { resolved: 'upvalue'; binding: LocalBinding; upvalueIndex: number }

/**
 * Resolves a name against in-scope locals. If the binding belongs to an
 * enclosing function, it is captured as an upvalue (marking the definition site)
 * and the upvalue index is returned.
 */
export function resolveLocal(
  env: NodeEnv,
  name: string
): ResolvedLocal | undefined {
  const binding = env.locals.get(name)
  if (binding === undefined) return undefined
  if (binding.fnDepth === env.closure.depth) {
    return { resolved: 'local', binding }
  }
  binding.cell.captured = true
  const upvalueIndex = captureUpvalue(
    env.closure,
    binding.fnDepth,
    binding.slot,
    name
  )
  return { resolved: 'upvalue', binding, upvalueIndex }
}

/**
 * Computes the full lexical candidate list for `(var name)` where `name` is
 * unqualified. Mirrors `lexicalVarCandidates` in `vm/compiler.ts`.
 *
 * Walks every in-scope binding for `name` innermost-first. Bindings in the
 * current closure frame become `{kind:'local', slot}` candidates. Bindings in
 * enclosing frames are threaded through the upvalue machinery (marking the
 * definition site as captured) and become `{kind:'upvalue', slot}` candidates.
 * Returns `[]` when no lexical bindings exist for `name`.
 */
export function resolveVarLexicalCandidates(
  env: NodeEnv,
  name: string
): Array<{ kind: 'local' | 'upvalue'; slot: number }> {
  const stack = env.lexicalStack.get(name)
  if (stack === undefined || stack.length === 0) return []

  const candidates: Array<{ kind: 'local' | 'upvalue'; slot: number }> = []
  for (let i = stack.length - 1; i >= 0; i--) {
    const binding = stack[i]
    if (binding.fnDepth === env.closure.depth) {
      candidates.push({ kind: 'local', slot: binding.slot })
    } else {
      binding.cell.captured = true
      const upvalueIndex = captureUpvalue(
        env.closure,
        binding.fnDepth,
        binding.slot,
        name
      )
      candidates.push({ kind: 'upvalue', slot: upvalueIndex })
    }
  }
  return candidates
}
