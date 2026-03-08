import { isAFunction, isVar } from '../assertions'
import { EvaluationError } from '../errors'
import {
  cljBoolean,
  cljNativeFunction,
  cljNativeFunctionWithContext,
  withDoc,
} from '../factories'
import type { CljValue } from '../types'

export const varFunctions: Record<string, CljValue> = {
  'var?': withDoc(
    cljNativeFunction('var?', (x: CljValue) => cljBoolean(isVar(x))),
    'Returns true if x is a Var.',
    [['x']]
  ),

  'var-get': withDoc(
    cljNativeFunction('var-get', (x: CljValue) => {
      if (!isVar(x)) {
        throw new EvaluationError(`var-get expects a Var, got ${x.kind}`, { x })
      }
      return x.value
    }),
    'Returns the value in the Var object.',
    [['x']]
  ),

  'alter-var-root': withDoc(
    cljNativeFunctionWithContext(
      'alter-var-root',
      (ctx, callEnv, varVal: CljValue, f: CljValue, ...args: CljValue[]) => {
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
    ),
    'Atomically alters the root binding of var v by applying f to its current value plus any additional args.',
    [['v', 'f', '&', 'args']]
  ),
}
