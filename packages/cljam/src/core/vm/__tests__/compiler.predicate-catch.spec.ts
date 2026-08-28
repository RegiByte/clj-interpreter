import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { createSession } from '../../session'
import { compileFnBodyForTest } from './compiler-test-utils'

describe('VM predicate catch compilation', () => {
  it('stores bytecodeBody for try with a symbol predicate discriminator', () => {
    const s = createSession({ vmExecutionMode: 'function-body' })
    s.evaluate('(defn boom? [e] (= (:type e) :boom))')

    const fn = s.evaluate('(fn [] (try (throw {:type :boom}) (catch boom? e :caught)))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return
    expect(fn.arities[0].bytecodeBody).toBeDefined()
  })

  it('stores symbol discriminator as raw symbol in catch table', () => {
    const chunk = compileFnBodyForTest([], ['(try 1 (catch my-pred e e))'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.catchTables[0]?.clauses[0]?.discriminator).toEqual(
      v.symbol('my-pred')
    )
  })

  it('symbol-resolved predicate catches matching throw', () => {
    const s = createSession({ vmExecutionMode: 'function-body' })
    s.evaluate('(defn boom? [e] (= (:type e) :boom))')

    expect(
      s.evaluate('((fn [] (try (throw {:type :boom}) (catch boom? e :caught))))')
    ).toEqual(v.keyword(':caught'))
  })

  it('symbol-resolved predicate skips non-matching throw and propagates', () => {
    const s = createSession({ vmExecutionMode: 'function-body' })
    s.evaluate('(defn boom? [e] (= (:type e) :boom))')

    expect(() =>
      s.evaluate('((fn [] (try (throw {:type :other}) (catch boom? e :caught))))')
    ).toThrow()
  })

  it('predicate binding slot receives the thrown value', () => {
    const s = createSession({ vmExecutionMode: 'function-body' })
    s.evaluate('(defn any? [_] true)')

    expect(
      s.evaluate('((fn [] (try (throw {:type :x :val 99}) (catch any? e (:val e)))))')
    ).toEqual(v.number(99))
  })

  it('inline fn discriminator catches matching throw', () => {
    expect(
      createSession({ vmExecutionMode: 'function-body' }).evaluate(
        '((fn [] (try (throw {:type :boom}) (catch (fn [e] (= (:type e) :boom)) e :inline-caught))))'
      )
    ).toEqual(v.keyword(':inline-caught'))
  })

  it('inline fn discriminator skips non-matching throw', () => {
    expect(() =>
      createSession({ vmExecutionMode: 'function-body' }).evaluate(
        '((fn [] (try (throw {:type :other}) (catch (fn [e] (= (:type e) :boom)) e :inline-caught))))'
      )
    ).toThrow()
  })

  it('first matching predicate clause wins over later matching clause', () => {
    const s = createSession({ vmExecutionMode: 'function-body' })
    s.evaluate('(defn any? [_] true)')
    s.evaluate('(defn any2? [_] true)')

    expect(
      s.evaluate(
        '((fn [] (try (throw {:type :x}) (catch any? e :first) (catch any2? e :second))))'
      )
    ).toEqual(v.keyword(':first'))
  })

  it('predicate clause after non-matching keyword clause catches', () => {
    const s = createSession({ vmExecutionMode: 'function-body' })
    s.evaluate('(defn any? [_] true)')

    expect(
      s.evaluate(
        '((fn [] (try (throw {:type :boom}) (catch :other e :keyword-body) (catch any? e :pred-body))))'
      )
    ).toEqual(v.keyword(':pred-body'))
  })

  it('predicate that throws replaces the original pending throw', () => {
    const s = createSession({ vmExecutionMode: 'function-body' })
    s.evaluate('(defn bad-pred [_] (throw {:type :pred-error}))')

    expect(() =>
      s.evaluate(
        '((fn [] (try (throw {:type :original}) (catch bad-pred e :caught))))'
      )
    ).toThrow()

    // Outer try at interpreter level sees the predicate error, not the original
    expect(
      s.evaluate(
        '(try ((fn [] (try (throw {:type :original}) (catch bad-pred e :caught)))) (catch :pred-error _ :pred-error-caught))'
      )
    ).toEqual(v.keyword(':pred-error-caught'))
  })

  it('predicate that throws still runs finally before propagating new error', () => {
    const s = createSession({ vmExecutionMode: 'function-body' })
    s.evaluate('(def finally-ran (atom false))')
    s.evaluate('(defn bad-pred [_] (throw {:type :pred-error}))')

    s.evaluate(
      '(try ((fn [] (try (throw {:type :original}) (catch bad-pred e :caught) (finally (reset! finally-ran true))))) (catch :pred-error _ nil))'
    )

    expect(s.evaluate('@finally-ran')).toEqual(v.boolean(true))
  })

  it('unresolved symbol discriminator acts as catch-all (class-like JVM behavior)', () => {
    // matchesDiscriminator catches the eval failure and returns true
    expect(
      createSession({ vmExecutionMode: 'function-body' }).evaluate(
        '((fn [] (try (throw {:type :anything}) (catch java.lang.Throwable e :caught-all))))'
      )
    ).toEqual(v.keyword(':caught-all'))
  })

  it('predicate catch with finally — body runs, finally still runs after body', () => {
    const s = createSession({ vmExecutionMode: 'function-body' })
    s.evaluate('(def finally-ran (atom false))')
    s.evaluate('(defn any? [_] true)')

    expect(
      s.evaluate(
        '((fn [] (try (throw {:type :x}) (catch any? e :caught) (finally (reset! finally-ran true)))))'
      )
    ).toEqual(v.keyword(':caught'))

    expect(s.evaluate('@finally-ran')).toEqual(v.boolean(true))
  })
})

describe('VM predicate catch — inline fn closure capture', () => {
  it('inline fn discriminator closes over outer fn param — match', () => {
    expect(
      createSession({ vmExecutionMode: 'function-body' }).evaluate(
        '((fn [threshold] (try (throw 99) (catch (fn [e] (> e threshold)) e :caught))) 50)'
      )
    ).toEqual(v.keyword(':caught'))
  })

  it('inline fn discriminator closes over outer fn param — no match, throw propagates', () => {
    expect(() =>
      createSession({ vmExecutionMode: 'function-body' }).evaluate(
        '((fn [threshold] (try (throw 10) (catch (fn [e] (> e threshold)) e :caught))) 50)'
      )
    ).toThrow()
  })

  it('inline fn discriminator closes over let* binding', () => {
    expect(
      createSession({ vmExecutionMode: 'function-body' }).evaluate(
        '((fn [x] (let [limit (* x 2)] (try (throw 99) (catch (fn [e] (> e limit)) e :caught)))) 20)'
      )
    ).toEqual(v.keyword(':caught'))
  })

  it('two inline fn catch clauses both close over different locals', () => {
    expect(
      createSession({ vmExecutionMode: 'function-body' }).evaluate(
        `((fn [lo hi]
           (try (throw 50)
                (catch (fn [e] (> e hi)) e :over)
                (catch (fn [e] (> e lo)) e :mid)))
         25 75)`
      )
    ).toEqual(v.keyword(':mid'))
  })

  it('inline fn discriminator with finally — closure captures correctly, finally runs', () => {
    const s = createSession({ vmExecutionMode: 'function-body' })
    s.evaluate('(def finally-ran (atom false))')
    expect(
      s.evaluate(
        '((fn [threshold] (try (throw 99) (catch (fn [e] (> e threshold)) e :caught) (finally (reset! finally-ran true)))) 50)'
      )
    ).toEqual(v.keyword(':caught'))
    expect(s.evaluate('@finally-ran')).toEqual(v.boolean(true))
  })
})
