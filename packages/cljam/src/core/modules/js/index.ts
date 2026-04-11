// js namespace — ambient JS interop utilities.
// Installed automatically alongside clojure.core. No explicit require needed.
// Users inject host globals (js/Math, js/console, etc.) via createSession({ hostBindings }).
import { is } from '../../assertions'
import {
  type FunctionApplier,
  cljToJs as cljToJsDeep,
  jsToClj as jsToCljDeep,
} from '../../conversions'
import { EvaluationError } from '../../errors'
import { cljToJs, jsToClj } from '../../evaluator/js-interop'
import { v } from '../../factories'
import { valueKeywords } from '../../keywords'
import type { RuntimeModule, VarDeclaration, VarMap } from '../../module'
import type { CljValue, Env, EvaluationContext } from '../../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a Clojure key value to a JS object key string.
 * Strings, keywords, and numbers are allowed — JS coerces numbers anyway.
 */
function resolveJsKey(key: CljValue, fnName: string): string {
  if (is.string(key)) return key.value
  if (is.keyword(key)) return key.name.slice(1) // strip leading ':'
  if (is.number(key)) return String(key.value) // JS coerces obj[0] to obj["0"]
  throw new EvaluationError(
    `${fnName}: key must be a string, keyword, or number, got ${key.kind}`,
    { key }
  )
}

/**
 * Extract the raw value from a target CljValue for use in js/get and js/set!.
 * Mirrors extractRawTarget in js-interop.ts: CljJsValue, CljString, CljNumber,
 * CljBoolean are all valid targets — JS auto-boxes primitives for property access.
 * Nil and other Clojure types are rejected.
 */
function extractJsTarget(val: CljValue, fnName: string): unknown {
  switch (val.kind) {
    case valueKeywords.jsValue:
      return val.value
    case valueKeywords.string:
    case valueKeywords.number:
    case valueKeywords.boolean:
      return val.value
    case valueKeywords.nil:
      throw new EvaluationError(`${fnName}: cannot access properties on nil`, {
        val,
      })
    default:
      throw new EvaluationError(
        `${fnName}: expected a js-value or primitive, got ${val.kind}`,
        { val }
      )
  }
}

/**
 * JS interop functions that are part of the core namespace.
 * Thus they are available globally when the JS module is loaded.
 * We declare them here to allow the user to use them without
 * having to refer to them in (ns (:require))
 */
const coreNativeFunctions: Record<string, CljValue> = {
  // JS interop — deep conversion functions
  'clj->js': v.nativeFnCtx(
    'clj->js',
    (ctx: EvaluationContext, callEnv: Env, val: CljValue) => {
      if (is.jsValue(val)) return val
      const applier: FunctionApplier = {
        applyFunction: (fn, args) => ctx.applyCallable(fn, args, callEnv),
      }
      return v.jsValue(cljToJsDeep(val, applier))
    }
  ),
  'js->clj': v.nativeFn('js->clj', (val: CljValue, opts?: CljValue) => {
    if (val.kind === 'nil') return val
    if (!is.jsValue(val)) {
      throw new EvaluationError(`js->clj expects a js-value, got ${val.kind}`, {
        val,
      })
    }
    const keywordizeKeys = (() => {
      if (!opts || opts.kind !== 'map') return false
      for (const [k, flag] of opts.entries) {
        if (k.kind === 'keyword' && k.name === ':keywordize-keys') {
          return flag.kind !== 'boolean' || flag.value !== false
        }
      }
      return false
    })()
    return jsToCljDeep(val.value, { keywordizeKeys })
  }),
}

const moduleNativeFunctions: Record<string, CljValue> = {
  // (js/get obj key) / (js/get obj key not-found)
  // Dynamic property access. Primitives (string, number, boolean) are valid
  // targets — same auto-boxing JS applies. Optional not-found default is returned
  // when the property is absent (undefined), allowing idiomatic nil defaults.
  get: v.nativeFn(
    'js/get',
    (obj: CljValue, key: CljValue, ...rest: CljValue[]) => {
      const raw = extractJsTarget(obj, 'js/get') as Record<string, unknown>
      const jsKey = resolveJsKey(key, 'js/get')
      const result = raw[jsKey]
      if (result === undefined && rest.length > 0) return rest[0]
      return jsToClj(result)
    }
  ),
  // (js/set! obj key val) — mutate a property; returns val
  'set!': v.nativeFnCtx(
    'js/set!',
    (
      ctx: EvaluationContext,
      callEnv: Env,
      obj: CljValue,
      key: CljValue,
      val: CljValue
    ) => {
      const raw = extractJsTarget(obj, 'js/set!') as Record<string, unknown>
      const jsKey = resolveJsKey(key, 'js/set!')
      raw[jsKey] = cljToJs(val, ctx, callEnv)
      return val
    }
  ),
  // (js/call fn & args) — call a JS function with no this binding
  call: v.nativeFnCtx(
    'js/call',
    (
      ctx: EvaluationContext,
      callEnv: Env,
      fn: CljValue,
      ...args: CljValue[]
    ) => {
      const rawFn = fn.kind === 'js-value' ? fn.value : undefined
      if (typeof rawFn !== 'function') {
        throw new EvaluationError(
          `js/call: expected a js-value wrapping a function, got ${fn.kind}`,
          { fn }
        )
      }
      const jsArgs = args.map((a) => cljToJs(a, ctx, callEnv))
      return jsToClj((rawFn as (...a: unknown[]) => unknown)(...jsArgs))
    }
  ),
  // (js/typeof x) — typeof equivalent for CljValues.
  // Clojure primitives have unambiguous JS typeof values; js-value delegates to
  // the raw typeof. Functions and other Clojure types throw — they're not at the
  // JS boundary.
  typeof: v.nativeFn('js/typeof', (x: CljValue) => {
    switch (x.kind) {
      case 'nil':
        return v.string('object') // typeof null === 'object'
      case 'number':
        return v.string('number')
      case 'string':
        return v.string('string')
      case 'boolean':
        return v.string('boolean')
      case 'js-value':
        return v.string(typeof x.value)
      default:
        throw new EvaluationError(
          `js/typeof: cannot determine JS type of Clojure ${x.kind}`,
          { x }
        )
    }
  }),
  // (js/instanceof? obj cls) — obj instanceof cls
  'instanceof?': v.nativeFn(
    'js/instanceof?',
    (obj: CljValue, cls: CljValue) => {
      if (obj.kind !== 'js-value') {
        throw new EvaluationError(
          `js/instanceof?: expected js-value, got ${obj.kind}`,
          { obj }
        )
      }
      if (cls.kind !== 'js-value') {
        throw new EvaluationError(
          `js/instanceof?: expected js-value constructor, got ${cls.kind}`,
          { cls }
        )
      }
      return v.boolean(
        obj.value instanceof (cls.value as new (...a: unknown[]) => unknown)
      )
    }
  ),
  // (js/array? x) — Array.isArray on the raw value
  'array?': v.nativeFn('js/array?', (x: CljValue) => {
    if (x.kind !== 'js-value') return v.boolean(false)
    return v.boolean(Array.isArray(x.value))
  }),
  // (js/null? x) — true if x is nil (JS null comes in as CljNil)
  'null?': v.nativeFn('js/null?', (x: CljValue) => {
    return v.boolean(x.kind === 'nil')
  }),
  // (js/undefined? x) — true if x is CljJsValue wrapping undefined
  'undefined?': v.nativeFn('js/undefined?', (x: CljValue) => {
    return v.boolean(x.kind === 'js-value' && x.value === undefined)
  }),
  // (js/some? x) — true if x is neither null (nil) nor undefined
  'some?': v.nativeFn('js/some?', (x: CljValue) => {
    if (x.kind === 'nil') return v.boolean(false)
    if (x.kind === 'js-value' && x.value === undefined) return v.boolean(false)
    return v.boolean(true)
  }),
  // (js/get-in obj path) / (js/get-in obj path not-found)
  // Deep property access. path must be a CljVector of string/keyword/number keys.
  'get-in': v.nativeFn(
    'js/get-in',
    (obj: CljValue, path: CljValue, ...rest: CljValue[]) => {
      if (path.kind !== 'vector') {
        throw new EvaluationError(
          `js/get-in: path must be a vector, got ${path.kind}`,
          { path }
        )
      }
      // Validate root eagerly — nil root is always an error
      if (obj.kind === 'nil') {
        throw new EvaluationError(
          'js/get-in: cannot access properties on nil',
          { obj }
        )
      }
      const notFound = rest.length > 0 ? rest[0] : v.jsValue(undefined)
      let current: CljValue = obj
      for (const key of path.value) {
        if (current.kind === 'nil') return notFound
        if (current.kind === 'js-value' && current.value === undefined)
          return notFound
        const raw = extractJsTarget(current, 'js/get-in') as Record<
          string,
          unknown
        >
        const jsKey = resolveJsKey(key, 'js/get-in')
        current = jsToClj((raw as Record<string, unknown>)[jsKey])
      }
      if (
        current.kind === 'js-value' &&
        current.value === undefined &&
        rest.length > 0
      ) {
        return notFound
      }
      return current
    }
  ),
  // (js/prop key) / (js/prop key not-found)
  // Returns a single-arg function that reads the given property from an object.
  // Use with map/filter: (map (js/prop "name") users)
  prop: v.nativeFn('js/prop', (key: CljValue, ...rest: CljValue[]) => {
    const notFound = rest.length > 0 ? rest[0] : v.nil()
    return v.nativeFn('js/prop-accessor', (obj: CljValue) => {
      const raw = extractJsTarget(obj, 'js/prop') as Record<string, unknown>
      const jsKey = resolveJsKey(key, 'js/prop')
      const result = raw[jsKey]
      if (result === undefined) return notFound
      return jsToClj(result)
    })
  }),
  // (js/method key & partialArgs)
  // Returns a function that calls the named method on an object, prepending any partial args.
  // (map (js/method "trim") strings)
  // (map (js/method "toFixed" 2) numbers)
  method: v.nativeFn(
    'js/method',
    (key: CljValue, ...partialArgs: CljValue[]) => {
      return v.nativeFnCtx(
        'js/method-caller',
        (
          ctx: EvaluationContext,
          callEnv: Env,
          obj: CljValue,
          ...callArgs: CljValue[]
        ) => {
          const rawObj = extractJsTarget(obj, 'js/method') as Record<
            string,
            unknown
          >
          const jsKey = resolveJsKey(key, 'js/method')
          const method = rawObj[jsKey]
          if (typeof method !== 'function') {
            throw new EvaluationError(
              `js/method: property '${jsKey}' is not callable`,
              { jsKey }
            )
          }
          const allArgs = [...partialArgs, ...callArgs].map((a) =>
            cljToJs(a, ctx, callEnv)
          )
          return jsToClj(
            (method as (...a: unknown[]) => unknown).apply(rawObj, allArgs)
          )
        }
      )
    }
  ),
  // (js/merge obj1 obj2 ...) — Object.assign into a fresh object
  merge: v.nativeFnCtx(
    'js/merge',
    (ctx: EvaluationContext, callEnv: Env, ...args: CljValue[]) => {
      const result = Object.assign(
        {},
        ...args.map((a) => cljToJs(a, ctx, callEnv))
      )
      return v.jsValue(result)
    }
  ),
  // (js/seq arr) — JS array → Clojure vector with elements converted via jsToClj
  seq: v.nativeFn('js/seq', (arr: CljValue) => {
    if (arr.kind !== 'js-value' || !Array.isArray(arr.value)) {
      throw new EvaluationError(
        `js/seq: expected a js-value wrapping an array, got ${arr.kind}`,
        { arr }
      )
    }
    return v.vector((arr.value as unknown[]).map(jsToClj))
  }),
  // (js/array & args) — variadic args → JS array as CljJsValue
  array: v.nativeFnCtx(
    'js/array',
    (ctx: EvaluationContext, callEnv: Env, ...args: CljValue[]) => {
      return v.jsValue(args.map((a) => cljToJs(a, ctx, callEnv)))
    }
  ),
  // (js/obj key val key val ...) — variadic key-val pairs → JS plain object as CljJsValue
  obj: v.nativeFnCtx(
    'js/obj',
    (ctx: EvaluationContext, callEnv: Env, ...args: CljValue[]) => {
      if (args.length % 2 !== 0) {
        throw new EvaluationError('js/obj: requires even number of arguments', {
          count: args.length,
        })
      }
      const result: Record<string, unknown> = {}
      for (let i = 0; i < args.length; i += 2) {
        const jsKey = resolveJsKey(args[i], 'js/obj')
        result[jsKey] = cljToJs(args[i + 1], ctx, callEnv)
      }
      return v.jsValue(result)
    }
  ),
  // (js/keys obj) — Object.keys equivalent → Clojure vector of strings
  keys: v.nativeFn('js/keys', (obj: CljValue) => {
    const raw = extractJsTarget(obj, 'js/keys') as Record<string, unknown>
    return v.vector(Object.keys(raw).map(v.string))
  }),
  // (js/values obj) — Object.values equivalent → Clojure vector, elements via jsToClj
  values: v.nativeFn('js/values', (obj: CljValue) => {
    const raw = extractJsTarget(obj, 'js/values') as Record<string, unknown>
    return v.vector(Object.values(raw).map(jsToClj))
  }),
  // (js/entries obj) — Object.entries equivalent → vector of [key value] pairs
  entries: v.nativeFn('js/entries', (obj: CljValue) => {
    const raw = extractJsTarget(obj, 'js/entries') as Record<string, unknown>
    return v.vector(
      Object.entries(raw).map(([k, val]) =>
        v.vector([v.string(k), jsToClj(val)])
      )
    )
  }),
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export function makeJsModule(): RuntimeModule {
  return {
    id: 'cljam/js-namespace',
    declareNs: [
      {
        name: 'clojure.core',
        vars(_ctx): VarMap {
          const map = new Map<string, VarDeclaration>()
          for (const [name, fn] of Object.entries(coreNativeFunctions)) {
            map.set(name, { value: fn })
          }
          return map
        },
      },
      {
        name: 'js',
        vars(_ctx): VarMap {
          const map = new Map<string, VarDeclaration>()

          for (const [name, fn] of Object.entries(moduleNativeFunctions)) {
            map.set(name, { value: fn })
          }

          return map
        },
      },
    ],
  }
}
