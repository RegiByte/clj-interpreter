/**
 * Shared dynamic-var logic for (binding [...] body) and (set! sym val).
 *
 * The per-step helpers (`bindingPairsOrThrow`, `bindingSymbolOrThrow`,
 * `resolveDynamicBindingVar`, `resolveSetTargetVar`) are what the AST walker
 * composes: its init expressions are resolved nodes walked against a slot
 * frame, so the caller owns eval order and the exception-safe POP phase,
 * while the structural checks and var resolution (and their exact error
 * messages) live here and cannot drift.
 *
 * This file has no imports from the evaluator layer, so it is safe to import
 * from the walker without cycles.
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

/**
 * Resolves a (var sym) target symbol to its Var — unqualified via the Env
 * chain, or qualified through :as aliases / full namespace names. Shared by
 * the form walker's `var` special form and the AST walker's `walkTheVar`
 * namespace fallback so resolution logic and error messages cannot drift.
 */
export function resolveTheVarBySymbol(
  sym: CljSymbol,
  env: Env,
  ctx: EvaluationContext
): CljVar {
  const slashIdx = sym.name.indexOf('/')
  if (slashIdx > 0 && slashIdx < sym.name.length - 1) {
    const alias = sym.name.slice(0, slashIdx)
    const localName = sym.name.slice(slashIdx + 1)
    const nsEnv = getNamespaceEnv(env)
    // Resolve alias: local :as alias first, then full namespace name
    const targetNs =
      nsEnv.ns?.aliases.get(alias) ?? ctx.resolveNs(alias) ?? null
    if (!targetNs) {
      throw new EvaluationError(
        `No such namespace: ${alias}`,
        { sym },
        getPos(sym)
      )
    }
    const targetVar = targetNs.vars.get(localName)
    if (!targetVar) {
      throw new EvaluationError(
        `Var ${sym.name} not found`,
        { sym },
        getPos(sym)
      )
    }
    return targetVar
  }

  const targetVar = lookupVar(sym.name, env)
  if (!targetVar) {
    throw new EvaluationError(
      `Unable to resolve var: ${sym.name} in this context`,
      { sym },
      getPos(sym)
    )
  }
  return targetVar
}

