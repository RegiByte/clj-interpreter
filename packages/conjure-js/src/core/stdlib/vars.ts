import { isAFunction, isVar } from '../assertions'
import { EvaluationError } from '../errors'
import {
  cljBoolean,
  v,
} from '../factories'
import type { CljValue } from '../types'

export const varFunctions: Record<string, CljValue> = {
  'var?': v.nativeFn('var?', function isVarImpl(x: CljValue) {
    return cljBoolean(isVar(x))
  }).doc(
    'Returns true if x is a Var.',
    [['x']]
  ),

  'var-get': v.nativeFn('var-get', function varGetImpl(x: CljValue) {
    if (!isVar(x)) {
      throw new EvaluationError(`var-get expects a Var, got ${x.kind}`, { x })
    }
    return x.value
  }).doc(
    'Returns the value in the Var object.',
    [['x']]
  ),

  'alter-var-root': v.nativeFnCtx(
    'alter-var-root',
    function alterVarRootImpl(ctx, callEnv, varVal: CljValue, f: CljValue, ...args: CljValue[]) {
      if (!isVar(varVal)) {
        throw new EvaluationError(
          `alter-var-root expects a Var as its first argument, got ${varVal.kind}`,
          { varVal }
        )
      }
      if (!isAFunction(f)) {
        throw new EvaluationError(
          `alter-var-root expects a function as its second argument, got ${f.kind}`,
          { f }
        )
      }
      const newVal = ctx.applyFunction(f, [varVal.value, ...args], callEnv)
      varVal.value = newVal
      return newVal
    }
  ).doc(
    'Atomically alters the root binding of var v by applying f to its current value plus any additional args.',
    [['v', 'f', '&', 'args']]
  ),
}
