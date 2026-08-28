import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { createSession } from '../../session'
import { disassembleChunk } from '../debug'
import {
  compileFnBodyForTest,
  formToNode,
  tryCompileVmFnBody,
} from './compiler-test-utils'

describe('VM letfn* compilation', () => {
  it('compiles a single binding as closure storage plus body call', () => {
    const chunk = compileFnBodyForTest([], [
      '(letfn* [f (fn* [] 42)] (f))',
    ])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(1)
    expect(chunk.innerFunctions).toHaveLength(1)
    expect(chunk.innerFunctions[0]?.name).toBe('f')
    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 Closure 0',
        '0002 StoreLocal 0',
        '0004 LoadLocal 0',
        '0006 Call 0',
        '0008 Return',
      ].join('\n')
    )
  })

  it('compiles mutual recursion by capturing sibling slots as upvalues', () => {
    const chunk = compileFnBodyForTest([], [
      '(letfn* [even? (fn* [n] (if (= n 0) true (odd? (- n 1)))) odd? (fn* [n] (if (= n 0) false (even? (- n 1))))] (even? 4))',
    ])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.innerFunctions[0]?.upvalueDescriptors).toEqual([
      { isLocal: true, index: 1 },
    ])
    expect(chunk.innerFunctions[1]?.upvalueDescriptors).toEqual([
      { isLocal: true, index: 0 },
    ])
  })

  it('calls the binding through the captured slot, not a self-slot (RB-007)', () => {
    // The analyzer captures the letfn binding as an upvalue (legacy compiled
    // self-named tail calls to FnRecur) — the intended divergence that fixes
    // rebinding visibility (RB-007 class).
    const chunk = compileFnBodyForTest([], [
      '(letfn* [down (fn* [n] (if (= n 0) n (down (- n 1))))] (down 3))',
    ])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const arityChunk = chunk.innerFunctions[0]?.arities[0]?.chunk
    expect(arityChunk).toBeDefined()
    if (arityChunk === undefined) return

    const disassembly = disassembleChunk(arityChunk)
    expect(disassembly).toContain('LoadUpvalue 0')
    expect(disassembly).toContain('Call 1')
    expect(disassembly).not.toContain('FnRecur')
  })

  it('keeps nested shadowing from becoming a self-tail-call', () => {
    const chunk = compileFnBodyForTest([], [
      '(letfn* [f (fn* [n] (let* [f (fn* [x] x)] (f n)))] (f 1))',
    ])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const arityChunk = chunk.innerFunctions[0]?.arities[0]?.chunk
    expect(arityChunk).toBeDefined()
    if (arityChunk === undefined) return

    const disassembly = disassembleChunk(arityChunk)
    expect(disassembly).toContain('Call 1')
    expect(disassembly).not.toContain('FnRecur')
  })

  it('evaluates a basic single binding', () => {
    expect(
      createSession().evaluate('(letfn [(f [x] (+ x 1))] (f 5))')
    ).toEqual(v.number(6))
  })

  it('evaluates mutual recursion', () => {
    expect(
      createSession().evaluate(
        '(letfn [(even? [n] (if (= n 0) true (odd? (- n 1)))) (odd? [n] (if (= n 0) false (even? (- n 1))))] [(even? 10) (odd? 10)])'
      )
    ).toEqual(v.vector([v.boolean(true), v.boolean(false)]))
  })

  it('evaluates multi-arity local functions', () => {
    expect(
      createSession().evaluate(
        '(letfn [(f ([x] (f x 10)) ([x y] (+ x y)))] (f 5))'
      )
    ).toEqual(v.number(15))
  })

  it('keeps escaping letfn* closures connected to captured siblings', () => {
    expect(
      createSession().evaluate(
        '(let [f (letfn [(f [n] (if (= n 0) :done (g (- n 1)))) (g [n] (f n))] f)] (f 3))'
      )
    ).toEqual(v.keyword(':done'))
  })

  it('captures surrounding locals from letfn* functions', () => {
    expect(
      createSession().evaluate(
        '(let [base 10] (letfn [(f [x] (+ base x))] (f 5)))'
      )
    ).toEqual(v.number(15))
  })

  it('rolls back and reports nested fallback reasons for unsupported bodies', () => {
    const result = tryCompileVmFnBody(
      [],
      null,
      [formToNode('(letfn* [f (fn* [] (async 1))] (f))')]
    )

    expect(result).toEqual({
      ok: false,
      reason: {
        category: 'unsupported-special-form',
        detail: 'VM does not support special form async',
      },
    })
  })

  it.each([
    ['non-vector bindings', '(letfn* :bad nil)'],
    ['odd binding count', '(letfn* [f (fn* [] 1) g] (f))'],
    ['non-symbol name', '(letfn* [1 (fn* [] 1)] 1)'],
  ])('falls back without partial compilation for %s', (_label, code) => {
    expect(compileFnBodyForTest([], [code])).toBeNull()
  })

  it('compiles duplicate letfn* names — the last binding wins', () => {
    const chunk = compileFnBodyForTest([], [
      '(letfn* [f (fn* [] 1) f (fn* [] 2)] (f))',
    ])
    expect(chunk).not.toBeNull()

    expect(
      createSession().evaluate('(letfn* [f (fn* [] 1) f (fn* [] 2)] (f))')
    ).toEqual(v.number(2))
  })

  it('refuses non-fn letfn* binding values (the walker throws the same at runtime)', () => {
    const result = tryCompileVmFnBody([], null, [formToNode('(letfn* [f 1] f)')])

    expect(result).toMatchObject({
      ok: false,
      reason: {
        category: 'compile-error',
        detail: 'letfn* binding values must be functions',
      },
    })
    expect(() => createSession().evaluate('(letfn* [f 1] f)')).toThrow(
      'letfn* binding values must be functions'
    )
  })
})
