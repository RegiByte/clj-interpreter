import { describe, expect, it } from 'vitest'
import { createEvaluationContext } from '../../evaluator'
import { v } from '../../factories'
import { createSession } from '../../session'
import { disassembleChunk } from '../debug'
import { Op } from '../opcodes'
import { executeChunk } from '../vm'
import { expectVmFallsBack } from './helpers'
import {
  compileFnBodyForTest,
  expectVmFnBodyCompilesTo,
  formToNode,
  makeCallTestEnv,
  tryCompileVmFnBody,
} from './compiler-test-utils'

describe('VM loop* compilation', () => {
  it('compiles loop* without recur as local initialization plus body evaluation', () => {
    const chunk = compileFnBodyForTest([], ['(loop* [i 0] i)'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(1)
    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 Constant 0 ; 0',
        '0002 StoreLocal 0',
        '0004 LoadLocal 0',
        '0006 Return',
      ].join('\n')
    )
  })

  it('compiles loop* recur with a stable loop header after initialization', () => {
    const chunk = compileFnBodyForTest(
      [],
      ['(loop* [i 0] (if (= i 3) i (recur (+ i 1))))']
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(1)
    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 Constant 0 ; 0',
        '0002 StoreLocal 0',
        '0004 LoadLocal 0',
        '0006 Constant 1 ; 3',
        '0008 Eq 2',
        '0010 JumpIfFalsy 4 -> 0016',
        '0012 LoadLocal 0',
        '0014 Jump 10 -> 0026',
        '0016 LoadLocal 0',
        '0018 Constant 2 ; 1',
        '0020 Add 2',
        '0022 Recur 0 1 -> 0004',
        '0026 Return',
      ].join('\n')
    )
  })

  it('pops intermediate loop* body forms while keeping recur in tail position', () => {
    const chunk = compileFnBodyForTest(
      [],
      ['(loop* [i 0] i (if (= i 3) i (recur (+ i 1))))']
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(1)
    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 Constant 0 ; 0',
        '0002 StoreLocal 0',
        '0004 LoadLocal 0',
        '0006 Pop',
        '0007 LoadLocal 0',
        '0009 Constant 1 ; 3',
        '0011 Eq 2',
        '0013 JumpIfFalsy 4 -> 0019',
        '0015 LoadLocal 0',
        '0017 Jump 10 -> 0029',
        '0019 LoadLocal 0',
        '0021 Constant 2 ; 1',
        '0023 Add 2',
        '0025 Recur 0 1 -> 0004',
        '0029 Return',
      ].join('\n')
    )
  })

  it('uses localStart to target loop locals after function params', () => {
    const chunk = compileFnBodyForTest(
      ['base'],
      ['(loop* [i 0 acc base] (if (= i 3) acc (recur (+ i 1) (+ acc 10))))']
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(3)
    const recurOffset = chunk.code.indexOf(Op.Recur)
    expect(recurOffset).toBeGreaterThanOrEqual(0)
    expect(chunk.code.slice(recurOffset, recurOffset + 4)).toEqual([
      Op.Recur,
      1,
      2,
      8,
    ])
  })

  it('executes a compiled loop* recur function body', () => {
    expectVmFnBodyCompilesTo(
      [],
      ['(loop* [i 0] (if (= i 3) i (recur (+ i 1))))'],
      [v.nil()],
      v.number(3)
    )
  })

  it('executes recur updates as simultaneous assignment', () => {
    expectVmFnBodyCompilesTo(
      [],
      ['(loop* [a 1 b 2 done false] (if done [a b] (recur b a true)))'],
      [v.nil(), v.nil(), v.nil()],
      v.vector([v.number(2), v.number(1)])
    )
  })

  it('keeps loop local slots contiguous when init expressions allocate temporaries', () => {
    expectVmFnBodyCompilesTo(
      [],
      [
        '(loop* [acc (let* [x 0] x) n 0 limit 2 seen false] (if (= n limit) acc (recur (+ acc n) (+ n 1) limit seen)))',
      ],
      [v.nil(), v.nil(), v.nil(), v.nil(), v.nil()],
      v.number(1)
    )
  })

  it('compiles nested loop* forms so inner recur targets the inner loop', () => {
    const chunk = compileFnBodyForTest(
      [],
      [
        '(loop* [i 0 total 0] (if (= i 3) total (recur (+ i 1) (+ total (loop* [j 0 inner 0] (if (= j i) inner (recur (+ j 1) (+ inner j))))))))',
      ]
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const recurOffsets = chunk.code
      .map((cell, index) => (cell === Op.Recur ? index : -1))
      .filter((index) => index >= 0)

    expect(recurOffsets.length).toBe(2)

    const outerRecur = chunk.code.slice(recurOffsets[1], recurOffsets[1] + 4)
    const innerRecur = chunk.code.slice(recurOffsets[0], recurOffsets[0] + 4)

    expect(innerRecur[1]).toBe(2)
    expect(innerRecur[2]).toBe(2)
    expect(innerRecur[3]).toBeGreaterThan(0)

    expect(outerRecur).toEqual([Op.Recur, 0, 2, 8])
  })

  it('executes nested loop* forms with independent recur targets', () => {
    expectVmFnBodyCompilesTo(
      [],
      [
        '(loop* [i 0 total 0] (if (= i 3) total (recur (+ i 1) (+ total (loop* [j 0 inner 0] (if (= j i) inner (recur (+ j 1) (+ inner j))))))))',
      ],
      [v.nil(), v.nil(), v.nil(), v.nil()],
      v.number(1)
    )
  })

  it.each([
    ['non-vector bindings', '(loop* :not-a-vector x)'],
    ['odd binding count', '(loop* [i 0 acc] acc)'],
    ['non-symbol binding name', '(loop* [:i 0] :i)'],
    ['wrong recur arity', '(loop* [i 0 acc 0] (recur (+ i 1)))'],
  ])('falls back for malformed or unsupported loop*: %s', (_label, code) => {
    expect(compileFnBodyForTest([], [code])).toBeNull()
  })
})

describe('VM function-level recur compilation', () => {
  it('compiles tail-position function-level recur to FnRecur', () => {
    const chunk = compileFnBodyForTest(
      ['n', 'acc'],
      ['(if (= n 0) acc (recur (- n 1) (+ acc n)))']
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(2)
    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 LoadLocal 0',
        '0002 Constant 0 ; 0',
        '0004 Eq 2',
        '0006 JumpIfFalsy 4 -> 0012',
        '0008 LoadLocal 1',
        '0010 Jump 14 -> 0026',
        '0012 LoadLocal 0',
        '0014 Constant 1 ; 1',
        '0016 Sub 2',
        '0018 LoadLocal 1',
        '0020 LoadLocal 0',
        '0022 Add 2',
        '0024 FnRecur 2 -> 0000',
        '0026 Return',
      ].join('\n')
    )
  })

  it('executes function-level recur without growing VM frames', () => {
    expectVmFnBodyCompilesTo(
      ['n', 'acc'],
      ['(if (= n 0) acc (recur (- n 1) (+ acc n)))'],
      [v.number(5), v.number(0)],
      v.number(15)
    )
  })

  it('executes function-level recur updates as simultaneous assignment', () => {
    expectVmFnBodyCompilesTo(
      ['a', 'b', 'done'],
      ['(if done [a b] (recur b a true))'],
      [v.number(1), v.number(2), v.boolean(false)],
      v.vector([v.number(2), v.number(1)])
    )
  })

  it('compiles variadic function-level recur to FnRecurRest', () => {
    const chunk = compileFnBodyForTest(
      ['done', 'x'],
      ['(if done more (recur true x [2 3]))'],
      { restParam: 'more' }
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toContain('FnRecurRest 3 2 -> 0000')
  })

  it('packages the final recur arg into the rest slot (fixed+1 arity)', () => {
    expectVmFnBodyCompilesTo(
      ['done', 'x'],
      ['(if done more (recur true x [2 3]))'],
      [v.boolean(false), v.number(1), v.nil()],
      v.list([v.vector([v.number(2), v.number(3)])]),
      { restParam: 'more' }
    )
  })

  it.each([
    ['extra args beyond fixed+1', '(if done more (recur true x 2 3))', 4],
    ['fewer args than fixed+1', '(if done more (recur true x))', 2],
  ])(
    'rejects variadic recur arg counts that are not fixed+1 — %s',
    (_label, body, got) => {
      const result = tryCompileVmFnBody(
        [v.symbol('done'), v.symbol('x')],
        v.symbol('more'),
        [formToNode(body)]
      )

      expect(result).toMatchObject({
        ok: false,
        reason: {
          category: 'compile-error',
          detail: `recur expects 3 arguments but got ${got}`,
        },
      })
    }
  )

  it('evaluates variadic recur arguments before rewriting function slots', () => {
    expectVmFnBodyCompilesTo(
      ['done', 'a', 'b'],
      ['(if done [a b more] (recur true b a b))'],
      [v.boolean(false), v.number(1), v.number(2), v.nil()],
      v.vector([v.number(2), v.number(1), v.list([v.number(2)])]),
      { restParam: 'more' }
    )
  })

  it('pops intermediate function body forms before tail-position recur', () => {
    const chunk = compileFnBodyForTest(
      ['n'],
      ['(+ n 10)', '(if (= n 0) n (recur (- n 1)))']
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toContain('0006 Pop')
    expect(disassembleChunk(chunk)).toContain('FnRecur 1 -> 0000')
    expect(
      executeChunk({
        chunk,
        env: makeCallTestEnv(),
        ctx: createEvaluationContext(),
        locals: [v.number(3)],
      })
    ).toEqual(v.number(0))
  })

  it('keeps nested loop* recur targeted at the loop, not the function', () => {
    const chunk = compileFnBodyForTest(
      ['n'],
      ['(loop* [i n] (if (= i 0) i (recur (- i 1))))']
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.code).toContain(Op.Recur)
    expect(chunk.code).not.toContain(Op.FnRecur)
    expect(
      executeChunk({
        chunk,
        env: makeCallTestEnv(),
        ctx: createEvaluationContext(),
        locals: [v.number(3), v.nil()],
      })
    ).toEqual(v.number(0))
  })

  it('falls back for function-level recur arity mismatch', () => {
    expect(compileFnBodyForTest(['n'], ['(recur n n)'])).toBeNull()
  })

  it('keeps top-level VM recur unsupported', () => {
    expectVmFallsBack('(recur 1)')
  })
})

describe('VM loop and recur integration', () => {
  it.each([
    [
      'counting loop',
      '((fn [] (loop* [i 0] (if (= i 3) i (recur (+ i 1))))))',
      v.number(3),
    ],
    [
      'factorial accumulator',
      '((fn [n] (loop* [i n acc 1] (if (= i 0) acc (recur (- i 1) (* acc i))))) 5)',
      v.number(120),
    ],
    ['loop without recur', '((fn [] (loop* [x 41] (+ x 1))))', v.number(42)],
    [
      'simultaneous assignment',
      '((fn [] (loop* [a 1 b 2 done false] (if done [a b] (recur b a true)))))',
      v.vector([v.number(2), v.number(1)]),
    ],
    [
      'loop can read params',
      '((fn [base] (loop* [i 0 acc base] (if (= i 3) acc (recur (+ i 1) (+ acc 10))))) 5)',
      v.number(35),
    ],
    [
      'let* inside loop body',
      '((fn [] (loop* [i 0] (let* [next (+ i 1)] (if (= next 3) next (recur next))))))',
      v.number(3),
    ],
    [
      'nested loop recur targets',
      '((fn [] (loop* [i 0 total 0] (if (= i 3) total (recur (+ i 1) (+ total (loop* [j 0 inner 0] (if (= j i) inner (recur (+ j 1) (+ inner j))))))))))',
      v.number(1),
    ],
  ])('evaluates loop* function body with %s', (_label, code, expected) => {
    expect(createSession({ vmExecutionMode: 'function-body' }).evaluate(code)).toEqual(expected)
  })

  it('evaluates loop arithmetic through intrinsic bytecode shape', () => {
    const code =
      '((fn [n] (loop* [i 0 acc 0] (if (= i n) acc (recur (+ i 1) (+ acc i))))) 5)'
    const fn = createSession({ vmExecutionMode: 'function-body' }).evaluate(
      '(fn [n] (loop* [i 0 acc 0] (if (= i n) acc (recur (+ i 1) (+ acc i)))))'
    )

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    const bytecodeBody = fn.arities[0].bytecodeBody
    expect(bytecodeBody).toBeDefined()
    if (bytecodeBody === undefined) return

    const disassembly = disassembleChunk(bytecodeBody)
    expect(disassembly).toContain('Eq 2')
    expect(disassembly).toContain('Add 2')
    expect(createSession({ vmExecutionMode: 'function-body' }).evaluate(code)).toEqual(v.number(10))
  })

  it('evaluates function-level recur through bytecodeBody', () => {
    const s = createSession({ vmExecutionMode: 'function-body' })
    const fn = s.evaluate(
      '(fn [n acc] (if (= n 0) acc (recur (- n 1) (+ acc n))))'
    )

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    expect(
      s.evaluate(
        '((fn [n acc] (if (= n 0) acc (recur (- n 1) (+ acc n)))) 5 0)'
      )
    ).toEqual(v.number(15))
  })

  it('runs function-level recur past the VM frame limit without pushing frames', () => {
    const s = createSession({ vmExecutionMode: 'function-body' })
    s.evaluate('(def down (fn [n] (if (= n 0) n (recur (- n 1)))))')

    expect(s.evaluate('(down 10005)')).toEqual(v.number(0))
  })

  it('raises analyzer-owned function-level recur arity mismatch', () => {
    let thrown: unknown
    try {
      createSession({ vmExecutionMode: 'function-body' }).evaluate('(fn [n] (recur n n))')
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(Error)
    expect((thrown as Error).message).toContain(
      'recur expects 1 arguments but got 2'
    )
    expect((thrown as { code?: string }).code).toBe('malformed/recur-arity')
  })

  it('raises analyzer-owned too few variadic recur args', () => {
    let thrown: unknown
    try {
      createSession({ vmExecutionMode: 'function-body' }).evaluate('(fn [x & more] (recur))')
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(Error)
    expect((thrown as Error).message).toContain(
      'recur expects 2 arguments but got 0'
    )
    expect((thrown as { code?: string }).code).toBe('malformed/recur-arity')
  })

  it('raises analyzer-owned loop* binding-shape errors', () => {
    let thrown: unknown
    try {
      createSession({ vmExecutionMode: 'function-body' }).evaluate('(fn [] (loop* [[a b] [1 2]] a))')
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(Error)
    expect((thrown as Error).message).toContain(
      'loop* only supports simple symbol bindings; use loop for destructuring'
    )
    expect((thrown as { code?: string }).code).toBe(
      'malformed/loop-binding-symbol'
    )
  })

  it('throws like the interpreter for non-tail recur in a loop* body', () => {
    const result = tryCompileVmFnBody(
      [],
      null,
      [formToNode('(loop* [i 0] (+ 1 (recur (+ i 1))))')]
    )

    expect(result).toMatchObject({
      ok: false,
      fatal: true,
      reason: {
        category: 'compile-error',
        detail: 'Can only recur from tail position',
      },
    })
    expect(() =>
      createSession({ vmExecutionMode: 'function-body' }).evaluate(
        '(fn [] (loop* [i 0] (+ 1 (recur (+ i 1)))))'
      )
    ).toThrow('Can only recur from tail position')
  })

  it('throws like the interpreter for loop* recur arity mismatch at runtime fallback', () => {
    expect(() =>
      createSession({ vmExecutionMode: 'function-body' }).evaluate(
        '((fn [] (loop* [i 0 acc 0] (recur (+ i 1)))))'
      )
    ).toThrow('recur expects 2 arguments but got 1')
  })
})
