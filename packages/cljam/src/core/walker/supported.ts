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

import type { AstNode, InvokeNode } from '../analyzer/nodes'
import { is } from '../assertions'
import { specialFormKeywords } from '../keywords.ts'

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
])

// Every analyzer op is walked except the permanent exclusions: 'invalid'
// (analysis errors are classified fatal-or-fallback before walking) and
// invokes of `ns` (form-walker-owned, mirroring the VM's
// `unsupportedVmSpecialForms`). `async` walks since Phase 3 — the sync `:async`
// entry hands the body to `walkNodeAsync` (walk-async.ts).

const formWalkerOwnedHeads = new Set<string>([
  specialFormKeywords['ns'],
])

function unsupportedInvokeHead(node: InvokeNode): string | null {
  const form = node.form
  if (!is.list(form) || form.value.length === 0) return null
  const head = form.value[0]
  if (!is.symbol(head) || !formWalkerOwnedHeads.has(head.name)) return null
  return `invoke:${head.name}`
}

/**
 * Returns the first op (or op-qualifier like `invoke:async`) the walker
 * cannot execute, or null when the whole tree is walkable. The generic
 * descent is driven by `node.children` — the analyzer's contract is that every
 * walkable child is listed there, in evaluation order.
 */
export function containsUnsupportedOp(node: AstNode): string | null {
  if (!SUPPORTED_OPS.has(node.op)) return node.op
  if (node.op === 'invoke') {
    const headReason = unsupportedInvokeHead(node)
    if (headReason !== null) return headReason
  }

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
