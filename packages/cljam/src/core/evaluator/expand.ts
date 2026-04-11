import { is } from '../assertions'
import { derefValue, getNamespaceEnv, tryLookup } from '../env'
import { v } from '../factories'
import { toSeq } from '../transformations'
import type { CljValue, Env, EvaluationContext } from '../types'
import { expandQuasiquote } from './quasiquote'

/**
 * Fully expands all macros in `form` recursively.
 *
 * Rules:
 * - Atoms and symbols are returned as-is.
 * - Vectors and maps: each element/entry is expanded (handles let binding values, etc.).
 * - `quote` / `quasiquote`: expansion stops — template literals must not be touched.
 * - List with a macro as head: apply the macro, then recursively expand the result.
 * - Everything else (special forms, function calls, unknown symbols): expand sub-forms.
 *
 * `fn` and `loop` bodies are expanded in-place — they are not boundaries.
 * The recur tail-position check in evaluateFn/evaluateLoop operates on the already-expanded body.
 *
 * Identity-preserving: if no sub-form changes, the original object is returned as-is.
 * This avoids GC pressure for macro-free code (the common case in evaluated expressions).
 */
export function macroExpandAllWithContext(
  form: CljValue,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  // Vectors: expand each element (covers [x (some-macro ...)] in let bindings etc.)
  if (is.vector(form)) {
    const expanded = form.value.map((sub) =>
      macroExpandAllWithContext(sub, env, ctx)
    )
    return expanded.every((e, i) => e === form.value[i])
      ? form
      : v.vector(expanded)
  }

  // Maps: expand each key and value
  if (is.map(form)) {
    const expanded = form.entries.map(
      ([k, v]) =>
        [
          macroExpandAllWithContext(k, env, ctx),
          macroExpandAllWithContext(v, env, ctx),
        ] as [CljValue, CljValue]
    )
    return expanded.every(
      ([k, v], i) => k === form.entries[i][0] && v === form.entries[i][1]
    )
      ? form
      : v.map(expanded)
  }

  // Cons cells and lazy seqs (e.g. from macro output using `cons`/`list*`): materialize
  // as a proper list so the expander and evaluator can treat them as code forms.
  // In Clojure, any ISeq can appear in code position; CljCons/CljLazySeq are the
  // Conjure-JS equivalents that macros like `fn` produce via `cons`/`list*`.
  if (is.cons(form) || is.lazySeq(form)) {
    return macroExpandAllWithContext(v.list(toSeq(form)), env, ctx)
  }

  // Atoms (number, string, boolean, keyword, nil, symbol, regex, functions, etc.)
  if (!is.list(form)) return form

  // Empty list
  if (form.value.length === 0) return form

  const first = form.value[0]

  // Non-symbol head (e.g. anonymous fn call `((fn [x] x) 5)`): expand all sub-forms
  if (!is.symbol(first)) {
    const expanded = form.value.map((sub) =>
      macroExpandAllWithContext(sub, env, ctx)
    )
    return expanded.every((e, i) => e === form.value[i])
      ? form
      : v.list(expanded)
  }

  const name = first.name

  // Stop at quote — do not expand inside quoted literals
  if (name === 'quote') return form

  // Quasiquote: purely syntactic transform → generate a code form, then
  // further-expand the result so any macros inside unquoted expressions run.
  if (name === 'quasiquote') {
    const expanded = expandQuasiquote(form.value[1])
    return macroExpandAllWithContext(expanded, env, ctx)
  }

  // Check whether the head resolves to a macro in the current env.
  // tryLookup returns undefined for unknown symbols (forward refs, fn params, etc.)
  // avoiding the try/catch exception path entirely.
  // For qualified symbols like clojure.core/when-let or aliased m/my-macro,
  // resolve via local :as alias first, then full namespace name.
  let macroOrUnknown: CljValue | undefined
  const slashIdx = name.indexOf('/')
  if (slashIdx > 0 && slashIdx < name.length - 1) {
    const nsPrefix = name.slice(0, slashIdx)
    const localName = name.slice(slashIdx + 1)
    const nsEnv = getNamespaceEnv(env)
    const targetNs =
      nsEnv.ns?.aliases.get(nsPrefix) ?? ctx.resolveNs(nsPrefix) ?? null
    if (targetNs) {
      const v = targetNs.vars.get(localName)
      macroOrUnknown = v !== undefined ? derefValue(v) : undefined
    }
  } else {
    macroOrUnknown = tryLookup(name, env)
  }
  if (macroOrUnknown !== undefined && is.macro(macroOrUnknown)) {
    const expanded = ctx.applyMacro(macroOrUnknown, form.value.slice(1))
    // Keep expanding until no more macros at the top level
    return macroExpandAllWithContext(expanded, env, ctx)
  }

  // Special forms and function calls: expand all sub-forms
  const expanded = form.value.map((sub) =>
    macroExpandAllWithContext(sub, env, ctx)
  )
  return expanded.every((e, i) => e === form.value[i]) ? form : v.list(expanded)
}
