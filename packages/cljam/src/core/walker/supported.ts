/**
 * The walker's op allowlist + the whole-form pre-scan.
 *
 * Fallback discipline: the form-walker speaks Env chains, the AST walker speaks
 * slot frames — a mixed walk cannot resolve locals across the boundary. So a
 * form either runs ENTIRELY on the walker or falls back ENTIRELY to the
 * form-walker. `containsUnsupportedOp` is the cheap structural pre-scan that
 * decides this BEFORE any execution (no partial side effects, no
 * attempt-and-catch). Both this scan and `walkNode`'s switch are driven by
 * `SUPPORTED_OPS` so they cannot drift.
 *
 * Phase 2 exit criterion: this set covers every op the analyzer outputs (minus
 * the permanent exclusions below) and the fallback path goes dead.
 */

import type { AstNode } from '../analyzer/nodes'

export const SUPPORTED_OPS: ReadonlySet<string> = new Set([
  'const',
  'quote',
  'vector',
  'map',
  'set',
  'local',
  'var',
  'js-var',
  'the-var',
  'if',
  'do',
  'invoke',
  'let',
  'binding',
  'fn',
  'fn-method',
  'letfn',
  'loop',
  'recur',
  'throw',
  'try',
  'catch',
  'def',
  'dynamic',
  'set!',
  'host-call',
  'host-field',
  'new',
  'async',
  'ns',
])

// Every analyzer op is walked except the one permanent exclusion: 'invalid'
// (analysis errors are classified fatal-or-fallback before walking). `async`
// walks since Phase 3 — the sync `:async` entry hands the body to
// `walkNodeAsync` (walk-async.ts). `ns` walks since Phase 4 S1 — the last
// form-walker-owned head is gone.

/**
 * Returns the first op the walker cannot execute, or null when the whole tree
 * is walkable. The generic descent is driven by `node.children` — the
 * analyzer's contract is that every walkable child is listed there, in
 * evaluation order.
 */
export function containsUnsupportedOp(node: AstNode): string | null {
  if (!SUPPORTED_OPS.has(node.op)) return node.op

  for (const field of node.children) {
    const child = (node as unknown as Record<string, unknown>)[field]
    if (child == null) continue
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item == null) continue
        const reason = containsUnsupportedOp(item as AstNode)
        if (reason !== null) return reason
      }
    } else {
      const reason = containsUnsupportedOp(child as AstNode)
      if (reason !== null) return reason
    }
  }
  return null
}
