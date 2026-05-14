import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { createSession } from '../../session'
import { disassembleChunk } from '../debug'
import { compileFnBodyForTest } from './compiler-test-utils'

describe('VM named fn* self-reference', () => {
  describe('compiler structure', () => {
    it('named fn* compiles to an inner function (does not fall back)', () => {
      const chunk = compileFnBodyForTest([], ['(fn* my-name [] 42)'])

      expect(chunk).not.toBeNull()
      if (chunk === null) return

      expect(chunk.innerFunctions).toHaveLength(1)
    })

    it('allocates a self-slot after params for a single-param named fn*', () => {
      const chunk = compileFnBodyForTest([], ['(fn* my-name [x] 42)'])

      expect(chunk).not.toBeNull()
      if (chunk === null) return

      const arityChunk = chunk.innerFunctions[0]?.arities[0]?.chunk
      expect(arityChunk).toBeDefined()
      if (arityChunk === undefined) return

      // selfSlot is right after the single param slot
      expect(arityChunk.selfSlot).toBe(1)
      expect(arityChunk.localCount).toBe(2)
    })

    it('allocates a self-slot after the rest param slot', () => {
      const chunk = compileFnBodyForTest([], ['(fn* my-name [x & rest] 42)'])

      expect(chunk).not.toBeNull()
      if (chunk === null) return

      const arityChunk = chunk.innerFunctions[0]?.arities[0]?.chunk
      expect(arityChunk).toBeDefined()
      if (arityChunk === undefined) return

      // fixed param at 0, rest at 1, self at 2
      expect(arityChunk.selfSlot).toBe(2)
      expect(arityChunk.localCount).toBe(3)
    })

    it('anonymous fn* is unchanged: selfSlot === -1', () => {
      const chunk = compileFnBodyForTest([], ['(fn* [x] 42)'])

      expect(chunk).not.toBeNull()
      if (chunk === null) return

      const arityChunk = chunk.innerFunctions[0]?.arities[0]?.chunk
      expect(arityChunk).toBeDefined()
      if (arityChunk === undefined) return

      expect(arityChunk.selfSlot).toBe(-1)
      expect(arityChunk.localCount).toBe(1)
    })

    it('self-name reference in body compiles to LoadLocal at selfSlot', () => {
      // (fn* my-name [x] my-name) — body is just the self-name
      const chunk = compileFnBodyForTest([], ['(fn* my-name [x] my-name)'])

      expect(chunk).not.toBeNull()
      if (chunk === null) return

      const arityChunk = chunk.innerFunctions[0]?.arities[0]?.chunk
      expect(arityChunk).toBeDefined()
      if (arityChunk === undefined) return

      expect(disassembleChunk(arityChunk)).toContain('LoadLocal 1')
    })
  })

  describe('runtime behaviour', () => {
    it('basic countdown recursion by self-name', () => {
      expect(
        createSession().evaluate('((fn* countdown [n] (if (= n 0) :done (countdown (dec n)))) 5)')
      ).toEqual(v.keyword(':done'))
    })

    it('tail-recursive accumulator (factorial)', () => {
      expect(
        createSession().evaluate(
          '((fn* fact [n acc] (if (= n 0) acc (fact (dec n) (* n acc)))) 5 1)'
        )
      ).toEqual(v.number(120))
    })

    it('tree recursion (fibonacci)', () => {
      expect(
        createSession().evaluate(
          '((fn* fib [n] (if (< n 2) n (+ (fib (- n 1)) (fib (- n 2))))) 10)'
        )
      ).toEqual(v.number(55))
    })

    it('self-name used as a value (not in call position)', () => {
      // At n=3 the fn returns itself (not calls itself). Calling the result
      // with 0 then returns :done — proving my-fn resolved to a callable value.
      expect(
        createSession().evaluate(
          '(((fn* my-fn [n] (if (= n 0) :done my-fn)) 3) 0)'
        )
      ).toEqual(v.keyword(':done'))
    })

    it('explicit recur still works inside a named fn*', () => {
      expect(
        createSession().evaluate(
          '((fn* sum [n acc] (if (= n 0) acc (recur (dec n) (+ n acc)))) 5 0)'
        )
      ).toEqual(v.number(15))
    })

    it('param shadows self-name when they share a name', () => {
      // (fn* x [x] x) — the param x should shadow the fn-name x
      expect(
        createSession().evaluate('((fn* x [x] x) 42)')
      ).toEqual(v.number(42))
    })

    it('multi-arity named fn* — arity-1 delegates to arity-2 by self-name', () => {
      expect(
        createSession().evaluate(
          '((fn* sum* ([n] (sum* n 0)) ([n acc] (if (= n 0) acc (sum* (dec n) (+ n acc))))) 5)'
        )
      ).toEqual(v.number(15))
    })
  })
})
