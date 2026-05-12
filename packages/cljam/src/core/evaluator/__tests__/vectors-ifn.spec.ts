import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { expectError, freshSession, materialize } from './evaluator-test-utils'

describe('vectors as IFn', () => {
  it('looks up an item by index', () => {
    const session = freshSession()
    expect(session.evaluate('([10 20 30] 2)')).toEqual(v.number(30))
  })

  it('keeps vector IFn distinct from fn?', () => {
    const session = freshSession()
    expect(session.evaluate('(fn? [10 20 30])')).toEqual(v.boolean(false))
  })

  it('works in higher-order position', () => {
    const session = freshSession()
    expect(materialize(session.evaluate('(map [10 20 30] [0 2])'))).toEqual(
      v.list([v.number(10), v.number(30)])
    )
  })

  it('works through comp', () => {
    const session = freshSession()
    expect(session.evaluate('((comp [10 20 30]) 1)')).toEqual(v.number(20))
  })

  it('throws when called with no arguments', () => {
    expectError(
      '([10 20 30])',
      'Vector used as function requires exactly one argument, got 0'
    )
  })

  it('throws when called with a default value', () => {
    expectError(
      '([10 20 30] 3 0)',
      'Vector used as function requires exactly one argument, got 2'
    )
  })

  it('throws when called with a non-number index', () => {
    expectError(
      '([10 20 30] :x)',
      'Vector used as function expects a number index'
    )
  })

  it('throws when called with an out-of-bounds index', () => {
    expectError(
      '([10 20 30] 3)',
      'nth index 3 is out of bounds for collection of length 3'
    )
  })
})
