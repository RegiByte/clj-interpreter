import { describe, it, expect } from 'vitest'
import { readForms } from '../reader'
import { printString, readString } from '../index'
import {
  cljBoolean,
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
import { ReaderError } from '../errors'

describe('reader', () => {
  it.each([
    ['list', '()', cljList([])],
    ['vector', '[]', cljVector([])],
    ['map', '{}', cljMap([])],
  ])('should read empty collections', (_description, input, expected) => {
    const result = readForms(tokenize(input))
    expect(result).toEqual([expected])
  })

  it('should read a list with one element', () => {
    const input = '(1)'
    const result = readForms(tokenize(input))
    expect(result).toEqual([cljList([cljNumber(1)])])
  })

  it('should read a list with multiple elements', () => {
    const input = '(1 2 3)'
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      cljList([cljNumber(1), cljNumber(2), cljNumber(3)]),
    ])
  })

  it('should read a vector with one element', () => {
    const input = '[1]'
    const result = readForms(tokenize(input))
    expect(result).toEqual([cljVector([cljNumber(1)])])
  })

  it('should read a vector with multiple elements', () => {
    const input = '[1 2 3]'
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
    ])
  })

  it('should read a map with two entry', () => {
    const input = '{:key 1 :another-key 2}'
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      cljMap([
        [cljKeyword(':key'), cljNumber(1)],
        [cljKeyword(':another-key'), cljNumber(2)],
      ]),
    ])
  })

  it.each([
    ['read a number', '1', cljNumber(1)],
    ['read a string', '"hello"', cljString('hello')],
    ['read a boolean', 'true', cljBoolean(true)],
    ['read a boolean', 'false', cljBoolean(false)],
    ['read a nil', 'nil', cljNil()],
    ['read a keyword', ':key', cljKeyword(':key')],
    [
      'read a vector',
      '[1 2 3]',
      cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
    ],
    [
      'read a list',
      '(1 2 3)',
      cljList([cljNumber(1), cljNumber(2), cljNumber(3)]),
    ],
    [
      'read a map',
      '{:key 1 :another-key 2}',
      cljMap([
        [cljKeyword(':key'), cljNumber(1)],
        [cljKeyword(':another-key'), cljNumber(2)],
      ]),
    ],
    [
      'read a list with multiple data types',
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
    const result = readForms(tokenize(input))
    expect(result).toEqual([expected])
  })

  it('should read nested lists', () => {
    const input = '((1 2 3) (4 5 6))'
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      cljList([
        cljList([cljNumber(1), cljNumber(2), cljNumber(3)]),
        cljList([cljNumber(4), cljNumber(5), cljNumber(6)]),
      ]),
    ])
  })

  it('should read nested vectors', () => {
    const input = '[[1 2 3] [4 5 6]]'
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      cljVector([
        cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
        cljVector([cljNumber(4), cljNumber(5), cljNumber(6)]),
      ]),
    ])
  })

  it('should read nested maps', () => {
    const input = '{:foo {:bar {:baz 1}}}'
    const result = readForms(tokenize(input))
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

  it('should read special values as map keys', () => {
    const input = '{:foo/bar 1 :foo/baz 2}'
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      cljMap([
        [cljKeyword(':foo/bar'), cljNumber(1)],
        [cljKeyword(':foo/baz'), cljNumber(2)],
      ]),
    ])

    const input2 = '{[1 2 3] "nice!"}'
    const result2 = readForms(tokenize(input2))
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
      const result = readForms(tokenize(input))
      console.log('%o', result)
    }).toThrow(ReaderError)
  })

  it.each([
    ['parentheses', ')', '('],
    ['brackets', ']', '['],
    ['braces', '}', '{'],
  ])('should throw on unexpected closing token: %s', (_description, input) => {
    expect(() => {
      const result = readForms(tokenize(input))
      console.log('%o', result)
    }).toThrow(ReaderError)
  })

  it.each([
    ['boolean-true', 'true', cljBoolean(true)],
    ['boolean-false', 'false', cljBoolean(false)],
    ['nil', 'nil', cljNil()],
    ['generic symbol', 'another-symbol!', cljSymbol('another-symbol!')],
  ])('should read special symbols', (_description, input, expected) => {
    const result = readForms(tokenize(input))
    expect(result).toEqual([expected])
  })

  it('should read quote', () => {
    const input = "'(1 2 3)"
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      cljList([
        cljSymbol('quote'),
        cljList([cljNumber(1), cljNumber(2), cljNumber(3)]),
      ]),
    ])
  })

  it('should read a quote within a list', () => {
    const input = "(read-doc 'some-doc)"
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      cljList([
        cljSymbol('read-doc'),
        cljList([cljSymbol('quote'), cljSymbol('some-doc')]),
      ]),
    ])
  })

  it('should read multiple top level forms', () => {
    const input = '(def foo "bar") (println "hello")'
    const result = readForms(tokenize(input))
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
  ])('should read deep nesting of forms', (_description, input, expected) => {
    const result = readForms(tokenize(input))
    expect(result).toEqual([expected])
  })

  it('should read input with comments', () => {
    const input = '(+ 1 ; comment!\n 2)'
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      cljList([cljSymbol('+'), cljNumber(1), cljNumber(2)]),
    ])
  })

  it('should throw on unbalanced map entries', () => {
    const input = '; hi there\n {:foo 1 :bar}'
    expect(() => {
      readForms(tokenize(input))
    }).toThrow(ReaderError)
  })

  it('should read a map with comments inside it', () => {
    const input = '{:foo 1 ; comment!\n :bar 2}'
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      cljMap([
        [cljKeyword(':foo'), cljNumber(1)],
        [cljKeyword(':bar'), cljNumber(2)],
      ]),
    ])
  })

  it('should read quasiquote', () => {
    const input = '`(1 2 3)'
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      cljList([
        cljSymbol('quasiquote'),
        cljList([cljNumber(1), cljNumber(2), cljNumber(3)]),
      ]),
    ])
  })

  it('should read unquote', () => {
    const input = '~(1 2 3)'
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      cljList([
        cljSymbol('unquote'),
        cljList([cljNumber(1), cljNumber(2), cljNumber(3)]),
      ]),
    ])
  })

  it('should read unquote splicing', () => {
    const input = '~@(1 2 3)'
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      cljList([
        cljSymbol('unquote-splicing'),
        cljList([cljNumber(1), cljNumber(2), cljNumber(3)]),
      ]),
    ])
  })

  describe('anonymous function reader macro #(...)', () => {
    it('should expand #(* 2 %) to (fn [p1] (* 2 p1))', () => {
      const result = readForms(tokenize('#(* 2 %)'))
      expect(result).toEqual([
        cljList([
          cljSymbol('fn'),
          cljVector([cljSymbol('p1')]),
          cljList([cljSymbol('*'), cljNumber(2), cljSymbol('p1')]),
        ]),
      ])
    })

    it('should expand #(+ %1 %2) to (fn [p1 p2] (+ p1 p2))', () => {
      const result = readForms(tokenize('#(+ %1 %2)'))
      expect(result).toEqual([
        cljList([
          cljSymbol('fn'),
          cljVector([cljSymbol('p1'), cljSymbol('p2')]),
          cljList([cljSymbol('+'), cljSymbol('p1'), cljSymbol('p2')]),
        ]),
      ])
    })

    it('should treat % and %1 as the same param', () => {
      const result = readForms(tokenize('#(str % %1)'))
      expect(result).toEqual([
        cljList([
          cljSymbol('fn'),
          cljVector([cljSymbol('p1')]),
          cljList([cljSymbol('str'), cljSymbol('p1'), cljSymbol('p1')]),
        ]),
      ])
    })

    it('should expand #(apply + %&) to (fn [& rest] (apply + rest))', () => {
      const result = readForms(tokenize('#(apply + %&)'))
      expect(result).toEqual([
        cljList([
          cljSymbol('fn'),
          cljVector([cljSymbol('&'), cljSymbol('rest')]),
          cljList([cljSymbol('apply'), cljSymbol('+'), cljSymbol('rest')]),
        ]),
      ])
    })

    it('should expand #(str %1 "-" %2 %&) with fixed and rest params', () => {
      const result = readForms(tokenize('#(str %1 "-" %2 %&)'))
      expect(result).toEqual([
        cljList([
          cljSymbol('fn'),
          cljVector([
            cljSymbol('p1'),
            cljSymbol('p2'),
            cljSymbol('&'),
            cljSymbol('rest'),
          ]),
          cljList([
            cljSymbol('str'),
            cljSymbol('p1'),
            cljString('-'),
            cljSymbol('p2'),
            cljSymbol('rest'),
          ]),
        ]),
      ])
    })

    it('should expand zero-param #(println "hi") to (fn [] (println "hi"))', () => {
      const result = readForms(tokenize('#(println "hi")'))
      expect(result).toEqual([
        cljList([
          cljSymbol('fn'),
          cljVector([]),
          cljList([cljSymbol('println'), cljString('hi')]),
        ]),
      ])
    })

    it('should infer arity from highest %N index', () => {
      const result = readForms(tokenize('#(+ %3 %1)'))
      expect(result).toEqual([
        cljList([
          cljSymbol('fn'),
          cljVector([cljSymbol('p1'), cljSymbol('p2'), cljSymbol('p3')]),
          cljList([cljSymbol('+'), cljSymbol('p3'), cljSymbol('p1')]),
        ]),
      ])
    })

    it('should throw on nested anonymous functions', () => {
      expect(() => readForms(tokenize('#(#(+ % %))'))).toThrow(ReaderError)
    })

    it('should throw on unmatched #(...)', () => {
      expect(() => readForms(tokenize('#(+ 1 2'))).toThrow(ReaderError)
    })
  })

  describe('auto-qualified keywords (::)', () => {
    it('expands ::foo to :user/foo using default namespace', () => {
      const result = readForms(tokenize('::foo'))
      expect(result).toEqual([cljKeyword(':user/foo')])
    })

    it('expands ::foo to :my.ns/foo when currentNs is provided', () => {
      const result = readForms(tokenize('::foo'), 'my.ns')
      expect(result).toEqual([cljKeyword(':my.ns/foo')])
    })

    it('expands ::some-key with hyphens correctly', () => {
      const result = readForms(tokenize('::some-key'), 'app.domain')
      expect(result).toEqual([cljKeyword(':app.domain/some-key')])
    })

    it('does not modify regular qualified keyword :ns/foo', () => {
      const result = readForms(tokenize(':ns/foo'), 'user')
      expect(result).toEqual([cljKeyword(':ns/foo')])
    })

    it('does not modify unqualified keyword :foo', () => {
      const result = readForms(tokenize(':foo'), 'user')
      expect(result).toEqual([cljKeyword(':foo')])
    })

    it('expands ::foo inside a map', () => {
      const result = readForms(tokenize('{::foo 1}'), 'user')
      expect(result).toEqual([
        cljMap([[cljKeyword(':user/foo'), cljNumber(1)]]),
      ])
    })

    it('throws ReaderError for ::alias/foo when no alias map is provided', () => {
      expect(() => readForms(tokenize('::ns/foo'), 'user')).toThrow(ReaderError)
    })

    it('throws ReaderError for ::alias/foo when alias is not in the map', () => {
      const aliases = new Map([['other', 'some.ns']])
      expect(() =>
        readForms(tokenize('::unknown/foo'), 'user', aliases)
      ).toThrow(ReaderError)
    })

    it('expands ::alias/foo to :full.ns/foo when alias map is provided', () => {
      const aliases = new Map([['m', 'my.math']])
      const result = readForms(tokenize('::m/pi'), 'user', aliases)
      expect(result).toEqual([cljKeyword(':my.math/pi')])
    })

    it('expands ::alias/foo with a dotted namespace', () => {
      const aliases = new Map([['utils', 'app.core.utils']])
      const result = readForms(tokenize('::utils/helper'), 'app.main', aliases)
      expect(result).toEqual([cljKeyword(':app.core.utils/helper')])
    })

    it('resolves multiple different aliases in the same source', () => {
      const aliases = new Map([
        ['a', 'ns.alpha'],
        ['b', 'ns.beta'],
      ])
      const result = readForms(tokenize('[::a/x ::b/y]'), 'user', aliases)
      expect(result).toEqual([
        cljVector([cljKeyword(':ns.alpha/x'), cljKeyword(':ns.beta/y')]),
      ])
    })

    it('expands ::alias/foo inside a map literal', () => {
      const aliases = new Map([['s', 'my.schema']])
      const result = readForms(tokenize('{::s/name "Alice"}'), 'user', aliases)
      expect(result).toEqual([
        cljMap([[cljKeyword(':my.schema/name'), cljString('Alice')]]),
      ])
    })
  })

  describe('deref reader macro (@)', () => {
    it('@a expands to (deref a)', () => {
      const result = readForms(tokenize('@a'))
      expect(result).toEqual([cljList([cljSymbol('deref'), cljSymbol('a')])])
    })

    it('@@a expands to (deref (deref a)) — chained deref', () => {
      const result = readForms(tokenize('@@a'))
      expect(result).toEqual([
        cljList([
          cljSymbol('deref'),
          cljList([cljSymbol('deref'), cljSymbol('a')]),
        ]),
      ])
    })

    it('@(+ 1 2) expands to (deref (+ 1 2))', () => {
      const result = readForms(tokenize('@(+ 1 2)'))
      expect(result).toEqual([
        cljList([
          cljSymbol('deref'),
          cljList([cljSymbol('+'), cljNumber(1), cljNumber(2)]),
        ]),
      ])
    })

    it('@[1 2 3] expands to (deref [1 2 3])', () => {
      const result = readForms(tokenize('@[1 2 3]'))
      expect(result).toEqual([
        cljList([
          cljSymbol('deref'),
          cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
        ]),
      ])
    })
  })
})

// ---------------------------------------------------------------------------
// readString
// ---------------------------------------------------------------------------

describe('readString', () => {
  it('reads a number', () => {
    expect(readString('42')).toEqual(cljNumber(42))
  })

  it('reads a negative number', () => {
    expect(readString('-7')).toEqual(cljNumber(-7))
  })

  it('reads a string', () => {
    expect(readString('"hello"')).toEqual(cljString('hello'))
  })

  it('reads a keyword', () => {
    expect(readString(':done')).toEqual(cljKeyword(':done'))
  })

  it('reads nil', () => {
    expect(readString('nil')).toEqual(cljNil())
  })

  it('reads true / false', () => {
    expect(readString('true')).toEqual(cljBoolean(true))
    expect(readString('false')).toEqual(cljBoolean(false))
  })

  it('reads a vector', () => {
    expect(readString('[1 2 3]')).toEqual(
      cljVector([cljNumber(1), cljNumber(2), cljNumber(3)])
    )
  })

  it('reads a map', () => {
    expect(readString('{:a 1}')).toEqual(
      cljMap([[cljKeyword(':a'), cljNumber(1)]])
    )
  })

  it('reads a list', () => {
    expect(readString('(+ 1 2)')).toEqual(
      cljList([cljSymbol('+'), cljNumber(1), cljNumber(2)])
    )
  })

  it('returns only the first form when source contains multiple', () => {
    expect(readString('1 2 3')).toEqual(cljNumber(1))
  })

  it('throws on empty input', () => {
    expect(() => readString('')).toThrow('readString: empty input')
  })

  it('round-trips with printString for non-string values', () => {
    const cases = ['42', ':keyword', 'nil', 'true', '[1 2 3]', '{:a 1}']
    for (const src of cases) {
      expect(printString(readString(src))).toBe(src)
    }
  })
})
