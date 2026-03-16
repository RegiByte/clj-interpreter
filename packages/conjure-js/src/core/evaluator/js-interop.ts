import { is } from '../assertions'
import { EvaluationError } from '../errors'
import { cljBoolean, cljJsValue, cljNil, cljNumber, cljString } from '../factories'
import type { CljList, CljValue, Env, EvaluationContext } from '../types'

// ---------------------------------------------------------------------------
// JS ↔ Clojure conversion
// ---------------------------------------------------------------------------

/**
 * Convert a raw JS value to a CljValue.
 * - null → CljNil (intentional absence)
 * - undefined → CljJsValue(undefined) (property does not exist / unset — distinct from null)
 * - primitives convert; everything else boxes.
 */
export function jsToClj(raw: unknown): CljValue {
  if (raw === null) return cljNil()
  if (raw === undefined) return cljJsValue(undefined)
  if (typeof raw === 'number') return cljNumber(raw)
  if (typeof raw === 'string') return cljString(raw)
  if (typeof raw === 'boolean') return cljBoolean(raw)
  return cljJsValue(raw)
}

/**
 * Convert a CljValue map key to a JS object key string.
 * Only primitive keys are allowed. Rich keys (vectors, maps, sets, etc.)
 * have no meaningful JS representation and must be reduced to a primitive first.
 */
function mapKeyToString(key: CljValue): string {
  if (key.kind === 'string') return key.value
  if (key.kind === 'keyword') return key.name.slice(1) // strip leading ':'
  if (key.kind === 'number') return String(key.value)
  if (key.kind === 'boolean') return String(key.value)
  throw new EvaluationError(
    `cljToJs: map key must be a string, keyword, number, or boolean — ` +
    `got ${key.kind} (rich keys are not allowed as JS object keys; reduce to a primitive first)`,
    { key }
  )
}

/**
 * Convert a CljValue to a raw JS value for crossing the interop boundary.
 * Called on each argument passed to `.` and `js/new`.
 */
export function cljToJs(val: CljValue, ctx: EvaluationContext, callEnv: Env): unknown {
  switch (val.kind) {
    case 'js-value': return val.value
    case 'number': return val.value
    case 'string': return val.value
    case 'boolean': return val.value
    case 'nil': return null
    case 'keyword': return val.name.slice(1) // strip leading ':'
    case 'function':
    case 'native-function': {
      const fn = val
      // Wrap so JS can call it: converts args JS→Clj on entry, result Clj→JS on exit.
      return (...jsArgs: unknown[]) => {
        const cljArgs = jsArgs.map(jsToClj)
        const result = ctx.applyCallable(fn, cljArgs, callEnv)
        return cljToJs(result, ctx, callEnv)
      }
    }
    case 'list':
    case 'vector':
      return val.value.map((v) => cljToJs(v, ctx, callEnv))
    case 'map': {
      const obj: Record<string, unknown> = {}
      for (const [key, value] of val.entries) {
        obj[mapKeyToString(key)] = cljToJs(value, ctx, callEnv)
      }
      return obj
    }
    default:
      throw new EvaluationError(
        `cannot convert ${val.kind} to JS value — no coercion defined`,
        { val }
      )
  }
}

// ---------------------------------------------------------------------------
// (. obj prop) / (. obj method arg1 arg2 ...)
// ---------------------------------------------------------------------------

/**
 * Extract the raw JS value from a target CljValue for use in `.`.
 * Strings, numbers, and booleans are auto-boxed (JS auto-promotes them for
 * property/method access). Nil and all other Clojure types are rejected.
 */
function extractRawTarget(target: CljValue): unknown {
  switch (target.kind) {
    case 'js-value': return target.value
    case 'string':
    case 'number':
    case 'boolean': return target.value
    default:
      throw new EvaluationError(
        `cannot use . on ${target.kind}`,
        { target }
      )
  }
}

export function evaluateDot(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  if (list.value.length < 3) {
    throw new EvaluationError(
      '. requires at least 2 arguments: (. obj prop)',
      { list }
    )
  }

  const target = ctx.evaluate(list.value[1], env)
  const rawTarget = extractRawTarget(target)

  if (rawTarget === null || rawTarget === undefined) {
    const label = rawTarget === null ? 'null' : 'undefined'
    throw new EvaluationError(
      `cannot use . on ${label} js value — check for nil/undefined before accessing properties`,
      { target }
    )
  }

  const propForm = list.value[2]
  if (!is.symbol(propForm)) {
    throw new EvaluationError(
      `. expects a symbol for property name, got: ${propForm.kind}`,
      { propForm }
    )
  }

  const propName = propForm.name
  const rawObj = rawTarget as Record<string, unknown>

  if (list.value.length === 3) {
    // Property access — zero extra args.
    // Functions are bound to their object so that ((. obj method)) works correctly.
    const rawProp = rawObj[propName]
    if (typeof rawProp === 'function') {
      return cljJsValue((rawProp as (...a: unknown[]) => unknown).bind(rawObj))
    }
    return jsToClj(rawProp)
  }

  // Method call — one or more extra args
  const method = rawObj[propName]
  if (typeof method !== 'function') {
    throw new EvaluationError(
      `method '${propName}' is not callable on ${String(rawObj)}`,
      { propName, rawObj }
    )
  }

  const cljArgs = list.value.slice(3).map((a) => ctx.evaluate(a, env))
  const jsArgs = cljArgs.map((a) => cljToJs(a, ctx, env))
  const rawResult = (method as (...args: unknown[]) => unknown).apply(rawObj, jsArgs)
  return jsToClj(rawResult)
}

// ---------------------------------------------------------------------------
// (js/new ClassName arg1 arg2 ...)
// ---------------------------------------------------------------------------

export function evaluateNew(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  if (list.value.length < 2) {
    throw new EvaluationError('js/new requires a constructor argument', { list })
  }

  const cls = ctx.evaluate(list.value[1], env)
  if (!is.jsValue(cls) || typeof cls.value !== 'function') {
    throw new EvaluationError(
      `js/new: expected js-value constructor, got ${cls.kind}`,
      { cls }
    )
  }

  const cljArgs = list.value.slice(2).map((a) => ctx.evaluate(a, env))
  const jsArgs = cljArgs.map((a) => cljToJs(a, ctx, env))
  const ctor = cls.value as new (...args: unknown[]) => unknown
  return cljJsValue(new ctor(...jsArgs))
}
