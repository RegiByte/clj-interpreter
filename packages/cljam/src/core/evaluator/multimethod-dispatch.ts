/**
 * Multimethod dispatch — pure dispatch kernel with no evaluator dependencies.
 *
 * Extracted from dispatch.ts so that async-evaluator.ts can import
 * dispatchMultiMethod without creating a dependency cycle:
 *
 *   async-evaluator → dispatch → special-forms → async-evaluator  (old cycle)
 *
 * Both dispatch.ts (evaluateList) and async-evaluator.ts (applyCallableAsync)
 * import from here. Neither creates a cycle because this file has no imports
 * from the evaluator layer.
 */

import { is } from '../assertions'
import { EvaluationError } from '../errors'
import { getPos } from '../positions'
import { printString } from '../printer'
import type {
  CljList,
  CljMap,
  CljMultiMethod,
  CljSet,
  CljValue,
  Env,
  EvaluationContext,
} from '../types'

// ─── Hierarchy helpers ────────────────────────────────────────────────────────
// Inlined here (not imported from stdlib) to keep the dependency direction
// correct: evaluator layer → core types, not evaluator → stdlib.

function getCurrentHierarchy(ctx: EvaluationContext): CljMap | null {
  const coreNs = ctx.allNamespaces().find((ns) => ns.name === 'clojure.core')
  if (!coreNs) return null
  const hVar = coreNs.vars.get('*hierarchy*')
  if (!hVar) return null
  const val =
    hVar.dynamic && hVar.bindingStack && hVar.bindingStack.length > 0
      ? hVar.bindingStack[hVar.bindingStack.length - 1]
      : hVar.value
  return is.map(val) ? (val as CljMap) : null
}

function isAInHierarchy(h: CljMap, child: CljValue, parent: CljValue): boolean {
  if (is.equal(child, parent)) return true
  for (const [k, subMap] of h.entries) {
    if (k.kind !== 'keyword' || k.name !== ':ancestors') continue
    if (!is.map(subMap)) return false
    for (const [ck, cv] of (subMap as CljMap).entries) {
      if (!is.equal(ck, child)) continue
      if (!is.set(cv)) return false
      return (cv as CljSet).values.some((x) => is.equal(x, parent))
    }
    return false
  }
  return false
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function dispatchMultiMethod(
  mm: CljMultiMethod,
  args: CljValue[],
  ctx: EvaluationContext,
  env: Env,
  callSite?: CljList
): CljValue {
  const dispatchVal = ctx.applyFunction(mm.dispatchFn, args, env)

  // 1. Exact match (fast path)
  const exactMethod = mm.methods.find(({ dispatchVal: dv }) => is.equal(dv, dispatchVal))
  if (exactMethod) return ctx.applyFunction(exactMethod.fn, args, env)

  // 2. Hierarchy fallback — check isa? for each registered dispatch value
  const h = getCurrentHierarchy(ctx)
  if (h) {
    const matches = mm.methods.filter(({ dispatchVal: dv }) =>
      isAInHierarchy(h, dispatchVal, dv)
    )
    if (matches.length === 1) {
      return ctx.applyFunction(matches[0].fn, args, env)
    }
    if (matches.length > 1) {
      throw new EvaluationError(
        `Multiple methods in multimethod '${mm.name}' match dispatch value ` +
          `${printString(dispatchVal)}: ` +
          matches.map((m) => printString(m.dispatchVal)).join(', '),
        { mm, dispatchVal },
        callSite ? getPos(callSite) : undefined
      )
    }
  }

  // 3. Fallback — the defaultMethod field holds the handler registered for
  // the sentinel dispatch value (defaultDispatchVal ?? :default).
  // add-method! is responsible for routing the sentinel to defaultMethod;
  // dispatch only needs to check that field.
  if (mm.defaultMethod) return ctx.applyFunction(mm.defaultMethod, args, env)

  throw new EvaluationError(
    `No method in multimethod '${mm.name}' for dispatch value ${printString(dispatchVal)}`,
    { mm, dispatchVal },
    callSite ? getPos(callSite) : undefined
  )
}
