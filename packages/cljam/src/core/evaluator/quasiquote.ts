import { is } from '../assertions'
import { getNamespaceEnv, lookupVar } from '../env'
import { EvaluationError } from '../errors'
import { v } from '../factories'
import { makeGensym } from '../gensym'
import { specialFormKeywords, valueKeywords } from '../keywords'
import { setValues } from '../persistent/map-helpers'
import { type CljSet, type CljValue, type Env } from '../types'

/**
 * Symbols that must NEVER be auto-qualified in quasiquote templates.
 *
 * - All special forms (if, do, let*, fn*, def, try, binding, ...) — handled
 *   by the special-form evaluator, not as var lookups.
 * - `catch` and `finally` — sub-keywords of `try`, checked by exact string
 *   comparison in parseTryStructure, not in specialFormKeywords.
 * - `&` — rest-parameter marker, checked by exact string in parseParamVector.
 */
const NEVER_QUALIFY_SYMBOLS = new Set<string>([
  ...Object.keys(specialFormKeywords),
  'catch',
  'finally',
  '&',
])

function isUnquoteSplicing(elem: CljValue): boolean {
  return (
    is.list(elem) &&
    elem.value.length === 2 &&
    is.symbol(elem.value[0]) &&
    elem.value[0].name === 'unquote-splicing'
  )
}

/**
 * Builds the segment list for (apply <ctor> (concat seg1 seg2 ...)).
 *
 * Each contiguous run of non-splice elements becomes (list e1 e2 ...).
 * Each ~@xs element is spliced in directly.
 */
function buildConcatSegments(
  elems: CljValue[],
  autoGensyms: Map<string, string>,
  env?: Env
): CljValue[] {
  const segments: CljValue[] = []
  let chunk: CljValue[] = []

  for (const elem of elems) {
    if (isUnquoteSplicing(elem)) {
      if (chunk.length > 0) {
        segments.push(v.list([v.symbol('list'), ...chunk]))
        chunk = []
      }
      // elem is (unquote-splicing expr) — push the expr itself
      segments.push((elem as { value: CljValue[] }).value[1])
    } else {
      chunk.push(expandQuasiquote(elem, autoGensyms, env))
    }
  }

  if (chunk.length > 0) {
    segments.push(v.list([v.symbol('list'), ...chunk]))
  }

  return segments
}

/**
 * Purely syntactic quasiquote expander.
 *
 * Transforms a quasiquote template into a code form that, when evaluated,
 * produces the expected runtime value. Called from the macro expander
 * (expand.ts) so quasiquote never reaches the evaluator's special-form dispatch.
 *
 * Code-gen rules:
 *   `x          → (quote x)
 *   `1          → 1                           (self-evaluating)
 *   `~x         → x                           (unquote: expression as-is)
 *   `(a b)      → (list (quote a) (quote b))
 *   `(a ~@xs b) → (apply list (concat* (list (quote a)) xs (list (quote b))))
 *   `[a b]      → (vector (quote a) (quote b))
 *   `[a ~@xs b] → (apply vector (concat* (list (quote a)) xs (list (quote b))))
 *   `{:k v}     → (hash-map :k v)
 *   `#{a b}     → (hash-set (quote a) (quote b))
 *   `#{a ~@xs}  → (apply hash-set (concat* (list (quote a)) xs))
 *   foo#        → (quote foo__<n>)             (auto-gensym, stable within one template)
 *
 * Auto-qualification (when env is provided, mirrors JVM Clojure):
 *   - Special forms and structural sub-keywords (catch, finally, &) → never qualified
 *   - Already-qualified symbols (ns/sym) → left as-is
 *   - Symbols resolving to a var → qualified to var.ns/sym
 *   - Unknown symbols → qualified to currentNs/sym (forward-ref fallback)
 */
export function expandQuasiquote(
  form: CljValue,
  autoGensyms: Map<string, string> = new Map(),
  env?: Env
): CljValue {
  switch (form.kind) {
    // Self-evaluating literals — embed directly in the generated code
    case valueKeywords.number:
    case valueKeywords.string:
    case valueKeywords.boolean:
    case valueKeywords.keyword:
    case valueKeywords.nil:
      return form

    case valueKeywords.symbol: {
      // Auto-gensym: foo# expands to a unique symbol, consistent across all
      // occurrences of the same name within one template invocation.
      if (form.name.endsWith('#')) {
        if (!autoGensyms.has(form.name)) {
          autoGensyms.set(form.name, makeGensym(form.name.slice(0, -1)))
        }
        return v.list([v.symbol('quote'), v.symbol(autoGensyms.get(form.name)!)])
      }

      // Auto-qualification (JVM Clojure semantics):
      // - already qualified or in the never-qualify set → leave as-is
      // - resolves to a var → qualify to var.ns/sym
      // - unknown → qualify to currentNs/sym (forward-ref fallback)
      if (env && !form.name.includes('/') && !NEVER_QUALIFY_SYMBOLS.has(form.name)) {
        const varEntry = lookupVar(form.name, env)
        if (varEntry) {
          return v.list([v.symbol('quote'), v.symbol(`${varEntry.ns}/${form.name}`)])
        }
        const nsName = getNamespaceEnv(env).ns?.name
        if (nsName) {
          return v.list([v.symbol('quote'), v.symbol(`${nsName}/${form.name}`)])
        }
      }

      return v.list([v.symbol('quote'), form])
    }

    case valueKeywords.list: {
      // (unquote expr) at any position → the expression itself, evaluated later
      if (
        form.value.length === 2 &&
        is.symbol(form.value[0]) &&
        form.value[0].name === 'unquote'
      ) {
        return form.value[1]
      }

      const hasSplice = form.value.some(isUnquoteSplicing)
      if (!hasSplice) {
        return v.list([
          v.symbol('list'),
          ...form.value.map((e) => expandQuasiquote(e, autoGensyms, env)),
        ])
      }
      const segs = buildConcatSegments(form.value, autoGensyms, env)
      return v.list([
        v.symbol('apply'),
        v.symbol('list'),
        v.list([v.symbol('concat*'), ...segs]),
      ])
    }

    case valueKeywords.vector: {
      const hasSplice = form.value.some(isUnquoteSplicing)
      if (!hasSplice) {
        return v.list([
          v.symbol('vector'),
          ...form.value.map((e) => expandQuasiquote(e, autoGensyms, env)),
        ])
      }
      const segs = buildConcatSegments(form.value, autoGensyms, env)
      return v.list([
        v.symbol('apply'),
        v.symbol('vector'),
        v.list([v.symbol('concat*'), ...segs]),
      ])
    }

    case valueKeywords.map: {
      const args: CljValue[] = []
      for (const [key, value] of form.entries) {
        args.push(expandQuasiquote(key, autoGensyms, env))
        args.push(expandQuasiquote(value, autoGensyms, env))
      }
      return v.list([v.symbol('hash-map'), ...args])
    }

    case valueKeywords.set: {
      const formValues = setValues(form as CljSet)
      const hasSplice = formValues.some(isUnquoteSplicing)
      if (!hasSplice) {
        return v.list([
          v.symbol('hash-set'),
          ...formValues.map((e) => expandQuasiquote(e, autoGensyms, env)),
        ])
      }
      const segs = buildConcatSegments(formValues, autoGensyms, env)
      return v.list([
        v.symbol('apply'),
        v.symbol('hash-set'),
        v.list([v.symbol('concat*'), ...segs]),
      ])
    }

    default:
      throw new EvaluationError(`Unexpected form in quasiquote: ${(form as CljValue).kind}`, {
        form,
      })
  }
}
