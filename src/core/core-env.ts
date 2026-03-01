import { define, makeEnv } from './env'
import {
  cljNativeFunction,
  cljNil
} from './factories'
import { arithmeticFunctions } from './stdlib/arithmetic'
import { atomFunctions } from './stdlib/atoms'
import { collectionFunctions } from './stdlib/collections'
import { hofFunctions } from './stdlib/hof'
import { predicateFunctions } from './stdlib/predicates'
import { getUtilFunctions } from './stdlib/utils'
import { valueToString } from './transformations'
import {
  type CljValue,
  type Env
} from './types'

function getCoreFunctions(globalEnv: Env) {
  const nativeFunctions = {
    ...arithmeticFunctions,
    ...atomFunctions,
    ...collectionFunctions,
    ...predicateFunctions,
    ...hofFunctions,
    ...getUtilFunctions(globalEnv),
  }

  return nativeFunctions
}

export function loadCoreFunctions(env: Env, output?: (text: string) => void) {
  const coreFunctions = getCoreFunctions(env)
  for (const [key, value] of Object.entries(coreFunctions)) {
    define(key, value, env)
  }
  if (output) {
    define(
      'println',
      cljNativeFunction('println', (...args: CljValue[]) => {
        const text = args.map(valueToString).join(' ')
        output(text)
        return cljNil()
      }),
      env
    )
  }
}

export function makeCoreEnv(output?: (text: string) => void): Env {
  const env = makeEnv()
  loadCoreFunctions(env, output)
  return env
}
