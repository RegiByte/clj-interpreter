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

  describe('#_ discard token', () => {
    it('tokenizes #_ as a single Discard token', () => {
      const tokens = tokenize('#_ 42')
      expect(tokens).toMatchObject([
        { kind: 'Discard' },
        { kind: 'Number', value: 42 },
      ])
    })

    it('tokenizes #_ before a list', () => {
      const tokens = tokenize('#_ (1 2 3)')
      expect(tokens).toMatchObject([
        { kind: 'Discard' },
        { kind: 'LParen' },
        { kind: 'Number', value: 1 },
        { kind: 'Number', value: 2 },
        { kind: 'Number', value: 3 },
        { kind: 'RParen' },
      ])
    })

    it('tokenizes stacked #_#_ as two consecutive Discard tokens', () => {
      const tokens = tokenize('#_#_ 1 2')
      expect(tokens).toMatchObject([
        { kind: 'Discard' },
        { kind: 'Discard' },
        { kind: 'Number', value: 1 },
        { kind: 'Number', value: 2 },
      ])
    })

    it('tokenizes triple-stacked #_#_#_ as three Discard tokens', () => {
      const tokens = tokenize('#_#_#_ 1 2 3')
      expect(tokens).toMatchObject([
        { kind: 'Discard' },
        { kind: 'Discard' },
        { kind: 'Discard' },
        { kind: 'Number', value: 1 },
        { kind: 'Number', value: 2 },
        { kind: 'Number', value: 3 },
      ])
    })

    it('#_ inside a vector — remaining tokens still present', () => {
      const tokens = tokenize('[1 #_ 2 3]')
      expect(tokens).toMatchObject([
        { kind: 'LBracket' },
        { kind: 'Number', value: 1 },
        { kind: 'Discard' },
        { kind: 'Number', value: 2 },
        { kind: 'Number', value: 3 },
        { kind: 'RBracket' },
      ])
    })

    it('does not affect existing #( dispatch (regression guard)', () => {
      const tokens = tokenize('#(+ % 1)')
      expect(tokens[0]).toMatchObject({ kind: 'AnonFnStart' })
    })

    it('does not affect existing #{ dispatch (regression guard)', () => {
      const tokens = tokenize('#{1 2}')
      expect(tokens[0]).toMatchObject({ kind: 'SetStart' })
    })
  })

  describe('reader tag tokens (#inst, #uuid, user-defined)', () => {
    it('tokenizes #inst "..." as a ReaderTag token with value "inst"', () => {
      const tokens = tokenize('#inst "2023-01-01"')
      expect(tokens).toMatchObject([
        { kind: 'ReaderTag', value: 'inst' },
        { kind: 'String', value: '2023-01-01' },
      ])
    })

    it('tokenizes #uuid "..." as a ReaderTag token with value "uuid"', () => {
      const tokens = tokenize('#uuid "be4b5cd8-b9e5-4a0a-b29a-3b5d3f9d4f5b"')
      expect(tokens).toMatchObject([
        { kind: 'ReaderTag', value: 'uuid' },
        { kind: 'String' },
      ])
    })

    it('tokenizes a namespaced reader tag #myapp/Foo', () => {
      const tokens = tokenize('#myapp/Foo {:x 1}')
      expect(tokens).toMatchObject([
        { kind: 'ReaderTag', value: 'myapp/Foo' },
        { kind: 'LBrace' },
        { kind: 'Keyword', value: ':x' },
        { kind: 'Number', value: 1 },
        { kind: 'RBrace' },
      ])
    })

    it('tokenizes #tag followed by a vector', () => {
      const tokens = tokenize('#tag [1 2 3]')
      expect(tokens).toMatchObject([
        { kind: 'ReaderTag', value: 'tag' },
        { kind: 'LBracket' },
        { kind: 'Number', value: 1 },
        { kind: 'Number', value: 2 },
        { kind: 'Number', value: 3 },
        { kind: 'RBracket' },
      ])
    })

    it('does not confuse #_tag with a reader tag — produces Discard, not ReaderTag', () => {
      const tokens = tokenize('#_ tag')
      expect(tokens[0]).toMatchObject({ kind: 'Discard' })
      expect(tokens[0].kind).not.toBe('ReaderTag')
    })
  })

  describe('character literals', () => {
    it('tokenizes a single letter: \\a', () => {
      const tokens = tokenize('\\a')
      expect(tokens).toMatchObject([{ kind: 'Character', value: 'a' }])
    })

    it('tokenizes a single digit: \\1', () => {
      const tokens = tokenize('\\1')
      expect(tokens).toMatchObject([{ kind: 'Character', value: '1' }])
    })

    it('tokenizes a punctuation char: \\!', () => {
      const tokens = tokenize('\\!')
      expect(tokens).toMatchObject([{ kind: 'Character', value: '!' }])
    })

    it('tokenizes \\space → space character', () => {
      const tokens = tokenize('\\space')
      expect(tokens).toMatchObject([{ kind: 'Character', value: ' ' }])
    })

    it('tokenizes \\newline → newline character', () => {
      const tokens = tokenize('\\newline')
      expect(tokens).toMatchObject([{ kind: 'Character', value: '\n' }])
    })

    it('tokenizes \\tab → tab character', () => {
      const tokens = tokenize('\\tab')
      expect(tokens).toMatchObject([{ kind: 'Character', value: '\t' }])
    })

    it('tokenizes \\return → carriage return', () => {
      const tokens = tokenize('\\return')
      expect(tokens).toMatchObject([{ kind: 'Character', value: '\r' }])
    })

    it('tokenizes \\backspace → backspace character', () => {
      const tokens = tokenize('\\backspace')
      expect(tokens).toMatchObject([{ kind: 'Character', value: '\b' }])
    })

    it('tokenizes \\formfeed → form feed character', () => {
      const tokens = tokenize('\\formfeed')
      expect(tokens).toMatchObject([{ kind: 'Character', value: '\f' }])
    })

    it('tokenizes \\uXXXX unicode escape', () => {
      const tokens = tokenize('\\u0041') // 'A'
      expect(tokens).toMatchObject([{ kind: 'Character', value: 'A' }])
    })

    it('tokenizes \\u03BB (lambda)', () => {
      const tokens = tokenize('\\u03BB')
      expect(tokens).toMatchObject([{ kind: 'Character', value: 'λ' }])
    })

    it('tokenizes character literals inside a list', () => {
      const tokens = tokenize('(\\a \\space \\newline)')
      expect(tokens).toMatchObject([
        { kind: 'LParen' },
        { kind: 'Character', value: 'a' },
        { kind: 'Character', value: ' ' },
        { kind: 'Character', value: '\n' },
        { kind: 'RParen' },
      ])
    })

    it('tokenizes character immediately followed by closing paren', () => {
      const tokens = tokenize('[\\a]')
      expect(tokens).toMatchObject([
        { kind: 'LBracket' },
        { kind: 'Character', value: 'a' },
        { kind: 'RBracket' },
      ])
    })

    it('throws on unknown named character literal', () => {
      expect(() => tokenize('\\unknown')).toThrow()
    })

    it('throws on EOF immediately after backslash', () => {
      expect(() => tokenize('\\')).toThrow()
    })
  })
})
