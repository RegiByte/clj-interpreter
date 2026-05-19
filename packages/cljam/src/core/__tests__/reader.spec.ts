import { describe, it, expect } from 'vitest'
import { readForms, readFormsEdn } from '../reader'
import { printString, readString } from '../index'
import { v } from '../factories'
import { tokenize } from '../tokenizer'
import { ReaderError } from '../errors'
import type { CljValue } from '../types'

describe('reader', () => {
  it.each([
    ['list', '()', v.list([])],
    ['vector', '[]', v.vector([])],
    ['map', '{}', v.map([])],
  ])('should read empty collections', (_description, input, expected) => {
    const result = readForms(tokenize(input))
    expect(result).toEqual([expected])
  })

  it('should read a list with one element', () => {
    const input = '(1)'
    const result = readForms(tokenize(input))
    expect(result).toEqual([v.list([v.number(1)])])
  })

  it('should read a list with multiple elements', () => {
    const input = '(1 2 3)'
    const result = readForms(tokenize(input))
    expect(result).toEqual([v.list([v.number(1), v.number(2), v.number(3)])])
  })

  it('should read a vector with one element', () => {
    const input = '[1]'
    const result = readForms(tokenize(input))
    expect(result).toEqual([v.vector([v.number(1)])])
  })

  it('should read a vector with multiple elements', () => {
    const input = '[1 2 3]'
    const result = readForms(tokenize(input))
    expect(result).toEqual([v.vector([v.number(1), v.number(2), v.number(3)])])
  })

  it('should read a map with two entry', () => {
    const input = '{:key 1 :another-key 2}'
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      v.map([
        [v.keyword(':key'), v.number(1)],
        [v.keyword(':another-key'), v.number(2)],
      ]),
    ])
  })

  it.each([
    ['read a number', '1', v.number(1)],
    ['read a string', '"hello"', v.string('hello')],
    ['read a boolean', 'true', v.boolean(true)],
    ['read a boolean', 'false', v.boolean(false)],
    ['read a nil', 'nil', v.nil()],
    ['read a keyword', ':key', v.keyword(':key')],
    [
      'read a vector',
      '[1 2 3]',
      v.vector([v.number(1), v.number(2), v.number(3)]),
    ],
    ['read a list', '(1 2 3)', v.list([v.number(1), v.number(2), v.number(3)])],
    [
      'read a map',
      '{:key 1 :another-key 2}',
      v.map([
        [v.keyword(':key'), v.number(1)],
        [v.keyword(':another-key'), v.number(2)],
      ]),
    ],
    [
      'read a list with multiple data types',
      '(1 "hello" true false nil :key [1 2 3])',
      v.list([
        v.number(1),
        v.string('hello'),
        v.boolean(true),
        v.boolean(false),
        v.nil(),
        v.keyword(':key'),
        v.vector([v.number(1), v.number(2), v.number(3)]),
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
      v.list([
        v.list([v.number(1), v.number(2), v.number(3)]),
        v.list([v.number(4), v.number(5), v.number(6)]),
      ]),
    ])
  })

  it('should read nested vectors', () => {
    const input = '[[1 2 3] [4 5 6]]'
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      v.vector([
        v.vector([v.number(1), v.number(2), v.number(3)]),
        v.vector([v.number(4), v.number(5), v.number(6)]),
      ]),
    ])
  })

  it('should read nested maps', () => {
    const input = '{:foo {:bar {:baz 1}}}'
    const result = readForms(tokenize(input))
    expect(result).toMatchObject([
      v.map([
        [
          v.keyword(':foo'),
          v.map([
            [v.keyword(':bar'), v.map([[v.keyword(':baz'), v.number(1)]])],
          ]),
        ],
      ]),
    ])
  })

  it('should read special values as map keys', () => {
    const input = '{:foo/bar 1 :foo/baz 2}'
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      v.map([
        [v.keyword(':foo/bar'), v.number(1)],
        [v.keyword(':foo/baz'), v.number(2)],
      ]),
    ])

    const input2 = '{[1 2 3] "nice!"}'
    const result2 = readForms(tokenize(input2))
    expect(result2).toEqual([
      v.map([
        [v.vector([v.number(1), v.number(2), v.number(3)]), v.string('nice!')],
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
    ['boolean-true', 'true', v.boolean(true)],
    ['boolean-false', 'false', v.boolean(false)],
    ['nil', 'nil', v.nil()],
    ['generic symbol', 'another-symbol!', v.symbol('another-symbol!')],
    ['primed symbol', "a'", v.symbol("a'")],
    ['double-primed symbol', "a''", v.symbol("a''")],
  ])('should read special symbols', (_description, input, expected) => {
    const result = readForms(tokenize(input))
    expect(result).toEqual([expected])
  })

  it("should read primed symbols in let bindings", () => {
    // This is the idiom from the jank test suite: a' b' as "primed" variable names
    const result = readForms(tokenize("(let [a' 42 b' 99] [a' b'])"))
    expect(result).toEqual([
      v.list([
        v.symbol('let'),
        v.vector([v.symbol("a'"), v.number(42), v.symbol("b'"), v.number(99)]),
        v.vector([v.symbol("a'"), v.symbol("b'")]),
      ]),
    ])
  })

  it("should not confuse leading quote with trailing prime in symbol", () => {
    // 'a' should be (quote a'), not (quote a) followed by a stray quote
    const result = readForms(tokenize("'a'"))
    expect(result).toEqual([
      v.list([v.symbol('quote'), v.symbol("a'")]),
    ])
  })

  it('should read quote', () => {
    const input = "'(1 2 3)"
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      v.list([
        v.symbol('quote'),
        v.list([v.number(1), v.number(2), v.number(3)]),
      ]),
    ])
  })

  it('should read a quote within a list', () => {
    const input = "(read-doc 'some-doc)"
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      v.list([
        v.symbol('read-doc'),
        v.list([v.symbol('quote'), v.symbol('some-doc')]),
      ]),
    ])
  })

  it('should read multiple top level forms', () => {
    const input = '(def foo "bar") (println "hello")'
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      v.list([v.symbol('def'), v.symbol('foo'), v.string('bar')]),
      v.list([v.symbol('println'), v.string('hello')]),
    ])
  })

  it.each([
    ['nested lists 1', '((1))', v.list([v.list([v.number(1)])])],
    [
      'nested lists 2',
      '((((123 "hi there!!!"))))',
      v.list([
        v.list([v.list([v.list([v.number(123), v.string('hi there!!!')])])]),
      ]),
    ],
    [
      'nested vectors',
      '[[[1 2 3]]]',
      v.vector([v.vector([v.vector([v.number(1), v.number(2), v.number(3)])])]),
    ],
    [
      'nested maps',
      '{:foo {:bar {:baz 1}}}',
      v.map([
        [
          v.keyword(':foo'),
          v.map([
            [v.keyword(':bar'), v.map([[v.keyword(':baz'), v.number(1)]])],
          ]),
        ],
      ]),
    ],
    [
      'mixed nesting',
      '(nice [1 2 {:foo :bar "bla" (1 2 3)}])',
      v.list([
        v.symbol('nice'),
        v.vector([
          v.number(1),
          v.number(2),
          v.map([
            [v.keyword(':foo'), v.keyword(':bar')],
            [v.string('bla'), v.list([v.number(1), v.number(2), v.number(3)])],
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
    expect(result).toEqual([v.list([v.symbol('+'), v.number(1), v.number(2)])])
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
      v.map([
        [v.keyword(':foo'), v.number(1)],
        [v.keyword(':bar'), v.number(2)],
      ]),
    ])
  })

  it('should read quasiquote', () => {
    const input = '`(1 2 3)'
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      v.list([
        v.symbol('quasiquote'),
        v.list([v.number(1), v.number(2), v.number(3)]),
      ]),
    ])
  })

  it('should read unquote', () => {
    const input = '~(1 2 3)'
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      v.list([
        v.symbol('unquote'),
        v.list([v.number(1), v.number(2), v.number(3)]),
      ]),
    ])
  })

  it('should read unquote splicing', () => {
    const input = '~@(1 2 3)'
    const result = readForms(tokenize(input))
    expect(result).toEqual([
      v.list([
        v.symbol('unquote-splicing'),
        v.list([v.number(1), v.number(2), v.number(3)]),
      ]),
    ])
  })

  describe('anonymous function reader macro #(...)', () => {
    it('should expand #(* 2 %) to (fn [p1] (* 2 p1))', () => {
      const result = readForms(tokenize('#(* 2 %)'))
      expect(result).toEqual([
        v.list([
          v.symbol('fn'),
          v.vector([v.symbol('p1')]),
          v.list([v.symbol('*'), v.number(2), v.symbol('p1')]),
        ]),
      ])
    })

    it('should expand #(+ %1 %2) to (fn [p1 p2] (+ p1 p2))', () => {
      const result = readForms(tokenize('#(+ %1 %2)'))
      expect(result).toEqual([
        v.list([
          v.symbol('fn'),
          v.vector([v.symbol('p1'), v.symbol('p2')]),
          v.list([v.symbol('+'), v.symbol('p1'), v.symbol('p2')]),
        ]),
      ])
    })

    it('should treat % and %1 as the same param', () => {
      const result = readForms(tokenize('#(str % %1)'))
      expect(result).toEqual([
        v.list([
          v.symbol('fn'),
          v.vector([v.symbol('p1')]),
          v.list([v.symbol('str'), v.symbol('p1'), v.symbol('p1')]),
        ]),
      ])
    })

    it('should expand #(apply + %&) to (fn [& rest] (apply + rest))', () => {
      const result = readForms(tokenize('#(apply + %&)'))
      expect(result).toEqual([
        v.list([
          v.symbol('fn'),
          v.vector([v.symbol('&'), v.symbol('rest')]),
          v.list([v.symbol('apply'), v.symbol('+'), v.symbol('rest')]),
        ]),
      ])
    })

    it('should expand #(str %1 "-" %2 %&) with fixed and rest params', () => {
      const result = readForms(tokenize('#(str %1 "-" %2 %&)'))
      expect(result).toEqual([
        v.list([
          v.symbol('fn'),
          v.vector([
            v.symbol('p1'),
            v.symbol('p2'),
            v.symbol('&'),
            v.symbol('rest'),
          ]),
          v.list([
            v.symbol('str'),
            v.symbol('p1'),
            v.string('-'),
            v.symbol('p2'),
            v.symbol('rest'),
          ]),
        ]),
      ])
    })

    it('should expand zero-param #(println "hi") to (fn [] (println "hi"))', () => {
      const result = readForms(tokenize('#(println "hi")'))
      expect(result).toEqual([
        v.list([
          v.symbol('fn'),
          v.vector([]),
          v.list([v.symbol('println'), v.string('hi')]),
        ]),
      ])
    })

    it('should infer arity from highest %N index', () => {
      const result = readForms(tokenize('#(+ %3 %1)'))
      expect(result).toEqual([
        v.list([
          v.symbol('fn'),
          v.vector([v.symbol('p1'), v.symbol('p2'), v.symbol('p3')]),
          v.list([v.symbol('+'), v.symbol('p3'), v.symbol('p1')]),
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
      expect(result).toEqual([v.keyword(':user/foo')])
    })

    it('expands ::foo to :my.ns/foo when currentNs is provided', () => {
      const result = readForms(tokenize('::foo'), 'my.ns')
      expect(result).toEqual([v.keyword(':my.ns/foo')])
    })

    it('expands ::some-key with hyphens correctly', () => {
      const result = readForms(tokenize('::some-key'), 'app.domain')
      expect(result).toEqual([v.keyword(':app.domain/some-key')])
    })

    it('does not modify regular qualified keyword :ns/foo', () => {
      const result = readForms(tokenize(':ns/foo'), 'user')
      expect(result).toEqual([v.keyword(':ns/foo')])
    })

    it('does not modify unqualified keyword :foo', () => {
      const result = readForms(tokenize(':foo'), 'user')
      expect(result).toEqual([v.keyword(':foo')])
    })

    it('expands ::foo inside a map', () => {
      const result = readForms(tokenize('{::foo 1}'), 'user')
      expect(result).toEqual([v.map([[v.keyword(':user/foo'), v.number(1)]])])
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
      expect(result).toEqual([v.keyword(':my.math/pi')])
    })

    it('expands ::alias/foo with a dotted namespace', () => {
      const aliases = new Map([['utils', 'app.core.utils']])
      const result = readForms(tokenize('::utils/helper'), 'app.main', aliases)
      expect(result).toEqual([v.keyword(':app.core.utils/helper')])
    })

    it('resolves multiple different aliases in the same source', () => {
      const aliases = new Map([
        ['a', 'ns.alpha'],
        ['b', 'ns.beta'],
      ])
      const result = readForms(tokenize('[::a/x ::b/y]'), 'user', aliases)
      expect(result).toEqual([
        v.vector([v.keyword(':ns.alpha/x'), v.keyword(':ns.beta/y')]),
      ])
    })

    it('expands ::alias/foo inside a map literal', () => {
      const aliases = new Map([['s', 'my.schema']])
      const result = readForms(tokenize('{::s/name "Alice"}'), 'user', aliases)
      expect(result).toEqual([
        v.map([[v.keyword(':my.schema/name'), v.string('Alice')]]),
      ])
    })
  })

  describe('deref reader macro (@)', () => {
    it('@a expands to (deref a)', () => {
      const result = readForms(tokenize('@a'))
      expect(result).toEqual([v.list([v.symbol('deref'), v.symbol('a')])])
    })

    it('@@a expands to (deref (deref a)) — chained deref', () => {
      const result = readForms(tokenize('@@a'))
      expect(result).toEqual([
        v.list([v.symbol('deref'), v.list([v.symbol('deref'), v.symbol('a')])]),
      ])
    })

    it('@(+ 1 2) expands to (deref (+ 1 2))', () => {
      const result = readForms(tokenize('@(+ 1 2)'))
      expect(result).toEqual([
        v.list([
          v.symbol('deref'),
          v.list([v.symbol('+'), v.number(1), v.number(2)]),
        ]),
      ])
    })

    it('@[1 2 3] expands to (deref [1 2 3])', () => {
      const result = readForms(tokenize('@[1 2 3]'))
      expect(result).toEqual([
        v.list([
          v.symbol('deref'),
          v.vector([v.number(1), v.number(2), v.number(3)]),
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
    expect(readString('42')).toEqual(v.number(42))
  })

  it('reads a negative number', () => {
    expect(readString('-7')).toEqual(v.number(-7))
  })

  it('reads a string', () => {
    expect(readString('"hello"')).toEqual(v.string('hello'))
  })

  it('reads a keyword', () => {
    expect(readString(':done')).toEqual(v.keyword(':done'))
  })

  it('reads nil', () => {
    expect(readString('nil')).toEqual(v.nil())
  })

  it('reads true / false', () => {
    expect(readString('true')).toEqual(v.boolean(true))
    expect(readString('false')).toEqual(v.boolean(false))
  })

  it('reads a vector', () => {
    expect(readString('[1 2 3]')).toEqual(
      v.vector([v.number(1), v.number(2), v.number(3)])
    )
  })

  it('reads a map', () => {
    expect(readString('{:a 1}')).toEqual(
      v.map([[v.keyword(':a'), v.number(1)]])
    )
  })

  it('reads a list', () => {
    expect(readString('(+ 1 2)')).toEqual(
      v.list([v.symbol('+'), v.number(1), v.number(2)])
    )
  })

  it('returns only the first form when source contains multiple', () => {
    expect(readString('1 2 3')).toEqual(v.number(1))
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

  describe('#:ns{...} namespaced map literals', () => {
    function read(
      src: string,
      ns = 'user',
      aliases: Map<string, string> = new Map()
    ) {
      return readForms(tokenize(src), ns, aliases)[0]
    }

    it('qualifies unqualified keys with the explicit namespace', () => {
      expect(read('#:car{:make 1 :model "Toyota"}')).toEqual(
        v.map([
          [v.keyword(':car/make'), v.number(1)],
          [v.keyword(':car/model'), v.string('Toyota')],
        ])
      )
    })

    it('leaves already-qualified keys untouched', () => {
      expect(read('#:car{:car/make 1 :model "Toyota"}')).toEqual(
        v.map([
          [v.keyword(':car/make'), v.number(1)],
          [v.keyword(':car/model'), v.string('Toyota')],
        ])
      )
    })

    it('#:: qualifies with current namespace', () => {
      expect(read('#::{:name "foo" :age 30}', 'my.domain')).toEqual(
        v.map([
          [v.keyword(':my.domain/name'), v.string('foo')],
          [v.keyword(':my.domain/age'), v.number(30)],
        ])
      )
    })

    it('#::alias qualifies with resolved alias', () => {
      const aliases = new Map([['car', 'vehicles.car']])
      expect(read('#::car{:make 1 :model "foo"}', 'user', aliases)).toEqual(
        v.map([
          [v.keyword(':vehicles.car/make'), v.number(1)],
          [v.keyword(':vehicles.car/model'), v.string('foo')],
        ])
      )
    })

    it('handles an empty map', () => {
      expect(read('#:car{}')).toEqual(v.map([]))
    })

    it('handles non-keyword values including nested maps', () => {
      expect(read('#:car{:make "Toyota" :year 2024}')).toEqual(
        v.map([
          [v.keyword(':car/make'), v.string('Toyota')],
          [v.keyword(':car/year'), v.number(2024)],
        ])
      )
    })

    it('throws on unknown alias', () => {
      expect(() => read('#::unknown{:name "foo"}')).toThrow(
        /No namespace alias/
      )
    })

    it('round-trips with printString', () => {
      const form = read('#:car{:make 1 :model "Toyota"}')
      expect(printString(form)).toBe('#:car{:make 1 :model "Toyota"}')
    })
  })
})

// ---------------------------------------------------------------------------
// #_ discard form
// ---------------------------------------------------------------------------

describe('#_ discard form', () => {
  it('top-level single discard returns empty array', () => {
    expect(readForms(tokenize('#_ 1'))).toEqual([])
  })

  it('discards a string literal at top level', () => {
    expect(readForms(tokenize('#_ "ignored"'))).toEqual([])
  })

  it('discards a list form at top level', () => {
    expect(readForms(tokenize('#_ (1 2 3)'))).toEqual([])
  })

  it('discards a vector at top level', () => {
    expect(readForms(tokenize('#_ [1 2 3]'))).toEqual([])
  })

  it('discards a map at top level', () => {
    expect(readForms(tokenize('#_ {:a 1}'))).toEqual([])
  })

  it('multiple independent discards at top level each remove one form', () => {
    const result = readForms(tokenize('#_ 1 #_ 2 3'))
    expect(result).toEqual([v.number(3)])
  })

  it('keeps subsequent forms after the discarded one', () => {
    const result = readForms(tokenize('#_ 1 2 3'))
    expect(result).toEqual([v.number(2), v.number(3)])
  })

  it('stacked #_#_ discards two consecutive forms (JVM Clojure behavior)', () => {
    const result = readForms(tokenize('#_#_ 1 2 3'))
    expect(result).toEqual([v.number(3)])
  })

  it('triple-stacked #_#_#_ discards three forms', () => {
    const result = readForms(tokenize('#_#_#_ 1 2 3 4'))
    expect(result).toEqual([v.number(4)])
  })

  it('#_ inside a vector discards the marked element', () => {
    const result = readForms(tokenize('[1 #_ 2 3]'))
    expect(result).toEqual([v.vector([v.number(1), v.number(3)])])
  })

  it('#_ inside a list discards the marked element', () => {
    const result = readForms(tokenize('(+ 1 #_ 2 3)'))
    expect(result).toEqual([v.list([v.symbol('+'), v.number(1), v.number(3)])])
  })

  it('#_ inside a map discards a key-value pair (removes one form)', () => {
    // In Clojure, #_ inside a map discards one form — key or value.
    // #_ :b discards the :b key, leaving 1 as a value without a key → parse error.
    // Discarding a full pair requires #_#_:
    const result = readForms(tokenize('{:a 1 #_#_ :b 2 :c 3}'))
    expect(result).toEqual([
      v.map([
        [v.keyword(':a'), v.number(1)],
        [v.keyword(':c'), v.number(3)],
      ]),
    ])
  })

  it('stacked #_#_ inside a vector discards two elements', () => {
    const result = readForms(tokenize('[1 #_#_ 2 3 4]'))
    expect(result).toEqual([v.vector([v.number(1), v.number(4)])])
  })

  it('#_ can discard a nested collection', () => {
    const result = readForms(tokenize('[1 #_ {:deep [1 2 3]} 2]'))
    expect(result).toEqual([v.vector([v.number(1), v.number(2)])])
  })

  it('throws when #_ appears at end of input with no following form', () => {
    expect(() => readForms(tokenize('#_'))).toThrow(ReaderError)
  })

  it('throws when #_ appears before closing bracket', () => {
    expect(() => readForms(tokenize('[1 #_]'))).toThrow(ReaderError)
  })

  it('throws when stacked #_#_ has only one following form', () => {
    expect(() => readForms(tokenize('#_#_ 1'))).toThrow(ReaderError)
  })
})

// ---------------------------------------------------------------------------
// readFormsEdn — EDN mode
// ---------------------------------------------------------------------------

describe('readFormsEdn', () => {
  describe('EDN scalars', () => {
    it('reads integers', () => {
      expect(readFormsEdn(tokenize('42'))).toEqual([v.number(42)])
    })

    it('reads floats', () => {
      expect(readFormsEdn(tokenize('3.14'))).toEqual([v.number(3.14)])
    })

    it('reads strings', () => {
      expect(readFormsEdn(tokenize('"hello"'))).toEqual([v.string('hello')])
    })

    it('reads nil', () => {
      expect(readFormsEdn(tokenize('nil'))).toEqual([v.nil()])
    })

    it('reads true/false', () => {
      expect(readFormsEdn(tokenize('true'))).toEqual([v.boolean(true)])
      expect(readFormsEdn(tokenize('false'))).toEqual([v.boolean(false)])
    })

    it('reads plain keywords', () => {
      expect(readFormsEdn(tokenize(':foo'))).toEqual([v.keyword(':foo')])
    })

    it('reads qualified keywords', () => {
      expect(readFormsEdn(tokenize(':ns/foo'))).toEqual([v.keyword(':ns/foo')])
    })

    it('reads symbols', () => {
      expect(readFormsEdn(tokenize('my-sym'))).toEqual([v.symbol('my-sym')])
    })
  })

  describe('EDN collections', () => {
    it('reads vectors', () => {
      expect(readFormsEdn(tokenize('[1 2 3]'))).toEqual([
        v.vector([v.number(1), v.number(2), v.number(3)]),
      ])
    })

    it('reads lists', () => {
      expect(readFormsEdn(tokenize('(1 2 3)'))).toEqual([
        v.list([v.number(1), v.number(2), v.number(3)]),
      ])
    })

    it('reads maps', () => {
      expect(readFormsEdn(tokenize('{:a 1 :b 2}'))).toEqual([
        v.map([
          [v.keyword(':a'), v.number(1)],
          [v.keyword(':b'), v.number(2)],
        ]),
      ])
    })
  })

  describe('#_ discard in EDN mode', () => {
    it('discard works in EDN mode', () => {
      expect(readFormsEdn(tokenize('#_ 1 2'))).toEqual([v.number(2)])
    })

    it('stacked discards work in EDN mode', () => {
      expect(readFormsEdn(tokenize('#_#_ 1 2 3'))).toEqual([v.number(3)])
    })

    it('discard inside a collection works in EDN mode', () => {
      expect(readFormsEdn(tokenize('[1 #_ 2 3]'))).toEqual([
        v.vector([v.number(1), v.number(3)]),
      ])
    })
  })

  describe('EDN rejects Clojure-specific syntax', () => {
    it("rejects quote ('form)", () => {
      expect(() => readFormsEdn(tokenize("'foo"))).toThrow(ReaderError)
    })

    it('rejects quasiquote (`form)', () => {
      expect(() => readFormsEdn(tokenize('`foo'))).toThrow(ReaderError)
    })

    it('rejects unquote (~form)', () => {
      expect(() => readFormsEdn(tokenize('~foo'))).toThrow(ReaderError)
    })

    it('rejects unquote-splicing (~@form)', () => {
      expect(() => readFormsEdn(tokenize('~@foo'))).toThrow(ReaderError)
    })

    it('rejects anonymous function #(...)', () => {
      expect(() => readFormsEdn(tokenize('#(+ 1 2)'))).toThrow(ReaderError)
    })

    it('rejects regex #"..."', () => {
      expect(() => readFormsEdn(tokenize('#"foo"'))).toThrow(ReaderError)
    })

    it('rejects deref (@form)', () => {
      expect(() => readFormsEdn(tokenize('@foo'))).toThrow(ReaderError)
    })

    it("rejects var-quote (#'form)", () => {
      expect(() => readFormsEdn(tokenize("#'foo"))).toThrow(ReaderError)
    })

    it('rejects metadata (^tag form)', () => {
      expect(() => readFormsEdn(tokenize('^{:doc "x"} foo'))).toThrow(
        ReaderError
      )
    })

    it('rejects namespaced map literals (#:ns{...})', () => {
      expect(() => readFormsEdn(tokenize('#:car{:make 1}'))).toThrow(
        ReaderError
      )
    })

    it('rejects auto-qualified keywords (::foo)', () => {
      expect(() => readFormsEdn(tokenize('::foo'))).toThrow(ReaderError)
    })
  })

  describe('reader tags in EDN mode', () => {
    it('reads #inst as a tagged literal (no handler = error without dataReaders)', () => {
      // When no dataReaders provided, unknown tags throw
      expect(() => readFormsEdn(tokenize('#unknown-tag 42'))).toThrow(
        ReaderError
      )
    })

    it('applies a custom reader via dataReaders option', () => {
      const readers = new Map<string, (form: CljValue) => CljValue>([
        [
          'double',
          (form) => {
            if (form.kind !== 'number') throw new Error('Expected number')
            return v.number(form.value * 2)
          },
        ],
      ])
      const result = readFormsEdn(tokenize('#double 21'), {
        dataReaders: readers,
      })
      expect(result).toEqual([v.number(42)])
    })
  })
})
