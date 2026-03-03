import { EvaluationError } from '../errors'
import { expect, it, describe } from 'vitest'
import {
  cljBoolean,
  cljFunction,
  cljKeyword,
  cljList,
  cljMap,
  cljNil,
  cljNumber,
  cljString,
  cljSymbol,
  cljVector,
} from '../factories'
import { lookup } from '../env'
import type { CljAtom, CljValue } from '../types'
import { isCljValue } from '../assertions'
import { createSession } from '../session'

function expectEvalError(code: string, expectedMessage: string) {
  const session = createSession()
  let error: EvaluationError | undefined
  expect(() => {
    try {
      session.evaluate(code)
    } catch (e) {
      if (e instanceof EvaluationError) error = e
      throw e
    }
  }).toThrow(EvaluationError)
  expect(error?.message).toContain(expectedMessage)
}

const toCljValue = (value: any): CljValue => {
  if (isCljValue(value)) {
    return value
  }
  if (typeof value === 'number') {
    return cljNumber(value)
  }
  if (typeof value === 'string') {
    return cljString(value)
  }
  if (typeof value === 'boolean') {
    return cljBoolean(value)
  }
  if (Array.isArray(value)) {
    return cljVector(value.map(toCljValue))
  }
  if (typeof value === 'object') {
    if (value === null) {
      return cljNil()
    }
    return cljMap(
      Object.entries(value).map(([key, value]) => [
        cljString(key),
        toCljValue(value),
      ])
    )
  }
  throw new Error(`Unsupported value type: ${typeof value}`)
}

describe('evaluator spec', () => {
  describe('primitive forms spec', () => {
    it('should evaluate a single form', () => {
      const session = createSession()
      const result = session.evaluate('1')
      expect(result).toMatchObject(toCljValue(1))
    })

    it.each([
      ['1', cljNumber(1)],
      ['"hello"', cljString('hello')],
      ['true', cljBoolean(true)],
      [':keyword', cljKeyword(':keyword')],
      ['nil', cljNil()],
    ])('should evaluate self-evaluating forms: %s', (code, expected) => {
      const session = createSession()
      expect(session.evaluate(code)).toMatchObject(expected)
    })

    it('should evaluate functions to self', () => {
      const session = createSession()
      const userEnv = session.getNs('user')!
      const form = cljFunction([cljSymbol('n1')], null, [cljNumber(1)], userEnv)
      const result = session.evaluateForms([form])
      expect(result).toMatchObject(form)
    })

    it('should evaluate a vector with items and strip comments at parse time', () => {
      const session = createSession()
      const result = session.evaluate('[1 ; comment\n 2]')
      expect(result).toMatchObject(cljVector([cljNumber(1), cljNumber(2)]))
    })
  })

  describe('special forms spec', () => {
    it('should evaluate fn special form', () => {
      const session = createSession()
      session.evaluate('(def some-symbol 1)')
      const result = session.evaluate('(fn [a b] (+ a b))')
      const userEnv = session.getNs('user')!
      expect(result).toMatchObject(
        cljFunction(
          [cljSymbol('a'), cljSymbol('b')],
          null,
          [cljList([cljSymbol('+'), cljSymbol('a'), cljSymbol('b')])],
          userEnv
        )
      )
      if (result.kind !== 'function') {
        throw new Error('Result is not a function')
      }
      // check if the outer env was captured by the function
      expect(lookup('some-symbol', result.env)).toMatchObject(cljNumber(1))
    })

    it('should evaluate def special form', () => {
      const session = createSession()
      const result = session.evaluate('(def some-symbol 1)')
      expect(result).toMatchObject(cljNil())
      expect(lookup('some-symbol', session.getNs('user')!)).toMatchObject(
        cljNumber(1)
      )
    })

    it('def should define a global binding, not local', () => {
      const session = createSession()
      const result = session.evaluate(`(let [x 1] 
    (def y 2)
    (+ 1 x))
    y`)
      expect(result).toMatchObject(cljNumber(2))
    })

    it('should evaluate a quote special form', () => {
      const session = createSession()
      const result = session.evaluate('(quote (+ 1 2 3))')
      expect(result).toMatchObject(
        cljList([cljSymbol('+'), cljNumber(1), cljNumber(2), cljNumber(3)])
      )
    })

    it('should evaluate a do special form', () => {
      const session = createSession()
      expect(session.evaluate('(do 1 2 3)')).toMatchObject(cljNumber(3))
    })

    it('should evaluate a let special form', () => {
      const session = createSession()
      expect(session.evaluate('(let [a 1 b 2] [a a b b])')).toMatchObject(
        cljVector([cljNumber(1), cljNumber(1), cljNumber(2), cljNumber(2)])
      )
    })

    it('should evaluate a if special form', () => {
      const session = createSession()
      expect(session.evaluate('(if true 1 2)')).toMatchObject(cljNumber(1))
      expect(session.evaluate('(if false 1 2)')).toMatchObject(cljNumber(2))
    })
  })

  describe('user-defined functions spec', () => {
    it.each([
      ['((fn [a b] (+ a b)) 1 2)', 3],
      ['((fn [a b] (- a b)) 1 2)', -1],
      ['((fn [a b] (* a b)) 1 2)', 2],
      ['((fn [a b] (/ a b)) 1 2)', 1 / 2],
    ])('should evaluate a user-defined function %s → %s', (code, expected) => {
      const session = createSession()
      const result1 = session.evaluate(code)
      expect(result1).toMatchObject(toCljValue(expected))
    })

    it('should evaluate user-defined function accessing outer env', () => {
      const session = createSession()
      const result = session.evaluate(`(def x 10)
    (def mult-10 (fn [n] (* n x)))
    (mult-10 2)`)
      expect(result).toMatchObject(cljNumber(20))
    })

    it('should capture the outer environment in a function', () => {
      const session = createSession()
      const result =
        session.evaluate(`(def make-adder (fn [n] (fn [x] (+ n x))))
((make-adder 5) 3) `)
      expect(result).toMatchObject(cljNumber(8))
    })

    it('should evaluate a nested function call', () => {
      const session = createSession()
      expect(
        session.evaluate('((fn [a b] ((fn [x] (* x a)) b)) 2 3)')
      ).toMatchObject(cljNumber(6))
    })

    it('should evaluate if with truthy value', () => {
      const session = createSession()
      expect(session.evaluate('(if [1] 1 2)')).toMatchObject(cljNumber(1))
    })
  })

  describe('native functions spec', () => {
    describe('basic math', () => {
      it.each([
        ['fn: +', '(+ 1 2 3)', 6],
        ['fn: +', '(+)', 0],
        ['fn: -', '(- 1 2 3)', -4],
        ['fn: *', '(* 1 2 3)', 6],
        ['fn: /', '(/ 1 2 3)', 1 / 6],
      ])(
        'should evaluate all basic math operations %s --- %s → %s',
        (_, code, expectedValue) => {
          const session = createSession()
          const result = session.evaluate(code)
          if (result.kind !== 'number') {
            expect.fail('Result is not a number')
          }
          expect(result.value).toBe(expectedValue)
        }
      )

      it('should throw on division by zero', () => {
        expect(() => createSession().evaluate('(/ 1 0)')).toThrow(
          EvaluationError
        )
      })
    })

    describe('> and <', () => {
      it.each([
        ['(> 3 2)', true],
        ['(> 3 2 1)', true],
        ['(> 3 2 1 0)', true],
        ['(> 3 2 1 0 -1)', true],
        ['(> 3 2 1 0 -1 -2)', true],
        ['(> 3 2 4)', false],
        ['(> 3 4)', false],
      ])(
        'should evaluate > core function: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(cljBoolean(expected))
        }
      )

      it.each([
        ['(> 3)', '> expects at least two arguments'],
        ['(> 3 2 "a")', '> expects all arguments to be numbers'],
      ])(
        'should throw on invalid %s function arguments: %s',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )

      it.each([
        ['(< 3 4)', true],
        ['(< 3 4 5)', true],
        ['(< 3 4 5 6)', true],
        ['(< 3 4 5 6 7)', true],
        ['(< 3 4 5 6 7 8)', true],
        ['(< 3 4 5 6 7 8 9)', true],
        ['(< 3 4 5 6 7 8 9 10)', true],
        ['(< 3 4 5 6 7 8 9 10 11)', true],
        ['(< 5 (+ 3 3))', true],
        ['(< 5 4)', false],
      ])(
        'should evaluate < core function: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(cljBoolean(expected))
        }
      )

      it.each([
        ['(< 3)', '< expects at least two arguments'],
        ['(< 3 2 "a")', '< expects all arguments to be numbers'],
      ])(
        'should throw on invalid %s function arguments: %s',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('>= and <=', () => {
      it.each([
        ['(>= 2 1)', true],
        ['(>= 2 2)', true],
        ['(>= 1 2)', false],
        ['(>= 5 3 2 1)', true],
        ['(>= 5 3 3 1)', true],
        ['(>= 5 3 4 1)', false],
        ['(<= 1 2)', true],
        ['(<= 2 2)', true],
        ['(<= 3 2)', false],
        ['(<= 1 2 3 4)', true],
        ['(<= 1 2 2 4)', true],
        ['(<= 1 2 1 4)', false],
      ])('should evaluate >= and <= %s → %s', (code, expected) => {
        const session = createSession()
        const result = session.evaluate(code)
        expect(result).toMatchObject(toCljValue(expected))
      })

      it.each([
        ['(>=)', '>= expects at least two arguments'],
        ['(>= 1)', '>= expects at least two arguments'],
        ['(>= 1 "a")', '>= expects all arguments to be numbers'],
        ['(<=)', '<= expects at least two arguments'],
        ['(<= 1)', '<= expects at least two arguments'],
        ['(<= "a" 1)', '<= expects all arguments to be numbers'],
      ])(
        'should throw on invalid >= / <= arguments: %s → "%s"',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('count', () => {
      it.each([
        ['(count [1 2 3])', 3],
        ['(count {"a" 1, "b" 2})', 2],
        ["(count '())", 0],
        ['(count [])', 0],
        ['(count {})', 0],
        ['(count "abc")', 3],
      ])(
        'should evaluate count core function: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(cljNumber(expected))
        }
      )

      it.each([
        ['(count true)', 'count expects a countable value, got true'],
        ['(count 1)', 'count expects a countable value, got 1'],
        ['(count nil)', 'count expects a countable value, got nil'],
        ['(def x 1) (count x)', 'count expects a countable value, got 1'],
      ])(
        'should throw on invalid count function arguments: %s should be %s',
        (code, expected_err) => {
          expectEvalError(code, expected_err)
        }
      )
    })

    describe('truthy?', () => {
      it.each([
        ['(truthy? nil)', false],
        ['(truthy? false)', false],
        ['(truthy? true)', true],
        ['(truthy? 1)', true],
        ['(truthy? 0)', true],
        ['(truthy? "a")', true],
        ['(truthy? [])', true],
        ['(truthy? {})', true],
        ['(truthy? (fn [x] x))', true],
      ])(
        'should evalute truthy? core function: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(cljBoolean(expected))
        }
      )
    })

    describe('falsy?', () => {
      it.each([
        ['(falsy? nil)', true],
        ['(falsy? false)', true],
        ['(falsy? true)', false],
        ['(falsy? 1)', false],
        ['(falsy? 0)', false],
        ['(falsy? "a")', false],
        ['(falsy? [])', false],
        ['(falsy? {})', false],
        ['(falsy? (fn [x] x))', false],
      ])(
        'should evalute falsy? core function: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(cljBoolean(expected))
        }
      )
    })

    describe('true?', () => {
      it.each([
        ['(true? true)', true],
        ['(true? nil)', false],
        ['(true? false)', false],
        ['(true? 1)', false],
        ['(true? 0)', false],
        ['(true? "a")', false],
        ['(true? [])', false],
        ['(true? {})', false],
      ])(
        'should evalute true? core function: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(cljBoolean(expected))
        }
      )
    })

    describe('false?', () => {
      it.each([
        ['(false? false)', true],
        ['(false? nil)', false],
        ['(false? true)', false],
        ['(false? 1)', false],
        ['(false? 0)', false],
        ['(false? "a")', false],
        ['(false? [])', false],
        ['(false? {})', false],
      ])(
        'should evalute false? core function: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(cljBoolean(expected))
        }
      )
    })

    describe('not', () => {
      it.each([
        ['(not nil)', true],
        ['(not false)', true],
        ['(not true)', false],
        ['(not 1)', false],
        ['(not 0)', false],
        ['(not "a")', false],
        ['(not [])', false],
        ['(not {})', false],
        ['(not (= 1 0))', true],
      ])(
        'should evalute not core function: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(cljBoolean(expected))
        }
      )
    })

    describe('=', () => {
      it.each([
        ['(= 1 1)', true],
        ['(= 1 2)', false],
        ['(= 1 1 1)', true],
        ['(= 1 1 2)', false],
        ['(= 1 2 1)', false],
        ['(= 1 2 3)', false],
        ['(= "a" "a")', true],
        ['(= "a" "b")', false],
        ['(= "a" "a" "a")', true],
        ['(= "a" "a" "b")', false],
        ['(= "a" "b" "a")', false],
        ['(= "a" "b" "c")', false],
        ['(= 1 1.0)', true],
        ['(= 1.0 1)', true],
        ['(= [1 2] [1 2])', true],
        ['(= [1 2] [1 3])', false],
        ['(= {} {})', true],
        ['(= {} {"a" 1})', false],
        ['(= {"a" 1} {})', false],
        ['(= {"a" 1} {"a" 1})', true],
        ['(= {"a" 1} {"a" 2})', false],
        ['(= {"a" 1} {"b" 1})', false],
        ['(= {"a" 1} {"a" 1 "b" 2})', false],
        ['(= {"a" 1 "b" 2} {"a" 1 "c" 3})', false],
        ['(= {"a" 1 "b" 2} {"a" 1 "b" 2})', true],
        ["(= '(1) (quote (1)))", true],
        ["(= '(1) '(1))", true],
        ["(= '(1) '(1 2))", false],
        // order independence
        ['(= {"b" 2 "a" 1} {"a" 1 "b" 2})', true],
        [
          `(= {"b" 2 "a" 1 "c" {"d" 3 "e" 4}}
          {"a" 1 "b" 2 "c" {"e" 4 "d" 3}})`,
          true,
        ],
      ])(
        'should evalute = core function: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(cljBoolean(expected))
        }
      )
    })

    describe('first', () => {
      it.each([
        ['(first [1 2 3])', 1],
        ['(first (quote (1 2 3)))', 1],
        ['(first (quote (1 2 3)))', 1],
        ['(first {})', null],
        ['(first [])', null],
        ["(first '())", null],
        ['(first {"a" 1 "b" 2})', [cljString('a'), cljNumber(1)]],
        ['(first [1 2])', 1],
        ["(first '(2 3))", 2],
      ])(
        'should evalute first core function: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(toCljValue(expected))
        }
      )
    })

    describe('rest', () => {
      it.each([
        ['(rest (quote (1 2 3)))', cljList([cljNumber(2), cljNumber(3)])],
        ['(rest [1 2 3])', cljVector([cljNumber(2), cljNumber(3)])],
        ['(rest {"a" 1 "b" 2})', cljMap([[cljString('b'), cljNumber(2)]])],
        ['(rest {})', cljMap([])],
        ['(rest [])', cljVector([])],
        ["(rest '())", cljList([])],
      ])(
        'should evalute rest core function: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(toCljValue(expected))
        }
      )
    })

    describe('conj', () => {
      it.each([
        // empty collections
        ['(conj [])', cljVector([])],
        ['(conj {})', cljMap([])],
        ["(conj '())", cljList([])],
        // no arguments, returns the collection unchanged
        [
          '(conj [1 2 3])',
          cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
        ],
        ['(conj {"a" 1})', cljMap([[cljString('a'), cljNumber(1)]])],
        ["(conj '(1 2))", cljList([cljNumber(1), cljNumber(2)])],
        // basic conj
        ['(conj [1 2 3] 4)', [1, 2, 3, 4]],
        ['(conj {} ["a" 1] ["b" 2])', { a: 1, b: 2 }],
        ['(conj [1 2] [3 4])', [1, 2, [3, 4]]],
        ['(conj [1 2] 3 4)', [1, 2, 3, 4]],
        ['(conj {"a" 1} ["b" 2])', { a: 1, b: 2 }],
        // conj on conj, replaces existing key
        ['(conj (conj {"a" 1} ["b" 2]) ["a" 5])', { a: 5, b: 2 }],
        [
          "(conj '(1 2 3) 4)",
          cljList([
            cljNumber(4), // added to the front
            cljNumber(1),
            cljNumber(2),
            cljNumber(3),
          ]),
        ],
        [
          "(conj '(1 2) 3 4)",
          cljList([cljNumber(4), cljNumber(3), cljNumber(1), cljNumber(2)]),
        ],
        [
          "(conj '(1 2) 3 4 5)",
          cljList([
            cljNumber(5),
            cljNumber(4),
            cljNumber(3),
            cljNumber(1),
            cljNumber(2),
          ]),
        ],
      ])(
        'should evalute conj core function: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(toCljValue(expected))
        }
      )

      it.each([
        ['(conj)', 'conj expects a collection as first argument'],
        [
          '(conj {} "a" 1 "b")',
          'conj on maps expects each argument to be a vector key-pair for maps, got "a"',
        ],
        [
          '(conj {} "a")',
          'conj on maps expects each argument to be a vector key-pair for maps, got "a"',
        ],
        ['(conj "a" "b")', 'conj expects a collection, got "a"'],
      ])(
        'should throw on invalid conj function arguments: %s should be %s',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('assoc', () => {
      it.each([
        ['(assoc [1 2 3] 0 4)', [4, 2, 3]],
        ['(assoc [1 2 3] 1 4)', [1, 4, 3]],
        ['(assoc [1 2 3] 2 4)', [1, 2, 4]],
        ['(assoc [] 0 1)', [1]],
        ['(assoc {} "a" 1)', { a: 1 }],
        ['(assoc {} "a" 1 "b" 2, "c" 3)', { a: 1, b: 2, c: 3 }],
        ['(assoc {} "a" 1 "b" 2, "a" 3)', { a: 3, b: 2 }],
        ['(assoc {"a" 1} "b" 2)', { a: 1, b: 2 }],
      ])(
        'should evalute assoc core function: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(toCljValue(expected))
        }
      )

      it.each([
        ['(assoc)', 'assoc expects a collection as first argument'],
        ['(assoc "a" "b")', 'assoc expects a collection, got "a"'],
        [
          '(assoc [1 2 3] "a" 1)',
          'assoc on vectors expects each key argument to be a index (number), got "a"',
        ],
        [
          '(assoc {} "a" 1 "b")',
          'assoc expects an even number of binding arguments',
        ],
      ])(
        'should throw on invalid assoc function arguments: %s should be %s',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('dissoc', () => {
      it.each([
        ['(dissoc [1 2 3] 0)', [2, 3]],
        ['(dissoc [1 2 3] 1)', [1, 3]],
        ['(dissoc [1 2 3] 2)', [1, 2]],
        ['(dissoc [] 0)', []],
        ['(dissoc {} "a")', {}],
        ['(dissoc {"a" 1} "b")', { a: 1 }],
        ['(dissoc {"a" 1} "a")', {}],
        ['(dissoc {"a" 1 "b" 2} "a" "b")', {}],
        ['(dissoc {"a" 1 "b" 2} "a")', { b: 2 }],
      ])(
        'should evalute dissoc core function: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(toCljValue(expected))
        }
      )

      it.each([
        ['(dissoc)', 'dissoc expects a collection as first argument'],
        ['(dissoc "a" "b")', 'dissoc expects a collection, got "a"'],
        [
          '(dissoc [1 2 3] "a")',
          'dissoc on vectors expects each key argument to be a index (number), got "a"',
        ],
        [
          "(dissoc '(1) 0)",
          'dissoc on lists is not supported, use vectors instead',
        ],
      ])(
        'should throw on invalid dissoc function arguments: %s should be %s',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('get', () => {
      it.each([
        ['(get [1 2 3] 0)', 1],
        //
        ['(get [1 2 3] 0)', 1],
        ['(get [1 2 3] 1)', 2],
        ['(get [1 2 3] 2)', 3],

        ['(get [1 2 3] 3)', null],

        ['(get [1 2 3] -2)', null],

        ["(get '(1 2 3) 1)", null],
        ['(get \'(1 2 3) 1 "default")', 'default'],
        ['(get 20 0)', null],
        ['(get 20 0 "default")', 'default'],
        ['(get {:a 1 :b 2} :a)', 1],
        ['(get {:a 1 :b 2} :b)', 2],
        ['(get {:a 1 :b 2} :c)', null],
        ['(get {:a 1 :b 2} :c "default")', 'default'],
      ])(
        'get should get a value from a collection: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(toCljValue(expected))
        }
      )

      it.each([
        ['((get {"a" (fn [n] (+ n 1))} "a") 10)', 11],
        [
          `(def the-vector [1 2 3 (fn [n] (+ n 1))])
       ((get the-vector 3) 41)`,
          42,
        ],
      ])(
        'evaluate function returned from expression as first member of a list: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(toCljValue(expected))
        }
      )
    })

    describe('str', () => {
      it.each([
        ['(str)', ''],
        ['(str "hello")', 'hello'],
        ['(str "hello" " " "world")', 'hello world'],
        ['(str 1 2 3)', '123'],
        ['(str "x:" 42)', 'x:42'],
        ['(str [1 2 3])', '[1 2 3]'],
        ['(str {:a 1})', '{:a 1}'],
        ['(str nil)', 'nil'],
        ['(str true false)', 'truefalse'],
      ])(
        'str should concatenate arguments to string: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(cljString(expected))
        }
      )
    })

    describe('println', () => {
      it('println should call output callback and return nil', () => {
        const outputs: string[] = []
        const session = createSession({ output: (text) => outputs.push(text) })

        expect(session.evaluate('(println "Hello" "world")')).toMatchObject(
          cljNil()
        )
        expect(outputs).toEqual(['Hello world'])

        expect(session.evaluate('(println 1 2 3)')).toMatchObject(cljNil())
        expect(outputs).toEqual(['Hello world', '1 2 3'])
      })

      it('println should not be defined if no output callback provided', () => {
        expect(() => createSession().evaluate('(println "test")')).toThrow(
          'Symbol println not found'
        )
      })
    })

    describe('cons', () => {
      it.each([
        [
          `(cons 1 '(2 3 4 5 6))`,
          cljList([
            cljNumber(1),
            cljNumber(2),
            cljNumber(3),
            cljNumber(4),
            cljNumber(5),
            cljNumber(6),
          ]),
        ],
        [
          `(cons [1 2] [4 5 6])`,
          cljVector([
            cljVector([cljNumber(1), cljNumber(2)]),
            cljNumber(4),
            cljNumber(5),
            cljNumber(6),
          ]),
        ],
        [
          `(def db {:users [{:name "Eduardo"}]})
(def new-element {:name "Eva"})
(assoc db :users (cons new-element (:users db)))`,
          cljMap([
            [
              cljKeyword(':users'),
              cljVector([
                cljMap([[cljKeyword(':name'), cljString('Eva')]]),
                cljMap([[cljKeyword(':name'), cljString('Eduardo')]]),
              ]),
            ],
          ]),
        ],
      ])(
        'cons should prepend an element to a collection: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(toCljValue(expected))
        }
      )

      it.each([
        [
          '(cons 1 "a")',
          'cons expects a collection as second argument, got "a"',
        ],
        ['(cons 1 1)', 'cons expects a collection as second argument, got 1'],
        [
          '(cons 1 {:a 2})',
          'cons on maps is not supported, use vectors instead',
        ],
      ])(
        'cons should throw on invalid arguments: %s should be %s',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('map', () => {
      it('returns a transducer (function) when given 1 arg', () => {
        const session = createSession()
        const result = session.evaluate('(map (fn [n] (+ n 1)))')
        expect(result.kind).toBe('function')
      })

      it.each([
        ['(map (fn [n] (+ n 1)) [1 2 3])', [2, 3, 4]],
        // list input now returns a vector (sequence always materialises into [])
        ["(map (fn [n] (+ n 1)) '(1 2 3))", [2, 3, 4]],
        [
          `(map 
   (fn [entry]
     [(str (get entry 0) (get entry 0)),
      (* 2 (get entry 1))])
   {:a 1 :b 2})`,
          [
            cljVector([cljString(':a:a'), cljNumber(2)]),
            cljVector([cljString(':b:b'), cljNumber(4)]),
          ],
        ],
        // nil collection returns empty vector
        ['(map (fn [n] (+ n 1)) nil)', []],
      ])(`should evaluate map: %s should be %s`, (code, expected) => {
        const session = createSession()
        const result = session.evaluate(code)
        expect(result).toMatchObject(toCljValue(expected))
      })

      it.each([
        ['(map)', 'No matching arity for 0'],
        ['(map "a" [1 2 3])', 'not a function'],
        ['(map (fn [n] (+ n 1)) "abc")', 'transduce expects a collection'],
        ['(map (fn [n] (+ n 1)) true)', 'transduce expects a collection'],
        ['(map (fn [n] (+ n 1)) false)', 'transduce expects a collection'],
        ['(map (fn [n] (+ n 1)) 0)', 'transduce expects a collection'],
      ])(
        'should throw on invalid map arguments: %s should throw "%s"',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )

      describe('multi-collection (zip)', () => {
        it('(map + [1 2 3] [10 20 30]) applies f to corresponding items', () => {
          const s = createSession()
          expect(s.evaluate('(map + [1 2 3] [10 20 30])')).toMatchObject(
            cljVector([cljNumber(11), cljNumber(22), cljNumber(33)])
          )
        })

        it('(map vector ...) zips two collections into pairs', () => {
          const s = createSession()
          expect(s.evaluate('(map vector [1 2 3] [4 5 6])')).toMatchObject(
            cljVector([
              cljVector([cljNumber(1), cljNumber(4)]),
              cljVector([cljNumber(2), cljNumber(5)]),
              cljVector([cljNumber(3), cljNumber(6)]),
            ])
          )
        })

        it('stops at the shortest collection', () => {
          const s = createSession()
          expect(s.evaluate('(map + [1 2 3] [10 20])')).toMatchObject(
            cljVector([cljNumber(11), cljNumber(22)])
          )
        })

        it('returns empty vector when any collection is empty', () => {
          const s = createSession()
          expect(s.evaluate('(map + [] [1 2 3])')).toMatchObject(cljVector([]))
        })

        it('3+ collections: (map + [1 2] [10 20] [100 200])', () => {
          const s = createSession()
          expect(s.evaluate('(map + [1 2] [10 20] [100 200])')).toMatchObject(
            cljVector([cljNumber(111), cljNumber(222)])
          )
        })

        it('4 collections zip correctly', () => {
          const s = createSession()
          expect(
            s.evaluate('(map + [1 2] [10 20] [100 200] [1000 2000])')
          ).toMatchObject(cljVector([cljNumber(1111), cljNumber(2222)]))
        })
      })
    })

    describe('filter', () => {
      it('returns a transducer (function) when given 1 arg', () => {
        const session = createSession()
        const result = session.evaluate('(filter (fn [n] (> n 2)))')
        expect(result.kind).toBe('function')
      })

      it.each([
        ['(filter (fn [n] (> n 2)) [1 2 3 4 5])', [3, 4, 5]],
        // list input now returns a vector
        ["(filter (fn [n] (> n 2)) '(1 2 3 4 5))", [3, 4, 5]],
        [
          `(filter (fn [n] (not (= "a" n))) ["a" "b" "c" "a" "d" "e"])`,
          ['b', 'c', 'd', 'e'],
        ],
        [
          `(filter (fn [entry] (> (get entry 1) 2)) {:a 1 :b 2 :c 3 :d 4})`,
          [
            cljVector([cljKeyword(':c'), cljNumber(3)]),
            cljVector([cljKeyword(':d'), cljNumber(4)]),
          ],
        ],
        // nil collection returns empty vector
        ['(filter (fn [n] (> n 2)) nil)', []],
      ])('should evaluate filter: %s should be %s', (code, expected) => {
        const session = createSession()
        const result = session.evaluate(code)
        expect(result).toMatchObject(toCljValue(expected))
      })

      it.each([
        ['(filter)', 'No matching arity for 0'],
        ['(filter "a" [1 2 3])', 'not a function'],
        ['(filter (fn [n] (+ n 1)) "abc")', 'transduce expects a collection'],
        ['(filter (fn [n] (+ n 1)) true)', 'transduce expects a collection'],
        ['(filter (fn [n] (+ n 1)) false)', 'transduce expects a collection'],
        ['(filter (fn [n] (+ n 1)) 0)', 'transduce expects a collection'],
      ])(
        'should throw on invalid filter arguments: %s should throw "%s"',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('seq', () => {
      it.each([
        ['(seq [1 2 3])', cljList([cljNumber(1), cljNumber(2), cljNumber(3)])],
        ["(seq '(1 2 3))", cljList([cljNumber(1), cljNumber(2), cljNumber(3)])],
        [
          '(seq {:a 1 :b 2})',
          cljList([
            cljVector([cljKeyword(':a'), cljNumber(1)]),
            cljVector([cljKeyword(':b'), cljNumber(2)]),
          ]),
        ],
        ['(seq [])', null],
        ["(seq '())", null],
        ['(seq nil)', null],
      ])(
        'should evaluate seq core function: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(toCljValue(expected))
        }
      )

      it.each([
        ['(seq "abc")', 'seq expects a collection or nil, got "abc"'],
        ['(seq 1)', 'seq expects a collection or nil, got 1'],
        ['(seq true)', 'seq expects a collection or nil, got true'],
      ])(
        'should throw on invalid seq arguments: %s should throw "%s"',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('reduce', () => {
      it.each([
        // 3-arg form: with initial value
        ['(reduce + 0 [1 2 3])', 6],
        ['(reduce + 0 [])', 0],
        ['(reduce + 42 [])', 42],
        ["(reduce + 0 '(1 2 3))", 6],
        ['(reduce * 1 [1 2 3 4])', 24],
        ['(reduce conj [] [1 2 3])', [1, 2, 3]],
        [
          `(reduce
         (fn [acc entry] (assoc acc (get entry 0) (* 2 (get entry 1))))
         {}
         {:a 1 :b 2 :c 3})`,
          cljMap([
            [cljKeyword(':a'), cljNumber(2)],
            [cljKeyword(':b'), cljNumber(4)],
            [cljKeyword(':c'), cljNumber(6)],
          ]),
        ],
        // 2-arg form: no initial value
        ['(reduce + [1 2 3])', 6],
        ['(reduce + [42])', 42],
        ['(reduce str \'("a" "b" "c"))', 'abc'],
      ])(
        'should evaluate reduce core function: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(toCljValue(expected))
        }
      )

      it.each([
        ['(reduce)', 'reduce expects a function as first argument'],
        [
          '(reduce 1 [1 2 3])',
          'reduce expects a function as first argument, got 1',
        ],
        ['(reduce + "abc")', 'reduce expects a collection, got "abc"'],
        ['(reduce + 0 "abc")', 'reduce expects a collection, got "abc"'],
        ['(reduce +)', 'reduce expects 2 or 3 arguments'],
        ['(reduce + 0 [] [])', 'reduce expects 2 or 3 arguments'],
        [
          '(reduce + [])',
          'reduce called on empty collection with no initial value',
        ],
      ])(
        'should throw on invalid reduce arguments: %s should throw "%s"',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('eval', () => {
      it.each([
        ['(eval (quote (+ 1 2 3)))', 6],
        ["(eval '(+ 1 2 3))", 6],
        [
          `(eval '(def x 10))
      (eval 'x)`,
          10,
        ],
      ])(
        'should evaluate eval core function %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(toCljValue(expected))
        }
      )

      it.each([['(eval)', 'eval expects a form as argument']])(
        'should throw on invalid eval arguments: %s should throw "%s"',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('apply', () => {
      it.each([
        ['(apply + [1 2 3])', 6],
        ['(apply + 42 [1 2 3])', 48],
        ['(apply + 0 [1 2 3])', 6],
        [
          `(def inc (fn [n] (+ n 1)))
      (apply map [inc [1 2 3 4 5]])`,
          [2, 3, 4, 5, 6],
        ],
      ])(
        'should evaluate apply core function %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(toCljValue(expected))
        }
      )
    })

    describe('inc and dec', () => {
      it.each([
        ['(inc 0)', 1],
        ['(inc 5)', 6],
        ['(inc -1)', 0],
        ['(dec 5)', 4],
        ['(dec 0)', -1],
        ['(dec 1)', 0],
      ])('should evaluate inc / dec: %s → %s', (code, expected) => {
        const session = createSession()
        const result = session.evaluate(code)
        expect(result).toMatchObject(toCljValue(expected))
      })

      it.each([
        ['(inc "a")', 'inc expects a number, got "a"'],
        ['(inc nil)', 'inc expects a number'],
        ['(dec "a")', 'dec expects a number, got "a"'],
        ['(dec nil)', 'dec expects a number'],
      ])(
        'should throw on invalid inc / dec arguments: %s → "%s"',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('max and min', () => {
      it.each([
        ['(max 3)', 3],
        ['(max 1 2 3)', 3],
        ['(max 3 1 2)', 3],
        ['(max -1 -5 -2)', -1],
        ['(min 3)', 3],
        ['(min 1 2 3)', 1],
        ['(min 3 1 2)', 1],
        ['(min -1 -5 -2)', -5],
      ])('should evaluate max / min: %s → %s', (code, expected) => {
        const session = createSession()
        const result = session.evaluate(code)
        expect(result).toMatchObject(toCljValue(expected))
      })

      it.each([
        ['(max)', 'max expects at least one argument'],
        ['(max 1 "a")', 'max expects all arguments to be numbers'],
        ['(min)', 'min expects at least one argument'],
        ['(min 1 "a")', 'min expects all arguments to be numbers'],
      ])(
        'should throw on invalid max / min arguments: %s → "%s"',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('keys and vals', () => {
      it.each([
        ['(keys {:a 1 :b 2})', [cljKeyword(':a'), cljKeyword(':b')]],
        ['(keys {})', []],
        ['(vals {:a 1 :b 2})', [1, 2]],
        [
          '(vals {:a 1 :b 2 :c [1 2 3]})',
          [1, 2, cljVector([cljNumber(1), cljNumber(2), cljNumber(3)])],
        ],
        ['(vals {})', []],
      ])('should evaluate keys / vals: %s → %s', (code, expected) => {
        const session = createSession()
        const result = session.evaluate(code)
        expect(result).toMatchObject(
          cljVector((expected as any[]).map(toCljValue))
        )
      })

      it.each([
        ['(keys [1 2 3])', 'keys expects a map'],
        ['(keys "abc")', 'keys expects a map'],
        ['(vals [1 2 3])', 'vals expects a map'],
        ['(vals "abc")', 'vals expects a map'],
      ])(
        'should throw on invalid keys / vals arguments: %s → "%s"',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('nth', () => {
      it.each([
        ['(nth [10 20 30] 0)', 10],
        ['(nth [10 20 30] 2)', 30],
        ["(nth '(10 20 30) 1)", 20],
        ['(nth [10 20 30] 5 :missing)', cljKeyword(':missing')],
        ["(nth '() 0 :missing)", cljKeyword(':missing')],
      ])('should evaluate nth: %s → %s', (code, expected) => {
        const session = createSession()
        const result = session.evaluate(code)
        expect(result).toMatchObject(toCljValue(expected as any))
      })

      it.each([
        ['(nth [1 2 3] 5)', 'nth index 5 is out of bounds'],
        ["(nth '(1 2) 10)", 'nth index 10 is out of bounds'],
        ['(nth {:a 1} 0)', 'nth expects a list or vector'],
        ['(nth [1 2] "a")', 'nth expects a number index'],
      ])(
        'should throw on invalid nth arguments: %s → "%s"',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('take and drop', () => {
      it('returns a transducer when given 1 arg', () => {
        const session = createSession()
        expect(session.evaluate('(take 3)').kind).toBe('function')
        expect(session.evaluate('(drop 3)').kind).toBe('function')
      })

      it.each([
        ['(take 2 [1 2 3 4])', [1, 2]],
        ['(take 0 [1 2 3])', []],
        ['(take -1 [1 2 3])', []],
        ['(take 10 [1 2 3])', [1, 2, 3]],
        // list input now returns a vector
        ["(take 2 '(1 2 3 4))", [1, 2]],
        [
          '(take 2 {:a 1 :b 2 :c 3})',
          [
            cljVector([cljKeyword(':a'), cljNumber(1)]),
            cljVector([cljKeyword(':b'), cljNumber(2)]),
          ],
        ],
        ['(drop 2 [1 2 3 4])', [3, 4]],
        ['(drop 0 [1 2 3])', [1, 2, 3]],
        ['(drop -1 [1 2 3])', [1, 2, 3]],
        ['(drop 10 [1 2 3])', []],
        ["(drop 1 '(1 2 3))", [2, 3]],
      ])('should evaluate take / drop: %s → %s', (code, expected) => {
        const session = createSession()
        const result = session.evaluate(code)
        expect(result).toMatchObject(
          cljVector((expected as any[]).map(toCljValue))
        )
      })

      it.each([
        // take/drop are now Clojure fns; non-number n causes dec error on first step
        ['(take "a" [1 2 3])', 'dec expects a number'],
        ['(take 2 "abc")', 'transduce expects a collection'],
        ['(drop "a" [1 2 3])', 'dec expects a number'],
        ['(drop 2 "abc")', 'transduce expects a collection'],
      ])(
        'should throw on invalid take / drop arguments: %s → "%s"',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('concat', () => {
      it.each([
        ['(concat)', []],
        ['(concat [1 2 3])', [1, 2, 3]],
        ["(concat [1 2] '(3 4))", [1, 2, 3, 4]],
        ["(concat '(1) [2] {:a 3})", [1, 2, [cljKeyword(':a'), 3]]],
        [
          "(concat '(1) [2 {:a 3}])",
          [
            cljNumber(1),
            cljNumber(2),
            cljMap([[cljKeyword(':a'), cljNumber(3)]]),
          ],
        ],
        ['(concat [] [])', []],
      ])('should evaluate concat: %s → %s', (code, expected) => {
        const session = createSession()
        const result = session.evaluate(code)
        expect(result).toMatchObject(
          cljList((expected as any[]).map(toCljValue))
        )
      })

      it.each([
        ['(concat 1 [2 3])', 'concat expects collections, got 1'],
        ['(concat [1 2] "abc")', 'concat expects collections, got "abc"'],
      ])(
        'should throw on invalid concat arguments: %s → "%s"',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('into', () => {
      it.each([
        ["(into [] '(1 2 3))", [1, 2, 3]],
        ['(into [10] [1 2 3])', [10, 1, 2, 3]],
        ['(into [] [])', []],
      ])(
        'should evaluate into with vector target: %s → %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(
            cljVector((expected as number[]).map(toCljValue))
          )
        }
      )

      it.each([
        ["(into '() [1 2 3])", [3, 2, 1]],
        ["(into '() [])", []],
      ])(
        'should evaluate into with list target (reverses): %s → %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(
            cljList((expected as number[]).map(toCljValue))
          )
        }
      )

      it.each([
        [
          '(into {} [[:a 1] [:b 2]])',
          cljMap([
            [cljKeyword(':a'), cljNumber(1)],
            [cljKeyword(':b'), cljNumber(2)],
          ]),
        ],
        ['(into {} [])', {}],
      ])('should evaluate into with map target', (code, expected) => {
        const session = createSession()
        const result = session.evaluate(code)
        expect(result).toMatchObject(toCljValue(expected))
      })

      it.each([
        // into is now (reduce conj to from); errors surface from conj/reduce
        ['(into 1 [1 2])', 'conj expects a collection'],
        ['(into [] "abc")', 'reduce expects a collection'],
        [
          '(into {} [1 2])',
          'conj on maps expects each argument to be a vector key-pair',
        ],
      ])(
        'should throw on invalid into arguments: %s → "%s"',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('zipmap', () => {
      it('should evaluate zipmap with equal length collections', () => {
        const session = createSession()
        expect(session.evaluate('(zipmap [:a :b :c] [1 2 3])')).toMatchObject(
          cljMap([
            [cljKeyword(':a'), cljNumber(1)],
            [cljKeyword(':b'), cljNumber(2)],
            [cljKeyword(':c'), cljNumber(3)],
          ])
        )
      })

      it('should evaluate zipmap stopping at shorter keys', () => {
        const session = createSession()
        expect(session.evaluate('(zipmap [:a] [1 2 3])')).toMatchObject(
          cljMap([[cljKeyword(':a'), cljNumber(1)]])
        )
      })

      it('should evaluate zipmap stopping at shorter vals', () => {
        const session = createSession()
        expect(session.evaluate('(zipmap [:a :b :c] [1])')).toMatchObject(
          cljMap([[cljKeyword(':a'), cljNumber(1)]])
        )
      })

      it('should evaluate zipmap with empty collections', () => {
        const session = createSession()
        expect(session.evaluate('(zipmap [] [])')).toMatchObject(cljMap([]))
      })

      it.each([
        [
          '(zipmap "abc" [1 2])',
          'zipmap expects a collection as first argument',
        ],
        [
          '(zipmap [:a :b] 1)',
          'zipmap expects a collection as second argument',
        ],
      ])(
        'should throw on invalid zipmap arguments: %s → "%s"',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('type predicates', () => {
      it.each([
        ['(number? 42)', true],
        ['(number? "a")', false],
        ['(number? nil)', false],
        ['(string? "hello")', true],
        ['(string? 1)', false],
        ['(string? nil)', false],
        ['(boolean? true)', true],
        ['(boolean? false)', true],
        ['(boolean? nil)', false],
        ['(vector? [1 2])', true],
        ["(vector? '(1 2))", false],
        ['(vector? nil)', false],
        ["(list? '(1 2))", true],
        ["(list? '(1 2))", true],
        ['(list? [1 2])', false],
        ['(list? nil)', false],
        ['(map? {:a 1})', true],
        ['(map? [1 2])', false],
        ['(keyword? :foo)', true],
        ['(keyword? "foo")', false],
        ['(keyword? nil)', false],
        ['(symbol? (quote x))', true],
        ["(symbol? 'x)", true],
        ['(symbol? :x)', false],
        ['(symbol? nil)', false],
        ['(fn? +)', true],
        ['(fn? (fn [x] x))', true],
        ['(fn? nil)', false],
        ['(fn? 42)', false],
        ['(coll? [1 2])', true],
        ["(coll? '(1 2))", true],
        ['(coll? {:a 1})', true],
        ['(coll? 42)', false],
        ['(coll? nil)', false],
      ])('should evaluate type predicate: %s → %s', (code, expected) => {
        const session = createSession()
        const result = session.evaluate(code)
        expect(result).toMatchObject(toCljValue(expected))
      })
    })

    describe('type', () => {
      it.each([
        ['(type 42)', cljKeyword(':number')],
        ['(type "hello")', cljKeyword(':string')],
        ['(type true)', cljKeyword(':boolean')],
        ['(type nil)', cljKeyword(':nil')],
        ['(type :foo)', cljKeyword(':keyword')],
        ["(type 'x)", cljKeyword(':symbol')],
        ["(type '(1 2))", cljKeyword(':list')],
        ['(type [1 2])', cljKeyword(':vector')],
        ['(type {:a 1})', cljKeyword(':map')],
        ['(type +)', cljKeyword(':function')],
        ['(type (fn [x] x))', cljKeyword(':function')],
      ])('should evaluate type: %s → %s', (code, expected) => {
        const session = createSession()
        const result = session.evaluate(code)
        expect(result).toMatchObject(expected)
      })
    })
  })

  describe('keywords', () => {
    it.each([
      [`(:the-key {:the-key 1})`, 1],
      [`(:the-key [])`, null],
      [`(:the-key '())`, null],
      [`(:the-key 1)`, null],
      [`(:the-key true)`, null],
      [`(:a {:a 1})`, 1],
      [`(:a [])`, null],
      [`(:a 1)`, null],
      [`(:a 1 "default")`, 'default'],
      [`(:a true)`, null],
      [`(:0 [1 2 3])`, null],
      [`(:a (:b {:b {:a 2}}))`, 2],
      [`(:c (:b {:b {:a 2}}) 2)`, 2],
    ])(
      'keywords should call themselves in a map: %s should be %s',
      (code, expected) => {
        const session = createSession()
        const result = session.evaluate(code)
        expect(result).toMatchObject(toCljValue(expected))
      }
    )
  })

  describe('rest parameters', () => {
    it('should capture rest parameter in user defined function', () => {
      const session = createSession()
      const result = session.evaluate('(fn [a b c & rest] [a b c rest])')
      expect(result).toMatchObject(
        cljFunction(
          [cljSymbol('a'), cljSymbol('b'), cljSymbol('c')],
          cljSymbol('rest'),
          [
            cljVector([
              cljSymbol('a'),
              cljSymbol('b'),
              cljSymbol('c'),
              cljSymbol('rest'),
            ]),
          ],
          session.getNs('user')!
        )
      )
    })

    it.each([
      ['(fn [a b & c & rest] [a b c rest])', '& can only appear once'],
      [`(fn [a b & c rest] [a b c rest])`, '& must be second-to-last argument'],
    ])('should throw on invalid rest usage: %s → "%s"', (code, expected) => {
      expectEvalError(code, expected)
    })

    it.each([
      [
        '((fn [a b & rest] [a b rest]) 1 2 3 4 5)',
        [1, 2, cljList([cljNumber(3), cljNumber(4), cljNumber(5)])],
      ],
      ['((fn [a b & rest] [a b rest]) 1 2)', [1, 2, null]],
    ])(
      'should hydrate rest parameter with extra bindings: %s → %o',
      (code, expected) => {
        const session = createSession()
        const result = session.evaluate(code)
        expect(result).toMatchObject(toCljValue(expected))
      }
    )

    it.each([
      ['((fn [a b & rest] [a b rest]) 1)', 'No matching arity for 1 arguments'],
      ['((fn [a b] [a b]) 1 2 3)', 'No matching arity for 3 arguments'],
    ])('should throw on invalid rest usage: %s → "%s"', (code, expected) => {
      expectEvalError(code, expected)
    })
  })

  describe('macros', () => {
    it.each([
      ['(defmacro pass-through [x] x) (pass-through 42)', 42],
      ['(defmacro pass-through [x] x) (pass-through "hello")', 'hello'],
      ['(defmacro pass-through [x] x) (pass-through true)', true],
      ['(defmacro pass-through [x] x) (pass-through nil)', null],
      ['(defmacro pass-through [x] x) (pass-through :foo)', cljKeyword(':foo')],
    ])('should pass scalars through', (code, expected) => {
      const session = createSession()
      expect(session.evaluate(code)).toMatchObject(toCljValue(expected))
    })

    it.each([
      ['`x', cljSymbol('x')],
      ['`(a b c)', cljList([cljSymbol('a'), cljSymbol('b'), cljSymbol('c')])],
      ['`[a b c]', cljVector([cljSymbol('a'), cljSymbol('b'), cljSymbol('c')])],
      ['`{:a 1}', cljMap([[cljKeyword(':a'), cljNumber(1)]])],
    ])('should pass symbols through as symbols: %s → %s', (code, expected) => {
      const session = createSession()
      expect(session.evaluate(code)).toMatchObject(expected)
    })

    it('should evaluate unquote', () => {
      const session = createSession()
      expect(session.evaluate('(let [x 42] `~x)')).toMatchObject(cljNumber(42))
    })

    it('should evaluate unquote splicing', () => {
      const session = createSession()
      expect(session.evaluate('(let [xs [1 2 3]] `(a ~@xs b))')).toMatchObject(
        cljList([
          cljSymbol('a'),
          cljNumber(1),
          cljNumber(2),
          cljNumber(3),
          cljSymbol('b'),
        ])
      )
    })

    it.each([
      ['(my-when true 1 2 3)', 3],
      ['(my-when false 1 2 3)', null],
      ['(my-when (= 0 (- 1 1)) :zero)', cljKeyword(':zero')],
      ['(my-when (= 0 (- 1 2)) :zero)', cljNil()],
    ])(
      'should handle defmacro with quasiquote body: custom when macro: %s',
      (code, expected) => {
        const session = createSession()
        session.evaluate(
          '(defmacro my-when [cond & body] `(if ~cond (do ~@body) nil))'
        )
        expect(session.evaluate(code)).toMatchObject(toCljValue(expected))
      }
    )

    it.each([
      ['(defn square [x] (* x x)) (square 5)', 25],
      ['(defn add [a b] (+ a b)) (add 3 4)', 7],
      [
        `(defn fib [n] 
           (if (<= n 1) 
                 n
                 (+ (fib (- n 1)) 
                    (fib (- n 2)))))
          (fib 10)`,
        55,
      ],
    ])('should evaluate defn as a macro: %s -> %s', (code, expected) => {
      const session = createSession()
      session.evaluate(`(defmacro defn [name params & body]
        \`(def ~name (fn ~params ~@body)))`)

      const result = session.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected))
    })
  })

  describe('loop/recur', () => {
    it('should compute factorial via loop/recur', () => {
      const session = createSession()
      const result = session.evaluate(`
        (loop [i 5 acc 1]
          (if (<= i 1)
            acc
            (recur (dec i) (* acc i))))
      `)
      expect(result).toMatchObject(toCljValue(120))
    })

    it('should return body value when no recur is hit (acts like let)', () => {
      const session = createSession()
      expect(session.evaluate('(loop [x 1] x)')).toMatchObject(toCljValue(1))
    })

    it('should evaluate initial bindings sequentially', () => {
      const session = createSession()
      expect(session.evaluate('(loop [a 1 b (+ a 1)] b)')).toMatchObject(
        toCljValue(2)
      )
    })

    it('should throw on recur arity mismatch', () => {
      expectEvalError(
        '(loop [a 1 b 2] (recur 10))',
        'recur expects 2 arguments but got 1'
      )
    })

    it('should support fn-level recur', () => {
      const session = createSession()
      const result = session.evaluate(`
        ((fn [n acc]
           (if (<= n 1) acc (recur (dec n) (* n acc))))
         5 1)
      `)
      expect(result).toMatchObject(toCljValue(120))
    })

    it('should support nested loops where inner recur targets inner loop', () => {
      const session = createSession()
      const result = session.evaluate(`
        (loop [i 0 outer-sum 0]
          (if (>= i 3)
            outer-sum
            (recur (inc i)
                   (+ outer-sum
                      (loop [j 0 inner-sum 0]
                        (if (>= j 3)
                          inner-sum
                          (recur (inc j) (inc inner-sum))))))))
      `)
      expect(result).toMatchObject(toCljValue(9))
    })

    it('should build a collection via loop/recur', () => {
      const session = createSession()
      const result = session.evaluate(`
        (loop [xs (list 1 2 3) acc []]
          (if (nil? (seq xs))
            acc
            (recur (rest xs) (conj acc (* (first xs) 2)))))
      `)
      expect(result).toMatchObject(toCljValue([2, 4, 6]))
    })

    it('should throw on stray recur outside loop or fn', () => {
      expectEvalError('(recur 1)', 'recur called outside of loop or fn')
    })

    it('should support recur with rest params in fn', () => {
      const session = createSession()
      const result = session.evaluate(`
        ((fn [& args]
           (if (nil? (seq args))
             0
             (+ (first args) (apply (fn [& args]
               (if (nil? (seq args))
                 0
                 (+ (first args) (apply (fn [& a] 0) (rest args))))) (rest args)))))
         1 2 3)
      `)
      expect(result).toMatchObject(toCljValue(3))
    })

    it('should compute sum of 0..10 via loop/recur', () => {
      const session = createSession()
      const result = session.evaluate(`
        (loop [i 0 sum 0]
          (if (> i 10)
            sum
            (recur (inc i) (+ sum i))))
      `)
      expect(result).toMatchObject(toCljValue(55))
    })

    it('should support recur in a defn function body', () => {
      const session = createSession()
      const result = session.evaluate(`
        (defn factorial [n]
            (loop [i n acc 1]
              (if (<= i 1)
                acc
                (recur (dec i) (* acc i)))))
        (factorial 10)
      `)
      expect(result).toMatchObject(toCljValue(3628800))
    })
  })

  describe('multi-arity fn', () => {
    it('should dispatch on argument count', () => {
      const session = createSession()
      session.evaluate(`
        (def f (fn
          ([] 0)
          ([x] x)
          ([x y] (+ x y))))
      `)
      expect(session.evaluate('(f)')).toMatchObject(toCljValue(0))
      expect(session.evaluate('(f 5)')).toMatchObject(toCljValue(5))
      expect(session.evaluate('(f 3 4)')).toMatchObject(toCljValue(7))
    })

    it('should prefer exact fixed arity over variadic', () => {
      const session = createSession()
      session.evaluate(`
        (def f (fn
          ([x] :exact)
          ([x & rest] :variadic)))
      `)
      expect(session.evaluate('(f 1)')).toMatchObject(cljKeyword(':exact'))
      expect(session.evaluate('(f 1 2 3)')).toMatchObject(
        cljKeyword(':variadic')
      )
    })

    it('should throw on arity mismatch with multi-arity fn', () => {
      expectEvalError(
        '((fn ([] 0) ([x y] (+ x y))) 1)',
        'No matching arity for 1 arguments'
      )
    })

    it('should support multi-arity defmacro', () => {
      const session = createSession()
      session.evaluate(`
        (defmacro my-and
          ([] true)
          ([x] x)
          ([x & more] \`(if ~x (my-and ~@more) ~x)))
      `)
      expect(session.evaluate('(my-and)')).toMatchObject(toCljValue(true))
      expect(session.evaluate('(my-and 42)')).toMatchObject(toCljValue(42))
      expect(session.evaluate('(my-and true true 99)')).toMatchObject(
        toCljValue(99)
      )
      expect(session.evaluate('(my-and true false 99)')).toMatchObject(
        toCljValue(false)
      )
    })

    it('should support recur inside a specific arity', () => {
      const session = createSession()
      const result = session.evaluate(`
        (def factorial (fn
          ([n] (factorial n 1))
          ([n acc]
            (if (<= n 1) acc (recur (dec n) (* n acc))))))
        (factorial 5)
      `)
      expect(result).toMatchObject(toCljValue(120))
    })

    it('should throw when defining more than one variadic arity', () => {
      expectEvalError(
        '(fn ([x & a] x) ([y & b] y))',
        'At most one variadic arity is allowed per function'
      )
    })

    it('should work with named multi-arity via def', () => {
      const session = createSession()
      session.evaluate(`
        (def greet (fn
          ([] "hi")
          ([name] (str "hi " name))))
      `)
      expect(session.evaluate('(greet)')).toMatchObject(toCljValue('hi'))
      expect(session.evaluate('(greet "world")')).toMatchObject(
        toCljValue('hi world')
      )
    })

    it('should handle single-arity fn the same as before', () => {
      const session = createSession()
      expect(session.evaluate('((fn [x y] (+ x y)) 3 4)')).toMatchObject(
        toCljValue(7)
      )
    })

    it('should handle multi arity with defn macro', () => {
      const session = createSession()
      session.evaluate(`
      (defn greet 
        ([] "hi")
        ([x] (str "hi " x))
        ([x y] (str "hi " x " and " y)))`)
      expect(session.evaluate('(greet)')).toMatchObject(toCljValue('hi'))
      expect(session.evaluate('(greet "world")')).toMatchObject(
        toCljValue('hi world')
      )
      expect(session.evaluate('(greet "world" "universe")')).toMatchObject(
        toCljValue('hi world and universe')
      )
    })
  })

  describe('anonymous function reader macro #(...)', () => {
    it('should evaluate a single-arg #(* 2 %)', () => {
      const session = createSession()
      expect(session.evaluate('(#(* 2 %) 5)')).toMatchObject(cljNumber(10))
    })

    it('should evaluate a two-arg #(+ %1 %2)', () => {
      const session = createSession()
      expect(session.evaluate('(#(+ %1 %2) 3 4)')).toMatchObject(cljNumber(7))
    })

    it('should use % and %1 interchangeably', () => {
      const session = createSession()
      expect(session.evaluate('(#(str % "-" %1) "x")')).toMatchObject(
        cljString('x-x')
      )
    })

    it('should work with map: (map #(* % 2) (range 5))', () => {
      const session = createSession()
      expect(
        session.evaluate('(into [] (map #(* % 2) (range 5)))')
      ).toMatchObject(
        cljVector([
          cljNumber(0),
          cljNumber(2),
          cljNumber(4),
          cljNumber(6),
          cljNumber(8),
        ])
      )
    })

    it('should support a rest-arg #(apply + %&)', () => {
      const session = createSession()
      expect(session.evaluate('(#(apply + %&) 1 2 3 4)')).toMatchObject(
        cljNumber(10)
      )
    })

    it('should support mixed fixed and rest args', () => {
      const session = createSession()
      expect(
        session.evaluate('(#(str %1 " " (apply str %&)) "hello" "world" "!")')
      ).toMatchObject(cljString('hello world!'))
    })

    it('should support a zero-arg #(...)', () => {
      const session = createSession()
      expect(session.evaluate('(#(+ 1 2))')).toMatchObject(cljNumber(3))
    })

    it('should infer arity from highest %N index', () => {
      const session = createSession()
      expect(session.evaluate('(#(+ %1 %3) 10 0 5)')).toMatchObject(
        cljNumber(15)
      )
    })

    it('should be composable with filter', () => {
      const session = createSession()
      expect(
        session.evaluate('(into [] (filter #(even? %) (range 6)))')
      ).toMatchObject(cljVector([cljNumber(0), cljNumber(2), cljNumber(4)]))
    })
  })

  describe('multimethods', () => {
    it('defmulti creates and binds a multimethod in the namespace', () => {
      const session = createSession()
      session.evaluate('(defmulti area :shape)')
      const mm = session.evaluate('area')
      expect(mm.kind).toBe('multi-method')
      if (mm.kind !== 'multi-method') throw new Error('not a multimethod')
      expect(mm.name).toBe('area')
    })

    it('defmethod adds a method for a dispatch value', () => {
      const session = createSession()
      session.evaluate('(defmulti area :shape)')
      session.evaluate('(defmethod area :rect [r] (* (:w r) (:h r)))')
      const mm = session.evaluate('area')
      if (mm.kind !== 'multi-method') throw new Error('not a multimethod')
      expect(mm.methods.length).toBe(1)
      expect(mm.methods[0].dispatchVal).toMatchObject(cljKeyword(':rect'))
    })

    it('dispatches on a keyword dispatch fn', () => {
      const session = createSession()
      session.evaluate('(defmulti area :shape)')
      session.evaluate('(defmethod area :rect [r] (* (:w r) (:h r)))')
      session.evaluate('(defmethod area :circle [c] (* 2 (:r c)))')
      expect(session.evaluate('(area {:shape :rect :w 4 :h 3})')).toMatchObject(
        cljNumber(12)
      )
      expect(session.evaluate('(area {:shape :circle :r 5})')).toMatchObject(
        cljNumber(10)
      )
    })

    it('dispatches on an explicit fn dispatch fn', () => {
      const session = createSession()
      session.evaluate('(defmulti greet (fn [x] (:lang x)))')
      session.evaluate('(defmethod greet :en [x] "hello")')
      session.evaluate('(defmethod greet :pt [x] "oi")')
      expect(session.evaluate('(greet {:lang :en})')).toMatchObject(
        cljString('hello')
      )
      expect(session.evaluate('(greet {:lang :pt})')).toMatchObject(
        cljString('oi')
      )
    })

    it('falls back to :default when no method matches', () => {
      const session = createSession()
      session.evaluate('(defmulti area :shape)')
      session.evaluate('(defmethod area :rect [r] (* (:w r) (:h r)))')
      session.evaluate('(defmethod area :default [x] -1)')
      expect(
        session.evaluate('(area {:shape :triangle :w 3 :h 4})')
      ).toMatchObject(cljNumber(-1))
    })

    it('throws when no method matches and no :default', () => {
      const session = createSession()
      session.evaluate('(defmulti area :shape)')
      session.evaluate('(defmethod area :rect [r] (* (:w r) (:h r)))')
      expect(() => session.evaluate('(area {:shape :triangle})')).toThrow(
        'No method in multimethod'
      )
    })

    it('supports open extension — defmethod after the initial defmulti block', () => {
      const session = createSession()
      session.evaluate('(defmulti area :shape)')
      session.evaluate('(defmethod area :rect [r] (* (:w r) (:h r)))')
      expect(session.evaluate('(area {:shape :rect :w 5 :h 2})')).toMatchObject(
        cljNumber(10)
      )
      // extend later
      session.evaluate('(defmethod area :square [s] (* (:side s) (:side s)))')
      expect(session.evaluate('(area {:shape :square :side 4})')).toMatchObject(
        cljNumber(16)
      )
    })

    it('dispatches on a computed vector dispatch value', () => {
      const session = createSession()
      session.evaluate('(defmulti serialize (fn [x fmt] [(:type x) fmt]))')
      session.evaluate('(defmethod serialize [:user :json] [x _] "user-json")')
      session.evaluate('(defmethod serialize [:user :edn] [x _] "user-edn")')
      expect(session.evaluate('(serialize {:type :user} :json)')).toMatchObject(
        cljString('user-json')
      )
      expect(session.evaluate('(serialize {:type :user} :edn)')).toMatchObject(
        cljString('user-edn')
      )
    })

    it('re-defining a dispatch value replaces the old method', () => {
      const session = createSession()
      session.evaluate('(defmulti area :shape)')
      session.evaluate('(defmethod area :rect [r] 0)')
      session.evaluate('(defmethod area :rect [r] (* (:w r) (:h r)))')
      const mm = session.evaluate('area')
      if (mm.kind !== 'multi-method') throw new Error('not a multimethod')
      expect(mm.methods.length).toBe(1)
      expect(session.evaluate('(area {:shape :rect :w 3 :h 4})')).toMatchObject(
        cljNumber(12)
      )
    })

    it('throws a clear error when defmethod targets a non-multimethod', () => {
      const session = createSession()
      session.evaluate('(def area 42)')
      expect(() => session.evaluate('(defmethod area :rect [r] 0)')).toThrow(
        'is not a multimethod'
      )
    })

    it('supports multiple args via fn dispatch', () => {
      const session = createSession()
      session.evaluate('(defmulti combine (fn [a b] [(:kind a) (:kind b)]))')
      session.evaluate(
        '(defmethod combine [:num :num] [a b] (+ (:val a) (:val b)))'
      )
      session.evaluate(
        '(defmethod combine [:str :str] [a b] (str (:val a) (:val b)))'
      )
      expect(
        session.evaluate('(combine {:kind :num :val 3} {:kind :num :val 4})')
      ).toMatchObject(cljNumber(7))
      expect(
        session.evaluate(
          '(combine {:kind :str :val "foo"} {:kind :str :val "bar"})'
        )
      ).toMatchObject(cljString('foobar'))
    })

    it('supports multi-arity handlers — a defmethod can have multiple arities', () => {
      // defmethod passes its fn-tail directly to fn, exactly like defn.
      // So (defmethod foo :bar ([x] ...) ([x y] ...)) is valid and gives
      // the :bar dispatch branch two arities. Dark magic. Works as expected.
      const session = createSession()
      session.evaluate('(defmulti area :shape)')
      session.evaluate(`
        (defmethod area :rect
          ([r]       (* (:w r) (:h r)))
          ([r scale] (* (:w r) (:h r) scale)))
      `)
      expect(session.evaluate('(area {:shape :rect :w 3 :h 4})')).toMatchObject(
        cljNumber(12)
      )
      expect(
        session.evaluate('(area {:shape :rect :w 3 :h 4} 2)')
      ).toMatchObject(cljNumber(24))
    })
  })

  describe('qualified symbol resolution', () => {
    function sessionWithNs(nsName: string, defs: string) {
      const s = createSession()
      s.loadFile(`(ns ${nsName})\n${defs}`)
      return s
    }

    it('resolves ns/sym by full namespace name without require', () => {
      const s = sessionWithNs('my.utils', '(def helper 42)')
      s.setNs('user')
      expect(s.evaluate('my.utils/helper')).toEqual(cljNumber(42))
    })

    it('resolves user/sym for bindings defined in the user namespace', () => {
      const s = createSession()
      s.evaluate('(def answer 42)')
      expect(s.evaluate('user/answer')).toEqual(cljNumber(42))
    })

    it('alias takes precedence over direct namespace name', () => {
      const s = sessionWithNs('math.ops', '(def pi 3)')
      s.setNs('user')
      s.evaluate("(require '[math.ops :as m])")
      expect(s.evaluate('m/pi')).toEqual(cljNumber(3))
      expect(s.evaluate('math.ops/pi')).toEqual(cljNumber(3))
    })

    it('throws for nonexistent namespace', () => {
      const s = createSession()
      expect(() => s.evaluate('nonexistent.ns/foo')).toThrow(
        'No such namespace or alias: nonexistent.ns'
      )
    })

    it('throws for symbol not found in a valid namespace', () => {
      const s = sessionWithNs('my.ns', '(def x 1)')
      s.setNs('user')
      expect(() => s.evaluate('my.ns/nonexistent')).toThrow('not found')
    })
  })

  describe('auto-qualified keyword expansion (::)', () => {
    it('::foo expands to :user/foo in the user namespace', () => {
      const s = createSession()
      expect(s.evaluate('::foo')).toEqual(cljKeyword(':user/foo'))
    })

    it('::foo expands to the namespace declared in the file', () => {
      const s = createSession()
      s.loadFile('(ns my.domain)\n(def k ::event)')
      s.setNs('user')
      expect(s.evaluate('my.domain/k')).toEqual(cljKeyword(':my.domain/event'))
    })

    it('::foo expanded keyword can be used as a map key', () => {
      const s = createSession()
      s.evaluate('(def m {::status :ok})')
      expect(s.evaluate('(:user/status m)')).toEqual(cljKeyword(':ok'))
    })
  })

  describe('atoms', () => {
    it('(atom 42) creates an atom holding 42', () => {
      const s = createSession()
      const result = s.evaluate('(atom 42)')
      expect(result.kind).toBe('atom')
      expect((result as CljAtom).value).toEqual(cljNumber(42))
    })

    it('(deref a) returns the current value of the atom', () => {
      const s = createSession()
      expect(s.evaluate('(let [a (atom 42)] (deref a))')).toEqual(cljNumber(42))
    })

    it('@a is equivalent to (deref a)', () => {
      const s = createSession()
      expect(s.evaluate('(let [a (atom 42)] @a)')).toEqual(cljNumber(42))
    })

    it('(swap! a inc) applies inc to the current value and stores the result', () => {
      const s = createSession()
      expect(s.evaluate('(let [a (atom 0)] (swap! a inc) (deref a))')).toEqual(
        cljNumber(1)
      )
    })

    it('(swap! a + 10) passes extra args after current value', () => {
      const s = createSession()
      expect(s.evaluate('(let [a (atom 0)] (swap! a + 10) @a)')).toEqual(
        cljNumber(10)
      )
    })

    it('(swap! a f) returns the new value', () => {
      const s = createSession()
      expect(s.evaluate('(let [a (atom 5)] (swap! a * 3))')).toEqual(
        cljNumber(15)
      )
    })

    it('(reset! a 99) sets the atom value directly', () => {
      const s = createSession()
      expect(s.evaluate('(let [a (atom 0)] (reset! a 99) @a)')).toEqual(
        cljNumber(99)
      )
    })

    it('(reset! a v) returns the new value', () => {
      const s = createSession()
      expect(s.evaluate('(let [a (atom 0)] (reset! a 42))')).toEqual(
        cljNumber(42)
      )
    })

    it('swap! works with map values', () => {
      const s = createSession()
      expect(
        s.evaluate('(let [a (atom {:x 1})] (swap! a assoc :x 2) @a)')
      ).toEqual(cljMap([[cljKeyword(':x'), cljNumber(2)]]))
    })

    it('multiple swaps accumulate correctly', () => {
      const s = createSession()
      expect(
        s.evaluate(
          '(let [a (atom 0)] (swap! a inc) (swap! a inc) (swap! a inc) @a)'
        )
      ).toEqual(cljNumber(3))
    })

    it('(deref 42) throws EvaluationError', () => {
      expectEvalError('(deref 42)', 'deref expects an atom')
    })

    it('(swap! 42 inc) throws EvaluationError', () => {
      expectEvalError('(swap! 42 inc)', 'swap! expects an atom')
    })

    it('(reset! 42 1) throws EvaluationError', () => {
      expectEvalError('(reset! 42 1)', 'reset! expects an atom')
    })

    it('(atom? (atom 1)) returns true', () => {
      const s = createSession()
      expect(s.evaluate('(atom? (atom 1))')).toEqual(cljBoolean(true))
    })

    it('(atom? 42) returns false', () => {
      const s = createSession()
      expect(s.evaluate('(atom? 42)')).toEqual(cljBoolean(false))
    })

    it('atom can hold nil', () => {
      const s = createSession()
      expect(s.evaluate('(let [a (atom nil)] @a)')).toEqual(cljNil())
    })

    it('atom can be reset to nil', () => {
      const s = createSession()
      expect(s.evaluate('(let [a (atom 42)] (reset! a nil) @a)')).toEqual(
        cljNil()
      )
    })
  })

  // ── Transducer protocol ─────────────────────────────────────────────────

  describe('reduced / unreduced / ensure-reduced', () => {
    it('(reduced 42) creates a reduced wrapper', () => {
      const s = createSession()
      expect(s.evaluate('(reduced 42)').kind).toBe('reduced')
    })

    it('(reduced? (reduced 42)) is true', () => {
      const s = createSession()
      expect(s.evaluate('(reduced? (reduced 42))')).toEqual(cljBoolean(true))
    })

    it('(reduced? 42) is false', () => {
      const s = createSession()
      expect(s.evaluate('(reduced? 42)')).toEqual(cljBoolean(false))
    })

    it('(unreduced (reduced 42)) unwraps to 42', () => {
      const s = createSession()
      expect(s.evaluate('(unreduced (reduced 42))')).toEqual(cljNumber(42))
    })

    it('(unreduced 42) returns 42 unchanged', () => {
      const s = createSession()
      expect(s.evaluate('(unreduced 42)')).toEqual(cljNumber(42))
    })

    it('@(reduced 42) unwraps via deref', () => {
      const s = createSession()
      expect(s.evaluate('(deref (reduced 42))')).toEqual(cljNumber(42))
    })

    it('(ensure-reduced 42) wraps in reduced', () => {
      const s = createSession()
      expect(s.evaluate('(ensure-reduced 42)').kind).toBe('reduced')
    })

    it('(ensure-reduced (reduced 42)) returns the same reduced', () => {
      const s = createSession()
      expect(s.evaluate('(ensure-reduced (reduced 42))').kind).toBe('reduced')
    })

    it('reduce short-circuits on reduced', () => {
      const s = createSession()
      expect(
        s.evaluate(
          '(reduce (fn [acc x] (if (= x 3) (reduced acc) (conj acc x))) [] [1 2 3 4 5])'
        )
      ).toMatchObject(cljVector([cljNumber(1), cljNumber(2)]))
    })
  })

  describe('volatile!', () => {
    it('(volatile! 0) creates a volatile holding 0', () => {
      const s = createSession()
      expect(s.evaluate('(volatile! 0)').kind).toBe('volatile')
    })

    it('(volatile? (volatile! 0)) is true', () => {
      const s = createSession()
      expect(s.evaluate('(volatile? (volatile! 0))')).toEqual(cljBoolean(true))
    })

    it('(volatile? 42) is false', () => {
      const s = createSession()
      expect(s.evaluate('(volatile? 42)')).toEqual(cljBoolean(false))
    })

    it('@v returns current value', () => {
      const s = createSession()
      expect(s.evaluate('(let [v (volatile! 42)] @v)')).toEqual(cljNumber(42))
    })

    it('vreset! sets new value and returns it', () => {
      const s = createSession()
      expect(s.evaluate('(let [v (volatile! 0)] (vreset! v 99) @v)')).toEqual(
        cljNumber(99)
      )
    })

    it('vswap! applies a function and stores result', () => {
      const s = createSession()
      expect(s.evaluate('(let [v (volatile! 10)] (vswap! v + 5) @v)')).toEqual(
        cljNumber(15)
      )
    })

    it('vswap! returns the new value', () => {
      const s = createSession()
      expect(s.evaluate('(let [v (volatile! 0)] (vswap! v inc))')).toEqual(
        cljNumber(1)
      )
    })

    it('vreset! on non-volatile throws', () => {
      expectEvalError('(vreset! 42 1)', 'vreset! expects a volatile')
    })

    it('vswap! on non-volatile throws', () => {
      expectEvalError('(vswap! 42 inc)', 'vswap! expects a volatile')
    })
  })

  describe('transduce', () => {
    it('(transduce (map inc) conj [] [1 2 3]) produces [2 3 4]', () => {
      const s = createSession()
      expect(s.evaluate('(transduce (map inc) conj [] [1 2 3])')).toMatchObject(
        cljVector([cljNumber(2), cljNumber(3), cljNumber(4)])
      )
    })

    it('(transduce (filter even?) conj [] [1 2 3 4 5]) produces [2 4]', () => {
      const s = createSession()
      expect(
        s.evaluate('(transduce (filter even?) conj [] [1 2 3 4 5])')
      ).toMatchObject(cljVector([cljNumber(2), cljNumber(4)]))
    })

    it('(transduce (remove even?) conj [] [1 3 5]) produces [1 3 5]', () => {
      const s = createSession()
      expect(
        s.evaluate('(transduce (remove even?) conj [] [1 2 3 4 5])')
      ).toMatchObject(cljVector([cljNumber(1), cljNumber(3), cljNumber(5)]))
    })

    it('transduce over nil collection returns empty result', () => {
      const s = createSession()
      expect(s.evaluate('(transduce (map inc) conj [] nil)')).toMatchObject(
        cljVector([])
      )
    })

    it('comp composes transducers left-to-right', () => {
      const s = createSession()
      expect(
        s.evaluate(
          '(transduce (comp (map inc) (filter even?)) conj [] [1 2 3 4 5])'
        )
      ).toMatchObject(cljVector([cljNumber(2), cljNumber(4), cljNumber(6)]))
    })

    describe('3-arity (init derived from (f))', () => {
      it('(transduce (map inc) + [1 2 3]) sums incremented items, init from (+)', () => {
        // (+) = 0; map inc gives [2 3 4]; sum = 9
        const s = createSession()
        expect(s.evaluate('(transduce (map inc) + [1 2 3])')).toMatchObject(
          cljNumber(9)
        )
      })

      it('(transduce (filter even?) + [1 2 3 4 5]) sums even items', () => {
        // (+) = 0; filter even? gives [2 4]; sum = 6
        const s = createSession()
        expect(
          s.evaluate('(transduce (filter even?) + [1 2 3 4 5])')
        ).toMatchObject(cljNumber(6))
      })

      it('(transduce (map inc) * [1 2 3]) multiplies incremented items, init from (*)', () => {
        // (*) = 1; map inc gives [2 3 4]; product = 24
        const s = createSession()
        expect(s.evaluate('(transduce (map inc) * [1 2 3])')).toMatchObject(
          cljNumber(24)
        )
      })

      it('3-arity transduce over nil collection returns init', () => {
        // (+) = 0; nil → empty loop; completion returns 0
        const s = createSession()
        expect(s.evaluate('(transduce (map inc) + nil)')).toMatchObject(
          cljNumber(0)
        )
      })

      it('throws when f has no 0-arity', () => {
        // - requires at least 1 arg, so (-) throws
        const s = createSession()
        expect(() => s.evaluate('(transduce (map inc) - [1 2 3])')).toThrow()
      })
    })

    describe('completing', () => {
      it('completing wraps a 2-arity fn so it works with transduce completion step', () => {
        // (defn my-sum [acc x] (+ acc x)) has no 1-arity; without completing,
        // transduce would call (my-sum 9) at completion and throw an arity error.
        // completing adds ([x] (identity x)) so the completion just returns acc.
        const s = createSession()
        s.evaluate('(defn my-sum [acc x] (+ acc x))')
        expect(
          s.evaluate('(transduce (map inc) (completing my-sum) 0 [1 2 3])')
        ).toMatchObject(cljNumber(9))
      })

      it('completing accepts a custom completion fn', () => {
        // Use a completion fn that doubles the final result
        const s = createSession()
        s.evaluate('(defn my-sum [acc x] (+ acc x))')
        expect(
          s.evaluate(
            '(transduce (map inc) (completing my-sum (fn [r] (* r 2))) 0 [1 2 3])'
          )
        ).toMatchObject(cljNumber(18))
      })

      it('completing (f) defaults to identity for 1-arity', () => {
        const s = createSession()
        expect(
          s.evaluate('((completing (fn [acc x] (+ acc x))) 42)')
        ).toMatchObject(cljNumber(42))
      })
    })
  })

  describe('sequence', () => {
    it('(sequence coll) materialises coll into a vector', () => {
      const s = createSession()
      expect(s.evaluate("(sequence '(1 2 3))")).toMatchObject(
        cljVector([cljNumber(1), cljNumber(2), cljNumber(3)])
      )
    })

    it('(sequence xf coll) applies transducer and returns vector', () => {
      const s = createSession()
      expect(s.evaluate('(sequence (map inc) [1 2 3])')).toMatchObject(
        cljVector([cljNumber(2), cljNumber(3), cljNumber(4)])
      )
    })
  })

  describe('into with transducer', () => {
    it('(into [] (map inc) [1 2 3]) applies transducer into vector', () => {
      const s = createSession()
      expect(s.evaluate('(into [] (map inc) [1 2 3])')).toMatchObject(
        cljVector([cljNumber(2), cljNumber(3), cljNumber(4)])
      )
    })

    it('(into [] (filter odd?) [1 2 3 4 5]) keeps odds', () => {
      const s = createSession()
      expect(s.evaluate('(into [] (filter odd?) [1 2 3 4 5])')).toMatchObject(
        cljVector([cljNumber(1), cljNumber(3), cljNumber(5)])
      )
    })

    it('(into [] (comp (map inc) (filter even?)) [1 2 3 4]) keeps evens after inc', () => {
      const s = createSession()
      expect(
        s.evaluate('(into [] (comp (map inc) (filter even?)) [1 2 3 4])')
      ).toMatchObject(cljVector([cljNumber(2), cljNumber(4)]))
    })
  })

  describe('take-while transducer', () => {
    it('(take-while pos? [1 2 0 3]) stops at 0', () => {
      const s = createSession()
      expect(s.evaluate('(take-while pos? [1 2 0 3])')).toMatchObject(
        cljVector([cljNumber(1), cljNumber(2)])
      )
    })

    it('(take-while pos?) returns a transducer', () => {
      const s = createSession()
      expect(s.evaluate('(take-while pos?)').kind).toBe('function')
    })

    it('empty result when first element fails pred', () => {
      const s = createSession()
      expect(s.evaluate('(take-while pos? [-1 2 3])')).toMatchObject(
        cljVector([])
      )
    })
  })

  describe('drop-last transducer', () => {
    it('(drop-last 2 [1 2 3 4]) drops the last 2 elements', () => {
      const s = createSession()
      expect(s.evaluate('(drop-last 2 [1 2 3 4])')).toMatchObject(
        cljVector([cljNumber(1), cljNumber(2)])
      )
    })

    it('(drop-last [1 2 3 4]) drops the last 1 elements', () => {
      const s = createSession()
      expect(s.evaluate('(drop-last [1 2 3 4])')).toMatchObject(
        cljVector([cljNumber(1), cljNumber(2), cljNumber(3)])
      )
    })
  })

  describe('drop-while transducer', () => {
    it('(drop-while neg? [-1 -2 3 4]) skips negatives', () => {
      const s = createSession()
      expect(s.evaluate('(drop-while neg? [-1 -2 3 4])')).toMatchObject(
        cljVector([cljNumber(3), cljNumber(4)])
      )
    })

    it('passes through everything once pred fails', () => {
      const s = createSession()
      expect(s.evaluate('(drop-while even? [2 4 5 6])')).toMatchObject(
        cljVector([cljNumber(5), cljNumber(6)])
      )
    })
  })

  describe('take-last transducer', () => {
    it('(take-last 2 [1 2 3 4]) takes the last 2 elements', () => {
      const s = createSession()
      expect(s.evaluate('(take-last 2 [1 2 3 4])')).toMatchObject(
        cljList([cljNumber(3), cljNumber(4)])
      )
    })
  })

  describe('map-indexed transducer', () => {
    it('(map-indexed vector [10 20 30]) adds index', () => {
      const s = createSession()
      expect(s.evaluate('(map-indexed vector [10 20 30])')).toMatchObject(
        cljVector([
          cljVector([cljNumber(0), cljNumber(10)]),
          cljVector([cljNumber(1), cljNumber(20)]),
          cljVector([cljNumber(2), cljNumber(30)]),
        ])
      )
    })

    it('(map-indexed vector) returns a transducer', () => {
      const s = createSession()
      expect(s.evaluate('(map-indexed vector)').kind).toBe('function')
    })
  })

  describe('dedupe transducer', () => {
    it('(dedupe [1 1 2 3 3 3 4]) removes consecutive duplicates', () => {
      const s = createSession()
      expect(s.evaluate('(dedupe [1 1 2 3 3 3 4])')).toMatchObject(
        cljVector([cljNumber(1), cljNumber(2), cljNumber(3), cljNumber(4)])
      )
    })

    it('(dedupe) returns a transducer', () => {
      const s = createSession()
      expect(s.evaluate('(dedupe)').kind).toBe('function')
    })

    it('non-consecutive duplicates are kept', () => {
      const s = createSession()
      expect(s.evaluate('(dedupe [1 2 1 2])')).toMatchObject(
        cljVector([cljNumber(1), cljNumber(2), cljNumber(1), cljNumber(2)])
      )
    })

    it('nil values handled correctly', () => {
      const s = createSession()
      expect(s.evaluate('(dedupe [nil nil 1 nil])')).toMatchObject(
        cljVector([cljNil(), cljNumber(1), cljNil()])
      )
    })
  })

  describe('partition-all transducer', () => {
    it('(partition-all 2 [1 2 3 4]) groups into pairs', () => {
      const s = createSession()
      expect(s.evaluate('(partition-all 2 [1 2 3 4])')).toMatchObject(
        cljVector([
          cljVector([cljNumber(1), cljNumber(2)]),
          cljVector([cljNumber(3), cljNumber(4)]),
        ])
      )
    })

    it('flushes partial partition at completion', () => {
      const s = createSession()
      expect(s.evaluate('(partition-all 2 [1 2 3])')).toMatchObject(
        cljVector([
          cljVector([cljNumber(1), cljNumber(2)]),
          cljVector([cljNumber(3)]),
        ])
      )
    })

    it('(partition-all 2) returns a transducer', () => {
      const s = createSession()
      expect(s.evaluate('(partition-all 2)').kind).toBe('function')
    })

    it('empty collection produces empty result', () => {
      const s = createSession()
      expect(s.evaluate('(partition-all 3 [])')).toMatchObject(cljVector([]))
    })

    it('can compose with other transducers', () => {
      const s = createSession()
      expect(
        s.evaluate(
          '(into [] (comp (filter odd?) (partition-all 2)) [1 2 3 4 5 6 7])'
        )
      ).toMatchObject(
        cljVector([
          cljVector([cljNumber(1), cljNumber(3)]),
          cljVector([cljNumber(5), cljNumber(7)]),
        ])
      )
    })
  })

  describe('docstrings and metadata', () => {
    describe('with-meta / meta', () => {
      it('with-meta attaches a map to a function', () => {
        const s = createSession()
        expect(
          s.evaluate('(with-meta (fn [x] x) {:doc "identity"})')
        ).toMatchObject({ kind: 'function', meta: { kind: 'map' } })
      })

      it('meta returns the attached map', () => {
        const s = createSession()
        s.evaluate('(def f (with-meta (fn [x] x) {:doc "my doc"}))')
        expect(s.evaluate('(meta f)')).toMatchObject(
          cljMap([[cljKeyword(':doc'), cljString('my doc')]])
        )
      })

      it('meta returns nil for a function with no metadata', () => {
        const s = createSession()
        s.evaluate('(def f (fn [x] x))')
        expect(s.evaluate('(meta f)')).toMatchObject(cljNil())
      })

      it(':doc key is accessible from the metadata map', () => {
        const s = createSession()
        s.evaluate('(def f (with-meta (fn [x] x) {:doc "the doc"}))')
        expect(s.evaluate('(:doc (meta f))')).toMatchObject(
          cljString('the doc')
        )
      })
    })

    describe('defn with docstring', () => {
      it('attaches :doc metadata when docstring is provided', () => {
        const s = createSession()
        s.evaluate('(defn add "Adds two numbers." [a b] (+ a b))')
        expect(s.evaluate('(:doc (meta add))')).toMatchObject(
          cljString('Adds two numbers.')
        )
      })

      it('meta carries :arglists even when defn has no docstring', () => {
        const s = createSession()
        s.evaluate('(defn add [a b] (+ a b))')
        expect(s.evaluate('(vector? (:arglists (meta add)))')).toMatchObject(
          cljBoolean(true)
        )
        expect(s.evaluate('(:doc (meta add))')).toMatchObject(cljNil())
      })

      it('defn with docstring still works as a normal function', () => {
        const s = createSession()
        s.evaluate('(defn square "Squares a number." [x] (* x x))')
        expect(s.evaluate('(square 5)')).toMatchObject(cljNumber(25))
      })

      it('defn with docstring works with multi-arity', () => {
        const s = createSession()
        s.evaluate(
          '(defn greet "Returns a greeting." ([name] (str "Hello " name)) ([greeting name] (str greeting " " name)))'
        )
        expect(s.evaluate('(greet "Alice")')).toMatchObject(
          cljString('Hello Alice')
        )
        expect(s.evaluate('(greet "Hi" "Bob")')).toMatchObject(
          cljString('Hi Bob')
        )
        expect(s.evaluate('(:doc (meta greet))')).toMatchObject(
          cljString('Returns a greeting.')
        )
      })
    })

    describe('native function metadata', () => {
      it('reduce has a :doc entry in its metadata', () => {
        const s = createSession()
        expect(s.evaluate('(string? (:doc (meta reduce)))')).toMatchObject(
          cljBoolean(true)
        )
      })

      it('apply has a :doc entry in its metadata', () => {
        const s = createSession()
        expect(s.evaluate('(string? (:doc (meta apply)))')).toMatchObject(
          cljBoolean(true)
        )
      })

      it('comp has a :doc entry in its metadata', () => {
        const s = createSession()
        expect(s.evaluate('(string? (:doc (meta comp)))')).toMatchObject(
          cljBoolean(true)
        )
      })

      it('partial has a :doc entry in its metadata', () => {
        const s = createSession()
        expect(s.evaluate('(string? (:doc (meta partial)))')).toMatchObject(
          cljBoolean(true)
        )
      })

      it('identity has a :doc entry in its metadata', () => {
        const s = createSession()
        expect(s.evaluate('(string? (:doc (meta identity)))')).toMatchObject(
          cljBoolean(true)
        )
      })
    })

    describe('doc macro', () => {
      it('prints arglists then docstring for a user-defined function', () => {
        const outputs: string[] = []
        const s = createSession({ output: (t) => outputs.push(t) })
        s.evaluate(
          '(defn inc-all "Increments every element." [coll] (map inc coll))'
        )
        s.evaluate('(doc inc-all)')
        expect(outputs).toEqual(['([coll])\n\nIncrements every element.'])
      })

      it('prints arglists then docstring for a native function', () => {
        const outputs: string[] = []
        const s = createSession({ output: (t) => outputs.push(t) })
        s.evaluate('(doc reduce)')
        expect(outputs).toHaveLength(1)
        expect(outputs[0]).toMatch(/^\(\[f coll\]\)\n\(\[f val coll\]\)\n/)
        expect(outputs[0]).toContain('Reduces a collection')
      })

      it('prints fallback message for an undocumented function', () => {
        const outputs: string[] = []
        const s = createSession({ output: (t) => outputs.push(t) })
        s.evaluate('(def f (fn [x] x))')
        s.evaluate('(doc f)')
        expect(outputs).toEqual(['No documentation available.'])
      })

      it('doc returns nil', () => {
        const outputs: string[] = []
        const s = createSession({ output: (t) => outputs.push(t) })
        s.evaluate('(defn f "A fn." [x] x)')
        expect(s.evaluate('(doc f)')).toMatchObject(cljNil())
      })
    })

    describe('arglists metadata', () => {
      it(':arglists is a vector containing the single param vector', () => {
        const s = createSession()
        s.evaluate('(defn f [x] x)')
        expect(s.evaluate('(:arglists (meta f))')).toMatchObject(
          cljVector([cljVector([cljSymbol('x')])])
        )
      })

      it(':arglists contains all param vectors for multi-arity defn', () => {
        const s = createSession()
        s.evaluate('(defn f ([x] x) ([x y] (+ x y)))')
        expect(s.evaluate('(:arglists (meta f))')).toMatchObject(
          cljVector([
            cljVector([cljSymbol('x')]),
            cljVector([cljSymbol('x'), cljSymbol('y')]),
          ])
        )
      })

      it(':arglists includes & for variadic params', () => {
        const s = createSession()
        s.evaluate('(defn f [x & rest] rest)')
        const arglists = s.evaluate('(:arglists (meta f))')
        expect(arglists).toMatchObject(
          cljVector([
            cljVector([cljSymbol('x'), cljSymbol('&'), cljSymbol('rest')]),
          ])
        )
      })

      it(':arglists is present on defn with docstring', () => {
        const s = createSession()
        s.evaluate('(defn f "Docs." [a b] (+ a b))')
        expect(s.evaluate('(:arglists (meta f))')).toMatchObject(
          cljVector([cljVector([cljSymbol('a'), cljSymbol('b')])])
        )
      })

      it(':arglists is present on native functions (identity)', () => {
        const s = createSession()
        expect(s.evaluate('(:arglists (meta identity))')).toMatchObject(
          cljVector([cljVector([cljSymbol('x')])])
        )
      })

      it(':arglists is present on native functions (comp)', () => {
        const s = createSession()
        expect(s.evaluate('(vector? (:arglists (meta comp)))')).toMatchObject(
          cljBoolean(true)
        )
      })

      it('doc prints each arity on its own line for multi-arity', () => {
        const outputs: string[] = []
        const s = createSession({ output: (t) => outputs.push(t) })
        s.evaluate('(defn f "Multi." ([x] x) ([x y] x))')
        s.evaluate('(doc f)')
        expect(outputs).toEqual(['([x])\n([x y])\n\nMulti.'])
      })

      it('doc prints arglists for defn without docstring', () => {
        const outputs: string[] = []
        const s = createSession({ output: (t) => outputs.push(t) })
        s.evaluate('(defn f [x] x)')
        s.evaluate('(doc f)')
        expect(outputs).toEqual(['([x])\n\nNo documentation available.'])
      })

      it('doc prints arglists for identity (native)', () => {
        const outputs: string[] = []
        const s = createSession({ output: (t) => outputs.push(t) })
        s.evaluate('(doc identity)')
        expect(outputs).toHaveLength(1)
        expect(outputs[0]).toMatch(/^\(\[x\]\)\n/)
      })
    })
  })

  describe('pos? / neg? / zero?', () => {
    it.each([
      ['(pos? 1)', true],
      ['(pos? 0)', false],
      ['(pos? -1)', false],
      ['(neg? -1)', true],
      ['(neg? 0)', false],
      ['(neg? 1)', false],
      ['(zero? 0)', true],
      ['(zero? 1)', false],
      ['(zero? -1)', false],
    ])('%s → %s', (code, expected) => {
      const s = createSession()
      expect(s.evaluate(code)).toEqual(cljBoolean(expected as boolean))
    })

    it('pos? throws on non-number', () => {
      expectEvalError('(pos? "a")', 'pos? expects a number')
    })
    it('neg? throws on non-number', () => {
      expectEvalError('(neg? "a")', 'neg? expects a number')
    })
    it('zero? throws on non-number', () => {
      expectEvalError('(zero? "a")', 'zero? expects a number')
    })
  })

  describe('scientific notation literals', () => {
    it('evaluates a bare integer exponent: 1e10', () => {
      const s = createSession()
      expect(s.evaluate('1e10')).toEqual(cljNumber(1e10))
    })

    it('evaluates uppercase E: 1E10', () => {
      const s = createSession()
      expect(s.evaluate('1E10')).toEqual(cljNumber(1e10))
    })

    it('evaluates explicit positive exponent: 1e+10', () => {
      const s = createSession()
      expect(s.evaluate('1e+10')).toEqual(cljNumber(1e10))
    })

    it('evaluates negative exponent: 1e-10', () => {
      const s = createSession()
      expect(s.evaluate('1e-10')).toEqual(cljNumber(1e-10))
    })

    it('evaluates the factorial(30) result as a literal: 2.652528598121911e+32', () => {
      const s = createSession()
      expect(s.evaluate('2.652528598121911e+32')).toEqual(
        cljNumber(2.652528598121911e32)
      )
    })

    it('factorial with loop/recur produces the correct result for n=30', () => {
      const s = createSession()
      s.evaluate(`
        (defn factorial [n]
          (loop [i n acc 1]
            (if (zero? i) acc
              (recur (dec i) (* acc i)))))
      `)
      expect(s.evaluate('(factorial 30)')).toEqual(
        cljNumber(2.652528598121911e32)
      )
    })

    it('arithmetic with scientific notation literals', () => {
      const s = createSession()
      expect(s.evaluate('(+ 1e3 2e3)')).toEqual(cljNumber(3000))
    })
  })

  describe('try / catch / finally / throw', () => {
    describe('try with no error', () => {
      it('returns body value when no exception is thrown', () => {
        const s = createSession()
        expect(s.evaluate('(try 42)')).toEqual(cljNumber(42))
      })

      it('returns last body form value', () => {
        const s = createSession()
        expect(s.evaluate('(try 1 2 3)')).toEqual(cljNumber(3))
      })

      it('discards finally result and returns body value', () => {
        const s = createSession()
        expect(s.evaluate('(try 42 (finally "ignored"))')).toEqual(
          cljNumber(42)
        )
      })

      it('returns catch-body result — catch clause is not evaluated when no throw', () => {
        const s = createSession()
        expect(
          s.evaluate('(try 42 (catch :default e "should-not-see-this"))')
        ).toEqual(cljNumber(42))
      })

      it('should fail with multiple finally clauses', () => {
        expectEvalError(
          '(try 42 (finally "ignored") (finally "also-ignored"))',
          'finally clause must be the last in try expression'
        )
      })
    })

    describe('throw', () => {
      it('unhandled throw surfaces as EvaluationError at session boundary', () => {
        expectEvalError(
          '(throw {:type :error/test :message "oops"})',
          'Unhandled throw'
        )
      })

      it('thrown value appears in the error message via printString', () => {
        const s = createSession()
        let msg = ''
        try {
          s.evaluate('(throw "bare string")')
        } catch (e) {
          if (e instanceof EvaluationError) msg = e.message
        }
        expect(msg).toContain('bare string')
      })
    })

    describe('catch with keyword discriminator', () => {
      it('catches by :type keyword match', () => {
        const s = createSession()
        expect(
          s.evaluate(`
            (try
              (throw {:type :error/test :message "oops"})
              (catch :error/test e (:message e)))
          `)
        ).toEqual(cljString('oops'))
      })

      it('first matching catch clause wins', () => {
        const s = createSession()
        expect(
          s.evaluate(`
            (try
              (throw {:type :error/test})
              (catch :error/other e "wrong")
              (catch :error/test e "right")
              (catch :default e "also-wrong"))
          `)
        ).toEqual(cljString('right'))
      })

      it('non-matching keyword clause does not catch', () => {
        expectEvalError(
          `(try
             (throw {:type :error/test})
             (catch :error/other e "nope"))`,
          'Unhandled throw'
        )
      })
    })

    describe('catch with :default', () => {
      it('catches any thrown value', () => {
        const s = createSession()
        expect(
          s.evaluate(`
            (try
              (throw {:type :error/anything})
              (catch :error/random e "caught random")
              (catch :default e "caught"))
          `)
        ).toEqual(cljString('caught'))
      })

      it('catches a bare non-map thrown value', () => {
        const s = createSession()
        expect(s.evaluate('(try (throw 99) (catch :default e e))')).toEqual(
          cljNumber(99)
        )
      })

      it('binds the thrown value to the catch symbol', () => {
        const s = createSession()
        expect(
          s.evaluate(`
            (try
              (throw {:type :error/test :message "hello"})
              (catch :default e (:message e)))
          `)
        ).toEqual(cljString('hello'))
      })
    })

    describe('catch with predicate function', () => {
      it('catches when predicate returns truthy', () => {
        const s = createSession()
        expect(
          s.evaluate(`
            (try
              (throw {:type :error/test})
              (catch map? e "is-a-map"))
          `)
        ).toEqual(cljString('is-a-map'))
      })

      it('does not catch when predicate returns falsy', () => {
        expectEvalError(
          `(try
             (throw {:type :error/test})
             (catch string? e "nope"))`,
          'Unhandled throw'
        )
      })

      it('catches a thrown string with string? predicate', () => {
        const s = createSession()
        expect(
          s.evaluate('(try (throw "oops") (catch string? e (str "got: " e)))')
        ).toEqual(cljString('got: oops'))
      })
    })

    describe('catching EvaluationErrors (runtime errors)', () => {
      it('catches a runtime evaluation error with :error/runtime', () => {
        const s = createSession()
        expect(
          s.evaluate('(try (+ "a" 1) (catch :error/runtime e "runtime-error"))')
        ).toEqual(cljString('runtime-error'))
      })

      it('catches a runtime evaluation error with :default', () => {
        const s = createSession()
        expect(
          s.evaluate('(try (+ "a" 1) (catch :default e (:type e)))')
        ).toEqual(cljKeyword(':error/runtime'))
      })

      it('synthesized map has a :message key with the error text', () => {
        const s = createSession()
        const result = s.evaluate(
          '(try (+ "a" 1) (catch :error/runtime e (ex-message e)))'
        )
        expect(result.kind).toBe('string')
      })

      it('domain-specific keyword does not catch a runtime error', () => {
        expectEvalError(
          '(try (+ "a" 1) (catch :error/not-found e "x"))',
          'expects all arguments to be numbers'
        )
      })
    })

    describe('finally', () => {
      it('runs finally when no error occurs', () => {
        const s = createSession()
        s.evaluate('(def ran (atom false))')
        s.evaluate('(try 42 (finally (reset! ran true)))')
        expect(s.evaluate('@ran')).toEqual(cljBoolean(true))
      })

      it('runs finally when error is caught', () => {
        const s = createSession()
        s.evaluate('(def ran (atom false))')
        s.evaluate(`
          (try
            (throw {:type :error/test})
            (catch :default e nil)
            (finally (reset! ran true)))
        `)
        expect(s.evaluate('@ran')).toEqual(cljBoolean(true))
      })

      it('runs finally even when error is not caught (observed via outer try)', () => {
        const s = createSession()
        s.evaluate('(def ran (atom false))')
        s.evaluate(`
          (try
            (try
              (throw {:type :error/test})
              (finally (reset! ran true)))
            (catch :default e nil))
        `)
        expect(s.evaluate('@ran')).toEqual(cljBoolean(true))
      })

      it('finally result is discarded — catch result is returned', () => {
        const s = createSession()
        expect(
          s.evaluate(`
            (try
              (throw {:type :error/test})
              (catch :default e "catch-result")
              (finally "finally-result"))
          `)
        ).toEqual(cljString('catch-result'))
      })
    })

    describe('nested try', () => {
      it('inner catch handles; outer never sees the error', () => {
        const s = createSession()
        expect(
          s.evaluate(`
            (try
              (try
                (throw {:type :error/inner})
                (catch :error/inner e "handled-inner"))
              (catch :default e "outer-should-not-run"))
          `)
        ).toEqual(cljString('handled-inner'))
      })

      it('inner does not catch; outer does', () => {
        const s = createSession()
        expect(
          s.evaluate(`
            (try
              (try
                (throw {:type :error/escaped})
                (catch :error/other e "wrong"))
              (catch :error/escaped e "caught-by-outer"))
          `)
        ).toEqual(cljString('caught-by-outer'))
      })
    })

    describe('ex-info / ex-message / ex-data / ex-cause', () => {
      it('ex-info 2-arity returns a map with :message and :data', () => {
        const s = createSession()
        expect(s.evaluate('(ex-info "oops" {:id 1})')).toEqual(
          cljMap([
            [cljKeyword(':message'), cljString('oops')],
            [cljKeyword(':data'), cljMap([[cljKeyword(':id'), cljNumber(1)]])],
          ])
        )
      })

      it('ex-info 3-arity includes :cause', () => {
        const s = createSession()
        const result = s.evaluate(
          '(ex-info "outer" {:k 1} (ex-info "root" {}))'
        )
        expect(result.kind).toBe('map')
        if (result.kind === 'map') {
          const causeEntry = result.entries.find(
            ([k]) => k.kind === 'keyword' && k.name === ':cause'
          )
          expect(causeEntry).toBeDefined()
        }
      })

      it('ex-message returns the :message string', () => {
        const s = createSession()
        expect(s.evaluate('(ex-message (ex-info "my-error" {}))')).toEqual(
          cljString('my-error')
        )
      })

      it('ex-data returns the :data map', () => {
        const s = createSession()
        expect(s.evaluate('(ex-data (ex-info "err" {:code 42}))')).toEqual(
          cljMap([[cljKeyword(':code'), cljNumber(42)]])
        )
      })

      it('ex-cause returns the :cause value', () => {
        const s = createSession()
        expect(
          s.evaluate('(ex-cause (ex-info "outer" {} (ex-info "inner" {})))')
        ).toEqual(
          cljMap([
            [cljKeyword(':message'), cljString('inner')],
            [cljKeyword(':data'), cljMap([])],
          ])
        )
      })

      it('ex-message returns nil on a non-map', () => {
        const s = createSession()
        expect(s.evaluate('(ex-message 42)')).toEqual(cljNil())
      })

      it('ex-data returns nil on a non-map', () => {
        const s = createSession()
        expect(s.evaluate('(ex-data nil)')).toEqual(cljNil())
      })

      it('ex-cause returns nil when :cause is absent', () => {
        const s = createSession()
        expect(s.evaluate('(ex-cause (ex-info "no-cause" {}))')).toEqual(
          cljNil()
        )
      })

      it('throw + ex-info round-trip', () => {
        const s = createSession()
        expect(
          s.evaluate(`
            (try
              (throw (ex-info "not found" {:id 99}))
              (catch :default e (ex-message e)))
          `)
        ).toEqual(cljString('not found'))
      })
    })
  })
})
