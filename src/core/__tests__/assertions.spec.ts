import { isEqual } from '../assertions'
import {
  cljBoolean,
  cljMap,
  cljNil,
  cljNumber,
  cljString,
  cljSymbol,
  cljVector,
} from '../factories'
import { describe, expect, it } from 'vitest'
import type { CljValue } from '../types'

describe('isEqual', () => {
  it.each([
    ['number', cljNumber(1), cljNumber(1), true],
    ['string', cljString('1'), cljString('1'), true],
    ['boolean true', cljBoolean(true), cljBoolean(true), true],
    ['boolean false', cljBoolean(false), cljBoolean(false), true],
    ['nil', cljNil(), cljNil(), true],
    [
      `symbol (the ref to sym, not eval'ed)`,
      cljSymbol('a'),
      cljSymbol('a'),
      true,
    ],
    [
      'vector with number',
      cljVector([cljNumber(1)]),
      cljVector([cljNumber(1)]),
      true,
    ],
    [
      'map with single key',
      cljMap([[cljString('a'), cljNumber(1)]]),
      cljMap([[cljString('a'), cljNumber(1)]]),
      true,
    ],
    [
      'map with vector value and nested number',
      cljMap([[cljString('key1'), cljVector([cljNumber(1)])]]),
      cljMap([[cljString('key1'), cljVector([cljNumber(1)])]]),
      true,
    ],
    [
      'map with vector value and multiple nested numbers',
      cljMap([
        [
          cljString('key1'),
          cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
        ],
      ]),
      cljMap([
        [
          cljString('key1'),
          cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
        ],
      ]),
      true,
    ],
    // order independence
    [
      'maps with keys in different entry orders',
      cljMap([
        [
          cljString('key2'),
          cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
        ],
        [
          cljString('key1'),
          cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
        ],
      ]),
      cljMap([
        [
          cljString('key1'),
          cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
        ],
        [
          cljString('key2'),
          cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
        ],
      ]),
      true,
    ],
    // False cases
    ['number<>number', cljNumber(1), cljNumber(2), false],
    //
    ['string<>number', cljString('1'), cljNumber(1), false],
    ['true<>false', cljBoolean(true), cljBoolean(false), false],
    ['false<>true', cljBoolean(false), cljBoolean(true), false],
    ['nil<>vector', cljNil(), cljVector([]), false],
    ['sym(a)<>sym(b)', cljSymbol('a'), cljSymbol('b'), false],
    [
      'different length vectors',
      cljVector([cljNumber(1)]),
      cljVector([cljNumber(1), cljNumber(2)]),
      false,
    ],
    [
      'additional keys on one side',
      cljMap([[cljString('a'), cljNumber(1)]]),
      cljMap([
        [cljString('a'), cljNumber(1)],
        [cljString('b'), cljNumber(2)],
      ]),
      false,
    ],
    [
      'additional values on inner vector in map',
      cljMap([[cljString('key1'), cljVector([cljNumber(1)])]]),
      cljMap([[cljString('key1'), cljVector([cljNumber(1), cljNumber(2)])]]),
      false,
    ],
    [
      'missing value on inner vector in map',
      cljMap([
        [
          cljString('key1'),
          cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
        ],
      ]),
      cljMap([[cljString('key1'), cljVector([cljNumber(1), cljNumber(3)])]]),
      false,
    ],
  ])(
    '%s: isEqual(%o, %o) should be %s',
    (_label: string, a: CljValue, b: CljValue, expected: boolean) => {
      expect(isEqual(a, b)).toBe(expected)
    }
  )
})
