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
 *   - `FnScope` is the mutable accumulation cell for ONE function: its slot
 *     counter and its upvalue table. It is shared by reference across all nodes
 *     of that function, which is exactly what we want — after analysis the table
 *     holds the function's capture set. This mirrors `VmCompileEnv`'s
 *     `upvalueDescriptors` + `resolveUpvalue` in `vm/compiler.ts`, so the
 *     descriptors map 1:1 onto `VmUpvalueDescriptor` for Phase 1.
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

export type AnalysisError = {
  message: string
  form: CljValue
  pos: Pos | null
  kind: AnalysisErrorKind
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

export type FnScope = {
  depth: number
  nextSlot: number
  upvalues: Upvalue[]
  /** Dedup key "isLocal:index" -> upvalue table index. */
  upvalueKey: Map<string, number>
  parent: FnScope | null
}

export type NodeEnv = {
  context: Context
  nsName: string
  ns: CljNamespace | null
  locals: ReadonlyMap<string, LocalBinding>
  fnScope: FnScope
  recur: RecurTarget | null
}

export function makeFnScope(parent: FnScope | null): FnScope {
  return {
    depth: parent === null ? 0 : parent.depth + 1,
    nextSlot: 0,
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
    fnScope: makeFnScope(null),
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
  for (const [name, binding] of bindings) locals.set(name, binding)
  return { ...env, locals }
}

/** Returns a new env that sets the current recur target. */
export function withRecur(env: NodeEnv, recur: RecurTarget | null): NodeEnv {
  return { ...env, recur }
}

/**
 * Enters a new function scope. Locals from the enclosing function remain visible
 * (so capture can be detected) but anything declared from here on belongs to the
 * new, deeper scope. Recur does not cross fn boundaries, so it is cleared.
 */
export function enterFn(env: NodeEnv): NodeEnv {
  return {
    ...env,
    fnScope: makeFnScope(env.fnScope),
    recur: null,
  }
}

/** Allocates the next local slot in the given function scope. */
export function allocSlot(fnScope: FnScope): number {
  return fnScope.nextSlot++
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
    slot: allocSlot(env.fnScope),
    fnDepth: env.fnScope.depth,
    argId: opts.argId,
    variadic: opts.variadic,
    cell: { captured: false },
  }
}

function addUpvalue(
  fnScope: FnScope,
  name: string,
  isLocal: boolean,
  index: number
): number {
  const key = `${isLocal ? 1 : 0}:${index}`
  const existing = fnScope.upvalueKey.get(key)
  if (existing !== undefined) return existing
  const idx = fnScope.upvalues.length
  fnScope.upvalues.push({ name, isLocal, index })
  fnScope.upvalueKey.set(key, idx)
  return idx
}

/**
 * Threads an upvalue from its owning function down to `fnScope`, adding a
 * descriptor at every intervening level. Returns the upvalue index within
 * `fnScope`. Mirrors `resolveUpvalueFromEnv` in `vm/compiler.ts`.
 */
function captureUpvalue(
  fnScope: FnScope,
  ownerDepth: number,
  ownerSlot: number,
  name: string
): number {
  const parent = fnScope.parent!
  if (parent.depth === ownerDepth) {
    return addUpvalue(fnScope, name, true, ownerSlot)
  }
  const parentIndex = captureUpvalue(parent, ownerDepth, ownerSlot, name)
  return addUpvalue(fnScope, name, false, parentIndex)
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
  if (binding.fnDepth === env.fnScope.depth) {
    return { resolved: 'local', binding }
  }
  binding.cell.captured = true
  const upvalueIndex = captureUpvalue(
    env.fnScope,
    binding.fnDepth,
    binding.slot,
    name
  )
  return { resolved: 'upvalue', binding, upvalueIndex }
}
