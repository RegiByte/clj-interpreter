import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { createSession } from '../../session'
import { tryCompileVmFnBody } from '../compiler'
import { disassembleChunk } from '../debug'
import { compileFnBodyForTest, formToNode } from './compiler-test-utils'

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

  it('uses the binding name as implicit self-name for tail calls', () => {
    const chunk = compileFnBodyForTest([], [
      '(letfn* [down (fn* [n] (if (= n 0) n (down (- n 1))))] (down 3))',
    ])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const arityChunk = chunk.innerFunctions[0]?.arities[0]?.chunk
    expect(arityChunk).toBeDefined()
    if (arityChunk === undefined) return

    const disassembly = disassembleChunk(arityChunk)
    expect(disassembly).toContain('FnRecur 1 -> 0000')
    expect(disassembly).not.toContain('Call 1')
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
      [formToNode('(letfn* [f (fn* [] (def x 1))] (f))')]
    )

    expect(result).toEqual({
      ok: false,
      reason: {
        category: 'unsupported-top-level-mutation',
        detail: 'VM does not support top-level mutation form def',
      },
    })
  })

  it.each([
    ['non-vector bindings', '(letfn* :bad nil)'],
    ['odd binding count', '(letfn* [f (fn* [] 1) g] (f))'],
    ['non-symbol name', '(letfn* [1 (fn* [] 1)] 1)'],
    ['duplicate name', '(letfn* [f (fn* [] 1) f (fn* [] 2)] (f))'],
    ['non-fn value', '(letfn* [f 1] f)'],
  ])('falls back without partial compilation for %s', (_label, code) => {
    expect(compileFnBodyForTest([], [code])).toBeNull()
  })
})
