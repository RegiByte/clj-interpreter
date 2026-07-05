import { describe, expect, it } from 'vitest'
import { createSession } from '../../session'
import { v } from '../../factories'
import { Op } from '../opcodes'

function expectBytecodeFinally(code: string): void {
  const fn = createSession({ vmExecutionMode: 'function-body' }).evaluate(code)

  expect(fn.kind).toBe('function')
  if (fn.kind !== 'function') return

  const chunk = fn.arities[0].bytecodeBody
  expect(chunk).toBeDefined()
  expect(chunk?.code).toContain(Op.PushTry)
  expect(chunk?.code).toContain(Op.EnterFinally)
  expect(chunk?.code).toContain(Op.EndFinally)
}

describe('VM finally unwind semantics', () => {
  it('stores bytecodeBody for try/finally function bodies', () => {
    expectBytecodeFinally('(fn [] (try 42 (finally 0)))')
  })

  it('runs finally on normal completion and keeps the body result', () => {
    const session = createSession({ vmExecutionMode: 'function-body' })
    session.evaluate('(def ran (atom false))')

    expect(
      session.evaluate('((fn [] (try 42 (finally (reset! ran true)))))')
    ).toEqual(v.number(42))
    expect(session.evaluate('@ran')).toEqual(v.boolean(true))
  })

  it('keeps the catch result after finally completes normally', () => {
    expect(
      createSession({ vmExecutionMode: 'function-body' }).evaluate(
        '((fn [] (try (throw {:type :body}) (catch :body e :caught) (finally 99))))'
      )
    ).toEqual(v.keyword(':caught'))
  })

  it('runs finally before an unmatched body throw continues outward', () => {
    const session = createSession({ vmExecutionMode: 'function-body' })
    session.evaluate('(def ran (atom false))')

    expect(
      session.evaluate(
        '(try ((fn [] (try (throw {:type :body}) (finally (reset! ran true))))) (catch :body e @ran))'
      )
    ).toEqual(v.boolean(true))
  })

  it('runs finally when a catch body throws', () => {
    const session = createSession({ vmExecutionMode: 'function-body' })
    session.evaluate('(def ran (atom false))')

    expect(
      session.evaluate(
        '(try ((fn [] (try (throw {:type :body}) (catch :body e (throw {:type :catch})) (finally (reset! ran true))))) (catch :catch e @ran))'
      )
    ).toEqual(v.boolean(true))
  })

  it('lets a finally throw replace a body throw', () => {
    expect(
      createSession({ vmExecutionMode: 'function-body' }).evaluate(
        '(try ((fn [] (try (throw {:type :body}) (finally (throw {:type :finally}))))) (catch :finally e (:type e)))'
      )
    ).toEqual(v.keyword(':finally'))
  })

  it('lets a finally throw replace a catch body throw', () => {
    expect(
      createSession({ vmExecutionMode: 'function-body' }).evaluate(
        '(try ((fn [] (try (throw {:type :body}) (catch :body e (throw {:type :catch})) (finally (throw {:type :finally}))))) (catch :finally e (:type e)))'
      )
    ).toEqual(v.keyword(':finally'))
  })

  it('keeps runtime EvaluationError catchable through finally', () => {
    expect(
      createSession({ vmExecutionMode: 'function-body' }).evaluate(
        '((fn [] (try (/ 1 0) (catch :error/runtime e (:type e)) (finally 99))))'
      )
    ).toEqual(v.keyword(':error/runtime'))
  })
})
