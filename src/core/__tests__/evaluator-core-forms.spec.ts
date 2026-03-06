import { describe, expect, it } from 'vitest'
import {
  cljFunction,
  cljKeyword,
  cljList,
  cljMap,
  cljNil,
  cljNumber,
  cljSymbol,
  cljVector,
} from '../factories'
import { expectError, freshSession, toCljValue } from './evaluator-test-utils'

describe('keywords', () => {
  it.each([
    [`(:the-key {:the-key 1})`, 1],
    [`(:the-key [])`, null],
    [`(:the-key '())`, null],
    [`(:the-key 1)`, null],
    [`(:the-key true)`, null],
    [`(:a {:a 1})`, 1],
    [`(:a [])`, null],
    [`(:a 1)`, null],
    [`(:a 1 "default")`, 'default'],
    [`(:a true)`, null],
    [`(:0 [1 2 3])`, null],
    [`(:a (:b {:b {:a 2}}))`, 2],
    [`(:c (:b {:b {:a 2}}) 2)`, 2],
  ])(
    'keywords should call themselves in a map: %s should be %s',
    (code, expected) => {
      const s = freshSession()
      const result = s.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected))
    }
  )
})

describe('rest parameters', () => {
  it('should capture rest parameter in user defined function', () => {
    const session = freshSession()
    const result = session.evaluate('(fn [a b c & rest] [a b c rest])')
    expect(result).toMatchObject(
      cljFunction(
        [cljSymbol('a'), cljSymbol('b'), cljSymbol('c')],
        cljSymbol('rest'),
        [
          cljVector([
            cljSymbol('a'),
            cljSymbol('b'),
            cljSymbol('c'),
            cljSymbol('rest'),
          ]),
        ],
        session.getNs('user')!
      )
    )
  })

  it.each([
    ['(fn [a b & c & rest] [a b c rest])', '& can only appear once'],
    [`(fn [a b & c rest] [a b c rest])`, '& must be second-to-last argument'],
  ])('should throw on invalid rest usage: %s → "%s"', (code, expected) => {
    expectError(code, expected)
  })

  it.each([
    [
      '((fn [a b & rest] [a b rest]) 1 2 3 4 5)',
      [1, 2, cljList([cljNumber(3), cljNumber(4), cljNumber(5)])],
    ],
    ['((fn [a b & rest] [a b rest]) 1 2)', [1, 2, null]],
  ])(
    'should hydrate rest parameter with extra bindings: %s → %o',
    (code, expected) => {
      const s = freshSession()
      const result = s.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected))
    }
  )

  it.each([
    ['((fn [a b & rest] [a b rest]) 1)', 'No matching arity for 1 arguments'],
    ['((fn [a b] [a b]) 1 2 3)', 'No matching arity for 3 arguments'],
  ])('should throw on invalid rest usage: %s → "%s"', (code, expected) => {
    expectError(code, expected)
  })
})

describe('macros', () => {
  it.each([
    ['(defmacro pass-through [x] x) (pass-through 42)', 42],
    ['(defmacro pass-through [x] x) (pass-through "hello")', 'hello'],
    ['(defmacro pass-through [x] x) (pass-through true)', true],
    ['(defmacro pass-through [x] x) (pass-through nil)', null],
    ['(defmacro pass-through [x] x) (pass-through :foo)', cljKeyword(':foo')],
  ])('should pass scalars through', (code, expected) => {
    const s = freshSession()
    expect(s.evaluate(code)).toMatchObject(toCljValue(expected))
  })

  it.each([
    ['`x', cljSymbol('x')],
    ['`(a b c)', cljList([cljSymbol('a'), cljSymbol('b'), cljSymbol('c')])],
    ['`[a b c]', cljVector([cljSymbol('a'), cljSymbol('b'), cljSymbol('c')])],
    ['`{:a 1}', cljMap([[cljKeyword(':a'), cljNumber(1)]])],
  ])('should pass symbols through as symbols: %s → %s', (code, expected) => {
    const s = freshSession()
    expect(s.evaluate(code)).toMatchObject(expected)
  })

  it('should evaluate unquote', () => {
    const s = freshSession()
    expect(s.evaluate('(let [x 42] `~x)')).toMatchObject(cljNumber(42))
  })

  it('should evaluate unquote splicing', () => {
    const s = freshSession()
    expect(s.evaluate('(let [xs [1 2 3]] `(a ~@xs b))')).toMatchObject(
      cljList([
        cljSymbol('a'),
        cljNumber(1),
        cljNumber(2),
        cljNumber(3),
        cljSymbol('b'),
      ])
    )
  })

  it.each([
    ['(my-when true 1 2 3)', 3],
    ['(my-when false 1 2 3)', null],
    ['(my-when (= 0 (- 1 1)) :zero)', cljKeyword(':zero')],
    ['(my-when (= 0 (- 1 2)) :zero)', cljNil()],
  ])(
    'should handle defmacro with quasiquote body: custom when macro: %s',
    (code, expected) => {
      const s = freshSession()
      s.evaluate(
        '(defmacro my-when [cond & body] `(if ~cond (do ~@body) nil))'
      )
      expect(s.evaluate(code)).toMatchObject(toCljValue(expected))
    }
  )

  it.each([
    ['(defn square [x] (* x x)) (square 5)', 25],
    ['(defn add [a b] (+ a b)) (add 3 4)', 7],
    [
      `(defn fib [n] 
         (if (<= n 1) 
               n
               (+ (fib (- n 1)) 
                  (fib (- n 2)))))
        (fib 10)`,
      55,
    ],
  ])('should evaluate defn as a macro: %s -> %s', (code, expected) => {
    const s = freshSession()
    s.evaluate(`(defmacro defn [name params & body]
      \`(def ~name (fn ~params ~@body)))`)

    const result = s.evaluate(code)
    expect(result).toMatchObject(toCljValue(expected))
  })
})
