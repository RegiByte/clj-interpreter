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
import { define, internVar, makeEnv, makeNamespace } from '../../env'
import { createEvaluationContext } from '../../evaluator'
import { EvaluationError } from '../../errors'
import type { CljValue, Pos } from '../../types'
import {
  createNoDelegateContext,
  executeIntrinsicChunk,
  expectEvaluationError,
  frameNames,
  makeBytecodeFunction,
  makeIntrinsicRuntime,
  printNumber,
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

  it('executes LoadGlobal from env binding', () => {
    const chunk = makeChunk('load-global-test')
    const index = addConstant(chunk, v.symbol('x'))

    emit(chunk, Op.LoadGlobal)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const env = makeEnv()
    define('x', v.number(42), env)

    expect(
      executeChunk({ chunk, env, ctx: createEvaluationContext() })
    ).toEqual(v.number(42))
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

    expect(
      executeChunk({ chunk, env, ctx: createEvaluationContext() })
    ).toEqual(v.number(42))
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

    expect(
      executeChunk({ chunk, env, ctx: createEvaluationContext() })
    ).toEqual(v.number(2))
  })

  it('throws for missing globals', () => {
    const chunk = makeChunk('missing-global-test')
    const index = addConstant(chunk, v.symbol('missing'))

    emit(chunk, Op.LoadGlobal)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)
  })

  it.each([
    ['full namespace name', 'source.ns/answer'],
    ['alias from current namespace', 'src/answer'],
  ])('executes LoadQualified using %s', (_label, symbolName) => {
    const chunk = makeChunk('load-qualified-test')
    const index = addConstant(chunk, v.symbol(symbolName))

    emit(chunk, Op.LoadQualified)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const sourceNs = makeNamespace('source.ns')
    sourceNs.vars.set('answer', v.var('source.ns', 'answer', v.number(42)))

    const env = makeEnv()
    env.ns = makeNamespace('consumer.ns')
    env.ns.aliases.set('src', sourceNs)

    const ctx = createEvaluationContext()
    ctx.resolveNs = (name) => (name === 'source.ns' ? sourceNs : null)

    expect(executeChunk({ chunk, env, ctx })).toEqual(v.number(42))
  })

  it('derefs qualified vars at execution time', () => {
    const chunk = makeChunk('load-qualified-rederef-test')
    const index = addConstant(chunk, v.symbol('source.ns/answer'))

    emit(chunk, Op.LoadQualified)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const sourceNs = makeNamespace('source.ns')
    const answer = v.var('source.ns', 'answer', v.number(1))
    sourceNs.vars.set('answer', answer)

    const ctx = createEvaluationContext()
    ctx.resolveNs = (name) => (name === 'source.ns' ? sourceNs : null)

    expect(executeChunk({ chunk, env: makeEnv(), ctx })).toEqual(v.number(1))

    answer.value = v.number(2)

    expect(executeChunk({ chunk, env: makeEnv(), ctx })).toEqual(v.number(2))
  })

  it('respects dynamic binding stacks for qualified vars', () => {
    const chunk = makeChunk('load-qualified-dynamic-test')
    const index = addConstant(chunk, v.symbol('source.ns/*answer*'))

    emit(chunk, Op.LoadQualified)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const sourceNs = makeNamespace('source.ns')
    const answer = v.var('source.ns', '*answer*', v.keyword(':root'))
    answer.dynamic = true
    answer.bindingStack = [v.keyword(':bound')]
    sourceNs.vars.set('*answer*', answer)

    const ctx = createEvaluationContext()
    ctx.resolveNs = (name) => (name === 'source.ns' ? sourceNs : null)

    expect(executeChunk({ chunk, env: makeEnv(), ctx })).toEqual(
      v.keyword(':bound')
    )
  })

  it.each([
    [
      'invalid constant index',
      (chunk: ReturnType<typeof makeChunk>) => {
        emit(chunk, Op.LoadQualified)
        emitOperand(chunk, 999)
      },
    ],
    [
      'non-symbol constant',
      (chunk: ReturnType<typeof makeChunk>) => {
        const index = addConstant(chunk, v.number(1))
        emit(chunk, Op.LoadQualified)
        emitOperand(chunk, index)
      },
    ],
    [
      'missing namespace',
      (chunk: ReturnType<typeof makeChunk>) => {
        const index = addConstant(chunk, v.symbol('missing.ns/answer'))
        emit(chunk, Op.LoadQualified)
        emitOperand(chunk, index)
      },
    ],
    [
      'missing var',
      (chunk: ReturnType<typeof makeChunk>) => {
        const index = addConstant(chunk, v.symbol('source.ns/missing'))
        emit(chunk, Op.LoadQualified)
        emitOperand(chunk, index)
      },
    ],
  ])('throws when LoadQualified has %s', (_label, buildChunk) => {
    const chunk = makeChunk('bad-load-qualified-test')
    buildChunk(chunk)
    emit(chunk, Op.Return)

    const sourceNs = makeNamespace('source.ns')
    const ctx = createEvaluationContext()
    ctx.resolveNs = (name) => (name === 'source.ns' ? sourceNs : null)

    expect(() => executeChunk({ chunk, env: makeEnv(), ctx })).toThrow(
      EvaluationError
    )
  })

  it('attaches instruction position to LoadQualified errors', () => {
    const chunk = makeChunk('load-qualified-position-test')
    const pos = { start: 10, end: 27, lineOffset: 0, colOffset: 0 } as Pos
    const index = addConstant(chunk, v.symbol('missing.ns/answer'))

    emit(chunk, Op.LoadQualified, pos)
    emitOperand(chunk, index, pos)
    emit(chunk, Op.Return)

    let err: EvaluationError | undefined
    try {
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    } catch (e) {
      if (e instanceof EvaluationError) err = e
    }

    expect(err).toBeDefined()
    expect(err!.pos).toBe(pos)
  })

  it('hydrates delegated callable errors with the Call instruction position', () => {
    const chunk = makeChunk('call-position-test')
    const pos = { start: 3, end: 16, lineOffset: 0, colOffset: 0 } as Pos
    const fnIndex = addConstant(
      chunk,
      v.nativeFn('explode', () => {
        throw new EvaluationError('boom', {})
      })
    )

    emit(chunk, Op.Constant)
    emitOperand(chunk, fnIndex)
    emit(chunk, Op.Call, pos)
    emitOperand(chunk, 0, pos)
    emit(chunk, Op.Return)

    let err: EvaluationError | undefined
    try {
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    } catch (e) {
      if (e instanceof EvaluationError) err = e
    }

    expect(err).toBeDefined()
    expect(err!.message).toBe('boom')
    expect(err!.pos).toBe(pos)
  })

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

  it('executes Closure by pushing a normal bytecode-backed function', () => {
    const innerChunk = makeChunk('inner-closure-body')
    emit(innerChunk, Op.LoadLocal)
    emitOperand(innerChunk, 0)
    emit(innerChunk, Op.Return)
    innerChunk.localCount = 1

    const chunk = makeChunk('closure-test')
    chunk.innerFunctions.push({
      arities: [
        {
          params: [v.symbol('x')],
          restParam: null,
          chunk: innerChunk,
        },
      ],
      upvalueDescriptors: [],
    })
    emit(chunk, Op.Closure)
    emitOperand(chunk, 0)
    emit(chunk, Op.Return)

    const result = executeChunk({
      chunk,
      env: makeEnv(),
      ctx: createEvaluationContext(),
    })

    expect(result.kind).toBe('function')
    if (result.kind !== 'function') return
    expect(result.arities[0].bytecodeBody).toBe(innerChunk)
    expect(result.arities[0].body).toEqual([])
  })

  it('executes Closure with captured local upvalues', () => {
    const innerChunk = makeChunk('capturing-closure-body')
    emit(innerChunk, Op.LoadUpvalue)
    emitOperand(innerChunk, 0)
    emit(innerChunk, Op.Return)

    const chunk = makeChunk('capturing-closure-test')
    chunk.localCount = 1
    chunk.innerFunctions.push({
      arities: [
        {
          params: [],
          restParam: null,
          chunk: innerChunk,
        },
      ],
      upvalueDescriptors: [{ isLocal: true, index: 0 }],
    })
    emit(chunk, Op.Closure)
    emitOperand(chunk, 0)
    emit(chunk, Op.Call)
    emitOperand(chunk, 0)
    emit(chunk, Op.Return)

    expect(
      executeChunk({
        chunk,
        env: makeEnv(),
        ctx: createNoDelegateContext(),
        locals: [v.number(42)],
      })
    ).toEqual(v.number(42))
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

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual(expected)
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

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual(v.string('1:2:3'))
  })

  it('pushes a VM frame for bytecode-backed function calls', () => {
    const env = makeEnv()
    const calleeChunk = makeChunk('identity-body')
    emit(calleeChunk, Op.LoadLocal)
    emitOperand(calleeChunk, 0)
    emit(calleeChunk, Op.Return)
    const fn = makeBytecodeFunction(calleeChunk, ['x'], env)

    const chunk = makeChunk('call-bytecode-function-test')
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, fn))
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(42)))
    emit(chunk, Op.Call)
    emitOperand(chunk, 1)
    emit(chunk, Op.Return)

    expect(
      executeChunk({ chunk, env, ctx: createNoDelegateContext() })
    ).toEqual(v.number(42))
  })

  it('truncates the callee stack region before returning to the caller', () => {
    const env = makeEnv()
    const calleeChunk = makeChunk('stacky-callee-body')
    emit(calleeChunk, Op.Constant)
    emitOperand(calleeChunk, addConstant(calleeChunk, v.number(999)))
    emit(calleeChunk, Op.LoadLocal)
    emitOperand(calleeChunk, 0)
    emit(calleeChunk, Op.Return)
    const fn = makeBytecodeFunction(calleeChunk, ['x'], env)

    const chunk = makeChunk('callee-stack-truncation-test')
    const assertArg = v.nativeFn('assert-arg', (arg: CljValue) => arg)
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, assertArg))
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, fn))
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(42)))
    emit(chunk, Op.Call)
    emitOperand(chunk, 1)
    emit(chunk, Op.Call)
    emitOperand(chunk, 1)
    emit(chunk, Op.Return)

    expect(
      executeChunk({ chunk, env, ctx: createEvaluationContext() })
    ).toEqual(v.number(42))
  })

  it('keeps delegating non-bytecode callables through ctx.applyCallable', () => {
    const chunk = makeChunk('delegated-call-test')
    const nativeFn = v.nativeFn('forty-two', () => v.nil())
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, nativeFn))
    emit(chunk, Op.Call)
    emitOperand(chunk, 0)
    emit(chunk, Op.Return)

    const ctx = createEvaluationContext()
    let delegated = false
    ctx.applyCallable = (callable, args) => {
      delegated = true
      expect(callable).toBe(nativeFn)
      expect(args).toEqual([])
      return v.number(42)
    }

    expect(executeChunk({ chunk, env: makeEnv(), ctx })).toEqual(v.number(42))
    expect(delegated).toBe(true)
  })

  it('uses a VM frame limit for runaway bytecode recursion', () => {
    const env = makeEnv()
    const recursiveChunk = makeChunk('recursive-body')
    emit(recursiveChunk, Op.LoadGlobal)
    emitOperand(recursiveChunk, addConstant(recursiveChunk, v.symbol('again')))
    emit(recursiveChunk, Op.Call)
    emitOperand(recursiveChunk, 0)
    emit(recursiveChunk, Op.Return)
    const fn = makeBytecodeFunction(recursiveChunk, [], env)
    define('again', fn, env)

    const chunk = makeChunk('recursive-call-test')
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, fn))
    emit(chunk, Op.Call)
    emitOperand(chunk, 0)
    emit(chunk, Op.Return)

    expect(() =>
      executeChunk({ chunk, env, ctx: createNoDelegateContext() })
    ).toThrow(
      'Stack overflow: exceeded 10000 VM call frames. Use loop/recur for unbounded iteration.'
    )
  })

  it('synthesizes active VM frames when a nested bytecode frame throws', () => {
    const env = makeEnv()
    const calleeChunk = makeChunk('boom-body')
    emit(calleeChunk, Op.Constant)
    emitOperand(calleeChunk, addConstant(calleeChunk, v.number(1)))
    emit(calleeChunk, Op.Constant)
    emitOperand(calleeChunk, addConstant(calleeChunk, v.number(0)))
    emit(calleeChunk, Op.Div)
    emitOperand(calleeChunk, 2)
    emit(calleeChunk, Op.Return)
    const fn = makeBytecodeFunction(calleeChunk, [], env)
    fn.name = 'boom'

    const chunk = makeChunk('root-body')
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, fn))
    emit(chunk, Op.Call)
    emitOperand(chunk, 0)
    emit(chunk, Op.Return)

    const error = expectEvaluationError(() =>
      executeChunk({ chunk, env, ctx: createNoDelegateContext() })
    )
    expect(frameNames(error)).toEqual(['boom', 'root-body'])
  })

  it('bridges delegated VM calls through ctx.frameStack', () => {
    const env = makeEnv()
    const chunk = makeChunk('delegating-root')
    const nativeFn = v.nativeFn('explode', () => v.nil())
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, nativeFn))
    emit(chunk, Op.Call)
    emitOperand(chunk, 0)
    emit(chunk, Op.Return)

    const ctx = createEvaluationContext()
    ctx.applyCallable = () => {
      throw new EvaluationError('delegated boom', {})
    }

    const error = expectEvaluationError(() => executeChunk({ chunk, env, ctx }))
    expect(frameNames(error)).toEqual(['explode', 'delegating-root'])
    expect(ctx.frameStack).toEqual([])
  })

  it('keeps outer VM context for mixed VM native VM errors', () => {
    const env = makeEnv()
    const innerChunk = makeChunk('inner-body')
    emit(innerChunk, Op.Constant)
    emitOperand(innerChunk, addConstant(innerChunk, v.number(1)))
    emit(innerChunk, Op.Constant)
    emitOperand(innerChunk, addConstant(innerChunk, v.number(0)))
    emit(innerChunk, Op.Div)
    emitOperand(innerChunk, 2)
    emit(innerChunk, Op.Return)
    const innerFn = makeBytecodeFunction(innerChunk, [], env)
    innerFn.name = 'inner'

    const bridgeFn = v.nativeFn('bridge', () => v.nil())
    const rootChunk = makeChunk('outer-body')
    emit(rootChunk, Op.Constant)
    emitOperand(rootChunk, addConstant(rootChunk, bridgeFn))
    emit(rootChunk, Op.Call)
    emitOperand(rootChunk, 0)
    emit(rootChunk, Op.Return)

    const ctx = createEvaluationContext()
    const applyCallable = ctx.applyCallable
    ctx.applyCallable = (callable, args, callEnv) => {
      if (callable === bridgeFn) {
        return applyCallable(innerFn, [], callEnv)
      }
      return applyCallable(callable, args, callEnv)
    }

    const error = expectEvaluationError(() =>
      executeChunk({ chunk: rootChunk, env, ctx })
    )
    expect(frameNames(error)).toEqual(['inner', 'bridge'])
    expect(ctx.frameStack).toEqual([])
  })

  it.each([
    [
      'missing operand',
      (chunk: ReturnType<typeof makeChunk>) => {
        emit(chunk, Op.Call)
      },
    ],
    [
      'not enough stack values',
      (chunk: ReturnType<typeof makeChunk>) => {
        emit(chunk, Op.Call)
        emitOperand(chunk, 1)
      },
    ],
    [
      'negative argument count',
      (chunk: ReturnType<typeof makeChunk>) => {
        emit(chunk, Op.Call)
        emitOperand(chunk, -1)
      },
    ],
    [
      'non-integer argument count',
      (chunk: ReturnType<typeof makeChunk>) => {
        emit(chunk, Op.Call)
        emitOperand(chunk, 1.5)
      },
    ],
    [
      'non-callable callee',
      (chunk: ReturnType<typeof makeChunk>) => {
        const index = addConstant(chunk, v.number(1))
        emit(chunk, Op.Constant)
        emitOperand(chunk, index)
        emit(chunk, Op.Call)
        emitOperand(chunk, 0)
      },
    ],
  ])('throws when Call has %s', (_label, buildChunk) => {
    const chunk = makeChunk('bad-call-test')
    buildChunk(chunk)

    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)
  })

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
