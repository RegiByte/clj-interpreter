import { is } from '../assertions'
import { CljThrownSignal, EvaluationError } from '../errors'
import { v } from '../factories'
import { getPos } from '../positions'
import { printString } from '../printer'
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
  if (raw === null) return v.nil()
  if (raw === undefined) return v.jsValue(undefined)
  if (typeof raw === 'number') return v.number(raw)
  if (typeof raw === 'string') return v.string(raw)
  if (typeof raw === 'boolean') return v.boolean(raw)
  // Auto-wrap JS Promises (thenables) as CljPending so they compose with then/catch*/@ natively.
  if (raw !== null && typeof (raw as Record<string, unknown>)?.then === 'function') {
    return v.pending(Promise.resolve(raw as Promise<unknown>).then(jsToClj))
  }
  return v.jsValue(raw)
}

/**
 * Convert a CljValue map key to a JS object key string.
 * Only primitive keys are allowed. Rich keys (vectors, maps, sets, etc.)
 * have no meaningful JS representation and must be reduced to a primitive first.
 */
function mapKeyToString(key: CljValue): string {
  if (is.string(key)) return key.value
  if (is.keyword(key)) return key.name.slice(1) // strip leading ':'
  if (is.number(key)) return String(key.value)
  if (is.boolean(key)) return String(key.value)
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
export function cljToJs(
  val: CljValue,
  ctx: EvaluationContext,
  callEnv: Env
): unknown {
  switch (val.kind) {
    case 'js-value':
      return val.value
    case 'number':
      return val.value
    case 'string':
      return val.value
    case 'boolean':
      return val.value
    case 'nil':
      return null
    case 'keyword':
      return val.name.slice(1) // strip leading ':'
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
    case 'pending':
      // Boundary policy (Phase 3 F5): a pending crossing to the host becomes
      // a real Promise. Resolutions convert like any other value; a Clojure
      // (throw …) rejection unwraps from its CljThrownSignal into a
      // host-friendly Error (printed value as message, original CljValue on
      // `cause`). EvaluationErrors and raw host errors pass through — they
      // are already Errors.
      return val.promise.then(
        (resolved) => cljToJs(resolved, ctx, callEnv),
        (err) => {
          if (err instanceof CljThrownSignal) {
            throw new Error(printString(err.value), { cause: err.value })
          }
          throw err
        }
      )
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
export function extractRawTarget(target: CljValue, targetForm: CljValue): unknown {
  switch (target.kind) {
    case 'js-value':
      return target.value
    case 'string':
    case 'number':
    case 'boolean':
      return target.value
    default:
      throw new EvaluationError(`cannot use . on ${target.kind}`, { target }, getPos(targetForm))
  }
}

export function readJsProperty(
  target: CljValue,
  targetForm: CljValue,
  propName: string
): CljValue {
  const rawTarget = extractRawTarget(target, targetForm)

  if (rawTarget === null || rawTarget === undefined) {
    const label = rawTarget === null ? 'null' : 'undefined'
    throw new EvaluationError(
      `cannot use . on ${label} js value — check for nil/undefined before accessing properties`,
      { target },
      getPos(targetForm)
    )
  }

  const rawObj = rawTarget as Record<string, unknown>
  const rawProp = rawObj[propName]
  if (typeof rawProp === 'function') {
    return v.jsValue((rawProp as (...a: unknown[]) => unknown).bind(rawObj))
  }
  return jsToClj(rawProp)
}

export function resolveJsDotChainSymbol(
  root: CljValue,
  symbolForm: CljValue,
  segments: string[]
): CljValue {
  let current = root
  for (const segment of segments) {
    current = readJsProperty(current, symbolForm, segment)
  }
  return current
}

export function callJsMethod(
  target: CljValue,
  targetForm: CljValue,
  propName: string,
  propForm: CljValue,
  args: CljValue[],
  ctx: EvaluationContext,
  env: Env
): CljValue {
  const rawTarget = extractRawTarget(target, targetForm)

  if (rawTarget === null || rawTarget === undefined) {
    const label = rawTarget === null ? 'null' : 'undefined'
    throw new EvaluationError(
      `cannot use . on ${label} js value — check for nil/undefined before accessing properties`,
      { target },
      getPos(targetForm)
    )
  }

  const rawObj = rawTarget as Record<string, unknown>
  const method = rawObj[propName]
  if (typeof method !== 'function') {
    throw new EvaluationError(
      `method '${propName}' is not callable on ${String(rawObj)}`,
      { propName, rawObj },
      getPos(propForm)
    )
  }

  const jsArgs = args.map((a) => cljToJs(a, ctx, env))
  return jsToClj((method as (...args: unknown[]) => unknown).apply(rawObj, jsArgs))
}

export function constructJsValue(
  cls: CljValue,
  clsForm: CljValue,
  args: CljValue[],
  ctx: EvaluationContext,
  env: Env
): CljValue {
  if (!is.jsValue(cls) || typeof cls.value !== 'function') {
    throw new EvaluationError(
      `js/new: expected js-value constructor, got ${cls.kind}`,
      { cls },
      getPos(clsForm)
    )
  }

  const jsArgs = args.map((a) => cljToJs(a, ctx, env))
  const ctor = cls.value as new (...args: unknown[]) => unknown
  return jsToClj(new ctor(...jsArgs))
}

export function evaluateDot(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  if (list.value.length < 3) {
    throw new EvaluationError('. requires at least 2 arguments: (. obj prop)', {
      list,
    }, getPos(list))
  }

  const targetForm = list.value[1]
  const target = ctx.evaluate(targetForm, env)

  const propForm = list.value[2]
  if (!is.symbol(propForm)) {
    throw new EvaluationError(
      `. expects a symbol for property name, got: ${propForm.kind}`,
      { propForm },
      getPos(propForm) ?? getPos(list)
    )
  }

  const propName = propForm.name

  if (list.value.length === 3) {
    return readJsProperty(target, targetForm, propName)
  }

  const cljArgs = list.value.slice(3).map((a) => ctx.evaluate(a, env))
  return callJsMethod(target, targetForm, propName, propForm, cljArgs, ctx, env)
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
    throw new EvaluationError('js/new requires a constructor argument', {
      list,
    }, getPos(list))
  }

  const cls = ctx.evaluate(list.value[1], env)
  const cljArgs = list.value.slice(2).map((a) => ctx.evaluate(a, env))
  return constructJsValue(cls, list.value[1], cljArgs, ctx, env)
}
