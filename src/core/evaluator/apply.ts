import { EvaluationError } from '../errors'
import type {
  CljFunction,
  CljMacro,
  CljNativeFunction,
  CljValue,
  EvaluationContext,
} from '../types'
import { bindParams, RecurSignal, resolveArity } from './arity'

export function applyFunctionWithContext(
  fn: CljFunction | CljNativeFunction,
  args: CljValue[],
  ctx: EvaluationContext
): CljValue {
  if (fn.kind === 'native-function') {
    // New path, native fns receive evaluation context as first argument
    if (fn.fnWithContext) {
      return fn.fnWithContext(ctx, ...args)
    }
    return fn.fn(...args)
  }
  if (fn.kind === 'function') {
    const arity = resolveArity(fn.arities, args.length)
    let currentArgs = args
    while (true) {
      const localEnv = bindParams(
        arity.params,
        arity.restParam,
        currentArgs,
        fn.env
      )
      try {
        return ctx.evaluateForms(arity.body, localEnv)
      } catch (e) {
        if (e instanceof RecurSignal) {
          currentArgs = e.args
          continue
        }
        throw e
      }
    }
  }

  throw new EvaluationError(
    `${(fn as CljValue).kind} is not a callable function`,
    {
      fn,
      args,
    }
  )
}

export function applyMacroWithContext(
  macro: CljMacro,
  rawArgs: CljValue[],
  ctx: EvaluationContext
): CljValue {
  const arity = resolveArity(macro.arities, rawArgs.length)
  const localEnv = bindParams(arity.params, arity.restParam, rawArgs, macro.env)
  return ctx.evaluateForms(arity.body, localEnv)
}
