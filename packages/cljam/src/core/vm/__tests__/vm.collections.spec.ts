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
import { makeEnv } from '../../env'
import { Op } from '../opcodes'
import { executeChunk } from '../vm'

describe('VM collection opcodes', () => {
  it.each([
    ['MakeVector', Op.MakeVector],
    ['MakeMap', Op.MakeMap],
    ['MakeSet', Op.MakeSet],
  ])('throws when %s is missing its count operand', (_name, op) => {
    const chunk = makeChunk('missing-count-test')
    emit(chunk, op)

    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)
  })

  it.each([
    ['MakeVector', Op.MakeVector, -1],
    ['MakeVector', Op.MakeVector, 1.5],
    ['MakeMap', Op.MakeMap, -1],
    ['MakeMap', Op.MakeMap, 1.5],
    ['MakeSet', Op.MakeSet, -1],
    ['MakeSet', Op.MakeSet, 1.5],
  ])('throws when %s has invalid count %s', (_name, op, count) => {
    const chunk = makeChunk('invalid-count-test')
    emit(chunk, op)
    emitOperand(chunk, count)

    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)
  })

  it('executes MakeVector by constructing a vector from the stack', () => {
    const chunk = makeChunk('make-vector-test')
    const first = addConstant(chunk, v.number(1))
    const second = addConstant(chunk, v.number(2))
    const third = addConstant(chunk, v.number(3))

    emit(chunk, Op.Constant)
    emitOperand(chunk, first)
    emit(chunk, Op.Constant)
    emitOperand(chunk, second)
    emit(chunk, Op.Constant)
    emitOperand(chunk, third)
    emit(chunk, Op.MakeVector)
    emitOperand(chunk, 3)
    emit(chunk, Op.Return)

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual(v.vector([v.number(1), v.number(2), v.number(3)]))
  })

  it('executes MakeMap by constructing a map from the stack', () => {
    const chunk = makeChunk('make-map-test')
    const key1 = addConstant(chunk, v.keyword(':a'))
    const value1 = addConstant(chunk, v.number(1))
    const key2 = addConstant(chunk, v.keyword(':b'))
    const value2 = addConstant(chunk, v.number(2))

    emit(chunk, Op.Constant)
    emitOperand(chunk, key1)
    emit(chunk, Op.Constant)
    emitOperand(chunk, value1)
    emit(chunk, Op.Constant)
    emitOperand(chunk, key2)
    emit(chunk, Op.Constant)
    emitOperand(chunk, value2)
    emit(chunk, Op.MakeMap)
    emitOperand(chunk, 2)
    emit(chunk, Op.Return)

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual(
      v.map([
        [v.keyword(':a'), v.number(1)],
        [v.keyword(':b'), v.number(2)],
      ])
    )
  })

  it('executes MakeSet by constructing a set from the stack', () => {
    const chunk = makeChunk('make-map-test')
    const key1 = addConstant(chunk, v.keyword(':a'))
    const value1 = addConstant(chunk, v.number(1))
    const key2 = addConstant(chunk, v.keyword(':b'))
    const value2 = addConstant(chunk, v.number(2))

    emit(chunk, Op.Constant)
    emitOperand(chunk, key1)
    emit(chunk, Op.Constant)
    emitOperand(chunk, value1)
    emit(chunk, Op.Constant)
    emitOperand(chunk, key2)
    emit(chunk, Op.Constant)
    emitOperand(chunk, value2)
    emit(chunk, Op.MakeSet)
    emitOperand(chunk, 4)
    emit(chunk, Op.Return)

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual(
      v.set([v.keyword(':a'), v.number(1), v.keyword(':b'), v.number(2)])
    )
  })

  it('executes WithMeta by attaching metadata to a vector', () => {
    const chunk = makeChunk('with-meta-vector-test')
    const meta = addConstant(
      chunk,
      v.map([[v.keyword(':fast'), v.boolean(true)]])
    )

    emit(chunk, Op.MakeVector)
    emitOperand(chunk, 0)
    emit(chunk, Op.WithMeta)
    emitOperand(chunk, meta)
    emit(chunk, Op.Return)

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual({
      ...v.vector([]),
      meta: v.map([[v.keyword(':fast'), v.boolean(true)]]),
    })
  })

  it('executes WithMeta by attaching metadata to a map', () => {
    const chunk = makeChunk('with-meta-map-test')
    const meta = addConstant(chunk, v.map([[v.keyword(':a'), v.number(1)]]))

    emit(chunk, Op.MakeMap)
    emitOperand(chunk, 0)
    emit(chunk, Op.WithMeta)
    emitOperand(chunk, meta)
    emit(chunk, Op.Return)

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual({
      ...v.map([]),
      meta: v.map([[v.keyword(':a'), v.number(1)]]),
    })
  })

  it('throws when WithMeta references an invalid metadata constant index', () => {
    const chunk = makeChunk('with-meta-invalid-index-test')

    emit(chunk, Op.MakeVector)
    emitOperand(chunk, 0)
    emit(chunk, Op.WithMeta)
    emitOperand(chunk, 0)
    emit(chunk, Op.Return)

    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)
  })

  it('throws when WithMeta metadata constant is not a map', () => {
    const chunk = makeChunk('with-meta-invalid-meta-test')
    const meta = addConstant(chunk, v.keyword(':fast'))

    emit(chunk, Op.MakeVector)
    emitOperand(chunk, 0)
    emit(chunk, Op.WithMeta)
    emitOperand(chunk, meta)
    emit(chunk, Op.Return)

    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)
  })

  it('throws when WithMeta has no stack value', () => {
    const chunk = makeChunk('with-meta-underflow-test')
    const meta = addConstant(chunk, v.map([]))

    emit(chunk, Op.WithMeta)
    emitOperand(chunk, meta)
    emit(chunk, Op.Return)

    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)
  })

  it('throws when WithMeta targets an unsupported value kind', () => {
    const chunk = makeChunk('with-meta-unsupported-target-test')
    const value = addConstant(chunk, v.number(1))
    const meta = addConstant(chunk, v.map([]))

    emit(chunk, Op.Constant)
    emitOperand(chunk, value)
    emit(chunk, Op.WithMeta)
    emitOperand(chunk, meta)
    emit(chunk, Op.Return)

    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)
  })

  it('Throws when MakeVector has fewer items on the stack than the operand', () => {
    const chunk = makeChunk('make-vector-underflow-test')
    const first = addConstant(chunk, v.number(1))
    const second = addConstant(chunk, v.number(2))

    emit(chunk, Op.Constant)
    emitOperand(chunk, first)
    emit(chunk, Op.Constant)
    emitOperand(chunk, second)

    const snapshot = snapshotChunk(chunk)

    emit(chunk, Op.MakeVector)
    emitOperand(chunk, 3)

    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)

    rollbackChunk(chunk, snapshot)

    emit(chunk, Op.MakeVector)
    emitOperand(chunk, 2)
    emit(chunk, Op.Return)

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual(v.vector([v.number(1), v.number(2)]))
  })

  it('Throws when MakeMap has fewer items on the stack than the operand', () => {
    const chunk = makeChunk('make-map-underflow-test')
    const key1 = addConstant(chunk, v.keyword(':a'))
    const value1 = addConstant(chunk, v.number(1))
    const key2 = addConstant(chunk, v.keyword(':b'))
    const value2 = addConstant(chunk, v.number(2))

    emit(chunk, Op.Constant)
    emitOperand(chunk, key1)
    emit(chunk, Op.Constant)
    emitOperand(chunk, value1)
    emit(chunk, Op.Constant)
    emitOperand(chunk, key2)
    emit(chunk, Op.Constant)
    emitOperand(chunk, value2)
    const snapshot = snapshotChunk(chunk)

    emit(chunk, Op.MakeMap)
    emitOperand(chunk, 3)

    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)

    rollbackChunk(chunk, snapshot)

    emit(chunk, Op.MakeMap)
    emitOperand(chunk, 2)
    emit(chunk, Op.Return)

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual(
      v.map([
        [v.keyword(':a'), v.number(1)],
        [v.keyword(':b'), v.number(2)],
      ])
    )
  })

  it('Throws when MakeSet has fewer items on the stack than the operand', () => {
    const chunk = makeChunk('make-set-underflow-test')
    const first = addConstant(chunk, v.number(1))
    const second = addConstant(chunk, v.number(2))
    const third = addConstant(chunk, v.number(3))

    emit(chunk, Op.Constant)
    emitOperand(chunk, first)
    emit(chunk, Op.Constant)
    emitOperand(chunk, second)
    emit(chunk, Op.Constant)
    emitOperand(chunk, third)

    const snapshot = snapshotChunk(chunk)

    emit(chunk, Op.MakeSet)
    emitOperand(chunk, 4)

    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)

    rollbackChunk(chunk, snapshot)

    emit(chunk, Op.MakeSet)
    emitOperand(chunk, 3)
    emit(chunk, Op.Return)

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual(v.set([v.number(1), v.number(2), v.number(3)]))
  })
})
