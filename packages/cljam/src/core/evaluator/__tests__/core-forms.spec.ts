import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { setValues } from '../../persistent/map-helpers'
import type { CljSet } from '../../types'
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
      v.function(
        [v.symbol('a'), v.symbol('b'), v.symbol('c')],
        v.symbol('rest'),
        [
          v.vector([
            v.symbol('a'),
            v.symbol('b'),
            v.symbol('c'),
            v.symbol('rest'),
          ]),
        ],
        session.registry.get('user')!
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
      [1, 2, v.list([v.number(3), v.number(4), v.number(5)])],
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
    ['(defmacro pass-through [x] x) (pass-through :foo)', v.keyword(':foo')],
  ])('should pass scalars through', (code, expected) => {
    const s = freshSession()
    expect(s.evaluate(code)).toMatchObject(toCljValue(expected))
  })

  // Auto-qualification (JVM Clojure semantics): bare symbols in quasiquote are
  // qualified to the current namespace. In freshSession() the active ns is 'user'.
  // Keywords and map literals are unaffected (they are not symbols).
  it.each([
    ['`x', v.symbol('user/x')],
    ['`(a b c)', v.list([v.symbol('user/a'), v.symbol('user/b'), v.symbol('user/c')])],
    ['`[a b c]', v.vector([v.symbol('user/a'), v.symbol('user/b'), v.symbol('user/c')])],
    ['`{:a 1}', v.map([[v.keyword(':a'), v.number(1)]])],
  ])('should auto-qualify symbols to current namespace: %s → %s', (code, expected) => {
    const s = freshSession()
    expect(s.evaluate(code)).toMatchObject(expected)
  })

  it('should evaluate unquote', () => {
    const s = freshSession()
    expect(s.evaluate('(let [x 42] `~x)')).toMatchObject(v.number(42))
  })

  it('should evaluate unquote splicing', () => {
    const s = freshSession()
    // ~@xs passes through unqualified (unquoted); bare a and b auto-qualify
    expect(s.evaluate('(let [xs [1 2 3]] `(a ~@xs b))')).toMatchObject(
      v.list([
        v.symbol('user/a'),
        v.number(1),
        v.number(2),
        v.number(3),
        v.symbol('user/b'),
      ])
    )
  })

  describe('quasiquote — set templates', () => {
    it('should expand a set literal with keywords', () => {
      const s = freshSession()
      const result = s.evaluate('`#{:a :b :c}')
      expect(result).toMatchObject({ kind: 'set' })
      expect(setValues(result as CljSet)).toHaveLength(3)
      expect(setValues(result as CljSet)).toEqual(
        expect.arrayContaining([v.keyword(':a'), v.keyword(':b'), v.keyword(':c')])
      )
    })

    it('should unquote inside a set template', () => {
      const s = freshSession()
      const result = s.evaluate('(let [x 42] `#{1 ~x 3})')
      expect(result).toMatchObject({ kind: 'set' })
      expect(setValues(result as CljSet)).toHaveLength(3)
      expect(setValues(result as CljSet)).toEqual(
        expect.arrayContaining([v.number(1), v.number(42), v.number(3)])
      )
    })

    it('should unquote-splice into a set template', () => {
      const s = freshSession()
      const result = s.evaluate('(let [xs [1 2]] `#{~@xs 3})')
      expect(result).toMatchObject({ kind: 'set' })
      expect(setValues(result as CljSet)).toHaveLength(3)
      expect(setValues(result as CljSet)).toEqual(
        expect.arrayContaining([v.number(1), v.number(2), v.number(3)])
      )
    })

    it('should expand a set nested inside a list template', () => {
      const s = freshSession()
      // (foo #{:a :b}) — check at the Clojure level: second element is a 2-element set
      expect(s.evaluate('(count (second (let [tags [:a :b]] `(foo #{~@tags}))))')).toMatchObject(v.number(2))
      expect(s.evaluate('(contains? (second (let [tags [:a :b]] `(foo #{~@tags}))) :a)')).toMatchObject(v.boolean(true))
      expect(s.evaluate('(contains? (second (let [tags [:a :b]] `(foo #{~@tags}))) :b)')).toMatchObject(v.boolean(true))
    })
  })

  it.each([
    ['(my-when true 1 2 3)', 3],
    ['(my-when false 1 2 3)', null],
    ['(my-when (= 0 (- 1 1)) :zero)', v.keyword(':zero')],
    ['(my-when (= 0 (- 1 2)) :zero)', v.nil()],
  ])(
    'should handle defmacro with quasiquote body: custom when macro: %s',
    (code, expected) => {
      const s = freshSession()
      s.evaluate('(defmacro my-when [cond & body] `(if ~cond (do ~@body) nil))')
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

  it('stores :arglists and :doc in var meta for user defmacro', () => {
    const s = freshSession()
    s.evaluate('(defmacro mm "Does stuff." [a b & rest] a)')
    expect(s.evaluate("(:doc (meta #'mm))")).toMatchObject(v.string('Does stuff.'))
    // :arglists is a vector of param vectors; verify count and printed form
    expect(s.evaluate("(count (:arglists (meta #'mm)))")).toMatchObject(v.number(1))
    expect(s.evaluate("(str (first (:arglists (meta #'mm))))")).toMatchObject(v.string('[a b & rest]'))
  })

  it('stores multi-arity :arglists in var meta', () => {
    const s = freshSession()
    s.evaluate('(defmacro multi-mac ([x] x) ([x y] x))')
    expect(s.evaluate("(count (:arglists (meta #'multi-mac)))")).toMatchObject(v.number(2))
  })

  it('describe includes :arglists and :doc for user defmacro', () => {
    const s = freshSession()
    s.evaluate('(defmacro mm "Does stuff." [x y] x)')
    expect(s.evaluate("(:doc (:value (describe #'mm)))")).toMatchObject(v.string('Does stuff.'))
    expect(s.evaluate("(count (:arglists (:value (describe #'mm))))")).toMatchObject(v.number(1))
  })

  it('bootstrap macro defn has :doc and :arglists populated', () => {
    const s = freshSession()
    expect(s.evaluate("(string? (:doc (meta #'defn)))")).toMatchObject(v.boolean(true))
    expect(s.evaluate("(vector? (:arglists (meta #'defn)))")).toMatchObject(v.boolean(true))
    // describe also surfaces them
    expect(s.evaluate("(string? (:doc (:value (describe #'defn))))")).toMatchObject(v.boolean(true))
    expect(s.evaluate("(vector? (:arglists (:value (describe #'defn))))")).toMatchObject(v.boolean(true))
  })
})
