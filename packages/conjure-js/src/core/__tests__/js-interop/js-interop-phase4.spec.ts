/**
 * Tests for Phase 4 — js namespace utilities + hostBindings injection.
 * Tests for Phase 5 — calling CljJsValue functions from Clojure call position.
 */

import { describe, expect, it } from 'vitest'
import { createSession } from '../../session'
import { freshSession } from '../../evaluator/__tests__/evaluator-test-utils'
import { expectError } from '../../evaluator/__tests__/evaluator-test-utils'
import type { CljValue } from '../../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsSession(bindings: Record<string, unknown>) {
  return createSession({ hostBindings: bindings })
}

function jsRaw(result: CljValue): unknown {
  expect(result.kind).toBe('js-value')
  return result.kind === 'js-value' ? result.value : undefined
}

// ---------------------------------------------------------------------------
// hostBindings — resolution as js/name
// ---------------------------------------------------------------------------

describe('hostBindings', () => {
  it('injects a JS object as js/name', () => {
    const obj = { x: 42 }
    const session = jsSession({ myObj: obj })
    const result = session.evaluate('js/myObj')
    expect(result.kind).toBe('js-value')
    expect(jsRaw(result)).toBe(obj)
  })

  it('injects a JS function as js/name', () => {
    const add = (a: number, b: number) => a + b
    const session = jsSession({ add })
    const result = session.evaluate('js/add')
    expect(result.kind).toBe('js-value')
    expect(jsRaw(result)).toBe(add)
  })

  it('injects primitives using jsToClj — numbers become CljNumber, strings become CljString', () => {
    const session = jsSession({ a: 1, b: 'hello' })
    const r1 = session.evaluate('js/a')
    const r2 = session.evaluate('js/b')
    // jsToClj converts primitives — no unnecessary boxing
    expect(r1).toEqual({ kind: 'number', value: 1 })
    expect(r2).toEqual({ kind: 'string', value: 'hello' })
  })

  it('injects null as CljNil — consistent with jsToClj boundary semantics', () => {
    const session = jsSession({ nothing: null })
    const result = session.evaluate('js/nothing')
    expect(result.kind).toBe('nil')
  })
})

// ---------------------------------------------------------------------------
// js/get — dynamic property access
// ---------------------------------------------------------------------------

describe('js/get', () => {
  it('reads a string-keyed property', () => {
    const obj = { name: 'Alice' }
    const session = jsSession({ target: obj })
    const result = session.evaluate('(js/get js/target "name")')
    expect(result).toEqual({ kind: 'string', value: 'Alice' })
  })

  it('reads a keyword-keyed property (strips colon)', () => {
    const obj = { score: 99 }
    const session = jsSession({ target: obj })
    const result = session.evaluate('(js/get js/target :score)')
    expect(result).toEqual({ kind: 'number', value: 99 })
  })

  it('returns CljJsValue(undefined) for missing property', () => {
    const obj = {}
    const session = jsSession({ target: obj })
    const result = session.evaluate('(js/get js/target "missing")')
    // missing property → jsToClj(undefined) → CljJsValue(undefined), distinct from nil
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toBeUndefined()
  })

  it('returns CljJsValue for object properties', () => {
    const inner = { deep: true }
    const obj = { inner }
    const session = jsSession({ target: obj })
    const result = session.evaluate('(js/get js/target "inner")')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toBe(inner)
  })

  it('accepts a string target (auto-boxed like JS would)', () => {
    // (js/get "hello" "length") — string is a valid target, same as (. "hello" length)
    const result = freshSession().evaluate('(js/get "hello" "length")')
    expect(result).toEqual({ kind: 'number', value: 5 })
  })

  it('accepts a number key — JS coerces obj[0] to obj["0"]', () => {
    const session = jsSession({ arr: ['a', 'b', 'c'] })
    const result = session.evaluate('(js/get js/arr 1)')
    expect(result).toEqual({ kind: 'string', value: 'b' })
  })

  it('returns the default when the property is missing', () => {
    const obj = {}
    const session = jsSession({ target: obj })
    const result = session.evaluate('(js/get js/target "missing" nil)')
    expect(result.kind).toBe('nil')
  })

  it('returns the default value when missing (non-nil default)', () => {
    const obj = {}
    const session = jsSession({ target: obj })
    const result = session.evaluate('(js/get js/target "missing" "fallback")')
    expect(result).toEqual({ kind: 'string', value: 'fallback' })
  })

  it('does NOT use default when the property exists', () => {
    const obj = { x: 0 }
    const session = jsSession({ target: obj })
    // 0 is a real value — default must not override it
    const result = session.evaluate('(js/get js/target "x" 99)')
    expect(result).toEqual({ kind: 'number', value: 0 })
  })

  it('throws on nil target (cannot access properties on nil)', () => {
    expectError('(js/get nil "key")', 'cannot access properties on nil')
  })
})

// ---------------------------------------------------------------------------
// js/set! — property mutation
// ---------------------------------------------------------------------------

describe('js/set!', () => {
  it('mutates a property and returns the value', () => {
    const obj: Record<string, unknown> = {}
    const session = jsSession({ target: obj })
    const result = session.evaluate('(js/set! js/target "x" 100)')
    expect(result).toEqual({ kind: 'number', value: 100 })
    expect(obj['x']).toBe(100)
  })

  it('converts keywords to strings for the key', () => {
    const obj: Record<string, unknown> = {}
    const session = jsSession({ target: obj })
    session.evaluate('(js/set! js/target :active true)')
    expect(obj['active']).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// js/call — call a JS function with no this
// ---------------------------------------------------------------------------

describe('js/call', () => {
  it('calls a JS function with converted args', () => {
    const double = (n: number) => n * 2
    const session = jsSession({ double })
    const result = session.evaluate('(js/call js/double 21)')
    expect(result).toEqual({ kind: 'number', value: 42 })
  })

  it('passes multiple args', () => {
    const add = (a: number, b: number) => a + b
    const session = jsSession({ add })
    const result = session.evaluate('(js/call js/add 10 32)')
    expect(result).toEqual({ kind: 'number', value: 42 })
  })

  it('converts Clojure map arg to JS object', () => {
    const getKey = (obj: Record<string, unknown>) => obj['k']
    const session = jsSession({ getKey })
    const result = session.evaluate('(js/call js/getKey {:k "value"})')
    expect(result).toEqual({ kind: 'string', value: 'value' })
  })

  it('throws if the js-value is not callable', () => {
    const notAFn = { x: 1 }
    const session = jsSession({ notAFn })
    expect(() => session.evaluate('(js/call js/notAFn)')).toThrow('js/call: expected a js-value wrapping a function')
  })
})

// ---------------------------------------------------------------------------
// js/typeof
// ---------------------------------------------------------------------------

describe('js/typeof', () => {
  it('returns "function" for a function', () => {
    const fn = () => {}
    const session = jsSession({ fn })
    const result = session.evaluate('(js/typeof js/fn)')
    expect(result).toEqual({ kind: 'string', value: 'function' })
  })

  it('returns "object" for an object', () => {
    const session = jsSession({ target:{} })
    const result = session.evaluate('(js/typeof js/target)')
    expect(result).toEqual({ kind: 'string', value: 'object' })
  })

  it('returns "object" for nil (typeof null === "object")', () => {
    const result = freshSession().evaluate('(js/typeof nil)')
    expect(result).toEqual({ kind: 'string', value: 'object' })
  })

  it('returns "number" for a Clojure number (transparent)', () => {
    const result = freshSession().evaluate('(js/typeof 42)')
    expect(result).toEqual({ kind: 'string', value: 'number' })
  })

  it('returns "string" for a Clojure string (transparent)', () => {
    const result = freshSession().evaluate('(js/typeof "hello")')
    expect(result).toEqual({ kind: 'string', value: 'string' })
  })

  it('returns "boolean" for a Clojure boolean (transparent)', () => {
    const result = freshSession().evaluate('(js/typeof true)')
    expect(result).toEqual({ kind: 'string', value: 'boolean' })
  })

  it('throws on Clojure types with no JS equivalent (vector, map, keyword)', () => {
    expectError('(js/typeof :foo)', 'js/typeof: cannot determine JS type')
    expectError('(js/typeof [1 2 3])', 'js/typeof: cannot determine JS type')
    expectError('(js/typeof {:foo "bar"})', 'js/typeof: cannot determine JS type')
    expectError('(js/typeof #(println %))', 'js/typeof: cannot determine JS type')
  })
})

// ---------------------------------------------------------------------------
// js/instanceof?
// ---------------------------------------------------------------------------

describe('js/instanceof?', () => {
  it('returns true for matching class', () => {
    const session = jsSession({ Date })
    const result = session.evaluate('(js/instanceof? (js/new js/Date "2026-01-01") js/Date)')
    expect(result).toEqual({ kind: 'boolean', value: true })
  })

  it('returns false for non-matching class', () => {
    const session = jsSession({ Date, Map })
    const result = session.evaluate('(js/instanceof? (js/new js/Date) js/Map)')
    expect(result).toEqual({ kind: 'boolean', value: false })
  })
})

// ---------------------------------------------------------------------------
// js/array?
// ---------------------------------------------------------------------------

describe('js/array?', () => {
  it('returns true for a JS array', () => {
    const session = jsSession({ arr: [1, 2, 3] })
    const result = session.evaluate('(js/array? js/arr)')
    expect(result).toEqual({ kind: 'boolean', value: true })
  })

  it('returns false for a JS object', () => {
    const session = jsSession({ target:{} })
    const result = session.evaluate('(js/array? js/target)')
    expect(result).toEqual({ kind: 'boolean', value: false })
  })

  it('returns false for non-js-value', () => {
    const result = freshSession().evaluate('(js/array? [1 2 3])')
    expect(result).toEqual({ kind: 'boolean', value: false })
  })
})

// ---------------------------------------------------------------------------
// js/null? / js/undefined? / js/some?
// ---------------------------------------------------------------------------

describe('js/null? js/undefined? js/some?', () => {
  it('js/null? returns true for nil', () => {
    const result = freshSession().evaluate('(js/null? nil)')
    expect(result).toEqual({ kind: 'boolean', value: true })
  })

  it('js/null? returns false for a value', () => {
    const result = freshSession().evaluate('(js/null? 42)')
    expect(result).toEqual({ kind: 'boolean', value: false })
  })

  it('js/undefined? returns true for CljJsValue(undefined)', () => {
    // js property access returning undefined → CljJsValue(undefined)
    const session = jsSession({ target:{} })
    const result = session.evaluate('(js/undefined? (js/get js/target "missing"))')
    // missing property → jsToClj(undefined) → CljJsValue(undefined)
    expect(result).toEqual({ kind: 'boolean', value: true })
  })

  it('js/undefined? returns false for a string', () => {
    const result = freshSession().evaluate('(js/undefined? "hello")')
    expect(result).toEqual({ kind: 'boolean', value: false })
  })

  it('js/some? returns false for nil', () => {
    const result = freshSession().evaluate('(js/some? nil)')
    expect(result).toEqual({ kind: 'boolean', value: false })
  })

  it('js/some? returns false for undefined', () => {
    const session = jsSession({ target:{} })
    const result = session.evaluate('(js/some? (js/get js/target "missing"))')
    expect(result).toEqual({ kind: 'boolean', value: false })
  })

  it('js/some? returns true for a real value', () => {
    const result = freshSession().evaluate('(js/some? 42)')
    expect(result).toEqual({ kind: 'boolean', value: true })
  })

  it('js/some? returns true for a js-value wrapping an object', () => {
    const session = jsSession({ target:{ x: 1 } })
    const result = session.evaluate('(js/some? js/target)')
    expect(result).toEqual({ kind: 'boolean', value: true })
  })
})

// ---------------------------------------------------------------------------
// Phase 5 — CljJsValue in call position
// ---------------------------------------------------------------------------

describe('Phase 5 — calling CljJsValue functions', () => {
  it('calls a JS function in call position with Clojure args', () => {
    const double = (n: number) => n * 2
    const session = jsSession({ double })
    const result = session.evaluate('(js/double 21)')
    expect(result).toEqual({ kind: 'number', value: 42 })
  })

  it('returns a string result', () => {
    const greet = (name: string) => `Hello, ${name}!`
    const session = jsSession({ greet })
    const result = session.evaluate('(js/greet "world")')
    expect(result).toEqual({ kind: 'string', value: 'Hello, world!' })
  })

  it('returns a boolean result', () => {
    const isEven = (n: number) => n % 2 === 0
    const session = jsSession({ isEven })
    const result = session.evaluate('(js/isEven 4)')
    expect(result).toEqual({ kind: 'boolean', value: true })
  })

  it('boxes object return values as CljJsValue', () => {
    const makeObj = () => ({ x: 1 })
    const session = jsSession({ makeObj })
    const result = session.evaluate('(js/makeObj)')
    expect(result.kind).toBe('js-value')
  })

  it('boxes array return values as CljJsValue', () => {
    const makeArr = () => [1, 2, 3]
    const session = jsSession({ makeArr })
    const result = session.evaluate('(js/makeArr)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toEqual([1, 2, 3])
  })

  it('returns nil for null return values', () => {
    const nullFn = () => null
    const session = jsSession({ nullFn })
    const result = session.evaluate('(js/nullFn)')
    expect(result.kind).toBe('nil')
  })

  it('converts Clojure vector arg to JS array', () => {
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0)
    const session = jsSession({ sum })
    const result = session.evaluate('(js/sum [1 2 3 4])')
    expect(result).toEqual({ kind: 'number', value: 10 })
  })

  it('works with . to call a method with args', () => {
    const session = jsSession({ arr: [1, 2, 3] })
    // Method call via . preserves this — use (. obj method arg) form
    const result = session.evaluate('(. js/arr indexOf 2)')
    expect(result).toEqual({ kind: 'number', value: 1 })
  })

  it('throws when a non-callable CljJsValue is used in call position', () => {
    const session = jsSession({ notFn: { x: 1 } })
    // dispatch.ts catches non-callable values before applyCallable
    expect(() => session.evaluate('(js/notFn)')).toThrow('is not callable')
  })

  it('passes a Clojure fn as callback to a JS higher-order function', () => {
    const applyFn = (f: (n: number) => number, x: number) => f(x)
    const session = jsSession({ applyFn })
    const result = session.evaluate('(js/applyFn #(* % 2) 21)')
    expect(result).toEqual({ kind: 'number', value: 42 })
  })

  it('zero-arg method call via ((. obj method)) pattern', () => {
    const session = jsSession({ str: 'hello world' })
    // (. obj method) returns the method bound to obj; calling it invokes the zero-arg form
    const result = session.evaluate('((. js/str toUpperCase))')
    expect(result).toEqual({ kind: 'string', value: 'HELLO WORLD' })
  })
})
