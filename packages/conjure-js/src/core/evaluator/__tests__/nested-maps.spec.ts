import { describe, expect, it } from 'vitest'
import { freshSession, toCljValue } from './evaluator-test-utils'

function ev(code: string) {
  return freshSession().evaluate(code)
}

describe('get-in', () => {
  it.each([
    // 2-arity: basic nested lookup
    ['(get-in {:a {:b 1}} [:a :b])', 1],
    ['(get-in {:a {:b {:c 42}}} [:a :b :c])', 42],
    // 2-arity: missing key returns nil
    ['(get-in {:a 1} [:b])', null],
    ['(get-in {:a {:b 1}} [:a :c])', null],
    // 2-arity: empty path returns the map itself (via boolean)
    ['(map? (get-in {:a 1} []))', true],
    // 2-arity: nil map returns nil
    ['(get-in nil [:a])', null],
    // 3-arity: missing key returns not-found
    ['(= (get-in {:a 1} [:b] :missing) :missing)', true],
    ['(= (get-in nil [:a] :missing) :missing)', true],
    // 3-arity: key present with nil value returns nil (not not-found)
    ['(nil? (get-in {:a {:b nil}} [:a :b] :missing))', true],
    // 3-arity: empty path returns the map (not not-found)
    ['(map? (get-in {:a 1} [] :missing))', true],
  ])('should evaluate get-in: %s → %s', (code, expected) => {
    expect(ev(code)).toMatchObject(toCljValue(expected))
  })
})

describe('assoc-in', () => {
  it.each([
    // set a nested key
    ['(get-in (assoc-in {:a {:b 1}} [:a :b] 99) [:a :b])', 99],
    // deep nesting: creates intermediate maps when missing
    ['(get-in (assoc-in {} [:a :b :c] 42) [:a :b :c])', 42],
    ['(map? (get-in (assoc-in {} [:a :b] 1) [:a]))', true],
    // does not mutate siblings
    ['(get-in (assoc-in {:a {:b 1 :c 2}} [:a :b] 99) [:a :c])', 2],
    // single-key path
    ['(get (assoc-in {:a 1} [:a] 42) :a)', 42],
  ])('should evaluate assoc-in: %s → %s', (code, expected) => {
    expect(ev(code)).toMatchObject(toCljValue(expected))
  })
})

describe('update-in', () => {
  it.each([
    // apply inc to a nested key
    ['(get-in (update-in {:a {:b 1}} [:a :b] inc) [:a :b])', 2],
    // with extra args via apply
    ['(get-in (update-in {:a {:b 1}} [:a :b] + 10) [:a :b])', 11],
    // missing key: f receives nil
    ['(get-in (update-in {} [:a :b] (fn [v] (if (nil? v) 0 (inc v)))) [:a :b])', 0],
    // does not affect siblings
    ['(get-in (update-in {:a {:b 1 :c 2}} [:a :b] inc) [:a :c])', 2],
    // keyword as IFn — extracts :x from the nested map
    ['(get-in (update-in {:a {:b {:x 1}}} [:a :b] :x) [:a :b])', 1],
  ])('should evaluate update-in: %s → %s', (code, expected) => {
    expect(ev(code)).toMatchObject(toCljValue(expected))
  })
})

describe('fnil', () => {
  it.each([
    // 2-arity: replaces nil first arg with default
    ['((fnil inc 0) nil)', 1],
    ['((fnil inc 0) 5)', 6],
    // passes through non-nil args and rest
    ['((fnil + 0) nil 3)', 3],
    ['((fnil + 0) 2 3)', 5],
    // 3-arity: replaces nil for first and/or second args
    ['((fnil + 0 0) nil nil)', 0],
    ['((fnil + 0 0) nil 5)', 5],
    ['((fnil + 0 0) 3 nil)', 3],
    ['((fnil + 0 0) 3 4)', 7],
    // practical: update with fnil to initialise missing counter
    ['(get (update {} :count (fnil inc 0)) :count)', 1],
    ['(get (update {:count 2} :count (fnil inc 0)) :count)', 3],
  ])('should evaluate fnil: %s → %s', (code, expected) => {
    expect(ev(code)).toMatchObject(toCljValue(expected))
  })
})
