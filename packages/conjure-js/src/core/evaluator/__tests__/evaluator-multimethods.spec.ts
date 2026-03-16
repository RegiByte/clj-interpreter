import { describe, expect, it } from 'vitest'
import { cljKeyword, cljNumber, cljString } from '../../factories'
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
    expect(mm.methods[0].dispatchVal).toEqual(cljKeyword(':rect'))
  })

  it('dispatches on a keyword dispatch fn', () => {
    const session = freshSession()
    session.evaluate('(defmulti area :shape)')
    session.evaluate('(defmethod area :rect [r] (* (:w r) (:h r)))')
    session.evaluate('(defmethod area :circle [c] (* 2 (:r c)))')
    expect(session.evaluate('(area {:shape :rect :w 4 :h 3})')).toEqual(
      cljNumber(12)
    )
    expect(session.evaluate('(area {:shape :circle :r 5})')).toEqual(
      cljNumber(10)
    )
  })

  it('dispatches on an explicit fn dispatch fn', () => {
    const session = freshSession()
    session.evaluate('(defmulti greet (fn [x] (:lang x)))')
    session.evaluate('(defmethod greet :en [x] "hello")')
    session.evaluate('(defmethod greet :pt [x] "oi")')
    expect(session.evaluate('(greet {:lang :en})')).toEqual(cljString('hello'))
    expect(session.evaluate('(greet {:lang :pt})')).toEqual(cljString('oi'))
  })

  it('falls back to :default when no method matches', () => {
    const session = freshSession()
    session.evaluate('(defmulti area :shape)')
    session.evaluate('(defmethod area :rect [r] (* (:w r) (:h r)))')
    session.evaluate('(defmethod area :default [x] -1)')
    expect(session.evaluate('(area {:shape :triangle :w 3 :h 4})')).toEqual(
      cljNumber(-1)
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
      cljNumber(10)
    )
    session.evaluate('(defmethod area :square [s] (* (:side s) (:side s)))')
    expect(session.evaluate('(area {:shape :square :side 4})')).toEqual(
      cljNumber(16)
    )
  })

  it('dispatches on a computed vector dispatch value', () => {
    const session = freshSession()
    session.evaluate('(defmulti serialize (fn [x fmt] [(:type x) fmt]))')
    session.evaluate('(defmethod serialize [:user :json] [x _] "user-json")')
    session.evaluate('(defmethod serialize [:user :edn] [x _] "user-edn")')
    expect(session.evaluate('(serialize {:type :user} :json)')).toEqual(
      cljString('user-json')
    )
    expect(session.evaluate('(serialize {:type :user} :edn)')).toEqual(
      cljString('user-edn')
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
      cljNumber(12)
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
    ).toEqual(cljNumber(7))
    expect(
      session.evaluate('(combine {:kind :str :val "foo"} {:kind :str :val "bar"})')
    ).toEqual(cljString('foobar'))
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
      cljNumber(12)
    )
    expect(session.evaluate('(area {:shape :rect :w 3 :h 4} 2)')).toEqual(
      cljNumber(24)
    )
  })

  it('supports expectError string matching for multimethod failures', () => {
    const session = freshSession()
    session.evaluate('(defmulti area :shape)')
    expectError('(area {:shape :missing})', 'No method in multimethod', session)
  })
})
