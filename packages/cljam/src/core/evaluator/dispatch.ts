import { is } from '../assertions'
import { EvaluationError } from '../errors'
import { printString } from '../printer'
import { getLineCol, getPos, maybeHydrateErrorPos } from '../positions'
import type {
  CljList,
  CljValue,
  Env,
  EvaluationContext,
  StackFrame,
} from '../types'

import { evaluateSpecialForm } from './special-forms'
import { dispatchMultiMethod } from './multimethod-dispatch'

const LIST_HEAD_POS = 0
const LIST_BODY_POS = 1

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
    throw new EvaluationError(
      `${name} is not callable`,
      { list, env },
      getPos(list)
    )
  }

  const args = list.value
    .slice(LIST_BODY_POS)
    .map((arg) => ctx.evaluate(arg, env))
  const rawPos = getPos(list)
  let line: null | number = null
  let col: null | number = null
  if (rawPos && ctx.currentSource) {
    const lc = getLineCol(ctx.currentSource, rawPos.start)
    line = lc.line
    col = lc.col + 1 // 1-indexed
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
