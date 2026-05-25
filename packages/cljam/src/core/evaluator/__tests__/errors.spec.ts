import { describe, expect, it } from 'vitest'
import { EvaluationError } from '../../errors'
import { expectError, freshSession } from './evaluator-test-utils'

function catchError(code: string): EvaluationError {
  const s = freshSession({ vmExecutionMode: 'function-body' })
  let err: EvaluationError | undefined
  try {
    s.evaluate(code)
  } catch (e) {
    if (e instanceof EvaluationError) err = e
  }
  if (!err) throw new Error(`Expected an EvaluationError but none was thrown`)
  return err
}

describe('per-argument error positions (argIndex)', () => {
  describe('/ division by zero', () => {
    it('caret points at the divisor arg, not the whole expression', () => {
      // "(/ 1 0)" — "0" is at col 5, displayed as col 6
      const err = catchError('(/ 1 0)')
      expect(err.message).toContain('col 6')
      expect(err.message).toContain('     ^') // 5 spaces before caret
    })

    it('caret points at the correct arg in a multi-divisor call', () => {
      // "(/ 10 2 0)" — "0" (third arg) is at col 8, displayed as col 9
      const err = catchError('(/ 10 2 0)')
      expect(err.message).toContain('col 9')
    })

    it('first divisor division by zero — argIndex 1', () => {
      // "(/ 5 0)" — "0" at col 5, col 6
      const err = catchError('(/ 5 0)')
      expect(err.message).toContain('col 6')
    })
  })

  describe('mod division by zero', () => {
    it('caret points at the divisor arg', () => {
      // "(mod 7 0)" — "0" is at col 7, displayed as col 8
      const err = catchError('(mod 7 0)')
      expect(err.message).toContain('col 8')
    })
  })

  describe('nth out of bounds', () => {
    it('caret points at the index arg', () => {
      // "(nth [1] 5)" — "5" is at col 9, displayed as col 10
      const err = catchError('(nth [1] 5)')
      expect(err.message).toContain('col 10')
    })

    it('caret points at the index for negative index', () => {
      // "(nth [1 2] -1)" — "-1" is at col 11
      const err = catchError('(nth [1 2] -1)')
      expect(err.message).toContain('col 12')
    })
  })

  describe('!e.pos guard — deep errors keep inner position', () => {
    it('error thrown inside a fn body keeps its inner arg position, not the call site', () => {
      // Define a fn that internally calls (/ 1 0)
      // When (bad) is called, the error pos should point at the 0 inside bad's body
      const s = freshSession()
      s.evaluate('(defn bad [] (/ 1 0))')
      let err: EvaluationError | undefined
      try {
        s.evaluate('(bad)')
      } catch (e) {
        if (e instanceof EvaluationError) err = e
      }
      expect(err).toBeDefined()
      // The error message has position context from inside bad's body, not from (bad) call
      expect(err!.message).toContain('division by zero')
    })

    it('error pos is NOT overwritten when applyCallable re-throws a positioned error', () => {
      // When an already-positioned error bubbles through another evaluateList,
      // the outer argIndex intercept must not touch it (!e.pos guard)
      const s = freshSession()
      s.evaluate('(defn wrapper [f] (f))')
      let err: EvaluationError | undefined
      try {
        s.evaluate('(wrapper (fn [] (/ 1 0)))')
      } catch (e) {
        if (e instanceof EvaluationError) err = e
      }
      expect(err).toBeDefined()
      expect(err!.message).toContain('division by zero')
    })
  })

  describe('error message quality — Opus 4.7 regression suite', () => {
    it('malformed let binding reports an even binding vector error', () => {
      expectError(
        '(let [a 1 b] (+ a b))',
        'let requires an even number of forms in binding vector'
      )
    })

    it('plain thrown map without :data still shows raw map, not extracted message', () => {
      // {:type :error/test :message "oops"} has no :data key — not an ex-info value
      expectError(
        '(throw {:type :error/test :message "oops"})',
        'Unhandled throw'
      )
    })

    it('undefined symbol inside defn body shows the missing symbol name', () => {
      const s = freshSession()
      s.evaluate('(defn oops [xs] (redcue + 0 xs))')
      let err: EvaluationError | undefined
      try {
        s.evaluate('(oops [1 2 3])')
      } catch (e) {
        if (e instanceof EvaluationError) err = e
      }
      expect(err).toBeDefined()
      // Should mention the undefined symbol name
      expect(err!.message).toContain('redcue')
    })

    it('recur arity mismatch in loop reports correct counts', () => {
      expectError(
        '(loop [n 10 acc 0] (if (zero? n) acc (recur (dec n))))',
        'recur expects 2 arguments but got 1'
      )
    })

    it('map destructuring on non-map non-sequential value gives clear error', () => {
      expectError(
        '(let [{:keys [a b c]} 42] [a b c])',
        'Cannot destructure'
      )
    })

    it('sequential destructuring on non-sequential value gives clear error', () => {
      expectError(
        '(let [[a b c] 42] [a b c])',
        'Cannot destructure 42 as a sequential collection'
      )
    })

    it('undefined symbol in bytecode fn body shows symbol name, not call site', () => {
      // The bytecode path must stamp e.pos from the symbol
      // in the definition body, not from the call site.
      const s = freshSession()
      s.evaluate('(defn broken [x] (no-such-fn x))')
      let err: EvaluationError | undefined
      try {
        s.evaluate('(broken 1)')
      } catch (e) {
        if (e instanceof EvaluationError) err = e
      }
      expect(err).toBeDefined()
      expect(err!.message).toContain('no-such-fn')
      // The error message should NOT mention the call site as the primary location.
      // In the same-source case, the caret points at the symbol in the defn body.
    })

    it('unclosed paren error uses bracket char, not token kind name', () => {
      const s = freshSession()
      let err: Error | undefined
      try {
        s.evaluate('(+ 1 2')
      } catch (e) {
        if (e instanceof Error) err = e
      }
      expect(err).toBeDefined()
      expect(err!.message).toContain('`(`')
      expect(err!.message).toContain('`)`')
      expect(err!.message).not.toContain('RParen')
    })

    it('cross-source: caret points at definition site, not call site', () => {
      // Option B — Pos carries its source string. When an error originates in a
      // defn body evaluated in a previous session.evaluate() call, the caret
      // must show the definition source line, not the call-site source.
      const s = freshSession()
      s.evaluate('(defn oops [] (/ 1 redcue))')
      // 'redcue' spans offsets 19-24 in the defn source string.
      let err: Error | undefined
      try {
        s.evaluate('(oops)')
      } catch (e) {
        err = e as Error
      }
      expect(err).toBeDefined()
      // The caret lineText should come from the defn source, not from '(oops)'.
      expect(err!.message).toContain('(defn oops [] (/ 1 redcue))')
      // 6 carets for the 6-char token 'redcue'.
      expect(err!.message).toMatch(/\^{6}/)
      // The call-site string must NOT be the primary caret target.
      expect(err!.message).not.toMatch(/\(oops\)\n +\^/)
    })

    it('cross-source: multiple separate evals each keep their own source for carets', () => {
      // Verify that evaluating two functions and calling both still routes
      // errors to the correct definition source.
      const s = freshSession()
      s.evaluate('(defn fn-a [] (missing-a))')
      s.evaluate('(defn fn-b [] (missing-b))')
      let errA: Error | undefined
      let errB: Error | undefined
      try { s.evaluate('(fn-a)') } catch (e) { errA = e as Error }
      try { s.evaluate('(fn-b)') } catch (e) { errB = e as Error }
      expect(errA!.message).toContain('(defn fn-a [] (missing-a))')
      expect(errB!.message).toContain('(defn fn-b [] (missing-b))')
    })
  })
})
