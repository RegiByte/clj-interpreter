import { isAtom, isAFunction, isReduced, isVolatile } from '../assertions'
import { EvaluationError } from '../errors'
import {
  cljAtom,
  cljBoolean,
  cljNativeFunctionWithContext,
  cljNativeFunction,
  withDoc,
} from '../factories'
import type { CljValue, Env } from '../types'

export const atomFunctions: Record<string, CljValue> = {
  atom: withDoc(
    cljNativeFunction('atom', (value: CljValue) => {
      return cljAtom(value)
    }),
    'Returns a new atom holding the given value.',
    [['value']]
  ),

  deref: withDoc(
    cljNativeFunction('deref', (value: CljValue) => {
      if (isAtom(value)) return value.value
      if (isVolatile(value)) return value.value
      if (isReduced(value)) return value.value
      throw new EvaluationError(
        `deref expects an atom, volatile, or reduced value, got ${value.kind}`,
        { value }
      )
    }),
    'Returns the wrapped value from an atom, volatile, or reduced value.',
    [['value']]
  ),

  'swap!': withDoc(
    cljNativeFunctionWithContext(
      'swap!',
      (
        ctx,
        callEnv: Env,
        atomVal: CljValue,
        fn: CljValue,
        ...extraArgs: CljValue[]
      ) => {
        if (!isAtom(atomVal)) {
          throw new EvaluationError(
            `swap! expects an atom as its first argument, got ${atomVal.kind}`,
            { atomVal }
          )
        }
        if (!isAFunction(fn)) {
          throw new EvaluationError(
            `swap! expects a function as its second argument, got ${fn.kind}`,
            { fn }
          )
        }
        const newVal = ctx.applyFunction(fn, [atomVal.value, ...extraArgs], callEnv)
        atomVal.value = newVal
        return newVal
      }
    ),
    'Applies fn to the current value of the atom, replacing the current value with the result. Returns the new value.',
    [['atomVal', 'fn', '&', 'extraArgs']]
  ),

  'reset!': withDoc(
    cljNativeFunction('reset!', (atomVal: CljValue, newVal: CljValue) => {
      if (!isAtom(atomVal)) {
        throw new EvaluationError(
          `reset! expects an atom as its first argument, got ${atomVal.kind}`,
          { atomVal }
        )
      }
      atomVal.value = newVal
      return newVal
    }),
    'Sets the value of the atom to newVal and returns the new value.',
    [['atomVal', 'newVal']]
  ),

  'atom?': withDoc(
    cljNativeFunction('atom?', (value: CljValue) => {
      return cljBoolean(isAtom(value))
    }),
    'Returns true if the value is an atom, false otherwise.',
    [['value']]
  ),
}
