import { is } from '../assertions'
import { EvaluationError } from '../errors'
import { printString } from '../printer'
import { getLineCol, getPos, maybeHydrateErrorPos } from '../positions'
import type {
  CljList,
  CljValue,
  Env,
  EvaluationContext,
  CljMultiMethod,
  StackFrame,
} from '../types'

import { evaluateSpecialForm } from './special-forms'

const LIST_HEAD_POS = 0
const LIST_BODY_POS = 1

export function dispatchMultiMethod(
  mm: CljMultiMethod,
  args: CljValue[],
  ctx: EvaluationContext,
  env: Env,
  callSite?: CljList
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
    { mm, dispatchVal },
    callSite ? getPos(callSite) : undefined
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

  let evaledHead = ctx.evaluate(head, env)

  // Vars are IFn — dereference before dispatch so (#'mm arg) routes correctly.
  if (is.var(evaledHead)) {
    evaledHead = evaledHead.value
  }

  if (is.multiMethod(evaledHead)) {
    const args = list.value
      .slice(LIST_BODY_POS)
      .map((arg) => ctx.evaluate(arg, env))
    return dispatchMultiMethod(evaledHead, args, ctx, env, list)
  }

  if (!is.callable(evaledHead)) {
    const name = is.symbol(head) ? head.name : printString(head)
    throw new EvaluationError(`${name} is not callable`, { list, env }, getPos(list))
  }

  const args = list.value
    .slice(LIST_BODY_POS)
    .map((arg) => ctx.evaluate(arg, env))
  const rawPos = getPos(list)
  let line = null as null | number
  let col = null as null | number
  if (rawPos && ctx.currentSource) {
    const lc = getLineCol(ctx.currentSource, rawPos.start)
    line = lc.line
    col = lc.col + 1  // 1-indexed
  }
  const frame: StackFrame = {
    fnName: is.symbol(head) ? head.name : null,
    line,
    col,
    source: ctx.currentFile ?? null,
    pos: rawPos ?? null,
  }
  ctx.frameStack.push(frame)
  try {
    return ctx.applyCallable(evaledHead, args, env)
  } catch (e) {
    maybeHydrateErrorPos(e, list)
    if (e instanceof EvaluationError && !e.frames) {
      e.frames = [...ctx.frameStack].reverse()
    }
    throw e
  } finally {
    ctx.frameStack.pop()
  }
}
