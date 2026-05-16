import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { createSession } from '../../session'
import { disassembleChunk } from '../debug'
import { compileFnBodyForTest } from './compiler-test-utils'

describe('VM function closure and upvalue compilation', () => {
  it('compiles nested non-capturing fn* to Closure', () => {
    const chunk = compileFnBodyForTest([], ['(fn* [y] (+ y 1))'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.innerFunctions).toHaveLength(1)
    expect(chunk.innerFunctions[0].upvalueDescriptors).toEqual([])
    expect(chunk.innerFunctions[0].arities[0].chunk.localCount).toBe(1)
    expect(disassembleChunk(chunk)).toBe(
      ['== vm-fn-body ==', '0000 Closure 0', '0002 Return'].join('\n')
    )
  })

  it('compiles and executes calls to nested non-capturing fn*', () => {
    expect(
      createSession().evaluate('((fn [x] ((fn* [y] (+ y 1)) x)) 41)')
    ).toEqual(v.number(42))
  })

  it('compiles multi-arity nested fn* as one closure template', () => {
    const chunk = compileFnBodyForTest(
      [],
      ['(fn* ([x] (+ x 1)) ([x y] (+ x y)))']
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.innerFunctions).toHaveLength(1)
    expect(chunk.innerFunctions[0].arities).toHaveLength(2)
    expect(
      createSession().evaluate(
        '((fn [argc] (let* [f (fn* ([x] (+ x 1)) ([x y] (+ x y)))] (if (= argc 1) (f 41) (f 20 22)))) 2)'
      )
    ).toEqual(v.number(42))
  })

  it('falls back for nested fn* with an unsupported body and rolls back the template', () => {
    // catch body contains async, which remains unsupported in the VM compiler.
    const chunk = compileFnBodyForTest(
      [],
      ['(do (fn* [] (try 1 (catch :default e (async e)))) 42)']
    )

    expect(chunk).toBeNull()
  })

  it('compiles nested fn* captures to LoadUpvalue', () => {
    const chunk = compileFnBodyForTest(['x'], ['(fn* [] x)'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.innerFunctions).toHaveLength(1)
    expect(chunk.innerFunctions[0].upvalueDescriptors).toEqual([
      { isLocal: true, index: 0 },
    ])
    expect(disassembleChunk(chunk.innerFunctions[0].arities[0].chunk)).toBe(
      ['== vm-fn-body ==', '0000 LoadUpvalue 0', '0002 Return'].join('\n')
    )
  })

  it('executes nested fn* capturing an outer local', () => {
    expect(
      createSession().evaluate('((fn [] (let* [x 10] ((fn* [] x)))))')
    ).toEqual(v.number(10))
  })

  it('keeps returned closure upvalues alive after the defining frame returns', () => {
    expect(
      createSession().evaluate('((fn [] ((let* [x 10] (fn* [] x)))))')
    ).toEqual(v.number(10))
  })

  it('captures parent params through make-adder style closures', () => {
    expect(
      createSession().evaluate(
        '((fn [] (let* [make-adder (fn* [x] (fn* [y] (+ x y))) add10 (make-adder 10)] (add10 5))))'
      )
    ).toEqual(v.number(15))
  })

  it('preserves lexical shadowing for captured locals', () => {
    expect(
      createSession().evaluate(
        '((fn [] (let* [x 1 f (fn* [] x)] (let* [x 2] (f)))))'
      )
    ).toEqual(v.number(1))
  })

  it('relays upvalues through multi-level closure chains', () => {
    expect(
      createSession().evaluate(
        '((fn [] (let* [x 7 f (((fn* [] (fn* [] (fn* [] x)))))] (f))))'
      )
    ).toEqual(v.number(7))
  })

  it('shares captured upvalues across multi-arity nested fn*', () => {
    expect(
      createSession().evaluate(
        '((fn [] (let* [x 10 f (fn* ([a] (+ x a)) ([a b] (+ x a b)))] [(f 1) (f 1 2)])))'
      )
    ).toEqual(v.vector([v.number(11), v.number(13)]))
  })

  it('compiles nested rest-param fn* closures', () => {
    const chunk = compileFnBodyForTest([], ['(fn* [x & more] more)'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.innerFunctions).toHaveLength(1)
    expect(chunk.innerFunctions[0].arities[0].restParam?.name).toBe('more')
    expect(chunk.innerFunctions[0].arities[0].chunk.localCount).toBe(2)
  })

  it('does not store bytecodeBody when the body closes over an outer local', () => {
    const fn = createSession({ vmExecutionMode: 'function-body' }).evaluate(
      '(let* [x 10] (fn [] x))'
    )

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeUndefined()
    expect(createSession().evaluate('((let* [x 10] (fn [] x)))')).toEqual(
      v.number(10)
    )
  })

  it('executes a nested fn* that captures loop-local slots', () => {
    const fn = createSession().evaluate(
      '(fn [] (loop* [i 0] (if (= i 1) (let* [f (fn* [] i)] (f)) (recur (+ i 1)))))'
    )

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    expect(
      createSession().evaluate(
        '((fn [] (loop* [i 0] (if (= i 1) (let* [f (fn* [] i)] (f)) (recur (+ i 1))))))'
      )
    ).toEqual(v.number(1))
  })

  it('closes captured loop locals before recur rewrites the slots', () => {
    expect(
      createSession().evaluate(
        '((fn [] (let* [fns (loop* [i 0 fns []] (if (= i 3) fns (recur (+ i 1) (conj fns (fn* [] i))))) f0 (nth fns 0) f1 (nth fns 1) f2 (nth fns 2)] [(f0) (f1) (f2)])))'
      )
    ).toEqual(v.vector([v.number(0), v.number(1), v.number(2)]))
  })

  it('closes multiple captured loop locals together before recur', () => {
    expect(
      createSession().evaluate(
        '((fn [] (let* [fns (loop* [i 0 j 10 fns []] (if (= i 2) fns (recur (+ i 1) (+ j 10) (conj fns (fn* [] [i j]))))) f0 (nth fns 0) f1 (nth fns 1)] [(f0) (f1)])))'
      )
    ).toEqual(
      v.vector([
        v.vector([v.number(0), v.number(10)]),
        v.vector([v.number(1), v.number(20)]),
      ])
    )
  })
})
