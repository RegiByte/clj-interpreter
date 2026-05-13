import { describe, expect, it } from 'vitest'
import { createEvaluationContext } from '../../evaluator'
import { v } from '../../factories'
import { disassembleChunk } from '../debug'
import { executeChunk } from '../vm'
import {
  compileFnBodyForTest,
  expectVmFnBodyCompilesTo,
  makeCallTestEnv,
} from './compiler-test-utils'

describe('VM function body locals and let* compilation', () => {
  it('compiles a parameter reference to LoadLocal', () => {
    const chunk = compileFnBodyForTest(['x'], ['x'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(1)
    expect(disassembleChunk(chunk)).toBe(
      ['== vm-fn-body ==', '0000 LoadLocal 0', '0002 Return'].join('\n')
    )
  })

  it('executes a compiled parameter reference', () => {
    expectVmFnBodyCompilesTo(['x'], ['x'], [v.number(42)], v.number(42))
  })

  it('resolves each parameter to its own local slot', () => {
    const chunk = compileFnBodyForTest(['x', 'y'], ['y'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(2)
    expect(disassembleChunk(chunk)).toBe(
      ['== vm-fn-body ==', '0000 LoadLocal 1', '0002 Return'].join('\n')
    )

    expect(
      executeChunk({
        chunk,
        env: makeCallTestEnv(),
        ctx: createEvaluationContext(),
        locals: [v.number(10), v.number(20)],
      })
    ).toEqual(v.number(20))
  })

  it('compiles calls that read parameter locals', () => {
    const chunk = compileFnBodyForTest(['x'], ['(+ x 2)'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 LoadLocal 0',
        '0002 Constant 0 ; 2',
        '0004 Add 2',
        '0006 Return',
      ].join('\n')
    )

    expect(
      executeChunk({
        chunk,
        env: makeCallTestEnv(),
        ctx: createEvaluationContext(),
        locals: [v.number(40)],
      })
    ).toEqual(v.number(42))
  })

  it('compiles multi-form function bodies with Pop between forms', () => {
    const chunk = compileFnBodyForTest(['x'], ['(+ x 1)', '(+ x 2)'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 LoadLocal 0',
        '0002 Constant 0 ; 1',
        '0004 Add 2',
        '0006 Pop',
        '0007 LoadLocal 0',
        '0009 Constant 1 ; 2',
        '0011 Add 2',
        '0013 Return',
      ].join('\n')
    )

    expect(
      executeChunk({
        chunk,
        env: makeCallTestEnv(),
        ctx: createEvaluationContext(),
        locals: [v.number(40)],
      })
    ).toEqual(v.number(42))
  })

  it.each([
    ['def', '(def y x)'],
    ['quote', '(quote x)'],
    ['var', '(var x)'],
    ['lazy-seq', '(lazy-seq x)'],
    ['async', '(async x)'],
    ['JS interop dot', '(. x foo)'],
    ['JS constructor interop', '(js/new Date)'],
    ['ns', '(ns demo.vm-test)'],
    ['defmacro', '(defmacro m [] x)'],
    ['letfn*', '(letfn* [f (fn* [] x)] (f))'],
  ])(
    'falls back when a function body contains unsupported %s',
    (_label, code) => {
      expect(compileFnBodyForTest(['x'], [code])).toBeNull()
    }
  )

  it('compiles rest params into the slot after fixed params', () => {
    const chunk = compileFnBodyForTest(['x'], ['more'], { restParam: 'more' })

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(2)
    expect(disassembleChunk(chunk)).toBe(
      ['== vm-fn-body ==', '0000 LoadLocal 1', '0002 Return'].join('\n')
    )
  })

  it('compiles let* by allocating slots after params', () => {
    const chunk = compileFnBodyForTest(['x'], ['(let* [y (+ x 1)] y)'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(2)
    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 LoadLocal 0',
        '0002 Constant 0 ; 1',
        '0004 Add 2',
        '0006 StoreLocal 1',
        '0008 LoadLocal 1',
        '0010 Return',
      ].join('\n')
    )
  })

  it('executes a compiled let* local binding', () => {
    expectVmFnBodyCompilesTo(
      ['x'],
      ['(let* [y (+ x 1)] y)'],
      [v.number(41), v.nil()],
      v.number(42)
    )
  })

  it('compiles sequential let* bindings where later init expressions see earlier locals', () => {
    const chunk = compileFnBodyForTest(
      ['x'],
      ['(let* [y (+ x 1) z (+ y 1)] z)']
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(3)
    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 LoadLocal 0',
        '0002 Constant 0 ; 1',
        '0004 Add 2',
        '0006 StoreLocal 1',
        '0008 LoadLocal 1',
        '0010 Constant 1 ; 1',
        '0012 Add 2',
        '0014 StoreLocal 2',
        '0016 LoadLocal 2',
        '0018 Return',
      ].join('\n')
    )
  })

  it('pops intermediate let* body forms before returning the last body value', () => {
    const chunk = compileFnBodyForTest(['x'], ['(let* [y (+ x 1)] y (+ y 1))'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 LoadLocal 0',
        '0002 Constant 0 ; 1',
        '0004 Add 2',
        '0006 StoreLocal 1',
        '0008 LoadLocal 1',
        '0010 Pop',
        '0011 LoadLocal 1',
        '0013 Constant 1 ; 1',
        '0015 Add 2',
        '0017 Return',
      ].join('\n')
    )
  })

  it('lets inner let* bindings shadow params without changing the param slot', () => {
    expectVmFnBodyCompilesTo(
      ['x'],
      ['(let* [x (+ x 1)] x)'],
      [v.number(41), v.nil()],
      v.number(42)
    )
  })

  it('restores shadowed local mappings after leaving let* scope', () => {
    const chunk = compileFnBodyForTest(['x'], ['(let* [x (+ x 1)] x)', 'x'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 LoadLocal 0',
        '0002 Constant 0 ; 1',
        '0004 Add 2',
        '0006 StoreLocal 1',
        '0008 LoadLocal 1',
        '0010 Pop',
        '0011 LoadLocal 0',
        '0013 Return',
      ].join('\n')
    )

    expect(
      executeChunk({
        chunk,
        env: makeCallTestEnv(),
        ctx: createEvaluationContext(),
        locals: [v.number(41), v.nil()],
      })
    ).toEqual(v.number(41))
  })

  it.each([
    ['missing binding vector', '(let*)'],
    ['non-vector bindings', '(let* :not-a-vector x)'],
    ['odd binding count', '(let* [y 1 z] z)'],
    ['non-symbol binding name', '(let* [:y 1] :y)'],
  ])('falls back for malformed let*: %s', (_label, code) => {
    expect(compileFnBodyForTest(['x'], [code])).toBeNull()
  })
})
