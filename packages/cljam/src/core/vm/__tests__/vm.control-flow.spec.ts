import { describe, expect, it } from 'vitest'
import { addConstant, emit, emitOperand, makeChunk } from '../chunk'
import { createEvaluationContext } from '../../evaluator'
import { EvaluationError } from '../../errors'
import { v } from '../../factories'
import { makeEnv } from '../../env'
import { Op } from '../opcodes'
import { executeChunk } from '../vm'

describe('VM control flow opcodes', () => {
  it('Executes Pop by discarding the stack top', () => {
    const chunk = makeChunk('pop-test')
    const first = addConstant(chunk, v.number(1))
    const second = addConstant(chunk, v.number(2))

    emit(chunk, Op.Constant)
    emitOperand(chunk, first)
    emit(chunk, Op.Pop)
    emit(chunk, Op.Constant)
    emitOperand(chunk, second)
    emit(chunk, Op.Return)

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual(v.number(2))
  })

  it('throws when Pop has an empty stack', () => {
    const chunk = makeChunk('pop-underflow-test')
    emit(chunk, Op.Pop)

    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)
  })

  it('executes Jump by skipping instructions', () => {
    const chunk = makeChunk('jump-test')
    const skipped = addConstant(chunk, v.number(1))
    const result = addConstant(chunk, v.number(2))

    emit(chunk, Op.Jump)
    emitOperand(chunk, 2)
    emit(chunk, Op.Constant)
    emitOperand(chunk, skipped)
    emit(chunk, Op.Constant)
    emitOperand(chunk, result)
    emit(chunk, Op.Return)

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual(v.number(2))
  })

  it('executes JumpIfFalsy when condition is false', () => {
    const chunk = makeChunk('jump-if-falsy-false-test')
    const skipped = addConstant(chunk, v.number(1))
    const result = addConstant(chunk, v.number(2))

    emit(chunk, Op.False)
    emit(chunk, Op.JumpIfFalsy)
    emitOperand(chunk, 2)
    emit(chunk, Op.Constant)
    emitOperand(chunk, skipped)
    emit(chunk, Op.Constant)
    emitOperand(chunk, result)
    emit(chunk, Op.Return)

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual(v.number(2))
  })

  it('does not jump when condition is true', () => {
    const chunk = makeChunk('jump-if-falsy-true-test')
    const result = addConstant(chunk, v.number(1))

    emit(chunk, Op.True)
    emit(chunk, Op.JumpIfFalsy)
    emitOperand(chunk, 2)
    emit(chunk, Op.Constant)
    emitOperand(chunk, result)
    emit(chunk, Op.Return)

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual(v.number(1))
  })

  it('treats nil as falsey', () => {
    const chunk = makeChunk('jump-if-falsy-nil-test')
    const skipped = addConstant(chunk, v.number(1))
    const result = addConstant(chunk, v.number(2))

    emit(chunk, Op.Nil)
    emit(chunk, Op.JumpIfFalsy)
    emitOperand(chunk, 2)
    emit(chunk, Op.Constant)
    emitOperand(chunk, skipped)
    emit(chunk, Op.Constant)
    emitOperand(chunk, result)
    emit(chunk, Op.Return)

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual(v.number(2))
  })

  it('treats non-false non-nil values as truthy', () => {
    const chunk = makeChunk('jump-if-falsy-truthy-test')
    const result = addConstant(chunk, v.number(1))

    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(0)))
    emit(chunk, Op.JumpIfFalsy)
    emitOperand(chunk, 2)
    emit(chunk, Op.Constant)
    emitOperand(chunk, result)
    emit(chunk, Op.Return)

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual(v.number(1))
  })

  it('throws when JumpIfFalsy has an empty stack', () => {
    const chunk = makeChunk('jump-if-falsy-underflow-test')
    emit(chunk, Op.JumpIfFalsy)
    emitOperand(chunk, 1)

    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)
  })

  it('throws when Jump is missing an operand', () => {
    const chunk = makeChunk('jump-missing-operand-test')
    emit(chunk, Op.Jump)

    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)
  })

  it('throws when Jump target is outside the chunk', () => {
    const chunk = makeChunk('jump-out-of-bounds-test')
    emit(chunk, Op.Jump)
    emitOperand(chunk, 999)

    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)
  })

  it('executes Recur by replacing a local slot range and jumping to the loop header', () => {
    const chunk = makeChunk('recur-test')

    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(2)))
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(1)))
    emit(chunk, Op.Recur)
    emitOperand(chunk, 0)
    emitOperand(chunk, 2)
    emitOperand(chunk, 8)
    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 0)
    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 1)
    emit(chunk, Op.MakeVector)
    emitOperand(chunk, 2)
    emit(chunk, Op.Return)

    expect(
      executeChunk({
        chunk,
        env: makeEnv(),
        ctx: createEvaluationContext(),
        locals: [v.nil(), v.nil()],
      })
    ).toEqual(v.vector([v.number(2), v.number(1)]))
  })

  it.each([
    [
      'stack underflow',
      (chunk: ReturnType<typeof makeChunk>) => {
        emit(chunk, Op.Constant)
        emitOperand(chunk, addConstant(chunk, v.number(1)))
        emit(chunk, Op.Recur)
        emitOperand(chunk, 0)
        emitOperand(chunk, 2)
        emitOperand(chunk, 8)
      },
    ],
    [
      'invalid local slot range',
      (chunk: ReturnType<typeof makeChunk>) => {
        emit(chunk, Op.Constant)
        emitOperand(chunk, addConstant(chunk, v.number(1)))
        emit(chunk, Op.Recur)
        emitOperand(chunk, 1)
        emitOperand(chunk, 1)
        emitOperand(chunk, 8)
      },
    ],
    [
      'invalid loop header',
      (chunk: ReturnType<typeof makeChunk>) => {
        emit(chunk, Op.Constant)
        emitOperand(chunk, addConstant(chunk, v.number(1)))
        emit(chunk, Op.Recur)
        emitOperand(chunk, 0)
        emitOperand(chunk, 1)
        emitOperand(chunk, 999)
      },
    ],
  ])('throws when Recur has %s', (_label, buildChunk) => {
    const chunk = makeChunk('bad-recur-test')
    buildChunk(chunk)
    emit(chunk, Op.Return)

    expect(() =>
      executeChunk({
        chunk,
        env: makeEnv(),
        ctx: createEvaluationContext(),
        locals: [v.nil()],
      })
    ).toThrow(EvaluationError)
  })

  it('executes FnRecur by replacing function parameter slots and jumping to the body entry', () => {
    const chunk = makeChunk('fn-recur-test')

    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 2)
    emit(chunk, Op.JumpIfFalsy)
    emitOperand(chunk, 3)
    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 1)
    emit(chunk, Op.Return)
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(99)))
    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 1)
    emit(chunk, Op.True)
    emit(chunk, Op.FnRecur)
    emitOperand(chunk, 3)
    emit(chunk, Op.Return)

    expect(
      executeChunk({
        chunk,
        env: makeEnv(),
        ctx: createEvaluationContext(),
        locals: [v.number(4), v.number(42), v.boolean(false)],
      })
    ).toEqual(v.number(42))
  })

  it('executes FnRecur updates as simultaneous assignment', () => {
    const chunk = makeChunk('fn-recur-simultaneous-test')

    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 2)
    emit(chunk, Op.JumpIfFalsy)
    emitOperand(chunk, 7)
    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 0)
    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 1)
    emit(chunk, Op.MakeVector)
    emitOperand(chunk, 2)
    emit(chunk, Op.Return)
    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 1)
    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 0)
    emit(chunk, Op.True)
    emit(chunk, Op.FnRecur)
    emitOperand(chunk, 3)
    emit(chunk, Op.Return)

    expect(
      executeChunk({
        chunk,
        env: makeEnv(),
        ctx: createEvaluationContext(),
        locals: [v.number(1), v.number(2), v.boolean(false)],
      })
    ).toEqual(v.vector([v.number(2), v.number(1)]))
  })

  it('executes FnRecurRest by packing extra arguments into the rest slot', () => {
    const chunk = makeChunk('fn-recur-rest-test')

    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 0)
    emit(chunk, Op.JumpIfFalsy)
    emitOperand(chunk, 3)
    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 2)
    emit(chunk, Op.Return)
    emit(chunk, Op.True)
    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 1)
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(2)))
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(3)))
    emit(chunk, Op.FnRecurRest)
    emitOperand(chunk, 4)
    emitOperand(chunk, 2)
    emit(chunk, Op.Return)

    expect(
      executeChunk({
        chunk,
        env: makeEnv(),
        ctx: createEvaluationContext(),
        locals: [v.boolean(false), v.number(1), v.nil()],
      })
    ).toEqual(v.list([v.number(2), v.number(3)]))
  })

  it('executes FnRecurRest with nil for an empty rest', () => {
    const chunk = makeChunk('fn-recur-rest-empty-test')

    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 0)
    emit(chunk, Op.JumpIfFalsy)
    emitOperand(chunk, 3)
    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 2)
    emit(chunk, Op.Return)
    emit(chunk, Op.True)
    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 1)
    emit(chunk, Op.FnRecurRest)
    emitOperand(chunk, 2)
    emitOperand(chunk, 2)
    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 2)
    emit(chunk, Op.Return)

    expect(
      executeChunk({
        chunk,
        env: makeEnv(),
        ctx: createEvaluationContext(),
        locals: [v.boolean(false), v.number(1), v.list([v.number(9)])],
      })
    ).toEqual(v.nil())
  })

  it.each([
    [
      'stack underflow',
      (chunk: ReturnType<typeof makeChunk>) => {
        emit(chunk, Op.Constant)
        emitOperand(chunk, addConstant(chunk, v.number(1)))
        emit(chunk, Op.FnRecur)
        emitOperand(chunk, 2)
      },
    ],
    [
      'invalid argument count',
      (chunk: ReturnType<typeof makeChunk>) => {
        emit(chunk, Op.FnRecur)
        emitOperand(chunk, 2)
      },
    ],
    [
      'variadic stack underflow',
      (chunk: ReturnType<typeof makeChunk>) => {
        emit(chunk, Op.Constant)
        emitOperand(chunk, addConstant(chunk, v.number(1)))
        emit(chunk, Op.FnRecurRest)
        emitOperand(chunk, 2)
        emitOperand(chunk, 0)
      },
    ],
    [
      'invalid variadic operands',
      (chunk: ReturnType<typeof makeChunk>) => {
        emit(chunk, Op.FnRecurRest)
        emitOperand(chunk, 1)
        emitOperand(chunk, 1)
      },
    ],
  ])('throws when FnRecur has %s', (_label, buildChunk) => {
    const chunk = makeChunk('bad-fn-recur-test')
    buildChunk(chunk)
    emit(chunk, Op.Return)

    expect(() =>
      executeChunk({
        chunk,
        env: makeEnv(),
        ctx: createEvaluationContext(),
        locals: [v.nil()],
      })
    ).toThrow(EvaluationError)
  })
})
