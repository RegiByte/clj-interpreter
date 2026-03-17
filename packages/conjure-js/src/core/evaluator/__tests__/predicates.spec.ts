import { describe, expect, it } from 'vitest'
import { freshSession } from './evaluator-test-utils'
import { v } from '../../factories'

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
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(v.boolean(expected))
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
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(v.boolean(expected))
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
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(v.boolean(expected))
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
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(v.boolean(expected))
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
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(v.boolean(expected))
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
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(v.boolean(expected))
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
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(v.boolean(expected))
  })
})

describe('type', () => {
  it.each([
    ['(type 42)', v.keyword(':number')],
    ['(type "hello")', v.keyword(':string')],
    ['(type true)', v.keyword(':boolean')],
    ['(type nil)', v.keyword(':nil')],
    ['(type :foo)', v.keyword(':keyword')],
    ["(type 'x)", v.keyword(':symbol')],
    ["(type '(1 2))", v.keyword(':list')],
    ['(type [1 2])', v.keyword(':vector')],
    ['(type {:a 1})', v.keyword(':map')],
    ['(type +)', v.keyword(':function')],
    ['(type #"foo")', v.keyword(':regex')],
    ['(type (fn [x] x))', v.keyword(':function')],
  ])('should evaluate type: %s → %s', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(expected)
  })
})

describe('boolean', () => {
  it.each([
    ['(boolean true)', v.boolean(true)],
    ['(boolean false)', v.boolean(false)],
    ['(boolean nil)', v.boolean(false)],
    ['(boolean 0)', v.boolean(true)],
    ['(boolean 1)', v.boolean(true)],
    ['(boolean "")', v.boolean(true)],
    ['(boolean "hello")', v.boolean(true)],
    ['(boolean [])', v.boolean(true)],
    ['(boolean :foo)', v.boolean(true)],
  ])('should evaluate boolean: %s → %s', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(expected)
  })
})
