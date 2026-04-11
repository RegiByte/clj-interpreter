/**
 * Tests the necessary macros for Calva to work.
 * Calva and other nREPL editors probe the runtime by sending
 * forms with these macros. We discovered this during the initial implementation, fun times!
 */

import { describe, expect, it } from 'vitest'
import { freshSession } from './evaluator-test-utils'

// ---------------------------------------------------------------------------
// if-let
// ---------------------------------------------------------------------------

describe('if-let', () => {
  it('returns then branch when binding is truthy', () => {
    const s = freshSession()
    const result = s.evaluate('(if-let [x 42] x :nope)')
    expect(result).toMatchObject({ kind: 'number', value: 42 })
  })

  it('returns else branch when binding is nil', () => {
    const s = freshSession()
    const result = s.evaluate('(if-let [x nil] :yes :no)')
    expect(result).toMatchObject({ kind: 'keyword', name: ':no' })
  })

  it('returns else branch when binding is false', () => {
    const s = freshSession()
    const result = s.evaluate('(if-let [x false] :yes :no)')
    expect(result).toMatchObject({ kind: 'keyword', name: ':no' })
  })

  it('returns nil when 2-arity form has falsy binding', () => {
    const s = freshSession()
    const result = s.evaluate('(if-let [x nil] :yes)')
    expect(result.kind).toBe('nil')
  })

  it('returns then when 2-arity form has truthy binding', () => {
    const s = freshSession()
    const result = s.evaluate('(if-let [x 1] :yes)')
    expect(result).toMatchObject({ kind: 'keyword', name: ':yes' })
  })

  it('binding is accessible in then branch', () => {
    const s = freshSession()
    const result = s.evaluate('(if-let [v (+ 10 5)] (* v 2) 0)')
    expect(result).toMatchObject({ kind: 'number', value: 30 })
  })

  it('binding is not accessible in else branch (uses outer scope)', () => {
    const s = freshSession()
    s.evaluate('(def fallback 99)')
    const result = s.evaluate('(if-let [x nil] x fallback)')
    expect(result).toMatchObject({ kind: 'number', value: 99 })
  })

  it('works with map lookup as test expression', () => {
    const s = freshSession()
    const result = s.evaluate('(if-let [v (:key {:key "found"})] v "missing")')
    expect(result).toMatchObject({ kind: 'string', value: 'found' })
  })

  it('returns else when map key is absent (nil)', () => {
    const s = freshSession()
    const result = s.evaluate(
      '(if-let [v (:missing {:key "found"})] v "missing")'
    )
    expect(result).toMatchObject({ kind: 'string', value: 'missing' })
  })
})

// ---------------------------------------------------------------------------
// when-let
// ---------------------------------------------------------------------------

describe('when-let', () => {
  it('executes body when binding is truthy', () => {
    const s = freshSession()
    const result = s.evaluate('(when-let [x 10] (* x 3))')
    expect(result).toMatchObject({ kind: 'number', value: 30 })
  })

  it('returns nil when binding is nil', () => {
    const s = freshSession()
    const result = s.evaluate('(when-let [x nil] :should-not-run)')
    expect(result.kind).toBe('nil')
  })

  it('returns nil when binding is false', () => {
    const s = freshSession()
    const result = s.evaluate('(when-let [x false] :should-not-run)')
    expect(result.kind).toBe('nil')
  })

  it('binding is accessible in body', () => {
    const s = freshSession()
    const result = s.evaluate('(when-let [n 7] (str "n=" n))')
    expect(result).toMatchObject({ kind: 'string', value: 'n=7' })
  })

  it('executes multi-expression body and returns last value', () => {
    const s = freshSession()
    const result = s.evaluate('(when-let [x 5] (+ x 1) (* x 10))')
    expect(result).toMatchObject({ kind: 'number', value: 50 })
  })

  it('works with a function call as test expression', () => {
    const s = freshSession()
    const result = s.evaluate('(when-let [v (first [42 43])] v)')
    expect(result).toMatchObject({ kind: 'number', value: 42 })
  })

  it('returns nil when first of empty seq is nil', () => {
    const s = freshSession()
    const result = s.evaluate('(when-let [v (first [])] v)')
    expect(result.kind).toBe('nil')
  })

  it('Calva startup scenario: when-let evaluates without error', () => {
    // Calva auto-evaluates this form on connect; it must not throw
    const s = freshSession()
    expect(() => {
      s.evaluate('(when-let [x 1] x)')
    }).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// resolve
// ---------------------------------------------------------------------------

describe('resolve', () => {
  it('returns the value bound to an unqualified symbol in the current ns', () => {
    const s = freshSession()
    s.evaluate('(def my-val 123)')
    const result = s.evaluate("(resolve 'my-val)")
    expect(result).toMatchObject({ kind: 'number', value: 123 })
  })

  it('resolves a symbol from clojure.core visible in user ns', () => {
    const s = freshSession()
    const result = s.evaluate("(resolve 'map)")
    // map is a function — just check it is not nil
    expect(result.kind).not.toBe('nil')
  })

  it('returns nil for an unknown symbol', () => {
    const s = freshSession()
    const result = s.evaluate("(resolve 'totally-unknown-xyz)")
    expect(result.kind).toBe('nil')
  })

  it('returns nil for a non-symbol argument', () => {
    const s = freshSession()
    const result = s.evaluate('(resolve 42)')
    expect(result.kind).toBe('nil')
  })

  it('returns nil for a nil argument', () => {
    const s = freshSession()
    const result = s.evaluate('(resolve nil)')
    expect(result.kind).toBe('nil')
  })

  it('resolves a qualified symbol clojure.core/map', () => {
    const s = freshSession()
    const result = s.evaluate("(resolve 'clojure.core/map)")
    expect(result.kind).not.toBe('nil')
  })

  it('returns nil for a qualified symbol in an unknown namespace', () => {
    const s = freshSession()
    const result = s.evaluate("(resolve 'no.such.ns/foo)")
    expect(result.kind).toBe('nil')
  })

  it('returns nil for a qualified symbol that does not exist in the namespace', () => {
    const s = freshSession()
    const result = s.evaluate("(resolve 'clojure.core/no-such-fn-xyz)")
    expect(result.kind).toBe('nil')
  })
})

// ---------------------------------------------------------------------------
// getCompletions (Session API)
// ---------------------------------------------------------------------------

describe('getCompletions', () => {
  it('returns completions matching a prefix', () => {
    const s = freshSession()
    const completions = s.getCompletions('map')
    expect(completions).toContain('map')
    expect(completions).toContain('map-indexed')
    expect(completions.every((c) => c.startsWith('map'))).toBe(true)
  })

  it('returns all visible symbols when prefix is empty', () => {
    const s = freshSession()
    const completions = s.getCompletions('')
    expect(completions.length).toBeGreaterThan(50)
    expect(completions).toContain('map')
    expect(completions).toContain('reduce')
  })

  it('returns empty array when no symbol matches prefix', () => {
    const s = freshSession()
    const completions = s.getCompletions('zzz-no-such-prefix-xyz')
    expect(completions).toEqual([])
  })

  it('includes user-defined symbols', () => {
    const s = freshSession()
    s.evaluate('(def my-custom-fn 42)')
    const completions = s.getCompletions('my-custom')
    expect(completions).toContain('my-custom-fn')
  })

  it('returns results sorted alphabetically', () => {
    const s = freshSession()
    const completions = s.getCompletions('map')
    const sorted = [...completions].sort()
    expect(completions).toEqual(sorted)
  })

  it('accepts an explicit namespace name', () => {
    const s = freshSession()
    const completions = s.getCompletions('map', 'clojure.core')
    expect(completions).toContain('map')
  })

  it('returns empty array for a non-existent namespace', () => {
    const s = freshSession()
    const completions = s.getCompletions('map', 'no.such.ns')
    expect(completions).toEqual([])
  })
})
