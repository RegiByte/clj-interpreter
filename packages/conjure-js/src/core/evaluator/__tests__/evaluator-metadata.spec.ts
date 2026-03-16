import { describe, expect, it } from 'vitest'
import {
  cljBoolean,
  cljKeyword,
  cljMap,
  cljNil,
  cljNumber,
  cljString,
  cljSymbol,
  cljVector,
} from '../../factories'
import { createSession } from '../../session'
import { expectError, freshSession } from './evaluator-test-utils'

describe('docstrings and metadata', () => {
  describe('with-meta / meta', () => {
    it('with-meta attaches a map to a function', () => {
      const s = freshSession()
      expect(
        s.evaluate('(with-meta (fn [x] x) {:doc "identity"})')
      ).toMatchObject({ kind: 'function', meta: { kind: 'map' } })
    })

    it('meta returns the attached map', () => {
      const s = freshSession()
      s.evaluate('(def f (with-meta (fn [x] x) {:doc "my doc"}))')
      expect(s.evaluate('(meta f)')).toMatchObject(
        cljMap([[cljKeyword(':doc'), cljString('my doc')]])
      )
    })

    it('meta returns nil for a function with no metadata', () => {
      const s = freshSession()
      s.evaluate('(def f (fn [x] x))')
      expect(s.evaluate('(meta f)')).toMatchObject(cljNil())
    })

    it(':doc key is accessible from the metadata map', () => {
      const s = freshSession()
      s.evaluate('(def f (with-meta (fn [x] x) {:doc "the doc"}))')
      expect(s.evaluate('(:doc (meta f))')).toMatchObject(
        cljString('the doc')
      )
    })
  })

  describe('defn with docstring', () => {
    it('attaches :doc metadata when docstring is provided', () => {
      const s = freshSession()
      s.evaluate('(defn add "Adds two numbers." [a b] (+ a b))')
      expect(s.evaluate("(:doc (meta #'add))")).toMatchObject(
        cljString('Adds two numbers.')
      )
    })

    it('meta carries :arglists even when defn has no docstring', () => {
      const s = freshSession()
      s.evaluate('(defn add [a b] (+ a b))')
      expect(s.evaluate("(vector? (:arglists (meta #'add)))")).toMatchObject(
        cljBoolean(true)
      )
      expect(s.evaluate("(:doc (meta #'add))")).toMatchObject(cljNil())
    })

    it('defn with docstring still works as a normal function', () => {
      const s = freshSession()
      s.evaluate('(defn square "Squares a number." [x] (* x x))')
      expect(s.evaluate('(square 5)')).toMatchObject(cljNumber(25))
    })

    it('defn with docstring works with multi-arity', () => {
      const s = freshSession()
      s.evaluate(
        '(defn greet "Returns a greeting." ([name] (str "Hello " name)) ([greeting name] (str greeting " " name)))'
      )
      expect(s.evaluate('(greet "Alice")')).toMatchObject(
        cljString('Hello Alice')
      )
      expect(s.evaluate('(greet "Hi" "Bob")')).toMatchObject(
        cljString('Hi Bob')
      )
      expect(s.evaluate("(:doc (meta #'greet))")).toMatchObject(
        cljString('Returns a greeting.')
      )
    })
  })

  describe('native function metadata', () => {
    it('reduce has a :doc entry in its metadata', () => {
      const s = freshSession()
      expect(s.evaluate('(string? (:doc (meta reduce)))')).toMatchObject(
        cljBoolean(true)
      )
    })

    it('apply has a :doc entry in its metadata', () => {
      const s = freshSession()
      expect(s.evaluate('(string? (:doc (meta apply)))')).toMatchObject(
        cljBoolean(true)
      )
    })

    it('comp has a :doc entry in its metadata', () => {
      const s = freshSession()
      expect(s.evaluate('(string? (:doc (meta comp)))')).toMatchObject(
        cljBoolean(true)
      )
    })

    it('partial has a :doc entry in its metadata', () => {
      const s = freshSession()
      expect(s.evaluate('(string? (:doc (meta partial)))')).toMatchObject(
        cljBoolean(true)
      )
    })

    it('identity has a :doc entry in its metadata', () => {
      const s = freshSession()
      expect(s.evaluate('(string? (:doc (meta identity)))')).toMatchObject(
        cljBoolean(true)
      )
    })
  })

  describe('doc macro', () => {
    it('prints arglists then docstring for a user-defined function', () => {
      const outputs: string[] = []
      const s = createSession({ output: (t) => outputs.push(t) })
      s.evaluate(
        '(defn inc-all "Increments every element." [coll] (map inc coll))'
      )
      s.evaluate('(doc inc-all)')
      expect(outputs).toEqual(['-------------------------\ninc-all\n([coll])\n  Increments every element.\n'])
    })

    it('prints arglists then docstring for a native function', () => {
      const outputs: string[] = []
      const s = createSession({ output: (t) => outputs.push(t) })
      s.evaluate('(doc reduce)')
      expect(outputs).toHaveLength(1)
      expect(outputs[0]).toMatch(/^-------------------------\nreduce\n\(\[f coll\] \n \[f val coll\]\)\n/)
      expect(outputs[0]).toContain('Reduces a collection')
    })

    it('prints fallback message for an undocumented function', () => {
      const outputs: string[] = []
      const s = createSession({ output: (t) => outputs.push(t) })
      s.evaluate('(def f (fn [x] x))')
      s.evaluate('(doc f)')
      expect(outputs).toEqual(['-------------------------\nf\n  No documentation available.\n'])
    })

    it('doc returns nil', () => {
      const outputs: string[] = []
      const s = createSession({ output: (t) => outputs.push(t) })
      s.evaluate('(defn f "A fn." [x] x)')
      expect(s.evaluate('(doc f)')).toMatchObject(cljNil())
    })
  })

  describe('arglists metadata', () => {
    it(':arglists is a vector containing the single param vector', () => {
      const s = freshSession()
      s.evaluate('(defn f [x] x)')
      expect(s.evaluate("(:arglists (meta #'f))")).toMatchObject(
        cljVector([cljVector([cljSymbol('x')])])
      )
    })

    it(':arglists contains all param vectors for multi-arity defn', () => {
      const s = freshSession()
      s.evaluate('(defn f ([x] x) ([x y] (+ x y)))')
      expect(s.evaluate("(:arglists (meta #'f))")).toMatchObject(
        cljVector([
          cljVector([cljSymbol('x')]),
          cljVector([cljSymbol('x'), cljSymbol('y')]),
        ])
      )
    })

    it(':arglists includes & for variadic params', () => {
      const s = freshSession()
      s.evaluate('(defn f [x & rest] rest)')
      const arglists = s.evaluate("(:arglists (meta #'f))")
      expect(arglists).toMatchObject(
        cljVector([
          cljVector([cljSymbol('x'), cljSymbol('&'), cljSymbol('rest')]),
        ])
      )
    })

    it(':arglists is present on defn with docstring', () => {
      const s = freshSession()
      s.evaluate('(defn f "Docs." [a b] (+ a b))')
      expect(s.evaluate("(:arglists (meta #'f))")).toMatchObject(
        cljVector([cljVector([cljSymbol('a'), cljSymbol('b')])])
      )
    })

    it(':arglists is present on native functions (identity)', () => {
      const s = freshSession()
      expect(s.evaluate('(:arglists (meta identity))')).toMatchObject(
        cljVector([cljVector([cljSymbol('x')])])
      )
    })

    it(':arglists is present on native functions (comp)', () => {
      const s = freshSession()
      expect(s.evaluate('(vector? (:arglists (meta comp)))')).toMatchObject(
        cljBoolean(true)
      )
    })

    it('doc prints all arities, one per line, for multi-arity', () => {
      const outputs: string[] = []
      const s = createSession({ output: (t) => outputs.push(t) })
      s.evaluate('(defn f "Multi." ([x] x) ([x y] x))')
      s.evaluate('(doc f)')
      expect(outputs).toEqual(['-------------------------\nf\n([x] \n [x y])\n  Multi.\n'])
    })

    it('doc prints arglists for defn without docstring', () => {
      const outputs: string[] = []
      const s = createSession({ output: (t) => outputs.push(t) })
      s.evaluate('(defn f [x] x)')
      s.evaluate('(doc f)')
      expect(outputs).toEqual(['-------------------------\nf\n([x])\n  No documentation available.\n'])
    })

    it('doc prints arglists for identity (native)', () => {
      const outputs: string[] = []
      const s = createSession({ output: (t) => outputs.push(t) })
      s.evaluate('(doc identity)')
      expect(outputs).toHaveLength(1)
      expect(outputs[0]).toMatch(/^-------------------------\nidentity\n\(\[x\]\)\n/)
    })
  })
})

describe('pos? / neg? / zero?', () => {
  it.each([
    ['(pos? 1)', true],
    ['(pos? 0)', false],
    ['(pos? -1)', false],
    ['(neg? -1)', true],
    ['(neg? 0)', false],
    ['(neg? 1)', false],
    ['(zero? 0)', true],
    ['(zero? 1)', false],
    ['(zero? -1)', false],
  ])('%s → %s', (code, expected) => {
    const s = freshSession()
    expect(s.evaluate(code)).toEqual(cljBoolean(expected as boolean))
  })

  it('pos? throws on non-number', () => {
    expectError('(pos? "a")', 'pos? expects a number')
  })
  it('neg? throws on non-number', () => {
    expectError('(neg? "a")', 'neg? expects a number')
  })
  it('zero? throws on non-number', () => {
    expectError('(zero? "a")', 'zero? expects a number')
  })
})

describe('scientific notation literals', () => {
  it('evaluates a bare integer exponent: 1e10', () => {
    const s = freshSession()
    expect(s.evaluate('1e10')).toEqual(cljNumber(1e10))
  })

  it('evaluates uppercase E: 1E10', () => {
    const s = freshSession()
    expect(s.evaluate('1E10')).toEqual(cljNumber(1e10))
  })

  it('evaluates explicit positive exponent: 1e+10', () => {
    const s = freshSession()
    expect(s.evaluate('1e+10')).toEqual(cljNumber(1e10))
  })

  it('evaluates negative exponent: 1e-10', () => {
    const s = freshSession()
    expect(s.evaluate('1e-10')).toEqual(cljNumber(1e-10))
  })

  it('evaluates the factorial(30) result as a literal: 2.652528598121911e+32', () => {
    const s = freshSession()
    expect(s.evaluate('2.652528598121911e+32')).toEqual(
      cljNumber(2.652528598121911e32)
    )
  })

  it('factorial with loop/recur produces the correct result for n=30', () => {
    const s = freshSession()
    s.evaluate(`
      (defn factorial [n]
        (loop [i n acc 1]
          (if (zero? i) acc
            (recur (dec i) (* acc i)))))
    `)
    expect(s.evaluate('(factorial 30)')).toEqual(
      cljNumber(2.652528598121911e32)
    )
  })

  it('arithmetic with scientific notation literals', () => {
    const s = freshSession()
    expect(s.evaluate('(+ 1e3 2e3)')).toEqual(cljNumber(3000))
  })
})

describe('metadata on collections', () => {
  it('with-meta attaches metadata to a vector', () => {
    const s = freshSession()
    expect(s.evaluate('(with-meta [1 2 3] {:tag "vec"})')).toMatchObject({
      kind: 'vector',
      meta: { kind: 'map' },
    })
  })

  it('meta returns the attached map from a vector', () => {
    const s = freshSession()
    expect(s.evaluate('(meta (with-meta [1 2 3] {:tag "vec"}))')).toMatchObject(
      cljMap([[cljKeyword(':tag'), cljString('vec')]])
    )
  })

  it('meta returns the attached map from a map', () => {
    const s = freshSession()
    expect(s.evaluate('(meta (with-meta {:a 1} {:source "db"}))')).toMatchObject(
      cljMap([[cljKeyword(':source'), cljString('db')]])
    )
  })

  it('meta returns the attached map from a list', () => {
    const s = freshSession()
    expect(s.evaluate("(meta (with-meta '(1 2 3) {:kind \"list\"}))")).toMatchObject(
      cljMap([[cljKeyword(':kind'), cljString('list')]])
    )
  })

  it('meta returns nil for a vector with no metadata', () => {
    const s = freshSession()
    expect(s.evaluate('(meta [1 2 3])')).toMatchObject(cljNil())
  })

  it('equality is transparent to metadata on collections', () => {
    const s = freshSession()
    expect(s.evaluate('(= [1 2] (with-meta [1 2] {:foo 1}))')).toMatchObject(
      cljBoolean(true)
    )
  })
})

describe('metadata on symbols', () => {
  it('with-meta attaches metadata to a quoted symbol', () => {
    const s = freshSession()
    expect(s.evaluate("(meta (with-meta 'foo {:tag \"sym\"}))")).toMatchObject(
      cljMap([[cljKeyword(':tag'), cljString('sym')]])
    )
  })

  it('meta returns nil for an unadorned quoted symbol', () => {
    const s = freshSession()
    expect(s.evaluate("(meta 'foo)")).toMatchObject(cljNil())
  })
})

describe('^ reader macro on collections', () => {
  it('^:keyword attaches boolean true metadata to a vector', () => {
    const s = freshSession()
    expect(s.evaluate('(meta ^:special [1 2 3])')).toMatchObject(
      cljMap([[cljKeyword(':special'), cljBoolean(true)]])
    )
  })

  it('^{map} attaches map metadata to a vector', () => {
    const s = freshSession()
    expect(s.evaluate('(meta ^{:tag "vec"} [1 2 3])')).toMatchObject(
      cljMap([[cljKeyword(':tag'), cljString('vec')]])
    )
  })

  it('^:keyword attaches metadata to a map literal', () => {
    const s = freshSession()
    expect(s.evaluate('(meta ^:indexed {:a 1})')).toMatchObject(
      cljMap([[cljKeyword(':indexed'), cljBoolean(true)]])
    )
  })
})

describe('vary-meta', () => {
  it('adds a key to metadata', () => {
    const s = freshSession()
    expect(s.evaluate('(:extra (meta (vary-meta [1 2] assoc :extra "val")))')).toMatchObject(
      cljString('val')
    )
  })

  it('merges onto existing metadata', () => {
    const s = freshSession()
    s.evaluate('(def v (with-meta [1 2] {:a 1}))')
    const result = s.evaluate('(meta (vary-meta v assoc :b 2))')
    expect(result).toMatchObject({ kind: 'map' })
    expect(s.evaluate('(:a (meta (vary-meta v assoc :b 2)))')).toMatchObject(cljNumber(1))
    expect(s.evaluate('(:b (meta (vary-meta v assoc :b 2)))')).toMatchObject(cljNumber(2))
  })

  it('equality still ignores metadata after vary-meta', () => {
    const s = freshSession()
    expect(s.evaluate('(= (vary-meta [1 2] assoc :x 1) [1 2])')).toMatchObject(
      cljBoolean(true)
    )
  })
})

describe('var source positions', () => {
  it('stamps :line and :column on a def', () => {
    const s = freshSession()
    // "(def foo 42)" — "foo" starts at offset 5 → line 1, col 5
    s.evaluate('(def foo 42)')
    expect(s.evaluate('(:line   (meta #\'foo))')).toMatchObject(cljNumber(1))
    expect(s.evaluate('(:column (meta #\'foo))')).toMatchObject(cljNumber(5))
  })

  it('applies lineOffset when provided', () => {
    const s = freshSession()
    s.evaluate('(def foo 42)', { lineOffset: 9 })
    // line 1 in snippet + offset 9 = line 10
    expect(s.evaluate('(:line (meta #\'foo))')).toMatchObject(cljNumber(10))
  })

  it('applies colOffset on line 1 only', () => {
    const s = freshSession()
    // offset 3 columns: col 5 + 3 = 8
    s.evaluate('(def foo 42)', { colOffset: 3 })
    expect(s.evaluate('(:column (meta #\'foo))')).toMatchObject(cljNumber(8))
    // second def is on line 2 — colOffset must NOT apply
    s.evaluate('(def bar 1)\n(def baz 2)', { colOffset: 3 })
    expect(s.evaluate('(:column (meta #\'bar))')).toMatchObject(cljNumber(8)) // line 1, col 5+3
    expect(s.evaluate('(:column (meta #\'baz))')).toMatchObject(cljNumber(5)) // line 2, col 5 (no offset)
  })

  it('stamps :line on second form in a multi-line evaluate', () => {
    const s = freshSession()
    s.evaluate('(def bar 1)\n(def baz 2)')
    expect(s.evaluate('(:line (meta #\'bar))')).toMatchObject(cljNumber(1))
    expect(s.evaluate('(:line (meta #\'baz))')).toMatchObject(cljNumber(2))
  })

  it('stamps :file when loadFile provides a filePath', () => {
    const s = freshSession()
    s.loadFile('(ns demo.math)\n(def pi 3.14)', 'demo.math', '/src/demo/math.clj')
    s.setNs('demo.math')
    expect(s.evaluate('(:file (meta #\'pi))')).toMatchObject(cljString('/src/demo/math.clj'))
    expect(s.evaluate('(:line (meta #\'pi))')).toMatchObject(cljNumber(2))
  })

  it('no :file when loadFile is called without a filePath', () => {
    const s = freshSession()
    s.loadFile('(ns demo.core)\n(def x 1)', 'demo.core')
    s.setNs('demo.core')
    expect(s.evaluate('(:file (meta #\'x))')).toMatchObject(cljNil())
  })

  it('preserves ^:dynamic alongside position metadata', () => {
    const s = freshSession()
    s.evaluate('(def ^:dynamic *level* 0)')
    expect(s.evaluate('(:dynamic (meta #\'*level*))')).toMatchObject(cljBoolean(true))
    expect(s.evaluate('(:line   (meta #\'*level*))')).toMatchObject(cljNumber(1))
  })

  it('updates position on re-def', () => {
    const s = freshSession()
    s.evaluate('(def x 1)')
    s.evaluate('\n(def x 2)', { lineOffset: 5 })
    // second def is on line 2 of the snippet + offset 5 = line 7
    expect(s.evaluate('(:line (meta #\'x))')).toMatchObject(cljNumber(7))
  })
})

describe('alter-meta!', () => {
  it('adds a key to var metadata', () => {
    const s = freshSession()
    s.evaluate('(def x 1)')
    s.evaluate('(alter-meta! #\'x assoc :my-key "hello")')
    expect(s.evaluate('(:my-key (meta #\'x))')).toMatchObject(cljString('hello'))
  })

  it('returns the new metadata map', () => {
    const s = freshSession()
    s.evaluate('(def x 1)')
    const result = s.evaluate('(alter-meta! #\'x assoc :k 42)')
    expect(result.kind).toBe('map')
    expect(s.evaluate('(:k (alter-meta! #\'x assoc :k 42))')).toMatchObject(cljNumber(42))
  })

  it('f receives nil when var has no prior user metadata', () => {
    const s = freshSession()
    // def with no source context so no auto-stamped meta
    s.evaluate('(def bare-x 1)')
    // clear meta first, then check f receives the current meta (could be a map with pos, or nil)
    s.evaluate('(alter-meta! #\'bare-x (fn [_] nil))')
    expect(s.evaluate('(meta #\'bare-x)')).toMatchObject(cljNil())
    // now f receives nil
    s.evaluate('(alter-meta! #\'bare-x (fn [m] (assoc (or m {}) :added true)))')
    expect(s.evaluate('(:added (meta #\'bare-x))')).toMatchObject(cljBoolean(true))
  })

  it('extra args are forwarded to f', () => {
    const s = freshSession()
    s.evaluate('(def x 1)')
    s.evaluate('(alter-meta! #\'x assoc :a 1 :b 2)')
    expect(s.evaluate('(:a (meta #\'x))')).toMatchObject(cljNumber(1))
    expect(s.evaluate('(:b (meta #\'x))')).toMatchObject(cljNumber(2))
  })

  it('preserves existing meta keys while adding new ones', () => {
    const s = freshSession()
    s.evaluate('(def ^:dynamic *x* 1)')
    s.evaluate('(alter-meta! #\'*x* assoc :tag :extra)')
    expect(s.evaluate('(:dynamic (meta #\'*x*))')).toMatchObject(cljBoolean(true))
    expect(s.evaluate('(:tag (meta #\'*x*))')).toMatchObject(cljKeyword(':extra'))
  })

  it('setting meta to nil clears it', () => {
    const s = freshSession()
    s.evaluate('(def x 1)')
    s.evaluate('(alter-meta! #\'x (fn [_] nil))')
    expect(s.evaluate('(meta #\'x)')).toMatchObject(cljNil())
  })

  it('does not affect the var value', () => {
    const s = freshSession()
    s.evaluate('(def x 42)')
    s.evaluate('(alter-meta! #\'x assoc :k "v")')
    expect(s.evaluate('x')).toMatchObject(cljNumber(42))
  })

  it('works on atoms', () => {
    const s = freshSession()
    s.evaluate('(def a (atom 1))')
    s.evaluate('(alter-meta! a assoc :tag :x)')
    expect(s.evaluate('(:tag (meta a))')).toMatchObject(cljKeyword(':x'))
  })

  it('(meta atom) returns atom metadata', () => {
    const s = freshSession()
    s.evaluate('(def a (atom 99))')
    expect(s.evaluate('(meta a)')).toMatchObject(cljNil())
    s.evaluate('(alter-meta! a assoc :k 1)')
    expect(s.evaluate('(:k (meta a))')).toMatchObject(cljNumber(1))
  })

  it('error: first arg not a var or atom', () => {
    const s = freshSession()
    expect(() => s.evaluate('(alter-meta! 42 assoc :k 1)')).toThrow(/Var or Atom/)
  })

  it('error: second arg not a function', () => {
    const s = freshSession()
    s.evaluate('(def x 1)')
    expect(() => s.evaluate('(alter-meta! #\'x :not-a-fn)')).toThrow(/function/)
  })

  it('error: f returns non-map', () => {
    const s = freshSession()
    s.evaluate('(def x 1)')
    expect(() => s.evaluate('(alter-meta! #\'x (fn [_] "bad"))')).toThrow(/map or nil/)
  })
})
