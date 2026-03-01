import { isList, isSymbol, isVector } from '../assertions'
import { EvaluationError } from '../errors'
import { cljList, cljMap, cljVector } from '../factories'
import { makeGensym } from '../gensym'
import {
  type CljValue,
  type Env,
  type EvaluationContext,
  valueKeywords,
} from '../types'

export function evaluateQuasiquote(
  form: CljValue,
  env: Env,
  autoGensyms: Map<string, string> = new Map(),
  ctx: EvaluationContext
): CljValue {
  switch (form.kind) {
    case valueKeywords.vector:
    case valueKeywords.list: {
      // Handle unquote
      const isAList = isList(form)
      if (
        isAList &&
        form.value.length === 2 &&
        isSymbol(form.value[0]) &&
        form.value[0].name === 'unquote'
      ) {
        return ctx.evaluate(form.value[1], env)
      }

      // Build new collection
      const elements: CljValue[] = []
      for (const elem of form.value) {
        // Handle unquote splicing
        if (
          isList(elem) &&
          elem.value.length === 2 &&
          isSymbol(elem.value[0]) &&
          elem.value[0].name === 'unquote-splicing'
        ) {
          const toSplice = ctx.evaluate(elem.value[1], env)
          if (!isList(toSplice) && !isVector(toSplice)) {
            throw new EvaluationError(
              'Unquote-splicing must evaluate to a list or vector',
              { elem, env }
            )
          }
          elements.push(...toSplice.value)
          continue
        }
        // Otherwise, recursively evaluate the quasiquote
        elements.push(evaluateQuasiquote(elem, env, autoGensyms, ctx))
      }
      return isAList ? cljList(elements) : cljVector(elements)
    }
    case valueKeywords.map: {
      const entries: [CljValue, CljValue][] = []
      for (const [key, value] of form.entries) {
        const evaluatedKey = evaluateQuasiquote(key, env, autoGensyms, ctx)
        const evaluatedValue = evaluateQuasiquote(value, env, autoGensyms, ctx)
        entries.push([evaluatedKey, evaluatedValue])
      }
      return cljMap(entries)
    }
    case valueKeywords.number:
    case valueKeywords.string:
    case valueKeywords.boolean:
    case valueKeywords.keyword:
    case valueKeywords.nil:
      return form
    case valueKeywords.symbol: {
      // Auto-gensym: sym# inside a quasiquote expands to a unique symbol.
      // All occurrences of the same sym# within one quasiquote expand to
      // the same generated name (consistent within one template expansion).
      if (form.name.endsWith('#')) {
        if (!autoGensyms.has(form.name)) {
          autoGensyms.set(form.name, makeGensym(form.name.slice(0, -1)))
        }
        return { kind: 'symbol', name: autoGensyms.get(form.name)! }
      }
      return form
    }
    default:
      throw new EvaluationError(`Unexpected form: ${form.kind}`, { form, env })
  }
}
