import { is } from '../assertions'
import { EvaluationError } from '../errors'
import { cljNil } from '../factories'
import { printString } from '../printer'
import type {
  CljFunction,
  CljMacro,
  CljNativeFunction,
  CljValue,
  Env,
  EvaluationContext,
} from '../types'
import { bindParams, RecurSignal, resolveArity } from './arity'
import { cljToJs, jsToClj } from './js-interop'

export function applyFunctionWithContext(
  fn: CljFunction | CljNativeFunction,
  args: CljValue[],
  ctx: EvaluationContext,
  callEnv: Env
): CljValue {
  if (fn.kind === 'native-function') {
    // New path, native fns receive evaluation context as first argument
    if (fn.fnWithContext) {
      return fn.fnWithContext(ctx, callEnv, ...args)
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
        fn.env,
        ctx,
        callEnv
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
  const localEnv = bindParams(
    arity.params,
    arity.restParam,
    rawArgs,
    macro.env,
    ctx,
    macro.env
  )
  return ctx.evaluateForms(arity.body, localEnv)
}

/**
 * Invokes any IFn value — functions, native functions, keywords, and maps.
 * Used by comp, partial, and any other HOF that needs to call an arbitrary
 * callable without going through the full list-evaluation dispatch.
 */
export function applyCallableWithContext(
  fn: CljValue,
  args: CljValue[],
  ctx: EvaluationContext,
  callEnv: Env
): CljValue {
  if (is.aFunction(fn)) {
    return applyFunctionWithContext(fn, args, ctx, callEnv)
  }
  if (is.jsValue(fn)) {
    if (typeof fn.value !== 'function') {
      throw new EvaluationError(
        `js-value is not callable: ${typeof fn.value}`,
        { fn, args }
      )
    }
    const jsArgs = args.map((a) => cljToJs(a, ctx, callEnv))
    const rawResult = (fn.value as (...a: unknown[]) => unknown)(...jsArgs)
    return jsToClj(rawResult)
  }
  if (is.keyword(fn)) {
    const target = args[0]
    const defaultVal = args.length > 1 ? args[1] : cljNil()
    if (is.map(target)) {
      const entry = target.entries.find(([k]) => is.equal(k, fn))
      return entry ? entry[1] : defaultVal
    }
    return defaultVal
  }
  if (is.map(fn)) {
    if (args.length === 0) {
      throw new EvaluationError(
        'Map used as function requires at least one argument',
        { fn, args }
      )
    }
    const key = args[0]
    const defaultVal = args.length > 1 ? args[1] : cljNil()
    const entry = fn.entries.find(([k]) => is.equal(k, key))
    return entry ? entry[1] : defaultVal
  }
  throw new EvaluationError(`${printString(fn)} is not a callable value`, {
    fn,
    args,
  })
}
