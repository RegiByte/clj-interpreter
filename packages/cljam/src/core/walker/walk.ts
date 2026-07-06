/**
 * The AST walker — a tree-walking interpreter over the analyzer IR.
 *
 * This is the Phase 2 successor of `evaluator/` (the form-walker): it makes NO
 * scoping decisions. Every local slot, upvalue index, capture set, recur
 * target, and tail fact was resolved by the analyzer; the walker only executes
 * resolved nodes against an `EvalFrame`. `vm/ir-compiler.ts` + `vm/vm.ts` are
 * the bytecode analogue of this file; the form-walker is the semantic oracle
 * every case here mirrors (the differential contract is `ast` ≡ `off`).
 *
 * Scope rules:
 *   - locals    → `frame.slots[node.slot]` / `frame.upvalues[node.upvalueIndex]`
 *   - Vars      → resolved LIVE through the interpreter's own symbol logic
 *                 (`ctx.evaluateSymbol` / `resolveTheVarBySymbol`) so alias
 *                 resolution, js/ dot-chains, dynamic binding stacks, and
 *                 hot-swap behave byte-identically. Never cache an
 *                 analysis-time Var value.
 *
 * Captures are copy-by-value with ALLOCATE-then-FILL timing: a plain `fn`
 * fills its upvalues at creation (so `loop`/`recur` slot reuse cannot leak into
 * an already-created closure), while `letfn` installs all sibling closures
 * into their slots FIRST and fills every upvalue array AFTER — mutual/forward
 * references then copy real fn values instead of nil. This is the tree-walker
 * analogue of the VM's open/closed upvalues and the fix for the RB-007 class.
 */

import type {
  AstNode,
  CatchNode,
  DefNode,
  DoNode,
  DynamicNode,
  FnNode,
  HostCallNode,
  HostFieldNode,
  InvokeNode,
  LetfnNode,
  LetNode,
  LoopNode,
  MapNode,
  NewNode,
  NsNode,
  RecurNode,
  SetBangNode,
  SetNode,
  TheVarNode,
  ThrowNode,
  TryNode,
  VectorNode,
} from '../analyzer/nodes'
import { is } from '../assertions'
import { getNamespaceEnv, makeEnv } from '../env'
import { CljThrownSignal, EvaluationError } from '../errors'
import { v } from '../factories'
import { getPos, maybeHydrateErrorPos } from '../positions'
import { printString } from '../printer'
import type {
  Arity,
  CljFunction,
  CljList,
  CljMap,
  CljSymbol,
  CljValue,
  CljVar,
  CljVector,
  Env,
  EvaluationContext,
  StackFrame,
} from '../types'
import { RecurSignal } from '../evaluator/arity'
import {
  bindingPairsOrThrow,
  bindingSymbolOrThrow,
  resolveDynamicBindingVar,
  resolveSetTargetVar,
  resolveTheVarBySymbol,
} from '../evaluator/binding-setup'
import { defineMacro, defineVar, withDefmacroMeta } from '../evaluator/defs'
import {
  matchesDiscriminatorValue,
  thrownValueForHandler,
} from '../evaluator/form-parsers'
import {
  callJsMethod,
  constructJsValue,
  readJsProperty,
} from '../evaluator/js-interop'
import { dispatchMultiMethod } from '../evaluator/multimethod-dispatch'
import type { EvalFrame } from './frame'
import { walkAsyncBlock } from './walk-async'

/**
 * The dispatcher stays deliberately TINY — every non-trivial op body lives in
 * its own small function below. V8's tier-up budget scales with a function's
 * bytecode size and its code-flushing GC discards cold compiled code: as one
 * giant switch, walkNode took ~100k invocations to optimize and dropped back
 * to interpreted speed after every major GC (the bench's gc()-between-samples
 * made the four Var-heavy workloads read as permanent walker losses — session
 * 344 diagnosis). Small bodies tier up in hundreds of calls and re-optimize
 * immediately after a flush. Only leaf ops stay inline.
 */
export function walkNode(
  node: AstNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  switch (node.op) {
    case 'const':
      return node.val

    case 'quote':
      return node.expr.val

    case 'local':
      return node.resolved === 'local'
        ? frame.slots[node.slot]
        : frame.upvalues[node.upvalueIndex!]

    // Live-Var resolution runs the form-walker's symbol logic DIRECTLY
    // (ctx.evaluateSymbol = evaluateSymbolWithContext): the analyzer decided
    // this reference is NOT a local, and everything else (aliases, qualified
    // names, js/ dot-chains, dynamic binding stacks, not-found errors) must
    // match the interpreter byte-for-byte — same function, so it does. The
    // ctx seam skips the full evaluate round-trip (depth bookkeeping, mode
    // dispatch, kind switch) that made Var-heavy loops slower than the
    // interpreter (bench run 20260705-144007). Never cache the Var's value.
    case 'var':
    case 'js-var':
      return ctx.evaluateSymbol(node.form as CljSymbol, env)

    case 'if': {
      const test = walkNode(node.test, frame, env, ctx)
      return is.falsy(test)
        ? walkNode(node.else, frame, env, ctx)
        : walkNode(node.then, frame, env, ctx)
    }

    case 'do':
      return walkDo(node, frame, env, ctx)
    case 'let':
      return walkLet(node, frame, env, ctx)
    case 'loop':
      return walkLoop(node, frame, env, ctx)
    case 'recur':
      return walkRecur(node, frame, env, ctx)
    case 'invoke':
      return walkInvoke(node, frame, env, ctx)
    case 'vector':
      return walkVector(node, frame, env, ctx)
    case 'map':
      return walkMap(node, frame, env, ctx)
    case 'set':
      return walkSet(node, frame, env, ctx)
    case 'dynamic':
      return walkDynamic(node, frame, env, ctx)
    case 'set!':
      return walkSetBang(node, frame, env, ctx)
    case 'fn':
      return walkFn(node, frame, env, ctx)
    case 'letfn':
      return walkLetfn(node, frame, env, ctx)
    case 'throw':
      return walkThrow(node, frame, env, ctx)
    case 'try':
      return walkTry(node, frame, env, ctx)
    case 'def':
      return walkDef(node, frame, env, ctx)
    case 'host-field':
      return walkHostField(node, frame, env, ctx)
    case 'host-call':
      return walkHostCall(node, frame, env, ctx)
    case 'new':
      return walkNew(node, frame, env, ctx)
    case 'the-var':
      return walkTheVar(node, frame, env, ctx)
    case 'ns':
      return walkNs(node, env)
    case 'async':
      return walkAsyncBlock(node, frame, env, ctx)

    default:
      throw new EvaluationError(
        `ast-walker: no walker for op '${node.op}' (pre-scan should have fallen back)`,
        { node: node.op },
        node.pos ?? undefined
      )
  }
}

function walkDo(
  node: DoNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  for (const stmt of node.statements) walkNode(stmt, frame, env, ctx)
  return walkNode(node.ret, frame, env, ctx)
}

function walkLet(
  node: LetNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  for (const binding of node.bindings) {
    frame.slots[binding.slot] = walkNode(binding.init!, frame, env, ctx)
  }
  return walkNode(node.body, frame, env, ctx)
}

function walkLoop(
  node: LoopNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  for (const binding of node.bindings) {
    frame.slots[binding.slot] = walkNode(binding.init!, frame, env, ctx)
  }
  while (true) {
    try {
      return walkNode(node.body, frame, env, ctx)
    } catch (e) {
      if (e instanceof RecurSignal) {
        // The analyzer validated recur arity (malformed/recur-arity), so
        // args and bindings are the same length here.
        for (let i = 0; i < node.bindings.length; i++) {
          frame.slots[node.bindings[i].slot] = e.args[i]
        }
        continue
      }
      throw e
    }
  }
}

/**
 * One signal for both targets; the innermost catcher wins (`loop` for
 * loop-recur, the apply hub's astMethod loop for fn-recur). `try` rethrows
 * it. This mirrors the form-walker's mechanism exactly.
 */
function walkRecur(
  node: RecurNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const args = node.exprs.map((expr) => walkNode(expr, frame, env, ctx))
  throw new RecurSignal(args, node.pos ?? undefined)
}

/** Mirrors collections.ts evaluateVector (meta carried from the literal). */
function walkVector(
  node: VectorNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const items = node.items.map((item) => walkNode(item, frame, env, ctx))
  const result = v.vector(items)
  const meta = (node.form as CljVector).meta
  if (meta) result.meta = meta
  return result
}

/** Mirrors collections.ts evaluateMap. */
function walkMap(
  node: MapNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const entries: [CljValue, CljValue][] = []
  for (let i = 0; i < node.keys.length; i++) {
    const key = walkNode(node.keys[i], frame, env, ctx)
    const val = walkNode(node.vals[i], frame, env, ctx)
    entries.push([key, val])
  }
  const result = v.map(entries)
  const meta = (node.form as CljMap).meta
  if (meta) result.meta = meta
  return result
}

/**
 * Mirrors collections.ts evaluateSet, including the evaluation-time dedup of
 * equal elements.
 */
function walkSet(
  node: SetNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const items: CljValue[] = []
  for (const itemNode of node.items) {
    const item = walkNode(itemNode, frame, env, ctx)
    if (!items.some((existing) => is.equal(existing, item))) {
      items.push(item)
    }
  }
  return v.set(items)
}

/**
 * Mirrors evaluateSet (special-forms.ts). The analyzer already rejected wrong
 * arity / non-symbol targets as fatal :malformed/set-* errors, so resolution
 * starts at the var. Validation precedes value evaluation, same as the form
 * path.
 */
function walkSetBang(
  node: SetBangNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const symForm = (node.form as CljList).value[1] as CljSymbol
  const targetVar = resolveSetTargetVar(symForm, env)
  const newVal = walkNode(node.val, frame, env, ctx)
  targetVar.bindingStack![targetVar.bindingStack!.length - 1] = newVal
  return newVal
}

function walkFn(
  node: FnNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const { fn, fillUpvalues } = makeAstFunction(node, frame, env, ctx)
  fillUpvalues()
  return fn
}

/**
 * Mirrors the stdlib `throw` native (stdlib/errors.ts): any CljValue becomes
 * a CljThrownSignal.
 */
function walkThrow(
  node: ThrowNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const value = walkNode(node.exception, frame, env, ctx)
  throw new CljThrownSignal(value)
}

function walkDef(
  node: DefNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  if (node.isMacro === true) return walkDefmacro(node, frame, env, ctx)
  // Mirrors evaluateDef: a bare (def x) declaration is a nil no-op.
  if (node.init === null) return v.nil()
  const nameSym = (node.form as CljList).value[1] as CljSymbol
  const value = walkNode(node.init, frame, env, ctx)
  return defineVar({
    name: nameSym,
    value,
    env,
    ctx,
    docstring: node.doc ?? undefined,
  })
}

/** Mirrors evaluateDot's property branch: (. target field), zero args. */
function walkHostField(
  node: HostFieldNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const list = node.form as CljList
  const target = walkNode(node.target, frame, env, ctx)
  return readJsProperty(target, list.value[1], node.field)
}

/**
 * Mirrors evaluateDot's method branch. The analyzer models BOTH sugar shapes
 * — (. t method args…) and (. t (method args…)) — as host-call; the walker
 * executes both, siding with the VM over the legacy interpreter (which
 * rejects the list-form; intended-divergence allowlist). list.value[2] is the
 * member form in either shape.
 */
function walkHostCall(
  node: HostCallNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const list = node.form as CljList
  const target = walkNode(node.target, frame, env, ctx)
  const args = node.args.map((arg) => walkNode(arg, frame, env, ctx))
  return callJsMethod(
    target,
    list.value[1],
    node.method,
    list.value[2],
    args,
    ctx,
    env
  )
}

/**
 * Mirrors evaluateNew, including its arity check — the analyzer is lenient
 * here (a missing constructor becomes a nil const), but the interpreter's
 * error is the contract.
 */
function walkNew(
  node: NewNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const list = node.form as CljList
  if (list.value.length < 2) {
    throw new EvaluationError(
      'js/new requires a constructor argument',
      { list },
      getPos(list)
    )
  }
  const cls = walkNode(node.className, frame, env, ctx)
  const args = node.args.map((arg) => walkNode(arg, frame, env, ctx))
  return constructJsValue(cls, list.value[1], args, ctx, env)
}

/**
 * Lexical Var candidates are pre-resolved flat coordinates (innermost-first)
 * — no runtime chain walk. Mirrors the VM's LoadLexicalVar. The namespace
 * fallback resolves through `resolveTheVarBySymbol` — the same helper the
 * form-walker's `var` special form uses — for byte-identical resolution and
 * errors. This was the last `ctx.evaluate` inside walker/ (Phase 4 S1).
 */
function walkTheVar(
  node: TheVarNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  for (const candidate of node.lexicalCandidates) {
    const value =
      candidate.kind === 'local'
        ? frame.slots[candidate.slot]
        : frame.upvalues[candidate.slot]
    if (is.var(value)) return value
  }
  // analyzeTheVar guarantees the (var sym) shape — a non-symbol argument
  // became an 'invalid' node before this op could exist.
  const sym = (node.form as CljList).value[1] as CljSymbol
  return resolveTheVarBySymbol(sym, env, ctx)
}

/**
 * Mirrors `evaluateNs`: all real ns work (aliases, requires, namespace
 * switching) happens in the session/loader pre-pass — the runtime handler
 * only records the optional docstring on the current namespace.
 */
function walkNs(node: NsNode, env: Env): CljValue {
  if (node.docstring !== null) {
    const nsEnv = getNamespaceEnv(env)
    if (nsEnv.ns) nsEnv.ns.doc = node.docstring
  }
  return v.nil()
}

/** Mirrors `dispatch.ts` evaluateList after the special-form gate. */
function walkInvoke(
  node: InvokeNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const list = node.form as CljList
  const head = list.value[0]

  let evaledHead = walkNode(node.fn, frame, env, ctx)

  // Vars are IFn — dereference before dispatch so (#'mm arg) routes correctly.
  if (is.var(evaledHead)) {
    evaledHead = evaledHead.value
  }

  if (is.multiMethod(evaledHead)) {
    const args = node.args.map((arg) => walkNode(arg, frame, env, ctx))
    return dispatchMultiMethod(evaledHead, args, ctx, env, list)
  }

  if (!is.callable(evaledHead)) {
    const name = is.symbol(head) ? head.name : printString(head)
    throw new EvaluationError(
      `${name} is not callable`,
      { list, env },
      getPos(list)
    )
  }

  const args = node.args.map((arg) => walkNode(arg, frame, env, ctx))
  const rawPos = getPos(list)
  const stackFrame: StackFrame = {
    fnName: is.symbol(head) ? head.name : null,
    line: null,
    col: null,
    source: ctx.currentFile ?? null,
    pos: rawPos ?? null,
  }
  ctx.frameStack.push(stackFrame)
  try {
    return ctx.applyCallable(evaledHead, args, env)
  } catch (e) {
    maybeHydrateErrorPos(e, list)
    if (e instanceof EvaluationError && !e.frames) {
      e.frames = [...ctx.frameStack].reverse()
    }
    throw e
  } finally {
    ctx.frameStack.pop()
  }
}

/**
 * Builds a runtime `CljFunction` from a resolved `fn` node. The arity records
 * carry BOTH representations: `params`/`restParam`/`body` (source forms, so
 * the interpreter path still works if the fn is ever applied outside 'ast'
 * mode) and `astMethod`/`astSlotCount`/`astUpvalues` (the walker path).
 *
 * `fillUpvalues` is returned separately so `letfn` can run its two-phase
 * install-then-fill; a plain `fn` calls it immediately. The upvalue array is
 * shared by reference across arities and mutated in place by the fill.
 */
function makeAstArities(
  node: FnNode,
  frame: EvalFrame
): { arities: Arity[]; fillUpvalues: () => void } {
  const upvalues: CljValue[] = []
  const arities: Arity[] = node.methods.map((method) => ({
    params: method.params
      .slice(0, method.fixedArity)
      .map((p) => p.form as CljSymbol),
    restParam: method.variadic
      ? (method.params[method.fixedArity].form as CljSymbol)
      : null,
    body: method.bodyForms,
    astMethod: method,
    astSlotCount: method.namedSlotCount,
    astUpvalues: upvalues,
  }))

  const fillUpvalues = () => {
    for (const capture of node.captures) {
      upvalues.push(
        capture.isLocal
          ? frame.slots[capture.index]
          : frame.upvalues[capture.index]
      )
    }
  }
  return { arities, fillUpvalues }
}

function makeAstFunction(
  node: FnNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): { fn: CljFunction; fillUpvalues: () => void } {
  const { arities, fillUpvalues } = makeAstArities(node, frame)
  const fn = v.multiArityFunction(arities, env)
  const nsName = getNamespaceEnv(env).ns?.name ?? 'user'
  const identity = ctx.allocateFunctionIdentity?.({
    nsName,
    name: node.name ?? undefined,
  })
  if (identity) {
    fn.id = identity.id
    fn.evalId = identity.evalId
    fn.displayName = identity.displayName
  }
  if (node.name !== null) {
    // The walker resolves self-reference through the self slot; the selfEnv
    // binding mirrors evaluateFnStar for the interpreter-path fallback.
    fn.name = node.name
    const selfEnv = makeEnv(env)
    selfEnv.bindings.set(node.name, fn)
    fn.env = selfEnv
  }

  return { fn, fillUpvalues }
}

/**
 * Mirrors `evaluateDefmacro` (special-forms.ts). The analyzer synthesized an
 * anonymous `fn*` as the def's init, so the macro's arities come from the same
 * machinery as `:fn` — minus the function identity/self-env, which macros
 * never get on the form path either (`parseArities` → `multiArityMacro`).
 * Meta assembly (:doc + :arglists from the raw arity forms) is the shared
 * `withDefmacroMeta`; the `{ ...nameSym }` spread matches the interpreter,
 * which drops the symbol's non-enumerable position on copy.
 */
function walkDefmacro(
  node: DefNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  if (node.init === null || node.init.op !== 'fn') {
    throw new EvaluationError(
      'ast-walker: defmacro without a fn init (analyzer contract violation)',
      { node: node.op },
      node.pos ?? undefined
    )
  }
  const { arities, fillUpvalues } = makeAstArities(node.init, frame)
  fillUpvalues()
  const macro = v.multiArityMacro(arities, env)

  const list = node.form as CljList
  const nameSym = list.value[1] as CljSymbol
  const rest = list.value.slice(2)
  const docstring = rest[0] && is.string(rest[0]) ? rest[0].value : undefined
  const arityForms = docstring ? rest.slice(1) : rest

  const finalMeta = withDefmacroMeta(nameSym.meta, docstring, arityForms)
  const nameWithMeta =
    finalMeta === nameSym.meta ? nameSym : { ...nameSym, meta: finalMeta }
  return defineMacro({ name: nameWithMeta, macro, env, ctx })
}

/**
 * Two-phase letfn install: ALL siblings into their slots, THEN fill upvalues.
 * Shared with the async twin — installation is sync on both paths (fn
 * creation only copies captures); only the BODY differs (walkLetfnAsync
 * walks it async — the F8 lexical rule).
 */
export function installLetfnBindings(
  node: LetfnNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): void {
  const fills: Array<() => void> = []
  for (const binding of node.bindings) {
    if (binding.init === null || binding.init.op !== 'fn') {
      throw new EvaluationError(
        'letfn* binding values must be functions',
        { name: binding.name, env },
        binding.pos ?? undefined
      )
    }
    const { fn, fillUpvalues } = makeAstFunction(
      binding.init,
      frame,
      env,
      ctx
    )
    fn.name = binding.name
    frame.slots[binding.slot] = fn
    fills.push(fillUpvalues)
  }
  for (const fill of fills) fill()
}

function walkLetfn(
  node: LetfnNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  installLetfnBindings(node, frame, env, ctx)
  return walkNode(node.body, frame, env, ctx)
}

/**
 * Mirrors `evaluateBinding` + `setupBindingVars` (per-pair eval/resolve/push
 * order, exception-safe pops, and every error message via the shared
 * binding-setup helpers), with init expressions walked as nodes. The raw form
 * pairs are the structural authority: the analyzer's `bindingVars` is
 * parallel to `inits` but resolved at ANALYSIS time (null where unresolved),
 * while `binding` semantics require live per-execution Var resolution — a
 * Var defined between analysis and execution must still bind.
 */
function walkDynamic(
  node: DynamicNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const list = node.form as CljList
  const pairs = bindingPairsOrThrow(list, env)
  const boundVars: CljVar[] = []

  try {
    for (let i = 0; i * 2 < pairs.length; i++) {
      const sym = bindingSymbolOrThrow(pairs[i * 2], list)
      const newVal = walkNode(node.inits[i], frame, env, ctx)
      const targetVar = resolveDynamicBindingVar(sym, env, ctx)
      targetVar.bindingStack ??= []
      targetVar.bindingStack.push(newVal)
      boundVars.push(targetVar)
    }
  } catch (e) {
    for (let i = boundVars.length - 1; i >= 0; i--) {
      boundVars[i].bindingStack!.pop()
    }
    throw e
  }

  try {
    return walkNode(node.body, frame, env, ctx)
  } finally {
    for (let i = boundVars.length - 1; i >= 0; i--) {
      boundVars[i].bindingStack!.pop()
    }
  }
}

/** Mirrors `special-forms.ts` evaluateTry, with slot-frame catch bindings. */
function walkTry(
  node: TryNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  let result: CljValue = v.nil()
  let pendingThrow: unknown = null

  try {
    result = walkNode(node.body, frame, env, ctx)
  } catch (e) {
    // recur punches through try to its fn/loop target.
    if (e instanceof RecurSignal) throw e

    const thrownValue = thrownValueForHandler(e, ctx)
    if (thrownValue === null) throw e

    let handled = false
    for (const clause of node.catches) {
      if (catchClauseMatches(clause, thrownValue, frame, env, ctx)) {
        frame.slots[clause.local.slot] = thrownValue
        result = walkNode(clause.body, frame, env, ctx)
        handled = true
        break
      }
    }

    if (!handled) {
      pendingThrow = e
    }
  } finally {
    if (node.finallyBody !== null) {
      walkNode(node.finallyBody, frame, env, ctx)
    }
  }

  if (pendingThrow !== null) throw pendingThrow
  return result
}

/**
 * Discriminator matching: the walker evaluates the discriminator NODE (locals
 * live in the frame, not the Env chain), then applies the shared value-level
 * rules. An evaluation failure is a catch-all — same rule as the form path
 * (unresolvable JVM class names like java.lang.Throwable land here).
 */
export function catchClauseMatches(
  clause: CatchNode,
  thrown: CljValue,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): boolean {
  if (clause.discriminator === null) return true
  let disc: CljValue
  try {
    disc = walkNode(clause.discriminator, frame, env, ctx)
  } catch {
    return true
  }
  return matchesDiscriminatorValue(disc, thrown, env, ctx)
}
