import { isAtom, isAFunction } from '../assertions'
import { EvaluationError } from '../errors'
import {
  cljAtom,
  cljBoolean,
  cljNativeFunctionWithContext,
  cljNativeFunction,
} from '../factories'
import type { CljValue } from '../types'

export const atomFunctions: Record<string, CljValue> = {
  atom: cljNativeFunction('atom', (value: CljValue) => {
    return cljAtom(value)
  }),

  deref: cljNativeFunction('deref', (value: CljValue) => {
    if (isAtom(value)) return value.value
    throw new EvaluationError(`deref expects an atom, got ${value.kind}`, {
      value,
    })
  }),

  'swap!': cljNativeFunctionWithContext(
    'swap!',
    (ctx, atomVal: CljValue, fn: CljValue, ...extraArgs: CljValue[]) => {
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
      const newVal = ctx.applyFunction(fn, [atomVal.value, ...extraArgs])
      atomVal.value = newVal
      return newVal
    }
  ),

  'reset!': cljNativeFunction('reset!', (atomVal: CljValue, newVal: CljValue) => {
    if (!isAtom(atomVal)) {
      throw new EvaluationError(
        `reset! expects an atom as its first argument, got ${atomVal.kind}`,
        { atomVal }
      )
    }
    atomVal.value = newVal
    return newVal
  }),

  'atom?': cljNativeFunction('atom?', (value: CljValue) => {
    return cljBoolean(isAtom(value))
  }),
}
