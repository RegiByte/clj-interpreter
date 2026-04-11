/**
 * Tests for the Clojure-level `destructure` function defined in clojure/core.clj.
 *
 * `destructure` takes a bindings vector (as written in let/loop) and returns an
 * expanded flat vector of [sym expr sym expr ...] pairs suitable for let*.
 *
 * These tests exercise the function directly via session.evaluate, checking
 * structural properties of the expansion (counts, symbol presence, call forms)
 * since gensym values are non-deterministic.
 */
import { describe, expect, it } from 'vitest'
import { isEqual } from '../../assertions'
import { v } from '../../factories'
import { freshSession } from './evaluator-test-utils'

// Helper: evaluate a Clojure expression and assert it returns boolean true
function expectTrue(code: string) {
  const session = freshSession()
  const result = session.evaluate(code)
  expect(isEqual(result, v.boolean(true))).toBe(true)
}

// Helper: evaluate and return the numeric result
function evalCount(code: string): number {
  const session = freshSession()
  const result = session.evaluate(code)
  if (result.kind !== 'number') throw new Error(`Expected number, got ${result.kind}`)
  return result.value
}

describe('destructure (clojure/core.clj)', () => {
  // ── Passthrough: all simple symbols ──────────────────────────────────────
  describe('passthrough — all binding vars are simple symbols', () => {
    it('empty bindings vector returns itself', () => {
      expectTrue("(= (destructure '[]) '[])")
    })

    it('single simple binding returns unchanged', () => {
      expectTrue("(= (destructure '[a 1]) '[a 1])")
    })

    it('multiple simple bindings return unchanged', () => {
      expectTrue("(= (destructure '[a 1 b 2]) '[a 1 b 2])")
    })

    it('symbols bound to any value type pass through', () => {
      expectTrue("(= (destructure '[x :foo y true]) '[x :foo y true])")
    })

    it('result is identical object (not just equal) for simple case', () => {
      // The optimization: return the original vector when no expansion needed
      expectTrue("(vector? (destructure '[a 1 b 2]))")
    })
  })

  // ── Vector pattern expansion ──────────────────────────────────────────────
  describe('vector destructuring expansion', () => {
    it('returns a vector', () => {
      expectTrue("(vector? (destructure '[[a b] v]))")
    })

    it('[a b] expands to 6 elements: gvec v a (nth gvec 0 nil) b (nth gvec 1 nil)', () => {
      expect(evalCount("(count (destructure '[[a b] v]))")).toBe(6)
    })

    it('[a b c] expands to 8 elements', () => {
      expect(evalCount("(count (destructure '[[a b c] v]))")).toBe(8)
    })

    it('user-visible symbol a appears in the result', () => {
      expectTrue("(contains? (set (filter symbol? (destructure '[[a b] v]))) 'a)")
    })

    it('user-visible symbol b appears in the result', () => {
      expectTrue("(contains? (set (filter symbol? (destructure '[[a b] v]))) 'b)")
    })

    it('expansion includes nth calls for positional bindings', () => {
      // At least one element is a list starting with 'nth
      expectTrue("(some #(and (list? %) (= (first %) 'nth)) (destructure '[[a b] v]))")
    })

    it(':as whole — whole appears in the result', () => {
      expectTrue("(contains? (set (filter symbol? (destructure '[[a b :as whole] v]))) 'whole)")
    })

    it('[a b :as whole] expands to 8 elements', () => {
      // gvec v, a (nth 0), b (nth 1), whole gvec
      expect(evalCount("(count (destructure '[[a b :as whole] v]))")).toBe(8)
    })

    it('& rest — more appears in the result', () => {
      expectTrue("(contains? (set (filter symbol? (destructure '[[a & more] v]))) 'more)")
    })

    it('& rest — a appears in the result', () => {
      expectTrue("(contains? (set (filter symbol? (destructure '[[a & more] v]))) 'a)")
    })

    it('& rest — includes seq/first/next forms for lazy-safe traversal', () => {
      // The expansion contains a (seq gvec) call for the seq binding
      expectTrue("(some #(and (list? %) (= (first %) 'seq)) (destructure '[[a & more] v]))")
    })

    it('throws on invalid form after & (only :as allowed)', () => {
      const session = freshSession()
      expect(() =>
        session.evaluate("(destructure '[[a & r x] v])")
      ).toThrow()
    })
  })

  // ── Map pattern expansion ─────────────────────────────────────────────────
  describe('map destructuring expansion', () => {
    it('returns a vector', () => {
      expectTrue("(vector? (destructure '[{:keys [a b]} m]))")
    })

    it(':keys [a b] — expands to 6 elements: gmap m a (get gmap :a) b (get gmap :b)', () => {
      expect(evalCount("(count (destructure '[{:keys [a b]} m]))")).toBe(6)
    })

    it(':keys — user symbol a appears in result', () => {
      expectTrue("(contains? (set (filter symbol? (destructure '[{:keys [a b]} m]))) 'a)")
    })

    it(':keys — user symbol b appears in result', () => {
      expectTrue("(contains? (set (filter symbol? (destructure '[{:keys [a b]} m]))) 'b)")
    })

    it(':keys — expansion includes get calls', () => {
      expectTrue("(some #(and (list? %) (= (first %) 'get)) (destructure '[{:keys [a]} m]))")
    })

    it(':keys — get call uses keyword lookup key :a', () => {
      // The get form contains :a as the lookup key
      expectTrue("(some #(and (list? %) (= (first %) 'get) (= (second (next %)) :a)) (destructure '[{:keys [a]} m]))")
    })

    it('direct {a :foo} — expands to 4 elements: gmap m a (get gmap :foo)', () => {
      expect(evalCount("(count (destructure '[{a :foo} m]))")).toBe(4)
    })

    it('direct {a :foo} — user symbol a appears in result', () => {
      expectTrue("(contains? (set (filter symbol? (destructure '[{a :foo} m]))) 'a)")
    })

    it(':or default — expands to 4 elements (gmap m a <if-form>)', () => {
      // Uses if/contains? expansion: gmap m a (if (contains? gmap :a) (get gmap :a) 42) = 4 elements
      expect(evalCount("(count (destructure '[{:keys [a] :or {a 42}} m]))")).toBe(4)
    })

    it(':or default — uses if/contains? expansion for lazy evaluation', () => {
      // Conjure-JS uses (if (contains? gmap :a) (get gmap :a) 42) instead of 3-arg get
      // This ensures nil-present semantics: key with nil value != absent key
      expectTrue(
        "(some #(and (list? %) (= (first %) 'if)) " +
        "     (destructure '[{:keys [a] :or {a 42}} m]))"
      )
    })

    it(':as whole — whole appears in result', () => {
      expectTrue("(contains? (set (filter symbol? (destructure '[{:keys [a] :as whole} m]))) 'whole)")
    })

    it(':as with :keys [a b] — expands to 8 elements: gmap m whole gmap a (get gmap :a) b (get gmap :b)', () => {
      expect(evalCount("(count (destructure '[{:keys [a b] :as whole} m]))")).toBe(8)
    })

    it(':strs [a] — expands to 4 elements', () => {
      expect(evalCount("(count (destructure '[{:strs [a]} m]))")).toBe(4)
    })

    it(':strs — get call uses string lookup key', () => {
      // The get form uses "a" (string) as the lookup key
      expectTrue(
        "(some #(and (list? %) (= (first %) 'get) (string? (second (next %)))) " +
        "     (destructure '[{:strs [a]} m]))"
      )
    })

    it(':syms [a] — expands to 4 elements', () => {
      expect(evalCount("(count (destructure '[{:syms [a]} m]))")).toBe(4)
    })

    it(':syms — get call uses quoted symbol as lookup key', () => {
      // The get form uses (quote a) as the lookup key
      expectTrue(
        "(some #(and (list? %) (= (first %) 'get) " +
        "            (list? (second (next %))) " +
        "            (= (first (second (next %))) 'quote)) " +
        "     (destructure '[{:syms [a]} m]))"
      )
    })

    it('multiple bindings in same map pattern', () => {
      // {a :x b :y} → 6 elements
      expect(evalCount("(count (destructure '[{a :x b :y} m]))")).toBe(6)
    })
  })

  // ── Nested patterns ───────────────────────────────────────────────────────
  describe('nested destructuring', () => {
    it('vector inside vector — returns vector', () => {
      expectTrue("(vector? (destructure '[[[a] v1] v2]))")
    })

    it('vector inside vector — deeply nested symbol a appears', () => {
      expectTrue("(contains? (set (filter symbol? (destructure '[[[a] v1] v2]))) 'a)")
    })

    it('vector inside vector — generates multiple nth forms', () => {
      const count = evalCount("(count (filter #(and (list? %) (= (first %) 'nth)) (destructure '[[[a] v1] v2])))")
      expect(count).toBeGreaterThanOrEqual(2)
    })

    it('map inside vector — expands correctly', () => {
      expectTrue("(vector? (destructure '[[[a] {:keys [b]}] v]))")
    })

    it('map inside vector — both a and b appear as bound symbols', () => {
      const session = freshSession()
      const result = session.evaluate(
        "(let [syms (set (filter symbol? (destructure '[[[a] {:keys [b]}] v])))] " +
        "  (and (contains? syms 'a) (contains? syms 'b)))"
      )
      expect(isEqual(result, v.boolean(true))).toBe(true)
    })
  })

  // ── Multiple binding pairs ────────────────────────────────────────────────
  describe('multiple binding pairs in one vector', () => {
    it('mixed simple + destructuring — vector', () => {
      expectTrue("(vector? (destructure '[a 1 [b c] v]))")
    })

    it('mixed — simple binding passes through, vector expands', () => {
      // [a 1 [b c] v] → [a 1 gvec v b (nth gvec 0 nil) c (nth gvec 1 nil)]
      // = 2 + 6 = 8 elements
      expect(evalCount("(count (destructure '[a 1 [b c] v]))")).toBe(8)
    })

    it('two vector patterns expand independently', () => {
      // [[a b] v1 [c d] v2] → 6 + 6 = 12 elements
      expect(evalCount("(count (destructure '[[a b] v1 [c d] v2]))")).toBe(12)
    })

    it('all four user symbols appear in result', () => {
      const session = freshSession()
      const result = session.evaluate(
        "(let [syms (set (filter symbol? (destructure '[[a b] v1 [c d] v2])))]" +
        "  (and (contains? syms 'a) (contains? syms 'b)" +
        "       (contains? syms 'c) (contains? syms 'd)))"
      )
      expect(isEqual(result, v.boolean(true))).toBe(true)
    })
  })

  // ── Error cases ───────────────────────────────────────────────────────────
  describe('error cases', () => {
    it('throws on unsupported binding form (number as pattern)', () => {
      const session = freshSession()
      expect(() =>
        session.evaluate("(destructure '[42 v])")
      ).toThrow()
    })

    it('throws on unsupported binding form (string as pattern)', () => {
      const session = freshSession()
      expect(() =>
        session.evaluate('(destructure \'["str" v])')
      ).toThrow()
    })
  })
})
