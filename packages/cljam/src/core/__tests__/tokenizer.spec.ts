import { tokenize } from '../tokenizer'
import { TokenizerError } from '../errors'
import { expect, describe, it } from 'vitest'

describe('tokenizer', () => {
  it('should tokenize an empty string', () => {
    const input = ''
    const tokens = tokenize(input)
    expect(tokens).toEqual([])
  })

  it('should tokenize an empty list', () => {
    const input = '()'
    const tokens = tokenize(input)
    expect(tokens).toMatchObject([
      { kind: 'LParen', value: '(' },
      { kind: 'RParen', value: ')' },
    ])
  })

  it('should tokenize a list with a symbol', () => {
    const tokens = tokenize('(foo)')
    expect(tokens).toMatchObject([
      { kind: 'LParen', value: '(' },
      { kind: 'Symbol', value: 'foo' },
      { kind: 'RParen', value: ')' },
    ])
  })

  it('should tokenize a list with a keyword', () => {
    const tokens = tokenize('(:foo)')
    expect(tokens).toMatchObject([
      { kind: 'LParen', value: '(' },
      { kind: 'Keyword', value: ':foo' },
      { kind: 'RParen', value: ')' },
    ])
  })

  it('should tokenize a list with a number', () => {
    const tokens = tokenize('(123)')
    expect(tokens).toMatchObject([
      { kind: 'LParen', value: '(' },
      { kind: 'Number', value: 123 },
      { kind: 'RParen', value: ')' },
    ])
  })

  it('should tokenize a list with a string', () => {
    const tokens = tokenize('("foo")')
    expect(tokens).toMatchObject([
      { kind: 'LParen', value: '(' },
      { kind: 'String', value: 'foo' },
      { kind: 'RParen', value: ')' },
    ])
  })

  it('should tokenize a list with a symbol and params', () => {
    const tokens = tokenize('(foo bar)')
    expect(tokens).toMatchObject([
      { kind: 'LParen', value: '(' },
      { kind: 'Symbol', value: 'foo' },
      { kind: 'Symbol', value: 'bar' },
      { kind: 'RParen', value: ')' },
    ])
  })

  it('should tokenize a list with a symbol and params and a keyword', () => {
    const tokens = tokenize('(foo bar :baz)')
    expect(tokens).toMatchObject([
      { kind: 'LParen', value: '(' },
      { kind: 'Symbol', value: 'foo' },
      { kind: 'Symbol', value: 'bar' },
      { kind: 'Keyword', value: ':baz' },
      { kind: 'RParen', value: ')' },
    ])
  })

  it('should tokenize comment lines', () => {
    const tokens = tokenize(';foo\n;bar\n;baz')
    expect(tokens).toMatchObject([
      { kind: 'Comment', value: 'foo' },
      { kind: 'Comment', value: 'bar' },
      { kind: 'Comment', value: 'baz' },
    ])
  })

  it('should tokenize comments and vectors', () => {
    const tokens = tokenize(`;this is a vector
[1 2 3]`)
    expect(tokens).toMatchObject([
      { kind: 'Comment', value: 'this is a vector' },
      { kind: 'LBracket', value: '[' },
      { kind: 'Number', value: 1 },
      { kind: 'Number', value: 2 },
      { kind: 'Number', value: 3 },
      { kind: 'RBracket', value: ']' },
    ])
  })

  it('should tokenize a map with multiple key-value pairs of different types', () => {
    const tokens = tokenize(`{:foo 1 :bar "baz" :baz true :items [1 2 3]}`)
    expect(tokens).toMatchObject([
      { kind: 'LBrace', value: '{' },
      { kind: 'Keyword', value: ':foo' },
      { kind: 'Number', value: 1 },
      { kind: 'Keyword', value: ':bar' },
      { kind: 'String', value: 'baz' },
      { kind: 'Keyword', value: ':baz' },
      { kind: 'Symbol', value: 'true' },
      { kind: 'Keyword', value: ':items' },
      { kind: 'LBracket', value: '[' },
      { kind: 'Number', value: 1 },
      { kind: 'Number', value: 2 },
      { kind: 'Number', value: 3 },
      { kind: 'RBracket', value: ']' },
      { kind: 'RBrace', value: '}' },
    ])
  })

  it('should interpret newline as whitespace', () => {
    const tokens = tokenize(`(foo\nbar)`)
    expect(tokens).toMatchObject([
      { kind: 'LParen', value: '(' },
      { kind: 'Symbol', value: 'foo' },
      { kind: 'Symbol', value: 'bar' },
      { kind: 'RParen', value: ')' },
    ])

    const tokens2 = tokenize(`(foo)\n(bar)`)
    expect(tokens2).toMatchObject([
      { kind: 'LParen', value: '(' },
      { kind: 'Symbol', value: 'foo' },
      { kind: 'RParen', value: ')' },
      { kind: 'LParen', value: '(' },
      { kind: 'Symbol', value: 'bar' },
      { kind: 'RParen', value: ')' },
    ])
  })

  it('should tokenize string escape sequences', () => {
    const tokens = tokenize('hello "world"')
    expect(tokens).toMatchObject([
      { kind: 'Symbol', value: 'hello' },
      { kind: 'String', value: 'world' },
    ])
  })

  it('should support trailing whitespaces', () => {
    const tokens = tokenize('(+ 1 2) ')
    expect(tokens).toMatchObject([
      { kind: 'LParen', value: '(' },
      { kind: 'Symbol', value: '+' },
      { kind: 'Number', value: 1 },
      { kind: 'Number', value: 2 },
      { kind: 'RParen', value: ')' },
    ])
  })

  it('should parse numbers with decimals', () => {
    const tokens = tokenize('1.23')
    expect(tokens).toMatchObject([{ kind: 'Number', value: 1.23 }])
  })

  it('should parse negative numbers', () => {
    const tokens = tokenize('-1.23')
    expect(tokens).toMatchObject([{ kind: 'Number', value: -1.23 }])
  })

  describe('scientific notation', () => {
    it('parses integer mantissa with positive exponent: 1e10', () => {
      const tokens = tokenize('1e10')
      expect(tokens).toMatchObject([{ kind: 'Number', value: 1e10 }])
    })

    it('parses uppercase E: 1E10', () => {
      const tokens = tokenize('1E10')
      expect(tokens).toMatchObject([{ kind: 'Number', value: 1e10 }])
    })

    it('parses explicit + sign in exponent: 1e+10', () => {
      const tokens = tokenize('1e+10')
      expect(tokens).toMatchObject([{ kind: 'Number', value: 1e10 }])
    })

    it('parses negative exponent: 1e-10', () => {
      const tokens = tokenize('1e-10')
      expect(tokens).toMatchObject([{ kind: 'Number', value: 1e-10 }])
    })

    it('parses decimal mantissa: 1.5e+32', () => {
      const tokens = tokenize('1.5e+32')
      expect(tokens).toMatchObject([{ kind: 'Number', value: 1.5e32 }])
    })

    it('parses the factorial(30) output: 2.652528598121911e+32', () => {
      const tokens = tokenize('2.652528598121911e+32')
      expect(tokens).toMatchObject([
        { kind: 'Number', value: 2.652528598121911e32 },
      ])
    })

    it('parses negative mantissa with exponent: -3.14e-2', () => {
      const tokens = tokenize('-3.14e-2')
      expect(tokens).toMatchObject([{ kind: 'Number', value: -3.14e-2 }])
    })

    it('parses scientific notation inside a vector', () => {
      const tokens = tokenize('[1 2 3e5]')
      expect(tokens).toMatchObject([
        { kind: 'LBracket' },
        { kind: 'Number', value: 1 },
        { kind: 'Number', value: 2 },
        { kind: 'Number', value: 3e5 },
        { kind: 'RBracket' },
      ])
    })

    it('throws on bare e with no exponent digits: 1e', () => {
      expect(() => tokenize('1e')).toThrow(TokenizerError)
    })

    it('throws on e with sign but no exponent digits: 1e+', () => {
      expect(() => tokenize('1e+')).toThrow(TokenizerError)
    })
  })

  it('should reject malformed number with double dots', () => {
    expect(() => tokenize('1..2')).toThrow(TokenizerError)
  })

  it('should reject malformed number with multiple decimal points', () => {
    expect(() => tokenize('1.2.3')).toThrow(TokenizerError)
  })

  it('should reject number with trailing dot', () => {
    expect(() => tokenize('(1. 2)')).toThrow(TokenizerError)
  })

  it.each([
    ['"foo\nbar"', 'foo\nbar'],
    [
      `"foo
bar"`,
      'foo\nbar',
    ],
  ])('should parse multiline strings', (input, expected) => {
    const tokens = tokenize(input)
    expect(tokens).toMatchObject([{ kind: 'String', value: expected }])
  })

  it('should throw an error for unterminated strings', () => {
    expect(() => tokenize('(show "hello)')).toThrow(TokenizerError)
  })

  it('should parse code with quasiquote', () => {
    const tokens = tokenize('`(1 2 3)')
    expect(tokens).toMatchObject([
      { kind: 'Quasiquote', value: 'quasiquote' },
      { kind: 'LParen', value: '(' },
      { kind: 'Number', value: 1 },
      { kind: 'Number', value: 2 },
      { kind: 'Number', value: 3 },
      { kind: 'RParen', value: ')' },
    ])
  })

  it('should parse code with unquote', () => {
    const tokens = tokenize('`(1 2 ~3.12)')
    expect(tokens).toMatchObject([
      { kind: 'Quasiquote', value: 'quasiquote' },
      { kind: 'LParen', value: '(' },
      { kind: 'Number', value: 1 },
      { kind: 'Number', value: 2 },
      { kind: 'Unquote', value: 'unquote' },
      { kind: 'Number', value: 3.12 },
      { kind: 'RParen', value: ')' },
    ])
  })

  it('should parse code with unquote splicing', () => {
    const tokens = tokenize('`(1 2 ~@(3 4 5))')
    expect(tokens).toMatchObject([
      { kind: 'Quasiquote', value: 'quasiquote' },
      { kind: 'LParen', value: '(' },
      { kind: 'Number', value: 1 },
      { kind: 'Number', value: 2 },
      { kind: 'UnquoteSplicing', value: 'unquote-splicing' },
      { kind: 'LParen', value: '(' },
      { kind: 'Number', value: 3 },
      { kind: 'Number', value: 4 },
      { kind: 'Number', value: 5 },
      { kind: 'RParen', value: ')' },
      { kind: 'RParen', value: ')' },
    ])
  })

  describe('dispatch (#)', () => {
    it('should tokenize #(...) as AnonFnStart followed by body tokens', () => {
      const tokens = tokenize('#(+ %1 %2)')
      expect(tokens).toMatchObject([
        { kind: 'AnonFnStart' },
        { kind: 'Symbol', value: '+' },
        { kind: 'Symbol', value: '%1' },
        { kind: 'Symbol', value: '%2' },
        { kind: 'RParen', value: ')' },
      ])
    })

    it('should tokenize a simple #(%) expression', () => {
      const tokens = tokenize('#(* 2 %)')
      expect(tokens).toMatchObject([
        { kind: 'AnonFnStart' },
        { kind: 'Symbol', value: '*' },
        { kind: 'Number', value: 2 },
        { kind: 'Symbol', value: '%' },
        { kind: 'RParen', value: ')' },
      ])
    })

    it('should tokenize #(... %&) with a rest param', () => {
      const tokens = tokenize('#(apply + %&)')
      expect(tokens).toMatchObject([
        { kind: 'AnonFnStart' },
        { kind: 'Symbol', value: 'apply' },
        { kind: 'Symbol', value: '+' },
        { kind: 'Symbol', value: '%&' },
        { kind: 'RParen', value: ')' },
      ])
    })

    it('should tokenize regex dispatch #"..." as a Regex token', () => {
      const tokens = tokenize('#"foo"')
      expect(tokens).toMatchObject([{ kind: 'Regex', value: 'foo' }])
    })

    it('should tokenize regex with escape sequences passed through', () => {
      // \d is two chars in the raw source — passed through as-is for regex engine
      const tokens = tokenize('#"\\d+"')
      expect(tokens).toMatchObject([{ kind: 'Regex', value: '\\d+' }])
    })

    it('should tokenize regex with escaped quote inside', () => {
      const tokens = tokenize('#"say \\"hi\\""')
      expect(tokens).toMatchObject([{ kind: 'Regex', value: 'say "hi"' }])
    })

    it('should throw on unterminated regex literal', () => {
      expect(() => tokenize('#"foo')).toThrow(TokenizerError)
    })

    it('should tokenize set dispatch #{...}', () => {
      const tokens = tokenize('#{1 2 3}')
      expect(tokens.find(t => t.kind === 'SetStart')).toBeDefined()
    })

    it('should throw on unknown dispatch character', () => {
      expect(() => tokenize('#?foo')).toThrow(TokenizerError)
    })
  })

  describe('@ deref dispatch', () => {
    it('tokenizes @a as a Deref token followed by a Symbol token', () => {
      const tokens = tokenize('@a')
      expect(tokens).toMatchObject([
        { kind: 'Deref' },
        { kind: 'Symbol', value: 'a' },
      ])
    })

    it('tokenizes @(foo) as Deref followed by the list tokens', () => {
      const tokens = tokenize('@(foo)')
      expect(tokens).toMatchObject([
        { kind: 'Deref' },
        { kind: 'LParen' },
        { kind: 'Symbol', value: 'foo' },
        { kind: 'RParen' },
      ])
    })

    it('tokenizes @@a as two Deref tokens followed by a Symbol', () => {
      const tokens = tokenize('@@a')
      expect(tokens).toMatchObject([
        { kind: 'Deref' },
        { kind: 'Deref' },
        { kind: 'Symbol', value: 'a' },
      ])
    })

    it('@ stops symbol scanning — foo and bar are separate tokens', () => {
      const tokens = tokenize('foo @bar')
      expect(tokens).toMatchObject([
        { kind: 'Symbol', value: 'foo' },
        { kind: 'Deref' },
        { kind: 'Symbol', value: 'bar' },
      ])
    })

    it('~@foo still produces UnquoteSplicing followed by Symbol (regression guard)', () => {
      const tokens = tokenize('~@foo')
      expect(tokens).toMatchObject([
        { kind: 'UnquoteSplicing' },
        { kind: 'Symbol', value: 'foo' },
      ])
    })
  })

  describe('auto-qualified keywords (::)', () => {
    it('tokenizes ::foo as a single Keyword token with value "::foo"', () => {
      const tokens = tokenize('::foo')
      expect(tokens).toMatchObject([{ kind: 'Keyword', value: '::foo' }])
    })

    it('tokenizes ::some-key as a single Keyword token', () => {
      const tokens = tokenize('::some-key')
      expect(tokens).toMatchObject([{ kind: 'Keyword', value: '::some-key' }])
    })

    it('tokenizes ::ns/local as a single Keyword token', () => {
      const tokens = tokenize('::ns/local')
      expect(tokens).toMatchObject([{ kind: 'Keyword', value: '::ns/local' }])
    })

    it('tokenizes a regular qualified keyword :ns/name as a single Keyword token', () => {
      const tokens = tokenize(':ns/name')
      expect(tokens).toMatchObject([{ kind: 'Keyword', value: ':ns/name' }])
    })

    it('tokenizes ::foo inside a list', () => {
      const tokens = tokenize('(::foo 1)')
      expect(tokens).toMatchObject([
        { kind: 'LParen' },
        { kind: 'Keyword', value: '::foo' },
        { kind: 'Number', value: 1 },
        { kind: 'RParen' },
      ])
    })
  })
})
