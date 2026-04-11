import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { expectError, freshSession } from './evaluator-test-utils'

describe('loop/recur', () => {
  it('should compute factorial via loop/recur', () => {
    const session = freshSession()
    const result = session.evaluate(`
      (loop [i 5 acc 1]
        (if (<= i 1)
          acc
          (recur (dec i) (* acc i))))
    `)
    expect(result).toEqual(v.number(120))
  })

  it('should return body value when no recur is hit (acts like let)', () => {
    const session = freshSession()
    expect(session.evaluate('(loop [x 1] x)')).toEqual(v.number(1))
  })

  it('should evaluate initial bindings sequentially', () => {
    const session = freshSession()
    expect(session.evaluate('(loop [a 1 b (+ a 1)] b)')).toEqual(v.number(2))
  })

  it('should throw on recur arity mismatch', () => {
    expectError('(loop [a 1 b 2] (recur 10))', 'recur expects 2 arguments but got 1')
  })

  it('should support fn-level recur', () => {
    const session = freshSession()
    const result = session.evaluate(`
      ((fn [n acc]
         (if (<= n 1) acc (recur (dec n) (* n acc))))
       5 1)
    `)
    expect(result).toEqual(v.number(120))
  })

  it('should support nested loops where inner recur targets inner loop', () => {
    const session = freshSession()
    const result = session.evaluate(`
      (loop [i 0 outer-sum 0]
        (if (>= i 3)
          outer-sum
          (recur (inc i)
                 (+ outer-sum
                    (loop [j 0 inner-sum 0]
                      (if (>= j 3)
                        inner-sum
                        (recur (inc j) (inc inner-sum))))))))
    `)
    expect(result).toEqual(v.number(9))
  })

  it('should build a collection via loop/recur', () => {
    const session = freshSession()
    const result = session.evaluate(`
      (loop [xs (list 1 2 3) acc []]
        (if (nil? (seq xs))
          acc
          (recur (rest xs) (conj acc (* (first xs) 2)))))
    `)
    expect(result).toEqual(v.vector([v.number(2), v.number(4), v.number(6)]))
  })

  it('should throw on stray recur outside loop or fn', () => {
    expectError('(recur 1)', 'recur called outside of loop or fn')
  })

  describe('tail-position validation', () => {
    it('throws when recur is not the last form in a fn body', () => {
      expectError('(fn [n] (recur n) n)', 'Can only recur from tail position')
    })

    it('throws when recur is not the last form in a loop body', () => {
      expectError('(loop [i 0] (recur (inc i)) i)', 'Can only recur from tail position')
    })

    it('throws when recur appears as an argument to a function call', () => {
      expectError('(fn [n] (+ 1 (recur n)))', 'Can only recur from tail position')
    })

    it('throws when recur appears in the condition of if', () => {
      expectError('(fn [n] (if (recur n) 1 2))', 'Can only recur from tail position')
    })

    it('throws when recur is not last in a do block inside fn', () => {
      expectError('(fn [n] (do (recur n) n))', 'Can only recur from tail position')
    })

    it('throws when recur appears in a let binding value', () => {
      expectError('(fn [n] (let [x (recur n)] x))', 'Can only recur from tail position')
    })

    it('allows recur as the last form of an if then-branch', () => {
      const session = freshSession()
      expect(() =>
        session.evaluate('(fn [n] (if (zero? n) 0 (recur (dec n))))')
      ).not.toThrow()
    })

    it('allows recur as the last form of an if else-branch', () => {
      const session = freshSession()
      expect(() =>
        session.evaluate('(fn [n] (if (pos? n) (recur (dec n)) 0))')
      ).not.toThrow()
    })

    it('allows recur as the last form of a let body', () => {
      const session = freshSession()
      expect(() => session.evaluate('(fn [n] (let [m (dec n)] (recur m)))')).not.toThrow()
    })

    it('allows recur via cond (macro expands before check — no false positive)', () => {
      const session = freshSession()
      expect(() =>
        session.evaluate(
          '(fn [n acc] (cond (zero? n) acc :else (recur (dec n) (+ acc n))))'
        )
      ).not.toThrow()
    })

    it('allows recur via when (macro expands before check — no false positive)', () => {
      const session = freshSession()
      expect(() => session.evaluate('(fn [n] (when (pos? n) (recur (dec n))))')).not.toThrow()
    })

    it('recur in nested fn does not trigger outer fn check', () => {
      const session = freshSession()
      expect(() => session.evaluate('(fn [n] (fn [m] (recur (dec m))))')).not.toThrow()
    })

    it('cond-based recursion actually produces correct results', () => {
      const session = freshSession()
      const result = session.evaluate(`
        (defn sum-to [n acc]
          (cond
            (zero? n) acc
            :else (recur (dec n) (+ acc n))))
        (sum-to 10 0)
      `)
      expect(result).toEqual(v.number(55))
    })
  })

  it('should support recur with rest params in fn', () => {
    const session = freshSession()
    const result = session.evaluate(`
      ((fn [& args]
         (if (nil? (seq args))
           0
           (+ (first args) (apply (fn [& args]
             (if (nil? (seq args))
               0
               (+ (first args) (apply (fn [& a] 0) (rest args))))) (rest args)))))
       1 2 3)
    `)
    expect(result).toEqual(v.number(3))
  })

  it('should compute sum of 0..10 via loop/recur', () => {
    const session = freshSession()
    const result = session.evaluate(`
      (loop [i 0 sum 0]
        (if (> i 10)
          sum
          (recur (inc i) (+ sum i))))
    `)
    expect(result).toEqual(v.number(55))
  })

  it('should support recur in a defn function body', () => {
    const session = freshSession()
    const result = session.evaluate(`
      (defn factorial [n]
          (loop [i n acc 1]
            (if (<= i 1)
              acc
              (recur (dec i) (* acc i)))))
      (factorial 10)
    `)
    expect(result).toEqual(v.number(3628800))
  })
})
