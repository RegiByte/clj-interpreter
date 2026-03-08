import { internVar, makeEnv, makeNamespace } from './env'
import { cljNativeFunction, cljNil } from './factories'
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
import { varFunctions } from './stdlib/vars'
import { valueToString } from './transformations'
import { type CljValue, type Env } from './types'

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
}

export function loadCoreFunctions(env: Env, output?: (text: string) => void) {
  for (const [key, value] of Object.entries(nativeFunctions)) {
    internVar(key, value, env)
  }
  const emit = output ?? ((text: string) => console.log(text))
  internVar(
    'println',
    cljNativeFunction('println', (...args: CljValue[]) => {
      emit(args.map(valueToString).join(' '))
      return cljNil()
    }),
    env
  )
  internVar(
    'print',
    cljNativeFunction('print', (...args: CljValue[]) => {
      emit(args.map(valueToString).join(' '))
      return cljNil()
    }),
    env
  )
}

export function makeCoreEnv(output?: (text: string) => void): Env {
  const env = makeEnv()
  env.ns = makeNamespace('clojure.core')
  loadCoreFunctions(env, output)
  return env
}
