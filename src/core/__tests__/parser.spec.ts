import { describe, it, expect } from 'vitest'
import { parseForms } from '../parser'
import {
  cljBoolean,
  cljComment,
  cljKeyword,
  cljList,
  cljMap,
  cljNil,
  cljNumber,
  cljString,
  cljSymbol,
  cljVector,
} from '../factories'
import { tokenize } from '../tokenizer'
import { ParserError } from '../parser'

describe('parser', () => {
  it.each([
    ['list', '()', cljList([])],
    ['vector', '[]', cljVector([])],
    ['map', '{}', cljMap([])],
  ])('should parse empty collections', (_description, input, expected) => {
    const result = parseForms(tokenize(input))
    expect(result).toEqual([expected])
  })

  it('should parse a list with one element', () => {
    const input = '(1)'
    const result = parseForms(tokenize(input))
    expect(result).toEqual([cljList([cljNumber(1)])])
  })

  it('should parse a list with multiple elements', () => {
    const input = '(1 2 3)'
    const result = parseForms(tokenize(input))
    expect(result).toEqual([
      cljList([cljNumber(1), cljNumber(2), cljNumber(3)]),
    ])
  })

  it('should parse a vector with one element', () => {
    const input = '[1]'
    const result = parseForms(tokenize(input))
    expect(result).toEqual([cljVector([cljNumber(1)])])
  })

  it('should parse a vector with multiple elements', () => {
    const input = '[1 2 3]'
    const result = parseForms(tokenize(input))
    expect(result).toEqual([
      cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
    ])
  })

  it('should parse a map with two entry', () => {
    const input = '{:key 1 :another-key 2}'
    const result = parseForms(tokenize(input))
    expect(result).toEqual([
      cljMap([
        [cljKeyword(':key'), cljNumber(1)],
        [cljKeyword(':another-key'), cljNumber(2)],
      ]),
    ])
  })

  it.each([
    ['parse a number', '1', cljNumber(1)],
    ['parse a string', '"hello"', cljString('hello')],
    ['parse a boolean', 'true', cljBoolean(true)],
    ['parse a boolean', 'false', cljBoolean(false)],
    ['parse a nil', 'nil', cljNil()],
    ['parse a keyword', ':key', cljKeyword(':key')],
    [
      'parse a vector',
      '[1 2 3]',
      cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
    ],
    [
      'parse a list',
      '(1 2 3)',
      cljList([cljNumber(1), cljNumber(2), cljNumber(3)]),
    ],
    [
      'parse a map',
      '{:key 1 :another-key 2}',
      cljMap([
        [cljKeyword(':key'), cljNumber(1)],
        [cljKeyword(':another-key'), cljNumber(2)],
      ]),
    ],
    [
      'parse a list with multiple data types',
      '(1 "hello" true false nil :key [1 2 3])',
      cljList([
        cljNumber(1),
        cljString('hello'),
        cljBoolean(true),
        cljBoolean(false),
        cljNil(),
        cljKeyword(':key'),
        cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
      ]),
    ],
  ])('primitive data: should %s', (_description, input, expected) => {
    const result = parseForms(tokenize(input))
    expect(result).toEqual([expected])
  })

  it('should parse nested lists', () => {
    const input = '((1 2 3) (4 5 6))'
    const result = parseForms(tokenize(input))
    expect(result).toEqual([
      cljList([
        cljList([cljNumber(1), cljNumber(2), cljNumber(3)]),
        cljList([cljNumber(4), cljNumber(5), cljNumber(6)]),
      ]),
    ])
  })

  it('should parse nested vectors', () => {
    const input = '[[1 2 3] [4 5 6]]'
    const result = parseForms(tokenize(input))
    expect(result).toEqual([
      cljVector([
        cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
        cljVector([cljNumber(4), cljNumber(5), cljNumber(6)]),
      ]),
    ])
  })

  it('should parse nested maps', () => {
    const input = '{:foo {:bar {:baz 1}}}'
    const result = parseForms(tokenize(input))
    expect(result).toMatchObject([
      cljMap([
        [
          cljKeyword(':foo'),
          cljMap([
            [cljKeyword(':bar'), cljMap([[cljKeyword(':baz'), cljNumber(1)]])],
          ]),
        ],
      ]),
    ])
  })

  it('should parse special values as map keys', () => {
    const input = '{:foo/bar 1 :foo/baz 2}'
    const result = parseForms(tokenize(input))
    expect(result).toEqual([
      cljMap([
        [cljKeyword(':foo/bar'), cljNumber(1)],
        [cljKeyword(':foo/baz'), cljNumber(2)],
      ]),
    ])

    const input2 = '{[1 2 3] "nice!"}'
    const result2 = parseForms(tokenize(input2))
    expect(result2).toEqual([
      cljMap([
        [
          cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
          cljString('nice!'),
        ],
      ]),
    ])
  })

  it.each([
    ['parentheses', '(123'],
    ['brackets', '[123'],
    ['braces', '{:foo 1'],
    ['nested parentheses', '((123)'],
    ['nested brackets', '[[123]'],
  ])('should throw on unmatched pairs: %s', (_description, input) => {
    expect(() => {
      const result = parseForms(tokenize(input))
      console.log('%o', result)
    }).toThrow(ParserError)
  })

  it.each([
    ['parentheses', ')', '('],
    ['brackets', ']', '['],
    ['braces', '}', '{'],
  ])('should throw on unexpected closing token: %s', (_description, input) => {
    expect(() => {
      const result = parseForms(tokenize(input))
      console.log('%o', result)
    }).toThrow(ParserError)
  })

  it.each([
    ['boolean-true', 'true', cljBoolean(true)],
    ['boolean-false', 'false', cljBoolean(false)],
    ['nil', 'nil', cljNil()],
    ['generic symbol', 'another-symbol!', cljSymbol('another-symbol!')],
  ])('should parse special symbols', (_description, input, expected) => {
    const result = parseForms(tokenize(input))
    expect(result).toEqual([expected])
  })

  it('should parse quote', () => {
    const input = "'(1 2 3)"
    const result = parseForms(tokenize(input))
    expect(result).toEqual([
      cljList([
        cljSymbol('quote'),
        cljList([cljNumber(1), cljNumber(2), cljNumber(3)]),
      ]),
    ])
  })

  it('should parse a quote within a list', () => {
    const input = "(read-doc 'some-doc)"
    const result = parseForms(tokenize(input))
    expect(result).toEqual([
      cljList([
        cljSymbol('read-doc'),
        cljList([cljSymbol('quote'), cljSymbol('some-doc')]),
      ]),
    ])
  })

  it('should parse multiple top level forms', () => {
    const input = '(def foo "bar") (println "hello")'
    const result = parseForms(tokenize(input))
    expect(result).toEqual([
      cljList([cljSymbol('def'), cljSymbol('foo'), cljString('bar')]),
      cljList([cljSymbol('println'), cljString('hello')]),
    ])
  })

  it.each([
    ['nested lists 1', '((1))', cljList([cljList([cljNumber(1)])])],
    [
      'nested lists 2',
      '((((123 "hi there!!!"))))',
      cljList([
        cljList([
          cljList([cljList([cljNumber(123), cljString('hi there!!!')])]),
        ]),
      ]),
    ],
    [
      'nested vectors',
      '[[[1 2 3]]]',
      cljVector([
        cljVector([cljVector([cljNumber(1), cljNumber(2), cljNumber(3)])]),
      ]),
    ],
    [
      'nested maps',
      '{:foo {:bar {:baz 1}}}',
      cljMap([
        [
          cljKeyword(':foo'),
          cljMap([
            [cljKeyword(':bar'), cljMap([[cljKeyword(':baz'), cljNumber(1)]])],
          ]),
        ],
      ]),
    ],
    [
      'mixed nesting',
      '(nice [1 2 {:foo :bar "bla" (1 2 3)}])',
      cljList([
        cljSymbol('nice'),
        cljVector([
          cljNumber(1),
          cljNumber(2),
          cljMap([
            [cljKeyword(':foo'), cljKeyword(':bar')],
            [
              cljString('bla'),
              cljList([cljNumber(1), cljNumber(2), cljNumber(3)]),
            ],
          ]),
        ]),
      ]),
    ],
  ])('should handle deep nesting of forms', (_description, input, expected) => {
    const result = parseForms(tokenize(input))
    expect(result).toEqual([expected])
  })

  it('should handle input with comments', () => {
    const input = '(+ 1 ; comment!\n 2)'
    const result = parseForms(tokenize(input))
    expect(result).toEqual([
      cljList([
        cljSymbol('+'),
        cljNumber(1),
        // note: comments are stripped during evaluation,
        // but kept on parsed values for tooling support
        cljComment(' comment!'),
        cljNumber(2),
      ]),
    ])
  })

  it('should throw on unbalanced map entries', () => {
    const input = '; hi there\n {:foo 1 :bar}'
    expect(() => {
      parseForms(tokenize(input))
    }).toThrow(ParserError)
  })

  it('should handle a map with comments inside it', () => {
    const input = '{:foo 1 ; comment!\n :bar 2}'
    const result = parseForms(tokenize(input))
    expect(result).toEqual([
      cljMap([
        [cljKeyword(':foo'), cljNumber(1)],
        [cljKeyword(':bar'), cljNumber(2)],
      ]),
    ])
  })
})
