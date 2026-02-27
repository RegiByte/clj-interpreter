import { describe, expect, it } from 'vitest'
import { cljToJs, ConversionError, jsToClj } from '../conversions'
import { applyFunction } from '../evaluator'
import {
  cljBoolean,
  cljFunction,
  cljKeyword,
  cljList,
  cljMap,
  cljMacro,
  cljNativeFunction,
  cljNil,
  cljNumber,
  cljString,
  cljSymbol,
  cljVector,
} from '../factories'
import { makeEnv } from '../env'
import type { CljValue } from '../types'

describe('cljToJs', () => {
  describe('primitives', () => {
    it('converts CljNumber to number', () => {
      expect(cljToJs(cljNumber(42))).toBe(42)
      expect(cljToJs(cljNumber(0))).toBe(0)
      expect(cljToJs(cljNumber(-3.14))).toBe(-3.14)
    })

    it('converts CljString to string', () => {
      expect(cljToJs(cljString('hello'))).toBe('hello')
      expect(cljToJs(cljString(''))).toBe('')
    })

    it('converts CljBoolean to boolean', () => {
      expect(cljToJs(cljBoolean(true))).toBe(true)
      expect(cljToJs(cljBoolean(false))).toBe(false)
    })

    it('converts CljNil to null', () => {
      expect(cljToJs(cljNil())).toBe(null)
    })

    it('converts CljKeyword to string without colon', () => {
      expect(cljToJs(cljKeyword(':foo'))).toBe('foo')
      expect(cljToJs(cljKeyword(':hello-world'))).toBe('hello-world')
    })

    it('converts CljSymbol to string', () => {
      expect(cljToJs(cljSymbol('my-var'))).toBe('my-var')
    })
  })

  describe('collections', () => {
    it('converts CljVector to array', () => {
      const vec = cljVector([cljNumber(1), cljNumber(2), cljNumber(3)])
      expect(cljToJs(vec)).toEqual([1, 2, 3])
    })

    it('converts CljList to array', () => {
      const list = cljList([cljString('a'), cljString('b')])
      expect(cljToJs(list)).toEqual(['a', 'b'])
    })

    it('converts empty vector to empty array', () => {
      expect(cljToJs(cljVector([]))).toEqual([])
    })

    it('converts nested vectors recursively', () => {
      const nested = cljVector([
        cljNumber(1),
        cljVector([cljNumber(2), cljNumber(3)]),
      ])
      expect(cljToJs(nested)).toEqual([1, [2, 3]])
    })

    it('converts CljMap with keyword keys to object', () => {
      const map = cljMap([
        [cljKeyword(':name'), cljString('alice')],
        [cljKeyword(':age'), cljNumber(30)],
      ])
      expect(cljToJs(map)).toEqual({ name: 'alice', age: 30 })
    })

    it('converts CljMap with string keys to object', () => {
      const map = cljMap([
        [cljString('x'), cljNumber(1)],
        [cljString('y'), cljNumber(2)],
      ])
      expect(cljToJs(map)).toEqual({ x: 1, y: 2 })
    })

    it('converts CljMap with number keys to object', () => {
      const map = cljMap([
        [cljNumber(0), cljString('zero')],
        [cljNumber(1), cljString('one')],
      ])
      expect(cljToJs(map)).toEqual({ '0': 'zero', '1': 'one' })
    })

    it('converts nested map values recursively', () => {
      const map = cljMap([
        [
          cljKeyword(':person'),
          cljMap([
            [cljKeyword(':name'), cljString('bob')],
            [cljKeyword(':scores'), cljVector([cljNumber(10), cljNumber(20)])],
          ]),
        ],
      ])
      expect(cljToJs(map)).toEqual({
        person: { name: 'bob', scores: [10, 20] },
      })
    })

    it('converts empty map to empty object', () => {
      expect(cljToJs(cljMap([]))).toEqual({})
    })

    it('throws ConversionError for vector keys in maps', () => {
      const map = cljMap([
        [cljVector([cljNumber(1), cljNumber(2)]), cljString('value')],
      ])
      expect(() => cljToJs(map)).toThrow(ConversionError)
      expect(() => cljToJs(map)).toThrow('Rich key types')
    })

    it('throws ConversionError for list keys in maps', () => {
      const map = cljMap([
        [cljList([cljNumber(1)]), cljString('value')],
      ])
      expect(() => cljToJs(map)).toThrow(ConversionError)
    })

    it('throws ConversionError for map keys in maps', () => {
      const map = cljMap([
        [cljMap([[cljKeyword(':a'), cljNumber(1)]]), cljString('value')],
      ])
      expect(() => cljToJs(map)).toThrow(ConversionError)
    })
  })

  describe('functions', () => {
    it('converts CljNativeFunction to callable JS function', () => {
      const add = cljNativeFunction('add', (a: CljValue, b: CljValue) => {
        if (a.kind !== 'number' || b.kind !== 'number')
          throw new Error('expected numbers')
        return cljNumber(a.value + b.value)
      })
      const jsFn = cljToJs(add) as (...args: unknown[]) => unknown
      expect(typeof jsFn).toBe('function')
      expect(jsFn(3, 4)).toBe(7)
    })

    it('converts CljFunction to callable JS function', () => {
      const env = makeEnv()
      env.bindings.set(
        '+',
        cljNativeFunction('+', (a: CljValue, b: CljValue) => {
          if (a.kind !== 'number' || b.kind !== 'number')
            throw new Error('expected numbers')
          return cljNumber(a.value + b.value)
        })
      )

      const fn = cljFunction(
        [cljSymbol('x')],
        null,
        [
          cljList([cljSymbol('+'), cljSymbol('x'), cljNumber(10)]),
        ],
        env
      )

      const jsFn = cljToJs(fn) as (...args: unknown[]) => unknown
      expect(typeof jsFn).toBe('function')
      expect(jsFn(5)).toBe(15)
    })

    it('function wrapper converts return collections to JS', () => {
      const vecFn = cljNativeFunction('make-vec', () =>
        cljVector([cljNumber(1), cljNumber(2)])
      )
      const jsFn = cljToJs(vecFn) as () => unknown
      expect(jsFn()).toEqual([1, 2])
    })

    it('function wrapper converts JS args to Clj', () => {
      const identity = cljNativeFunction('identity', (x: CljValue) => x)
      const jsFn = cljToJs(identity) as (x: unknown) => unknown
      expect(jsFn('hello')).toBe('hello')
      expect(jsFn(42)).toBe(42)
      expect(jsFn(null)).toBe(null)
      expect(jsFn([1, 2])).toEqual([1, 2])
    })
  })

  describe('macros', () => {
    it('throws ConversionError for macros', () => {
      const macro = cljMacro([cljSymbol('x')], null, [cljSymbol('x')], makeEnv())
      expect(() => cljToJs(macro)).toThrow(ConversionError)
      expect(() => cljToJs(macro)).toThrow('Macros cannot be exported')
    })
  })
})

describe('jsToClj', () => {
  describe('primitives', () => {
    it('converts number to CljNumber', () => {
      expect(jsToClj(42)).toEqual(cljNumber(42))
      expect(jsToClj(0)).toEqual(cljNumber(0))
      expect(jsToClj(-1.5)).toEqual(cljNumber(-1.5))
    })

    it('converts string to CljString', () => {
      expect(jsToClj('hello')).toEqual(cljString('hello'))
      expect(jsToClj('')).toEqual(cljString(''))
    })

    it('converts boolean to CljBoolean', () => {
      expect(jsToClj(true)).toEqual(cljBoolean(true))
      expect(jsToClj(false)).toEqual(cljBoolean(false))
    })

    it('converts null to CljNil', () => {
      expect(jsToClj(null)).toEqual(cljNil())
    })

    it('converts undefined to CljNil', () => {
      expect(jsToClj(undefined)).toEqual(cljNil())
    })
  })

  describe('collections', () => {
    it('converts array to CljVector', () => {
      expect(jsToClj([1, 2, 3])).toEqual(
        cljVector([cljNumber(1), cljNumber(2), cljNumber(3)])
      )
    })

    it('converts empty array to empty CljVector', () => {
      expect(jsToClj([])).toEqual(cljVector([]))
    })

    it('converts nested arrays recursively', () => {
      expect(jsToClj([1, [2, 3]])).toEqual(
        cljVector([
          cljNumber(1),
          cljVector([cljNumber(2), cljNumber(3)]),
        ])
      )
    })

    it('converts plain object to CljMap with keyword keys', () => {
      const result = jsToClj({ name: 'alice', age: 30 })
      expect(result).toEqual(
        cljMap([
          [cljKeyword(':name'), cljString('alice')],
          [cljKeyword(':age'), cljNumber(30)],
        ])
      )
    })

    it('converts empty object to empty CljMap', () => {
      expect(jsToClj({})).toEqual(cljMap([]))
    })

    it('converts nested objects recursively', () => {
      const result = jsToClj({ person: { name: 'bob' } })
      expect(result).toEqual(
        cljMap([
          [
            cljKeyword(':person'),
            cljMap([[cljKeyword(':name'), cljString('bob')]]),
          ],
        ])
      )
    })

    it('converts mixed arrays and objects', () => {
      const result = jsToClj({ items: [1, 2] })
      expect(result).toEqual(
        cljMap([
          [cljKeyword(':items'), cljVector([cljNumber(1), cljNumber(2)])],
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
        [cljNumber(5)]
      )
      expect(result).toEqual(cljNumber(10))
    })

    it('converted function handles array args and return', () => {
      const reverse = (arr: number[]) => [...arr].reverse()
      const cljFn = jsToClj(reverse) as import('../types').CljNativeFunction
      const result = applyFunction(cljFn, [
        cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
      ])
      expect(result).toEqual(
        cljVector([cljNumber(3), cljNumber(2), cljNumber(1)])
      )
    })
  })

  describe('CljValue passthrough', () => {
    it('passes CljNumber through unchanged', () => {
      const num = cljNumber(42)
      expect(jsToClj(num)).toBe(num)
    })

    it('passes CljVector through unchanged', () => {
      const vec = cljVector([cljNumber(1)])
      expect(jsToClj(vec)).toBe(vec)
    })

    it('passes CljNil through unchanged', () => {
      const nil = cljNil()
      expect(jsToClj(nil)).toBe(nil)
    })

    it('passes CljFunction through unchanged', () => {
      const fn = cljFunction([cljSymbol('x')], null, [cljSymbol('x')], makeEnv())
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
    expect(cljToJs(jsToClj(42))).toBe(42)
  })

  it('string roundtrips', () => {
    expect(cljToJs(jsToClj('hello'))).toBe('hello')
  })

  it('boolean roundtrips', () => {
    expect(cljToJs(jsToClj(true))).toBe(true)
    expect(cljToJs(jsToClj(false))).toBe(false)
  })

  it('null roundtrips', () => {
    expect(cljToJs(jsToClj(null))).toBe(null)
  })

  it('array roundtrips', () => {
    expect(cljToJs(jsToClj([1, 2, 3]))).toEqual([1, 2, 3])
  })

  it('nested structure roundtrips', () => {
    const original = { name: 'alice', scores: [10, 20], active: true }
    expect(cljToJs(jsToClj(original))).toEqual(original)
  })
})
