import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  define,
  cljNativeFunction,
  cljNil,
  cljString,
  valueToString,
  type Session,
  type CljValue,
} from '../core'
import { inferSourceRoot } from '../bin/nrepl-utils'

export function injectNodeHostFunctions(session: Session): void {
  const coreEnv = session.registry.get('clojure.core')!

  define(
    'slurp',
    cljNativeFunction('slurp', (pathVal: CljValue) => {
      const filePath = resolve(valueToString(pathVal))
      if (!existsSync(filePath)) {
        throw new Error(`slurp: file not found: ${filePath}`)
      }
      return cljString(readFileSync(filePath, 'utf8'))
    }),
    coreEnv
  )

  define(
    'spit',
    cljNativeFunction('spit', (pathVal: CljValue, content: CljValue) => {
      const filePath = resolve(valueToString(pathVal))
      writeFileSync(filePath, valueToString(content), 'utf8')
      return cljNil()
    }),
    coreEnv
  )

  define(
    'load',
    cljNativeFunction('load', (pathVal: CljValue) => {
      const filePath = resolve(valueToString(pathVal))
      if (!existsSync(filePath)) {
        throw new Error(`load: file not found: ${filePath}`)
      }
      const source = readFileSync(filePath, 'utf8')
      const inferred = inferSourceRoot(filePath, source)
      if (inferred) session.addSourceRoot(inferred)
      const loadedNs = session.loadFile(source)
      session.setNs(loadedNs)
      return cljNil()
    }),
    coreEnv
  )
}
