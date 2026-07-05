/**
 * The fn-body seam: attaches an AST body to an `Arity` so the apply hub can
 * run it on the walker. This is the exact analogue of `tryCompileVmFnBodyFromIr`
 * + `arity.bytecodeBody` for the VM — it exists for fns created by the
 * FORM-walker in 'ast' mode (i.e. inside top-level forms that fell back), so
 * their bodies still execute on the walker. Fns created by the walker's own
 * `:fn` op get their `astMethod` attached directly and never come through here.
 *
 * Gated by the same top-level-env condition as the VM seam
 * (`canCompileVmFnBodyInEnv` at the call site): a fn under form-walker locals
 * would need captures the analyzer cannot see from a root env.
 */

import { analyzeForm } from '../analyzer'
import { EvaluationError } from '../errors'
import { getPos } from '../positions'
import type { Arity, Env, EvaluationContext } from '../types'
import {
  compileResultForAnalysisErrors,
  synthFnStar,
} from '../vm/ir-compiler'
import { containsUnsupportedOp } from './supported'

/**
 * Analyzes one arity as a synthetic `(fn* ...)` and attaches
 * `astMethod`/`astSlotCount`/`astUpvalues` when the whole body is walkable.
 * Returns true when attached. Ported-malformed analyzer errors THROW (the
 * analyzer is the authority — mirrors the VM seam's fatal path in
 * `evaluateFnStar`); anything else quietly leaves the arity on the
 * interpreter path.
 */
export function tryAttachAstFnBody(
  arity: Arity,
  selfName: string | null,
  env: Env,
  ctx: EvaluationContext
): boolean {
  const fnForm = synthFnStar(arity.params, arity.restParam, arity.body, selfName)
  let analysis: ReturnType<typeof analyzeForm>
  try {
    analysis = analyzeForm(fnForm, env, ctx)
  } catch {
    // Mirror the VM compilers' safety net: an analyzer throw on a wild form
    // becomes a clean fallback, never a crashed eval.
    return false
  }

  if (analysis.errors.length > 0) {
    const result = compileResultForAnalysisErrors(analysis.errors)
    if (result.ok === false && result.fatal === true) {
      const err = new EvaluationError(
        result.reason.detail,
        { reason: result.reason, list: fnForm, env, analysisError: result.analysisError },
        result.analysisError?.pos ?? getPos(fnForm)
      )
      if (result.analysisError?.code !== undefined) {
        err.code = result.analysisError.code
      }
      throw err
    }
    return false
  }

  const node = analysis.node
  if (node.op !== 'fn' || node.methods.length !== 1) return false
  // A namespace-root fn cannot capture; anything else means the gate at the
  // call site was violated — refuse rather than run with empty upvalues.
  if (node.captures.length > 0) return false

  const method = node.methods[0]
  if (containsUnsupportedOp(method.body) !== null) return false

  arity.astMethod = method
  arity.astSlotCount = method.namedSlotCount
  arity.astUpvalues = []
  return true
}
