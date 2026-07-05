/**
 * Shared dynamic-var logic for (binding [...] body) and (set! sym val).
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
 * The per-step helpers (`bindingPairsOrThrow`, `bindingSymbolOrThrow`,
 * `resolveDynamicBindingVar`, `resolveSetTargetVar`) are exported for the AST
 * walker, whose init expressions are resolved nodes walked against a slot
 * frame — it cannot reuse `setupBindingVars` wholesale, but the structural
 * checks and var resolution (and their exact error messages) must not drift.
 *
 * This file has no imports from the evaluator layer, so it is safe to import
 * from special-forms.ts, async-evaluator.ts, and the walker without cycles.
 */

import { is } from '../assertions'
import { getNamespaceEnv, lookupVar } from '../env'
import { EvaluationError } from '../errors'
import { getPos } from '../positions'
import type {
  CljList,
  CljSymbol,
  CljValue,
  CljVar,
  Env,
  EvaluationContext,
} from '../types'

export type BindingSetup = {
  body: CljValue[]
  boundVars: CljVar[]
}

/** Validates the (binding [...]) vector shape and returns its raw pair items. */
export function bindingPairsOrThrow(list: CljList, env: Env): CljValue[] {
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
  return bindings.value
}

export function bindingSymbolOrThrow(
  sym: CljValue,
  list: CljList
): CljSymbol {
  if (!is.symbol(sym)) {
    throw new EvaluationError(
      'binding left-hand side must be a symbol',
      { sym },
      getPos(sym) ?? getPos(list)
    )
  }
  return sym
}

/**
 * Resolves a (binding ...) target symbol to its Var — unqualified (*my-var*)
 * or qualified (my.ns/*my-var*) — and validates that it is ^:dynamic.
 */
export function resolveDynamicBindingVar(
  sym: CljSymbol,
  env: Env,
  ctx: EvaluationContext
): CljVar {
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
  return targetVar
}

/**
 * Resolves a (set! sym val) target symbol to its Var and validates that it is
 * ^:dynamic with an active binding. set! only rebinds the innermost binding
 * frame — it never touches a Var's root value.
 */
export function resolveSetTargetVar(symForm: CljSymbol, env: Env): CljVar {
  const targetVar = lookupVar(symForm.name, env)
  if (!targetVar) {
    throw new EvaluationError(
      `Unable to resolve var: ${symForm.name} in this context`,
      { symForm, env },
      getPos(symForm)
    )
  }
  if (!targetVar.dynamic) {
    throw new EvaluationError(
      `Cannot set! non-dynamic var ${targetVar.ns}/${targetVar.name}. Mark it with ^:dynamic.`,
      { symForm, env },
      getPos(symForm)
    )
  }
  if (!targetVar.bindingStack || targetVar.bindingStack.length === 0) {
    throw new EvaluationError(
      `Cannot set! ${targetVar.ns}/${targetVar.name} — no active binding. Use set! only inside a (binding [...] ...) form.`,
      { symForm, env },
      getPos(symForm)
    )
  }
  return targetVar
}

export function setupBindingVars(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): BindingSetup {
  const pairs = bindingPairsOrThrow(list, env)
  const body = list.value.slice(2)
  const boundVars: CljVar[] = []

  try {
    for (let i = 0; i < pairs.length; i += 2) {
      const sym = bindingSymbolOrThrow(pairs[i], list)
      const newVal = ctx.evaluate(pairs[i + 1], env)
      const targetVar = resolveDynamicBindingVar(sym, env, ctx)
      targetVar.bindingStack ??= []
      targetVar.bindingStack.push(newVal)
      boundVars.push(targetVar)
    }
  } catch (e) {
    for (let i = boundVars.length - 1; i >= 0; i--) {
      boundVars[i].bindingStack!.pop()
    }
    throw e
  }

  return { body, boundVars }
}
