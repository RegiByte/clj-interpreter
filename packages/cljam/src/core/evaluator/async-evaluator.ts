/**
 * Async sub-evaluator for (async ...) blocks.
 *
 * ## Architecture invariant
 *
 * The SYNC evaluator (evaluate.ts / special-forms.ts / apply.ts) is the
 * canonical path. This file is a thin async wrapper — it handles only the
 * forms that can contain sub-expressions that must be awaited (CljPending
 * values unwrapped via @). Everything else delegates to asyncCtx.syncCtx.
 *
 * Design rule: never add `await` to the sync evaluator. Even trivial forms
 * like (+ 1 2) must remain zero-overhead synchronous. The async path pays
 * the Promise overhead only for code inside (async ...) blocks.
 *
 * ## What needs an async handler vs. what delegates to sync
 *
 * Forms with their own async handler (can contain @ sub-expressions):
 *   - `if`, `do`, `let/let*`, `loop`, `recur`, `try`, `set!`
 *
 * Forms that are safe to delegate to syncCtx.evaluate:
 *   - `quote`, `var`, `fn/fn*`, `ns` — no sub-expression evaluation at the
 *     creation site; fn bodies are evaluated async only when the fn is called.
 *   - `defmacro`, `defmulti`, `defmethod`, `letfn`, `delay`, `lazy-seq`,
 *     `quasiquote` — create thunks or install definitions; content is
 *     evaluated lazily or later.
 *   - `binding` — V1 limitation: async-computed binding values are not
 *     supported. Bind the var before the async block and use set! if needed.
 *   - `.`, `js/new` — JS interop is sync; args are NOT awaited before the
 *     call (V1 limitation: deref @ pending values explicitly before the form).
 *   - `async` — nested async blocks create a new CljPending via the sync path.
 *   - `def` — throws with a helpful message; define vars outside async blocks.
 *
 * ## Revert instructions
 *
 * To remove the async feature: delete this file, remove the `async` case and
 * its import in special-forms.ts, remove CljPending from types.ts, remove
 * cljPending from factories.ts, remove the pending case from printer.ts,
 * and delete async-fns.ts from stdlib.
 *
 * Design session: .regibyte/sessions/87-async-pending-design-and-plan.md
 */

import { is } from '../assertions'
import { extend } from '../env'
import { CljThrownSignal, EvaluationError } from '../errors'
import { cljNil, v } from '../factories'
import { specialFormKeywords, valueKeywords } from '../keywords'
import type { CljList, CljValue, Env, EvaluationContext } from '../types'
import { bindParams, RecurSignal, resolveArity } from './arity'
import { destructureBindings } from './destructure'
import {
  matchesDiscriminator,
  parseTryStructure,
  validateBindingVector,
} from './form-parsers'

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
    case valueKeywords.number:
    case valueKeywords.string:
    case valueKeywords.boolean:
    case valueKeywords.keyword:
    case valueKeywords.nil:
    case valueKeywords.symbol:
    case valueKeywords.function:
    case valueKeywords.nativeFunction:
    case valueKeywords.macro:
    case valueKeywords.multiMethod:
    case valueKeywords.atom:
    case valueKeywords.reduced:
    case valueKeywords.volatile:
    case valueKeywords.regex:
    case valueKeywords.var:
    case valueKeywords.delay:
    case valueKeywords.lazySeq:
    case valueKeywords.cons:
    case valueKeywords.namespace:
    case valueKeywords.pending:
      return asyncCtx.syncCtx.evaluate(expr, env)
  }

  if (is.vector(expr)) {
    const elements: CljValue[] = []
    for (const el of expr.value) {
      elements.push(await evaluateFormAsync(el, env, asyncCtx))
    }
    return v.vector(elements)
  }

  if (is.map(expr)) {
    const entries: [CljValue, CljValue][] = []
    for (const [k, v] of expr.entries) {
      const ek = await evaluateFormAsync(k, env, asyncCtx)
      const ev = await evaluateFormAsync(v, env, asyncCtx)
      entries.push([ek, ev])
    }
    return v.map(entries)
  }

  if (is.set(expr)) {
    const elements: CljValue[] = []
    for (const el of expr.values) {
      elements.push(await evaluateFormAsync(el, env, asyncCtx))
    }
    return v.set(elements)
  }

  if (is.list(expr)) {
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
  let result: CljValue = v.nil()
  for (const form of forms) {
    const expanded = asyncCtx.syncCtx.expandAll(form, env)
    result = await evaluateFormAsync(expanded, env, asyncCtx)
  }
  return result
}

// ---- List evaluation ----

// Must mirror specialFormKeywords in special-forms.ts.
// If a new special form is added to the sync dispatcher and omitted here,
// (async ...) blocks will silently treat it as a function call at runtime.
// Add new forms here and delegate to syncCtx if no async-aware handling needed.
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
  'loop*',
  'recur',
  'binding',
  'set!',
  'try',
  'var',
  'defmacro',
  'letfn*',
  'lazy-seq',
  'ns',
  'async',
  // JS interop — delegate to sync; args inside (async ...) are not awaited
  // before the interop call (V1 limitation: use @ explicitly before the form).
  '.',
  'js/new',
])

async function evaluateListAsync(
  list: CljList,
  env: Env,
  asyncCtx: AsyncEvalCtx
): Promise<CljValue> {
  if (list.value.length === 0) return list

  const head = list.value[0]

  // Special forms: dispatch to async-aware handlers for the ones that need it,
  // delegate to sync ctx for safe ones (quote, var, fn, ns).
  if (is.symbol(head) && ASYNC_SPECIAL_FORMS.has(head.name)) {
    return evaluateSpecialFormAsync(head.name, list, env, asyncCtx)
  }

  // Evaluate the head (function position)
  const fn = await evaluateFormAsync(head, env, asyncCtx)

  // Deref interception: @x expands to (deref x).
  // If the dereffed value is CljPending, await it here — this is the heart of async @.
  if (is.aFunction(fn) && fn.name === 'deref' && list.value.length === 2) {
    const val = await evaluateFormAsync(list.value[1], env, asyncCtx)
    if (is.pending(val)) {
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
  list: CljList,
  env: Env,
  asyncCtx: AsyncEvalCtx
): Promise<CljValue> {
  switch (name) {
    // Safe to delegate to sync: no sub-evaluation of async expressions
    case specialFormKeywords.quote:
    case specialFormKeywords.var:
    case specialFormKeywords.ns:
    // fn/fn*: function CREATION is sync — the body is evaluated async only when called.
    // fn is now a macro (expands to fn*); expand then delegate to sync.
    case 'fn':
    case 'fn*':
      return asyncCtx.syncCtx.evaluate(list, env)

    // recur: evaluate args async, then throw RecurSignal
    case specialFormKeywords.recur: {
      const args: CljValue[] = []
      for (const arg of list.value.slice(1)) {
        args.push(await evaluateFormAsync(arg, env, asyncCtx))
      }
      throw new RecurSignal(args)
    }

    // do: sequential evaluation
    case specialFormKeywords.do:
      return evaluateFormsAsync(list.value.slice(1), env, asyncCtx)

    // def: V1 does not support def inside (async ...) — unusual use case
    case specialFormKeywords.def:
      throw new EvaluationError(
        'def inside (async ...) is not supported. Define vars outside the async block.',
        { list, env }
      )

    // if: evaluate condition, then selected branch
    case specialFormKeywords.if: {
      const condition = await evaluateFormAsync(list.value[1], env, asyncCtx)
      const isTruthy =
        !is.nil(condition) && !(is.boolean(condition) && !condition.value)
      if (isTruthy) {
        return evaluateFormAsync(list.value[2], env, asyncCtx)
      }
      return list.value[3] !== undefined
        ? evaluateFormAsync(list.value[3], env, asyncCtx)
        : v.nil()
    }

    // let/let*: sequential bindings (value eval is async, pattern binding is sync).
    // let is now a macro (expands to let*); macroexpand then re-eval so the
    // expanded let* form is handled by the case below.
    case 'let': {
      const expanded = asyncCtx.syncCtx.expandAll(list, env)
      return evaluateFormAsync(expanded, env, asyncCtx)
    }
    case specialFormKeywords['let*']:
      return evaluateLetAsync(list, env, asyncCtx)

    // loop/loop*: like let but supports recur.
    // loop is now a macro (expands to let/loop*); macroexpand then re-eval.
    case 'loop': {
      const expanded = asyncCtx.syncCtx.expandAll(list, env)
      return evaluateFormAsync(expanded, env, asyncCtx)
    }
    case specialFormKeywords['loop*']:
      return evaluateLoopAsync(list, env, asyncCtx)

    // binding: evaluate binding values async, then body
    case specialFormKeywords.binding:
      return evaluateBindingAsync(list, env, asyncCtx)

    // try: evaluate body async, handle catch/finally async
    case specialFormKeywords.try:
      return evaluateTryAsync(list, env, asyncCtx)

    // set!: evaluate new value async, then call sync set! logic
    case specialFormKeywords['set!']: {
      // Re-delegate to sync ctx with the value already evaluated.
      // The sync set! handler will re-evaluate list.value[2] as a form —
      // that won't work with an already-evaluated value. So we call the sync
      // evaluator on a reconstructed list with the value quoted.
      const newVal = await evaluateFormAsync(list.value[2], env, asyncCtx)
      const quoted = v.list([v.symbol(specialFormKeywords.quote), newVal])
      const newList = v.list([list.value[0], list.value[1], quoted])
      return asyncCtx.syncCtx.evaluate(newList, env)
    }

    // defmacro, quasiquote, defmulti, defmethod, letfn, delay, lazy-seq, async:
    // delegate to sync evaluator (they don't have async sub-expressions in their
    // definition forms, or they create thunks that are evaluated sync later)
    default:
      return asyncCtx.syncCtx.evaluate(list, env)
  }
}

async function evaluateLetAsync(
  list: CljList,
  env: Env,
  asyncCtx: AsyncEvalCtx
): Promise<CljValue> {
  const bindings = list.value[1]
  validateBindingVector(bindings, 'let*', env)

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
  list: CljList,
  env: Env,
  asyncCtx: AsyncEvalCtx
): Promise<CljValue> {
  const loopBindings = list.value[1]
  validateBindingVector(loopBindings, 'loop*', env)

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
  list: CljList,
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
  list: CljList,
  env: Env,
  asyncCtx: AsyncEvalCtx
): Promise<CljValue> {
  // parseTryStructure validates catch/finally structure (binding symbol, ordering).
  // matchesDiscriminator uses asyncCtx.syncCtx — discriminator evaluation is always
  // synchronous (keyword checks, predicate calls on already-resolved values).
  const { bodyForms, catchClauses, finallyForms } = parseTryStructure(list, env)

  let result: CljValue = v.nil()
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
        kind: valueKeywords.map,
        entries: [
          [v.keyword(':type'), v.keyword(':error/runtime')],
          [v.keyword(':message'), v.string((e as Error).message)],
        ],
      }
    } else {
      throw e
    }

    let handled = false
    for (const clause of catchClauses) {
      if (
        matchesDiscriminator(
          clause.discriminator,
          thrownValue,
          env,
          asyncCtx.syncCtx
        )
      ) {
        const catchEnv = extend([clause.binding], [thrownValue], env)
        result = await evaluateFormsAsync(clause.body, catchEnv, asyncCtx)
        handled = true
        break
      }
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
  if (is.nativeFunction(fn)) {
    // Native functions are sync — call as-is.
    // We do NOT auto-await CljPending results here: the caller is responsible
    // for awaiting (via @ deref interception or then/catch). This preserves
    // the ability to pass pending values around as first-class values.
    if (fn.fnWithContext) {
      return fn.fnWithContext(asyncCtx.syncCtx, callEnv, ...args)
    }
    return fn.fn(...args)
  }

  if (is.function(fn)) {
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
