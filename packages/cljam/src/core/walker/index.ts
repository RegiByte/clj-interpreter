/**
 * cljam AST walker (Phase 2) — the tree-walking engine over the analyzer IR.
 *
 * Active only under `vmExecutionMode: 'ast'`. Integration seams:
 *   - top-level: `evaluateTopLevelWithAst` in `evaluator/evaluate.ts`
 *     (allowlist-gated via `containsUnsupportedOp`, falls back whole-form)
 *   - fn bodies: `Arity.astMethod` run by `applyFunctionWithContext`
 *     (attached by the walker's `:fn` op, or by `tryAttachAstFnBody` for
 *     form-walker-created fns)
 *
 * Progress + continuation notes: .regibyte/references/PHASE2_WALKER_TRACKER.md
 */

export { makeFrame, type EvalFrame } from './frame'
export { containsUnsupportedOp, SUPPORTED_OPS } from './supported'
export { walkNode } from './walk'
export { tryAttachAstFnBody } from './fn-body'
