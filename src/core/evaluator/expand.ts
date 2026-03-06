import { isList, isMap, isMacro, isSymbol, isVector } from '../assertions'
import { tryLookup } from '../env'
import { cljList, cljMap, cljVector } from '../factories'
import type { CljValue, Env, EvaluationContext } from '../types'

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
  if (isVector(form)) {
    const expanded = form.value.map((sub) => macroExpandAllWithContext(sub, env, ctx))
    return expanded.every((e, i) => e === form.value[i]) ? form : cljVector(expanded)
  }

  // Maps: expand each key and value
  if (isMap(form)) {
    const expanded = form.entries.map(
      ([k, v]) =>
        [
          macroExpandAllWithContext(k, env, ctx),
          macroExpandAllWithContext(v, env, ctx),
        ] as [CljValue, CljValue]
    )
    return expanded.every(([k, v], i) => k === form.entries[i][0] && v === form.entries[i][1])
      ? form
      : cljMap(expanded)
  }

  // Atoms (number, string, boolean, keyword, nil, symbol, regex, functions, etc.)
  if (!isList(form)) return form

  // Empty list
  if (form.value.length === 0) return form

  const first = form.value[0]

  // Non-symbol head (e.g. anonymous fn call `((fn [x] x) 5)`): expand all sub-forms
  if (!isSymbol(first)) {
    const expanded = form.value.map((sub) => macroExpandAllWithContext(sub, env, ctx))
    return expanded.every((e, i) => e === form.value[i]) ? form : cljList(expanded)
  }

  const name = first.name

  // Stop at quote / quasiquote — do not expand inside template literals
  if (name === 'quote' || name === 'quasiquote') return form

  // Check whether the head resolves to a macro in the current env.
  // tryLookup returns undefined for unknown symbols (forward refs, fn params, etc.)
  // avoiding the try/catch exception path entirely.
  const macroOrUnknown = tryLookup(name, env)
  if (macroOrUnknown !== undefined && isMacro(macroOrUnknown)) {
    const expanded = ctx.applyMacro(macroOrUnknown, form.value.slice(1))
    // Keep expanding until no more macros at the top level
    return macroExpandAllWithContext(expanded, env, ctx)
  }

  // Special forms and function calls: expand all sub-forms
  const expanded = form.value.map((sub) => macroExpandAllWithContext(sub, env, ctx))
  return expanded.every((e, i) => e === form.value[i]) ? form : cljList(expanded)
}
