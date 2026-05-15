import { describe, expect, it } from 'vitest'
import {
  createSession,
  createSessionFromSnapshot,
  snapshotSession,
  type SessionSnapshot,
} from '../../session'
import type {
  CljValue,
  EvalEvent,
  VmExecutionMode,
  VmFallbackReason,
} from '../../types'

type ReadyCase = {
  name: string
  code: string
  setup?: string[]
}

type FallbackCase = {
  name: string
  code: string
  category: VmFallbackReason['category']
  setup?: string[]
  opportunisticThrows?: string
}

type RunOutcome =
  | { ok: true; value: CljValue; events: EvalEvent[] }
  | { ok: false; error: Error; events: EvalEvent[] }

const baseline = snapshotSession(createSession({ hostBindings: { Math, Date } }))

const readyCases: ReadyCase[] = [
  { name: 'number literal', code: '42' },
  { name: 'keyword literal', code: ':ready' },
  { name: 'nil literal', code: 'nil' },
  { name: 'boolean literal', code: 'true' },
  { name: 'nested vector', code: '[1 (+ 2 3) {:k :v}]' },
  { name: 'nested map', code: '{:a 1 :b [2 3] :c #{4 5}}' },
  { name: 'set literal', code: '#{1 (+ 1 1) 3}' },
  { name: 'reader metadata on vector', code: '(meta ^:fast [])' },
  { name: 'arithmetic nesting', code: '(+ 1 (* 2 3))' },
  { name: 'equality with quote', code: '(= (quote a) (quote a))' },
  { name: 'keyword as function', code: '(:k {:k 1 :other 2})' },
  { name: 'vector as function', code: '([10 20 30] 1)' },
  { name: 'conditional callee', code: '((if true + -) 4 3)' },
  { name: 'let macro expansion', code: '(let [x 1 y (+ x 2)] y)' },
  { name: 'cond macro expansion', code: '(cond false :no (= 1 1) :yes :else :bad)' },
  { name: 'case macro expansion', code: '(case 2 1 :one 2 :two :other)' },
  { name: 'when macro expansion', code: '(when true (+ 2 3))' },
  { name: 'if-let macro expansion', code: '(if-let [x (:a {:a 3})] (+ x 1) 0)' },
  { name: 'thread-first macro expansion', code: '(-> {:a 1} (assoc :b 2) :b)' },
  { name: 'thread-last macro expansion', code: '(->> [1 2 3] (map inc) (reduce +))' },
  { name: 'some-thread macro expansion', code: '(some-> {:a {:b 7}} :a :b inc)' },
  {
    name: 'vector destructuring after macro expansion',
    code: '(let [[a b & more] [1 2 3 4]] [a b more])',
  },
  {
    name: 'map destructuring after macro expansion',
    code: '(let [{:keys [a b] :or {b 7}} {:a 1}] [a b])',
  },
  { name: 'vec over map', code: '(vec (map inc [1 2 3]))' },
  {
    name: 'top-level anonymous fn call',
    code: '((fn [x] (+ x 1)) 4)',
  },
  {
    name: 'inline fn argument',
    code: '(vec (map (fn [x] (* x x)) [1 2 3]))',
  },
  {
    name: 'top-level named anonymous recursion',
    code: '((fn fact [n] (if (= n 0) 1 (* n (fact (- n 1))))) 5)',
  },
  {
    name: 'top-level rest-param fn literal',
    code: '((fn [x & more] [x more]) 1 2 3)',
  },
  {
    name: 'top-level let closure capture',
    code: '((let [x 10] (fn [y] (+ x y))) 5)',
  },
  {
    name: 'top-level returned closure keeps captured local',
    code: '(((let [x 10] (fn [] (fn [] x)))))',
  },
  {
    name: 'top-level multi-arity fn literal',
    code: '((fn ([x] (+ x 1)) ([x y] (+ x y))) 20 22)',
  },
  { name: 'vec over filter and range', code: '(vec (filter odd? (range 6)))' },
  { name: 'vec over take and range', code: '(vec (take 5 (range 10)))' },
  {
    name: 'reduce over composed lazy calls',
    code: '(reduce + (map inc (filter odd? (range 8))))',
  },
  {
    name: 'try throw keyword catch',
    code: '(try (throw {:type :boom :v 9}) (catch :boom e (:v e)))',
  },
  {
    name: 'binding with dynamic print var',
    code: '(binding [*print-length* 2] (pr-str [1 2 3 4]))',
  },
  {
    name: 'set! inside binding',
    code: '(binding [*print-length* 5] (set! *print-length* 1) *print-length*)',
  },
  {
    name: 'prepared direct function call',
    setup: ['(def add1 (fn [x] (+ x 1)))'],
    code: '(add1 4)',
  },
  {
    name: 'prepared closure call',
    setup: ['(def make-adder (fn [x] (fn [y] (+ x y))))'],
    code: '((make-adder 10) 5)',
  },
  {
    name: 'prepared named recursive function call',
    setup: ['(def fact (fn fact [n] (if (= n 0) 1 (* n (fact (- n 1))))))'],
    code: '(fact 5)',
  },
]

const fallbackCases: FallbackCase[] = [
  {
    name: 'top-level def',
    code: '(def x 1)',
    category: 'unsupported-top-level-mutation',
  },
  {
    name: 'nested top-level mutation',
    code: '(do (def x 1) (+ x 2))',
    category: 'unsupported-top-level-mutation',
  },
  {
    name: 'namespace declaration',
    code: '(ns readiness.foo)',
    category: 'unsupported-top-level-mutation',
  },
  {
    name: 'defmacro special form',
    code: '(defmacro m [] 1)',
    category: 'unsupported-special-form',
  },
  {
    name: 'var special form',
    code: '(var +)',
    category: 'unsupported-special-form',
  },
  {
    name: 'async special form',
    code: '(async 42)',
    category: 'unsupported-special-form',
  },
  {
    name: 'letfn macro expansion',
    code: '(letfn [(even? [n] (if (= n 0) true (odd? (- n 1)))) (odd? [n] (if (= n 0) false (even? (- n 1))))] (even? 4))',
    category: 'unsupported-special-form',
  },
  {
    name: 'JS interop call',
    code: '(. js/Math pow 2 3)',
    category: 'unsupported-js-interop',
  },
  {
    name: 'JS constructor interop',
    code: '(js/new js/Date)',
    category: 'unsupported-js-interop',
  },
  {
    name: 'JS property symbol',
    code: 'js/Math.pow',
    category: 'unsupported-js-interop',
  },
  {
    name: 'direct destructuring let*',
    code: '(let* [[x] [1]] x)',
    category: 'unsupported-binding-form',
    opportunisticThrows: 'let* only supports simple symbol bindings',
  },
  {
    name: 'malformed if',
    code: '(if true 1 2 3)',
    category: 'compile-error',
  },
  {
    name: 'top-level fn literal with unsupported body',
    code: '(fn [] (letfn* [f (fn* [] nil)] (f)))',
    category: 'unsupported-special-form',
  },
]

function prepareSnapshot(setup: string[] = []): SessionSnapshot {
  const session = createSessionFromSnapshot(baseline, {
    vmExecutionMode: 'opportunistic',
  })
  for (const source of setup) {
    session.evaluate(source)
  }
  return snapshotSession(session)
}

function runFromSnapshot(
  snapshot: SessionSnapshot,
  code: string,
  mode: VmExecutionMode
): RunOutcome {
  const events: EvalEvent[] = []
  const session = createSessionFromSnapshot(snapshot, {
    vmExecutionMode: mode,
    instrumentation: { onEvent: (event) => events.push(event) },
  })

  try {
    return { ok: true, value: session.evaluate(code), events }
  } catch (error) {
    if (error instanceof Error) return { ok: false, error, events }
    throw error
  }
}

function expectTopLevelVm(events: EvalEvent[], mode: VmExecutionMode): void {
  expect(events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        path: 'vm:top-level',
        mode,
      }),
    ])
  )
}

function expectFallbackCategory(
  events: EvalEvent[],
  category: VmFallbackReason['category']
): void {
  expect(events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        path: 'fallback',
        reason: expect.objectContaining({ category }),
      }),
    ])
  )
}

describe('VM top-level readiness harness', () => {
  it.each(readyCases)('runs VM-ready top-level form: $name', (testCase) => {
    const snapshot = prepareSnapshot(testCase.setup)
    const off = runFromSnapshot(snapshot, testCase.code, 'off')
    const opportunistic = runFromSnapshot(snapshot, testCase.code, 'opportunistic')
    const required = runFromSnapshot(snapshot, testCase.code, 'vm-required')

    expect(off.ok).toBe(true)
    expect(opportunistic.ok).toBe(true)
    expect(required.ok).toBe(true)
    if (!off.ok || !opportunistic.ok || !required.ok) return

    expect(opportunistic.value).toEqual(off.value)
    expect(required.value).toEqual(off.value)
    expectTopLevelVm(opportunistic.events, 'opportunistic')
    expectTopLevelVm(required.events, 'vm-required')
  })

  it.each(fallbackCases)(
    'reports expected top-level VM fallback: $name',
    (testCase) => {
      const snapshot = prepareSnapshot(testCase.setup)
      const opportunistic = runFromSnapshot(
        snapshot,
        testCase.code,
        'opportunistic'
      )
      const required = runFromSnapshot(snapshot, testCase.code, 'vm-required')

      expectFallbackCategory(opportunistic.events, testCase.category)
      if (testCase.opportunisticThrows) {
        expect(opportunistic.ok).toBe(false)
        if (!opportunistic.ok) {
          expect(opportunistic.error.message).toContain(
            testCase.opportunisticThrows
          )
        }
      } else {
        expect(opportunistic.ok).toBe(true)
      }

      expect(required.ok).toBe(false)
      expectFallbackCategory(required.events, testCase.category)
      if (!required.ok) {
        expect(required.error.message).toContain('VM required but cannot compile')
      }
    }
  )

  it('keeps the curated fallback histogram stable', () => {
    const histogram = new Map<VmFallbackReason['category'], number>()

    for (const testCase of fallbackCases) {
      const snapshot = prepareSnapshot(testCase.setup)
      const required = runFromSnapshot(snapshot, testCase.code, 'vm-required')
      const fallback = required.events.find((event) => event.path === 'fallback')
      const category = fallback?.reason?.category

      expect(required.ok).toBe(false)
      expect(category).toBe(testCase.category)
      if (category) histogram.set(category, (histogram.get(category) ?? 0) + 1)
    }

    expect(histogram).toEqual(
      new Map([
        ['unsupported-top-level-mutation', 3],
        ['unsupported-special-form', 5],
        ['compile-error', 1],
        ['unsupported-js-interop', 3],
        ['unsupported-binding-form', 1],
      ])
    )
  })
})
