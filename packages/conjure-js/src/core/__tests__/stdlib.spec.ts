import { describe, expect, it } from 'vitest'
import {
  cljBoolean,
  cljKeyword,
  cljList,
  cljNil,
  cljNumber,
  cljRegex,
  cljString,
  cljVector,
} from '../factories'
import { printString } from '../printer'
import { createSession, createSessionFromSnapshot, snapshotSession } from '../session'
import { materialize } from '../evaluator/__tests__/evaluator-test-utils'

const _snapshot = snapshotSession(createSession())

function session() {
  return createSessionFromSnapshot(_snapshot)
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
      expect(materialize(session().evaluate('(->> [1 2 3] (map inc))'))).toEqual(
        cljList([cljNumber(2), cljNumber(3), cljNumber(4)])
      )
    })

    it('threads through multiple list forms', () => {
      expect(
        materialize(session().evaluate('(->> [1 2 3] (map inc) (filter (fn [x] (> x 3))))'))
      ).toEqual(cljList([cljNumber(4)]))
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

  describe('macroexpand-all', () => {
    it('expands macros in sub-forms recursively', () => {
      expect(
        printString(session().evaluate("(macroexpand-all '(when true 42))"))
      ).toEqual('(if true (do 42) nil)')
    })

    it('expands nested macros inside a let binding value', () => {
      expect(
        printString(
          session().evaluate("(macroexpand-all '(let [x (when true 1)] x))")
        )
      ).toEqual('(let [x (if true (do 1) nil)] x)')
    })

    it('expands macros inside an if branch', () => {
      expect(
        printString(
          session().evaluate(
            "(macroexpand-all '(if test (when a 1) (when b 2)))"
          )
        )
      ).toEqual('(if test (if a (do 1) nil) (if b (do 2) nil))')
    })

    it('does not expand inside quote', () => {
      expect(
        printString(session().evaluate("(macroexpand-all '(quote (when true 1)))"))
      ).toEqual("(quote (when true 1))")
    })

    it('returns non-macro forms unchanged', () => {
      expect(
        printString(session().evaluate("(macroexpand-all '(+ 1 2))"))
      ).toEqual('(+ 1 2)')
    })

    it('expands chained macros (cond) fully', () => {
      expect(
        printString(
          session().evaluate("(macroexpand-all '(cond (zero? n) 0 :else n))")
        )
      ).toEqual('(if (zero? n) 0 (if :else n nil))')
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

  it('works with map — returns seq', () => {
    expect(materialize(session().evaluate('(map inc (range 3))'))).toEqual(
      cljList([cljNumber(1), cljNumber(2), cljNumber(3)])
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

  it('works as a function value — returns seq', () => {
    expect(materialize(session().evaluate("(map identity '(1 2 3))"))).toEqual(
      cljList([cljNumber(1), cljNumber(2), cljNumber(3)])
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

  it('can be used with map — returns seq', () => {
    expect(materialize(session().evaluate("(map (partial + 10) '(1 2 3))"))).toEqual(
      cljList([cljNumber(11), cljNumber(12), cljNumber(13)])
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
  it('passes index and element to function — returns seq', () => {
    expect(
      materialize(session().evaluate("(map-indexed (fn [i x] i) '(:a :b :c))"))
    ).toEqual(cljList([cljNumber(0), cljNumber(1), cljNumber(2)]))
  })

  it('passes element correctly — returns seq', () => {
    expect(
      materialize(session().evaluate("(map-indexed (fn [i x] x) '(:a :b :c))"))
    ).toEqual(cljList([cljKeyword(':a'), cljKeyword(':b'), cljKeyword(':c')]))
  })

  it('returns a seq when given a vector input', () => {
    expect(materialize(session().evaluate('(map-indexed (fn [i x] i) [:a :b :c])'))).toEqual(
      cljList([cljNumber(0), cljNumber(1), cljNumber(2)])
    )
  })

  it('can build indexed pairs — returns seq of vectors', () => {
    expect(materialize(session().evaluate("(map-indexed vector '(:a :b :c))"))).toEqual(
      cljList([
        cljVector([cljNumber(0), cljKeyword(':a')]),
        cljVector([cljNumber(1), cljKeyword(':b')]),
        cljVector([cljNumber(2), cljKeyword(':c')]),
      ])
    )
  })

  it('returns empty seq for empty collection', () => {
    expect(materialize(session().evaluate("(map-indexed vector '())"))).toEqual(
      cljList([])
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

  it('works with map — returns seq', () => {
    expect(materialize(session().evaluate("(map (constantly 0) '(1 2 3))"))).toEqual(
      cljList([cljNumber(0), cljNumber(0), cljNumber(0)])
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

  it('works with even? to filter odd numbers — returns seq', () => {
    expect(
      materialize(session().evaluate("(filter (complement even?) '(1 2 3 4 5))"))
    ).toEqual(cljList([cljNumber(1), cljNumber(3), cljNumber(5)]))
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

describe('clojure.string', () => {
  it('loads via require and supports str/join with separator', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/join ", " [1 2 3])')).toEqual(cljString('1, 2, 3'))
  })

  it('supports str/join without separator', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/join ["a" "b" "c"])')).toEqual(cljString('abc'))
  })

  it('supports str/blank?', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as the-str-lib])")
    expect(s.evaluate('(the-str-lib/blank? nil)')).toEqual(cljBoolean(true))
    expect(s.evaluate('(the-str-lib/blank? "")')).toEqual(cljBoolean(true))
    expect(s.evaluate('(the-str-lib/blank? "x")')).toEqual(cljBoolean(false))
  })

  it('supports str/split with regex separator', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/split "a1b2c" #"\\d")')).toEqual(
      cljVector([cljString('a'), cljString('b'), cljString('c')])
    )
  })

  it('str/split drops trailing empty strings by default', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/split "a,b,c," #",")')).toEqual(
      cljVector([cljString('a'), cljString('b'), cljString('c')])
    )
  })

  it('str/split keeps trailing empty strings when limit is provided', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/split "a,b,c," #"," 10)')).toEqual(
      cljVector([cljString('a'), cljString('b'), cljString('c'), cljString('')])
    )
  })

  it('str/split returns whole string when separator is absent', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/split "abc" #",")')).toEqual(
      cljVector([cljString('abc')])
    )
  })

  it('str/split throws when separator is not a regex', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(() => s.evaluate('(str/split "abc" ",")')).toThrow(
      'str-split* expects a regex pattern as second argument'
    )
  })

  it('str/split with #"" regex splits into individual characters', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/split "Hello" #"")')).toEqual(
      cljVector([cljString('H'), cljString('e'), cljString('l'), cljString('l'), cljString('o')])
    )
  })

  it('str/split with #"" and limit stops early and joins the rest', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/split "Hello" #"" 3)')).toEqual(
      cljVector([cljString('H'), cljString('e'), cljString('llo')])
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

describe('regex', () => {
  describe('literal syntax and printing', () => {
    it('reads a simple regex literal', () => {
      expect(session().evaluate('#"foo"')).toEqual(cljRegex('foo', ''))
    })

    it('reads a regex with \\d and \\s (no escape processing)', () => {
      // \d and \s are two-char sequences passed through to the regex engine
      expect(session().evaluate('#"\\d+"')).toEqual(cljRegex('\\d+', ''))
    })

    it('prints a regex literal back to its source form', () => {
      expect(printString(cljRegex('foo', ''))).toBe('#"foo"')
    })

    it('prints a regex with flags as (?flags)pattern', () => {
      expect(printString(cljRegex('foo', 'i'))).toBe('#"(?i)foo"')
    })

    it('prints a regex with an embedded quote escaped', () => {
      expect(printString(cljRegex('say "hi"', ''))).toBe('#"say \\"hi\\""')
    })

    it('round-trips: str of a regex returns its pattern string (Clojure Pattern.toString)', () => {
      // In Clojure, (str #"\d+") => "\d+" (the pattern string, no #"..." wrapper)
      expect(session().evaluate('(str #"\\d+")')).toEqual(cljString('\\d+'))
    })
  })

  describe('inline flag extraction', () => {
    it('extracts (?i) as case-insensitive flag', () => {
      expect(session().evaluate('#"(?i)hello"')).toEqual(cljRegex('hello', 'i'))
    })

    it('extracts (?m) as multiline flag', () => {
      expect(session().evaluate('#"(?m)^foo"')).toEqual(cljRegex('^foo', 'm'))
    })

    it('extracts (?s) as dotall flag', () => {
      expect(session().evaluate('#"(?s)."')).toEqual(cljRegex('.', 's'))
    })

    it('extracts multiple leading flag groups', () => {
      expect(session().evaluate('#"(?i)(?m)^hello"')).toEqual(
        cljRegex('^hello', 'im')
      )
    })

    it('leaves (?:...) non-capturing groups alone', () => {
      expect(session().evaluate('#"(?:foo|bar)"')).toEqual(
        cljRegex('(?:foo|bar)', '')
      )
    })

    it('throws on unsupported (?x) verbose flag', () => {
      expect(() => session().evaluate('#"(?x)foo bar"')).toThrow()
    })
  })

  describe('regexp?', () => {
    it('returns true for a regex', () => {
      expect(session().evaluate('(regexp? #"foo")')).toEqual(cljBoolean(true))
    })

    it('returns false for a string', () => {
      expect(session().evaluate('(regexp? "foo")')).toEqual(cljBoolean(false))
    })

    it('returns false for nil', () => {
      expect(session().evaluate('(regexp? nil)')).toEqual(cljBoolean(false))
    })
  })

  describe('re-pattern', () => {
    it('creates a regex from a string', () => {
      expect(session().evaluate('(re-pattern "\\\\d+")')).toEqual(
        cljRegex('\\d+', '')
      )
    })

    it('extracts inline flags from the string', () => {
      expect(session().evaluate('(re-pattern "(?i)hello")')).toEqual(
        cljRegex('hello', 'i')
      )
    })

    it('throws on non-string argument', () => {
      expect(() => session().evaluate('(re-pattern 42)')).toThrow()
    })
  })

  describe('equality — reference semantics', () => {
    it('two identical literals are not equal (reference equality)', () => {
      expect(session().evaluate('(= #"foo" #"foo")')).toEqual(
        cljBoolean(false)
      )
    })

    it('the same binding is equal to itself', () => {
      const s = session()
      s.evaluate('(def r #"foo")')
      expect(s.evaluate('(= r r)')).toEqual(cljBoolean(true))
    })
  })

  describe('re-find', () => {
    it('returns matched string when there are no capturing groups', () => {
      expect(session().evaluate('(re-find #"\\d+" "abc123def")')).toEqual(
        cljString('123')
      )
    })

    it('returns nil when no match', () => {
      expect(session().evaluate('(re-find #"\\d+" "abc")')).toEqual(cljNil())
    })

    it('returns a vector with whole match and groups when there are captures', () => {
      expect(
        session().evaluate('(re-find #"(\\w+) (\\w+)" "hello world")')
      ).toEqual(
        cljVector([cljString('hello world'), cljString('hello'), cljString('world')])
      )
    })

    it('returns nil for unmatched optional groups', () => {
      expect(
        session().evaluate('(re-find #"(\\d+)(\\w+)?" "123")')
      ).toEqual(
        cljVector([cljString('123'), cljString('123'), cljNil()])
      )
    })

    it('respects (?i) case-insensitive flag', () => {
      expect(session().evaluate('(re-find #"(?i)hello" "Say HELLO")')).toEqual(
        cljString('HELLO')
      )
    })

    it('only returns the first match', () => {
      expect(session().evaluate('(re-find #"\\d" "1a2b3")')).toEqual(
        cljString('1')
      )
    })
  })

  describe('re-matches', () => {
    it('returns the match when the entire string matches', () => {
      expect(session().evaluate('(re-matches #"\\d+" "12345")')).toEqual(
        cljString('12345')
      )
    })

    it('returns nil when only part of the string matches', () => {
      expect(session().evaluate('(re-matches #"\\d+" "123abc")')).toEqual(
        cljNil()
      )
    })

    it('returns nil when there is no match', () => {
      expect(session().evaluate('(re-matches #"\\d+" "abc")')).toEqual(
        cljNil()
      )
    })

    it('returns a vector with groups on full match', () => {
      expect(
        session().evaluate('(re-matches #"(\\w+)@(\\w+)" "user@host")')
      ).toEqual(
        cljVector([cljString('user@host'), cljString('user'), cljString('host')])
      )
    })
  })

  describe('re-seq', () => {
    it('returns a list of all non-overlapping matches', () => {
      expect(session().evaluate('(re-seq #"\\d+" "a1b22c333")')).toEqual(
        cljList([cljString('1'), cljString('22'), cljString('333')])
      )
    })

    it('returns nil when there are no matches', () => {
      expect(session().evaluate('(re-seq #"\\d+" "abc")')).toEqual(cljNil())
    })

    it('returns a list of vectors when there are capturing groups', () => {
      expect(
        session().evaluate('(re-seq #"(\\w+)=(\\w+)" "a=1 b=2")')
      ).toEqual(
        cljList([
          cljVector([cljString('a=1'), cljString('a'), cljString('1')]),
          cljVector([cljString('b=2'), cljString('b'), cljString('2')]),
        ])
      )
    })
  })
})

// ---------------------------------------------------------------------------
// clojure.string — new functions
// ---------------------------------------------------------------------------

describe('clojure.string/upper-case and lower-case', () => {
  it('upper-case converts to all caps', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/upper-case "hello world")')).toEqual(cljString('HELLO WORLD'))
    expect(s.evaluate('(str/upper-case "")')).toEqual(cljString(''))
  })

  it('lower-case converts to all lower', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/lower-case "HELLO WORLD")')).toEqual(cljString('hello world'))
    expect(s.evaluate('(str/lower-case "")')).toEqual(cljString(''))
  })
})

describe('clojure.string/capitalize', () => {
  it('capitalizes first char, lowercases rest', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/capitalize "hello world")')).toEqual(cljString('Hello world'))
    expect(s.evaluate('(str/capitalize "HELLO")')).toEqual(cljString('Hello'))
  })

  it('handles single character', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/capitalize "a")')).toEqual(cljString('A'))
    expect(s.evaluate('(str/capitalize "A")')).toEqual(cljString('A'))
  })

  it('handles empty string', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/capitalize "")')).toEqual(cljString(''))
  })
})

describe('clojure.string/trim, triml, trimr', () => {
  it('trim removes whitespace from both ends', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/trim "  hello  ")')).toEqual(cljString('hello'))
    expect(s.evaluate('(str/trim "hello")')).toEqual(cljString('hello'))
    expect(s.evaluate('(str/trim "   ")')).toEqual(cljString(''))
  })

  it('triml removes whitespace from the left only', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/triml "  hello  ")')).toEqual(cljString('hello  '))
  })

  it('trimr removes whitespace from the right only', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/trimr "  hello  ")')).toEqual(cljString('  hello'))
  })
})

describe('clojure.string/trim-newline', () => {
  it('removes trailing \\n and \\r characters', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/trim-newline "hello\\n")')).toEqual(cljString('hello'))
    expect(s.evaluate('(str/trim-newline "hello\\r\\n")')).toEqual(cljString('hello'))
    expect(s.evaluate('(str/trim-newline "hello\\n\\n")')).toEqual(cljString('hello'))
  })

  it('does not remove non-newline trailing whitespace', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/trim-newline "hello  ")')).toEqual(cljString('hello  '))
  })

  it('returns empty string unchanged', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/trim-newline "")')).toEqual(cljString(''))
  })
})

describe('clojure.string/blank?', () => {
  it('returns true for nil', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/blank? nil)')).toEqual(cljBoolean(true))
  })

  it('returns true for empty string', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/blank? "")')).toEqual(cljBoolean(true))
  })

  it('returns true for whitespace-only string', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/blank? "   ")')).toEqual(cljBoolean(true))
    expect(s.evaluate('(str/blank? "\\t\\n")')).toEqual(cljBoolean(true))
  })

  it('returns false for string with content', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/blank? "hello")')).toEqual(cljBoolean(false))
    expect(s.evaluate('(str/blank? " x ")')).toEqual(cljBoolean(false))
  })
})

describe('clojure.string/starts-with?, ends-with?, includes?', () => {
  it('starts-with? returns true when s starts with substr', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/starts-with? "hello world" "hello")')).toEqual(cljBoolean(true))
    expect(s.evaluate('(str/starts-with? "hello world" "world")')).toEqual(cljBoolean(false))
    expect(s.evaluate('(str/starts-with? "hello" "")')).toEqual(cljBoolean(true))
  })

  it('ends-with? returns true when s ends with substr', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/ends-with? "hello world" "world")')).toEqual(cljBoolean(true))
    expect(s.evaluate('(str/ends-with? "hello world" "hello")')).toEqual(cljBoolean(false))
    expect(s.evaluate('(str/ends-with? "hello" "")')).toEqual(cljBoolean(true))
  })

  it('includes? returns true when s contains substr', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/includes? "hello world" "lo wo")')).toEqual(cljBoolean(true))
    expect(s.evaluate('(str/includes? "hello world" "xyz")')).toEqual(cljBoolean(false))
    expect(s.evaluate('(str/includes? "hello" "")')).toEqual(cljBoolean(true))
  })
})

describe('clojure.string/index-of and last-index-of', () => {
  it('index-of returns index when found', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/index-of "hello" "ll")')).toEqual(cljNumber(2))
    expect(s.evaluate('(str/index-of "hello" "h")')).toEqual(cljNumber(0))
  })

  it('index-of returns nil when not found', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/index-of "hello" "xyz")')).toEqual(cljNil())
  })

  it('index-of with from-index searches from that position', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/index-of "abcabc" "b" 3)')).toEqual(cljNumber(4))
    expect(s.evaluate('(str/index-of "abcabc" "a" 1)')).toEqual(cljNumber(3))
  })

  it('last-index-of returns last index when found', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/last-index-of "abcabc" "b")')).toEqual(cljNumber(4))
  })

  it('last-index-of returns nil when not found', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/last-index-of "hello" "xyz")')).toEqual(cljNil())
  })

  it('last-index-of with from-index searches backward from that position', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/last-index-of "abcabc" "b" 3)')).toEqual(cljNumber(1))
  })
})

describe('clojure.string/reverse', () => {
  it('reverses a simple string', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/reverse "hello")')).toEqual(cljString('olleh'))
    expect(s.evaluate('(str/reverse "")')).toEqual(cljString(''))
    expect(s.evaluate('(str/reverse "a")')).toEqual(cljString('a'))
  })

  it('reverses a string with spaces', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/reverse "hello world")')).toEqual(cljString('dlrow olleh'))
  })
})

describe('clojure.string/replace', () => {
  it('string/string replaces all occurrences literally', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/replace "aabbaa" "aa" "x")')).toEqual(cljString('xbbx'))
    expect(s.evaluate('(str/replace "hello" "x" "y")')).toEqual(cljString('hello'))
  })

  it('string/string treats match as literal (no regex special chars)', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/replace "a.b.c" "." "-")')).toEqual(cljString('a-b-c'))
  })

  it('string/string treats replacement as literal (no $ expansion)', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/replace "hello" "hello" "$0")')).toEqual(cljString('$0'))
  })

  it('regex/string replaces all matches', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/replace "a1b2c3" #"\\d" "X")')).toEqual(cljString('aXbXcX'))
  })

  it('regex/string supports $1 backreferences', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/replace "hello world" #"(\\w+)" "[$1]")')).toEqual(
      cljString('[hello] [world]')
    )
  })

  it('regex/fn calls fn with whole match when no groups', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/replace "hello world" #"\\w+" str/upper-case)')).toEqual(
      cljString('HELLO WORLD')
    )
  })

  it('regex/fn calls fn with vector [whole g1 g2...] when groups present', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(
      s.evaluate('(str/replace "2024-01-15" #"(\\d{4})-(\\d{2})-(\\d{2})" (fn [v] (str (nth v 3) "/" (nth v 2) "/" (nth v 1))))')
    ).toEqual(cljString('15/01/2024'))
  })
})

describe('clojure.string/replace-first', () => {
  it('string/string replaces only the first occurrence', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/replace-first "aabbaa" "aa" "x")')).toEqual(cljString('xbbaa'))
  })

  it('regex/string replaces only the first match', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/replace-first "a1b2c3" #"\\d" "X")')).toEqual(cljString('aXb2c3'))
  })

  it('regex/fn calls fn with the first match only', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/replace-first "hello world" #"\\w+" str/upper-case)')).toEqual(
      cljString('HELLO world')
    )
  })
})

describe('clojure.string/re-quote-replacement', () => {
  it('escapes $ so it is treated literally in replace', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(
      s.evaluate('(str/replace "hello" #"hello" (str/re-quote-replacement "$0 world"))')
    ).toEqual(cljString('$0 world'))
  })

  it('leaves strings without $ unchanged', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/re-quote-replacement "world")')).toEqual(cljString('world'))
  })
})

describe('clojure.string/split-lines', () => {
  it('splits on \\n', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/split-lines "a\\nb\\nc")')).toEqual(
      cljVector([cljString('a'), cljString('b'), cljString('c')])
    )
  })

  it('splits on \\r\\n', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/split-lines "a\\r\\nb\\r\\nc")')).toEqual(
      cljVector([cljString('a'), cljString('b'), cljString('c')])
    )
  })

  it('trailing empty line is dropped', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/split-lines "a\\nb\\n")')).toEqual(
      cljVector([cljString('a'), cljString('b')])
    )
  })
})

describe('clojure.string/escape', () => {
  it('replaces characters found in cmap', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(
      s.evaluate('(str/escape "This <test>" {"<" "&lt;" ">" "&gt;"})')
    ).toEqual(cljString('This &lt;test&gt;'))
  })

  it('passes through characters not in cmap', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/escape "abc" {"x" "X"})')).toEqual(cljString('abc'))
  })

  it('handles empty string', () => {
    const s = session()
    s.evaluate("(require '[clojure.string :as str])")
    expect(s.evaluate('(str/escape "" {"a" "b"})')).toEqual(cljString(''))
  })
})
