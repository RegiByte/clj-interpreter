import { expect } from 'vitest'
import { define, makeEnv, makeNamespace } from '../../env'
import { createEvaluationContext } from '../../evaluator'
import { EvaluationError, isEvaluationError } from '../../errors'
import { v } from '../../factories'
import type {
  CljFunction,
  CljValue,
  Env,
  EvaluationContext,
} from '../../types'
import { makeChunk, addConstant, emit, emitOperand } from '../chunk'
import { Op } from '../opcodes'
import { executeChunk } from '../vm'

export function makeBytecodeFunction(
  chunk: ReturnType<typeof makeChunk>,
  params: string[],
  env: Env
): CljFunction {
  chunk.localCount = Math.max(chunk.localCount, params.length)
  return v.multiArityFunction(
    [
      {
        params: params.map((name) => v.symbol(name)),
        restParam: null,
        body: [],
        bytecodeBody: chunk,
      },
    ],
    env
  )
}

export function createNoDelegateContext(): EvaluationContext {
  const ctx = createEvaluationContext()
  ctx.applyCallable = () => {
    throw new Error('ctx.applyCallable should not run for bytecode calls')
  }
  return ctx
}

export function makeIntrinsicRuntime(name: string) {
  const op = v.nativeFn(name, () => v.nil())
  const env = makeEnv()
  const core = makeNamespace('clojure.core')
  define(name, op, env)
  core.vars.set(name, v.var('clojure.core', name, op))

  const ctx = createEvaluationContext()
  ctx.resolveNs = (nsName) => (nsName === 'clojure.core' ? core : null)

  return { env, ctx }
}

export function executeIntrinsicChunk(
  op: number,
  name: string,
  args: CljValue[]
): CljValue {
  const chunk = makeChunk('intrinsic-test')
  for (const arg of args) {
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, arg))
  }
  emit(chunk, op)
  emitOperand(chunk, args.length)
  emit(chunk, Op.Return)

  return executeChunk({ chunk, ...makeIntrinsicRuntime(name) })
}

export function expectEvaluationError(fn: () => unknown): EvaluationError {
  try {
    fn()
  } catch (error) {
    expect(isEvaluationError(error)).toBe(true)
    if (isEvaluationError(error)) return error
    throw error
  }
  throw new Error('Expected EvaluationError')
}

export function frameNames(error: EvaluationError): Array<string | null> {
  return (error.frames ?? []).map((frame) => frame.fnName)
}

export function printNumber(value: CljValue): string {
  return value.kind === 'number' ? String(value.value) : '?'
}
