import { describe, expect, it } from 'vitest'
import { addConstant, emit, emitOperand, makeChunk } from '../chunk'
import { define, makeEnv } from '../../env'
import { createEvaluationContext } from '../../evaluator'
import { EvaluationError } from '../../errors'
import { v } from '../../factories'
import type { CljValue, Pos } from '../../types'
import { Op } from '../opcodes'
import { executeChunk } from '../vm'
import {
  createNoDelegateContext,
  expectEvaluationError,
  frameNames,
  makeBytecodeFunction,
  printNumber,
} from './vm-test-utils'

describe('VM call and frame opcodes', () => {
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
})
