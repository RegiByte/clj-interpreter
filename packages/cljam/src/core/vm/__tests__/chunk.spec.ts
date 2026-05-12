import { describe, expect, it } from 'vitest'
import {
  addConstant,
  emit,
  emitOperand,
  makeChunk,
  rollbackChunk,
  snapshotChunk,
} from '../chunk'
import { createEvaluationContext } from '../../evaluator'
import { EvaluationError } from '../../errors'
import { v } from '../../factories'
import type { Pos, VmFunctionTemplate } from '../../types'
import { makeEnv } from '../../env'
import { Op, opcodeName } from '../opcodes'
import { executeChunk } from '../vm'

describe('VM chunks', () => {
  it('executes a constant return chunk', () => {
    const chunk = makeChunk('constant-test')
    const index = addConstant(chunk, v.number(42))

    emit(chunk, Op.Constant)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const result = executeChunk({
      chunk,
      env: makeEnv(),
      ctx: createEvaluationContext(),
    })

    expect(result).toEqual(v.number(42))
  })

  it.each([
    [opcodeName(Op.Nil), Op.Nil, v.nil()],
    [opcodeName(Op.True), Op.True, v.boolean(true)],
    [opcodeName(Op.False), Op.False, v.boolean(false)],
  ])('executes %s return chunks', (_name, op, expected) => {
    const chunk = makeChunk('literal-test')
    emit(chunk, op)
    emit(chunk, Op.Return)

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual(expected)
  })

  it('returns nil for an empty chunk', () => {
    const chunk = makeChunk('empty-test')

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual(v.nil())
  })

  it('throws on an invalid constant index', () => {
    const chunk = makeChunk('bad-constant-test')
    emit(chunk, Op.Constant)
    emitOperand(chunk, 999)
    emit(chunk, Op.Return)

    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)
  })

  it('throws on an unknown opcode', () => {
    const chunk = makeChunk('unknown-opcode-test')
    emit(chunk, 999)

    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)
  })

  it('keeps positions aligned with code cells', () => {
    const chunk = makeChunk('positions-test')
    const pos = { start: 0, end: 1, lineOffset: 1, colOffset: 2 } as Pos
    const index = addConstant(chunk, v.string('hello'))

    emit(chunk, Op.Constant, pos)
    emitOperand(chunk, index, pos)
    emit(chunk, Op.Return, pos)

    expect(chunk.code).toEqual([Op.Constant, index, Op.Return])
    expect(chunk.positions).toEqual([pos, pos, pos])
  })

  it('tracks max stack for emitted chunks', () => {
    const chunk = makeChunk('max-stack-test')

    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(1)))
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(2)))
    emit(chunk, Op.Add)
    emitOperand(chunk, 2)
    emit(chunk, Op.Return)

    expect(chunk.maxStack).toBe(2)
  })

  it('tracks max stack for operand-count instructions', () => {
    const chunk = makeChunk('max-stack-count-test')

    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.keyword(':a')))
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(1)))
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.keyword(':b')))
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(2)))
    emit(chunk, Op.MakeMap)
    emitOperand(chunk, 2)
    emit(chunk, Op.Return)

    expect(chunk.maxStack).toBe(4)
  })

  it('restores max stack metadata when rolling back chunks', () => {
    const chunk = makeChunk('max-stack-rollback-test')
    const snapshot = snapshotChunk(chunk)

    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(1)))
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(2)))

    expect(chunk.maxStack).toBe(2)

    rollbackChunk(chunk, snapshot)

    expect(chunk.maxStack).toBe(0)
    expect(chunk.code).toEqual([])
    expect(chunk.constants).toEqual([])
    expect(chunk.positions).toEqual([])
  })

  it('restores inner function templates when rolling back chunks', () => {
    const chunk = makeChunk('inner-function-rollback-test')
    const snapshot = snapshotChunk(chunk)
    const innerChunk = makeChunk('inner')
    const template: VmFunctionTemplate = {
      arities: [
        {
          params: [],
          restParam: null,
          chunk: innerChunk,
        },
      ],
      upvalueDescriptors: [],
    }

    chunk.innerFunctions.push(template)

    rollbackChunk(chunk, snapshot)

    expect(chunk.innerFunctions).toEqual([])
  })
})
