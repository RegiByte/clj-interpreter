import { describe, expect, it } from 'vitest'
import {
  cljBoolean,
  cljFunction,
  cljKeyword,
  cljList,
  cljNil,
  cljNumber,
  cljString,
  cljSymbol,
  cljVector,
} from '../factories'
import { lookup } from '../env'
import { freshSession, toCljValue } from './evaluator-test-utils'

describe('evaluator spec', () => {
  describe('primitive forms spec', () => {
    it('should evaluate a single form', () => {
      const session = freshSession()
      const result = session.evaluate('1')
      expect(result).toMatchObject(cljNumber(1))
    })

    it.each([
      ['1', cljNumber(1)],
      ['"hello"', cljString('hello')],
      ['true', cljBoolean(true)],
      [':keyword', cljKeyword(':keyword')],
      ['nil', cljNil()],
    ])('should evaluate self-evaluating forms: %s', (code, expected) => {
      const session = freshSession()
      expect(session.evaluate(code)).toMatchObject(expected)
    })

    it('should evaluate functions to self', () => {
      const session = freshSession()
      const userEnv = session.getNs('user')!
      const form = cljFunction([cljSymbol('n1')], null, [cljNumber(1)], userEnv)
      const result = session.evaluateForms([form])
      expect(result).toMatchObject(form)
    })

    it('should evaluate a vector with items and strip comments at parse time', () => {
      const session = freshSession()
      const result = session.evaluate('[1 ; comment\n 2]')
      expect(result).toMatchObject(cljVector([cljNumber(1), cljNumber(2)]))
    })
  })

  describe('special forms spec', () => {
    it('should evaluate fn special form', () => {
      const session = freshSession()
      session.evaluate('(def some-symbol 1)')
      const result = session.evaluate('(fn [a b] (+ a b))')
      const userEnv = session.getNs('user')!
      expect(result).toMatchObject(
        cljFunction(
          [cljSymbol('a'), cljSymbol('b')],
          null,
          [cljList([cljSymbol('+'), cljSymbol('a'), cljSymbol('b')])],
          userEnv
        )
      )
      if (result.kind !== 'function') {
        throw new Error('Result is not a function')
      }
      // check if the outer env was captured by the function
      expect(lookup('some-symbol', result.env)).toMatchObject(cljNumber(1))
    })

    it('should evaluate def special form', () => {
      const session = freshSession()
      const result = session.evaluate('(def some-symbol 1)')
      expect(result).toMatchObject(cljNil())
      expect(lookup('some-symbol', session.getNs('user')!)).toMatchObject(
        cljNumber(1)
      )
    })

    it('def should define a global binding, not local', () => {
      const session = freshSession()
      const result = session.evaluate(`(let [x 1] 
    (def y 2)
    (+ 1 x))
    y`)
      expect(result).toMatchObject(cljNumber(2))
    })

    it('should evaluate a quote special form', () => {
      const session = freshSession()
      const result = session.evaluate('(quote (+ 1 2 3))')
      expect(result).toMatchObject(
        cljList([cljSymbol('+'), cljNumber(1), cljNumber(2), cljNumber(3)])
      )
    })

    it('should evaluate a do special form', () => {
      const session = freshSession()
      expect(session.evaluate('(do 1 2 3)')).toMatchObject(cljNumber(3))
    })

    it('should evaluate a let special form', () => {
      const session = freshSession()
      expect(session.evaluate('(let [a 1 b 2] [a a b b])')).toMatchObject(
        cljVector([cljNumber(1), cljNumber(1), cljNumber(2), cljNumber(2)])
      )
    })

    it('should evaluate a if special form', () => {
      const session = freshSession()
      expect(session.evaluate('(if true 1 2)')).toMatchObject(cljNumber(1))
      expect(session.evaluate('(if false 1 2)')).toMatchObject(cljNumber(2))
    })
  })

  describe('user-defined functions spec', () => {
    it.each([
      ['((fn [a b] (+ a b)) 1 2)', 3],
      ['((fn [a b] (- a b)) 1 2)', -1],
      ['((fn [a b] (* a b)) 1 2)', 2],
      ['((fn [a b] (/ a b)) 1 2)', 1 / 2],
    ])('should evaluate a user-defined function %s → %s', (code, expected) => {
      const session = freshSession()
      const result1 = session.evaluate(code)
      expect(result1).toMatchObject(toCljValue(expected))
    })

    it('should evaluate user-defined function accessing outer env', () => {
      const session = freshSession()
      const result = session.evaluate(`(def x 10)
    (def mult-10 (fn [n] (* n x)))
    (mult-10 2)`)
      expect(result).toMatchObject(cljNumber(20))
    })

    it('should capture the outer environment in a function', () => {
      const session = freshSession()
      const result =
        session.evaluate(`(def make-adder (fn [n] (fn [x] (+ n x))))
((make-adder 5) 3) `)
      expect(result).toMatchObject(cljNumber(8))
    })

    it('should evaluate a nested function call', () => {
      const session = freshSession()
      expect(
        session.evaluate('((fn [a b] ((fn [x] (* x a)) b)) 2 3)')
      ).toMatchObject(cljNumber(6))
    })

    it('should evaluate if with truthy value', () => {
      const session = freshSession()
      expect(session.evaluate('(if [1] 1 2)')).toMatchObject(cljNumber(1))
    })
  })
})
