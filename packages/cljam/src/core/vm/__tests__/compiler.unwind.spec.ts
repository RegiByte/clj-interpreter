import { describe, expect, it } from 'vitest'
import { createEvaluationContext } from '../../evaluator'
import { applyFunctionWithContext } from '../../evaluator/apply'
import { v } from '../../factories'
import { createSession } from '../../session'
import { compileVm } from '../compiler'
import { disassembleChunk } from '../debug'
import { Op } from '../opcodes'
import {
  compileFnBodyForTest,
  expectSessionEvaluationError,
  formToNode,
} from './compiler-test-utils'

describe('VM direct throw compilation', () => {
  it('compiles canonical throw to direct Throw', () => {
    const chunk = compileVm(formToNode('(throw {:type :x})'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-expression ==',
        '0000 Constant 0 ; :type',
        '0002 Constant 1 ; :x',
        '0004 MakeMap ; 1',
        '0006 Throw',
        '0007 Return',
      ].join('\n')
    )
    expect(chunk.code).toContain(Op.Throw)
    expect(disassembleChunk(chunk)).not.toContain('LoadGlobal')
    expect(disassembleChunk(chunk)).not.toContain('Call')
  })

  it('keeps local throw bindings on the generic Call path', () => {
    const chunk = compileVm(
      formToNode('(let* [throw :answer] (throw {:answer 99}))')
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const disassembly = disassembleChunk(chunk)
    expect(disassembly).toContain('LoadLocal 0')
    expect(disassembly).toContain('Call 1')
    expect(disassembly).not.toContain('Throw')
    expect(
      createSession().evaluate(
        '((fn [] (let* [throw :answer] (throw {:answer 99}))))'
      )
    ).toEqual(v.number(99))
  })

  it.each(['(throw)', '(throw :a :b)'])(
    'keeps malformed throw arities on the generic Call path for %s',
    (code) => {
      const chunk = compileVm(formToNode(code))

      expect(chunk).not.toBeNull()
      if (chunk === null) return

      const disassembly = disassembleChunk(chunk)
      expect(disassembly).toContain('LoadGlobal 0 ; throw')
      expect(disassembly).toContain(`Call ${code === '(throw)' ? 0 : 2}`)
      expect(disassembly).not.toContain('Throw')
    }
  )
})

describe('VM try/catch unwind compilation', () => {
  it('stores bytecodeBody for catch-only try bodies and evaluates them through normal application', () => {
    const fn = createSession().evaluate('(fn [x] (try x (catch :default e e)))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    expect(fn.arities[0].bytecodeBody?.code).toContain(Op.PushTry)
    expect(fn.arities[0].bytecodeBody?.code).toContain(Op.PopTry)
    expect(
      applyFunctionWithContext(
        fn,
        [v.number(42)],
        createEvaluationContext(),
        fn.env
      )
    ).toEqual(v.number(42))
  })

  it('compiles catch-only try bodies to PushTry, PopTry, and catch table metadata', () => {
    const chunk = compileFnBodyForTest([], ['(try 42 (catch :default e e))'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.catchTables).toEqual([
      {
        clauses: [
          {
            discriminator: v.keyword(':default'),
            bindingSlot: 0,
            bodyIp: 9,
          },
        ],
      },
    ])
    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 PushTry 0 finally none after 0011',
        '0004 Constant 0 ; 42',
        '0006 PopTry',
        '0007 Jump 2 -> 0011',
        '0009 LoadLocal 0',
        '0011 Return',
      ].join('\n')
    )
  })

  it.each([
    ['predicate catch', '(try x (catch string? e e))'],
    ['unsupported catch body', '(try x (catch :default e (def caught e)))'],
  ])(
    'does not store bytecodeBody for unsupported try bodies with %s and still evaluates',
    (_label, code) => {
      const fn = createSession().evaluate(`(fn [x] ${code})`)

      expect(fn.kind).toBe('function')
      if (fn.kind !== 'function') return

      expect(fn.arities[0].bytecodeBody).toBeUndefined()
      expect(
        applyFunctionWithContext(
          fn,
          [v.number(42)],
          createEvaluationContext(),
          fn.env
        )
      ).toEqual(v.number(42))
    }
  )

  it('stores bytecodeBody for direct throw bodies', () => {
    const fn = createSession().evaluate('(fn [] (throw {:type :error/test}))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    expect(fn.arities[0].bytecodeBody?.code).toContain(Op.Throw)
  })

  it('surfaces direct bytecode map throws with current session behavior', () => {
    const error = expectSessionEvaluationError(
      '((fn [] (throw {:type :error/test :message "oops"})))'
    )

    expect(error.message).toBe(
      'Unhandled throw: {:type :error/test :message "oops"}'
    )
    expect(error.context).toEqual({
      thrownValue: v.map([
        [v.keyword(':type'), v.keyword(':error/test')],
        [v.keyword(':message'), v.string('oops')],
      ]),
    })
  })

  it('surfaces direct bytecode string throws with current session behavior', () => {
    const error = expectSessionEvaluationError('((fn [] (throw "bare string")))')

    expect(error.message).toBe('Unhandled throw: "bare string"')
    expect(error.context).toEqual({ thrownValue: v.string('bare string') })
  })

  it('does not inject frames into direct bytecode user-thrown maps', () => {
    expect(
      createSession().evaluate(
        '(try ((fn [] (throw {:type :error/test}))) (catch :error/test e (contains? e :frames)))'
      )
    ).toEqual(v.boolean(false))
  })

  it.each([
    [
      'no-throw path skips catch',
      '((fn [] (try 42 (catch :default e 0))))',
      v.number(42),
    ],
    [
      'direct throw caught by keyword type',
      '((fn [] (try (throw {:type :error/test :message "boom"}) (catch :error/test e (:type e)))))',
      v.keyword(':error/test'),
    ],
    [
      ':default catches a bare thrown string',
      '((fn [] (try (throw "oops") (catch :default e e))))',
      v.string('oops'),
    ],
    [
      'delegated native throw caught by keyword type',
      '((fn [throw] (try (throw {:type :native}) (catch :native e (:type e)))) throw)',
      v.keyword(':native'),
    ],
    [
      'first matching catch wins',
      '((fn [] (try (throw {:type :b}) (catch :a e :a) (catch :b e :b) (catch :default e :default))))',
      v.keyword(':b'),
    ],
    [
      'runtime EvaluationError caught as :error/runtime',
      '((fn [] (try (/ 1 0) (catch :error/runtime e (:type e)))))',
      v.keyword(':error/runtime'),
    ],
    [
      'runtime EvaluationError map includes message',
      '((fn [] (try (/ 1 0) (catch :error/runtime e (contains? e :message)))))',
      v.boolean(true),
    ],
    [
      'user-thrown map caught inside VM has no frames injected',
      '((fn [] (try (throw {:type :error/test}) (catch :error/test e (contains? e :frames)))))',
      v.boolean(false),
    ],
    [
      'nested catch-only try lets outer handler catch inner miss',
      '((fn [] (try (try (throw {:type :outer}) (catch :inner e :inner)) (catch :outer e :outer))))',
      v.keyword(':outer'),
    ],
  ])('evaluates catch-only try through bytecode: %s', (_label, code, expected) => {
    expect(createSession().evaluate(code)).toEqual(expected)
  })

  it('propagates non-matching VM catches like the interpreter', () => {
    const error = expectSessionEvaluationError(
      '((fn [] (try (throw {:type :x}) (catch :y e e))))'
    )

    expect(error.message).toBe('Unhandled throw: {:type :x}')
  })
})
