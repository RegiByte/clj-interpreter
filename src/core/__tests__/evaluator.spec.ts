import { EvaluationError } from '../evaluator'
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
import type { CljValue } from '../types'
import { isCljValue } from '../assertions'
import { createSession } from '../session'
import macrosSource from '../../clojure/macros.clj?raw'

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
      ])(
        'should evaluate count core function: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(cljNumber(expected))
        }
      )

      it.each([
        ['(count "a")', 'count expects a countable value, got "a"'],
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
      it.each([
        ['(map (fn [n] (+ n 1)))', null],
        ['(map (fn [n] (+ n 1)) [1 2 3])', [2, 3, 4]],
        [
          "(map (fn [n] (+ n 1)) '(1 2 3))",
          cljList([cljNumber(2), cljNumber(3), cljNumber(4)]),
        ],
        [
          `(map 
   (fn [entry]
     [(str (get entry 0) (get entry 0)),
      (* 2 (get entry 1))])
   {:a 1 :b 2})`,
          cljList([
            cljVector([cljString(':a:a'), cljNumber(2)]),
            cljVector([cljString(':b:b'), cljNumber(4)]),
          ]),
        ],
      ])(
        `should evalute map core function: %s should be %s`,
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(toCljValue(expected))
        }
      )

      it.each([
        ['(map)', 'map expects a function as first argument, got nil'],
        [
          '(map "a" [1 2 3])',
          'map expects a function as first argument, got "a"',
        ],
        [
          '(map [1 2 3])',
          'map expects a function as first argument, got [1 2 3]',
        ],
        ['(map (fn [n] (+ n 1)) "abc")', 'map expects a collection, got "abc"'],
        ['(map (fn [n] (+ n 1)) true)', 'map expects a collection, got true'],
        ['(map (fn [n] (+ n 1)) false)', 'map expects a collection, got false'],
        ['(map (fn [n] (+ n 1)) 0)', 'map expects a collection, got 0'],
        ['(map (fn [n] (+ n 1)) nil)', 'map expects a collection, got nil'],
      ])(
        'should throw on invalid map function arguments: %s should throw "%s"',
        (code, expected) => {
          expectEvalError(code, expected)
        }
      )
    })

    describe('filter', () => {
      it.each([
        ['(filter (fn [n] (> n 2)) [1 2 3 4 5])', [3, 4, 5]],
        [
          "(filter (fn [n] (> n 2)) '(1 2 3 4 5))",
          cljList([cljNumber(3), cljNumber(4), cljNumber(5)]),
        ],
        [
          `(filter (fn [n] (not (= "a" n))) ["a" "b" "c" "a" "d" "e"])`,
          ['b', 'c', 'd', 'e'],
        ],
        [
          `(filter (fn [entry] (> (get entry 1) 2)) {:a 1 :b 2 :c 3 :d 4})`,
          cljList([
            cljVector([cljKeyword(':c'), cljNumber(3)]),
            cljVector([cljKeyword(':d'), cljNumber(4)]),
          ]),
        ],
      ])(
        'should evalute filter core function: %s should be %s',
        (code, expected) => {
          const session = createSession()
          const result = session.evaluate(code)
          expect(result).toMatchObject(toCljValue(expected))
        }
      )

      it.each([
        ['(filter)', 'filter expects a function as first argument, got nil'],
        [
          '(filter "a" [1 2 3])',
          'filter expects a function as first argument, got "a"',
        ],
        [
          '(filter [1 2 3])',
          'filter expects a function as first argument, got [1 2 3]',
        ],
        [
          '(filter (fn [n] (+ n 1)) "abc")',
          'filter expects a collection, got "abc"',
        ],
        [
          '(filter (fn [n] (+ n 1)) true)',
          'filter expects a collection, got true',
        ],
        [
          '(filter (fn [n] (+ n 1)) false)',
          'filter expects a collection, got false',
        ],
        ['(filter (fn [n] (+ n 1)) 0)', 'filter expects a collection, got 0'],
        [
          '(filter (fn [n] (+ n 1)) nil)',
          'filter expects a collection, got nil',
        ],
      ])(
        'should throw on invalid filter function arguments: %s should throw "%s"',
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
      it.each([
        ['(take 2 [1 2 3 4])', [1, 2]],
        ['(take 0 [1 2 3])', []],
        ['(take -1 [1 2 3])', []],
        ['(take 10 [1 2 3])', [1, 2, 3]],
        ["(take 2 '(1 2 3 4))", [1, 2]],
        [
          '(take 2 {:a 1 :b 2 :c 3})',
          [
            [cljKeyword(':a'), 1],
            [cljKeyword(':b'), 2],
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
          cljList((expected as any[]).map(toCljValue))
        )
      })

      it.each([
        ['(take "a" [1 2 3])', 'take expects a number'],
        ['(take 2 "abc")', 'take expects a collection'],
        ['(drop "a" [1 2 3])', 'drop expects a number'],
        ['(drop 2 "abc")', 'drop expects a collection'],
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
        ['(into 1 [1 2])', 'into expects a collection as first argument'],
        ['(into [] "abc")', 'into expects a collection as second argument'],
        [
          '(into {} [1 2])',
          'into on a map expects each source element to be a [k v] vector',
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
      const session = createSession({
        entries: [macrosSource],
      })
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
      const session = createSession({
        entries: [macrosSource],
      })
      session.evaluate(`
      (defn greet 
        ([] "hi")
        ([x] (str "hi " x))
        ([x y] (str "hi " x " and " y)))`)
      expect(session.evaluate('(greet)')).toMatchObject(toCljValue('hi'))
      expect(session.evaluate('(greet "world")')).toMatchObject(toCljValue('hi world'))
      expect(session.evaluate('(greet "world" "universe")')).toMatchObject(toCljValue('hi world and universe'))
    })
  })
})
