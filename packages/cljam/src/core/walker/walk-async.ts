/**
 * The AST walker's async twin — Phase 3's home for `(async ...)` blocks.
 *
 * Mirrors `evaluator/async-evaluator.ts` (the form-walker twin) over the
 * analyzer IR, with the same architecture invariant: the SYNC walker
 * (walk.ts) stays zero-overhead — only ops whose sub-expressions can await
 * (`@` on a pending) get async twins here; everything else delegates to
 * `walkNode`. The per-op function split matches walk.ts (session 344: small
 * bodies tier up fast and survive code-flushing GC).
 *
 * Entry: the sync walker's `:async` case calls `walkAsyncBlock`, which copies
 * the block's captures (fn-method-like closure — see `AsyncNode` in
 * analyzer/nodes.ts) into a FRESH frame and returns a `CljPending` around
 * `walkNodeAsync(body)`. The fresh frame is the suspension-safety story: the
 * sync walker mutates `let`/`loop` slots in place, so an async body sharing
 * the enclosing frame would watch its locals change while suspended.
 *
 * Async is a LEXICAL boundary (F8, Phase 4 S3): `@` awaits exactly within
 * the lexical extent of the `(async …)` body, stopping at closure boundaries.
 * Invoked callables — fns, natives, multimethods, data structures — apply
 * SYNC via `ctx.applyCallable`, one rule, no cases; a nested fn that wants
 * await declares its own `(async …)` and returns a pending the caller `@`s
 * (JS's model). The form twin still propagates async-ness dynamically into
 * fn bodies — divergent ON PURPOSE, fallback-only, dies in S4.
 *
 * Deliberate improvements over the form twin (intended divergences):
 *   - interop args ARE walked async (F7) — `(. obj m @p)` works; the form
 *     path documents "deref explicitly before the form".
 *   - `:invoke` pushes `ctx.frameStack` like the sync walker, so async
 *     errors carry `:frames` (the form twin never populated them).
 */

import type {
  AstNode,
  AsyncNode,
  DefNode,
  DoNode,
  DynamicNode,
  HostCallNode,
  HostFieldNode,
  IfNode,
  InvokeNode,
  LetfnNode,
  LetNode,
  LoopNode,
  MapNode,
  NewNode,
  RecurNode,
  SetBangNode,
  SetNode,
  ThrowNode,
  TryNode,
  VectorNode,
} from '../analyzer/nodes'
import { is } from '../assertions'
import { CljThrownSignal, EvaluationError } from '../errors'
import { v } from '../factories'
import { getPos, maybeHydrateErrorPos } from '../positions'
import { printString } from '../printer'
import type {
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
import { racePendingTimeout, SYNC_DEREFABLE_KINDS } from '../pending'
import {
  bindingPairsOrThrow,
  bindingSymbolOrThrow,
  resolveDynamicBindingVar,
  resolveSetTargetVar,
} from '../evaluator/binding-setup'
import { defineVar } from '../evaluator/defs'
import { thrownValueForHandler } from '../evaluator/form-parsers'
import {
  callJsMethod,
  constructJsValue,
  readJsProperty,
} from '../evaluator/js-interop'
import { dispatchMultiMethod } from '../evaluator/multimethod-dispatch'
import type { EvalFrame } from './frame'
import { makeFrame } from './frame'
import { catchClauseMatches, installLetfnBindings, walkNode } from './walk'

/**
 * The sync entry for an `:async` node: copy captures NOW (the enclosing frame
 * may mutate after we return), give the body its own frame, hand back a
 * pending. Body throws — sync or suspended — become rejections, matching the
 * form path's async-function semantics.
 */
export function walkAsyncBlock(
  node: AsyncNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const asyncFrame = makeFrame(node.method.namedSlotCount)
  asyncFrame.upvalues = node.captures.map((capture) =>
    capture.isLocal ? frame.slots[capture.index] : frame.upvalues[capture.index]
  )
  return v.pending(walkNodeAsync(node.method.body, asyncFrame, env, ctx))
}

/**
 * The async dispatcher. Ops that cannot contain an awaited sub-expression in
 * their evaluated-now position delegate to the sync walker; the rest have
 * twins below that `await` recursively.
 */
export async function walkNodeAsync(
  node: AstNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  switch (node.op) {
    case 'if':
      return walkIfAsync(node, frame, env, ctx)
    case 'do':
      return walkDoAsync(node, frame, env, ctx)
    case 'let':
      return walkLetAsync(node, frame, env, ctx)
    case 'letfn':
      return walkLetfnAsync(node, frame, env, ctx)
    case 'loop':
      return walkLoopAsync(node, frame, env, ctx)
    case 'recur':
      return walkRecurAsync(node, frame, env, ctx)
    case 'invoke':
      return walkInvokeAsync(node, frame, env, ctx)
    case 'vector':
      return walkVectorAsync(node, frame, env, ctx)
    case 'map':
      return walkMapAsync(node, frame, env, ctx)
    case 'set':
      return walkSetAsync(node, frame, env, ctx)
    case 'dynamic':
      return walkDynamicAsync(node, frame, env, ctx)
    case 'set!':
      return walkSetBangAsync(node, frame, env, ctx)
    case 'throw':
      return walkThrowAsync(node, frame, env, ctx)
    case 'try':
      return walkTryAsync(node, frame, env, ctx)
    case 'def':
      return walkDefAsync(node, frame, env, ctx)
    case 'host-call':
      return walkHostCallAsync(node, frame, env, ctx)
    case 'host-field':
      return walkHostFieldAsync(node, frame, env, ctx)
    case 'new':
      return walkNewAsync(node, frame, env, ctx)

    // const/quote/local/var/js-var/the-var/ns: leaves — nothing to await.
    // fn: CREATION is sync (captures copy from the frame); the body is a
    // closure body, so it NEVER runs async (F8 lexical boundary). async:
    // nested blocks make a new pending via the sync entry.
    default:
      return walkNode(node, frame, env, ctx)
  }
}

async function walkIfAsync(
  node: IfNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  const test = await walkNodeAsync(node.test, frame, env, ctx)
  return is.falsy(test)
    ? walkNodeAsync(node.else, frame, env, ctx)
    : walkNodeAsync(node.then, frame, env, ctx)
}

async function walkDoAsync(
  node: DoNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  for (const stmt of node.statements) {
    await walkNodeAsync(stmt, frame, env, ctx)
  }
  return walkNodeAsync(node.ret, frame, env, ctx)
}

async function walkLetAsync(
  node: LetNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  for (const binding of node.bindings) {
    frame.slots[binding.slot] = await walkNodeAsync(
      binding.init!,
      frame,
      env,
      ctx
    )
  }
  return walkNodeAsync(node.body, frame, env, ctx)
}

/**
 * F8: the letfn BODY is lexical content of the async block, so it walks
 * async; the sibling fns' bodies are closure bodies and stay sync (their
 * installation — two-phase upvalue fill — is the shared sync helper).
 */
async function walkLetfnAsync(
  node: LetfnNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  installLetfnBindings(node, frame, env, ctx)
  return walkNodeAsync(node.body, frame, env, ctx)
}

async function walkLoopAsync(
  node: LoopNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  for (const binding of node.bindings) {
    frame.slots[binding.slot] = await walkNodeAsync(
      binding.init!,
      frame,
      env,
      ctx
    )
  }
  while (true) {
    try {
      return await walkNodeAsync(node.body, frame, env, ctx)
    } catch (e) {
      if (e instanceof RecurSignal) {
        for (let i = 0; i < node.bindings.length; i++) {
          frame.slots[node.bindings[i].slot] = e.args[i]
        }
        continue
      }
      throw e
    }
  }
}

async function walkRecurAsync(
  node: RecurNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  const args: CljValue[] = []
  for (const expr of node.exprs) {
    args.push(await walkNodeAsync(expr, frame, env, ctx))
  }
  throw new RecurSignal(args, node.pos ?? undefined)
}

async function walkVectorAsync(
  node: VectorNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  const items: CljValue[] = []
  for (const item of node.items) {
    items.push(await walkNodeAsync(item, frame, env, ctx))
  }
  const result = v.vector(items)
  const meta = (node.form as CljVector).meta
  if (meta) result.meta = meta
  return result
}

async function walkMapAsync(
  node: MapNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  const entries: [CljValue, CljValue][] = []
  for (let i = 0; i < node.keys.length; i++) {
    const key = await walkNodeAsync(node.keys[i], frame, env, ctx)
    const val = await walkNodeAsync(node.vals[i], frame, env, ctx)
    entries.push([key, val])
  }
  const result = v.map(entries)
  const meta = (node.form as CljMap).meta
  if (meta) result.meta = meta
  return result
}

async function walkSetAsync(
  node: SetNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  const items: CljValue[] = []
  for (const itemNode of node.items) {
    const item = await walkNodeAsync(itemNode, frame, env, ctx)
    if (!items.some((existing) => is.equal(existing, item))) {
      items.push(item)
    }
  }
  return v.set(items)
}

/**
 * Mirrors walkDynamic with inits AND body walked async — both are lexical
 * content of the async block (F8; the form twin's sync-inits asymmetry was
 * an under-coverage of the lexical rule). Per-pair eval/resolve/push order
 * and exception-safe pops are unchanged; a suspension between pairs leaves
 * earlier pushes observable, which is the binding-conveyance semantics the
 * probes already pin.
 */
async function walkDynamicAsync(
  node: DynamicNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  const list = node.form as CljList
  const pairs = bindingPairsOrThrow(list, env)
  const boundVars: CljVar[] = []

  try {
    for (let i = 0; i * 2 < pairs.length; i++) {
      const sym = bindingSymbolOrThrow(pairs[i * 2], list)
      const newVal = await walkNodeAsync(node.inits[i], frame, env, ctx)
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
    return await walkNodeAsync(node.body, frame, env, ctx)
  } finally {
    for (let i = boundVars.length - 1; i >= 0; i--) {
      boundVars[i].bindingStack!.pop()
    }
  }
}

async function walkSetBangAsync(
  node: SetBangNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  const symForm = (node.form as CljList).value[1] as CljSymbol
  const targetVar = resolveSetTargetVar(symForm, env)
  const newVal = await walkNodeAsync(node.val, frame, env, ctx)
  targetVar.bindingStack![targetVar.bindingStack!.length - 1] = newVal
  return newVal
}

async function walkThrowAsync(
  node: ThrowNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  const value = await walkNodeAsync(node.exception, frame, env, ctx)
  throw new CljThrownSignal(value)
}

async function walkTryAsync(
  node: TryNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  let result: CljValue = v.nil()
  let pendingThrow: unknown = null

  try {
    result = await walkNodeAsync(node.body, frame, env, ctx)
  } catch (e) {
    if (e instanceof RecurSignal) throw e

    const thrownValue = thrownValueForHandler(e, ctx)
    if (thrownValue === null) throw e

    let handled = false
    for (const clause of node.catches) {
      if (catchClauseMatches(clause, thrownValue, frame, env, ctx)) {
        frame.slots[clause.local.slot] = thrownValue
        result = await walkNodeAsync(clause.body, frame, env, ctx)
        handled = true
        break
      }
    }

    if (!handled) {
      pendingThrow = e
    }
  } finally {
    if (node.finallyBody !== null) {
      await walkNodeAsync(node.finallyBody, frame, env, ctx)
    }
  }

  if (pendingThrow !== null) throw pendingThrow
  return result
}

/** Mirrors walkDef with an awaited init; defmacro creation is sync — delegate. */
async function walkDefAsync(
  node: DefNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  if (node.isMacro === true) return walkNode(node, frame, env, ctx)
  if (node.init === null) return v.nil()
  const nameSym = (node.form as CljList).value[1] as CljSymbol
  const value = await walkNodeAsync(node.init, frame, env, ctx)
  return defineVar({
    name: nameSym,
    value,
    env,
    ctx,
    docstring: node.doc ?? undefined,
  })
}

/** F7: interop args are walked async — `(. obj m @p)` works on this path. */
async function walkHostCallAsync(
  node: HostCallNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  const list = node.form as CljList
  const target = await walkNodeAsync(node.target, frame, env, ctx)
  const args: CljValue[] = []
  for (const arg of node.args) {
    args.push(await walkNodeAsync(arg, frame, env, ctx))
  }
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

async function walkHostFieldAsync(
  node: HostFieldNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  const list = node.form as CljList
  const target = await walkNodeAsync(node.target, frame, env, ctx)
  return readJsProperty(target, list.value[1], node.field)
}

async function walkNewAsync(
  node: NewNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  const list = node.form as CljList
  if (list.value.length < 2) {
    throw new EvaluationError(
      'js/new requires a constructor argument',
      { list },
      getPos(list)
    )
  }
  const cls = await walkNodeAsync(node.className, frame, env, ctx)
  const args: CljValue[] = []
  for (const arg of node.args) {
    args.push(await walkNodeAsync(arg, frame, env, ctx))
  }
  return constructJsValue(cls, list.value[1], args, ctx, env)
}

/**
 * Mirrors walkInvoke with async HEAD + ARG walking (they are lexical content
 * of the async body), plus the deref interception the form twin proved:
 * inside async, `@`/deref is await-or-identity with JVM 3-arg timeout
 * semantics (F6). The apply itself is SYNC — the F8 lexical boundary: fn
 * bodies are closure bodies, so `@` inside them does not await (the sync
 * deref native's error tells the user to declare their own `(async …)`).
 */
async function walkInvokeAsync(
  node: InvokeNode,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  const list = node.form as CljList
  const head = list.value[0]

  let evaledHead = await walkNodeAsync(node.fn, frame, env, ctx)

  if (is.var(evaledHead)) {
    evaledHead = evaledHead.value
  }

  if (
    is.aFunction(evaledHead) &&
    evaledHead.name === 'deref' &&
    node.args.length >= 1 &&
    node.args.length <= 3
  ) {
    return walkDerefAsync(node, evaledHead, frame, env, ctx)
  }

  if (is.multiMethod(evaledHead)) {
    const args: CljValue[] = []
    for (const arg of node.args) {
      args.push(await walkNodeAsync(arg, frame, env, ctx))
    }
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

  const args: CljValue[] = []
  for (const arg of node.args) {
    args.push(await walkNodeAsync(arg, frame, env, ctx))
  }
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
 * `@`/deref inside an async body, over nodes. Await-or-identity:
 *   pending + (deref p)                        → await (no timeout — JS/JVM parity)
 *   pending + (deref p timeout-ms timeout-val) → race, timeout RETURNS timeout-val
 *   atom/volatile/reduced/delay                → sync deref native
 *   anything else                              → the value, as-is
 */
async function walkDerefAsync(
  node: InvokeNode,
  derefFn: CljValue,
  frame: EvalFrame,
  env: Env,
  ctx: EvaluationContext
): Promise<CljValue> {
  const val = await walkNodeAsync(node.args[0], frame, env, ctx)
  if (is.pending(val)) {
    if (node.args.length === 1) return val.promise
    if (node.args.length !== 3) {
      throw new EvaluationError(
        'deref of a pending expects (deref p) or (deref p timeout-ms timeout-val)',
        { list: node.form, env },
        getPos(node.form)
      )
    }
    const t = await walkNodeAsync(node.args[1], frame, env, ctx)
    if (!is.number(t)) {
      throw new EvaluationError(
        'deref timeout must be a number (milliseconds)',
        { t }
      )
    }
    const timeoutVal = await walkNodeAsync(node.args[2], frame, env, ctx)
    return racePendingTimeout(val, t.value, timeoutVal)
  }
  if (SYNC_DEREFABLE_KINDS.has(val.kind)) {
    return ctx.applyCallable(derefFn, [val], env)
  }
  return val
}
