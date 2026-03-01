import {
  isAFunction,
  isEqual,
  isKeyword,
  isMacro,
  isMap,
  isMultiMethod,
  isSpecialForm,
  isSymbol,
} from '../assertions'
import { lookup } from '../env'
import { EvaluationError } from '../errors'
import { cljNil } from '../factories'
import type {
  CljList,
  CljValue,
  Env,
  EvaluationContext,
  CljMultiMethod,
} from '../types'

import { applyMacroWithContext } from './apply'
import { evaluateSpecialForm } from './special-forms'

function dispatchMultiMethod(
  mm: CljMultiMethod,
  args: CljValue[],
  ctx: EvaluationContext
): CljValue {
  const dispatchVal = ctx.applyFunction(mm.dispatchFn, args)
  const method = mm.methods.find(({ dispatchVal: dv }) =>
    isEqual(dv, dispatchVal)
  )
  if (method) return ctx.applyFunction(method.fn, args)
  if (mm.defaultMethod) return ctx.applyFunction(mm.defaultMethod, args)
  // TODO: Clojure supports a custom default-dispatch-val per multimethod:
  //   (defmulti foo identity :default ::no-match)
  // This lets :default be a real dispatchable value while ::no-match is the
  // fallback sentinel. Currently :default is hardcoded as the only sentinel,
  // making it impossible to dispatch on the literal value :default while also
  // having a catch-all. Low priority — add CljMultiMethod.defaultDispatchVal
  // and thread it through defmulti, defmethod detection, and here.
  throw new EvaluationError(
    `No method in multimethod '${mm.name}' for dispatch value`,
    { mm, dispatchVal }
  )
}

export function evaluateList(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  if (list.value.length === 0) {
    throw new EvaluationError('Unexpected empty list', { list, env })
  }
  const first = list.value[0]

  if (isSpecialForm(first)) {
    return evaluateSpecialForm(first.name, list, env, ctx)
  }

  const evaledFirst = ctx.evaluate(first, env)
  if (isMacro(evaledFirst)) {
    const rawArgs = list.value.slice(1)
    const expanded = applyMacroWithContext(evaledFirst, rawArgs, ctx)
    return ctx.evaluate(expanded, env)
  }
  if (isAFunction(evaledFirst)) {
    const args = list.value.slice(1).map((v) => ctx.evaluate(v, env))
    return ctx.applyFunction(evaledFirst, args)
  }
  if (isKeyword(evaledFirst)) {
    const next = ctx.evaluate(list.value[1], env)
    const defaultReturn =
      list.value.length > 2 ? ctx.evaluate(list.value[2], env) : cljNil()
    if (isMap(next)) {
      const entry = next.entries.find(([key]) => {
        return isEqual(key, evaledFirst)
      })
      if (entry) {
        return entry[1]
      }
      return defaultReturn
    }
    return defaultReturn
  }
  if (isMultiMethod(evaledFirst)) {
    const args = list.value.slice(1).map((v) => ctx.evaluate(v, env))
    return dispatchMultiMethod(evaledFirst, args, ctx)
  }
  if (!isSymbol(first)) {
    throw new EvaluationError(
      'First element of list must be a function or special form',
      { list, env }
    )
  }
  const symbol = first.name

  const fnSymbol = lookup(symbol, env)
  if (!isAFunction(fnSymbol)) {
    throw new EvaluationError(`${symbol} is not a function`, { list, env })
  }

  const args = list.value.slice(1).map((v) => ctx.evaluate(v, env))
  return ctx.applyFunction(fnSymbol, args)
}
