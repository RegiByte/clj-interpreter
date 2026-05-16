/**
 * Evaluator - Core entrypoint
 * Handles the evaluation of a single expression.
 * Delegates most of the work to domain handlers.
 * Uses the compiler to compile the expression to a closure when possible.
 * The interpreter is the source of truth for the semantics of the language.
 */

import { compile } from '../compiler'
import { derefValue, getNamespaceEnv, lookup } from '../env'
import { EvaluationError } from '../errors'
import { v } from '../factories'
import { valueKeywords } from '../keywords.ts'
import { getPos } from '../positions'
import type {
  CljValue,
  Env,
  EvalEvent,
  EvaluationContext,
  VmExecutionMode,
} from '../types'
import { tryCompileVm } from '../vm/compiler'
import { executeChunk } from '../vm/vm'
import { evaluateMap, evaluateSet, evaluateVector } from './collections'
import { evaluateList } from './dispatch'

export type EvaluationMeasurement = {
  result: CljValue
  durationMs: number
}

function nowMs(): number {
  if (typeof performance !== 'undefined') return performance.now()
  return Date.now()
}

function vmMode(ctx: EvaluationContext): VmExecutionMode {
  return ctx.vmExecutionMode ?? 'opportunistic'
}

function formKind(expr: CljValue): string {
  if (expr.kind === valueKeywords.list && expr.value.length > 0) {
    const head = expr.value[0]
    return head.kind === valueKeywords.symbol ? `list:${head.name}` : 'list'
  }
  return expr.kind
}

function emitEvalEvent(ctx: EvaluationContext, event: Omit<EvalEvent, 'mode'>): void {
  ctx.instrumentation?.onEvent({
    mode: vmMode(ctx),
    ...event,
  })
}

function evaluateTopLevelWithVm(
  expr: CljValue,
  env: Env,
  ctx: EvaluationContext,
  mode: VmExecutionMode
): CljValue | null {
  if (mode !== 'opportunistic' && mode !== 'vm-required') return null

  const result = tryCompileVm(expr)
  if (result.ok) {
    emitEvalEvent(ctx, {
      path: 'vm:top-level',
      formKind: formKind(expr),
      ast: expr,
    })
    return executeChunk({ chunk: result.chunk, env, ctx })
  }

  if (mode === 'vm-required') {
    emitEvalEvent(ctx, {
      path: 'fallback',
      reason: result.reason,
      formKind: formKind(expr),
      ast: expr,
    })
    throw new EvaluationError(
      `VM required but cannot compile: ${result.reason.detail}`,
      { reason: result.reason, expr, env },
      getPos(expr)
    )
  }

  emitEvalEvent(ctx, {
    path: 'fallback',
    reason: result.reason,
    formKind: formKind(expr),
    ast: expr,
  })
  return null
}

export function evaluateWithContext(
  expr: CljValue,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const depth = ctx.evaluationDepth ?? 0
  ctx.evaluationDepth = depth + 1
  try {
    const mode = vmMode(ctx)
    if (depth === 0) {
      const vmResult = evaluateTopLevelWithVm(expr, env, ctx, mode)
      if (vmResult !== null) return vmResult
    }

    return evaluateWithContextInner(expr, env, ctx, depth === 0)
  } finally {
    ctx.evaluationDepth = depth
  }
}

function evaluateWithContextInner(
  expr: CljValue,
  env: Env,
  ctx: EvaluationContext,
  shouldEmitPathEvent: boolean
): CljValue {
  const compiled = compile(expr)
  if (compiled !== null) {
    if (shouldEmitPathEvent) {
      emitEvalEvent(ctx, {
        path: 'closure-compiler',
        formKind: formKind(expr),
        ast: expr,
      })
    }
    return compiled(env, ctx)
  }
  if (shouldEmitPathEvent) {
    emitEvalEvent(ctx, {
      path: 'interpreter',
      formKind: formKind(expr),
      ast: expr,
    })
  }
  switch (expr.kind) {
    // self-evaluating forms
    case valueKeywords.number:
    case valueKeywords.string:
    case valueKeywords.character:
    case valueKeywords.keyword:
    case valueKeywords.nil:
    case valueKeywords.function:
    case valueKeywords.multiMethod:
    case valueKeywords.boolean:
    case valueKeywords.regex:
    case valueKeywords.delay:
    case valueKeywords.lazySeq:
    case valueKeywords.cons:
    case valueKeywords.namespace:
      return expr
    case valueKeywords.symbol: {
      const slashIdx = expr.name.indexOf('/')
      if (slashIdx > 0 && slashIdx < expr.name.length - 1) {
        const alias = expr.name.slice(0, slashIdx)
        const sym = expr.name.slice(slashIdx + 1)
        const nsEnv = getNamespaceEnv(env)
        // Resolve alias: local :as alias first, then full namespace name
        const targetNs =
          nsEnv.ns?.aliases.get(alias) ?? ctx.resolveNs(alias) ?? null
        if (!targetNs) {
          throw new EvaluationError(`No such namespace or alias: ${alias}`, {
            symbol: expr.name,
            env,
          }, getPos(expr))
        }
        const v = targetNs.vars.get(sym)
        if (v === undefined) {
          throw new EvaluationError(`Symbol ${expr.name} not found`, {
            symbol: expr.name,
            env,
          }, getPos(expr))
        }
        return derefValue(v)
      }
      try {
        return lookup(expr.name, env)
      } catch (e) {
        if (e instanceof EvaluationError && !e.pos) {
          const pos = getPos(expr)
          if (pos) e.pos = pos
        }
        throw e
      }
    }
    case valueKeywords.vector:
      return evaluateVector(expr, env, ctx)
    case valueKeywords.map:
      return evaluateMap(expr, env, ctx)
    case valueKeywords.set:
      return evaluateSet(expr, env, ctx)
    case valueKeywords.list:
      return evaluateList(expr, env, ctx)
    default:
      throw new EvaluationError('Unexpected value', { expr, env }, getPos(expr))
  }
}

export function evaluateFormsWithContext(
  forms: CljValue[],
  env: Env,
  ctx: EvaluationContext
): CljValue {
  let result: CljValue = v.nil()
  for (const form of forms) {
    result = ctx.evaluate(form, env)
  }
  return result
}

export function evaluateWithMeasurementsWithContext(
  expr: CljValue,
  env: Env,
  ctx: EvaluationContext
): EvaluationMeasurement {
  const start = nowMs()
  const result = ctx.evaluate(expr, env)
  const end = nowMs()
  return {
    result,
    durationMs: end - start,
  }
}
