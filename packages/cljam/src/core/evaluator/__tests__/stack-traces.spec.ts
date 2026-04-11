/**
 * Stack Trace Tests
 *
 * Verifies that runtime EvaluationErrors (caught by Clojure try/catch) include
 * a :frames vector in the synthesized error map.
 *
 * Frame ordering: innermost-first (deepest call first, entry point last).
 * This matches JVM Clojure convention and makes (first (:frames e)) point at
 * the failure site.
 *
 * Frame tracking covers both the interpreter path (dispatch.ts) and the
 * compiled path (compiler/callable.ts), so tests work regardless of whether
 * the compiler optimizes the code under test.
 */

import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { freshSession } from './evaluator-test-utils'

describe('stack traces in caught runtime errors', () => {
  it(':frames key is present on runtime error maps', () => {
    const s = freshSession()
    expect(
      s.evaluate('(try (/ 1 0) (catch :error/runtime e (contains? e :frames)))')
    ).toEqual(v.boolean(true))
  })

  it(':frames is a vector', () => {
    const s = freshSession()
    expect(
      s.evaluate('(try (/ 1 0) (catch :error/runtime e (vector? (:frames e))))')
    ).toEqual(v.boolean(true))
  })

  it('innermost frame :fn is the failing function name', () => {
    const s = freshSession()
    // innermost frame is the "/" call itself
    expect(
      s.evaluate('(try (/ 1 0) (catch :error/runtime e (:fn (first (:frames e)))))')
    ).toEqual(v.string('/'))
  })

  it('frames are ordered innermost-first', () => {
    const s = freshSession()
    s.evaluate('(defn stack-inner [] (/ 1 0))')
    s.evaluate('(defn stack-outer [] (stack-inner))')
    const result = s.evaluate(
      '(try (stack-outer) (catch :error/runtime e (mapv :fn (:frames e))))'
    )
    // innermost: /, stack-inner, stack-outer
    expect(result.kind).toBe('vector')
    if (result.kind === 'vector') {
      expect(result.value[0]).toEqual(v.string('/'))
      expect(result.value[1]).toEqual(v.string('stack-inner'))
      expect(result.value[2]).toEqual(v.string('stack-outer'))
    }
  })

  it('anonymous call site has nil :fn in frames', () => {
    const s = freshSession()
    // Call chain: anon-fn → / (throws)
    // frames (innermost-first): [{:fn "/"}, {:fn nil}]
    // second frame is the anonymous call site
    expect(
      s.evaluate('(try ((fn [] (/ 1 0))) (catch :error/runtime e (:fn (second (:frames e)))))')
    ).toEqual(v.nil())
  })

  it('frame count matches call depth', () => {
    const s = freshSession()
    s.evaluate('(defn depth-a [] (/ 1 0))')
    s.evaluate('(defn depth-b [] (depth-a))')
    s.evaluate('(defn depth-c [] (depth-b))')
    // frames: /, depth-a, depth-b, depth-c → 4
    expect(
      s.evaluate('(try (depth-c) (catch :error/runtime e (count (:frames e))))')
    ).toEqual(v.number(4))
  })

  it('frames are snapshotted at innermost catch — not overwritten as error bubbles', () => {
    const s = freshSession()
    s.evaluate('(defn bubble-a [] (/ 1 0))')
    s.evaluate('(defn bubble-b [] (bubble-a))')
    s.evaluate('(defn bubble-c [] (bubble-b))')
    // All 4 frames must be captured even though 3 call frames unwind before the catch
    const count = s.evaluate(
      '(try (bubble-c) (catch :error/runtime e (count (:frames e))))'
    )
    expect(count).toEqual(v.number(4))
  })

  it('frame stack is clean after a caught error — no leakage between evaluations', () => {
    const s = freshSession()
    s.evaluate('(defn leaky-boom [] (/ 1 0))')
    // First call: catch and discard
    s.evaluate('(try (leaky-boom) (catch :error/runtime e nil))')
    // Second call: frame count must be the same as the first time — no accumulated frames
    expect(
      s.evaluate('(try (leaky-boom) (catch :error/runtime e (count (:frames e))))')
    ).toEqual(v.number(2))  // / and leaky-boom
  })

  it('user-thrown values do not have :frames injected', () => {
    // CljThrownSignal carries the user's value verbatim — no :frames added
    const s = freshSession()
    expect(
      s.evaluate(
        '(try (throw {:type :error/test}) (catch :error/test e (contains? e :frames)))'
      )
    ).toEqual(v.boolean(false))
  })

  it('each frame map has :fn, :line, :col, :source keys', () => {
    const s = freshSession()
    // Verify the shape of a single frame — values may be nil (no source in test session)
    const frame = s.evaluate(
      '(try (/ 1 0) (catch :error/runtime e (first (:frames e))))'
    )
    // Frame is a map — just check the keys are present
    expect(frame.kind).toBe('map')
    if (frame.kind === 'map') {
      const keys = frame.entries.map(([k]) => (k.kind === 'keyword' ? k.name : null))
      expect(keys).toContain(':fn')
      expect(keys).toContain(':line')
      expect(keys).toContain(':col')
      expect(keys).toContain(':source')
    }
  })
})
