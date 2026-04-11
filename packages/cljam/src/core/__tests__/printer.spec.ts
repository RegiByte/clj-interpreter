import { describe, it, expect } from 'vitest'
import { prettyPrintString, printString } from '../printer'
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
  cljAtom,
} from '../factories'
import { tokenize } from '../tokenizer'
import { readForms } from '../reader'
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
          null,
          [cljList([cljSymbol('+'), cljSymbol('x'), cljSymbol('y')])],
          makeEnv()
        )
      )
    ).toBe('(fn [x y] (+ x y))')
  })

  it('should print atoms', () => {
    expect(printString(cljAtom(cljNumber(42)))).toBe('#<Atom 42>')
    expect(printString(cljAtom(cljNil()))).toBe('#<Atom nil>')
    expect(printString(cljAtom(cljString('hello')))).toBe('#<Atom "hello">')
    expect(printString(cljAtom(cljBoolean(true)))).toBe('#<Atom true>')
    expect(printString(cljAtom(cljVector([cljNumber(1), cljNumber(2)])))).toBe(
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
      const parsed = readForms(tokenized)
      expect(parsed).toEqual([expected])

      expect(printString(parsed[0])).toBe(input)
    }
  )
})
