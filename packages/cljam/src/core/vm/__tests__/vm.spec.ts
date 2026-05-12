import { describe, expect, it } from 'vitest'
import {
  addConstant,
  emit,
  emitOperand,
  makeChunk,
} from '../chunk'
import { v } from '../../factories'
import { Op } from '../opcodes'
import { executeChunk } from '../vm'
import { define, makeEnv } from '../../env'
import { createEvaluationContext } from '../../evaluator'
import { EvaluationError } from '../../errors'
import type { Pos } from '../../types'
import {
  executeIntrinsicChunk,
  makeIntrinsicRuntime,
} from './vm-test-utils'

describe('VM Hand written chunks', () => {
  it.each([
    ['zero-arg Add', Op.Add, '+', [], v.number(0)],
    ['n-ary Add', Op.Add, '+', [v.number(1), v.number(2), v.number(3)], v.number(6)],
    ['zero-arg Mul', Op.Mul, '*', [], v.number(1)],
    ['n-ary Mul', Op.Mul, '*', [v.number(2), v.number(3), v.number(4)], v.number(24)],
    ['unary Sub', Op.Sub, '-', [v.number(10)], v.number(-10)],
    ['n-ary Sub', Op.Sub, '-', [v.number(20), v.number(3), v.number(4)], v.number(13)],
    ['unary Div', Op.Div, '/', [v.number(10)], v.number(10)],
    ['n-ary Div', Op.Div, '/', [v.number(100), v.number(5), v.number(2)], v.number(10)],
    ['Lt true', Op.Lt, '<', [v.number(1), v.number(2), v.number(3)], v.boolean(true)],
    ['Lt false', Op.Lt, '<', [v.number(1), v.number(3), v.number(2)], v.boolean(false)],
    ['Gt true', Op.Gt, '>', [v.number(3), v.number(2), v.number(1)], v.boolean(true)],
    ['Lte true', Op.Lte, '<=', [v.number(1), v.number(1), v.number(2)], v.boolean(true)],
    ['Gte false', Op.Gte, '>=', [v.number(3), v.number(1), v.number(2)], v.boolean(false)],
    [
      'Eq structural true',
      Op.Eq,
      '=',
      [v.vector([v.number(1)]), v.list([v.number(1)])],
      v.boolean(true),
    ],
    [
      'Eq structural false',
      Op.Eq,
      '=',
      [v.map([[v.keyword(':a'), v.number(1)]]), v.map([[v.keyword(':a'), v.number(2)]])],
      v.boolean(false),
    ],
  ])('executes intrinsic %s', (_label, op, name, args, expected) => {
    expect(executeIntrinsicChunk(op, name, args)).toEqual(expected)
  })

  it('falls back to the visible callable when an intrinsic root is redefined', () => {
    const chunk = makeChunk('intrinsic-fallback-test')
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(1)))
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(2)))
    emit(chunk, Op.Add)
    emitOperand(chunk, 2)
    emit(chunk, Op.Return)

    const env = makeEnv()
    define(
      '+',
      v.nativeFn('+', () => v.number(99)),
      env
    )

    expect(
      executeChunk({ chunk, env, ctx: createEvaluationContext() })
    ).toEqual(v.number(99))
  })

  it.each([
    ['missing argc', Op.Add, undefined],
    ['negative argc', Op.Add, -1],
    ['non-integer argc', Op.Add, 1.5],
  ])('throws when intrinsic has %s', (_label, op, argc) => {
    const chunk = makeChunk('bad-intrinsic-count-test')
    emit(chunk, op)
    if (argc !== undefined) emitOperand(chunk, argc)

    expect(() =>
      executeChunk({ chunk, ...makeIntrinsicRuntime('+') })
    ).toThrow(EvaluationError)
  })

  it('throws when intrinsic has fewer stack values than argc', () => {
    const chunk = makeChunk('bad-intrinsic-underflow-test')
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(1)))
    emit(chunk, Op.Add)
    emitOperand(chunk, 2)

    expect(() =>
      executeChunk({ chunk, ...makeIntrinsicRuntime('+') })
    ).toThrow(EvaluationError)
  })

  it.each([
    ['Add non-number', Op.Add, '+', [v.number(1), v.string('x')], '+ expects all arguments to be numbers', 1],
    ['Sub zero-arity', Op.Sub, '-', [], '- expects at least one argument', undefined],
    ['Div zero-arity', Op.Div, '/', [], '/ expects at least one argument', undefined],
    ['Div by zero', Op.Div, '/', [v.number(10), v.number(0)], 'division by zero', 1],
    ['Lt invalid arity', Op.Lt, '<', [v.number(1)], '< expects at least two arguments', undefined],
    ['Gte non-number', Op.Gte, '>=', [v.string('x'), v.number(1)], '>= expects all arguments to be numbers', 0],
    ['Eq invalid arity', Op.Eq, '=', [v.number(1)], '= expects at least two arguments', undefined],
  ])(
    'throws for intrinsic semantic error %s',
    (_label, op, name, args, message, argIndex) => {
      let err: any
      try {
        executeIntrinsicChunk(op, name, args)
      } catch (e) {
        err = e
      }

      expect(err).toBeInstanceOf(EvaluationError)
      expect(err.message).toContain(message)
      if (argIndex !== undefined) expect(err.data?.argIndex).toBe(argIndex)
    }
  )

  it.each([
    [
      'Pop underflow',
      (chunk: ReturnType<typeof makeChunk>, pos: Pos) => {
        emit(chunk, Op.Pop, pos)
      },
    ],
    [
      'collection underflow',
      (chunk: ReturnType<typeof makeChunk>, pos: Pos) => {
        const index = addConstant(chunk, v.number(1))
        emit(chunk, Op.Constant)
        emitOperand(chunk, index)
        emit(chunk, Op.MakeVector, pos)
        emitOperand(chunk, 2, pos)
      },
    ],
    [
      'invalid collection count',
      (chunk: ReturnType<typeof makeChunk>, pos: Pos) => {
        emit(chunk, Op.MakeVector, pos)
        emitOperand(chunk, -1, pos)
      },
    ],
    [
      'invalid jump offset',
      (chunk: ReturnType<typeof makeChunk>, pos: Pos) => {
        emit(chunk, Op.Jump, pos)
        emitOperand(chunk, 999, pos)
      },
    ],
    [
      'JumpIfFalsy underflow',
      (chunk: ReturnType<typeof makeChunk>, pos: Pos) => {
        emit(chunk, Op.JumpIfFalsy, pos)
        emitOperand(chunk, 0, pos)
      },
    ],
    [
      'unknown opcode',
      (chunk: ReturnType<typeof makeChunk>, pos: Pos) => {
        emit(chunk, 999, pos)
      },
    ],
  ])(
    'attaches instruction position to VM-thrown %s errors',
    (_label, buildChunk) => {
      const chunk = makeChunk('vm-error-position-test')
      const pos = { start: 20, end: 31, lineOffset: 1, colOffset: 4 } as Pos

      buildChunk(chunk, pos)

      let err: EvaluationError | undefined
      try {
        executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
      } catch (e) {
        if (e instanceof EvaluationError) err = e
      }

      expect(err).toBeDefined()
      expect(err!.pos).toBe(pos)
    }
  )


})
