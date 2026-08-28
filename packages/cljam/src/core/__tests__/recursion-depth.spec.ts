import { describe, expect, it } from 'vitest'
import { createSession } from '../session'
import { DEFAULT_VM_EXECUTION_MODE } from '../evaluator'
import { v } from '../factories'

/**
 * Recursion-depth contract for DEFAULT sessions (session 355).
 *
 * The walker burns many JS stack frames per Clojure call, capping recursion
 * near ~600 frames — far below what a credible runtime allows. The VM keeps
 * call frames on the heap (bounded only by DEFAULT_VM_FRAME_LIMIT) and
 * compiles tail self-calls to FnRecur (constant stack). Making
 * 'function-body' the default puts every capture-free fn on the VM, so
 * these depths hold for ordinary user code with no opt-in.
 *
 * These tests live in a .spec.ts, NOT the .clj suite: the differential
 * harness runs the .clj suite on the walker as oracle, which cannot reach
 * these depths by design.
 */
describe('recursion depth (default session contract)', () => {
  it('defaults to function-body VM participation', () => {
    expect(DEFAULT_VM_EXECUTION_MODE).toBe('function-body')
  })

  it('runs 50k-deep tail self-recursion (compiled to FnRecur, constant stack)', () => {
    const session = createSession()
    const result = session.evaluate(`
      (defn deep [n] (if (zero? n) :done (deep (dec n))))
      (deep 50000)
    `)
    expect(result).toEqual(v.keyword(':done'))
  })

  it('runs 50k-deep non-tail recursion on heap-allocated VM frames', () => {
    const session = createSession()
    const result = session.evaluate(`
      (defn sum [n] (if (zero? n) 0 (+ n (sum (dec n)))))
      (sum 50000)
    `)
    expect(result).toEqual(v.number((50000 * 50001) / 2))
  })

  it('runs 50k-deep mutual tail recursion', () => {
    const session = createSession()
    const result = session.evaluate(`
      (defn my-even? [n] (if (zero? n) true (my-odd? (dec n))))
      (defn my-odd? [n] (if (zero? n) false (my-even? (dec n))))
      (my-even? 50000)
    `)
    expect(result).toEqual(v.boolean(true))
  })

  it('throws the frame-limit stack overflow past 100k non-tail frames', () => {
    const session = createSession()
    expect(() =>
      session.evaluate(`
        (defn sum [n] (if (zero? n) 0 (+ n (sum (dec n)))))
        (sum 200000)
      `)
    ).toThrow('Stack overflow: exceeded 100000 VM call frames')
  })
})
