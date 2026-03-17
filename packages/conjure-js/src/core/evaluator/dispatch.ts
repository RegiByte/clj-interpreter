import { is } from '../assertions'
import { EvaluationError } from '../errors'
import { printString } from '../printer'
import { maybeHydrateErrorPos } from '../positions'
import type {
  CljList,
  CljValue,
  Env,
  EvaluationContext,
  CljMultiMethod,
} from '../types'

import { evaluateSpecialForm } from './special-forms'

const LIST_HEAD_POS = 0
const LIST_BODY_POS = 1

export function dispatchMultiMethod(
  mm: CljMultiMethod,
  args: CljValue[],
  ctx: EvaluationContext,
  env: Env
): CljValue {
  const dispatchVal = ctx.applyFunction(mm.dispatchFn, args, env)
  const method = mm.methods.find(({ dispatchVal: dv }) =>
    is.equal(dv, dispatchVal)
  )
  if (method) return ctx.applyFunction(method.fn, args, env)
  if (mm.defaultMethod) return ctx.applyFunction(mm.defaultMethod, args, env)
  // TODO: Clojure supports a custom default-dispatch-val per multimethod:
  //   (defmulti foo identity :default ::no-match)
  // This lets :default be a real dispatchable value while ::no-match is the
  // fallback sentinel. Currently :default is hardcoded as the only sentinel,
  // making it impossible to dispatch on the literal value :default while also
  // having a catch-all. Low priority — add CljMultiMethod.defaultDispatchVal
  // and thread it through defmulti, defmethod detection, and here.
  throw new EvaluationError(
    `No method in multimethod '${mm.name}' for dispatch value ${printString(dispatchVal)}`,
    { mm, dispatchVal }
  )
}

export function evaluateList(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  if (list.value.length === 0) {
    return list
  }
  const head = list.value[LIST_HEAD_POS]

  if (is.specialForm(head)) {
    return evaluateSpecialForm(head.name, list, env, ctx)
  }

  const evaledHead = ctx.evaluate(head, env)

  if (is.multiMethod(evaledHead)) {
    const args = list.value
      .slice(LIST_BODY_POS)
      .map((arg) => ctx.evaluate(arg, env))
    return dispatchMultiMethod(evaledHead, args, ctx, env)
  }

  if (!is.callable(evaledHead)) {
    const name = is.symbol(head) ? head.name : printString(head)
    throw new EvaluationError(`${name} is not callable`, { list, env })
  }

  const args = list.value
    .slice(LIST_BODY_POS)
    .map((arg) => ctx.evaluate(arg, env))
  try {
    return ctx.applyCallable(evaledHead, args, env)
  } catch (e) {
    maybeHydrateErrorPos(e, list)
    throw e
  }
}
