import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { createSession } from '../../session'

// ─── Combination 1: try inside binding ───────────────────────────────────────
// binding-frame record sits below try-record on the unwind stack.
// The try record is consumed first (catch fires while binding is still live),
// so the catch body sees the bound value. PopBindingFrame runs on normal
// completion of the binding body.

describe('try inside binding', () => {
  it('catch body sees the active dynamic binding', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')
    expect(
      s.evaluate(
        '((fn [] (binding [*x* :bound] (try (throw {:type :boom}) (catch :boom _ *x*)))))'
      )
    ).toEqual(v.keyword(':bound'))
  })

  it('binding is restored after catch body completes normally', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')
    s.evaluate(
      '((fn [] (binding [*x* :bound] (try (throw {:type :boom}) (catch :boom _ *x*)))))'
    )
    expect(s.evaluate('*x*')).toEqual(v.keyword(':root'))
  })

  it('finally runs inside binding, then binding restores when throw escapes', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')
    s.evaluate('(def ran (atom false))')
    expect(
      s.evaluate(
        '(try ((fn [] (binding [*x* :bound] (try (throw {:type :boom}) (finally (reset! ran true)))))) (catch :boom _ @ran))'
      )
    ).toEqual(v.boolean(true))
    expect(s.evaluate('*x*')).toEqual(v.keyword(':root'))
  })

  it('normal body result flows through binding without interference', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')
    expect(
      s.evaluate('((fn [] (binding [*x* :bound] (try 42 (catch :boom _ 0)))))')
    ).toEqual(v.number(42))
    expect(s.evaluate('*x*')).toEqual(v.keyword(':root'))
  })
})

// ─── Combination 2: binding inside try ───────────────────────────────────────
// binding-frame record sits above try-record on the unwind stack (pushed after).
// When throw happens, the drain loop pops the binding-frame first (restoring *x*),
// then the try record catches — so the catch body sees the restored root value.

describe('binding inside try', () => {
  it('binding is restored before catch body executes', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')
    expect(
      s.evaluate(
        '((fn [] (try (binding [*x* :bound] (throw {:type :boom})) (catch :boom _ *x*))))'
      )
    ).toEqual(v.keyword(':root'))
  })

  it('binding is restored and finally runs before throw escapes', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')
    s.evaluate('(def ran (atom false))')
    expect(
      s.evaluate(
        '(try ((fn [] (try (binding [*x* :bound] (throw {:type :boom})) (finally (reset! ran true))))) (catch :boom _ [*x* @ran]))'
      )
    ).toEqual(v.vector([v.keyword(':root'), v.boolean(true)]))
  })

  it('normal binding completion inside try does not disturb try result', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')
    expect(
      s.evaluate('((fn [] (try (binding [*x* :bound] *x*) (catch :boom _ :caught))))')
    ).toEqual(v.keyword(':bound'))
    expect(s.evaluate('*x*')).toEqual(v.keyword(':root'))
  })
})

// ─── Combination 3: binding inside finally ───────────────────────────────────
// A binding form inside a finally body uses normal PopBindingFrame cleanup
// on normal completion. If the finally body itself threw, the binding-frame
// unwind record would handle cleanup. Either way, *x* is restored after finally.

describe('binding inside finally', () => {
  it('body result is preserved when finally body uses binding', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')
    expect(
      s.evaluate('((fn [] (try 42 (finally (binding [*x* :in-finally] *x*)))))')
    ).toEqual(v.number(42))
    expect(s.evaluate('*x*')).toEqual(v.keyword(':root'))
  })

  it('binding inside finally was active during finally execution', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')
    s.evaluate('(def side (atom nil))')
    s.evaluate(
      '((fn [] (try 99 (finally (binding [*x* :in-finally] (reset! side *x*))))  ))'
    )
    expect(s.evaluate('@side')).toEqual(v.keyword(':in-finally'))
    expect(s.evaluate('*x*')).toEqual(v.keyword(':root'))
  })

  it('binding inside finally is cleaned up even when the body threw', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')
    s.evaluate('(def side (atom nil))')
    expect(
      s.evaluate(
        '(try ((fn [] (try (throw {:type :boom}) (catch :boom _ :caught) (finally (binding [*x* :in-finally] (reset! side *x*)))))) (catch :default _ nil))'
      )
    ).toEqual(v.keyword(':caught'))
    expect(s.evaluate('@side')).toEqual(v.keyword(':in-finally'))
    expect(s.evaluate('*x*')).toEqual(v.keyword(':root'))
  })
})

// ─── Combination 4: cross-frame throw propagation ────────────────────────────
// A callee bytecode fn throws. It has no try records so abortFrame pops it.
// The throw then propagates into the caller's frame where the try record catches.

describe('cross-frame throw propagation', () => {
  it('callee bytecode fn throw is caught by caller try record', () => {
    const s = createSession()
    s.evaluate('(def inner (fn [] (throw {:type :cross-frame})))')
    expect(
      s.evaluate('((fn [] (try (inner) (catch :cross-frame _ :caught))))')
    ).toEqual(v.keyword(':caught'))
  })

  it('callee throw propagates through caller finally before being caught', () => {
    const s = createSession()
    s.evaluate('(def ran (atom false))')
    s.evaluate('(def inner (fn [] (throw {:type :cross-frame})))')
    expect(
      s.evaluate(
        '(try ((fn [] (try (inner) (finally (reset! ran true))))) (catch :cross-frame _ @ran))'
      )
    ).toEqual(v.boolean(true))
  })

  it('throw propagates through multiple nested bytecode frames', () => {
    const s = createSession()
    s.evaluate('(def deep (fn [] (throw {:type :deep-throw})))')
    s.evaluate('(def mid (fn [] (deep)))')
    expect(
      s.evaluate('((fn [] (try (mid) (catch :deep-throw _ :survived-deep))))')
    ).toEqual(v.keyword(':survived-deep'))
  })

  it('callee throw inside binding cleans up binding before caller catch', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')
    s.evaluate('(def inner (fn [] (throw {:type :cross-frame})))')
    expect(
      s.evaluate(
        '((fn [] (try (binding [*x* :bound] (inner)) (catch :cross-frame _ *x*))))'
      )
    ).toEqual(v.keyword(':root'))
  })
})

// ─── Combination 5: upvalues captured before exceptional frame exit ───────────
// abortFrame calls closeUpvaluesForFrame before popping. This copies local slot
// values into the heap upvalue cell, so closures stored before the throw can
// still dereference their captured values after the frame is gone.

describe('upvalues captured before exceptional frame exit', () => {
  it('upvalue is readable from closure after throwing frame exits abnormally', () => {
    const s = createSession()
    s.evaluate('(def saved (atom nil))')
    s.evaluate(
      '(try ((fn [x] (reset! saved (fn [] x)) (throw {:type :boom})) 42) (catch :boom _ nil))'
    )
    expect(s.evaluate('(@saved)')).toEqual(v.number(42))
  })

  it('multiple upvalues are all readable after exceptional frame exit', () => {
    const s = createSession()
    s.evaluate('(def saved (atom nil))')
    s.evaluate(
      '(try ((fn [a b] (reset! saved (fn [] [a b])) (throw {:type :boom})) 1 2) (catch :boom _ nil))'
    )
    expect(s.evaluate('(@saved)')).toEqual(v.vector([v.number(1), v.number(2)]))
  })

  it('let-bound local captured as upvalue survives exceptional frame exit', () => {
    const s = createSession()
    s.evaluate('(def saved (atom nil))')
    s.evaluate(
      '(try ((fn [] (let [x 99] (reset! saved (fn [] x)) (throw {:type :boom})))) (catch :boom _ nil))'
    )
    expect(s.evaluate('(@saved)')).toEqual(v.number(99))
  })
})

// ─── Combination 6: delegated native throws inside VM try ────────────────────
// Native throws enter the VM via the instruction-boundary catch as VmAbrupt.
// They should be catchable and interact correctly with binding cleanup.

describe('delegated native throws inside VM try', () => {
  it('native runtime error is caught inside an active binding', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')
    expect(
      s.evaluate(
        '((fn [] (binding [*x* :bound] (try (/ 1 0) (catch :error/runtime _ *x*)))))'
      )
    ).toEqual(v.keyword(':bound'))
    expect(s.evaluate('*x*')).toEqual(v.keyword(':root'))
  })

  it('native throw inside binding restores binding before catch sees it', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')
    expect(
      s.evaluate(
        '((fn [] (try (binding [*x* :bound] (/ 1 0)) (catch :error/runtime _ *x*))))'
      )
    ).toEqual(v.keyword(':root'))
  })

  it('native throw still runs finally before escaping', () => {
    const s = createSession()
    s.evaluate('(def ran (atom false))')
    expect(
      s.evaluate(
        '(try ((fn [] (try (/ 1 0) (finally (reset! ran true))))) (catch :error/runtime _ @ran))'
      )
    ).toEqual(v.boolean(true))
  })
})

// ─── Combination 7: catch body calls bytecode function that throws ────────────
// The catch body is protected by a finally-only try record pushed at emit time.
// A throw from a bytecode fn called inside catch body exits that callee frame,
// propagates into catch body context, hits the finally-only record, runs finally,
// then continues outward.

describe('catch body calls bytecode function that throws', () => {
  it('throw from catch body still runs finally', () => {
    const s = createSession()
    s.evaluate('(def ran (atom false))')
    s.evaluate('(def thrower (fn [] (throw {:type :inner})))')
    expect(
      s.evaluate(
        '(try ((fn [] (try (throw {:type :outer}) (catch :outer _ (thrower)) (finally (reset! ran true))))) (catch :inner _ @ran))'
      )
    ).toEqual(v.boolean(true))
  })

  it('inner throw from catch body replaces the original throw type', () => {
    const s = createSession()
    s.evaluate('(def thrower (fn [] (throw {:type :inner})))')
    expect(() =>
      s.evaluate(
        '((fn [] (try (throw {:type :outer}) (catch :outer _ (thrower)))))'
      )
    ).toThrow(':inner')
  })

  it('deeply nested callee throw from catch body still reaches finally', () => {
    const s = createSession()
    s.evaluate('(def ran (atom false))')
    s.evaluate('(def deep-thrower (fn [] (throw {:type :deep})))')
    s.evaluate('(def mid (fn [] (deep-thrower)))')
    expect(
      s.evaluate(
        '(try ((fn [] (try (throw {:type :outer}) (catch :outer _ (mid)) (finally (reset! ran true))))) (catch :deep _ @ran))'
      )
    ).toEqual(v.boolean(true))
  })

  it('catch body throw from bytecode fn restores enclosing binding before escaping', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')
    s.evaluate('(def thrower (fn [] (throw {:type :inner})))')
    expect(
      s.evaluate(
        '(binding [*x* :outer] (try ((fn [] (try (throw {:type :outer}) (catch :outer _ (thrower))))) (catch :inner _ *x*)))'
      )
    ).toEqual(v.keyword(':outer'))
    expect(s.evaluate('*x*')).toEqual(v.keyword(':root'))
  })
})
