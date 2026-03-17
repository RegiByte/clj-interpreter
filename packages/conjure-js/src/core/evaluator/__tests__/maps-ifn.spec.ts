import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { expectError, freshSession, materialize } from './evaluator-test-utils'

describe('maps as IFn', () => {
  it('looks up a key and returns its value', () => {
    const session = freshSession()
    expect(session.evaluate('({:a 1 :b 2} :a)')).toEqual(v.number(1))
    expect(session.evaluate('({:a 1 :b 2} :b)')).toEqual(v.number(2))
  })

  it('returns nil when the key is not found', () => {
    const session = freshSession()
    expect(session.evaluate('({:a 1} :c)')).toEqual(v.nil())
  })

  it('returns the default value when the key is not found', () => {
    const session = freshSession()
    expect(session.evaluate('({:a 1} :c 99)')).toEqual(v.number(99))
  })

  it('returns the value (not the default) when the key is found', () => {
    const session = freshSession()
    expect(session.evaluate('({:a 1} :a 99)')).toEqual(v.number(1))
  })

  it('works with non-keyword keys', () => {
    const session = freshSession()
    expect(session.evaluate('({"x" 1 "y" 2} "x")')).toEqual(v.number(1))
    expect(session.evaluate('({1 :one 2 :two} 1)')).toEqual(v.keyword(':one'))
  })

  it('works in higher-order position — (map m coll)', () => {
    const session = freshSession()
    expect(materialize(session.evaluate('(map {:a 1 :b 2 :c 3} [:a :c])'))).toEqual(
      v.list([v.number(1), v.number(3)])
    )
  })

  it('missing keys in higher-order position return nil', () => {
    const session = freshSession()
    expect(materialize(session.evaluate('(map {:a 1} [:a :b :c])'))).toEqual(
      v.list([v.number(1), v.nil(), v.nil()])
    )
  })

  it('throws when called with no arguments', () => {
    expectError('({:a 1})', 'Map used as function requires at least one argument')
  })
})
