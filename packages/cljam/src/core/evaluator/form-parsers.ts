/**
 * Shared structural parsers for special forms.
 *
 * These helpers are pure data transformations — no evaluation, no side effects.
 * Both the sync evaluator (special-forms.ts) and the async evaluator
 * (async-evaluator.ts) import from here so the logic lives in exactly one place.
 *
 * matchesDiscriminator also lives here because it is the same algorithm in both
 * paths — only the EvaluationContext it receives differs (the real ctx in sync,
 * asyncCtx.syncCtx in async, which is correct: discriminator matching is
 * inherently synchronous).
 */

import { is } from '../assertions'
import { CljThrownSignal, EvaluationError, isEvaluationError } from '../errors'
import { v } from '../factories'
import { framesToClj, getPos } from '../positions'
import type {
  CljFunction,
  CljList,
  CljNativeFunction,
  CljValue,
  CljVector,
  Env,
  EvaluationContext,
} from '../types'

// ---- let / loop bindings ----

/**
 * Validates that a binding vector is well-formed: must be a vector with an
 * even number of forms. Used by let and loop handlers in both the sync and
 * async evaluators so the error messages are consistent.
 *
 * @param formName  Display name for the error message, e.g. 'let' or 'loop'.
 */
export function validateBindingVector(
  vec: CljValue,
  formName: string,
  env: Env
): asserts vec is CljVector {
  if (!is.vector(vec)) {
    throw new EvaluationError(`${formName} bindings must be a vector`, {
      bindings: vec,
      env,
    }, getPos(vec))
  }
  if (vec.value.length % 2 !== 0) {
    throw new EvaluationError(
      `${formName} bindings must have an even number of forms`,
      { bindings: vec, env },
      getPos(vec)
    )
  }
}

// ---- try ----

export type CatchClause = {
  discriminator: CljValue
  binding: string
  body: CljValue[]
}

export type TryStructure = {
  bodyForms: CljValue[]
  catchClauses: CatchClause[]
  finallyForms: CljValue[] | null
}

/**
 * Splits a (try ...) list into body forms, catch clauses, and an optional
 * finally clause. Validates that catch has a discriminator + binding symbol and
 * that finally (if present) is the last form.
 */
export function parseTryStructure(list: CljList, env: Env = {} as Env): TryStructure {
  const forms = list.value.slice(1)
  const bodyForms: CljValue[] = []
  const catchClauses: CatchClause[] = []
  let finallyForms: CljValue[] | null = null

  for (let i = 0; i < forms.length; i++) {
    const form = forms[i]
    if (is.list(form) && form.value.length > 0 && is.symbol(form.value[0])) {
      const head = form.value[0].name

      if (head === 'catch') {
        if (form.value.length < 3) {
          throw new EvaluationError(
            'catch requires a discriminator and a binding symbol',
            { form, env },
            getPos(form)
          )
        }
        const discriminator = form.value[1]
        const bindingSym = form.value[2]
        if (!is.symbol(bindingSym)) {
          throw new EvaluationError('catch binding must be a symbol', {
            form,
            env,
          }, getPos(bindingSym) ?? getPos(form))
        }
        catchClauses.push({
          discriminator,
          binding: bindingSym.name,
          body: form.value.slice(3),
        })
        continue
      }

      if (head === 'finally') {
        if (i !== forms.length - 1) {
          throw new EvaluationError(
            'finally clause must be the last in try expression',
            { form, env },
            getPos(form)
          )
        }
        finallyForms = form.value.slice(1)
        continue
      }
    }
    bodyForms.push(form)
  }

  return { bodyForms, catchClauses, finallyForms }
}

/**
 * Determines whether a catch clause's discriminator matches a thrown value.
 *
 * Rules (same as Clojure-on-JVM, adapted for JS runtime):
 * - Discriminator evaluates to a symbol → catch-all (JVM class names fall here)
 * - `:default` keyword → catch-all
 * - Any other keyword → matches if thrown is a map with a :type entry equal to
 *   the discriminator keyword
 * - A callable function → call it with the thrown value; truthy = match
 * - Anything else → error
 *
 * @param ctx  Use the real EvaluationContext in sync paths; use asyncCtx.syncCtx
 *             in async paths. Discriminator matching is always synchronous.
 */
export function matchesDiscriminator(
  discriminator: CljValue,
  thrown: CljValue,
  env: Env,
  ctx: EvaluationContext
): boolean {
  let disc: CljValue
  try {
    disc = ctx.evaluate(discriminator, env)
  } catch {
    // Discriminator failed to evaluate (e.g. unresolvable Java class name like
    // java.lang.Throwable). Treat as catch-all — we're not on the JVM.
    return true
  }
  return matchesDiscriminatorValue(disc, thrown, env, ctx)
}

/**
 * The value half of `matchesDiscriminator`: matching rules applied to an
 * already-evaluated discriminator. Split out so the AST walker can evaluate
 * discriminator NODES itself (locals live in slot frames, not the Env chain)
 * and still share the exact matching semantics with the form path.
 */
export function matchesDiscriminatorValue(
  disc: CljValue,
  thrown: CljValue,
  env: Env,
  ctx: EvaluationContext
): boolean {
  // A symbol that evaluated to itself (shouldn't happen, but guard anyway)
  if (is.symbol(disc)) return true

  if (is.keyword(disc)) {
    if (disc.name === ':default') return true
    if (!is.map(thrown)) return false
    const typeEntry = thrown.entries.find(
      ([k]) => is.keyword(k) && k.name === ':type'
    )
    if (!typeEntry) return false
    return is.equal(typeEntry[1], disc)
  }

  if (is.aFunction(disc)) {
    const result = ctx.applyFunction(
      disc as CljFunction | CljNativeFunction,
      [thrown],
      env
    )
    return is.truthy(result)
  }

  throw new EvaluationError(
    'catch discriminator must be a keyword or a predicate function',
    { discriminator: disc, env }
  )
}

// ---- thrown-value normalization ----

/**
 * The error map handed to catch handlers for cljam's own runtime errors:
 * {:type <:code>|:error/runtime :message <msg> :frames <frames>?}.
 */
export function evaluationErrorToCljMap(
  error: EvaluationError,
  ctx: EvaluationContext
): CljValue {
  const typeKeyword = error.code
    ? v.keyword(`:${error.code}`)
    : v.keyword(':error/runtime')
  const entries: [CljValue, CljValue][] = [
    [v.keyword(':type'), typeKeyword],
    [v.keyword(':message'), v.string(error.message)],
  ]
  if (error.frames && error.frames.length > 0) {
    entries.push([
      v.keyword(':frames'),
      framesToClj(error.frames, ctx.currentSource),
    ])
  }
  return v.map(entries)
}

/**
 * THE rejection/throw normalization table. Every construct that hands a
 * thrown value to user code — sync `try` (interpreter and AST walker),
 * async `try`, and `catch*` — observes thrown JS values through this one
 * function, so the same underlying error always takes the same shape:
 *
 *   CljThrownSignal → the thrown CljValue, verbatim
 *   EvaluationError → error map via evaluationErrorToCljMap
 *   anything else   → null — a host fault; the observer must rethrow it
 */
export function thrownValueForHandler(
  e: unknown,
  ctx: EvaluationContext
): CljValue | null {
  if (e instanceof CljThrownSignal) return e.value
  if (isEvaluationError(e)) return evaluationErrorToCljMap(e, ctx)
  return null
}
