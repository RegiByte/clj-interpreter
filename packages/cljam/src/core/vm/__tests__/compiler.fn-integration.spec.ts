import { describe, expect, it } from 'vitest'
import { createEvaluationContext } from '../../evaluator'
import { applyFunctionWithContext } from '../../evaluator/apply'
import { v } from '../../factories'
import { createSession } from '../../session'
import { tryCompileVmFnBody } from '../compiler'
import { formToNode } from './compiler-test-utils'

describe('VM function body integration', () => {
  it('reports nested function-body fallback reasons through structured compilation', () => {
    const result = tryCompileVmFnBody(
      [],
      null,
      [
        formToNode(
          '(let* [cat (fn* cat [xy zs] (try 1 (catch :default e (async e))))] cat)'
        ),
      ]
    )

    expect(result).toEqual({
      ok: false,
      reason: {
        category: 'unsupported-special-form',
        detail: 'VM does not support special form async',
      },
    })
  })

  it('stores bytecodeBody on fn arities with VM-compilable bodies', () => {
    const fn = createSession().evaluate('(fn [x] (+ x 1))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    expect(fn.arities[0].bytecodeBody?.localCount).toBe(1)
  })

  it('executes bytecodeBody through normal function application', () => {
    const fn = createSession().evaluate('(fn [x] (+ x 2))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    fn.arities[0].compiledBody = () => {
      throw new Error('compiledBody should not run when bytecodeBody exists')
    }

    const result = applyFunctionWithContext(
      fn,
      [v.number(40)],
      createEvaluationContext(),
      fn.env
    )

    expect(result).toEqual(v.number(42))
  })

  it.each([
    ['identity fn', '((fn [x] x) 42)', v.number(42)],
    ['two-arg fn', '((fn [x y] y) 10 20)', v.number(20)],
    ['if body', '((fn [x] (if x 1 2)) true)', v.number(1)],
    ['multi-form body', '((fn [x] (+ x 1) (+ x 2)) 40)', v.number(42)],
    [
      'collection body',
      '((fn [x] [x (+ x 1)]) 4)',
      v.vector([v.number(4), v.number(5)]),
    ],
  ])('evaluates %s through the session', (_label, code, expected) => {
    expect(createSession().evaluate(code)).toEqual(expected)
  })

  it('stores bytecodeBody for let* bodies and evaluates them through normal application', () => {
    const fn = createSession().evaluate('(fn [x] (let* [y (+ x 1)] y))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    expect(
      applyFunctionWithContext(
        fn,
        [v.number(41)],
        createEvaluationContext(),
        fn.env
      )
    ).toEqual(v.number(42))
  })

  it.each([
    ['single local', '((fn [x] (let* [y (+ x 1)] y)) 41)', v.number(42)],
    [
      'sequential locals',
      '((fn [x] (let* [y (+ x 1) z (+ y 1)] z)) 40)',
      v.number(42),
    ],
    ['local shadowing', '((fn [x] (let* [x (+ x 1)] x)) 41)', v.number(42)],
    [
      'shadowing does not leak',
      '((fn [x] (let* [x (+ x 1)] x) x) 41)',
      v.number(41),
    ],
  ])('evaluates let* function body with %s', (_label, code, expected) => {
    expect(createSession().evaluate(code)).toEqual(expected)
  })

  it('evaluates bytecode function calls from another bytecode function', () => {
    const s = createSession()
    s.evaluate('(def inc1 (fn [x] (+ x 1)))')
    s.evaluate('(def twice (fn [x] (inc1 (inc1 x))))')

    expect(s.evaluate('(twice 40)')).toEqual(v.number(42))
  })

  it('reports nested bytecode function frames in caught runtime errors', () => {
    const s = createSession()
    s.evaluate('(defn trace-inner [] (/ 1 0))')
    s.evaluate('(defn trace-outer [] (trace-inner))')

    const result = s.evaluate(
      '(try (trace-outer) (catch :error/runtime e (mapv :fn (:frames e))))'
    )

    expect(result).toEqual(
      v.vector([
        v.string('/'),
        v.string('trace-inner'),
        v.string('trace-outer'),
      ])
    )
  })

  it('does not accumulate synthesized VM frames across repeated failures', () => {
    const s = createSession()
    s.evaluate('(defn repeat-inner [] (/ 1 0))')
    s.evaluate('(defn repeat-outer [] (repeat-inner))')

    expect(
      s.evaluate(
        '(try (repeat-outer) (catch :error/runtime e (count (:frames e))))'
      )
    ).toEqual(v.number(3))
    expect(
      s.evaluate(
        '(try (repeat-outer) (catch :error/runtime e (count (:frames e))))'
      )
    ).toEqual(v.number(3))
  })

  it('keeps locals isolated across recursive bytecode frames', () => {
    const s = createSession()
    s.evaluate(
      '(def triangle (fn [n acc] (if (= n 0) acc (triangle (- n 1) (+ acc n)))))'
    )

    expect(s.evaluate('(triangle 4 0)')).toEqual(v.number(10))
  })

  it('preserves arity mismatch errors for bytecode-backed functions', () => {
    expect(() =>
      createSession().evaluate('(let* [f (fn [x] x)] (f))')
    ).toThrow('No matching arity for 0 arguments. Available arities: 1')
  })

  it('falls back to namespace-redefined operators at intrinsic execution time', () => {
    const s = createSession()
    s.evaluate('(def + (fn [a b] 99))')

    expect(s.evaluate('((fn [] (+ 1 2)))')).toEqual(v.number(99))
  })

  it('stores bytecodeBody for rest-param arities', () => {
    const fn = createSession().evaluate('(fn [x & more] more)')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    expect(fn.arities[0].bytecodeBody?.localCount).toBe(2)
  })

  it('evaluates empty and non-empty rest params through bytecodeBody', () => {
    const s = createSession()

    s.evaluate('(def resty (fn [x & more] more))')

    expect(s.evaluate('(resty 1)')).toEqual(v.nil())
    expect(s.evaluate('(resty 1 2 3)')).toEqual(
      v.list([v.number(2), v.number(3)])
    )
  })

  it('prefers exact bytecode arity over variadic bytecode arity', () => {
    const s = createSession()
    const fn = s.evaluate('(fn ([x] :exact) ([x & more] more))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    expect(fn.arities[1].bytecodeBody).toBeDefined()
    expect(s.evaluate('((fn ([x] :exact) ([x & more] more)) 1)')).toEqual(
      v.keyword(':exact')
    )
    expect(s.evaluate('((fn ([x] :exact) ([x & more] more)) 1 2)')).toEqual(
      v.list([v.number(2)])
    )
  })
})
