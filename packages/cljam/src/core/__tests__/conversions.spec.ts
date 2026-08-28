import { describe, expect, it } from 'vitest'
import { ConversionError, jsToClj } from '../conversions'
import { applyFunction } from '../evaluator'
import { createSession } from '../session'
import { v } from '../factories'
import { makeEnv } from '../env'
import type { CljValue } from '../types'

const session = createSession()

describe('cljToJs', () => {
  describe('primitives', () => {
    it('converts CljNumber to number', () => {
      expect(session.cljToJs(v.number(42))).toBe(42)
      expect(session.cljToJs(v.number(0))).toBe(0)
      expect(session.cljToJs(v.number(-3.14))).toBe(-3.14)
    })

    it('converts CljString to string', () => {
      expect(session.cljToJs(v.string('hello'))).toBe('hello')
      expect(session.cljToJs(v.string(''))).toBe('')
    })

    it('converts CljBoolean to boolean', () => {
      expect(session.cljToJs(v.boolean(true))).toBe(true)
      expect(session.cljToJs(v.boolean(false))).toBe(false)
    })

    it('converts CljNil to null', () => {
      expect(session.cljToJs(v.nil())).toBe(null)
    })

    it('converts CljKeyword to string without colon', () => {
      expect(session.cljToJs(v.keyword(':foo'))).toBe('foo')
      expect(session.cljToJs(v.keyword(':hello-world'))).toBe('hello-world')
    })

    it('converts CljSymbol to string', () => {
      expect(session.cljToJs(v.symbol('my-var'))).toBe('my-var')
    })
  })

  describe('collections', () => {
    it('converts CljVector to array', () => {
      const vec = v.vector([v.number(1), v.number(2), v.number(3)])
      expect(session.cljToJs(vec)).toEqual([1, 2, 3])
    })

    it('converts CljList to array', () => {
      const list = v.list([v.string('a'), v.string('b')])
      expect(session.cljToJs(list)).toEqual(['a', 'b'])
    })

    it('converts empty vector to empty array', () => {
      expect(session.cljToJs(v.vector([]))).toEqual([])
    })

    it('converts nested vectors recursively', () => {
      const nested = v.vector([
        v.number(1),
        v.vector([v.number(2), v.number(3)]),
      ])
      expect(session.cljToJs(nested)).toEqual([1, [2, 3]])
    })

    it('converts CljMap with keyword keys to object', () => {
      const map = v.map([
        [v.keyword(':name'), v.string('alice')],
        [v.keyword(':age'), v.number(30)],
      ])
      expect(session.cljToJs(map)).toEqual({ name: 'alice', age: 30 })
    })

    it('converts CljMap with string keys to object', () => {
      const map = v.map([
        [v.string('x'), v.number(1)],
        [v.string('y'), v.number(2)],
      ])
      expect(session.cljToJs(map)).toEqual({ x: 1, y: 2 })
    })

    it('converts CljMap with number keys to object', () => {
      const map = v.map([
        [v.number(0), v.string('zero')],
        [v.number(1), v.string('one')],
      ])
      expect(session.cljToJs(map)).toEqual({ '0': 'zero', '1': 'one' })
    })

    it('converts nested map values recursively', () => {
      const map = v.map([
        [
          v.keyword(':person'),
          v.map([
            [v.keyword(':name'), v.string('bob')],
            [v.keyword(':scores'), v.vector([v.number(10), v.number(20)])],
          ]),
        ],
      ])
      expect(session.cljToJs(map)).toEqual({
        person: { name: 'bob', scores: [10, 20] },
      })
    })

    it('converts empty map to empty object', () => {
      expect(session.cljToJs(v.map([]))).toEqual({})
    })

    it('throws ConversionError for vector keys in maps', () => {
      const map = v.map([
        [v.vector([v.number(1), v.number(2)]), v.string('value')],
      ])
      expect(() => session.cljToJs(map)).toThrow(ConversionError)
      expect(() => session.cljToJs(map)).toThrow('Rich key types')
    })

    it('throws ConversionError for list keys in maps', () => {
      const map = v.map([[v.list([v.number(1)]), v.string('value')]])
      expect(() => session.cljToJs(map)).toThrow(ConversionError)
    })

    it('throws ConversionError for map keys in maps', () => {
      const map = v.map([
        [v.map([[v.keyword(':a'), v.number(1)]]), v.string('value')],
      ])
      expect(() => session.cljToJs(map)).toThrow(ConversionError)
    })
  })

  describe('functions', () => {
    it('converts CljNativeFunction to callable JS function', () => {
      const add = v.nativeFn('add', (a: CljValue, b: CljValue) => {
        if (a.kind !== 'number' || b.kind !== 'number')
          throw new Error('expected numbers')
        return v.number(a.value + b.value)
      })
      const jsFn = session.cljToJs(add) as (...args: unknown[]) => unknown
      expect(typeof jsFn).toBe('function')
      expect(jsFn(3, 4)).toBe(7)
    })

    it('converts CljFunction to callable JS function', () => {
      // Evaluated in the session so the fn carries a real executable body
      // (astMethod) — raw-factory form-only fns have no engine since S4b.
      const fn = session.evaluate('(fn [x] (+ x 10))')

      const jsFn = session.cljToJs(fn) as (...args: unknown[]) => unknown
      expect(typeof jsFn).toBe('function')
      expect(jsFn(5)).toBe(15)
    })

    it('function wrapper converts return collections to JS', () => {
      const vecFn = v.nativeFn('make-vec', () =>
        v.vector([v.number(1), v.number(2)])
      )
      const jsFn = session.cljToJs(vecFn) as () => unknown
      expect(jsFn()).toEqual([1, 2])
    })

    it('function wrapper converts JS args to Clj', () => {
      const identity = v.nativeFn('identity', (x: CljValue) => x)
      const jsFn = session.cljToJs(identity) as (x: unknown) => unknown
      expect(jsFn('hello')).toBe('hello')
      expect(jsFn(42)).toBe(42)
      expect(jsFn(null)).toBe(null)
      expect(jsFn([1, 2])).toEqual([1, 2])
    })
  })

  describe('macros', () => {
    it('throws ConversionError for macros', () => {
      const macro = v.macro([v.symbol('x')], null, [v.symbol('x')], makeEnv())
      expect(() => session.cljToJs(macro)).toThrow(ConversionError)
      expect(() => session.cljToJs(macro)).toThrow('Macros cannot be exported')
    })
  })
})

describe('jsToClj', () => {
  describe('primitives', () => {
    it('converts number to CljNumber', () => {
      expect(jsToClj(42)).toEqual(v.number(42))
      expect(jsToClj(0)).toEqual(v.number(0))
      expect(jsToClj(-1.5)).toEqual(v.number(-1.5))
    })

    it('converts string to CljString', () => {
      expect(jsToClj('hello')).toEqual(v.string('hello'))
      expect(jsToClj('')).toEqual(v.string(''))
    })

    it('converts boolean to CljBoolean', () => {
      expect(jsToClj(true)).toEqual(v.boolean(true))
      expect(jsToClj(false)).toEqual(v.boolean(false))
    })

    it('converts null to CljNil', () => {
      expect(jsToClj(null)).toEqual(v.nil())
    })

    it('converts undefined to CljJsValue wrapping undefined', () => {
      const result = jsToClj(undefined)
      expect(result.kind).toBe('js-value')
      if (result.kind === 'js-value') expect(result.value).toBeUndefined()
    })
  })

  describe('collections', () => {
    it('converts array to CljVector', () => {
      expect(jsToClj([1, 2, 3])).toEqual(
        v.vector([v.number(1), v.number(2), v.number(3)])
      )
    })

    it('converts empty array to empty CljVector', () => {
      expect(jsToClj([])).toEqual(v.vector([]))
    })

    it('converts nested arrays recursively', () => {
      expect(jsToClj([1, [2, 3]])).toEqual(
        v.vector([v.number(1), v.vector([v.number(2), v.number(3)])])
      )
    })

    it('converts plain object to CljMap with keyword keys', () => {
      const result = jsToClj({ name: 'alice', age: 30 })
      expect(result).toEqual(
        v.map([
          [v.keyword(':name'), v.string('alice')],
          [v.keyword(':age'), v.number(30)],
        ])
      )
    })

    it('converts empty object to empty CljMap', () => {
      expect(jsToClj({})).toEqual(v.map([]))
    })

    it('converts nested objects recursively', () => {
      const result = jsToClj({ person: { name: 'bob' } })
      expect(result).toEqual(
        v.map([
          [
            v.keyword(':person'),
            v.map([[v.keyword(':name'), v.string('bob')]]),
          ],
        ])
      )
    })

    it('converts mixed arrays and objects', () => {
      const result = jsToClj({ items: [1, 2] })
      expect(result).toEqual(
        v.map([[v.keyword(':items'), v.vector([v.number(1), v.number(2)])]])
      )
    })

    it('uses string keys when keywordizeKeys is false', () => {
      const result = jsToClj(
        { name: 'alice', age: 30 },
        { keywordizeKeys: false }
      )
      expect(result).toEqual(
        v.map([
          [v.string('name'), v.string('alice')],
          [v.string('age'), v.number(30)],
        ])
      )
    })

    it('propagates keywordizeKeys: false recursively', () => {
      const result = jsToClj(
        { person: { name: 'bob' } },
        { keywordizeKeys: false }
      )
      expect(result).toEqual(
        v.map([
          [v.string('person'), v.map([[v.string('name'), v.string('bob')]])],
        ])
      )
    })
  })

  describe('functions', () => {
    it('converts JS function to CljNativeFunction', () => {
      const fn = (x: number) => x * 2
      const result = jsToClj(fn)
      expect(result.kind).toBe('native-function')
    })

    it('converted function bridges JS and Clj correctly', () => {
      const double = (x: number) => x * 2
      const cljFn = jsToClj(double)
      expect(cljFn.kind).toBe('native-function')
      const result = applyFunction(
        cljFn as import('../types').CljNativeFunction,
        [v.number(5)]
      )
      expect(result).toEqual(v.number(10))
    })

    it('converted function handles array args and return', () => {
      const reverse = (arr: number[]) => [...arr].reverse()
      const cljFn = jsToClj(reverse) as import('../types').CljNativeFunction
      const result = applyFunction(cljFn, [
        v.vector([v.number(1), v.number(2), v.number(3)]),
      ])
      expect(result).toEqual(v.vector([v.number(3), v.number(2), v.number(1)]))
    })
  })

  describe('CljValue passthrough', () => {
    it('passes CljNumber through unchanged', () => {
      const num = v.number(42)
      expect(jsToClj(num)).toBe(num)
    })

    it('passes CljVector through unchanged', () => {
      const vec = v.vector([v.number(1)])
      expect(jsToClj(vec)).toBe(vec)
    })

    it('passes CljNil through unchanged', () => {
      const nil = v.nil()
      expect(jsToClj(nil)).toBe(nil)
    })

    it('passes CljFunction through unchanged', () => {
      const fn = v.function([v.symbol('x')], null, [v.symbol('x')], makeEnv())
      expect(jsToClj(fn)).toBe(fn)
    })
  })

  describe('edge cases', () => {
    it('throws ConversionError for symbol type', () => {
      expect(() => jsToClj(Symbol('test'))).toThrow(ConversionError)
    })

    it('throws ConversionError for bigint', () => {
      expect(() => jsToClj(BigInt(42))).toThrow(ConversionError)
    })
  })
})

describe('roundtrip conversions', () => {
  it('number roundtrips', () => {
    expect(session.cljToJs(jsToClj(42))).toBe(42)
  })

  it('string roundtrips', () => {
    expect(session.cljToJs(jsToClj('hello'))).toBe('hello')
  })

  it('boolean roundtrips', () => {
    expect(session.cljToJs(jsToClj(true))).toBe(true)
    expect(session.cljToJs(jsToClj(false))).toBe(false)
  })

  it('null roundtrips', () => {
    expect(session.cljToJs(jsToClj(null))).toBe(null)
  })

  it('array roundtrips', () => {
    expect(session.cljToJs(jsToClj([1, 2, 3]))).toEqual([1, 2, 3])
  })

  it('nested structure roundtrips', () => {
    const original = { name: 'alice', scores: [10, 20], active: true }
    expect(session.cljToJs(jsToClj(original))).toEqual(original)
  })
})
