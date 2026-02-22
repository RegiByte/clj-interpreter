import { evaluateForms, EvaluationError } from '../evaluator'
import { makeCoreEnv } from '../core-env'
import { expect, it, describe } from 'vitest'
import {
  cljBoolean,
  cljComment,
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
import { parseForms } from '../parser'
import { tokenize } from '../tokenizer'
import { define, getRootEnv, lookup } from '../env'
import type { CljValue } from '../types'
import { isCljValue } from '../assertions'

function parseCode(code: string) {
  return parseForms(tokenize(code))
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

describe('evaluator', () => {
  it('should evaluate a single form', () => {
    const env = makeCoreEnv()
    const form = cljNumber(1)
    const result = evaluateForms([form], env)
    expect(result).toMatchObject(form)
  })

  it.each([
    ['number', cljNumber(1)],
    ['string', cljString('hello')],
    ['boolean', cljBoolean(true)],
    ['keyword', cljKeyword('keyword')],
    ['nil', cljNil()],
  ])('should evaluate self-evaluating forms: %s', (_, form) => {
    const env = makeCoreEnv()
    const result = evaluateForms([form], env)
    expect(result).toMatchObject(form)
  })

  it('should evaluate functions to self', () => {
    const env = makeCoreEnv()
    const form = cljFunction([cljSymbol('n1')], [cljNumber(1)], env)
    const result = evaluateForms([form], env)
    expect(result).toMatchObject(form)
  })

  it('should evaluate a vector with items and ignore comments', () => {
    const env = makeCoreEnv()
    const form = cljVector([cljNumber(1), cljComment('comment'), cljNumber(2)])
    const result = evaluateForms([form], env)
    expect(result).toMatchObject(cljVector([cljNumber(1), cljNumber(2)]))
  })

  it('should evaluate fn special form', () => {
    const parsed = parseCode(`(fn [a b] (+ a b))`)
    const env = makeCoreEnv()
    define('some-symbol', cljNumber(1), env)
    const result = evaluateForms(parsed, env)
    expect(result).toMatchObject(
      cljFunction(
        [cljSymbol('a'), cljSymbol('b')],
        [cljList([cljSymbol('+'), cljSymbol('a'), cljSymbol('b')])],
        env
      )
    )
    if (result.kind !== 'function') {
      throw new Error('Result is not a function')
    }
    // check if the outer env was captured by the function
    expect(lookup('some-symbol', result.env)).toMatchObject(cljNumber(1))
  })

  it('should evaluate def special form', () => {
    const parsed = parseCode(`(def some-symbol 1)`)
    const env = makeCoreEnv()
    const result = evaluateForms(parsed, env)
    expect(result).toMatchObject(cljNil())
    expect(lookup('some-symbol', env)).toMatchObject(cljNumber(1))
  })

  it('should evaluate a quote special form', () => {
    const parsed = parseCode(`(quote (+ 1 2 3))`)
    const env = makeCoreEnv()
    const result = evaluateForms(parsed, env)
    expect(result).toMatchObject(
      cljList([cljSymbol('+'), cljNumber(1), cljNumber(2), cljNumber(3)])
    )
  })

  it('should evaluate a do special form', () => {
    const parsed = parseCode(`(do 1 2 3)`)
    const env = makeCoreEnv()
    const result = evaluateForms(parsed, env)
    expect(result).toMatchObject(cljNumber(3))
  })

  it('should evaluate a let special form', () => {
    const parsed = parseCode(`(let [a 1 b 2] [a a b b])`)
    const env = makeCoreEnv()
    const result = evaluateForms(parsed, env)
    expect(result).toMatchObject(
      cljVector([cljNumber(1), cljNumber(1), cljNumber(2), cljNumber(2)])
    )
  })

  it('should evaluate a if special form', () => {
    const parsed = parseCode(`(if true 1 2)`)
    const env = makeCoreEnv()
    const result = evaluateForms(parsed, env)
    expect(result).toMatchObject(cljNumber(1))

    const parsed2 = parseCode(`(if false 1 2)`)
    const result2 = evaluateForms(parsed2, env)
    expect(result2).toMatchObject(cljNumber(2))
  })

  it('should evaluate a native function', () => {
    const parsed = parseCode(`(+ 1 2 3)`)
    const env = makeCoreEnv()
    const result = evaluateForms(parsed, env)
    expect(result).toMatchObject(cljNumber(6))
  })

  it.each([
    ['addition', '(+ 1 2 3)', 6],
    ['subtraction', '(- 1 2 3)', -4],
    ['multiplication', '(* 1 2 3)', 6],
    ['division', '(/ 1 2 3)', 1 / 6],
  ])(
    'should evaluate all basic math operations %s',
    (_, code, expectedValue) => {
      const parsed = parseCode(code)
      const env = makeCoreEnv()
      const result = evaluateForms(parsed, env)
      if (result.kind !== 'number') {
        expect.fail('Result is not a number')
      }
      expect(result.value).toBe(expectedValue)
    }
  )

  it('should evaluate a user-defined function', () => {
    const parsed1 = parseCode(`((fn [a b] (+ a b)) 1 2)`)
    const env = makeCoreEnv()
    const result1 = evaluateForms(parsed1, env)
    expect(result1).toMatchObject(cljNumber(3))

    const parsed2 = parseCode(`((fn [a b] (- a b)) 1 2)`)
    const result2 = evaluateForms(parsed2, env)
    expect(result2).toMatchObject(cljNumber(-1))

    const parsed3 = parseCode(`((fn [a b] (* a b)) 1 2)`)
    const result3 = evaluateForms(parsed3, env)
    expect(result3).toMatchObject(cljNumber(2))

    const parsed4 = parseCode(`((fn [a b] (/ a b)) 1 2)`)
    const result4 = evaluateForms(parsed4, env)
    expect(result4).toMatchObject(cljNumber(1 / 2))
  })

  it('should evaluate user-defined function accessing outer env', () => {
    const parsed = parseCode(`(def x 10)
    (def mult-10 (fn [n] (* n x)))
    (mult-10 2)`)
    const env = makeCoreEnv()
    const result = evaluateForms(parsed, env)
    expect(result).toMatchObject(cljNumber(20))
  })

  it('should capture the outer environment in a function', () => {
    const parsed = parseCode(`(def make-adder (fn [n] (fn [x] (+ n x))))
((make-adder 5) 3) `)
    const env = makeCoreEnv()
    const result = evaluateForms(parsed, env)
    expect(result).toMatchObject(cljNumber(8))
  })

  it('should evaluate a nested function call', () => {
    const parsed = parseCode(`((fn [a b] ((fn [x] (* x a)) b)) 2 3)`)
    const env = makeCoreEnv()
    const result = evaluateForms(parsed, env)
    expect(result).toMatchObject(cljNumber(6))
  })

  it('should evaluate if with truthy value', () => {
    const parsed = parseCode(`(if [1] 1 2)`)
    const env = makeCoreEnv()
    const result = evaluateForms(parsed, env)
    expect(result).toMatchObject(cljNumber(1))
  })

  it.each([
    ['(> 3 2)', true],
    ['(> 3 2 1)', true],
    ['(> 3 2 1 0)', true],
    ['(> 3 2 1 0 -1)', true],
    ['(> 3 2 1 0 -1 -2)', true],
    ['(> 3 2 4)', false],
    ['(> 3 4)', false],
  ])('should evaluate > core function: %s should be %s', (code, expected) => {
    const parsed = parseCode(code)
    const env = makeCoreEnv()
    const result = evaluateForms(parsed, env)
    expect(result).toMatchObject(cljBoolean(expected))
  })

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
  ])('should evaluate < core function: %s should be %s', (code, expected) => {
    const parsed = parseCode(code)
    const env = makeCoreEnv()
    const result = evaluateForms(parsed, env)
    expect(result).toMatchObject(cljBoolean(expected))
  })

  it.each([
    ['(> 3)', '> expects at least two arguments'],
    ['(> 3 2 "a")', '> expects all arguments to be numbers'],
    ['(< 3)', '< expects at least two arguments'],
    ['(< 3 2 "a")', '< expects all arguments to be numbers'],
  ])('should throw on invalid %s function arguments: %s', (code, expected) => {
    const parsed = parseCode(code)
    const env = makeCoreEnv()
    let error: EvaluationError | undefined
    expect(() => {
      try {
        const result = evaluateForms(parsed, env)
        return result
      } catch (e) {
        if (e instanceof EvaluationError) {
          error = e
        }
        throw e
      }
    }).toThrow(EvaluationError)
    expect(error?.message).toContain(expected)
  })

  it.each([
    ['(count [1 2 3])', 3],
    ['(count {"a" 1, "b" 2})', 2],
    ["(count '())", 0],
    ['(count [])', 0],
    ['(count {})', 0],
  ])(
    'should evaluate count core function: %s should be %s',
    (code, expected) => {
      const parsed = parseCode(code)
      const env = makeCoreEnv()
      const result = evaluateForms(parsed, env)
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
      const parsed = parseCode(code)
      const env = makeCoreEnv()
      let error: EvaluationError | undefined
      expect(() => {
        try {
          const result = evaluateForms(parsed, env)
          return result
        } catch (e) {
          if (e instanceof EvaluationError) {
            error = e
          }
          throw e
        }
      }).toThrow(EvaluationError)
      expect(error?.message).toContain(expected_err)
    }
  )

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
      const parsed = parseCode(code)
      const env = makeCoreEnv()
      const result = evaluateForms(parsed, env)
      expect(result).toMatchObject(cljBoolean(expected))
    }
  )

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
      const parsed = parseCode(code)
      const env = makeCoreEnv()
      const result = evaluateForms(parsed, env)
      expect(result).toMatchObject(cljBoolean(expected))
    }
  )

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
      const parsed = parseCode(code)
      const env = makeCoreEnv()
      const result = evaluateForms(parsed, env)
      expect(result).toMatchObject(cljBoolean(expected))
    }
  )

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
      const parsed = parseCode(code)
      const env = makeCoreEnv()
      const result = evaluateForms(parsed, env)
      expect(result).toMatchObject(cljBoolean(expected))
    }
  )

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
  ])('should evalute not core function: %s should be %s', (code, expected) => {
    const parsed = parseCode(code)
    const env = makeCoreEnv()
    const result = evaluateForms(parsed, env)
    expect(result).toMatchObject(cljBoolean(expected))
  })

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
  ])('should evalute = core function: %s should be %s', (code, expected) => {
    const parsed = parseCode(code)
    const env = makeCoreEnv()
    const result = evaluateForms(parsed, env)
    expect(result).toMatchObject(cljBoolean(expected))
  })

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
      const parsed = parseCode(code)
      const env = makeCoreEnv()
      const result = evaluateForms(parsed, env)
      expect(result).toMatchObject(toCljValue(expected))
    }
  )

  it.each([
    ['(rest (quote (1 2 3)))', cljList([cljNumber(2), cljNumber(3)])],
    ['(rest [1 2 3])', cljVector([cljNumber(2), cljNumber(3)])],
    ['(rest {"a" 1 "b" 2})', cljMap([[cljString('b'), cljNumber(2)]])],
    ['(rest {})', cljMap([])],
    ['(rest [])', cljVector([])],
    ["(rest '())", cljList([])],
  ])('should evalute rest core function: %s should be %s', (code, expected) => {
    const parsed = parseCode(code)
    const env = makeCoreEnv()
    const result = evaluateForms(parsed, env)
    expect(result).toMatchObject(toCljValue(expected))
  })

  it.each([
    // empty collections
    ['(conj [])', cljVector([])],
    ['(conj {})', cljMap([])],
    ["(conj '())", cljList([])],
    // no arguments, returns the collection unchanged
    ['(conj [1 2 3])', cljVector([cljNumber(1), cljNumber(2), cljNumber(3)])],
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
  ])('should evalute conj core function: %s should be %s', (code, expected) => {
    const parsed = parseCode(code)
    const env = makeCoreEnv()
    const result = evaluateForms(parsed, env)
    expect(result).toMatchObject(toCljValue(expected))
  })

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
      const parsed = parseCode(code)
      const env = makeCoreEnv()
      let error: EvaluationError | undefined
      expect(() => {
        try {
          const result = evaluateForms(parsed, env)
          return result
        } catch (e) {
          if (e instanceof EvaluationError) {
            error = e
          }
          throw e
        }
      }).toThrow(EvaluationError)
      expect(error?.message).toContain(expected)
    }
  )

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
      const parsed = parseCode(code)
      const env = makeCoreEnv()
      const result = evaluateForms(parsed, env)
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
      const parsed = parseCode(code)
      const env = makeCoreEnv()
      let error: EvaluationError | undefined
      expect(() => {
        try {
          const result = evaluateForms(parsed, env)
          return result
        } catch (e) {
          if (e instanceof EvaluationError) {
            error = e
          }
          throw e
        }
      }).toThrow(EvaluationError)
      expect(error?.message).toContain(expected)
    }
  )

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
      const parsed = parseCode(code)
      const env = makeCoreEnv()
      const result = evaluateForms(parsed, env)
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
      const parsed = parseCode(code)
      const env = makeCoreEnv()
      let error: EvaluationError | undefined
      expect(() => {
        try {
          const result = evaluateForms(parsed, env)
          return result
        } catch (e) {
          if (e instanceof EvaluationError) {
            error = e
          }
          throw e
        }
      }).toThrow(EvaluationError)
      expect(error?.message).toContain(expected)
    }
  )

  it('def should define a global binding, not local', () => {
    const code = `(let [x 1] 
    (def y 2)
    (+ 1 x))
    y` // y was defined inside the let body, but it is stored in the global environment
    const parsed = parseCode(code)
    const env = makeCoreEnv()
    const result = evaluateForms(parsed, env)
    expect(result).toMatchObject(cljNumber(2))
  })
})
