/**
 * Tests for dot-chain qualified symbol resolution.
 *
 * js/console.log, js/Math.pow, js/Math.PI etc. now resolve via property
 * chain access rather than failing with "Symbol not found".
 *
 * The name part after '/' is split on '.' — the first segment is looked up
 * as a var, remaining segments are walked as JS property accesses.
 */

import { describe, expect, it } from 'vitest'
import { createSession } from '../../session'

// Math and console must be injected via hostBindings — they're not pre-loaded.
// This mirrors real-world usage where the embedding app injects platform globals.
function withMath() {
  return createSession({ hostBindings: { Math } })
}
function withConsole() {
  return createSession({ hostBindings: { console } })
}
function jsSession(bindings: Record<string, unknown>) {
  return createSession({ hostBindings: bindings })
}

// ---------------------------------------------------------------------------
// Value position: js/Math.PI, js/obj.nested.value
// ---------------------------------------------------------------------------

describe('dot-chain qualified symbol — value position', () => {
  it('js/Math.PI resolves to the numeric constant', () => {
    const result = withMath().evaluate('js/Math.PI')
    expect(result).toMatchObject({ kind: 'number', value: Math.PI })
  })

  it('js/Math.E resolves to the numeric constant', () => {
    const result = withMath().evaluate('js/Math.E')
    expect(result).toMatchObject({ kind: 'number', value: Math.E })
  })

  it('returns a bound function reference for js/console.log', () => {
    const result = withConsole().evaluate('js/console.log')
    expect(result.kind).toBe('js-value')
    expect(typeof (result as any).value).toBe('function')
  })

  it('resolves a nested property from a hostBinding object', () => {
    const config = { db: { port: 5432 } }
    const s = jsSession({ config })
    const result = s.evaluate('js/config.db')
    expect(result.kind).toBe('js-value')
    expect((result as any).value).toBe(config.db)
  })

  it('resolves a deep nested number value', () => {
    const data = { a: { b: { c: 99 } } }
    const s = jsSession({ data })
    const result = s.evaluate('js/data.a.b.c')
    expect(result).toMatchObject({ kind: 'number', value: 99 })
  })
})

// ---------------------------------------------------------------------------
// Call position: (js/Math.pow 2 10), (js/console.log "hi"), etc.
// ---------------------------------------------------------------------------

describe('dot-chain qualified symbol — call position', () => {
  it('(js/Math.pow 2 10) → 1024', () => {
    const result = withMath().evaluate('(js/Math.pow 2 10)')
    expect(result).toMatchObject({ kind: 'number', value: 1024 })
  })

  it('(js/Math.max 1 5 3) → 5', () => {
    const result = withMath().evaluate('(js/Math.max 1 5 3)')
    expect(result).toMatchObject({ kind: 'number', value: 5 })
  })

  it('(js/Math.floor 3.7) → 3', () => {
    const result = withMath().evaluate('(js/Math.floor 3.7)')
    expect(result).toMatchObject({ kind: 'number', value: 3 })
  })

  it('calls a method from a hostBinding object', () => {
    const calls: unknown[] = []
    const logger = { log: (...args: unknown[]) => calls.push(args) }
    const s = jsSession({ logger })
    s.evaluate('(js/logger.log "hello" "world")')
    expect(calls).toEqual([['hello', 'world']])
  })

  it('result of dot-chain call is usable in further expressions', () => {
    const result = withMath().evaluate('(+ (js/Math.abs -5) 10)')
    expect(result).toMatchObject({ kind: 'number', value: 15 })
  })

  it('dot-chain call works inside a let binding', () => {
    const result = withMath().evaluate('(let [x (js/Math.pow 3 2)] (* x 2))')
    expect(result).toMatchObject({ kind: 'number', value: 18 })
  })
})

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

describe('dot-chain qualified symbol — errors', () => {
  it('throws when the root var does not exist', () => {
    const s = createSession()
    expect(() => s.evaluate('js/unknown.prop')).toThrow('js/unknown not found')
  })

  it('throws when an intermediate value is null', () => {
    const s = jsSession({ nullObj: null })
    expect(() => s.evaluate('js/nullObj.prop')).toThrow(/null/)
  })
})
