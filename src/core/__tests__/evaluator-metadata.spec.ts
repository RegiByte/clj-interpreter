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
} from '../factories'
import { createSession } from '../session'
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
      expect(s.evaluate('(:doc (meta add))')).toMatchObject(
        cljString('Adds two numbers.')
      )
    })

    it('meta carries :arglists even when defn has no docstring', () => {
      const s = freshSession()
      s.evaluate('(defn add [a b] (+ a b))')
      expect(s.evaluate('(vector? (:arglists (meta add)))')).toMatchObject(
        cljBoolean(true)
      )
      expect(s.evaluate('(:doc (meta add))')).toMatchObject(cljNil())
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
      expect(s.evaluate('(:doc (meta greet))')).toMatchObject(
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
      expect(outputs).toEqual(['([coll])\n\nIncrements every element.'])
    })

    it('prints arglists then docstring for a native function', () => {
      const outputs: string[] = []
      const s = createSession({ output: (t) => outputs.push(t) })
      s.evaluate('(doc reduce)')
      expect(outputs).toHaveLength(1)
      expect(outputs[0]).toMatch(/^\(\[f coll\]\)\n\(\[f val coll\]\)\n/)
      expect(outputs[0]).toContain('Reduces a collection')
    })

    it('prints fallback message for an undocumented function', () => {
      const outputs: string[] = []
      const s = createSession({ output: (t) => outputs.push(t) })
      s.evaluate('(def f (fn [x] x))')
      s.evaluate('(doc f)')
      expect(outputs).toEqual(['No documentation available.'])
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
      expect(s.evaluate('(:arglists (meta f))')).toMatchObject(
        cljVector([cljVector([cljSymbol('x')])])
      )
    })

    it(':arglists contains all param vectors for multi-arity defn', () => {
      const s = freshSession()
      s.evaluate('(defn f ([x] x) ([x y] (+ x y)))')
      expect(s.evaluate('(:arglists (meta f))')).toMatchObject(
        cljVector([
          cljVector([cljSymbol('x')]),
          cljVector([cljSymbol('x'), cljSymbol('y')]),
        ])
      )
    })

    it(':arglists includes & for variadic params', () => {
      const s = freshSession()
      s.evaluate('(defn f [x & rest] rest)')
      const arglists = s.evaluate('(:arglists (meta f))')
      expect(arglists).toMatchObject(
        cljVector([
          cljVector([cljSymbol('x'), cljSymbol('&'), cljSymbol('rest')]),
        ])
      )
    })

    it(':arglists is present on defn with docstring', () => {
      const s = freshSession()
      s.evaluate('(defn f "Docs." [a b] (+ a b))')
      expect(s.evaluate('(:arglists (meta f))')).toMatchObject(
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

    it('doc prints each arity on its own line for multi-arity', () => {
      const outputs: string[] = []
      const s = createSession({ output: (t) => outputs.push(t) })
      s.evaluate('(defn f "Multi." ([x] x) ([x y] x))')
      s.evaluate('(doc f)')
      expect(outputs).toEqual(['([x])\n([x y])\n\nMulti.'])
    })

    it('doc prints arglists for defn without docstring', () => {
      const outputs: string[] = []
      const s = createSession({ output: (t) => outputs.push(t) })
      s.evaluate('(defn f [x] x)')
      s.evaluate('(doc f)')
      expect(outputs).toEqual(['([x])\n\nNo documentation available.'])
    })

    it('doc prints arglists for identity (native)', () => {
      const outputs: string[] = []
      const s = createSession({ output: (t) => outputs.push(t) })
      s.evaluate('(doc identity)')
      expect(outputs).toHaveLength(1)
      expect(outputs[0]).toMatch(/^\(\[x\]\)\n/)
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
