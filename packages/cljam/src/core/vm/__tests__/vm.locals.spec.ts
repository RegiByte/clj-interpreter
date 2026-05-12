import { describe, expect, it } from 'vitest'
import { addConstant, emit, emitOperand, makeChunk } from '../chunk'
import { createEvaluationContext } from '../../evaluator'
import { EvaluationError } from '../../errors'
import { v } from '../../factories'
import { makeEnv } from '../../env'
import { Op } from '../opcodes'
import { executeChunk } from '../vm'

describe('VM local opcodes', () => {
  it('loads a local slot by index [0]', () => {
    const chunk = makeChunk('load-local-test')

    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 0)
    emit(chunk, Op.Return)

    const result = executeChunk({
      chunk,
      env: makeEnv(),
      ctx: createEvaluationContext(),
      locals: [v.number(42)],
    })

    expect(result).toEqual(v.number(42))
  })

  it('loads a local slot by index [1]', () => {
    const chunk = makeChunk('load-local-test')

    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 1)
    emit(chunk, Op.Return)

    const result = executeChunk({
      chunk,
      env: makeEnv(),
      ctx: createEvaluationContext(),
      locals: [v.number(10), v.number(20)],
    })

    expect(result).toEqual(v.number(20))
  })

  it('stores a stack value into a local slot', () => {
    const chunk = makeChunk('store-local-test')
    const index = addConstant(chunk, v.number(42))

    emit(chunk, Op.Constant)
    emitOperand(chunk, index)
    emit(chunk, Op.StoreLocal)
    emitOperand(chunk, 1)
    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 1)
    emit(chunk, Op.Return)

    const result = executeChunk({
      chunk,
      env: makeEnv(),
      ctx: createEvaluationContext(),
      locals: [v.number(10), v.nil()],
    })

    expect(result).toEqual(v.number(42))
  })

  it('throws when StoreLocal has no stack value to store', () => {
    const chunk = makeChunk('store-local-underflow-test')

    emit(chunk, Op.StoreLocal)
    emitOperand(chunk, 0)

    expect(() =>
      executeChunk({
        chunk,
        env: makeEnv(),
        ctx: createEvaluationContext(),
        locals: [v.nil()],
      })
    ).toThrow(EvaluationError)
  })

  it('throws when StoreLocal targets a missing local slot', () => {
    const chunk = makeChunk('store-local-invalid-slot-test')
    const index = addConstant(chunk, v.number(42))

    emit(chunk, Op.Constant)
    emitOperand(chunk, index)
    emit(chunk, Op.StoreLocal)
    emitOperand(chunk, 1)

    expect(() =>
      executeChunk({
        chunk,
        env: makeEnv(),
        ctx: createEvaluationContext(),
        locals: [v.nil()],
      })
    ).toThrow(EvaluationError)
  })

  it('throws for invalid local index', () => {
    const chunk = makeChunk('invalid-local-index-test')
    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 2)
    emit(chunk, Op.Return)

    expect(() =>
      executeChunk({
        chunk,
        env: makeEnv(),
        ctx: createEvaluationContext(),
        locals: [v.number(10)],
      })
    ).toThrow(EvaluationError)
  })
})
