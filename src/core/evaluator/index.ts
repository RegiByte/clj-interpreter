import {
  type CljFunction,
  type CljMacro,
  type CljNativeFunction,
  type CljValue,
  type Env,
  type EvaluationContext,
} from '../types.ts'
import { applyFunctionWithContext, applyMacroWithContext } from './apply.ts'
import { evaluateFormsWithContext, evaluateWithContext } from './evaluate.ts'

// Forward to external consumers
export { RecurSignal } from './arity.ts'

function createEvaluationContext(): EvaluationContext {
  const ctx = {
    evaluate: (expr: CljValue, env: Env) => evaluateWithContext(expr, env, ctx),
    evaluateForms: (forms: CljValue[], env: Env) =>
      evaluateFormsWithContext(forms, env, ctx),
    applyFunction: (fn: CljFunction | CljNativeFunction, args: CljValue[]) =>
      applyFunctionWithContext(fn, args, ctx),
    applyMacro: (macro: CljMacro, rawArgs: CljValue[]) =>
      applyMacroWithContext(macro, rawArgs, ctx),
  }
  return ctx
}

/** Public API, this is the only place where we create a new evaluation context
 * All inner evaluations will use the same context
 */
export function applyFunction(
  fn: CljFunction | CljNativeFunction,
  args: CljValue[]
): CljValue {
  return createEvaluationContext().applyFunction(fn, args)
}
export function applyMacro(macro: CljMacro, rawArgs: CljValue[]): CljValue {
  return createEvaluationContext().applyMacro(macro, rawArgs)
}
export function evaluate(expr: CljValue, env: Env): CljValue {
  return createEvaluationContext().evaluate(expr, env)
}
export function evaluateForms(forms: CljValue[], env: Env): CljValue {
  return createEvaluationContext().evaluateForms(forms, env)
}
