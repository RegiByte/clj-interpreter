import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  cljNativeFunction,
  cljNil,
  cljString,
  valueToString,
  type Session,
  type CljValue,
} from '../core'
import type { RuntimeModule } from '../core/module'
import { inferSourceRoot } from '../bin/nrepl-utils'

/**
 * Returns a RuntimeModule that installs Node.js host functions into clojure.core.
 * Closes over the session for functions (like `load`) that need to drive evaluation.
 */
export function makeNodeHostModule(session: Session): RuntimeModule {
  return {
    id: 'conjure/host-node',
    dependsOn: ['clojure.core'],
    declareNs: [
      {
        name: 'clojure.core',
        vars(_ctx) {
          return new Map([
            [
              'slurp',
              {
                value: cljNativeFunction('slurp', (pathVal: CljValue) => {
                  const filePath = resolve(valueToString(pathVal))
                  if (!existsSync(filePath)) {
                    throw new Error(`slurp: file not found: ${filePath}`)
                  }
                  return cljString(readFileSync(filePath, 'utf8'))
                }),
              },
            ],
            [
              'spit',
              {
                value: cljNativeFunction(
                  'spit',
                  (pathVal: CljValue, content: CljValue) => {
                    const filePath = resolve(valueToString(pathVal))
                    writeFileSync(filePath, valueToString(content), 'utf8')
                    return cljNil()
                  }
                ),
              },
            ],
            [
              'load',
              {
                value: cljNativeFunction('load', (pathVal: CljValue) => {
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
              },
            ],
          ])
        },
      },
    ],
  }
}
