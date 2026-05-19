import { is } from '../assertions'
import { v } from '../factories'
import { valueKeywords } from '../keywords'
import { setValues } from '../persistent/map-helpers'
import type {
  CljMap,
  CljSet,
  CljValue,
  CljVector,
  Env,
  EvaluationContext,
} from '../types'

export function evaluateVector(
  vector: CljVector,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const evaluated = vector.value.map((v) => ctx.evaluate(v, env))
  if (vector.meta)
    return {
      kind: valueKeywords.vector,
      value: evaluated,
      meta: vector.meta,
    }
  return v.vector(evaluated)
}

export function evaluateSet(
  set: CljSet,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const evaluated: CljValue[] = []
  for (const form of setValues(set)) {
    const ev = ctx.evaluate(form, env)
    if (!evaluated.some((existing) => is.equal(existing, ev))) {
      evaluated.push(ev)
    }
  }
  return v.set(evaluated)
}

export function evaluateMap(
  map: CljMap,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  let entries: [CljValue, CljValue][] = []
  for (const [key, value] of map.entries) {
    const evaluatedKey = ctx.evaluate(key, env)
    const evaluatedValue = ctx.evaluate(value, env)
    entries.push([evaluatedKey, evaluatedValue])
  }
  const result = v.map(entries)
  if (map.meta) result.meta = map.meta
  return result
}
