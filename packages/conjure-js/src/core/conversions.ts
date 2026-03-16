import { isCljValue } from './assertions'
import { v } from './factories'
import type { CljValue } from './types'

export class ConversionError extends Error {
  context: unknown
  constructor(message: string, context?: unknown) {
    super(message)
    this.name = 'ConversionError'
    this.context = context
  }
}

export type FunctionApplier = {
  applyFunction: (fn: CljValue, args: CljValue[]) => CljValue
}

const richKeyKinds = new Set(['list', 'vector', 'map'])

// Used inside jsToClj's function wrapper when converting CLJ args back to JS.
// CLJ args passed to JS-wrapped functions are almost always data values, so
// no applier is needed. If a CLJ function is encountered here, we throw a clear
// error — use session.cljToJs() for function-bearing values.
const _throwingApplier: FunctionApplier = {
  applyFunction: () => {
    throw new ConversionError(
      'Cannot convert a CLJ function to JS in this context — use session.cljToJs() instead.'
    )
  },
}

export function cljToJs(value: CljValue, applier: FunctionApplier): unknown {
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
      return value.value.map((item) => cljToJs(item, applier))
    case 'map': {
      const obj: Record<string, unknown> = {}
      for (const [k, val] of value.entries) {
        if (richKeyKinds.has(k.kind)) {
          throw new ConversionError(
            `Rich key types (${k.kind}) are not supported in JS object conversion. Restructure your map to use string, keyword, or number keys.`,
            { key: k, value: val }
          )
        }
        const jsKey = String(cljToJs(k, applier))
        obj[jsKey] = cljToJs(val, applier)
      }
      return obj
    }
    case 'function':
    case 'native-function': {
      const fn = value
      return (...jsArgs: unknown[]) => {
        const cljArgs = jsArgs.map((a) => jsToClj(a))
        const result = applier.applyFunction(fn, cljArgs)
        return cljToJs(result, applier)
      }
    }
    case 'macro':
      throw new ConversionError(
        'Macros cannot be exported to JavaScript. Macros are compile-time constructs.',
        { macro: value }
      )
  }
}

export interface JsToCljOpts {
  /** When true, plain object keys become keywords. Default: true. */
  keywordizeKeys?: boolean
}

export function jsToClj(value: unknown, opts: JsToCljOpts = {}): CljValue {
  const { keywordizeKeys = true } = opts

  if (value === null) return v.nil()
  if (value === undefined) return v.jsValue(undefined)
  if (isCljValue(value)) return value

  switch (typeof value) {
    case 'number':
      return v.number(value)
    case 'string':
      return v.string(value)
    case 'boolean':
      return v.boolean(value)
    case 'function': {
      const jsFn = value as (...args: unknown[]) => unknown
      return v.nativeFn('js-fn', (...cljArgs: CljValue[]) => {
        const jsArgs = cljArgs.map((a) => cljToJs(a, _throwingApplier))
        const result = jsFn(...jsArgs)
        return jsToClj(result, opts)
      })
    }
    case 'object': {
      if (Array.isArray(value)) {
        return v.vector(value.map((item) => jsToClj(item, opts)))
      }
      const entries: [CljValue, CljValue][] = Object.entries(
        value as Record<string, unknown>
      ).map(([k, val]) => [
        keywordizeKeys ? v.keyword(`:${k}`) : v.string(k),
        jsToClj(val, opts),
      ])
      return v.map(entries)
    }
    default:
      throw new ConversionError(
        `Cannot convert JS value of type ${typeof value} to CljValue`,
        { value }
      )
  }
}
