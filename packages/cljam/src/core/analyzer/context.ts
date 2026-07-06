/**
 * cljam analyzer — context (tail-position) pass.
 *
 * A second, single-purpose pass over the resolved tree. It stamps each node's
 * `env.context` with one of `statement` / `expr` / `return` (the superset of a
 * boolean `tail?`), and validates that every `recur` sits in `return` position
 * with an argument count matching its resolved loop/fn target.
 *
 * Why a separate pass (rather than threading context during resolve): keeps the
 * resolve pass focused purely on names + captures, and keeps this rule readable
 * in isolation. Per the design discussion, we can fold it back into resolve only
 * if analysis performance ever demands it.
 *
 * Context propagation rules:
 *   - subexpressions whose value is consumed -> `expr`
 *   - non-final statements of a body -> `statement`
 *   - the value-producing tail of a construct inherits the construct's context
 *   - every fn-method body is `return` (function bodies are tail)
 *   - finally bodies are `statement` (their value is discarded)
 */

import { getPos } from '../positions'
import type { AnalysisError, AnalysisErrorCode, Context } from './env'
import type { AstNode } from './nodes'

/**
 * Stamps tail/statement/expr context and validates `recur`, pushing any problems
 * into the shared `errors` sink (the same channel the resolve pass uses).
 */
export function markContext(
  root: AstNode,
  errors: AnalysisError[],
  context: Context = 'expr'
): void {
  walk(root, context, errors)
}

function recordError(
  node: AstNode,
  message: string,
  code: AnalysisErrorCode
): AnalysisError {
  return {
    message,
    form: node.form,
    pos: node.pos ?? getPos(node.form) ?? null,
    kind: 'malformed',
    code,
  }
}

function setCtx(node: AstNode, context: Context): void {
  // Replace (not mutate) so siblings that shared an env by reference during
  // resolve keep their own context.
  node.env = { ...node.env, context }
}

function walk(node: AstNode, context: Context, errors: AnalysisError[]): void {
  setCtx(node, context)

  switch (node.op) {
    case 'const':
    case 'local':
    case 'var':
    case 'the-var':
    case 'js-var':
    case 'ns':
    case 'invalid':
      return

    case 'quote':
      walk(node.expr, 'expr', errors)
      return

    case 'vector':
    case 'set':
      for (const item of node.items) walk(item, 'expr', errors)
      return

    case 'map':
      for (const k of node.keys) walk(k, 'expr', errors)
      for (const val of node.vals) walk(val, 'expr', errors)
      return

    case 'invoke':
      walk(node.fn, 'expr', errors)
      for (const a of node.args) walk(a, 'expr', errors)
      return

    case 'if':
      walk(node.test, 'expr', errors)
      walk(node.then, context, errors)
      walk(node.else, context, errors)
      return

    case 'do':
      for (const s of node.statements) walk(s, 'statement', errors)
      walk(node.ret, context, errors)
      return

    case 'let':
    case 'letfn':
      for (const b of node.bindings) walk(b, 'expr', errors)
      walk(node.body, context, errors)
      return

    case 'loop':
      for (const b of node.bindings) walk(b, 'expr', errors)
      // A loop establishes a fresh recur target, so its body is tail.
      walk(node.body, 'return', errors)
      return

    case 'fn':
      for (const m of node.methods) walk(m, context, errors)
      return

    case 'async':
      walk(node.method, context, errors)
      return

    case 'fn-method':
      for (const p of node.params) walk(p, 'expr', errors)
      if (node.self !== null) walk(node.self, 'expr', errors)
      walk(node.body, 'return', errors)
      return

    case 'binding':
      if (node.init !== null) walk(node.init, 'expr', errors)
      return

    case 'recur':
      if (node.targetKind === null) {
        errors.push(
          recordError(
            node,
            'recur called outside of loop or fn',
            'malformed/recur-outside'
          )
        )
      } else if (context !== 'return') {
        errors.push(
          recordError(
            node,
            'Can only recur from tail position',
            'malformed/recur-tail'
          )
        )
      } else if (node.targetArity !== null) {
        // Variadic targets accept the fixed args plus one rest collection.
        const target = node.env.recur
        const expected =
          target && target.variadic ? node.targetArity + 1 : node.targetArity
        if (node.exprs.length !== expected) {
          errors.push(
            recordError(
              node,
              `recur expects ${expected} arguments but got ${node.exprs.length}`,
              'malformed/recur-arity'
            )
          )
        }
      }
      for (const e of node.exprs) walk(e, 'expr', errors)
      return

    case 'throw':
      walk(node.exception, 'expr', errors)
      return

    case 'try':
      walk(node.body, context, errors)
      for (const c of node.catches) walk(c, context, errors)
      if (node.finallyBody !== null) walk(node.finallyBody, 'statement', errors)
      return

    case 'catch':
      if (node.discriminator !== null) walk(node.discriminator, 'expr', errors)
      walk(node.local, 'expr', errors)
      walk(node.body, context, errors)
      return

    case 'def':
      if (node.metaNode !== null) walk(node.metaNode, 'expr', errors)
      if (node.init !== null) walk(node.init, 'expr', errors)
      return

    case 'dynamic':
      for (const vnode of node.bindingVars) {
        if (vnode !== null) walk(vnode, 'expr', errors)
      }
      for (const init of node.inits) walk(init, 'expr', errors)
      walk(node.body, context, errors)
      return

    case 'host-call':
      walk(node.target, 'expr', errors)
      for (const a of node.args) walk(a, 'expr', errors)
      return

    case 'host-field':
      walk(node.target, 'expr', errors)
      return

    case 'new':
      walk(node.className, 'expr', errors)
      for (const a of node.args) walk(a, 'expr', errors)
      return

    case 'set!':
      walk(node.target, 'expr', errors)
      walk(node.val, 'expr', errors)
      return
  }
}
