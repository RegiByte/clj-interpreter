/**
 * cljam AST walker — THE tree-walking engine over the analyzer IR.
 *
 * Integration seams:
 *   - top-level: `evaluateWithAst` in `evaluator/evaluate.ts` (runs after the
 *     per-mode VM attempt; analysis errors are fatal — no fallback engine)
 *   - fn bodies: `Arity.astMethod` run by `applyFunctionWithContext`
 *     (attached by the walker's `:fn` op; `bytecodeBody` attached per VM mode)
 *
 * History + design notes: .regibyte/references/PHASE2_WALKER_TRACKER.md
 */

export { makeFrame, type EvalFrame } from './frame'
export { containsUnsupportedOp, SUPPORTED_OPS } from './supported'
export { walkNode } from './walk'
