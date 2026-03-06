import { describe, expect, it } from 'vitest'
import {
  cljBoolean,
  cljKeyword,
  cljMap,
  cljNil,
  cljNumber,
} from '../factories'
import type { CljAtom } from '../types'
import { expectError, freshSession } from './evaluator-test-utils'

describe('atoms', () => {
  it('(atom 42) creates an atom holding 42', () => {
    const s = freshSession()
    const result = s.evaluate('(atom 42)')
    expect(result.kind).toBe('atom')
    expect((result as CljAtom).value).toEqual(cljNumber(42))
  })

  it('(deref a) returns the current value of the atom', () => {
    const s = freshSession()
    expect(s.evaluate('(let [a (atom 42)] (deref a))')).toEqual(cljNumber(42))
  })

  it('@a is equivalent to (deref a)', () => {
    const s = freshSession()
    expect(s.evaluate('(let [a (atom 42)] @a)')).toEqual(cljNumber(42))
  })

  it('(swap! a inc) applies inc to the current value and stores the result', () => {
    const s = freshSession()
    expect(s.evaluate('(let [a (atom 0)] (swap! a inc) (deref a))')).toEqual(
      cljNumber(1)
    )
  })

  it('(swap! a + 10) passes extra args after current value', () => {
    const s = freshSession()
    expect(s.evaluate('(let [a (atom 0)] (swap! a + 10) @a)')).toEqual(
      cljNumber(10)
    )
  })

  it('(swap! a f) returns the new value', () => {
    const s = freshSession()
    expect(s.evaluate('(let [a (atom 5)] (swap! a * 3))')).toEqual(
      cljNumber(15)
    )
  })

  it('(reset! a 99) sets the atom value directly', () => {
    const s = freshSession()
    expect(s.evaluate('(let [a (atom 0)] (reset! a 99) @a)')).toEqual(
      cljNumber(99)
    )
  })

  it('(reset! a v) returns the new value', () => {
    const s = freshSession()
    expect(s.evaluate('(let [a (atom 0)] (reset! a 42))')).toEqual(
      cljNumber(42)
    )
  })

  it('swap! works with map values', () => {
    const s = freshSession()
    expect(
      s.evaluate('(let [a (atom {:x 1})] (swap! a assoc :x 2) @a)')
    ).toEqual(cljMap([[cljKeyword(':x'), cljNumber(2)]]))
  })

  it('multiple swaps accumulate correctly', () => {
    const s = freshSession()
    expect(
      s.evaluate(
        '(let [a (atom 0)] (swap! a inc) (swap! a inc) (swap! a inc) @a)'
      )
    ).toEqual(cljNumber(3))
  })

  it('(deref 42) throws EvaluationError', () => {
    expectError('(deref 42)', 'deref expects an atom')
  })

  it('(swap! 42 inc) throws EvaluationError', () => {
    expectError('(swap! 42 inc)', 'swap! expects an atom')
  })

  it('(reset! 42 1) throws EvaluationError', () => {
    expectError('(reset! 42 1)', 'reset! expects an atom')
  })

  it('(atom? (atom 1)) returns true', () => {
    const s = freshSession()
    expect(s.evaluate('(atom? (atom 1))')).toEqual(cljBoolean(true))
  })

  it('(atom? 42) returns false', () => {
    const s = freshSession()
    expect(s.evaluate('(atom? 42)')).toEqual(cljBoolean(false))
  })

  it('atom can hold nil', () => {
    const s = freshSession()
    expect(s.evaluate('(let [a (atom nil)] @a)')).toEqual(cljNil())
  })

  it('atom can be reset to nil', () => {
    const s = freshSession()
    expect(s.evaluate('(let [a (atom 42)] (reset! a nil) @a)')).toEqual(
      cljNil()
    )
  })
})
