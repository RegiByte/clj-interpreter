/**
 * Tests for Phase 1 of JS Interop: CljJsValue type, factory, printer, and assertions.
 */

import { describe, it, expect } from 'vitest'
import { cljJsValue } from '../../factories'
import { printString } from '../../printer'
import { is, isJsValue } from '../../assertions'

describe('cljJsValue factory', () => {
  it('creates a js-value with the correct kind', () => {
    const v = cljJsValue({ foo: 'bar' })
    expect(v.kind).toBe('js-value')
    expect(v.value).toEqual({ foo: 'bar' })
  })

  it('wraps functions', () => {
    const fn = () => 42
    const v = cljJsValue(fn)
    expect(v.kind).toBe('js-value')
    expect(v.value).toBe(fn)
  })

  it('wraps null', () => {
    const v = cljJsValue(null)
    expect(v.kind).toBe('js-value')
    expect(v.value).toBeNull()
  })
})

describe('printer — js-value', () => {
  it('prints functions as #<js Function>', () => {
    expect(printString(cljJsValue(() => {}))).toBe('#<js Function>')
    expect(printString(cljJsValue(Math.abs))).toBe('#<js Function>')
  })

  it('prints arrays as #<js Array>', () => {
    expect(printString(cljJsValue([1, 2, 3]))).toBe('#<js Array>')
    expect(printString(cljJsValue([]))).toBe('#<js Array>')
  })

  it('prints promises as #<js Promise>', () => {
    expect(printString(cljJsValue(Promise.resolve(42)))).toBe('#<js Promise>')
  })

  it('prints plain objects as #<js Object>', () => {
    expect(printString(cljJsValue({}))).toBe('#<js Object>')
    expect(printString(cljJsValue({ a: 1 }))).toBe('#<js Object>')
  })

  it('prints instances with their constructor name', () => {
    expect(printString(cljJsValue(new Map()))).toBe('#<js Map>')
    expect(printString(cljJsValue(new Set()))).toBe('#<js Set>')
  })

  it('prints Date instances as ISO string', () => {
    expect(printString(cljJsValue(new Date('2026-01-01')))).toBe('2026-01-01T00:00:00.000Z')
    expect(printString(cljJsValue(new Date('2026-04-05T12:55:30.000Z')))).toBe('2026-04-05T12:55:30.000Z')
  })

  it('prints null as #<js null> and undefined as #<js undefined>', () => {
    expect(printString(cljJsValue(null))).toBe('#<js null>')
    expect(printString(cljJsValue(undefined))).toBe('#<js undefined>')
  })
})

describe('is.jsValue predicate', () => {
  it('returns true for CljJsValue', () => {
    expect(is.jsValue(cljJsValue({}))).toBe(true)
    expect(isJsValue(cljJsValue(42))).toBe(true)
  })

  it('returns false for other kinds', () => {
    expect(is.jsValue({ kind: 'number', value: 42 })).toBe(false)
    expect(is.jsValue({ kind: 'nil', value: null })).toBe(false)
    expect(is.jsValue({ kind: 'string', value: 'hi' })).toBe(false)
  })
})

describe('is.callable with CljJsValue', () => {
  it('is callable when the wrapped value is a function', () => {
    expect(is.callable(cljJsValue(() => 42))).toBe(true)
    expect(is.callable(cljJsValue(Math.max))).toBe(true)
  })

  it('is NOT callable when the wrapped value is a non-function', () => {
    expect(is.callable(cljJsValue({}))).toBe(false)
    expect(is.callable(cljJsValue([1, 2]))).toBe(false)
    expect(is.callable(cljJsValue(null))).toBe(false)
    expect(is.callable(cljJsValue(42))).toBe(false)
  })
})
