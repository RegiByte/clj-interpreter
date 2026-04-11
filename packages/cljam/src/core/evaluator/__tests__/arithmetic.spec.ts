import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { EvaluationError } from '../../errors'
import { expectError, freshSession, toCljValue } from './evaluator-test-utils'

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
      const session = freshSession()
      const result = session.evaluate(code)
      if (result.kind !== 'number') {
        expect.fail('Result is not a number')
      }
      expect(result.value).toBe(expectedValue)
    }
  )

  it('should throw on division by zero', () => {
    expect(() => freshSession().evaluate('(/ 1 0)')).toThrow(EvaluationError)
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
  ])('should evaluate > core function: %s should be %s', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(v.boolean(expected))
  })

  it.each([
    ['(> 3)', '> expects at least two arguments'],
    ['(> 3 2 "a")', '> expects all arguments to be numbers'],
  ])('should throw on invalid %s function arguments: %s', (code, expected) => {
    expectError(code, expected)
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
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(v.boolean(expected))
  })

  it.each([
    ['(< 3)', '< expects at least two arguments'],
    ['(< 3 2 "a")', '< expects all arguments to be numbers'],
  ])('should throw on invalid %s function arguments: %s', (code, expected) => {
    expectError(code, expected)
  })
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
    const session = freshSession()
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
      expectError(code, expected)
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
    const session = freshSession()
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
      expectError(code, expected)
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
    const session = freshSession()
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
      expectError(code, expected)
    }
  )
})
