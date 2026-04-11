import { is } from '../assertions'
import { v } from '../factories'
import { valueKeywords } from '../keywords'
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
  for (const v of set.values) {
    const ev = ctx.evaluate(v, env)
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
  if (map.meta) return { kind: valueKeywords.map, entries, meta: map.meta }
  return v.map(entries)
}
