import { describe, expect, it } from 'vitest'
import { define, makeEnv } from '../../env'
import { createEvaluationContext } from '../../evaluator'
import { v } from '../../factories'
import { createSession } from '../../session'
import type { CljValue } from '../../types'
import { disassembleChunk } from '../debug'
import { executeChunk } from '../vm'
import { expectVmEqualsInterpreter } from './helpers'
import { compileVm, expectVmCallCompilesTo, formToNode } from './compiler-test-utils'

describe('VM call compilation', () => {
  it.each([
    ['(+ 1 2)', 'Add'],
    ['(- 10 3)', 'Sub'],
    ['(* 2 3)', 'Mul'],
    ['(/ 10 2)', 'Div'],
    ['(< 1 2)', 'Lt'],
    ['(<= 1 1)', 'Lte'],
    ['(> 2 1)', 'Gt'],
    ['(>= 2 2)', 'Gte'],
    ['(= 1 1)', 'Eq'],
  ])('compiles %s to the %s intrinsic', (code, opcodeName) => {
    const chunk = compileVm(formToNode(code))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const disassembly = disassembleChunk(chunk)
    expect(disassembly).toContain(`${opcodeName} 2`)
    expect(disassembly).not.toContain('Call 2')
  })

  it('compiles (+ 1 2) to Add plus Return', () => {
    const chunk = compileVm(formToNode('(+ 1 2)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-expression ==',
        '0000 Constant 0 ; 1',
        '0002 Constant 1 ; 2',
        '0004 Add 2',
        '0006 Return',
      ].join('\n')
    )
  })

  it('executes compiled calls through applyCallable', () => {
    const chunk = compileVm(formToNode('(+ 1 2)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const env = makeEnv()
    define(
      '+',
      v.nativeFn('+', (a: CljValue, b: CljValue) => {
        if (a.kind !== 'number' || b.kind !== 'number') return v.nil()
        return v.number(a.value + b.value)
      }),
      env
    )

    expect(
      executeChunk({ chunk, env, ctx: createEvaluationContext() })
    ).toEqual(v.number(3))
  })

  it.each([
    ['(+)', v.number(0)],
    ['(+ 1)', v.number(1)],
    ['(+ 1 2 3)', v.number(6)],
    ['(- 10 3)', v.number(7)],
    ['(* 2 3 4)', v.number(24)],
    ['(forty-two)', v.number(42)],
  ])('executes compiled call expression %s', (code, expected) => {
    expectVmCallCompilesTo(code, expected)
  })

  it.each([
    '(/ 100 5 2)',
    '(< 1 2 3)',
    '(< 1 3 2)',
    '(<= 1 1 2)',
    '(> 3 2 1)',
    '(>= 3 1 2)',
    '(= [1 2] (list 1 2))',
  ])('matches interpreter semantics for intrinsic call %s', (code) => {
    expectVmEqualsInterpreter(code)
  })

  it('uses generic Call when an intrinsic operator is shadowed by a local', () => {
    const chunk = compileVm(formToNode('(let* [+ :answer] (+ {:answer 99}))'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const disassembly = disassembleChunk(chunk)
    expect(disassembly).toContain('LoadLocal 0')
    expect(disassembly).toContain('Call 1')
    expect(disassembly).not.toContain('Add 1')
    expect(createSession({ vmExecutionMode: 'function-body' }).evaluate('((fn [] (let* [+ :answer] (+ {:answer 99}))))')).toEqual(
      v.number(99)
    )
  })

  it('dispatches multimethod calls reached through bytecode', () => {
    const s = createSession({ vmExecutionMode: 'function-body' })
    s.evaluate('(defmulti choose :type)')
    s.evaluate('(defmethod choose :a [_] :A)')
    const fn = s.evaluate('(fn [x] (choose x))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    expect(s.evaluate('((fn [x] (choose x)) {:type :a})')).toEqual(
      v.keyword(':A')
    )
  })

  it('keeps qualified operators on the generic Call path', () => {
    const chunk = compileVm(formToNode('(clojure.core/+ 1 2)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const disassembly = disassembleChunk(chunk)
    expect(disassembly).toContain('LoadQualified 0 ; clojure.core/+')
    expect(disassembly).toContain('Call 2')
    expect(disassembly).not.toContain('Add 2')
  })

  it('compiles non-symbol callee expressions through generic Call', () => {
    const chunk = compileVm(formToNode('([1 2] 0)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const disassembly = disassembleChunk(chunk)
    expect(disassembly).toContain('MakeVector ; 2')
    expect(disassembly).toContain('Call 1')
  })

  it.each([
    ['(+ (+ 1 2) 3)', v.number(6)],
    ['(+ 1 (+ 2 3))', v.number(6)],
    ['(+ (+ 1 2) (+ 3 4))', v.number(10)],
  ])('executes nested compiled call expression %s', (code, expected) => {
    expectVmCallCompilesTo(code, expected)
  })

  it.each([
    ['(do (+ 1 2) (+ 3 4))', v.number(7)],
    ['(if true (+ 1 2) (+ 10 20))', v.number(3)],
    ['(if false (+ 1 2) (+ 10 20))', v.number(30)],
    ['(if (+ 0 0) (+ 1 2) (+ 10 20))', v.number(3)],
    ['(if (truthy? nil) (+ 1 2) (+ 10 20))', v.number(30)],
    ['(apply + 1 [2 3])', v.number(6)],
  ])('executes compiled call inside surrounding form %s', (code, expected) => {
    expectVmCallCompilesTo(code, expected)
  })

  it.each([
    ['(+ 1 (async 2))', 'unsupported async argument form'],
  ])('falls back for %s: %s', (code) => {
    expect(compileVm(formToNode(code))).toBeNull()
  })
})
