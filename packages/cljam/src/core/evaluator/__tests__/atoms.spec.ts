import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import type { CljAtom } from '../../types'
import { expectError, freshSession } from './evaluator-test-utils'

describe('atoms', () => {
  it('(atom 42) creates an atom holding 42', () => {
    const s = freshSession()
    const result = s.evaluate('(atom 42)')
    expect(result.kind).toBe('atom')
    expect((result as CljAtom).value).toEqual(v.number(42))
  })

  it('(deref a) returns the current value of the atom', () => {
    const s = freshSession()
    expect(s.evaluate('(let [a (atom 42)] (deref a))')).toEqual(v.number(42))
  })

  it('@a is equivalent to (deref a)', () => {
    const s = freshSession()
    expect(s.evaluate('(let [a (atom 42)] @a)')).toEqual(v.number(42))
  })

  it('(swap! a inc) applies inc to the current value and stores the result', () => {
    const s = freshSession()
    expect(s.evaluate('(let [a (atom 0)] (swap! a inc) (deref a))')).toEqual(
      v.number(1)
    )
  })

  it('(swap! a + 10) passes extra args after current value', () => {
    const s = freshSession()
    expect(s.evaluate('(let [a (atom 0)] (swap! a + 10) @a)')).toEqual(
      v.number(10)
    )
  })

  it('(swap! a f) returns the new value', () => {
    const s = freshSession()
    expect(s.evaluate('(let [a (atom 5)] (swap! a * 3))')).toEqual(v.number(15))
  })

  it('(reset! a 99) sets the atom value directly', () => {
    const s = freshSession()
    expect(s.evaluate('(let [a (atom 0)] (reset! a 99) @a)')).toEqual(
      v.number(99)
    )
  })

  it('(reset! a v) returns the new value', () => {
    const s = freshSession()
    expect(s.evaluate('(let [a (atom 0)] (reset! a 42))')).toEqual(v.number(42))
  })

  it('swap! works with map values', () => {
    const s = freshSession()
    expect(
      s.evaluate('(let [a (atom {:x 1})] (swap! a assoc :x 2) @a)')
    ).toEqual(v.map([[v.keyword(':x'), v.number(2)]]))
  })

  it('multiple swaps accumulate correctly', () => {
    const s = freshSession()
    expect(
      s.evaluate(
        '(let [a (atom 0)] (swap! a inc) (swap! a inc) (swap! a inc) @a)'
      )
    ).toEqual(v.number(3))
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
    expect(s.evaluate('(atom? (atom 1))')).toEqual(v.boolean(true))
  })

  it('(atom? 42) returns false', () => {
    const s = freshSession()
    expect(s.evaluate('(atom? 42)')).toEqual(v.boolean(false))
  })

  it('atom can hold nil', () => {
    const s = freshSession()
    expect(s.evaluate('(let [a (atom nil)] @a)')).toEqual(v.nil())
  })

  it('atom can be reset to nil', () => {
    const s = freshSession()
    expect(s.evaluate('(let [a (atom 42)] (reset! a nil) @a)')).toEqual(v.nil())
  })

  // swap-vals! and reset-vals!
  it('(swap-vals! a inc) returns [old new]', () => {
    const s = freshSession()
    s.evaluate('(def a (atom 1))')
    const result = s.evaluate('(swap-vals! a inc)')
    expect(result).toEqual({
      kind: 'vector',
      value: [v.number(1), v.number(2)],
    })
  })

  it('(reset-vals! a 99) returns [old new]', () => {
    const s = freshSession()
    s.evaluate('(def a (atom 1))')
    const result = s.evaluate('(reset-vals! a 99)')
    expect(result).toEqual({
      kind: 'vector',
      value: [v.number(1), v.number(99)],
    })
  })

  // compare-and-set!
  it('(compare-and-set! a old new) returns true when value matches', () => {
    const s = freshSession()
    s.evaluate('(def a (atom 1))')
    expect(s.evaluate('(compare-and-set! a 1 2)')).toEqual(v.boolean(true))
    expect(s.evaluate('@a')).toEqual(v.number(2))
  })

  it('(compare-and-set! a old new) returns false when value does not match', () => {
    const s = freshSession()
    s.evaluate('(def a (atom 1))')
    expect(s.evaluate('(compare-and-set! a 999 2)')).toEqual(v.boolean(false))
    expect(s.evaluate('@a')).toEqual(v.number(1))
  })

  // add-watch / remove-watch
  it('add-watch calls the watcher on swap!', () => {
    const s = freshSession()
    s.evaluate('(def a (atom 0))')
    s.evaluate('(def log (atom []))')
    s.evaluate(
      '(add-watch a :log (fn [k ref old new] (swap! log conj [old new])))'
    )
    s.evaluate('(swap! a inc)')
    s.evaluate('(swap! a inc)')
    expect(s.evaluate('@log')).toEqual({
      kind: 'vector',
      value: [
        { kind: 'vector', value: [v.number(0), v.number(1)] },
        { kind: 'vector', value: [v.number(1), v.number(2)] },
      ],
    })
  })

  it('remove-watch stops notifications', () => {
    const s = freshSession()
    s.evaluate('(def a (atom 0))')
    s.evaluate('(def log (atom []))')
    s.evaluate('(add-watch a :log (fn [k ref old new] (swap! log conj new)))')
    s.evaluate('(swap! a inc)')
    s.evaluate('(remove-watch a :log)')
    s.evaluate('(swap! a inc)')
    // log should only have 1 entry (from before remove-watch)
    expect(s.evaluate('(count @log)')).toEqual(v.number(1))
  })

  // set-validator!
  it('set-validator! rejects invalid values', () => {
    const s = freshSession()
    s.evaluate('(def a (atom 1))')
    s.evaluate('(set-validator! a pos?)')
    expect(() => s.evaluate('(reset! a -1)')).toThrow('Invalid reference state')
  })

  it('set-validator! allows valid values', () => {
    const s = freshSession()
    s.evaluate('(def a (atom 1))')
    s.evaluate('(set-validator! a pos?)')
    s.evaluate('(reset! a 5)')
    expect(s.evaluate('@a')).toEqual(v.number(5))
  })

  it('set-validator! can be cleared with nil', () => {
    const s = freshSession()
    s.evaluate('(def a (atom 1))')
    s.evaluate('(set-validator! a pos?)')
    s.evaluate('(set-validator! a nil)')
    s.evaluate('(reset! a -1)')
    expect(s.evaluate('@a')).toEqual(v.number(-1))
  })

  it('swap! also respects validators', () => {
    const s = freshSession()
    s.evaluate('(def a (atom 1))')
    s.evaluate('(set-validator! a pos?)')
    expect(() => s.evaluate('(swap! a (fn [x] -1))')).toThrow(
      'Invalid reference state'
    )
  })
})
