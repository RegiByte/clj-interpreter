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
import { EvaluationError } from '../errors'
import { getPos } from '../positions'
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
  // A symbol that evaluated to itself (shouldn't happen, but guard anyway)
  if (disc.kind === 'symbol') return true

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
