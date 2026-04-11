/**
 * Tests for the Clojure-callable `clj->js` and `js->clj` functions.
 */

import { describe, expect, it } from 'vitest'
import { cljJsValue, cljNil, cljNumber, cljString, cljVar } from '../../factories'
import type { Session } from '../../session'
import { freshSession } from '../../evaluator/__tests__/evaluator-test-utils'
import { expectError } from '../../evaluator/__tests__/evaluator-test-utils'

function sessionWithJs(bindings: Record<string, unknown>): Session {
  const session = freshSession()
  const ns = session.getNs('user')!
  for (const [name, rawValue] of Object.entries(bindings)) {
    ns.vars.set(name, cljVar('user', name, cljJsValue(rawValue)))
  }
  return session
}

// ---------------------------------------------------------------------------
// clj->js
// ---------------------------------------------------------------------------

describe('clj->js', () => {
  it('converts a number to a CljJsValue wrapping the raw number', () => {
    const result = freshSession().evaluate('(clj->js 42)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toBe(42)
  })

  it('converts a string', () => {
    const result = freshSession().evaluate('(clj->js "hello")')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toBe('hello')
  })

  it('converts nil to a CljJsValue wrapping null', () => {
    const result = freshSession().evaluate('(clj->js nil)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toBe(null)
  })

  it('converts a keyword to a plain string (no colon)', () => {
    const result = freshSession().evaluate('(clj->js :foo)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toBe('foo')
  })

  it('converts a vector to a JS array', () => {
    const result = freshSession().evaluate('(clj->js [1 2 3])')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toEqual([1, 2, 3])
  })

  it('converts a list to a JS array', () => {
    const result = freshSession().evaluate("(clj->js '(1 2 3))")
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toEqual([1, 2, 3])
  })

  it('converts a map with keyword keys (colons stripped)', () => {
    const result = freshSession().evaluate('(clj->js {:a 1 :b "hello"})')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value')
      expect(result.value).toEqual({ a: 1, b: 'hello' })
  })

  it('converts nested structures recursively', () => {
    const result = freshSession().evaluate('(clj->js {:users [{:name "alice"} {:name "bob"}]})')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value')
      expect(result.value).toEqual({
        users: [{ name: 'alice' }, { name: 'bob' }],
      })
  })

  it('is a no-op on an already-boxed CljJsValue', () => {
    const session = sessionWithJs({ obj: { x: 1 } })
    const result = session.evaluate('(clj->js obj)')
    expect(result.kind).toBe('js-value')
    // Returns the same CljJsValue — no double-wrapping
    if (result.kind === 'js-value') expect(result.value).toEqual({ x: 1 })
  })

  it('result can be passed directly to a JS method', () => {
    const session = sessionWithJs({
      json: JSON,
    })
    // Convert a map to a JS object, then stringify it
    const result = session.evaluate('(. json stringify (clj->js {:a 1}))')
    // JSON.stringify produces a string — comes back as CljString
    expect(result.kind).toBe('string')
    if (result.kind === 'string') expect(JSON.parse(result.value)).toEqual({ a: 1 })
  })
})

// ---------------------------------------------------------------------------
// js->clj
// ---------------------------------------------------------------------------

describe('js->clj', () => {
  it('converts a boxed number to CljNumber', () => {
    const session = sessionWithJs({ n: 42 })
    expect(session.evaluate('(js->clj n)')).toEqual(cljNumber(42))
  })

  it('converts a boxed string to CljString', () => {
    const session = sessionWithJs({ s: 'hello' })
    expect(session.evaluate('(js->clj s)')).toEqual(cljString('hello'))
  })

  it('converts nil through unchanged', () => {
    expect(freshSession().evaluate('(js->clj nil)')).toEqual(cljNil())
  })

  it('converts a JS array to a CljVector', () => {
    const session = sessionWithJs({ arr: [1, 2, 3] })
    const result = session.evaluate('(js->clj arr)')
    expect(result.kind).toBe('vector')
    if (result.kind === 'vector') {
      expect(result.value).toHaveLength(3)
      expect(result.value[0]).toEqual({ kind: 'number', value: 1 })
    }
  })

  it('converts a plain JS object to a CljMap with string keys by default', () => {
    const session = sessionWithJs({ obj: { name: 'alice', age: 30 } })
    const result = session.evaluate('(js->clj obj)')
    expect(result.kind).toBe('map')
    if (result.kind === 'map') {
      // keys are strings, not keywords
      const keys = result.entries.map(([k]) => k)
      expect(keys.every((k) => k.kind === 'string')).toBe(true)
    }
  })

  it('keywordizes keys with {:keywordize-keys true}', () => {
    const session = sessionWithJs({ obj: { name: 'alice' } })
    const result = session.evaluate('(js->clj obj {:keywordize-keys true})')
    expect(result.kind).toBe('map')
    if (result.kind === 'map') {
      const [k] = result.entries[0]
      expect(k.kind).toBe('keyword')
      if (k.kind === 'keyword') expect(k.name).toBe(':name')
    }
  })

  it('keywordizes keys recursively with {:keywordize-keys true}', () => {
    const session = sessionWithJs({ obj: { person: { name: 'bob' } } })
    const result = session.evaluate('(js->clj obj {:keywordize-keys true})')
    expect(result.kind).toBe('map')
    if (result.kind === 'map') {
      const inner = result.entries[0][1]
      expect(inner.kind).toBe('map')
      if (inner.kind === 'map') {
        const [k] = inner.entries[0]
        expect(k.kind).toBe('keyword')
      }
    }
  })

  it('round-trips with clj->js (string keys default)', () => {
    const session = sessionWithJs({ obj: { a: 1, b: [2, 3] } })
    // js->clj gives string-keyed map; clj->js on that gives back {"a":1,"b":[2,3]}
    const result = session.evaluate('(clj->js (js->clj obj))')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toEqual({ a: 1, b: [2, 3] })
  })

  it('throws on non-js-value (number literal)', () => {
    expectError('(js->clj 42)', 'js->clj expects a js-value')
  })

  it('throws on non-js-value (string literal)', () => {
    expectError('(js->clj "hello")', 'js->clj expects a js-value')
  })

  it('throws on a keyword', () => {
    expectError('(js->clj :foo)', 'js->clj expects a js-value')
  })
})
