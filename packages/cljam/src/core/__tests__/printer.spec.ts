import { describe, it, expect } from 'vitest'
import { prettyPrintString, printString } from '../printer'
import { v } from '../factories'
import { tokenize } from '../tokenizer'
import { readForms } from '../reader'
import { makeEnv } from '../env'
import { createSession } from '../session'

describe('printer', () => {
  describe('character literals', () => {
    it('prints a regular character as \\X', () => {
      expect(printString(v.char('a'))).toBe('\\a')
      expect(printString(v.char('Z'))).toBe('\\Z')
      expect(printString(v.char('1'))).toBe('\\1')
      expect(printString(v.char('!'))).toBe('\\!')
    })

    it('prints space as \\space', () => {
      expect(printString(v.char(' '))).toBe('\\space')
    })

    it('prints newline as \\newline', () => {
      expect(printString(v.char('\n'))).toBe('\\newline')
    })

    it('prints tab as \\tab', () => {
      expect(printString(v.char('\t'))).toBe('\\tab')
    })

    it('prints return as \\return', () => {
      expect(printString(v.char('\r'))).toBe('\\return')
    })

    it('prints backspace as \\backspace', () => {
      expect(printString(v.char('\b'))).toBe('\\backspace')
    })

    it('prints formfeed as \\formfeed', () => {
      expect(printString(v.char('\f'))).toBe('\\formfeed')
    })

    it('round-trips: tokenize → read → print for all named chars', () => {
      const cases: [string, string][] = [
        ['\\space', '\\space'],
        ['\\newline', '\\newline'],
        ['\\tab', '\\tab'],
        ['\\a', '\\a'],
        ['\\Z', '\\Z'],
        ['\\u0041', '\\A'], // unicode 'A' prints as \A (single char form)
      ]
      for (const [input, expected] of cases) {
        const tokens = tokenize(input)
        const [form] = readForms(tokens, 'user', new Map())
        expect(printString(form)).toBe(expected)
      }
    })
  })

  it('should print numbers', () => {
    expect(printString(v.number(1))).toBe('1')
    expect(printString(v.number(1.23))).toBe('1.23')
    expect(printString(v.number(-1.23))).toBe('-1.23')
  })

  it('should print nils', () => {
    expect(printString(v.nil())).toBe('nil')
  })

  it('should print strings', () => {
    expect(printString(v.string('hello'))).toBe('"hello"')
    expect(printString(v.string('hello world'))).toBe('"hello world"')
    expect(printString(v.string('hello "world"'))).toBe('"hello \\"world\\""')
    expect(printString(v.string('hello "world"\nnice!'))).toBe(
      '"hello \\"world\\"\\nnice!\"'
    )
  })

  it('should print booleans', () => {
    expect(printString(v.boolean(true))).toBe('true')
    expect(printString(v.boolean(false))).toBe('false')
  })

  it('should print keywords', () => {
    expect(printString(v.keyword(':hello'))).toBe(':hello')
    expect(printString(v.keyword(':hello-world'))).toBe(':hello-world')
    expect(printString(v.keyword(':hello-world-nice!'))).toBe(
      ':hello-world-nice!'
    )
  })

  it('should print symbols', () => {
    expect(printString(v.symbol('hello'))).toBe('hello')
    expect(printString(v.symbol('hello-world'))).toBe('hello-world')
    expect(printString(v.symbol('hello-world-nice!'))).toBe(
      'hello-world-nice!'
    )
  })

  it('should print lists', () => {
    expect(
      printString(v.list([v.number(1), v.string('hello'), v.boolean(true)]))
    ).toBe('(1 "hello" true)')
    expect(
      printString(
        v.list([
          v.number(1),
          v.string('hello'),
          v.boolean(true),
          v.list([v.number(2), v.string('world'), v.boolean(false)]),
        ])
      )
    ).toBe('(1 "hello" true (2 "world" false))')
  })

  it('should print vectors', () => {
    expect(
      printString(
        v.vector([v.number(1), v.string('hello'), v.boolean(true)])
      )
    ).toBe('[1 "hello" true]')
    expect(
      printString(
        v.vector([
          v.number(1),
          v.string('hello'),
          v.boolean(true),
          v.vector([v.number(2), v.string('world'), v.boolean(false)]),
        ])
      )
    ).toBe('[1 "hello" true [2 "world" false]]')
  })

  it('should print maps', () => {
    expect(
      printString(v.map([[v.keyword(':hello'), v.string('world')]]))
    ).toBe('{:hello "world"}')
    expect(
      printString(
        v.map([
          [v.keyword(':hello'), v.string('world')],
          [v.keyword(':foo'), v.string('bar')],
        ])
      )
    ).toBe('{:hello "world" :foo "bar"}')
  })

  it('should print functions', () => {
    expect(
      printString(
        v.function(
          [v.symbol('x'), v.symbol('y')],
          null,
          [v.list([v.symbol('+'), v.symbol('x'), v.symbol('y')])],
          makeEnv()
        )
      )
    ).toBe('(fn [x y] (+ x y))')
  })

  it('should print atoms', () => {
    expect(printString(v.atom(v.number(42)))).toBe('#<Atom 42>')
    expect(printString(v.atom(v.nil()))).toBe('#<Atom nil>')
    expect(printString(v.atom(v.string('hello')))).toBe('#<Atom "hello">')
    expect(printString(v.atom(v.boolean(true)))).toBe('#<Atom true>')
    expect(printString(v.atom(v.vector([v.number(1), v.number(2)])))).toBe(
      '#<Atom [1 2]>'
    )
  })

  describe('prettyPrintString', () => {
    function parse(src: string) {
      const tokenized = tokenize(src)
      return readForms(tokenized)[0]
    }

    it('returns flat output when form fits within maxWidth', () => {
      expect(prettyPrintString(parse('(+ 1 2)'), 80)).toBe('(+ 1 2)')
      expect(prettyPrintString(parse('[1 2 3]'), 80)).toBe('[1 2 3]')
      expect(prettyPrintString(parse('{:a 1 :b 2}'), 80)).toBe('{:a 1 :b 2}')
    })

    it('breaks a let form with binding vector pairs', () => {
      expect(prettyPrintString(parse('(let [x 0 y 1] (println x))'), 20)).toBe(
        '(let [x 0\n      y 1]\n  (println x))'
      )
    })

    it('breaks if with body indent', () => {
      expect(
        prettyPrintString(parse('(if (zero? x) "zero" "nonzero")'), 20)
      ).toBe('(if (zero? x)\n  "zero"\n  "nonzero")')
    })

    it('breaks cond as pairs', () => {
      expect(
        prettyPrintString(
          parse('(cond (zero? x) "zero" (pos? x) "positive" :else "negative")'),
          30
        )
      ).toBe(
        '(cond\n  (zero? x) "zero"\n  (pos? x) "positive"\n  :else "negative")'
      )
    })

    it('breaks general function call using flow indent', () => {
      // head "assoc" = 5 chars, firstArgCol = 1+5+1 = 7
      expect(prettyPrintString(parse('(assoc m :key "very-long-value")'), 20)).toBe(
        '(assoc m\n       :key\n       "very-long-value")'
      )
    })

    it('breaks maps across lines', () => {
      expect(
        prettyPrintString(parse('{:name "Alice" :age 30 :city "Wonderland"}'), 25)
      ).toBe('{:name "Alice"\n :age 30\n :city "Wonderland"}')
    })

    it('breaks vectors across lines', () => {
      expect(prettyPrintString(parse('[1 2 3 4 5]'), 8)).toBe(
        '[1\n 2\n 3\n 4\n 5]'
      )
    })

    it('handles the macroexpand-all let example', () => {
      const form = parse(
        '(let [x 0 y 1 s (+ x y) msg (if (zero? s) 0 (if (> s 2) "s is greater than 2" (if (< s 0) "s is less than 0" (if :else "Something else" nil))))] (println msg) msg)'
      )
      const result = prettyPrintString(form, 80)
      // Should contain line breaks and proper indentation
      expect(result).toContain('\n')
      // let bindings should be on separate lines
      expect(result).toContain('x 0\n')
      expect(result).toContain('y 1\n')
      // body forms indented 2 from (let
      expect(result).toContain('\n  (println msg)')
      expect(result).toContain('\n  msg)')
    })

    it('handles defn form', () => {
      expect(
        prettyPrintString(parse('(defn my-fn [x y] (+ x y))'), 20)
      ).toBe('(defn my-fn [x y]\n  (+ x y))')
    })
  })

  it.each([
    ['simple number', '1', v.number(1)],
    ['simple string', '"hello"', v.string('hello')],
    ['simple boolean', 'true', v.boolean(true)],
    ['simple keyword', ':hello', v.keyword(':hello')],
    ['simple symbol', 'hello', v.symbol('hello')],
    [
      'simple list',
      '(1 2 3)',
      v.list([v.number(1), v.number(2), v.number(3)]),
    ],
    [
      'simple vector',
      '[1 2 3]',
      v.vector([v.number(1), v.number(2), v.number(3)]),
    ],
    [
      'simple map',
      '{:hello "world"}',
      v.map([[v.keyword(':hello'), v.string('world')]]),
    ],
    [
      'nested lists and vectors',
      '(show [1 2 (compute 3 4)])',
      v.list([
        v.symbol('show'),
        v.vector([
          v.number(1),
          v.number(2),
          v.list([v.symbol('compute'), v.number(3), v.number(4)]),
        ]),
      ]),
    ],
    [
      'a string with inner quotes',
      '"hello \\"world\\""',
      v.string('hello "world"'),
    ],
  ])(
    'should make a full roundtrip and print the same value as the input: %s',
    (_description, input, expected) => {
      const tokenized = tokenize(input)
      const parsed = readForms(tokenized)
      expect(parsed).toEqual([expected])

      expect(printString(parsed[0])).toBe(input)
    }
  )

  describe('record printing', () => {
    it('includes qualified ns/TypeName in the tag', () => {
      const rec = v.record('Circle', 'user', [
        [v.keyword(':radius'), v.number(5)],
      ])
      expect(printString(rec)).toBe('#user/Circle{:radius 5}')
    })

    it('uses the actual defining namespace, not user', () => {
      const rec = v.record('Point', 'geometry', [
        [v.keyword(':x'), v.number(1)],
        [v.keyword(':y'), v.number(2)],
      ])
      expect(printString(rec)).toBe('#geometry/Point{:x 1 :y 2}')
    })

    it('prints an empty record', () => {
      const rec = v.record('Tag', 'user', [])
      expect(printString(rec)).toBe('#user/Tag{}')
    })
  })

  describe('namespaced map (compact) printing', () => {
    it('emits #:ns{...} when all keys share the same namespace', () => {
      const m = v.map([
        [v.keyword(':car/make'), v.string('Toyota')],
        [v.keyword(':car/model'), v.string('Camry')],
        [v.keyword(':car/year'), v.number(2024)],
      ])
      expect(printString(m)).toBe('#:car{:make "Toyota" :model "Camry" :year 2024}')
    })

    it('does NOT compact when keys span multiple namespaces', () => {
      const m = v.map([
        [v.keyword(':car/make'), v.string('Toyota')],
        [v.keyword(':bike/model'), v.string('Trek')],
      ])
      expect(printString(m)).toBe('{:car/make "Toyota" :bike/model "Trek"}')
    })

    it('does NOT compact when any key is unqualified', () => {
      const m = v.map([
        [v.keyword(':car/make'), v.string('Toyota')],
        [v.keyword(':model'), v.string('Camry')],
      ])
      expect(printString(m)).toBe('{:car/make "Toyota" :model "Camry"}')
    })

    it('does NOT compact an empty map', () => {
      expect(printString(v.map([]))).toBe('{}')
    })

    it('round-trips: reader → printer → same compact form', () => {
      const src = '#:car{:make "Toyota" :model "Camry"}'
      const parsed = readForms(tokenize(src))[0]
      expect(printString(parsed)).toBe(src)
    })
  })

  describe('pprint — records and ns-maps', () => {
    function parse(src: string) {
      return readForms(tokenize(src))[0]
    }

    it('pretty-prints a record flat when it fits', () => {
      const rec = v.record('Circle', 'user', [
        [v.keyword(':radius'), v.number(5)],
      ])
      expect(prettyPrintString(rec, 80)).toBe('#user/Circle{:radius 5}')
    })

    it('pretty-prints a record with line breaks when fields overflow', () => {
      const rec = v.record('Vehicle', 'fleet', [
        [v.keyword(':make'), v.string('Toyota')],
        [v.keyword(':model'), v.string('Camry')],
        [v.keyword(':year'), v.number(2024)],
      ])
      const result = prettyPrintString(rec, 30)
      expect(result).toContain('\n')
      expect(result).toMatch(/^#fleet\/Vehicle\{/)
      expect(result).toContain(':make "Toyota"')
      expect(result).toContain(':model "Camry"')
      expect(result).toContain(':year 2024')
      expect(result).toMatch(/\}$/)
    })

    it('pretty-prints a ns-map flat when it fits', () => {
      const result = prettyPrintString(parse('#:car{:make "Toyota" :year 2024}'), 80)
      expect(result).toBe('#:car{:make "Toyota" :year 2024}')
    })

    it('pretty-prints a ns-map with line breaks when it overflows', () => {
      const result = prettyPrintString(
        parse('#:car{:make "Toyota" :model "Camry" :year 2024}'),
        30
      )
      expect(result).toContain('\n')
      expect(result).toMatch(/^#:car\{/)
      expect(result).toContain(':make "Toyota"')
      expect(result).toContain(':model "Camry"')
      expect(result).toContain(':year 2024')
      expect(result).toMatch(/\}$/)
    })
  })

  describe('pprint-str', () => {
    function s() {
      return createSession()
    }

    it('returns pretty-printed string with trailing newline', () => {
      const sess = s()
      const result = sess.evaluate('(pprint-str {:a 1 :b 2})')
      expect(result).toMatchObject({ kind: 'string' })
      if (result.kind === 'string') {
        expect(result.value).toBe('{:a 1 :b 2}\n')
      }
    })

    it('accepts explicit width', () => {
      const sess = s()
      const result = sess.evaluate('(pprint-str {:name "Alice" :age 30 :city "Wonderland"} 25)')
      expect(result).toMatchObject({ kind: 'string' })
      if (result.kind === 'string') {
        expect(result.value).toContain('\n')
        expect(result.value).toContain(':name "Alice"')
      }
    })

    it('works for ns-maps', () => {
      const sess = s()
      const result = sess.evaluate('(pprint-str {:car/make "Toyota" :car/model "Camry"})')
      expect(result).toMatchObject({ kind: 'string' })
      if (result.kind === 'string') {
        expect(result.value).toBe('#:car{:make "Toyota" :model "Camry"}\n')
      }
    })
  })
})
