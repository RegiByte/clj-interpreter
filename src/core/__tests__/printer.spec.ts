import { describe, it, expect } from 'vitest'
import { printString } from '../printer'
import {
  cljNumber,
  cljString,
  cljBoolean,
  cljKeyword,
  cljNil,
  cljSymbol,
  cljList,
  cljVector,
  cljMap,
  cljFunction,
} from '../factories'
import { tokenize } from '../tokenizer'
import { parseForms } from '../parser'
import { makeEnv } from '../env'

describe('printer', () => {
  it('should print numbers', () => {
    expect(printString(cljNumber(1))).toBe('1')
    expect(printString(cljNumber(1.23))).toBe('1.23')
    expect(printString(cljNumber(-1.23))).toBe('-1.23')
  })

  it('should print nils', () => {
    expect(printString(cljNil())).toBe('nil')
  })

  it('should print strings', () => {
    expect(printString(cljString('hello'))).toBe('"hello"')
    expect(printString(cljString('hello world'))).toBe('"hello world"')
    expect(printString(cljString('hello "world"'))).toBe('"hello \\"world\\""')
    expect(printString(cljString('hello "world"\nnice!'))).toBe(
      '"hello \\"world\\"\\nnice!\"'
    )
  })

  it('should print booleans', () => {
    expect(printString(cljBoolean(true))).toBe('true')
    expect(printString(cljBoolean(false))).toBe('false')
  })

  it('should print keywords', () => {
    expect(printString(cljKeyword(':hello'))).toBe(':hello')
    expect(printString(cljKeyword(':hello-world'))).toBe(':hello-world')
    expect(printString(cljKeyword(':hello-world-nice!'))).toBe(
      ':hello-world-nice!'
    )
  })

  it('should print symbols', () => {
    expect(printString(cljSymbol('hello'))).toBe('hello')
    expect(printString(cljSymbol('hello-world'))).toBe('hello-world')
    expect(printString(cljSymbol('hello-world-nice!'))).toBe(
      'hello-world-nice!'
    )
  })

  it('should print lists', () => {
    expect(
      printString(cljList([cljNumber(1), cljString('hello'), cljBoolean(true)]))
    ).toBe('(1 "hello" true)')
    expect(
      printString(
        cljList([
          cljNumber(1),
          cljString('hello'),
          cljBoolean(true),
          cljList([cljNumber(2), cljString('world'), cljBoolean(false)]),
        ])
      )
    ).toBe('(1 "hello" true (2 "world" false))')
  })

  it('should print vectors', () => {
    expect(
      printString(
        cljVector([cljNumber(1), cljString('hello'), cljBoolean(true)])
      )
    ).toBe('[1 "hello" true]')
    expect(
      printString(
        cljVector([
          cljNumber(1),
          cljString('hello'),
          cljBoolean(true),
          cljVector([cljNumber(2), cljString('world'), cljBoolean(false)]),
        ])
      )
    ).toBe('[1 "hello" true [2 "world" false]]')
  })

  it('should print maps', () => {
    expect(
      printString(cljMap([[cljKeyword(':hello'), cljString('world')]]))
    ).toBe('{:hello "world"}')
    expect(
      printString(
        cljMap([
          [cljKeyword(':hello'), cljString('world')],
          [cljKeyword(':foo'), cljString('bar')],
        ])
      )
    ).toBe('{:hello "world" :foo "bar"}')
  })

  it('should print functions', () => {
    expect(
      printString(
        cljFunction(
          [cljSymbol('x'), cljSymbol('y')],
          [cljList([cljSymbol('+'), cljSymbol('x'), cljSymbol('y')])],
          makeEnv()
        )
      )
    ).toBe('(fn [x y] (+ x y))')
  })

  it.each([
    ['simple number', '1', cljNumber(1)],
    ['simple string', '"hello"', cljString('hello')],
    ['simple boolean', 'true', cljBoolean(true)],
    ['simple keyword', ':hello', cljKeyword(':hello')],
    ['simple symbol', 'hello', cljSymbol('hello')],
    [
      'simple list',
      '(1 2 3)',
      cljList([cljNumber(1), cljNumber(2), cljNumber(3)]),
    ],
    [
      'simple vector',
      '[1 2 3]',
      cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
    ],
    [
      'simple map',
      '{:hello "world"}',
      cljMap([[cljKeyword(':hello'), cljString('world')]]),
    ],
    [
      'nested lists and vectors',
      '(show [1 2 (compute 3 4)])',
      cljList([
        cljSymbol('show'),
        cljVector([
          cljNumber(1),
          cljNumber(2),
          cljList([cljSymbol('compute'), cljNumber(3), cljNumber(4)]),
        ]),
      ]),
    ],
    [
      'a string with inner quotes',
      '"hello \\"world\\""',
      cljString('hello "world"'),
    ],
  ])(
    'should make a full roundtrip and print the same value as the input: %s',
    (_description, input, expected) => {
      const tokenized = tokenize(input)
      const parsed = parseForms(tokenized)
      expect(parsed).toEqual([expected])

      expect(printString(parsed[0])).toBe(input)
    }
  )
})
