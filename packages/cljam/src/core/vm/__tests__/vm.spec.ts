import { describe, expect, it } from 'vitest'
import {
  addConstant,
  emit,
  emitOperand,
  makeChunk,
  rollbackChunk,
  snapshotChunk,
} from '../chunk'
import { v } from '../../factories'
import { Op, opcodeName } from '../opcodes'
import { executeChunk } from '../vm'
import { define, internVar, makeEnv, makeNamespace } from '../../env'
import { createEvaluationContext } from '../../evaluator'
import { EvaluationError } from '../../errors'
import type {
  CljFunction,
  CljValue,
  Env,
  EvaluationContext,
  Pos,
} from '../../types'
import { disassembleChunk } from '../debug'

function makeBytecodeFunction(
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

function createNoDelegateContext(): EvaluationContext {
  const ctx = createEvaluationContext()
  ctx.applyCallable = () => {
    throw new Error('ctx.applyCallable should not run for bytecode calls')
  }
  return ctx
}

function makeIntrinsicRuntime(name: string) {
  const op = v.nativeFn(name, () => v.nil())
  const env = makeEnv()
  const core = makeNamespace('clojure.core')
  define(name, op, env)
  core.vars.set(name, v.var('clojure.core', name, op))

  const ctx = createEvaluationContext()
  ctx.resolveNs = (nsName) => (nsName === 'clojure.core' ? core : null)

  return { env, ctx }
}

function executeIntrinsicChunk(
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

describe('VM Hand written chunks', () => {
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

  it('disassembles local loads', () => {
    const chunk = makeChunk('load-local-disassemble-test')

    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 0)
    emit(chunk, Op.Return)

    expect(disassembleChunk(chunk)).toBe(
      [
        '== load-local-disassemble-test ==',
        '0000 LoadLocal 0',
        '0002 Return',
      ].join('\n')
    )
  })

  it('disassembles local stores', () => {
    const chunk = makeChunk('store-local-disassemble-test')

    emit(chunk, Op.StoreLocal)
    emitOperand(chunk, 0)
    emit(chunk, Op.Return)

    expect(disassembleChunk(chunk)).toBe(
      [
        '== store-local-disassemble-test ==',
        '0000 StoreLocal 0',
        '0002 Return',
      ].join('\n')
    )
  })

  it('disassembles recur with its loop target', () => {
    const chunk = makeChunk('recur-disassemble-test')

    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(2)))
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(1)))
    emit(chunk, Op.Recur)
    emitOperand(chunk, 0)
    emitOperand(chunk, 2)
    emitOperand(chunk, 8)
    emit(chunk, Op.Return)

    expect(disassembleChunk(chunk)).toBe(
      [
        '== recur-disassemble-test ==',
        '0000 Constant 0 ; 2',
        '0002 Constant 1 ; 1',
        '0004 Recur 0 2 -> 0008',
        '0008 Return',
      ].join('\n')
    )
  })

  it.each([
    ['Add', Op.Add],
    ['Sub', Op.Sub],
    ['Mul', Op.Mul],
    ['Div', Op.Div],
    ['Lt', Op.Lt],
    ['Lte', Op.Lte],
    ['Gt', Op.Gt],
    ['Gte', Op.Gte],
    ['Eq', Op.Eq],
  ])('disassembles %s with argc', (name, op) => {
    const chunk = makeChunk('intrinsic-disassemble-test')

    emit(chunk, op)
    emitOperand(chunk, 2)
    emit(chunk, Op.Return)

    expect(disassembleChunk(chunk)).toBe(
      ['== intrinsic-disassemble-test ==', `0000 ${name} 2`, '0002 Return'].join(
        '\n'
      )
    )
  })

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

    // Fails with underflow
    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)

    rollbackChunk(chunk, snapshot)

    // Passes with valid operand size
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

    // Fails with underflow
    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)

    rollbackChunk(chunk, snapshot)

    // Passes with valid operand size
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

    // Fails with underflow
    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)

    rollbackChunk(chunk, snapshot)

    // Passes with valid operand size
    emit(chunk, Op.MakeSet)
    emitOperand(chunk, 3)
    emit(chunk, Op.Return)

    expect(
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toEqual(v.set([v.number(1), v.number(2), v.number(3)]))
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

function printNumber(value: CljValue): string {
  return value.kind === 'number' ? String(value.value) : '?'
}
