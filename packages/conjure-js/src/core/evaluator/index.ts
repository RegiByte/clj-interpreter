import {
  type CljFunction,
  type CljMacro,
  type CljNativeFunction,
  type CljValue,
  type Env,
  type EvaluationContext,
} from '../types.ts'
import { makeEnv } from '../env.ts'
import {
  applyCallableWithContext,
  applyFunctionWithContext,
  applyMacroWithContext,
} from './apply.ts'
import { macroExpandAllWithContext } from './expand.ts'
import {
  type EvaluationMeasurement,
  evaluateFormsWithContext,
  evaluateWithContext,
  evaluateWithMeasurementsWithContext,
} from './evaluate.ts'

// Forward to external consumers
export { RecurSignal } from './arity.ts'

export function createEvaluationContext(): EvaluationContext {
  const ctx = {
    evaluate: (expr: CljValue, env: Env) => evaluateWithContext(expr, env, ctx),
    evaluateForms: (forms: CljValue[], env: Env) =>
      evaluateFormsWithContext(forms, env, ctx),
    applyFunction: (
      fn: CljFunction | CljNativeFunction,
      args: CljValue[],
      callEnv: Env
    ) => applyFunctionWithContext(fn, args, ctx, callEnv),
    applyCallable: (fn: CljValue, args: CljValue[], callEnv: Env) =>
      applyCallableWithContext(fn, args, ctx, callEnv),
    applyMacro: (macro: CljMacro, rawArgs: CljValue[]) =>
      applyMacroWithContext(macro, rawArgs, ctx),
    expandAll: (form: CljValue, env: Env) =>
      macroExpandAllWithContext(form, env, ctx),
    resolveNs: (_name: string) => null as null,
    // IO defaults — overwritten by buildSessionFacade with session-specific channels.
    io: {
      stdout: (text: string) => console.log(text),
      stderr: (text: string) => console.error(text),
    },
  }
  return ctx
}

/** Public API, this is the only place where we create a new evaluation context
 * All inner evaluations will use the same context
 */
export function applyFunction(
  fn: CljFunction | CljNativeFunction,
  args: CljValue[],
  callEnv: Env = makeEnv()
): CljValue {
  return createEvaluationContext().applyFunction(fn, args, callEnv)
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

export function evaluateWithMeasurements(
  expr: CljValue,
  env: Env,
  ctx: EvaluationContext = createEvaluationContext()
): EvaluationMeasurement {
  return evaluateWithMeasurementsWithContext(expr, env, ctx)
}
