import { describe, expect, it } from 'vitest'
import macrosSource from '../../clojure/macros.clj?raw'
import { cljBoolean, cljNil, cljNumber, cljVector } from '../factories'
import { printString } from '../printer'
import { createSession } from '../session'

function session() {
  return createSession({ entries: [macrosSource] })
}

describe('stdlib macros', () => {
  describe('when', () => {
    it('evaluates body when condition is truthy', () => {
      expect(session().evaluate('(when true 42)')).toEqual(cljNumber(42))
    })

    it('returns nil when condition is falsy', () => {
      expect(session().evaluate('(when false 42)')).toEqual(cljNil())
    })

    it('returns nil when condition is nil', () => {
      expect(session().evaluate('(when nil 42)')).toEqual(cljNil())
    })

    it('evaluates all body forms and returns the last', () => {
      expect(session().evaluate('(when true 1 2 3)')).toEqual(cljNumber(3))
    })
  })

  describe('when-not', () => {
    it('evaluates body when condition is falsy', () => {
      expect(session().evaluate('(when-not false 42)')).toEqual(cljNumber(42))
    })

    it('returns nil when condition is truthy', () => {
      expect(session().evaluate('(when-not true 42)')).toEqual(cljNil())
    })

    it('returns nil when condition is nil — when-not nil is truthy branch', () => {
      expect(session().evaluate('(when-not nil 42)')).toEqual(cljNumber(42))
    })

    it('evaluates all body forms and returns the last', () => {
      expect(session().evaluate('(when-not false 1 2 3)')).toEqual(cljNumber(3))
    })
  })

  describe('and', () => {
    it('(and) returns true', () => {
      expect(session().evaluate('(and)')).toEqual(cljBoolean(true))
    })

    it('(and x) returns x', () => {
      expect(session().evaluate('(and 42)')).toEqual(cljNumber(42))
    })

    it('returns last value when all forms are truthy', () => {
      expect(session().evaluate('(and 1 2 3)')).toEqual(cljNumber(3))
    })

    it('short-circuits on first falsy value', () => {
      expect(session().evaluate('(and 1 nil 3)')).toEqual(cljNil())
    })

    it('short-circuits on false', () => {
      expect(session().evaluate('(and 1 false 3)')).toEqual(cljBoolean(false))
    })

    it('returns nil when first form is nil', () => {
      expect(session().evaluate('(and nil 2)')).toEqual(cljNil())
    })
  })

  describe('or', () => {
    it('(or) returns nil', () => {
      expect(session().evaluate('(or)')).toEqual(cljNil())
    })

    it('(or x) returns x', () => {
      expect(session().evaluate('(or 42)')).toEqual(cljNumber(42))
    })

    it('returns first truthy value', () => {
      expect(session().evaluate('(or false nil 3)')).toEqual(cljNumber(3))
    })

    it('returns nil when all forms are falsy', () => {
      expect(session().evaluate('(or false nil)')).toEqual(cljNil())
    })

    it('short-circuits on first truthy value', () => {
      expect(session().evaluate('(or nil false 1 2 3)')).toEqual(cljNumber(1))
    })
  })

  describe('cond', () => {
    it('(cond) returns nil', () => {
      expect(session().evaluate('(cond)')).toEqual(cljNil())
    })

    it('returns value for first truthy test', () => {
      expect(session().evaluate('(cond false 1 true 2 true 3)')).toEqual(
        cljNumber(2)
      )
    })

    it('returns nil when no test matches', () => {
      expect(session().evaluate('(cond false 1 nil 2)')).toEqual(cljNil())
    })

    it('works with expressions as tests', () => {
      expect(session().evaluate('(cond (= 1 2) :no (= 1 1) :yes)')).toEqual({
        kind: 'keyword',
        name: ':yes',
      })
    })
  })

  describe('->', () => {
    it('(-> x) returns x', () => {
      expect(session().evaluate('(-> 5)')).toEqual(cljNumber(5))
    })

    it('threads through a single symbol function', () => {
      expect(session().evaluate('(-> 5 inc)')).toEqual(cljNumber(6))
    })

    it('threads through multiple symbol functions', () => {
      expect(session().evaluate('(-> 5 inc inc dec)')).toEqual(cljNumber(6))
    })

    it('threads as first arg of a list form', () => {
      expect(session().evaluate('(-> [1 2] (conj 3))')).toEqual(
        cljVector([cljNumber(1), cljNumber(2), cljNumber(3)])
      )
    })

    it('threads through multiple list forms', () => {
      expect(session().evaluate('(-> [1 2] (conj 3) (conj 4))')).toEqual(
        cljVector([cljNumber(1), cljNumber(2), cljNumber(3), cljNumber(4)])
      )
    })

    it('threads count as symbol', () => {
      expect(session().evaluate('(-> [1 2 3] count)')).toEqual(cljNumber(3))
    })
  })

  describe('->>', () => {
    it('(->> x) returns x', () => {
      expect(session().evaluate('(->> 5)')).toEqual(cljNumber(5))
    })

    it('threads through a single symbol function', () => {
      expect(session().evaluate('(->> 5 inc)')).toEqual(cljNumber(6))
    })

    it('threads as last arg of a list form', () => {
      expect(session().evaluate('(->> [1 2 3] (map inc))')).toEqual(
        cljVector([cljNumber(2), cljNumber(3), cljNumber(4)])
      )
    })

    it('threads through multiple list forms', () => {
      expect(
        session().evaluate('(->> [1 2 3] (map inc) (filter (fn [x] (> x 3))))')
      ).toEqual(cljVector([cljNumber(4)]))
    })

    it('threads count as symbol', () => {
      expect(session().evaluate('(->> [1 2 3] count)')).toEqual(cljNumber(3))
    })
  })

  describe('defn', () => {
    it('defines a named function', () => {
      expect(session().evaluate('(defn square [x] (* x x)) (square 5)')).toEqual(
        cljNumber(25)
      )
    })

    it('supports multiple body forms', () => {
      expect(
        session().evaluate('(defn add-and-double [a b] (def s (+ a b)) (* s 2)) (add-and-double 3 4)')
      ).toEqual(cljNumber(14))
    })

    it('supports rest params', () => {
      expect(session().evaluate('(defn sum [& xs] (reduce + 0 xs)) (sum 1 2 3 4)')).toEqual(
        cljNumber(10)
      )
    })
  })

  describe('next', () => {
    it('returns nil for empty list', () => {
      expect(session().evaluate('(next (list))')).toEqual(cljNil())
    })

    it('returns nil for single-element list', () => {
      expect(session().evaluate('(next (list 1))')).toEqual(cljNil())
    })

    it('returns rest as a list for multi-element list', () => {
      expect(session().evaluate('(next (list 1 2 3))')).toEqual(
        session().evaluate("'(2 3)")
      )
    })

    it('returns nil for empty vector', () => {
      expect(session().evaluate('(next [])')).toEqual(cljNil())
    })

    it('returns rest as list for multi-element vector', () => {
      expect(session().evaluate('(next [1 2 3])')).toEqual(
        session().evaluate("'(2 3)")
      )
    })
  })

  describe('macroexpand-1', () => {
    it('expands when once', () => {
      expect(printString(session().evaluate("(macroexpand-1 '(when true 1 2))"))).toEqual(
        '(if true (do 1 2) nil)'
      )
    })

    it('expands when-not once', () => {
      expect(printString(session().evaluate("(macroexpand-1 '(when-not false 42))"))).toEqual(
        '(if false nil (do 42))'
      )
    })

    it('expands and once', () => {
      expect(printString(session().evaluate("(macroexpand-1 '(and 1 2 3))"))).toEqual(
        '(let [__v 1] (if __v (and 2 3) __v))'
      )
    })

    it('returns form unchanged when head is not a macro', () => {
      expect(printString(session().evaluate("(macroexpand-1 '(+ 1 2))"))).toEqual(
        '(+ 1 2)'
      )
    })

    it('returns form unchanged for non-list input', () => {
      expect(session().evaluate("(macroexpand-1 '42)")).toEqual(cljNumber(42))
    })
  })

  describe('macroexpand', () => {
    it('expands when fully (stops at if, a special form)', () => {
      expect(printString(session().evaluate("(macroexpand '(when true 1))"))).toEqual(
        '(if true (do 1) nil)'
      )
    })

    it('expands chained macros all the way', () => {
      // Define a macro that expands to another macro call
      const s = session()
      s.evaluate('(defmacro my-when-not [c & b] `(when (not ~c) ~@b))')
      // macroexpand-1: my-when-not → (when (not c) ...) — still a macro
      expect(printString(s.evaluate("(macroexpand-1 '(my-when-not false 1))"))).toEqual(
        '(when (not false) 1)'
      )
      // macroexpand: keeps going until when → (if ...) — no longer a macro
      expect(printString(s.evaluate("(macroexpand '(my-when-not false 1))"))).toEqual(
        '(if (not false) (do 1) nil)'
      )
    })

    it('returns form unchanged when head is not a macro', () => {
      expect(printString(session().evaluate("(macroexpand '(+ 1 2))"))).toEqual(
        '(+ 1 2)'
      )
    })
  })
})
