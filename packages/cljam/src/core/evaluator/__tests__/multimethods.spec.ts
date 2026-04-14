import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { expectError, freshSession } from './evaluator-test-utils'

describe('multimethods', () => {
  it('defmulti creates and binds a multimethod in the namespace', () => {
    const session = freshSession()
    session.evaluate('(defmulti area :shape)')
    const mm = session.evaluate('area')
    expect(mm.kind).toBe('multi-method')
    if (mm.kind !== 'multi-method') throw new Error('not a multimethod')
    expect(mm.name).toBe('area')
  })

  it('defmethod adds a method for a dispatch value', () => {
    const session = freshSession()
    session.evaluate('(defmulti area :shape)')
    session.evaluate('(defmethod area :rect [r] (* (:w r) (:h r)))')
    const mm = session.evaluate('area')
    if (mm.kind !== 'multi-method') throw new Error('not a multimethod')
    expect(mm.methods.length).toBe(1)
    expect(mm.methods[0].dispatchVal).toEqual(v.keyword(':rect'))
  })

  it('dispatches on a keyword dispatch fn', () => {
    const session = freshSession()
    session.evaluate('(defmulti area :shape)')
    session.evaluate('(defmethod area :rect [r] (* (:w r) (:h r)))')
    session.evaluate('(defmethod area :circle [c] (* 2 (:r c)))')
    expect(session.evaluate('(area {:shape :rect :w 4 :h 3})')).toEqual(
      v.number(12)
    )
    expect(session.evaluate('(area {:shape :circle :r 5})')).toEqual(
      v.number(10)
    )
  })

  it('dispatches on an explicit fn dispatch fn', () => {
    const session = freshSession()
    session.evaluate('(defmulti greet (fn [x] (:lang x)))')
    session.evaluate('(defmethod greet :en [x] "hello")')
    session.evaluate('(defmethod greet :pt [x] "oi")')
    expect(session.evaluate('(greet {:lang :en})')).toEqual(v.string('hello'))
    expect(session.evaluate('(greet {:lang :pt})')).toEqual(v.string('oi'))
  })

  it('falls back to :default when no method matches', () => {
    const session = freshSession()
    session.evaluate('(defmulti area :shape)')
    session.evaluate('(defmethod area :rect [r] (* (:w r) (:h r)))')
    session.evaluate('(defmethod area :default [x] -1)')
    expect(session.evaluate('(area {:shape :triangle :w 3 :h 4})')).toEqual(
      v.number(-1)
    )
  })

  it('throws when no method matches and no :default', () => {
    const session = freshSession()
    session.evaluate('(defmulti area :shape)')
    session.evaluate('(defmethod area :rect [r] (* (:w r) (:h r)))')
    expect(() => session.evaluate('(area {:shape :triangle})')).toThrow(
      'No method in multimethod'
    )
  })

  it('supports open extension — defmethod after the initial defmulti block', () => {
    const session = freshSession()
    session.evaluate('(defmulti area :shape)')
    session.evaluate('(defmethod area :rect [r] (* (:w r) (:h r)))')
    expect(session.evaluate('(area {:shape :rect :w 5 :h 2})')).toEqual(
      v.number(10)
    )
    session.evaluate('(defmethod area :square [s] (* (:side s) (:side s)))')
    expect(session.evaluate('(area {:shape :square :side 4})')).toEqual(
      v.number(16)
    )
  })

  it('dispatches on a computed vector dispatch value', () => {
    const session = freshSession()
    session.evaluate('(defmulti serialize (fn [x fmt] [(:type x) fmt]))')
    session.evaluate('(defmethod serialize [:user :json] [x _] "user-json")')
    session.evaluate('(defmethod serialize [:user :edn] [x _] "user-edn")')
    expect(session.evaluate('(serialize {:type :user} :json)')).toEqual(
      v.string('user-json')
    )
    expect(session.evaluate('(serialize {:type :user} :edn)')).toEqual(
      v.string('user-edn')
    )
  })

  it('re-defining a dispatch value replaces the old method', () => {
    const session = freshSession()
    session.evaluate('(defmulti area :shape)')
    session.evaluate('(defmethod area :rect [r] 0)')
    session.evaluate('(defmethod area :rect [r] (* (:w r) (:h r)))')
    const mm = session.evaluate('area')
    if (mm.kind !== 'multi-method') throw new Error('not a multimethod')
    expect(mm.methods.length).toBe(1)
    expect(session.evaluate('(area {:shape :rect :w 3 :h 4})')).toEqual(
      v.number(12)
    )
  })

  it('throws a clear error when defmethod targets a non-multimethod', () => {
    const session = freshSession()
    session.evaluate('(def area 42)')
    expect(() => session.evaluate('(defmethod area :rect [r] 0)')).toThrow(
      'is not a multimethod'
    )
  })

  it('supports multiple args via fn dispatch', () => {
    const session = freshSession()
    session.evaluate('(defmulti combine (fn [a b] [(:kind a) (:kind b)]))')
    session.evaluate('(defmethod combine [:num :num] [a b] (+ (:val a) (:val b)))')
    session.evaluate(
      '(defmethod combine [:str :str] [a b] (str (:val a) (:val b)))'
    )
    expect(
      session.evaluate('(combine {:kind :num :val 3} {:kind :num :val 4})')
    ).toEqual(v.number(7))
    expect(
      session.evaluate('(combine {:kind :str :val "foo"} {:kind :str :val "bar"})')
    ).toEqual(v.string('foobar'))
  })

  it('supports multi-arity handlers — a defmethod can have multiple arities', () => {
    const session = freshSession()
    session.evaluate('(defmulti area :shape)')
    session.evaluate(`
      (defmethod area :rect
        ([r]       (* (:w r) (:h r)))
        ([r scale] (* (:w r) (:h r) scale)))
    `)
    expect(session.evaluate('(area {:shape :rect :w 3 :h 4})')).toEqual(
      v.number(12)
    )
    expect(session.evaluate('(area {:shape :rect :w 3 :h 4} 2)')).toEqual(
      v.number(24)
    )
  })

  it('supports expectError string matching for multimethod failures', () => {
    const session = freshSession()
    session.evaluate('(defmulti area :shape)')
    expectError('(area {:shape :missing})', 'No method in multimethod', session)
  })

  it('re-evaluating defmulti preserves all registered methods (re-eval guard)', () => {
    const session = freshSession()
    session.evaluate('(defmulti area :shape)')
    session.evaluate('(defmethod area :rect [r] (* (:w r) (:h r)))')
    session.evaluate('(defmethod area :circle [c] (* 2 (:r c)))')
    // Re-evaluate defmulti — should be a no-op, not reset the multimethod
    session.evaluate('(defmulti area :shape)')
    expect(session.evaluate('(area {:shape :rect :w 3 :h 4})')).toEqual(
      v.number(12)
    )
    expect(session.evaluate('(area {:shape :circle :r 5})')).toEqual(
      v.number(10)
    )
  })

  // ── Custom default-dispatch-val ──────────────────────────────────────────

  it('custom :default sentinel: :default becomes a real dispatch value', () => {
    const session = freshSession()
    // ::unclassified is the new fallback sentinel; :default is now a real value
    session.evaluate('(defmulti classify identity :default ::unclassified)')
    session.evaluate('(defmethod classify :a [x] "is A")')
    session.evaluate('(defmethod classify :default [x] "literally default")')
    session.evaluate('(defmethod classify ::unclassified [x] "fallback")')

    expect(session.evaluate('(classify :a)')).toEqual(v.string('is A'))
    // :default is dispatched as a normal value — NOT the fallback
    expect(session.evaluate('(classify :default)')).toEqual(
      v.string('literally default')
    )
    // Any other value hits the custom fallback
    expect(session.evaluate('(classify :z)')).toEqual(v.string('fallback'))
  })

  it('custom :default sentinel: throws when no method and no fallback', () => {
    const session = freshSession()
    session.evaluate('(defmulti classify identity :default ::unclassified)')
    session.evaluate('(defmethod classify :a [x] "is A")')
    // ::unclassified is the sentinel but no method is registered for it
    expect(() => session.evaluate('(classify :z)')).toThrow(
      'No method in multimethod'
    )
  })

  it('custom :default sentinel is preserved through re-eval guard', () => {
    const session = freshSession()
    session.evaluate('(defmulti classify identity :default ::fallback)')
    session.evaluate('(defmethod classify ::fallback [x] "caught")')
    // Re-evaluate defmulti — re-eval guard fires; sentinel must be unchanged
    session.evaluate('(defmulti classify identity :default ::fallback)')
    expect(session.evaluate('(classify :anything)')).toEqual(v.string('caught'))
  })
})
