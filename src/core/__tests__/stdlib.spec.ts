import { describe, expect, it } from 'vitest'
import {
  cljBoolean,
  cljKeyword,
  cljNil,
  cljNumber,
  cljString,
  cljVector,
} from '../factories'
import { printString } from '../printer'
import { createSession } from '../session'

function session() {
  return createSession()
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
      expect(
        session().evaluate('(defn square [x] (* x x)) (square 5)')
      ).toEqual(cljNumber(25))
    })

    it('supports multiple body forms', () => {
      expect(
        session().evaluate(
          '(defn add-and-double [a b] (def s (+ a b)) (* s 2)) (add-and-double 3 4)'
        )
      ).toEqual(cljNumber(14))
    })

    it('supports rest params', () => {
      expect(
        session().evaluate('(defn sum [& xs] (reduce + 0 xs)) (sum 1 2 3 4)')
      ).toEqual(cljNumber(10))
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
      expect(
        printString(session().evaluate("(macroexpand-1 '(when true 1 2))"))
      ).toEqual('(if true (do 1 2) nil)')
    })

    it('expands when-not once', () => {
      expect(
        printString(session().evaluate("(macroexpand-1 '(when-not false 42))"))
      ).toEqual('(if false nil (do 42))')
    })

    it('expands and once — binding symbol is a hygienic gensym', () => {
      // The exact gensym name is non-deterministic; verify structure via pattern
      const expanded = printString(
        session().evaluate("(macroexpand-1 '(and 1 2 3))")
      )
      expect(expanded).toMatch(
        /^\(let \[v__\d+ 1\] \(if v__\d+ \(and 2 3\) v__\d+\)\)$/
      )
    })

    it('returns form unchanged when head is not a macro', () => {
      expect(
        printString(session().evaluate("(macroexpand-1 '(+ 1 2))"))
      ).toEqual('(+ 1 2)')
    })

    it('returns form unchanged for non-list input', () => {
      expect(session().evaluate("(macroexpand-1 '42)")).toEqual(cljNumber(42))
    })
  })

  describe('macroexpand', () => {
    it('expands when fully (stops at if, a special form)', () => {
      expect(
        printString(session().evaluate("(macroexpand '(when true 1))"))
      ).toEqual('(if true (do 1) nil)')
    })

    it('expands chained macros all the way', () => {
      // Define a macro that expands to another macro call
      const s = session()
      s.evaluate('(defmacro my-when-not [c & b] `(when (not ~c) ~@b))')
      // macroexpand-1: my-when-not → (when (not c) ...) — still a macro
      expect(
        printString(s.evaluate("(macroexpand-1 '(my-when-not false 1))"))
      ).toEqual('(when (not false) 1)')
      // macroexpand: keeps going until when → (if ...) — no longer a macro
      expect(
        printString(s.evaluate("(macroexpand '(my-when-not false 1))"))
      ).toEqual('(if (not false) (do 1) nil)')
    })

    it('returns form unchanged when head is not a macro', () => {
      expect(printString(session().evaluate("(macroexpand '(+ 1 2))"))).toEqual(
        '(+ 1 2)'
      )
    })
  })
})

describe('range', () => {
  it('(range n) returns 0 to n-1', () => {
    expect(session().evaluate('(range 5)')).toEqual(
      session().evaluate("'(0 1 2 3 4)")
    )
  })

  it('(range 0) returns empty list', () => {
    expect(session().evaluate('(range 0)')).toEqual(session().evaluate("'()"))
  })

  it('(range start end) returns start to end-1', () => {
    expect(session().evaluate('(range 2 6)')).toEqual(
      session().evaluate("'(2 3 4 5)")
    )
  })

  it('(range start end step) uses custom step', () => {
    expect(session().evaluate('(range 0 10 2)')).toEqual(
      session().evaluate("'(0 2 4 6 8)")
    )
  })

  it('negative step counts down', () => {
    expect(session().evaluate('(range 5 0 -1)')).toEqual(
      session().evaluate("'(5 4 3 2 1)")
    )
  })

  it('returns empty list when start >= end with positive step', () => {
    expect(session().evaluate('(range 5 3)')).toEqual(session().evaluate("'()"))
  })

  it('throws on zero step', () => {
    expect(() => session().evaluate('(range 0 10 0)')).toThrow()
  })

  it('works with map — returns vector', () => {
    expect(session().evaluate('(map inc (range 3))')).toEqual(
      cljVector([cljNumber(1), cljNumber(2), cljNumber(3)])
    )
  })
})

describe('identity', () => {
  it('returns its argument unchanged', () => {
    expect(session().evaluate('(identity 42)')).toEqual(cljNumber(42))
    expect(session().evaluate('(identity "hi")')).toEqual(cljString('hi'))
    expect(session().evaluate('(identity nil)')).toEqual(cljNil())
    expect(session().evaluate('(identity [1 2 3])')).toEqual(
      cljVector([cljNumber(1), cljNumber(2), cljNumber(3)])
    )
  })

  it('works as a function value — returns vector', () => {
    expect(session().evaluate("(map identity '(1 2 3))")).toEqual(
      cljVector([cljNumber(1), cljNumber(2), cljNumber(3)])
    )
  })
})

describe('last', () => {
  it('returns the last element of a list', () => {
    expect(session().evaluate('(last (list 1 2 3))')).toEqual(cljNumber(3))
  })

  it('returns the last element of a vector', () => {
    expect(session().evaluate('(last [10 20 30])')).toEqual(cljNumber(30))
  })

  it('returns nil for an empty list', () => {
    expect(session().evaluate("(last '())")).toEqual(cljNil())
  })

  it('returns the only element of a single-element list', () => {
    expect(session().evaluate("(last '(7))")).toEqual(cljNumber(7))
  })

  it('throws for non-sequential types', () => {
    expect(() => session().evaluate('(last {:a 1})')).toThrow()
  })
})

describe('reverse', () => {
  it('reverses a list', () => {
    expect(session().evaluate("(reverse '(1 2 3))")).toEqual(
      session().evaluate("'(3 2 1)")
    )
  })

  it('reverses a vector as a list', () => {
    expect(session().evaluate('(reverse [1 2 3])')).toEqual(
      session().evaluate("'(3 2 1)")
    )
  })

  it('returns empty list for empty input', () => {
    expect(session().evaluate("(reverse '())")).toEqual(
      session().evaluate("'()")
    )
  })

  it('single-element list is unchanged', () => {
    expect(session().evaluate("(reverse '(42))")).toEqual(
      session().evaluate("'(42)")
    )
  })
})

describe('not=', () => {
  it('returns true when values differ', () => {
    expect(session().evaluate('(not= 1 2)')).toEqual(cljBoolean(true))
  })

  it('returns false when values are equal', () => {
    expect(session().evaluate('(not= 1 1)')).toEqual(cljBoolean(false))
  })

  it('returns false when all args are equal', () => {
    expect(session().evaluate('(not= :a :a :a)')).toEqual(cljBoolean(false))
  })

  it('returns true when any adjacent pair differs', () => {
    expect(session().evaluate('(not= 1 1 2)')).toEqual(cljBoolean(true))
  })
})

describe('empty?', () => {
  it('returns true for empty list', () => {
    expect(session().evaluate("(empty? '())")).toEqual(cljBoolean(true))
  })

  it('returns true for empty vector', () => {
    expect(session().evaluate('(empty? [])')).toEqual(cljBoolean(true))
  })

  it('returns false for non-empty list', () => {
    expect(session().evaluate("(empty? '(1))")).toEqual(cljBoolean(false))
  })

  it('returns false for non-empty vector', () => {
    expect(session().evaluate('(empty? [1 2])')).toEqual(cljBoolean(false))
  })

  it('returns true for empty map', () => {
    expect(session().evaluate('(empty? {})')).toEqual(cljBoolean(true))
  })
})

describe('some', () => {
  it('returns first truthy result', () => {
    expect(session().evaluate('(some even? [1 3 4 6])')).toEqual(
      cljBoolean(true)
    )
  })

  it('returns nil when no element satisfies pred', () => {
    expect(session().evaluate('(some even? [1 3 5])')).toEqual(cljNil())
  })

  it('returns the truthy result value, not always true', () => {
    expect(
      session().evaluate('(some (fn [x] (when (even? x) x)) [1 3 4])')
    ).toEqual(cljNumber(4))
  })

  it('returns nil for empty collection', () => {
    expect(session().evaluate("(some even? '())")).toEqual(cljNil())
  })
})

describe('some?', () => {
  it('returns true when any non nil value is passed', () => {
    expect(session().evaluate('(some? 42)')).toEqual(cljBoolean(true))
    expect(session().evaluate('(some? "hello")')).toEqual(cljBoolean(true))
    expect(session().evaluate('(some? true)')).toEqual(cljBoolean(true))
    expect(session().evaluate('(some? [1 2 3])')).toEqual(cljBoolean(true))
    expect(session().evaluate('(some? {:a 1})')).toEqual(cljBoolean(true))
    expect(session().evaluate('(some? :a)')).toEqual(cljBoolean(true))
    expect(session().evaluate('(some? true)')).toEqual(cljBoolean(true))
    expect(session().evaluate('(some? false)')).toEqual(cljBoolean(true))
  })

  it('returns false when nil is passed', () => {
    expect(session().evaluate('(some? nil)')).toEqual(cljBoolean(false))
  })
})

describe('every?', () => {
  it('returns true when all elements satisfy pred', () => {
    expect(session().evaluate('(every? number? [1 2 3])')).toEqual(
      cljBoolean(true)
    )
  })

  it('returns false when any element fails pred', () => {
    expect(session().evaluate('(every? number? [1 "a" 3])')).toEqual(
      cljBoolean(false)
    )
  })

  it('returns true for empty collection (vacuously true)', () => {
    expect(session().evaluate("(every? number? '())")).toEqual(cljBoolean(true))
  })
})

describe('partial', () => {
  it('creates a function with pre-filled first argument', () => {
    expect(session().evaluate('((partial + 10) 5)')).toEqual(cljNumber(15))
  })

  it('creates a function with multiple pre-filled arguments', () => {
    expect(session().evaluate('((partial str "hello " ) "world")')).toEqual(
      cljString('hello world')
    )
  })

  it('works with no extra args at call time', () => {
    expect(session().evaluate('((partial + 1 2 3))')).toEqual(cljNumber(6))
  })

  it('can be used with map — returns vector', () => {
    expect(session().evaluate("(map (partial + 10) '(1 2 3))")).toEqual(
      cljVector([cljNumber(11), cljNumber(12), cljNumber(13)])
    )
  })
})

describe('comp', () => {
  it('(comp) returns identity', () => {
    expect(session().evaluate('((comp) 42)')).toEqual(cljNumber(42))
  })

  it('(comp f) is equivalent to f', () => {
    expect(session().evaluate('((comp inc) 5)')).toEqual(cljNumber(6))
  })

  it('composes two functions right-to-left', () => {
    expect(session().evaluate('((comp inc dec) 5)')).toEqual(cljNumber(5))
    expect(session().evaluate('((comp str inc) 5)')).toEqual(
      session().evaluate('(str 6)')
    )
  })

  it('composes three functions right-to-left', () => {
    expect(session().evaluate('((comp inc inc inc) 0)')).toEqual(cljNumber(3))
  })

  it('applies rightmost function with all args', () => {
    expect(session().evaluate('((comp inc +) 1 2 3)')).toEqual(cljNumber(7))
  })

  it('can be stored and reused', () => {
    const s = session()
    s.evaluate('(def add1-then-str (comp str inc))')
    expect(s.evaluate('(add1-then-str 9)')).toEqual(s.evaluate('(str 10)'))
  })
})

describe('map-indexed', () => {
  it('passes index and element to function (list input) — returns vector', () => {
    expect(
      session().evaluate("(map-indexed (fn [i x] i) '(:a :b :c))")
    ).toEqual(cljVector([cljNumber(0), cljNumber(1), cljNumber(2)]))
  })

  it('passes element correctly (list input) — returns vector', () => {
    expect(
      session().evaluate("(map-indexed (fn [i x] x) '(:a :b :c))")
    ).toEqual(cljVector([cljKeyword(':a'), cljKeyword(':b'), cljKeyword(':c')]))
  })

  it('returns a vector when given a vector input', () => {
    expect(session().evaluate('(map-indexed (fn [i x] i) [:a :b :c])')).toEqual(
      cljVector([cljNumber(0), cljNumber(1), cljNumber(2)])
    )
  })

  it('can build indexed pairs — returns vector', () => {
    expect(session().evaluate("(map-indexed vector '(:a :b :c))")).toEqual(
      cljVector([
        cljVector([cljNumber(0), cljKeyword(':a')]),
        cljVector([cljNumber(1), cljKeyword(':b')]),
        cljVector([cljNumber(2), cljKeyword(':c')]),
      ])
    )
  })

  it('returns empty vector for empty collection', () => {
    expect(session().evaluate("(map-indexed vector '())")).toEqual(
      cljVector([])
    )
  })
})

describe('constantly', () => {
  it('returns a function that always returns the given value', () => {
    expect(session().evaluate('((constantly 42) 1 2 3)')).toEqual(cljNumber(42))
  })

  it('ignores all arguments', () => {
    expect(session().evaluate('((constantly :foo))')).toEqual(
      session().evaluate(':foo')
    )
  })

  it('works with map — returns vector', () => {
    expect(session().evaluate("(map (constantly 0) '(1 2 3))")).toEqual(
      cljVector([cljNumber(0), cljNumber(0), cljNumber(0)])
    )
  })
})

describe('complement', () => {
  it('returns the logical negation of a predicate', () => {
    expect(session().evaluate('((complement nil?) 42)')).toEqual(
      cljBoolean(true)
    )
    expect(session().evaluate('((complement nil?) nil)')).toEqual(
      cljBoolean(false)
    )
  })

  it('works with even? to filter odd numbers — returns vector', () => {
    expect(
      session().evaluate("(filter (complement even?) '(1 2 3 4 5))")
    ).toEqual(cljVector([cljNumber(1), cljNumber(3), cljNumber(5)]))
  })
})

describe('not-any?', () => {
  it('returns true when no element satisfies pred', () => {
    expect(session().evaluate("(not-any? even? '(1 3 5))")).toEqual(
      cljBoolean(true)
    )
  })

  it('returns false when any element satisfies pred', () => {
    expect(session().evaluate("(not-any? even? '(1 2 3))")).toEqual(
      cljBoolean(false)
    )
  })
})

describe('not-every?', () => {
  it('returns false when all elements satisfy pred', () => {
    expect(session().evaluate("(not-every? number? '(1 2 3))")).toEqual(
      cljBoolean(false)
    )
  })

  it('returns true when some elements fail pred', () => {
    expect(session().evaluate('(not-every? number? \'(1 "a" 3))')).toEqual(
      cljBoolean(true)
    )
  })
})

describe('qualified-keyword?', () => {
  it('returns true for a qualified keyword', () => {
    expect(session().evaluate('(qualified-keyword? :user/foo)')).toEqual(
      cljBoolean(true)
    )
  })

  it('returns false for an unqualified keyword', () => {
    expect(session().evaluate('(qualified-keyword? :foo)')).toEqual(
      cljBoolean(false)
    )
  })

  it('returns false for a non-keyword', () => {
    expect(session().evaluate('(qualified-keyword? "user/foo")')).toEqual(
      cljBoolean(false)
    )
    expect(session().evaluate("(qualified-keyword? 'user/foo)")).toEqual(
      cljBoolean(false)
    )
  })
})

describe('qualified-symbol?', () => {
  it('returns true for a qualified symbol', () => {
    expect(session().evaluate("(qualified-symbol? 'user/foo)")).toEqual(
      cljBoolean(true)
    )
  })

  it('returns false for an unqualified symbol', () => {
    expect(session().evaluate("(qualified-symbol? 'foo)")).toEqual(
      cljBoolean(false)
    )
  })

  it('returns false for a non-symbol', () => {
    expect(session().evaluate('(qualified-symbol? :user/foo)')).toEqual(
      cljBoolean(false)
    )
  })
})

describe('namespace', () => {
  it('returns the namespace string of a qualified keyword', () => {
    expect(session().evaluate('(namespace :user/foo)')).toEqual(
      cljString('user')
    )
  })

  it('returns nil for an unqualified keyword', () => {
    expect(session().evaluate('(namespace :foo)')).toEqual(cljNil())
  })

  it('returns the namespace string of a qualified symbol', () => {
    expect(session().evaluate("(namespace 'my.ns/bar)")).toEqual(
      cljString('my.ns')
    )
  })

  it('returns nil for an unqualified symbol', () => {
    expect(session().evaluate("(namespace 'foo)")).toEqual(cljNil())
  })

  it('throws for non-keyword/symbol argument', () => {
    expect(() => session().evaluate('(namespace "user/foo")')).toThrow()
  })
})

describe('name', () => {
  it('returns the local name of a qualified keyword', () => {
    expect(session().evaluate('(name :user/foo)')).toEqual(cljString('foo'))
  })

  it('returns the name of an unqualified keyword', () => {
    expect(session().evaluate('(name :foo)')).toEqual(cljString('foo'))
  })

  it('returns the local name of a qualified symbol', () => {
    expect(session().evaluate("(name 'my.ns/bar)")).toEqual(cljString('bar'))
  })

  it('returns the name of an unqualified symbol', () => {
    expect(session().evaluate("(name 'baz)")).toEqual(cljString('baz'))
  })

  it('returns the string itself when given a string', () => {
    expect(session().evaluate('(name "hello")')).toEqual(cljString('hello'))
  })
})

describe('keyword constructor', () => {
  it('creates an unqualified keyword from a single string', () => {
    expect(session().evaluate('(keyword "foo")')).toEqual(cljKeyword(':foo'))
  })

  it('creates a qualified keyword from two strings', () => {
    expect(session().evaluate('(keyword "user" "foo")')).toEqual(
      cljKeyword(':user/foo')
    )
  })

  it('creates a keyword with namespace containing dots', () => {
    expect(session().evaluate('(keyword "my.domain" "event")')).toEqual(
      cljKeyword(':my.domain/event')
    )
  })

  it('throws with zero arguments', () => {
    expect(() => session().evaluate('(keyword)')).toThrow()
  })

  it('throws with non-string first argument', () => {
    expect(() => session().evaluate('(keyword 42)')).toThrow()
  })
})
