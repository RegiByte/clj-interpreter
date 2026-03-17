import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { expectError, freshSession } from './evaluator-test-utils'

describe('multi-arity fn', () => {
  it('should dispatch on argument count', () => {
    const session = freshSession()
    session.evaluate(`
      (def f (fn
        ([] 0)
        ([x] x)
        ([x y] (+ x y))))
    `)
    expect(session.evaluate('(f)')).toEqual(v.number(0))
    expect(session.evaluate('(f 5)')).toEqual(v.number(5))
    expect(session.evaluate('(f 3 4)')).toEqual(v.number(7))
  })

  it('should prefer exact fixed arity over variadic', () => {
    const session = freshSession()
    session.evaluate(`
      (def f (fn
        ([x] :exact)
        ([x & rest] :variadic)))
    `)
    expect(session.evaluate('(f 1)')).toEqual(v.keyword(':exact'))
    expect(session.evaluate('(f 1 2 3)')).toEqual(v.keyword(':variadic'))
  })

  it('should throw on arity mismatch with multi-arity fn', () => {
    expectError('((fn ([] 0) ([x y] (+ x y))) 1)', 'No matching arity for 1 arguments')
  })

  it('should support multi-arity defmacro', () => {
    const session = freshSession()
    session.evaluate(`
      (defmacro my-and
        ([] true)
        ([x] x)
        ([x & more] \`(if ~x (my-and ~@more) ~x)))
    `)
    expect(session.evaluate('(my-and)')).toEqual(v.boolean(true))
    expect(session.evaluate('(my-and 42)')).toEqual(v.number(42))
    expect(session.evaluate('(my-and true true 99)')).toEqual(v.number(99))
    expect(session.evaluate('(my-and true false 99)')).toEqual(v.boolean(false))
  })

  it('should support recur inside a specific arity', () => {
    const session = freshSession()
    const result = session.evaluate(`
      (def factorial (fn
        ([n] (factorial n 1))
        ([n acc]
          (if (<= n 1) acc (recur (dec n) (* n acc))))))
      (factorial 5)
    `)
    expect(result).toEqual(v.number(120))
  })

  it('should throw when defining more than one variadic arity', () => {
    expectError(
      '(fn ([x & a] x) ([y & b] y))',
      'At most one variadic arity is allowed per function'
    )
  })

  it('should work with named multi-arity via def', () => {
    const session = freshSession()
    session.evaluate(`
      (def greet (fn
        ([] "hi")
        ([name] (str "hi " name))))
    `)
    expect(session.evaluate('(greet)')).toEqual(v.string('hi'))
    expect(session.evaluate('(greet "world")')).toEqual(v.string('hi world'))
  })

  it('should handle single-arity fn the same as before', () => {
    const session = freshSession()
    expect(session.evaluate('((fn [x y] (+ x y)) 3 4)')).toEqual(v.number(7))
  })

  it('should handle multi arity with defn macro', () => {
    const session = freshSession()
    session.evaluate(`
    (defn greet
      ([] "hi")
      ([x] (str "hi " x))
      ([x y] (str "hi " x " and " y)))`)
    expect(session.evaluate('(greet)')).toEqual(v.string('hi'))
    expect(session.evaluate('(greet "world")')).toEqual(v.string('hi world'))
    expect(session.evaluate('(greet "world" "universe")')).toEqual(
      v.string('hi world and universe')
    )
  })
})
