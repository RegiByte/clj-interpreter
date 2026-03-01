import { cljMap, cljVector } from '../factories'
import type { CljMap, CljValue, CljVector, EvaluationContext } from '../types'
import type { Env } from '../types'

export function evaluateVector(
  vector: CljVector,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  return cljVector(vector.value.map((v) => ctx.evaluate(v, env)))
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
  return cljMap(entries)
}
