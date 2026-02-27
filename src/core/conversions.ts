import { isCljValue } from './assertions'
import { applyFunction } from './evaluator'
import {
  cljBoolean,
  cljKeyword,
  cljMap,
  cljNativeFunction,
  cljNil,
  cljNumber,
  cljString,
  cljVector,
} from './factories'
import type { CljValue } from './types'

export class ConversionError extends Error {
  context: unknown
  constructor(message: string, context?: unknown) {
    super(message)
    this.name = 'ConversionError'
    this.context = context
  }
}

const richKeyKinds = new Set(['list', 'vector', 'map'])

export function cljToJs(value: CljValue): unknown {
  switch (value.kind) {
    case 'number':
      return value.value
    case 'string':
      return value.value
    case 'boolean':
      return value.value
    case 'nil':
      return null
    case 'keyword':
      return value.name.startsWith(':') ? value.name.slice(1) : value.name
    case 'symbol':
      return value.name
    case 'list':
    case 'vector':
      return value.value.map(cljToJs)
    case 'map': {
      const obj: Record<string, unknown> = {}
      for (const [k, v] of value.entries) {
        if (richKeyKinds.has(k.kind)) {
          throw new ConversionError(
            `Rich key types (${k.kind}) are not supported in JS object conversion. Restructure your map to use string, keyword, or number keys.`,
            { key: k, value: v }
          )
        }
        const jsKey = String(cljToJs(k))
        obj[jsKey] = cljToJs(v)
      }
      return obj
    }
    case 'function':
    case 'native-function': {
      const fn = value
      return (...jsArgs: unknown[]) => {
        const cljArgs = jsArgs.map(jsToClj)
        const result = applyFunction(fn, cljArgs)
        return cljToJs(result)
      }
    }
    case 'macro':
      throw new ConversionError(
        'Macros cannot be exported to JavaScript. Macros are compile-time constructs.',
        { macro: value }
      )
  }
}

export function jsToClj(value: unknown): CljValue {
  if (value === null || value === undefined) return cljNil()
  if (isCljValue(value)) return value

  switch (typeof value) {
    case 'number':
      return cljNumber(value)
    case 'string':
      return cljString(value)
    case 'boolean':
      return cljBoolean(value)
    case 'function': {
      const jsFn = value as (...args: unknown[]) => unknown
      return cljNativeFunction('js-fn', (...cljArgs: CljValue[]) => {
        const jsArgs = cljArgs.map(cljToJs)
        const result = jsFn(...jsArgs)
        return jsToClj(result)
      })
    }
    case 'object': {
      if (Array.isArray(value)) {
        return cljVector(value.map(jsToClj))
      }
      const entries: [CljValue, CljValue][] = Object.entries(
        value as Record<string, unknown>
      ).map(([k, v]) => [cljKeyword(`:${k}`), jsToClj(v)])
      return cljMap(entries)
    }
    default:
      throw new ConversionError(
        `Cannot convert JS value of type ${typeof value} to CljValue`,
        { value }
      )
  }
}
