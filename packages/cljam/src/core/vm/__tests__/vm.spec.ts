import { describe, expect, it } from 'vitest'
import { addConstant, emit, emitOperand, makeChunk } from '../chunk'
import { v } from '../../factories'
import { Op, opcodeName } from '../opcodes'
import { executeChunk } from '../vm'
import { define, internVar, makeEnv, makeNamespace } from '../../env'
import { createEvaluationContext } from '../../evaluator'
import { EvaluationError } from '../../errors'
import type { CljValue, Pos } from '../../types'
import { disassembleChunk } from '../debug'

describe('VM Hand written chunks', () => {
  it('executes a constant return chunk', () => {
    const chunk = makeChunk('constant-test')
    const index = addConstant(chunk, v.number(42))

    emit(chunk, Op.Constant)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const result = executeChunk(chunk, makeEnv(), createEvaluationContext())

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

    expect(executeChunk(chunk, makeEnv(), createEvaluationContext())).toEqual(
      expected
    )
  })

  it('returns nil for an empty chunk', () => {
    const chunk = makeChunk('empty-test')

    expect(executeChunk(chunk, makeEnv(), createEvaluationContext())).toEqual(
      v.nil()
    )
  })

  it('throws on an invalid constant index', () => {
    const chunk = makeChunk('bad-constant-test')
    emit(chunk, Op.Constant)
    emitOperand(chunk, 999)
    emit(chunk, Op.Return)

    expect(() =>
      executeChunk(chunk, makeEnv(), createEvaluationContext())
    ).toThrow(EvaluationError)
  })

  it('throws on an unknown opcode', () => {
    const chunk = makeChunk('unknown-opcode-test')
    emit(chunk, 999)

    expect(() =>
      executeChunk(chunk, makeEnv(), createEvaluationContext())
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

  it('disassembles constants and returns', () => {
    const chunk = makeChunk('disassemble-test')
    const index = addConstant(chunk, v.number(42))

    emit(chunk, Op.Constant)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    expect(disassembleChunk(chunk)).toBe(
      ['== disassemble-test ==', '0000 Constant 0 ; 42', '0002 Return'].join(
        '\n'
      )
    )
  })

  it('executes LoadGlobal from env binding', () => {
    const chunk = makeChunk('load-global-test')
    const index = addConstant(chunk, v.symbol('x'))

    emit(chunk, Op.LoadGlobal)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const env = makeEnv()
    define('x', v.number(42), env)

    expect(executeChunk(chunk, env, createEvaluationContext())).toEqual(
      v.number(42)
    )
  })

  it('executes LoadGlobal from namespace vars', () => {
    const chunk = makeChunk('load-global-ns-test')
    const index = addConstant(chunk, v.symbol('x'))

    emit(chunk, Op.LoadGlobal)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const env = makeEnv()
    env.ns = makeNamespace('user')
    internVar('x', v.number(42), env)

    expect(executeChunk(chunk, env, createEvaluationContext())).toEqual(
      v.number(42)
    )
  })

  it('derefs namespace vars at execution time', () => {
    const chunk = makeChunk('load-global-var-rederef-test')
    const index = addConstant(chunk, v.symbol('x'))

    emit(chunk, Op.LoadGlobal)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const env = makeEnv()
    env.ns = makeNamespace('user')
    internVar('x', v.number(1), env)

    internVar('x', v.number(2), env)

    expect(executeChunk(chunk, env, createEvaluationContext())).toEqual(
      v.number(2)
    )
  })

  it('throws for missing globals', () => {
    const chunk = makeChunk('missing-global-test')
    const index = addConstant(chunk, v.symbol('missing'))

    emit(chunk, Op.LoadGlobal)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    expect(() =>
      executeChunk(chunk, makeEnv(), createEvaluationContext())
    ).toThrow(EvaluationError)
  })

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

    expect(executeChunk(chunk, makeEnv(), createEvaluationContext())).toEqual(
      v.number(2)
    )
  })

  it('throws when Pop has an empty stack', () => {
    const chunk = makeChunk('pop-underflow-test')
    emit(chunk, Op.Pop)

    expect(() =>
      executeChunk(chunk, makeEnv(), createEvaluationContext())
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

    expect(executeChunk(chunk, makeEnv(), createEvaluationContext())).toEqual(
      v.number(2)
    )
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

    expect(executeChunk(chunk, makeEnv(), createEvaluationContext())).toEqual(
      v.number(2)
    )
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

    expect(executeChunk(chunk, makeEnv(), createEvaluationContext())).toEqual(
      v.number(1)
    )
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

    expect(executeChunk(chunk, makeEnv(), createEvaluationContext())).toEqual(
      v.number(2)
    )
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

    expect(executeChunk(chunk, makeEnv(), createEvaluationContext())).toEqual(
      v.number(1)
    )
  })

  it('throws when JumpIfFalsy has an empty stack', () => {
    const chunk = makeChunk('jump-if-falsy-underflow-test')
    emit(chunk, Op.JumpIfFalsy)
    emitOperand(chunk, 1)

    expect(() =>
      executeChunk(chunk, makeEnv(), createEvaluationContext())
    ).toThrow(EvaluationError)
  })

  it('throws when Jump is missing an operand', () => {
    const chunk = makeChunk('jump-missing-operand-test')
    emit(chunk, Op.Jump)

    expect(() =>
      executeChunk(chunk, makeEnv(), createEvaluationContext())
    ).toThrow(EvaluationError)
  })

  it('throws when Jump target is outside the chunk', () => {
    const chunk = makeChunk('jump-out-of-bounds-test')
    emit(chunk, Op.Jump)
    emitOperand(chunk, 999)

    expect(() =>
      executeChunk(chunk, makeEnv(), createEvaluationContext())
    ).toThrow(EvaluationError)
  })

  it.each([
    ['zero arguments', [], v.number(42)],
    ['one argument', [v.number(41)], v.number(42)],
    ['three arguments', [v.number(1), v.number(2), v.number(3)], v.number(6)],
  ])('executes Call with %s', (_label, args, expected) => {
    const chunk = makeChunk('call-test')
    const fnIndex = addConstant(
      chunk,
      v.nativeFn('sum-ish', (...values: CljValue[]) => {
        if (values.length === 0) return v.number(42)
        const total = values.reduce((acc, value) => {
          if (value.kind !== 'number') return acc
          return acc + value.value
        }, 0)
        return v.number(total + (values.length === 1 ? 1 : 0))
      })
    )

    emit(chunk, Op.Constant)
    emitOperand(chunk, fnIndex)

    for (const arg of args) {
      const argIndex = addConstant(chunk, arg)
      emit(chunk, Op.Constant)
      emitOperand(chunk, argIndex)
    }

    emit(chunk, Op.Call)
    emitOperand(chunk, args.length)
    emit(chunk, Op.Return)

    expect(executeChunk(chunk, makeEnv(), createEvaluationContext())).toEqual(
      expected
    )
  })

  it('preserves argument order when executing Call', () => {
    const chunk = makeChunk('call-arg-order-test')
    const fnIndex = addConstant(
      chunk,
      v.nativeFn('join', (a: CljValue, b: CljValue, c: CljValue) =>
        v.string([a, b, c].map((value) => printNumber(value)).join(':'))
      )
    )

    emit(chunk, Op.Constant)
    emitOperand(chunk, fnIndex)

    for (const n of [1, 2, 3]) {
      const index = addConstant(chunk, v.number(n))
      emit(chunk, Op.Constant)
      emitOperand(chunk, index)
    }

    emit(chunk, Op.Call)
    emitOperand(chunk, 3)
    emit(chunk, Op.Return)

    expect(executeChunk(chunk, makeEnv(), createEvaluationContext())).toEqual(
      v.string('1:2:3')
    )
  })

  it.each([
    ['missing operand', (chunk: ReturnType<typeof makeChunk>) => {
      emit(chunk, Op.Call)
    }],
    ['not enough stack values', (chunk: ReturnType<typeof makeChunk>) => {
      emit(chunk, Op.Call)
      emitOperand(chunk, 1)
    }],
    ['non-callable callee', (chunk: ReturnType<typeof makeChunk>) => {
      const index = addConstant(chunk, v.number(1))
      emit(chunk, Op.Constant)
      emitOperand(chunk, index)
      emit(chunk, Op.Call)
      emitOperand(chunk, 0)
    }],
  ])('throws when Call has %s', (_label, buildChunk) => {
    const chunk = makeChunk('bad-call-test')
    buildChunk(chunk)

    expect(() =>
      executeChunk(chunk, makeEnv(), createEvaluationContext())
    ).toThrow(EvaluationError)
  })
})

function printNumber(value: CljValue): string {
  return value.kind === 'number' ? String(value.value) : '?'
}
