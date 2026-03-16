import { describe, expect, it } from 'vitest'
import { isEqual } from '../../assertions'
import { cljNil, cljNumber, cljVector } from '../../factories'
import { EvaluationError } from '../../errors'
import { freshSession, toCljValue } from './evaluator-test-utils'

describe('destructuring', () => {
  describe('vector destructuring in let', () => {
    it('basic positional', () => {
      const session = freshSession()
      const result = session.evaluate('(let [[a b] [1 2]] [a b])')
      expect(isEqual(result, toCljValue([1, 2]))).toBe(true)
    })

    it('fewer values than patterns yields nil', () => {
      const session = freshSession()
      const result = session.evaluate('(let [[a b c] [1 2]] [a b c])')
      expect(isEqual(result, cljVector([cljNumber(1), cljNumber(2), cljNil()]))).toBe(true)
    })

    it('more values than patterns ignores extras', () => {
      const session = freshSession()
      const result = session.evaluate('(let [[a] [1 2 3]] a)')
      expect(isEqual(result, cljNumber(1))).toBe(true)
    })

    it('rest with & collects remaining', () => {
      const session = freshSession()
      const result = session.evaluate('(let [[a & more] [1 2 3]] [a (first more) (count more)])')
      expect(isEqual(result, toCljValue([1, 2, 2]))).toBe(true)
    })

    it('rest with no remaining values is nil', () => {
      const session = freshSession()
      const result = session.evaluate('(let [[a & more] [1]] more)')
      expect(isEqual(result, cljNil())).toBe(true)
    })

    it(':as binds the original value', () => {
      const session = freshSession()
      const result = session.evaluate('(let [[a b :as v] [1 2 3]] v)')
      expect(isEqual(result, toCljValue([1, 2, 3]))).toBe(true)
    })

    it(':as with positional bindings', () => {
      const session = freshSession()
      const result = session.evaluate('(let [[a b :as v] [10 20 30]] [a b (count v)])')
      expect(isEqual(result, toCljValue([10, 20, 3]))).toBe(true)
    })

    it('nested vector destructuring', () => {
      const session = freshSession()
      const result = session.evaluate('(let [[[a b] c] [[1 2] 3]] [a b c])')
      expect(isEqual(result, toCljValue([1, 2, 3]))).toBe(true)
    })

    it('deeply nested destructuring', () => {
      const session = freshSession()
      const result = session.evaluate('(let [[[[x]]] [[[42]]]] x)')
      expect(isEqual(result, cljNumber(42))).toBe(true)
    })

    it('nil value destructures to all nil', () => {
      const session = freshSession()
      const result = session.evaluate('(let [[a b] nil] [a b])')
      expect(isEqual(result, cljVector([cljNil(), cljNil()]))).toBe(true)
    })

    it('destructuring a list (not just vectors)', () => {
      const session = freshSession()
      const result = session.evaluate("(let [[a b] '(10 20)] [a b])")
      expect(isEqual(result, toCljValue([10, 20]))).toBe(true)
    })

    it('rest destructuring of the rest pattern', () => {
      const session = freshSession()
      const result = session.evaluate('(let [[a & [b c]] [1 2 3]] [a b c])')
      expect(isEqual(result, toCljValue([1, 2, 3]))).toBe(true)
    })
  })

  describe('map destructuring in let', () => {
    it('direct symbol-to-keyword binding', () => {
      const session = freshSession()
      const result = session.evaluate('(let [{a :a b :b} {:a 1 :b 2}] [a b])')
      expect(isEqual(result, toCljValue([1, 2]))).toBe(true)
    })

    it(':keys shorthand', () => {
      const session = freshSession()
      const result = session.evaluate('(let [{:keys [a b]} {:a 1 :b 2}] [a b])')
      expect(isEqual(result, toCljValue([1, 2]))).toBe(true)
    })

    it(':strs shorthand', () => {
      const session = freshSession()
      const result = session.evaluate('(let [{:strs [a b]} {"a" 1 "b" 2}] [a b])')
      expect(isEqual(result, toCljValue([1, 2]))).toBe(true)
    })

    it(':as binds the original map', () => {
      const session = freshSession()
      const result = session.evaluate('(let [{:keys [a] :as m} {:a 1 :b 2}] [a (:b m)])')
      expect(isEqual(result, toCljValue([1, 2]))).toBe(true)
    })

    it(':or provides defaults for absent keys', () => {
      const session = freshSession()
      const result = session.evaluate('(let [{:keys [a b] :or {b 99}} {:a 1}] [a b])')
      expect(isEqual(result, toCljValue([1, 99]))).toBe(true)
    })

    it(':or does not fire when key is present with nil value (contains? semantics)', () => {
      const session = freshSession()
      const result = session.evaluate('(let [{:keys [a] :or {a 99}} {:a nil}] a)')
      expect(isEqual(result, cljNil())).toBe(true)
    })

    it(':or evaluates expressions lazily', () => {
      const session = freshSession()
      const result = session.evaluate('(let [{:keys [x] :or {x (+ 1 2)}} {}] x)')
      expect(isEqual(result, cljNumber(3))).toBe(true)
    })

    it(':or does not evaluate default when key is present', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (let [called (atom false)
              {:keys [x] :or {x (do (reset! called true) 99)}} {:x 42}]
          [x @called])
      `)
      expect(isEqual(result, cljVector([cljNumber(42), { kind: 'boolean', value: false }]))).toBe(true)
    })

    it('missing key without :or yields nil', () => {
      const session = freshSession()
      const result = session.evaluate('(let [{:keys [z]} {:a 1}] z)')
      expect(isEqual(result, cljNil())).toBe(true)
    })

    it('nil value destructures to all nil', () => {
      const session = freshSession()
      const result = session.evaluate('(let [{:keys [a b]} nil] [a b])')
      expect(isEqual(result, cljVector([cljNil(), cljNil()]))).toBe(true)
    })

    it('nested map destructuring via direct binding', () => {
      const session = freshSession()
      const result = session.evaluate('(let [{{:keys [x]} :inner} {:inner {:x 42}}] x)')
      expect(isEqual(result, cljNumber(42))).toBe(true)
    })

    it(':keys and :strs together', () => {
      const session = freshSession()
      const result = session.evaluate('(let [{:keys [a] :strs [b]} {:a 1 "b" 2}] [a b])')
      expect(isEqual(result, toCljValue([1, 2]))).toBe(true)
    })

    it(':or with :strs', () => {
      const session = freshSession()
      const result = session.evaluate('(let [{:strs [x] :or {x 50}} {}] x)')
      expect(isEqual(result, cljNumber(50))).toBe(true)
    })
  })

  describe('mixed vector and map destructuring', () => {
    it('map inside vector', () => {
      const session = freshSession()
      const result = session.evaluate('(let [[a {:keys [b]}] [1 {:b 2}]] [a b])')
      expect(isEqual(result, toCljValue([1, 2]))).toBe(true)
    })

    it('vector inside map', () => {
      const session = freshSession()
      const result = session.evaluate('(let [{[a b] :pair} {:pair [10 20]}] [a b])')
      expect(isEqual(result, toCljValue([10, 20]))).toBe(true)
    })
  })

  describe('destructuring in fn params', () => {
    it('vector destructuring in fn', () => {
      const session = freshSession()
      const result = session.evaluate('((fn [[a b]] (+ a b)) [1 2])')
      expect(isEqual(result, cljNumber(3))).toBe(true)
    })

    it('map destructuring in fn', () => {
      const session = freshSession()
      const result = session.evaluate('((fn [{:keys [x y]}] (+ x y)) {:x 3 :y 4})')
      expect(isEqual(result, cljNumber(7))).toBe(true)
    })

    it('rest param with vector destructuring', () => {
      const session = freshSession()
      const result = session.evaluate('((fn [a & [b c]] [a b c]) 1 2 3)')
      expect(isEqual(result, toCljValue([1, 2, 3]))).toBe(true)
    })

    it('mixed plain and destructured params', () => {
      const session = freshSession()
      const result = session.evaluate('((fn [x [a b] y] [x a b y]) 0 [1 2] 3)')
      expect(isEqual(result, toCljValue([0, 1, 2, 3]))).toBe(true)
    })

    it('defn with destructuring', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (defn add-pair [[a b]] (+ a b))
        (add-pair [3 4])
      `)
      expect(isEqual(result, cljNumber(7))).toBe(true)
    })

    it('defn with map destructuring', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (defn greet [{:keys [name greeting] :or {greeting "Hello"}}]
          (str greeting ", " name))
        (greet {:name "World"})
      `)
      expect(isEqual(result, { kind: 'string', value: 'Hello, World' })).toBe(true)
    })
  })

  describe('destructuring in loop/recur', () => {
    it('vector destructuring with recur rebinding', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (loop [[x & xs] [1 2 3] acc 0]
          (if (nil? x)
            acc
            (recur xs (+ acc x))))
      `)
      expect(isEqual(result, cljNumber(6))).toBe(true)
    })

    it('map destructuring in loop', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (loop [{:keys [n acc]} {:n 5 :acc 1}]
          (if (<= n 1)
            acc
            (recur {:n (dec n) :acc (* acc n)})))
      `)
      expect(isEqual(result, cljNumber(120))).toBe(true)
    })

    it('recur with correct arity for top-level patterns', () => {
      const session = freshSession()
      expect(() => {
        session.evaluate(`
          (loop [[x & xs] [1 2 3] acc 0]
            (recur xs))
        `)
      }).toThrow(EvaluationError)
    })
  })

  describe(':syms shorthand', () => {
    it('basic symbol key lookup', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (let [m {'a 1 'b 2}
              {:syms [a b]} m]
          [a b])
      `)
      expect(isEqual(result, toCljValue([1, 2]))).toBe(true)
    })

    it('missing symbol key yields nil', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (let [{:syms [z]} {'a 1}] z)
      `)
      expect(isEqual(result, cljNil())).toBe(true)
    })

    it(':syms with :or defaults', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (let [{:syms [x] :or {x 42}} {}] x)
      `)
      expect(isEqual(result, cljNumber(42))).toBe(true)
    })

    it(':syms with :as', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (let [{:syms [a] :as m} {'a 10}]
          [a (get m 'a)])
      `)
      expect(isEqual(result, toCljValue([10, 10]))).toBe(true)
    })

    it(':syms combined with :keys', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (let [{:syms [x] :keys [y]} {'x 1 :y 2}]
          [x y])
      `)
      expect(isEqual(result, toCljValue([1, 2]))).toBe(true)
    })
  })

  describe('kwargs-style rest destructuring (& {:keys [...]})', () => {
    it('fn with kwargs rest', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (defn make-person [name & {:keys [age city]}]
          [name age city])
        (make-person "Alice" :age 30 :city "NYC")
      `)
      expect(isEqual(result, toCljValue(['Alice', 30, 'NYC']))).toBe(true)
    })

    it('kwargs rest with :or defaults', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (defn greet [name & {:keys [greeting] :or {greeting "Hello"}}]
          (str greeting ", " name))
        (greet "World")
      `)
      expect(isEqual(result, { kind: 'string', value: 'Hello, World' })).toBe(true)
    })

    it('kwargs rest with :as captures the coerced map', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (defn f [a & {:keys [b] :as opts}]
          [a b (:c opts)])
        (f 1 :b 2 :c 3)
      `)
      expect(isEqual(result, toCljValue([1, 2, 3]))).toBe(true)
    })

    it('kwargs rest in let via vector destructuring', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (let [[x & {:keys [y z]}] [1 :y 2 :z 3]]
          [x y z])
      `)
      expect(isEqual(result, toCljValue([1, 2, 3]))).toBe(true)
    })

    it('kwargs rest with no trailing args yields nil bindings', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (defn f [a & {:keys [b]}] [a b])
        (f 1)
      `)
      expect(isEqual(result, cljVector([cljNumber(1), cljNil()]))).toBe(true)
    })

    it('kwargs rest with odd number of trailing args handles gracefully', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (let [[a & {:keys [b]}] [1 :b]] [a b])
      `)
      expect(isEqual(result, cljVector([cljNumber(1), cljNil()]))).toBe(true)
    })
  })

  describe('qualified :keys', () => {
    it('qualified keyword lookup with ns/name', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (let [{:keys [person/name person/age]} {:person/name "Alice" :person/age 30}]
          [name age])
      `)
      expect(isEqual(result, toCljValue(['Alice', 30]))).toBe(true)
    })

    it('qualified and unqualified :keys together', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (let [{:keys [x db/id]} {:x 1 :db/id 42}]
          [x id])
      `)
      expect(isEqual(result, toCljValue([1, 42]))).toBe(true)
    })

    it('qualified :keys with :or defaults', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (let [{:keys [ns/foo] :or {foo 99}} {}] foo)
      `)
      expect(isEqual(result, cljNumber(99))).toBe(true)
    })

    it('qualified :keys missing key yields nil', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (let [{:keys [ns/foo]} {:other/foo 1}] foo)
      `)
      expect(isEqual(result, cljNil())).toBe(true)
    })

    it('qualified :keys in fn params', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (defn get-name [{:keys [user/name user/email]}]
          (str name " <" email ">"))
        (get-name {:user/name "Bob" :user/email "bob@example.com"})
      `)
      expect(isEqual(result, { kind: 'string', value: 'Bob <bob@example.com>' })).toBe(true)
    })
  })

  describe('error cases', () => {
    it('invalid pattern type throws', () => {
      const session = freshSession()
      expect(() => {
        session.evaluate('(let [42 :val] 42)')
      }).toThrow(EvaluationError)
    })

    it('destructuring non-sequential as vector throws', () => {
      const session = freshSession()
      expect(() => {
        session.evaluate('(let [[a b] 42] a)')
      }).toThrow(EvaluationError)
    })

    it('destructuring non-map as map throws', () => {
      const session = freshSession()
      expect(() => {
        session.evaluate('(let [{:keys [a]} [1 2]] a)')
      }).toThrow(EvaluationError)
    })
  })
})
