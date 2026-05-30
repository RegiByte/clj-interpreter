/**
 * cljam analyzer — public entry point (Phase 0, standalone).
 *
 * `analyzeForm` builds a root analysis env from the live runtime env, runs the
 * resolve pass (which macroexpands as it descends and computes captures), then
 * the context pass (tail/statement/expr + recur validation). Returns the AST
 * node plus any validation errors.
 *
 * The analyzer is plugged into no execution path. It only reads from the live
 * Var space (via `ctx`/`cljEnv`) for macroexpansion and resolution — which is
 * exactly the single-runtime bootstrapping property that makes this safe.
 */

import { getNamespaceEnv } from '../env'
import type { CljValue, Env, EvaluationContext } from '../types'
import { astToClj } from './ast-to-clj'
import { type Context, makeRootEnv } from './env'
import { markContext } from './context'
import type { AstNode } from './nodes'
import { printAst } from './print'
import { analyze } from './resolve'

export type AnalyzeResult = {
  node: AstNode
  errors: string[]
}

export function analyzeForm(
  form: CljValue,
  cljEnv: Env,
  ctx: EvaluationContext,
  context: Context = 'expr'
): AnalyzeResult {
  const nsEnv = getNamespaceEnv(cljEnv)
  const ns = nsEnv.ns ?? null
  const nsName = ns?.name ?? 'user'
  const env = makeRootEnv(nsName, ns)
  const node = analyze(form, env, cljEnv, ctx)
  const { errors } = markContext(node, context)
  return { node, errors }
}

/** Human-readable line view (the `analyze*` surface). Errors are appended. */
export function analyzeToLines(
  form: CljValue,
  cljEnv: Env,
  ctx: EvaluationContext
): string[] {
  const { node, errors } = analyzeForm(form, cljEnv, ctx)
  const lines = printAst(node)
  for (const e of errors) lines.push(`; error: ${e}`)
  return lines
}

/** Faithful data view (the `ast*` surface). */
export function analyzeToClj(
  form: CljValue,
  cljEnv: Env,
  ctx: EvaluationContext
): CljValue {
  const { node } = analyzeForm(form, cljEnv, ctx)
  return astToClj(node)
}

export { astToClj } from './ast-to-clj'
export { printAst } from './print'
export type { AstNode } from './nodes'
