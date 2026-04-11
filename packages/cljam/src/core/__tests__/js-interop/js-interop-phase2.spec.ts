/**
 * Tests for Phase 2 of JS Interop: the `.` special form and `js/new`.
 */

import { describe, expect, it } from 'vitest'
import {
  cljJsValue,
  cljNil,
  cljNumber,
  cljString,
  cljBoolean,
  cljVar,
} from '../../factories'
import type { Session } from '../../session'
import { freshSession } from '../../evaluator/__tests__/evaluator-test-utils'
import { expectError } from '../../evaluator/__tests__/evaluator-test-utils'

// ---------------------------------------------------------------------------
// Test helper — inject raw JS values into the `user` namespace so Clojure
// code can reference them by name.  Avoids needing Phase 4 (hostBindings).
// ---------------------------------------------------------------------------

function sessionWithJs(bindings: Record<string, unknown>): Session {
  const session = freshSession()
  const ns = session.getNs('user')!
  for (const [name, rawValue] of Object.entries(bindings)) {
    ns.vars.set(name, cljVar('user', name, cljJsValue(rawValue)))
  }
  return session
}

// ---------------------------------------------------------------------------
// Property access
// ---------------------------------------------------------------------------

describe('. — property access', () => {
  it('reads a string property as CljString', () => {
    const session = sessionWithJs({ obj: { name: 'alice' } })
    expect(session.evaluate('(. obj name)')).toEqual(cljString('alice'))
  })

  it('reads a number property as CljNumber', () => {
    const session = sessionWithJs({ obj: { count: 42 } })
    expect(session.evaluate('(. obj count)')).toEqual(cljNumber(42))
  })

  it('reads a boolean property as CljBoolean', () => {
    const session = sessionWithJs({ obj: { active: true } })
    expect(session.evaluate('(. obj active)')).toEqual(cljBoolean(true))
  })

  it('reads an undefined property as CljJsValue wrapping undefined', () => {
    const session = sessionWithJs({ obj: {} })
    const result = session.evaluate('(. obj missing)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toBeUndefined()
  })

  it('reads a null property as CljNil', () => {
    const session = sessionWithJs({ obj: { value: null } })
    expect(session.evaluate('(. obj value)')).toEqual(cljNil())
  })

  it('undefined property is distinct from nil', () => {
    const session = sessionWithJs({ obj: { explicit: null } })
    const nullResult = session.evaluate('(. obj explicit)')
    const undefinedResult = session.evaluate('(. obj nonexistent)')
    expect(nullResult).toEqual(cljNil())
    expect(undefinedResult.kind).toBe('js-value')
    if (undefinedResult.kind === 'js-value')
      expect(undefinedResult.value).toBeUndefined()
  })

  it('reads an object property as CljJsValue', () => {
    const inner = { x: 1 }
    const session = sessionWithJs({ obj: { inner } })
    const result = session.evaluate('(. obj inner)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toBe(inner)
  })

  it('reads an array property as CljJsValue', () => {
    const arr = [1, 2, 3]
    const session = sessionWithJs({ obj: { arr } })
    const result = session.evaluate('(. obj arr)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') {
      expect(result.value).toBe(arr)
      expect(Array.isArray(result.value)).toBe(true)
    }
  })

  it('reads a function property as CljJsValue (bound to obj)', () => {
    const fn = (x: number) => x * 2
    const session = sessionWithJs({ obj: { fn } })
    const result = session.evaluate('(. obj fn)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') {
      // Function is bound to its object to support the ((. obj method)) zero-arg pattern
      expect(typeof result.value).toBe('function')
      expect((result.value as (x: number) => number)(5)).toBe(10)
    }
  })

  it('zero-arg: (. obj method) returns the function as CljJsValue', () => {
    const session = sessionWithJs({ obj: { greet: () => 'hello' } })
    const result = session.evaluate('(. obj greet)')
    // zero extra args → property access, returns the function boxed
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') {
      expect(typeof result.value).toBe('function')
    }
  })
})

// ---------------------------------------------------------------------------
// Method calls
// ---------------------------------------------------------------------------

describe('. — method calls', () => {
  it('calls a method with one arg', () => {
    const session = sessionWithJs({ math: Math })
    expect(session.evaluate('(. math abs -7)')).toEqual(cljNumber(7))
  })

  it('calls a method with multiple args', () => {
    const session = sessionWithJs({ math: Math })
    expect(session.evaluate('(. math max 3 7 2)')).toEqual(cljNumber(7))
  })

  it('preserves `this` binding', () => {
    const obj = {
      multiplier: 3,
      multiply(x: number) {
        return x * this.multiplier
      },
    }
    const session = sessionWithJs({ obj })
    expect(session.evaluate('(. obj multiply 5)')).toEqual(cljNumber(15))
  })

  it('passes a string arg correctly', () => {
    const session = sessionWithJs({
      obj: { greet: (name: string) => `hello ${name}` },
    })
    expect(session.evaluate('(. obj greet "world")')).toEqual(
      cljString('hello world')
    )
  })

  it('passes a number arg correctly', () => {
    const session = sessionWithJs({ obj: { double: (n: number) => n * 2 } })
    expect(session.evaluate('(. obj double 21)')).toEqual(cljNumber(42))
  })

  it('passes a Clojure vector as a JS array', () => {
    const session = sessionWithJs({
      obj: { sum: (arr: number[]) => arr.reduce((a, b) => a + b, 0) },
    })
    expect(session.evaluate('(. obj sum [1 2 3 4])')).toEqual(cljNumber(10))
  })
  
  it('passes a Clojure list as a JS array', () => {
    const session = sessionWithJs({
      obj: { sum: (arr: number[]) => arr.reduce((a, b) => a + b, 0) },
    })
    expect(session.evaluate('(. obj sum \'(1 2 3 4))')).toEqual(cljNumber(10))
  })

  it('passes a Clojure map as a JS plain object', () => {
    const session = sessionWithJs({
      obj: { getA: (o: Record<string, number>) => o['a'] },
    })
    // Clojure map {:a 99} → JS object {"a": 99} (keyword colon stripped)
    expect(session.evaluate('(. obj getA {:a 99})')).toEqual(cljNumber(99))
  })

  it('passes a Clojure function as a JS callback', () => {
    // Use a custom fold that only passes 2 args to the callback (avoids arity
    // mismatch from Array.prototype.reduce which calls with 4 args).
    const session = sessionWithJs({
      obj: {
        fold: (fn: (acc: number, x: number) => number, init: number) =>
          [1, 2, 3].reduce((acc, x) => fn(acc, x), init),
      },
    })
    const result = session.evaluate('(. obj fold #(+ %1 %2) 0)')
    expect(result).toEqual(cljNumber(6))
  })

  it('method call result object stays boxed as CljJsValue', () => {
    const session = sessionWithJs({ json: JSON })
    // Use a string without embedded quotes to avoid tokenizer issues
    const result = session.evaluate('(. json parse "{}")')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') {
      expect(typeof result.value).toBe('object')
    }
  })
})

// ---------------------------------------------------------------------------
// Threading with `.`
// ---------------------------------------------------------------------------

describe('. — threading', () => {
  it('chains property access and method call via ->', () => {
    const obj = { nested: { value: 'hello' }, length: 5 }
    const session = sessionWithJs({ obj })
    // (-> obj (. nested) (. value)) → "hello"
    const result = session.evaluate('(-> obj (. nested) (. value))')
    expect(result).toEqual(cljString('hello'))
  })

  it('chains two method calls via ->', () => {
    const session = sessionWithJs({ math: Math })
    const result = session.evaluate(`
      (->> -9
        (. math abs)
        (. math sqrt))
    `)
    expect(result).toEqual(cljNumber(3))
  })
})

// ---------------------------------------------------------------------------
// Conversion round-trips
// ---------------------------------------------------------------------------

describe('cljToJs / jsToClj round-trips', () => {
  it('number property → CljNumber, passed back as arg → same number result', () => {
    const session = sessionWithJs({
      obj: { value: -7 },
      math: Math,
    })
    // Read a JS number, pass it to another JS method
    const result = session.evaluate('(let [n (. obj value)] (. math abs n))')
    expect(result).toEqual(cljNumber(7))
  })

  it('string property → CljString, passed back as arg → same string result', () => {
    const session = sessionWithJs({
      obj: { word: 'hello' },
      str: { upper: (s: string) => s.toUpperCase() },
    })
    const result = session.evaluate('(let [s (. obj word)] (. str upper s))')
    expect(result).toEqual(cljString('HELLO'))
  })

  it('object property → CljJsValue, passed back as arg → identity preserved', () => {
    const inner = { x: 99 }
    const session = sessionWithJs({
      obj: { inner },
      checker: { get: (o: typeof inner) => o.x },
    })
    const result = session.evaluate(
      '(let [inner (. obj inner)] (. checker get inner))'
    )
    expect(result).toEqual(cljNumber(99))
  })
})

// ---------------------------------------------------------------------------
// Error cases — `.`
// ---------------------------------------------------------------------------

describe('. — error cases', () => {
  it('throws on nil target', () => {
    expectError('(. nil foo)', 'cannot use . on nil')
  })

  it('throws on nil js-value target (js null)', () => {
    const session = sessionWithJs({ obj: null })
    expectError('(. obj foo)', 'cannot use . on null js value', session)
  })

  it('throws on undefined js-value target', () => {
    const session = sessionWithJs({ obj: undefined })
    expectError('(. obj foo)', 'cannot use . on undefined js value', session)
  })

  it('throws on vector target', () => {
    expectError('(. [1 2 3] length)', 'cannot use . on vector')
  })

  it('throws on map target', () => {
    expectError('(. {:a 1} foo)', 'cannot use . on map')
  })

  it('throws when fewer than 2 args', () => {
    const session = sessionWithJs({ obj: {} })
    expectError('(. obj)', '. requires at least 2 arguments', session)
  })

  it('throws when property name is not a symbol', () => {
    const session = sessionWithJs({ obj: {} })
    expectError(
      '(. obj "foo")',
      '. expects a symbol for property name',
      session
    )
  })

  it('throws when calling a non-callable property as method', () => {
    const session = sessionWithJs({ obj: { x: 42 } })
    expectError('(. obj x 1)', "method 'x' is not callable", session)
  })
})

// ---------------------------------------------------------------------------
// Auto-boxing primitives in `.`
// ---------------------------------------------------------------------------

describe('. — auto-boxing primitive targets', () => {
  it('reads string length property', () => {
    expect(freshSession().evaluate('(. "hello" length)')).toEqual(cljNumber(5))
  })

  it('calls a string method with an arg', () => {
    expect(freshSession().evaluate('(. "hello" indexOf "l")')).toEqual(
      cljNumber(2)
    )
  })

  it('calls a number method on a CljNumber', () => {
    // toFixed returns a string
    expect(freshSession().evaluate('(. 3.14159 toFixed 2)')).toEqual(
      cljString('3.14')
    )
  })

  it('chains string method calls', () => {
    expect(
      freshSession().evaluate('(-> "hello world" (. indexOf "world"))')
    ).toEqual(cljNumber(6))
  })

  it('reads a number property on a CljNumber', () => {
    // e.g. numbers do not have a "foo" prop — returns undefined boxed
    const result = freshSession().evaluate('(. 42 foo)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') expect(result.value).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Conversion — keywords, lists, rich keys
// ---------------------------------------------------------------------------

describe('cljToJs — keyword conversion', () => {
  it('keyword arg strips the colon', () => {
    const session = sessionWithJs({
      obj: { echo: (s: string) => s },
    })
    // :foo → "foo"
    expect(session.evaluate('(. obj echo :foo)')).toEqual(cljString('foo'))
  })

  it('keyword map key strips the colon', () => {
    const session = sessionWithJs({
      obj: { get: (o: Record<string, number>) => o['a'] },
    })
    expect(session.evaluate('(. obj get {:a 42})')).toEqual(cljNumber(42))
  })

  it('string map key is used as-is (no modification)', () => {
    const session = sessionWithJs({
      obj: { get: (o: Record<string, number>) => o['key'] },
    })
    expect(session.evaluate('(. obj get {"key" 7})')).toEqual(cljNumber(7))
  })

  it('number map key converts to string', () => {
    const session = sessionWithJs({
      obj: { get: (o: Record<string, number>) => o['1'] },
    })
    expect(session.evaluate('(. obj get {1 99})')).toEqual(cljNumber(99))
  })

  it('boolean map key converts to string', () => {
    const session = sessionWithJs({
      obj: { get: (o: Record<string, unknown>) => o['true'] },
    })
    expect(session.evaluate('(. obj get {true 55})')).toEqual(cljNumber(55))
  })

  it('rich map key (vector) throws a clear error', () => {
    const session = sessionWithJs({ obj: { noop: (_: unknown) => null } })
    expectError(
      '(. obj noop {[1 2] "val"})',
      'rich keys are not allowed as JS object keys',
      session
    )
  })

  it('rich map key (map) throws a clear error', () => {
    const session = sessionWithJs({ obj: { noop: (_: unknown) => null } })
    expectError(
      '(. obj noop {{:a 1} "val"})',
      'rich keys are not allowed as JS object keys',
      session
    )
  })
})

describe('cljToJs — list converts to array', () => {
  it('a quoted list is passed as a JS array', () => {
    const s = sessionWithJs({
      obj: { sum: (arr: number[]) => arr.reduce((a, b) => a + b, 0) },
    })
    expect(s.evaluate("(. obj sum '(1 2 3 4))")).toEqual(cljNumber(10))
  })

  it('nested list inside vector converts recursively', () => {
    const s = sessionWithJs({
      obj: { first: (arr: number[][]) => arr[0][0] },
    })
    expect(s.evaluate("(. obj first ['(10 20)])")).toEqual(cljNumber(10))
  })
})

// ---------------------------------------------------------------------------
// js/new
// ---------------------------------------------------------------------------

describe('js/new', () => {
  it('constructs a Map with no args', () => {
    const session = sessionWithJs({ MyMap: Map })
    const result = session.evaluate('(js/new MyMap)')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value')
      expect(result.value instanceof Map).toBe(true)
  })

  it('constructs a Date with a string arg', () => {
    const session = sessionWithJs({ MyDate: Date })
    const result = session.evaluate('(js/new MyDate "2026-06-15")')
    expect(result.kind).toBe('js-value')
    if (result.kind === 'js-value') {
      expect(result.value instanceof Date).toBe(true)
      // Use UTC year to avoid timezone-boundary issues with midnight dates
      expect((result.value as Date).getUTCFullYear()).toBe(2026)
    }
  })

  it('constructs and then uses the result with .', () => {
    const session = sessionWithJs({ MyMap: Map })
    const result = session.evaluate(`
      (let [m (js/new MyMap)]
        (. m set "key" 42)
        (. m get "key"))
    `)
    expect(result).toEqual(cljNumber(42))
  })

  it('throws on non-js-value constructor', () => {
    expectError('(js/new 42)', 'js/new: expected js-value constructor')
  })

  it('throws on CljJsValue wrapping a non-function', () => {
    const session = sessionWithJs({ notACtor: { x: 1 } })
    expectError(
      '(js/new notACtor)',
      'js/new: expected js-value constructor',
      session
    )
  })
})
