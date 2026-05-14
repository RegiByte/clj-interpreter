import { describe, expect, it } from 'vitest'
import { createEvaluationContext } from '../../evaluator'
import { applyFunctionWithContext } from '../../evaluator/apply'
import { v } from '../../factories'
import { createSession } from '../../session'
import { disassembleChunk } from '../debug'
import { compileFnBodyForTest, makeCallTestEnv } from './compiler-test-utils'

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

    it('tail-position self-call compiles to FnRecur instead of Call', () => {
      const chunk = compileFnBodyForTest([], [
        '(fn* countdown [n] (if (= n 0) :done (countdown (- n 1))))',
      ])

      expect(chunk).not.toBeNull()
      if (chunk === null) return

      const arityChunk = chunk.innerFunctions[0]?.arities[0]?.chunk
      expect(arityChunk).toBeDefined()
      if (arityChunk === undefined) return

      const disassembly = disassembleChunk(arityChunk)
      expect(disassembly).toContain('FnRecur 1 -> 0000')
      expect(disassembly).not.toContain('Call')
    })

    it('variadic tail-position self-call compiles to FnRecurRest', () => {
      const chunk = compileFnBodyForTest([], [
        '(fn* collect [n & more] (if (= n 0) more (collect (- n 1) n (+ n 10))))',
      ])

      expect(chunk).not.toBeNull()
      if (chunk === null) return

      const arityChunk = chunk.innerFunctions[0]?.arities[0]?.chunk
      expect(arityChunk).toBeDefined()
      if (arityChunk === undefined) return

      expect(disassembleChunk(arityChunk)).toContain(
        'FnRecurRest 3 1 -> 0000'
      )
    })

    it('non-tail self-call stays on the normal Call path', () => {
      const chunk = compileFnBodyForTest([], [
        '(fn* sumdown [n] (if (= n 0) 0 (+ n (sumdown (- n 1)))))',
      ])

      expect(chunk).not.toBeNull()
      if (chunk === null) return

      const arityChunk = chunk.innerFunctions[0]?.arities[0]?.chunk
      expect(arityChunk).toBeDefined()
      if (arityChunk === undefined) return

      const disassembly = disassembleChunk(arityChunk)
      expect(disassembly).toContain('Call 1')
      expect(disassembly).not.toContain('FnRecur')
    })

    it('cross-arity self-call stays on the normal Call path', () => {
      const chunk = compileFnBodyForTest([], [
        '(fn* sum* ([n] (sum* n 0)) ([n acc] (if (= n 0) acc (sum* (- n 1) (+ acc n)))))',
      ])

      expect(chunk).not.toBeNull()
      if (chunk === null) return

      const arity1Chunk = chunk.innerFunctions[0]?.arities[0]?.chunk
      expect(arity1Chunk).toBeDefined()
      if (arity1Chunk === undefined) return

      const disassembly = disassembleChunk(arity1Chunk)
      expect(disassembly).toContain('Call 2')
      expect(disassembly).not.toContain('FnRecur')
    })

    it('let* shadowing of the self-name prevents self-call TCO', () => {
      const chunk = compileFnBodyForTest([], [
        '(fn* f [n] (let* [f (fn* [x] x)] (f n)))',
      ])

      expect(chunk).not.toBeNull()
      if (chunk === null) return

      const arityChunk = chunk.innerFunctions[0]?.arities[0]?.chunk
      expect(arityChunk).toBeDefined()
      if (arityChunk === undefined) return

      const disassembly = disassembleChunk(arityChunk)
      expect(disassembly).toContain('Call 1')
      expect(disassembly).not.toContain('FnRecur')
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

    it('deep tail recursion by self-name runs past the VM frame limit', () => {
      const chunk = compileFnBodyForTest(
        ['n'],
        ['(if (= n 0) n (down (- n 1)))'],
        { selfName: 'down' }
      )

      expect(chunk).not.toBeNull()
      if (chunk === null) return

      const env = makeCallTestEnv()
      const fn = v.multiArityFunction(
        [
          {
            params: [v.symbol('n')],
            restParam: null,
            body: [],
            bytecodeBody: chunk,
          },
        ],
        env
      )
      fn.name = 'down'

      expect(
        applyFunctionWithContext(
          fn,
          [v.number(10005)],
          createEvaluationContext(),
          env
        )
      ).toEqual(v.number(0))
    })

    it('variadic self-tail-call repacks rest args', () => {
      const chunk = compileFnBodyForTest(
        ['n'],
        ['(if (= n 0) more (collect (- n 1) n (+ n 10)))'],
        { restParam: 'more', selfName: 'collect' }
      )

      expect(chunk).not.toBeNull()
      if (chunk === null) return

      const env = makeCallTestEnv()
      const fn = v.multiArityFunction(
        [
          {
            params: [v.symbol('n')],
            restParam: v.symbol('more'),
            body: [],
            bytecodeBody: chunk,
          },
        ],
        env
      )
      fn.name = 'collect'

      expect(
        applyFunctionWithContext(
          fn,
          [v.number(3)],
          createEvaluationContext(),
          env
        )
      ).toEqual(v.list([v.number(1), v.number(11)]))
    })
  })
})
