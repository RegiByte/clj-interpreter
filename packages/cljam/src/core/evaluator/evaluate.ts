/**
 * Evaluator - Core entrypoint
 * Handles the evaluation of a single expression.
 * Delegates most of the work to domain handlers.
 * Uses the VM at top-level when possible, then falls back to the interpreter.
 * The interpreter is the source of truth for the semantics of the language.
 */

import { derefValue, getNamespaceEnv, lookup } from '../env'
import { EvaluationError } from '../errors'
import { v } from '../factories'
import { valueKeywords } from '../keywords.ts'
import { getPos } from '../positions'
import { measureSync } from '../timing'
import type {
  CljSymbol,
  CljValue,
  Env,
  EvalEvent,
  EvaluationContext,
  VmCompileResult,
  VmExecutionMode,
  VmFallbackReason,
} from '../types'
import { analyzeForm } from '../analyzer'
import {
  compileResultForAnalysisErrors,
  tryCompileVmFromIr,
} from '../vm/ir-compiler'
import { assignChunkIds } from '../vm/chunk'
import { executeChunk } from '../vm/vm'
import { makeTopLevelVmCacheKey } from '../vm/cache'
import { containsUnsupportedOp, makeFrame, walkNode } from '../walker'
import { evaluateMap, evaluateSet, evaluateVector } from './collections'
import { evaluateList } from './dispatch'
import { resolveJsDotChainSymbol } from './js-interop'

export type EvaluationMeasurement = {
  result: CljValue
  durationMs: number
}

/**
 * The engine a session runs on when the caller doesn't pick one: the AST
 * walker (Phase 2). Resolved into every context at construction
 * (`createEvaluationContext`) and at the session facade, so the direct
 * `ctx.vmExecutionMode === 'ast'` reads in apply.ts/special-forms.ts always
 * see a concrete mode.
 */
export const DEFAULT_VM_EXECUTION_MODE: VmExecutionMode = 'ast'

function vmMode(ctx: EvaluationContext): VmExecutionMode {
  return ctx.vmExecutionMode ?? DEFAULT_VM_EXECUTION_MODE
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

function recordMeasurementStage(
  ctx: EvaluationContext,
  stage: string,
  elapsedMs: number,
  extra?: {
    path?: EvalEvent['path']
    reason?: EvalEvent['reason']
  }
): void {
  ctx.measurement?.recordStage({ stage, elapsedMs, ...extra })
}

function throwFatalVmCompileError(
  result: Extract<VmCompileResult, { ok: false }>,
  expr: CljValue,
  env: Env
): never {
  const err = new EvaluationError(
    result.reason.detail,
    { reason: result.reason, expr, env, analysisError: result.analysisError },
    result.analysisError?.pos ?? getPos(expr)
  )
  if (result.analysisError?.code !== undefined) {
    err.code = result.analysisError.code
  }
  throw err
}

function evaluateTopLevelWithVm(
  expr: CljValue,
  env: Env,
  ctx: EvaluationContext,
  mode: VmExecutionMode
): CljValue | null {
  if (mode !== 'opportunistic' && mode !== 'vm-required') return null

  const cacheKey =
    env.ns?.id === undefined
      ? null
      : makeTopLevelVmCacheKey({
          namespaceId: env.ns.id,
          namespaceVersion: env.ns.version,
          mode,
          form: expr,
        })
  const cachedChunk =
    cacheKey === null ? undefined : ctx.getCachedTopLevelVmChunk?.(cacheKey)
  if (cachedChunk !== undefined) {
    recordMeasurementStage(ctx, ':vm/cache-hit', 0, {
      path: 'vm:top-level',
    })
    emitEvalEvent(ctx, {
      path: 'vm:top-level',
      formKind: formKind(expr),
      ast: expr,
      details: {
        cache: 'hit',
        evalId: ctx.currentEvalIdentity?.id,
        chunkId: cachedChunk.id,
      },
    })
    if (ctx.measurement === undefined) {
      return executeChunk({ chunk: cachedChunk, env, ctx })
    }
    ctx.measurement.setPath('vm:top-level')
    const { value, elapsedMs } = measureSync(() =>
      executeChunk({ chunk: cachedChunk, env, ctx })
    )
    recordMeasurementStage(ctx, ':vm/execute', elapsedMs, {
      path: 'vm:top-level',
    })
    return value
  }

  const compileMeasurement =
    ctx.measurement === undefined
      ? null
      : measureSync(() => tryCompileVmFromIr(expr, env, ctx))
  const result = compileMeasurement?.value ?? tryCompileVmFromIr(expr, env, ctx)
  if (compileMeasurement !== null) {
    recordMeasurementStage(ctx, ':vm/compile', compileMeasurement.elapsedMs)
  }
  if (result.ok) {
    assignChunkIds(result.chunk, ctx)
    if (cacheKey !== null) ctx.setCachedTopLevelVmChunk?.(cacheKey, result.chunk)
    emitEvalEvent(ctx, {
      path: 'vm:top-level',
      formKind: formKind(expr),
      ast: expr,
      details: {
        cache: cacheKey === null ? 'uncacheable' : 'miss',
        evalId: ctx.currentEvalIdentity?.id,
        chunkId: result.chunk.id,
      },
    })
    if (ctx.measurement === undefined) {
      return executeChunk({ chunk: result.chunk, env, ctx })
    }
    ctx.measurement.setPath('vm:top-level')
    const { value, elapsedMs } = measureSync(() =>
      executeChunk({ chunk: result.chunk, env, ctx })
    )
    recordMeasurementStage(ctx, ':vm/execute', elapsedMs, {
      path: 'vm:top-level',
    })
    return value
  }

  if (result.fatal === true) {
    emitEvalEvent(ctx, {
      path: 'analyzer-error',
      reason: result.reason,
      formKind: formKind(expr),
      ast: expr,
    })
    throwFatalVmCompileError(result, expr, env)
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
  recordMeasurementStage(ctx, ':fallback', 0, {
    path: 'fallback',
    reason: result.reason,
  })
  return null
}

/**
 * Top-level AST-walker attempt (mode 'ast') — the walker analogue of
 * `evaluateTopLevelWithVm`, in the same additive-path shape: analyze, classify
 * errors (ported-malformed = fatal throw, the analyzer is the authority),
 * pre-scan the whole tree against the walker's allowlist, and only then walk.
 * Returns null to fall back to the form-walker for the WHOLE form — never
 * mid-form, so a coverage gap can't cause partial side effects.
 */
function evaluateTopLevelWithAst(
  expr: CljValue,
  env: Env,
  ctx: EvaluationContext
): CljValue | null {
  let analysis: ReturnType<typeof analyzeForm>
  try {
    const measuredAnalysis =
      ctx.measurement === undefined
        ? null
        : measureSync(() => analyzeForm(expr, env, ctx))
    analysis = measuredAnalysis?.value ?? analyzeForm(expr, env, ctx)
    if (measuredAnalysis !== null) {
      recordMeasurementStage(ctx, ':ast/analyze', measuredAnalysis.elapsedMs)
    }
  } catch (error) {
    const reason: VmFallbackReason = {
      category: 'compile-error',
      detail: error instanceof Error ? error.message : String(error),
    }
    emitEvalEvent(ctx, {
      path: 'fallback',
      reason,
      formKind: formKind(expr),
      ast: expr,
    })
    recordMeasurementStage(ctx, ':fallback', 0, { path: 'fallback', reason })
    return null
  }

  if (analysis.errors.length > 0) {
    const result = compileResultForAnalysisErrors(analysis.errors)
    if (result.ok) return null
    if (result.fatal === true) {
      emitEvalEvent(ctx, {
        path: 'analyzer-error',
        reason: result.reason,
        formKind: formKind(expr),
        ast: expr,
      })
      throwFatalVmCompileError(result, expr, env)
    }
    emitEvalEvent(ctx, {
      path: 'fallback',
      reason: result.reason,
      formKind: formKind(expr),
      ast: expr,
    })
    recordMeasurementStage(ctx, ':fallback', 0, {
      path: 'fallback',
      reason: result.reason,
    })
    return null
  }

  const unsupportedOp = containsUnsupportedOp(analysis.node)
  if (unsupportedOp !== null) {
    const reason: VmFallbackReason = {
      category: 'unsupported-special-form',
      detail: `ast-walker: no walker for op '${unsupportedOp}'`,
    }
    emitEvalEvent(ctx, {
      path: 'fallback',
      reason,
      formKind: formKind(expr),
      ast: expr,
    })
    recordMeasurementStage(ctx, ':fallback', 0, { path: 'fallback', reason })
    return null
  }

  emitEvalEvent(ctx, {
    path: 'ast:top-level',
    formKind: formKind(expr),
    ast: expr,
  })
  const frame = makeFrame(analysis.namedSlotCount)
  if (ctx.measurement === undefined) {
    return walkNode(analysis.node, frame, env, ctx)
  }
  ctx.measurement.setPath('ast:top-level')
  const { value, elapsedMs } = measureSync(() =>
    walkNode(analysis.node, frame, env, ctx)
  )
  recordMeasurementStage(ctx, ':ast/walk', elapsedMs, {
    path: 'ast:top-level',
  })
  return value
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
      if (mode === 'ast') {
        const astResult = evaluateTopLevelWithAst(expr, env, ctx)
        if (astResult !== null) return astResult
      }
    }

    return evaluateWithContextInner(expr, env, ctx, depth === 0)
  } finally {
    ctx.evaluationDepth = depth
  }
}

/**
 * The interpreter's symbol resolution: qualified names via :as aliases or full
 * namespace names (with js dot-chain segments), unqualified names via the
 * Env-chain `lookup`. Exposed as `ctx.evaluateSymbol` so the AST walker's
 * `:var`/`:js-var` ops resolve Vars through the EXACT same logic without
 * paying the full `evaluateWithContext` round-trip per reference (depth
 * bookkeeping, mode dispatch, kind switch).
 */
export function evaluateSymbolWithContext(
  expr: CljSymbol,
  env: Env,
  ctx: EvaluationContext
): CljValue {
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
    if (sym.includes('.')) {
      const segments = sym.split('.')
      const root = targetNs.vars.get(segments[0])
      if (root === undefined) {
        throw new EvaluationError(`Symbol ${alias}/${segments[0]} not found`, {
          symbol: expr.name,
          env,
        }, getPos(expr))
      }
      return resolveJsDotChainSymbol(
        derefValue(root),
        expr,
        segments.slice(1)
      )
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

function evaluateWithContextInner(
  expr: CljValue,
  env: Env,
  ctx: EvaluationContext,
  shouldEmitPathEvent: boolean
): CljValue {
  if (shouldEmitPathEvent) {
    emitEvalEvent(ctx, {
      path: 'interpreter',
      formKind: formKind(expr),
      ast: expr,
    })
    ctx.measurement?.setPath('interpreter')
  }
  const evaluateInterpreted = (): CljValue => {
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
    case valueKeywords.symbol:
      return evaluateSymbolWithContext(expr, env, ctx)
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
  if (!shouldEmitPathEvent || !ctx.measurement) return evaluateInterpreted()
  const { value, elapsedMs } = measureSync(evaluateInterpreted)
  recordMeasurementStage(ctx, ':interpreter', elapsedMs, {
    path: 'interpreter',
  })
  return value
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
  const { value: result, elapsedMs } = measureSync(() => ctx.evaluate(expr, env))
  return {
    result,
    durationMs: elapsedMs,
  }
}
