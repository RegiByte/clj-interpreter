import { internVar, makeEnv, makeNamespace, tryLookup } from './env'
import { cljMap, cljNativeFunction, cljNativeFunctionWithContext, cljNil } from './factories'
import { prettyPrintString, printString, withPrintContext } from './printer'
import { arithmeticFunctions } from './stdlib/arithmetic'
import { atomFunctions } from './stdlib/atoms'
import { collectionFunctions } from './stdlib/collections'
import { errorFunctions } from './stdlib/errors'
import { hofFunctions } from './stdlib/hof'
import { metaFunctions } from './stdlib/meta'
import { predicateFunctions } from './stdlib/predicates'
import { regexFunctions } from './stdlib/regex'
import { stringFunctions } from './stdlib/strings'
import { transducerFunctions } from './stdlib/transducers'
import { utilFunctions } from './stdlib/utils'
import { lazyFunctions } from './stdlib/lazy'
import { varFunctions } from './stdlib/vars'
import { valueToString } from './transformations'
import { type CljValue, type Env, type EvaluationContext } from './types'

const nativeFunctions = {
  ...arithmeticFunctions,
  ...atomFunctions,
  ...collectionFunctions,
  ...errorFunctions,
  ...predicateFunctions,
  ...hofFunctions,
  ...metaFunctions,
  ...transducerFunctions,
  ...regexFunctions,
  ...stringFunctions,
  ...utilFunctions,
  ...varFunctions,
  ...lazyFunctions,
}

export function loadCoreFunctions(env: Env, output?: (text: string) => void) {
  for (const [key, value] of Object.entries(nativeFunctions)) {
    // Promote any :doc/:arglists metadata from the value to the var so that
    // (meta #'reduce) returns documentation, matching Clojure's var-centric model.
    const valueMeta = (value as { meta?: import('./types').CljMap }).meta
    internVar(key, value, env, valueMeta)
  }
  const emit = output ?? ((text: string) => console.log(text))

  function readPrintCtx(callEnv: Env) {
    const len = tryLookup('*print-length*', callEnv)
    const level = tryLookup('*print-level*', callEnv)
    return {
      printLength: len?.kind === 'number' ? len.value : null,
      printLevel: level?.kind === 'number' ? level.value : null,
    }
  }

  internVar(
    'println',
    cljNativeFunctionWithContext(
      'println',
      (_ctx: EvaluationContext, callEnv: Env, ...args: CljValue[]) => {
        withPrintContext(readPrintCtx(callEnv), () => {
          emit(args.map(valueToString).join(' ') + '\n')
        })
        return cljNil()
      }
    ),
    env
  )
  internVar(
    'print',
    cljNativeFunctionWithContext(
      'print',
      (_ctx: EvaluationContext, callEnv: Env, ...args: CljValue[]) => {
        withPrintContext(readPrintCtx(callEnv), () => {
          emit(args.map(valueToString).join(' '))
        })
        return cljNil()
      }
    ),
    env
  )
  internVar(
    'newline',
    cljNativeFunction('newline', () => {
      emit('\n')
      return cljNil()
    }),
    env
  )
  internVar(
    'pr',
    cljNativeFunctionWithContext(
      'pr',
      (_ctx: EvaluationContext, callEnv: Env, ...args: CljValue[]) => {
        withPrintContext(readPrintCtx(callEnv), () => {
          emit(args.map(v => printString(v)).join(' '))
        })
        return cljNil()
      }
    ),
    env
  )
  internVar(
    'prn',
    cljNativeFunctionWithContext(
      'prn',
      (_ctx: EvaluationContext, callEnv: Env, ...args: CljValue[]) => {
        withPrintContext(readPrintCtx(callEnv), () => {
          emit(args.map(v => printString(v)).join(' ') + '\n')
        })
        return cljNil()
      }
    ),
    env
  )
  internVar(
    'pprint',
    cljNativeFunctionWithContext(
      'pprint',
      (_ctx: EvaluationContext, callEnv: Env, form: CljValue, widthArg?: CljValue) => {
        if (form === undefined) return cljNil()
        const maxWidth =
          widthArg !== undefined && widthArg.kind === 'number' ? widthArg.value : 80
        withPrintContext(readPrintCtx(callEnv), () => {
          emit(prettyPrintString(form, maxWidth) + '\n')
        })
        return cljNil()
      }
    ),
    env
  )

  // Dynamic vars for print control (*print-length* / *print-level*)
  internVar('*print-length*', cljNil(), env)
  const plVar = env.ns?.vars.get('*print-length*')
  if (plVar) plVar.dynamic = true

  internVar('*print-level*', cljNil(), env)
  const pvVar = env.ns?.vars.get('*print-level*')
  if (pvVar) pvVar.dynamic = true

  // Compatibility var for IDE tooling (e.g. Cursive checks this)
  internVar('*compiler-options*', cljMap([]), env)
}

export function makeCoreEnv(output?: (text: string) => void): Env {
  const env = makeEnv()
  env.ns = makeNamespace('clojure.core')
  loadCoreFunctions(env, output)
  return env
}
