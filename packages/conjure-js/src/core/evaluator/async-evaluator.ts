/**
 * Async sub-evaluator for (async ...) blocks.
 *
 * EXPERIMENTAL — gated behind the (async ...) special form in special-forms.ts.
 * To revert: delete this file, remove the `async` case + import in special-forms.ts,
 * remove CljPending from types.ts, remove cljPending from factories.ts,
 * remove the pending case from printer.ts, delete async-fns.ts.
 *
 * Design: .regibyte/sessions/87-async-pending-design-and-plan.md
 */

import { isAFunction, isVector } from '../assertions'
import { extend } from '../env'
import { CljThrownSignal, EvaluationError } from '../errors'
import { cljNil } from '../factories'
import type { CljValue, Env, EvaluationContext } from '../types'
import { bindParams, RecurSignal, resolveArity } from './arity'
import { destructureBindings } from './destructure'

// ---- AsyncEvalCtx ----
// A parallel evaluation context where all dispatch methods are async.
// Carries the original syncCtx for delegation of sync-only forms.

type AsyncEvalCtx = {
  evaluate: (expr: CljValue, env: Env) => Promise<CljValue>
  evaluateForms: (forms: CljValue[], env: Env) => Promise<CljValue>
  applyCallable: (
    fn: CljValue,
    args: CljValue[],
    callEnv: Env
  ) => Promise<CljValue>
  syncCtx: EvaluationContext
}

export function createAsyncEvalCtx(syncCtx: EvaluationContext): AsyncEvalCtx {
  const asyncCtx: AsyncEvalCtx = {
    syncCtx,
    evaluate: (expr, env) => evaluateFormAsync(expr, env, asyncCtx),
    evaluateForms: (forms, env) => evaluateFormsAsync(forms, env, asyncCtx),
    applyCallable: (fn, args, callEnv) =>
      applyCallableAsync(fn, args, callEnv, asyncCtx),
  }
  return asyncCtx
}

// ---- Main async dispatch ----

async function evaluateFormAsync(
  expr: CljValue,
  env: Env,
  asyncCtx: AsyncEvalCtx
): Promise<CljValue> {
  // Self-evaluating forms and symbols: delegate directly to sync evaluator.
  // No async needed — these don't contain sub-expressions that could be pending.
  switch (expr.kind) {
    case 'number':
    case 'string':
    case 'boolean':
    case 'keyword':
    case 'nil':
    case 'symbol':
    case 'function':
    case 'native-function':
    case 'macro':
    case 'multi-method':
    case 'atom':
    case 'reduced':
    case 'volatile':
    case 'regex':
    case 'var':
    case 'delay':
    case 'lazy-seq':
    case 'cons':
    case 'namespace':
    case 'pending':
      return asyncCtx.syncCtx.evaluate(expr, env)
  }

  if (expr.kind === 'vector') {
    const elements: CljValue[] = []
    for (const el of expr.value) {
      elements.push(await evaluateFormAsync(el, env, asyncCtx))
    }
    return { kind: 'vector', value: elements }
  }

  if (expr.kind === 'map') {
    const entries: [CljValue, CljValue][] = []
    for (const [k, v] of expr.entries) {
      const ek = await evaluateFormAsync(k, env, asyncCtx)
      const ev = await evaluateFormAsync(v, env, asyncCtx)
      entries.push([ek, ev])
    }
    return { kind: 'map', entries }
  }

  if (expr.kind === 'set') {
    const elements: CljValue[] = []
    for (const el of expr.values) {
      elements.push(await evaluateFormAsync(el, env, asyncCtx))
    }
    return { kind: 'set', values: elements }
  }

  if (expr.kind === 'list') {
    return evaluateListAsync(expr, env, asyncCtx)
  }

  // Unreachable — all CljValue kinds are handled above
  return asyncCtx.syncCtx.evaluate(expr, env)
}

async function evaluateFormsAsync(
  forms: CljValue[],
  env: Env,
  asyncCtx: AsyncEvalCtx
): Promise<CljValue> {
  let result: CljValue = cljNil()
  for (const form of forms) {
    const expanded = asyncCtx.syncCtx.expandAll(form, env)
    result = await evaluateFormAsync(expanded, env, asyncCtx)
  }
  return result
}

// ---- List evaluation ----

const ASYNC_SPECIAL_FORMS = new Set([
  'quote',
  'def',
  'if',
  'do',
  'let',
  'let*',
  'fn',
  'fn*',
  'loop',
  'recur',
  'binding',
  'set!',
  'try',
  'var',
  'defmacro',
  'defmulti',
  'defmethod',
  'letfn',
  'quasiquote',
  'delay',
  'lazy-seq',
  'ns',
  'async',
])

async function evaluateListAsync(
  list: { kind: 'list'; value: CljValue[] },
  env: Env,
  asyncCtx: AsyncEvalCtx
): Promise<CljValue> {
  if (list.value.length === 0) return list

  const first = list.value[0]

  // Special forms: dispatch to async-aware handlers for the ones that need it,
  // delegate to sync ctx for safe ones (quote, var, fn, ns).
  if (first.kind === 'symbol' && ASYNC_SPECIAL_FORMS.has(first.name)) {
    return evaluateSpecialFormAsync(first.name, list, env, asyncCtx)
  }

  // Evaluate the head (function position)
  const fn = await evaluateFormAsync(first, env, asyncCtx)

  // Deref interception: @x expands to (deref x).
  // If the dereffed value is CljPending, await it here — this is the heart of async @.
  if (
    isAFunction(fn) &&
    fn.name === 'deref' &&
    list.value.length === 2
  ) {
    const val = await evaluateFormAsync(list.value[1], env, asyncCtx)
    if (val.kind === 'pending') {
      return val.promise // await the pending value
    }
    // Not pending: normal sync deref
    return asyncCtx.syncCtx.applyCallable(fn, [val], env)
  }

  // Evaluate args sequentially (left-to-right, preserving side-effect order)
  const args: CljValue[] = []
  for (const arg of list.value.slice(1)) {
    args.push(await evaluateFormAsync(arg, env, asyncCtx))
  }

  return applyCallableAsync(fn, args, env, asyncCtx)
}

// ---- Special form async handlers ----

async function evaluateSpecialFormAsync(
  name: string,
  list: { kind: 'list'; value: CljValue[] },
  env: Env,
  asyncCtx: AsyncEvalCtx
): Promise<CljValue> {
  switch (name) {
    // Safe to delegate to sync: no sub-evaluation of async expressions
    case 'quote':
    case 'var':
    case 'ns':
    // fn/fn*: function CREATION is sync — the body is evaluated async only when called
    case 'fn':
    case 'fn*':
      return asyncCtx.syncCtx.evaluate(list, env)

    // recur: evaluate args async, then throw RecurSignal
    case 'recur': {
      const args: CljValue[] = []
      for (const arg of list.value.slice(1)) {
        args.push(await evaluateFormAsync(arg, env, asyncCtx))
      }
      throw new RecurSignal(args)
    }

    // do: sequential evaluation
    case 'do':
      return evaluateFormsAsync(list.value.slice(1), env, asyncCtx)

    // def: V1 does not support def inside (async ...) — unusual use case
    case 'def':
      throw new EvaluationError(
        'def inside (async ...) is not supported. Define vars outside the async block.',
        { list, env }
      )

    // if: evaluate condition, then selected branch
    case 'if': {
      const condition = await evaluateFormAsync(list.value[1], env, asyncCtx)
      const isTruthy =
        condition.kind !== 'nil' &&
        !(condition.kind === 'boolean' && !condition.value)
      if (isTruthy) {
        return evaluateFormAsync(list.value[2], env, asyncCtx)
      }
      return list.value[3] !== undefined
        ? evaluateFormAsync(list.value[3], env, asyncCtx)
        : cljNil()
    }

    // let/let*: sequential bindings (value eval is async, pattern binding is sync)
    case 'let':
    case 'let*':
      return evaluateLetAsync(list, env, asyncCtx)

    // loop: like let but supports recur
    case 'loop':
      return evaluateLoopAsync(list, env, asyncCtx)

    // binding: evaluate binding values async, then body
    case 'binding':
      return evaluateBindingAsync(list, env, asyncCtx)

    // try: evaluate body async, handle catch/finally async
    case 'try':
      return evaluateTryAsync(list, env, asyncCtx)

    // set!: evaluate new value async, then call sync set! logic
    case 'set!': {
      // Re-delegate to sync ctx with the value already evaluated.
      // The sync set! handler will re-evaluate list.value[2] as a form —
      // that won't work with an already-evaluated value. So we call the sync
      // evaluator on a reconstructed list with the value quoted.
      const newVal = await evaluateFormAsync(list.value[2], env, asyncCtx)
      const quotedVal: CljValue = {
        kind: 'list',
        value: [{ kind: 'symbol', name: 'quote' }, newVal],
      }
      const newList: CljValue = {
        kind: 'list',
        value: [list.value[0], list.value[1], quotedVal],
      }
      return asyncCtx.syncCtx.evaluate(newList, env)
    }

    // quasiquote: delegate to sync — expansion is structural, no async sub-eval
    case 'quasiquote':
      return asyncCtx.syncCtx.evaluate(list, env)

    // defmacro, defmulti, defmethod, letfn, delay, lazy-seq, async:
    // delegate to sync evaluator (they don't have async sub-expressions in their
    // definition forms, or they create thunks that are evaluated sync later)
    default:
      return asyncCtx.syncCtx.evaluate(list, env)
  }
}

async function evaluateLetAsync(
  list: { kind: 'list'; value: CljValue[] },
  env: Env,
  asyncCtx: AsyncEvalCtx
): Promise<CljValue> {
  const bindings = list.value[1]
  if (!isVector(bindings)) {
    throw new EvaluationError('let bindings must be a vector', { list, env })
  }
  if (bindings.value.length % 2 !== 0) {
    throw new EvaluationError(
      'let bindings must have an even number of forms',
      { list, env }
    )
  }

  let currentEnv = env
  const pairs = bindings.value
  for (let i = 0; i < pairs.length; i += 2) {
    const pattern = pairs[i]
    const valueForm = pairs[i + 1]
    // Value evaluation is async; pattern binding is purely structural (sync).
    const value = await evaluateFormAsync(valueForm, currentEnv, asyncCtx)
    const boundPairs = destructureBindings(
      pattern,
      value,
      asyncCtx.syncCtx,
      currentEnv
    )
    currentEnv = extend(
      boundPairs.map(([n]) => n),
      boundPairs.map(([, v]) => v),
      currentEnv
    )
  }
  return evaluateFormsAsync(list.value.slice(2), currentEnv, asyncCtx)
}

async function evaluateLoopAsync(
  list: { kind: 'list'; value: CljValue[] },
  env: Env,
  asyncCtx: AsyncEvalCtx
): Promise<CljValue> {
  const loopBindings = list.value[1]
  if (!isVector(loopBindings)) {
    throw new EvaluationError('loop bindings must be a vector', { list, env })
  }
  if (loopBindings.value.length % 2 !== 0) {
    throw new EvaluationError(
      'loop bindings must have an even number of forms',
      { list, env }
    )
  }

  const loopBody = list.value.slice(2)

  // Collect patterns and evaluate initial values async
  const patterns: CljValue[] = []
  let currentValues: CljValue[] = []
  let initEnv = env
  for (let i = 0; i < loopBindings.value.length; i += 2) {
    const pattern = loopBindings.value[i]
    const value = await evaluateFormAsync(
      loopBindings.value[i + 1],
      initEnv,
      asyncCtx
    )
    patterns.push(pattern)
    currentValues.push(value)
    const boundPairs = destructureBindings(
      pattern,
      value,
      asyncCtx.syncCtx,
      initEnv
    )
    initEnv = extend(
      boundPairs.map(([n]) => n),
      boundPairs.map(([, v]) => v),
      initEnv
    )
  }

  while (true) {
    let loopEnv = env
    for (let i = 0; i < patterns.length; i++) {
      const boundPairs = destructureBindings(
        patterns[i],
        currentValues[i],
        asyncCtx.syncCtx,
        loopEnv
      )
      loopEnv = extend(
        boundPairs.map(([n]) => n),
        boundPairs.map(([, v]) => v),
        loopEnv
      )
    }
    try {
      return await evaluateFormsAsync(loopBody, loopEnv, asyncCtx)
    } catch (e) {
      if (e instanceof RecurSignal) {
        if (e.args.length !== patterns.length) {
          throw new EvaluationError(
            `recur expects ${patterns.length} arguments but got ${e.args.length}`,
            { list, env }
          )
        }
        currentValues = e.args
        continue
      }
      throw e
    }
  }
}

async function evaluateBindingAsync(
  list: { kind: 'list'; value: CljValue[] },
  env: Env,
  asyncCtx: AsyncEvalCtx
): Promise<CljValue> {
  // Delegate to sync evaluator's binding form, but evaluate the binding values async.
  // The sync binding handler re-evaluates the binding forms — we need to pre-evaluate
  // them and pass them quoted. For V1, delegate to sync (binding values are usually
  // simple expressions; async binding values are an edge case).
  // This means dynamic bindings with async-computed values don't work in V1.
  // They can be assigned with set! after the binding is established.
  return asyncCtx.syncCtx.evaluate(list, env)
}

async function evaluateTryAsync(
  list: { kind: 'list'; value: CljValue[] },
  env: Env,
  asyncCtx: AsyncEvalCtx
): Promise<CljValue> {
  const forms = list.value.slice(1)
  const bodyForms: CljValue[] = []
  const catchClauses: Array<{
    discriminator: CljValue
    binding: string
    body: CljValue[]
  }> = []
  let finallyForms: CljValue[] | null = null

  for (let i = 0; i < forms.length; i++) {
    const form = forms[i]
    if (
      form.kind === 'list' &&
      form.value.length > 0 &&
      form.value[0].kind === 'symbol'
    ) {
      const head = form.value[0].name
      if (head === 'catch') {
        catchClauses.push({
          discriminator: form.value[1],
          binding: (form.value[2] as { name: string }).name,
          body: form.value.slice(3),
        })
        continue
      }
      if (head === 'finally') {
        finallyForms = form.value.slice(1)
        continue
      }
    }
    bodyForms.push(form)
  }

  let result: CljValue = cljNil()
  let pendingThrow: unknown = null

  try {
    result = await evaluateFormsAsync(bodyForms, env, asyncCtx)
  } catch (e) {
    if (e instanceof RecurSignal) throw e

    let thrownValue: CljValue
    if (e instanceof CljThrownSignal) {
      thrownValue = e.value
    } else if (e instanceof EvaluationError) {
      thrownValue = {
        kind: 'map',
        entries: [
          [
            { kind: 'keyword', name: ':type' },
            { kind: 'keyword', name: ':error/runtime' },
          ],
          [
            { kind: 'keyword', name: ':message' },
            { kind: 'string', value: (e as Error).message },
          ],
        ],
      }
    } else {
      throw e
    }

    let handled = false
    for (const clause of catchClauses) {
      // Simple catch-all: match everything (V1 — no type discrimination)
      const catchEnv = extend([clause.binding], [thrownValue], env)
      result = await evaluateFormsAsync(clause.body, catchEnv, asyncCtx)
      handled = true
      break
    }

    if (!handled) {
      pendingThrow = e
    }
  } finally {
    if (finallyForms) {
      await evaluateFormsAsync(finallyForms, env, asyncCtx)
    }
  }

  if (pendingThrow !== null) throw pendingThrow
  return result
}

// ---- applyCallable (async) ----

async function applyCallableAsync(
  fn: CljValue,
  args: CljValue[],
  callEnv: Env,
  asyncCtx: AsyncEvalCtx
): Promise<CljValue> {
  if (fn.kind === 'native-function') {
    // Native functions are sync — call as-is.
    // We do NOT auto-await CljPending results here: the caller is responsible
    // for awaiting (via @ deref interception or then/catch). This preserves
    // the ability to pass pending values around as first-class values.
    if (fn.fnWithContext) {
      return fn.fnWithContext(asyncCtx.syncCtx, callEnv, ...args)
    }
    return fn.fn(...args)
  }

  if (fn.kind === 'function') {
    const arity = resolveArity(fn.arities, args.length)
    let currentArgs = args
    while (true) {
      const localEnv = bindParams(
        arity.params,
        arity.restParam,
        currentArgs,
        fn.env,
        asyncCtx.syncCtx, // bindParams uses syncCtx only for structural destructuring
        callEnv
      )
      try {
        return await evaluateFormsAsync(arity.body, localEnv, asyncCtx)
      } catch (e) {
        if (e instanceof RecurSignal) {
          currentArgs = e.args
          continue
        }
        throw e
      }
    }
  }

  // keyword, map, and other callables: delegate to sync
  return asyncCtx.syncCtx.applyCallable(fn, args, callEnv)
}
