/**
 * Shared binding-setup logic for (binding [...] body).
 *
 * `setupBindingVars` performs the PUSH phase of `(binding [...] body)`:
 *   - validates the binding vector structure
 *   - resolves each var (unqualified or fully-qualified ns/name)
 *   - validates that each var is ^:dynamic
 *   - evaluates the new value via ctx.evaluate (always synchronous)
 *   - pushes the new value onto the var's bindingStack
 *
 * Returns `{ body, boundVars }`. The caller owns the POP phase, which must
 * always run in a `finally` block to preserve exception safety:
 *
 *   const { body, boundVars } = setupBindingVars(list, env, ctx)
 *   try {
 *     return evaluateBody(body, env, ctx)   // sync or async
 *   } finally {
 *     for (const v of boundVars) v.bindingStack!.pop()
 *   }
 *
 * Keeping push/pop in the caller makes it trivial to swap the body evaluation
 * strategy (sync in special-forms.ts, async in async-evaluator.ts) without
 * duplicating the var-resolution logic.
 *
 * This file has no imports from the evaluator layer, so it is safe to import
 * from both special-forms.ts and async-evaluator.ts without creating cycles.
 */

import { is } from '../assertions'
import { getNamespaceEnv, lookupVar } from '../env'
import { EvaluationError } from '../errors'
import { getPos } from '../positions'
import type { CljList, CljValue, CljVar, Env, EvaluationContext } from '../types'

export type BindingSetup = {
  body: CljValue[]
  boundVars: CljVar[]
}

export function setupBindingVars(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): BindingSetup {
  const bindings = list.value[1]
  if (!is.vector(bindings)) {
    throw new EvaluationError(
      'binding requires a vector of bindings',
      { list, env },
      getPos(list)
    )
  }
  if (bindings.value.length % 2 !== 0) {
    throw new EvaluationError(
      'binding vector must have an even number of forms',
      { list, env },
      getPos(bindings) ?? getPos(list)
    )
  }

  const body = list.value.slice(2)
  const boundVars: CljVar[] = []

  for (let i = 0; i < bindings.value.length; i += 2) {
    const sym = bindings.value[i]
    if (!is.symbol(sym)) {
      throw new EvaluationError(
        'binding left-hand side must be a symbol',
        { sym },
        getPos(sym) ?? getPos(list)
      )
    }

    const newVal = ctx.evaluate(bindings.value[i + 1], env)

    // Support both unqualified (*my-var*) and qualified (my.ns/*my-var*) symbols.
    const slashIdx = sym.name.indexOf('/')
    let targetVar: CljVar | undefined
    if (slashIdx > 0 && slashIdx < sym.name.length - 1) {
      const nsPrefix = sym.name.slice(0, slashIdx)
      const localName = sym.name.slice(slashIdx + 1)
      const nsEnv = getNamespaceEnv(env)
      const targetNs =
        nsEnv.ns?.aliases.get(nsPrefix) ?? ctx.resolveNs(nsPrefix) ?? null
      if (!targetNs) {
        throw new EvaluationError(
          `No such namespace: ${nsPrefix}`,
          { sym },
          getPos(sym)
        )
      }
      targetVar = targetNs.vars.get(localName)
    } else {
      targetVar = lookupVar(sym.name, env)
    }

    if (!targetVar) {
      throw new EvaluationError(
        `No var found for symbol '${sym.name}' in binding form`,
        { sym },
        getPos(sym)
      )
    }
    if (!targetVar.dynamic) {
      throw new EvaluationError(
        `Cannot use binding with non-dynamic var ${targetVar.ns}/${targetVar.name}. ` +
          `Mark it dynamic with (def ^:dynamic ${sym.name} ...)`,
        { sym },
        getPos(sym)
      )
    }

    targetVar.bindingStack ??= []
    targetVar.bindingStack.push(newVal)
    boundVars.push(targetVar)
  }

  return { body, boundVars }
}
