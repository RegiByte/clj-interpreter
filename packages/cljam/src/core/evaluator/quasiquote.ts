import { is } from '../assertions'
import { EvaluationError } from '../errors'
import { v } from '../factories'
import { makeGensym } from '../gensym'
import { valueKeywords } from '../keywords'
import { type CljValue } from '../types'

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
  autoGensyms: Map<string, string>
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
      chunk.push(expandQuasiquote(elem, autoGensyms))
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
 */
export function expandQuasiquote(
  form: CljValue,
  autoGensyms: Map<string, string> = new Map()
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
          ...form.value.map((e) => expandQuasiquote(e, autoGensyms)),
        ])
      }
      const segs = buildConcatSegments(form.value, autoGensyms)
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
          ...form.value.map((e) => expandQuasiquote(e, autoGensyms)),
        ])
      }
      const segs = buildConcatSegments(form.value, autoGensyms)
      return v.list([
        v.symbol('apply'),
        v.symbol('vector'),
        v.list([v.symbol('concat*'), ...segs]),
      ])
    }

    case valueKeywords.map: {
      const args: CljValue[] = []
      for (const [key, value] of form.entries) {
        args.push(expandQuasiquote(key, autoGensyms))
        args.push(expandQuasiquote(value, autoGensyms))
      }
      return v.list([v.symbol('hash-map'), ...args])
    }

    case valueKeywords.set: {
      const hasSplice = form.values.some(isUnquoteSplicing)
      if (!hasSplice) {
        return v.list([
          v.symbol('hash-set'),
          ...form.values.map((e) => expandQuasiquote(e, autoGensyms)),
        ])
      }
      const segs = buildConcatSegments(form.values, autoGensyms)
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
