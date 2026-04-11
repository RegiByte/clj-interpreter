/**
 * Tests for JS namespace composition utilities:
 * js/get-in, js/prop, js/method, js/merge, js/seq, js/array, js/obj
 */

import { describe, expect, it } from 'vitest'
import { createSession } from '../../session'
import { freshSession, expectError } from '../../evaluator/__tests__/evaluator-test-utils'

function jsSession(bindings: Record<string, unknown>) {
  return createSession({ hostBindings: bindings })
}

// ---------------------------------------------------------------------------
// js/get-in
// ---------------------------------------------------------------------------

describe('js/get-in', () => {
  it('traverses a string key path', () => {
    const obj = { target: { value: 'hello' } }
    const session = jsSession({ target: obj })
    const result = session.evaluate('(js/get-in js/target ["target" "value"])')
    expect(result).toEqual({ kind: 'string', value: 'hello' })
  })

  it('traverses a keyword key path (strips colon)', () => {
    const obj = { db: { host: 'localhost' } }
    const session = jsSession({ target: obj })
    const result = session.evaluate('(js/get-in js/target [:db :host])')
    expect(result).toEqual({ kind: 'string', value: 'localhost' })
  })

  it('traverses a numeric index in path', () => {
    const obj = [{ name: 'Alice' }, { name: 'Bob' }]
    const session = jsSession({ target: obj })
    const result = session.evaluate('(js/get-in js/target [1 "name"])')
    expect(result).toEqual({ kind: 'string', value: 'Bob' })
  })

  it('returns js-value(undefined) for missing deep key with no default', () => {
    const obj = { a: {} }
    const session = jsSession({ target: obj })
    const result = session.evaluate('(js/get-in js/target ["a" "missing"])')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toBeUndefined()
  })

  it('returns default when key is missing', () => {
    const obj = {}
    const session = jsSession({ target: obj })
    const result = session.evaluate('(js/get-in js/target ["missing"] "fallback")')
    expect(result).toEqual({ kind: 'string', value: 'fallback' })
  })

  it('returns default on mid-path nil/undefined', () => {
    const obj = { a: null }
    const session = jsSession({ target: obj })
    const result = session.evaluate('(js/get-in js/target ["a" "deep"] "default")')
    expect(result).toEqual({ kind: 'string', value: 'default' })
  })

  it('returns value when it exists (no default override)', () => {
    const obj = { x: { y: 0 } }
    const session = jsSession({ target: obj })
    const result = session.evaluate('(js/get-in js/target ["x" "y"] 99)')
    expect(result).toEqual({ kind: 'number', value: 0 })
  })

  it('throws on non-vector path', () => {
    const session = jsSession({ target:{} })
    expect(() => session.evaluate('(js/get-in js/target "bad-path")')).toThrow(
      'path must be a vector'
    )
  })

  it('throws on nil root', () => {
    expect(() => freshSession().evaluate('(js/get-in nil ["key"])')).toThrow(
      'cannot access properties on nil'
    )
  })

  it('empty path returns the object itself', () => {
    const obj = { x: 1 }
    const session = jsSession({ target: obj })
    const result = session.evaluate('(js/get-in js/target [])')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toEqual(obj)
  })
})

// ---------------------------------------------------------------------------
// js/prop
// ---------------------------------------------------------------------------

describe('js/prop', () => {
  it('works as arg to map', () => {
    const users = [{ name: 'Alice' }, { name: 'Bob' }]
    const session = jsSession({ users })
    const result = session.evaluate(
      '(vec (map (js/prop "name") (js/seq js/users)))'
    )
    expect(result).toEqual({
      kind: 'vector',
      value: [
        { kind: 'string', value: 'Alice' },
        { kind: 'string', value: 'Bob' },
      ],
    })
  })

  it('works as predicate in filter — missing key returns nil (falsy)', () => {
    const items = [{ enabled: true }, { enabled: false }, {}, { enabled: true }]
    const session = jsSession({ items })
    // items without "enabled" → nil → filtered out; false → also filtered out
    const r = session.evaluate(
      '(vec (filter (js/prop "enabled") (js/seq js/items)))'
    )
    expect(r).toEqual({
      kind: 'vector',
      value: [
        { kind: 'js-value', value: { enabled: true } },
        { kind: 'js-value', value: { enabled: true } },
      ],
    })
  })

  it('missing key with no default returns nil', () => {
    const session = jsSession({ target:{} })
    const r = session.evaluate('((js/prop "gone") js/target)')
    expect(r.kind).toBe('nil')
  })

  it('returns default when key is missing', () => {
    const obj = {}
    const session = jsSession({ target: obj })
    const r = session.evaluate('((js/prop "score" 0) js/target)')
    expect(r).toEqual({ kind: 'number', value: 0 })
  })

  it('returns property when it exists even with default', () => {
    const obj = { score: 42 }
    const session = jsSession({ target: obj })
    const r = session.evaluate('((js/prop "score" 0) js/target)')
    expect(r).toEqual({ kind: 'number', value: 42 })
  })

  it('accepts keyword key', () => {
    const obj = { name: 'Charlie' }
    const session = jsSession({ target: obj })
    const r = session.evaluate('((js/prop :name) js/target)')
    expect(r).toEqual({ kind: 'string', value: 'Charlie' })
  })

})

// ---------------------------------------------------------------------------
// js/method
// ---------------------------------------------------------------------------

describe('js/method', () => {
  it('calls a no-arg method via map', () => {
    const session = jsSession({ strings: ['hello', 'world'] })
    const result = session.evaluate(
      '(vec (map (js/method "toUpperCase") (js/seq js/strings)))'
    )
    expect(result).toEqual({
      kind: 'vector',
      value: [
        { kind: 'string', value: 'HELLO' },
        { kind: 'string', value: 'WORLD' },
      ],
    })
  })

  it('supports partial args (prepended at creation)', () => {
    const session = jsSession({ nums: [1.5, 2.7, 3.14] })
    const result = session.evaluate(
      '(vec (map (js/method "toFixed" 1) (js/seq js/nums)))'
    )
    expect(result).toEqual({
      kind: 'vector',
      value: [
        { kind: 'string', value: '1.5' },
        { kind: 'string', value: '2.7' },
        { kind: 'string', value: '3.1' },
      ],
    })
  })

  it('accepts call-site args only', () => {
    const session = jsSession({ arr: [1, 2, 3] })
    const result = session.evaluate('((js/method "slice") js/arr 1)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toEqual([2, 3])
  })

  it('combines partial and call-site args', () => {
    const session = jsSession({ arr: [1, 2, 3, 4, 5] })
    // slice(1, 3) → [2, 3]
    const result = session.evaluate('((js/method "slice" 1) js/arr 3)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toEqual([2, 3])
  })

  it('throws when property is not callable', () => {
    const session = jsSession({ target:{ x: 42 } })
    expect(() => session.evaluate('((js/method "x") js/target)')).toThrow(
      "property 'x' is not callable"
    )
  })
})

// ---------------------------------------------------------------------------
// js/merge
// ---------------------------------------------------------------------------

describe('js/merge', () => {
  it('merges two JS objects into a new object', () => {
    const a = { x: 1 }
    const b = { y: 2 }
    const session = jsSession({ a, b })
    const result = session.evaluate('(js/merge js/a js/b)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toEqual({ x: 1, y: 2 })
  })

  it('merges three objects', () => {
    const a = { x: 1 }
    const b = { y: 2 }
    const c = { z: 3 }
    const session = jsSession({ a, b, c })
    const result = session.evaluate('(js/merge js/a js/b js/c)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value')
      expect(result.value).toEqual({ x: 1, y: 2, z: 3 })
  })

  it('accepts a Clojure map as source', () => {
    const base = { x: 1 }
    const session = jsSession({ base })
    const result = session.evaluate('(js/merge js/base {:y 2 :z 3})')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value')
      expect(result.value).toEqual({ x: 1, y: 2, z: 3 })
  })

  it('does not mutate the original objects', () => {
    const a = { x: 1 }
    const b = { y: 2 }
    const session = jsSession({ a, b })
    const result = session.evaluate('(js/merge js/a js/b)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toEqual({ x: 1, y: 2 })
    expect(a).toEqual({ x: 1 })
    expect(b).toEqual({ y: 2 })
  })

  it('later keys win on conflict', () => {
    const a = { x: 1 }
    const b = { x: 99 }
    const session = jsSession({ a, b })
    const result = session.evaluate('(js/merge js/a js/b)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value')
      expect((result.value as Record<string, unknown>)['x']).toBe(99)
  })
})

// ---------------------------------------------------------------------------
// js/seq
// ---------------------------------------------------------------------------

describe('js/seq', () => {
  it('converts a JS array to a Clojure vector', () => {
    const arr = [1, 2, 3]
    const session = jsSession({ arr })
    const result = session.evaluate('(js/seq js/arr)')
    expect(result).toEqual({
      kind: 'vector',
      value: [
        { kind: 'number', value: 1 },
        { kind: 'number', value: 2 },
        { kind: 'number', value: 3 },
      ],
    })
  })

  it('converts elements via jsToClj (primitives become Clj types)', () => {
    const arr = ['a', true, 42]
    const session = jsSession({ arr })
    const result = session.evaluate('(js/seq js/arr)')
    expect(result).toEqual({
      kind: 'vector',
      value: [
        { kind: 'string', value: 'a' },
        { kind: 'boolean', value: true },
        { kind: 'number', value: 42 },
      ],
    })
  })

  it('boxes object elements as CljJsValue', () => {
    const arr = [{ x: 1 }]
    const session = jsSession({ arr })
    const result = session.evaluate('(js/seq js/arr)')
    expect(result.kind).toBe('vector')
    if (result.kind === 'vector') {
      expect(result.value[0].kind).toBe('js-value')
    }
  })

  it('throws on non-array js-value', () => {
    const session = jsSession({ target:{ x: 1 } })
    expect(() => session.evaluate('(js/seq js/target)')).toThrow(
      'expected a js-value wrapping an array'
    )
  })

  it('throws on non-js-value', () => {
    expect(() => freshSession().evaluate('(js/seq [1 2 3])')).toThrow(
      'expected a js-value wrapping an array'
    )
  })

  it('returns empty vector for empty array', () => {
    const session = jsSession({ arr: [] })
    const result = session.evaluate('(js/seq js/arr)')
    expect(result).toEqual({ kind: 'vector', value: [] })
  })
})

// ---------------------------------------------------------------------------
// js/array
// ---------------------------------------------------------------------------

describe('js/array', () => {
  it('zero args produces an empty JS array', () => {
    const result = freshSession().evaluate('(js/array)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toEqual([])
  })

  it('creates a JS array from primitives', () => {
    const result = freshSession().evaluate('(js/array 1 2 3)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toEqual([1, 2, 3])
  })

  it('creates a JS array from strings', () => {
    const result = freshSession().evaluate('(js/array "a" "b" "c")')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value')
      expect(result.value).toEqual(['a', 'b', 'c'])
  })

  it('round-trips with js/seq', () => {
    const result = freshSession().evaluate('(js/seq (js/array 10 20 30))')
    expect(result).toEqual({
      kind: 'vector',
      value: [
        { kind: 'number', value: 10 },
        { kind: 'number', value: 20 },
        { kind: 'number', value: 30 },
      ],
    })
  })

  it('converts Clojure maps to JS objects', () => {
    const result = freshSession().evaluate('(js/array {:x 1} {:x 2})')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') {
      const arr = result.value as unknown[]
      expect(arr).toEqual([{ x: 1 }, { x: 2 }])
    }
  })
})

// ---------------------------------------------------------------------------
// js/obj
// ---------------------------------------------------------------------------

describe('js/obj', () => {
  it('builds a JS object from string keys', () => {
    const result = freshSession().evaluate('(js/obj "key" "val" "n" 42)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value')
      expect(result.value).toEqual({ key: 'val', n: 42 })
  })

  it('builds a JS object from keyword keys (strips colon)', () => {
    const result = freshSession().evaluate('(js/obj :name "Alice" :age 30)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value')
      expect(result.value).toEqual({ name: 'Alice', age: 30 })
  })

  it('builds an empty object with zero args', () => {
    const result = freshSession().evaluate('(js/obj)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toEqual({})
  })

  it('throws on odd number of args', () => {
    expect(() => freshSession().evaluate('(js/obj "key")')).toThrow(
      'requires even number of arguments'
    )
  })

  it('values are converted via cljToJs (Clojure map → JS obj)', () => {
    const result = freshSession().evaluate('(js/obj "nested" {:x 1})')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value')
      expect(result.value).toEqual({ nested: { x: 1 } })
  })
})

// ---------------------------------------------------------------------------
// js/keys, js/values, js/entries — Object.keys/values/entries equivalents
// ---------------------------------------------------------------------------

describe('js/keys', () => {
  it('returns a Clojure vector of property name strings', () => {
    const result = freshSession().evaluate('(js/keys (js/obj "a" 1 "b" 2 "c" 3))')
    expect(result).toEqual({
      kind: 'vector',
      value: [
        { kind: 'string', value: 'a' },
        { kind: 'string', value: 'b' },
        { kind: 'string', value: 'c' },
      ],
    })
  })

  it('returns empty vector for empty object', () => {
    const result = freshSession().evaluate('(js/keys (js/obj))')
    expect(result).toEqual({ kind: 'vector', value: [] })
  })

  it('composes with count', () => {
    const result = freshSession().evaluate('(count (js/keys (js/obj "x" 1 "y" 2)))')
    expect(result).toEqual({ kind: 'number', value: 2 })
  })

  it('enables discovery — (js/keys module) shows exported names', () => {
    const session = jsSession({ target: { join: () => {}, resolve: () => {}, sep: '/' } })
    const result = session.evaluate('(set (js/keys js/target))')
    expect(result.kind).toBe('set')
    if (result.kind === 'set') {
      const names = new Set(result.values.map((v) => (v.kind === 'string' ? v.value : '')))
      expect(names.has('join')).toBe(true)
      expect(names.has('resolve')).toBe(true)
      expect(names.has('sep')).toBe(true)
    }
  })

  it('throws on nil', () => {
    expect(() => freshSession().evaluate('(js/keys nil)')).toThrow('cannot access properties on nil')
  })
})

describe('js/values', () => {
  it('returns a Clojure vector of values converted via jsToClj', () => {
    const result = freshSession().evaluate('(js/values (js/obj "x" 1 "y" "hello" "z" true))')
    expect(result.kind).toBe('vector')
    if (result.kind === 'vector') {
      expect(result.value).toContainEqual({ kind: 'number', value: 1 })
      expect(result.value).toContainEqual({ kind: 'string', value: 'hello' })
      expect(result.value).toContainEqual({ kind: 'boolean', value: true })
    }
  })

  it('returns empty vector for empty object', () => {
    expect(freshSession().evaluate('(js/values (js/obj))')).toEqual({
      kind: 'vector',
      value: [],
    })
  })

  it('boxes nested object values as CljJsValue', () => {
    const result = freshSession().evaluate('(js/values (js/obj "inner" (js/obj "x" 42)))')
    expect(result.kind).toBe('vector')
    if (result.kind === 'vector') {
      expect(result.value[0].kind).toBe('js-value')
    }
  })
})

describe('js/entries', () => {
  it('returns a vector of [key value] pairs', () => {
    const result = freshSession().evaluate('(js/entries (js/obj "name" "Alice" "age" 30))')
    expect(result.kind).toBe('vector')
    if (result.kind === 'vector') {
      expect(result.value).toHaveLength(2)
      // Each entry is a vector [string, value]
      const [nameEntry, ageEntry] = result.value
      expect(nameEntry).toEqual({
        kind: 'vector',
        value: [{ kind: 'string', value: 'name' }, { kind: 'string', value: 'Alice' }],
      })
      expect(ageEntry).toEqual({
        kind: 'vector',
        value: [{ kind: 'string', value: 'age' }, { kind: 'number', value: 30 }],
      })
    }
  })

  it('returns empty vector for empty object', () => {
    expect(freshSession().evaluate('(js/entries (js/obj))')).toEqual({
      kind: 'vector',
      value: [],
    })
  })

  it('composes with destructuring — extract key and value', () => {
    const result = freshSession().evaluate(`
      (let [entries (js/entries (js/obj "x" 42))
            [[k v]] entries]
        (str k "=" v))
    `)
    expect(result).toEqual({ kind: 'string', value: 'x=42' })
  })

  it('composes with into to rebuild as a Clojure map', () => {
    const result = freshSession().evaluate(
      '(into {} (map (fn [[k v]] [k v]) (js/entries (js/obj "a" 1 "b" 2))))'
    )
    expect(result.kind).toBe('map')
    if (result.kind === 'map') {
      const entries = Object.fromEntries(
        result.entries.map(([k, v]) => [
          k.kind === 'string' ? k.value : '',
          v.kind === 'number' ? v.value : null,
        ])
      )
      expect(entries).toEqual({ a: 1, b: 2 })
    }
  })
})
