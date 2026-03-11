import { derefValue, getNamespaceEnv, lookup } from '../env'
import { EvaluationError } from '../errors'
import { cljNil } from '../factories'
import { getPos } from '../positions'
import { valueKeywords } from '../types'

import type { CljValue, Env, EvaluationContext } from '../types'
import { evaluateMap, evaluateSet, evaluateVector } from './collections'
import { evaluateList } from './dispatch'

export type EvaluationMeasurement = {
  result: CljValue
  durationMs: number
}

function nowMs(): number {
  if (typeof performance !== 'undefined') return performance.now()
  return Date.now()
}

export function evaluateWithContext(
  expr: CljValue,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  try {
    switch (expr.kind) {
      // self-evaluating forms
      case valueKeywords.number:
      case valueKeywords.string:
      case valueKeywords.keyword:
      case valueKeywords.nil:
      case valueKeywords.function:
      case valueKeywords.multiMethod:
      case valueKeywords.boolean:
      case valueKeywords.regex:
      case valueKeywords.delay:
      case valueKeywords.lazySeq:
      case valueKeywords.cons:
      case valueKeywords.namespace:
        return expr
      case valueKeywords.symbol: {
        const slashIdx = expr.name.indexOf('/')
        if (slashIdx > 0 && slashIdx < expr.name.length - 1) {
          const alias = expr.name.slice(0, slashIdx)
          const sym = expr.name.slice(slashIdx + 1)
          const nsEnv = getNamespaceEnv(env)
          // Resolve alias: local :as alias first, then full namespace name
          const targetNs = nsEnv.ns?.aliases.get(alias) ?? ctx.resolveNs(alias) ?? null
          if (!targetNs) {
            throw new EvaluationError(`No such namespace or alias: ${alias}`, {
              symbol: expr.name,
              env,
            })
          }
          const v = targetNs.vars.get(sym)
          if (v === undefined) {
            throw new EvaluationError(`Symbol ${expr.name} not found`, {
              symbol: expr.name,
              env,
            })
          }
          return derefValue(v)
        }
        return lookup(expr.name, env)
      }
      case valueKeywords.vector:
        return evaluateVector(expr, env, ctx)
      case valueKeywords.map:
        return evaluateMap(expr, env, ctx)
      case valueKeywords.set:
        return evaluateSet(expr, env, ctx)
      case valueKeywords.list:
        return evaluateList(expr, env, ctx)
      default:
        throw new EvaluationError('Unexpected value', { expr, env })
    }
  } catch (e) {
    if (e instanceof EvaluationError && !e.pos) {
      const p = getPos(expr)
      if (p) e.pos = p
    }
    throw e
  }
}

export function evaluateFormsWithContext(
  forms: CljValue[],
  env: Env,
  ctx: EvaluationContext
): CljValue {
  let result: CljValue = cljNil()
  for (const form of forms) {
    result = ctx.evaluate(form, env)
  }
  return result
}

export function evaluateWithMeasurementsWithContext(
  expr: CljValue,
  env: Env,
  ctx: EvaluationContext
): EvaluationMeasurement {
  const start = nowMs()
  const result = ctx.evaluate(expr, env)
  const end = nowMs()
  return {
    result,
    durationMs: end - start,
  }
}
