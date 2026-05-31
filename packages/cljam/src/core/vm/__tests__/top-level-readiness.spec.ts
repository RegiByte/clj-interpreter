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

type MalformedCase = {
  name: string
  code: string
  message: string
  errorCode: string
}

type RunOutcome =
  | { ok: true; value: CljValue; events: EvalEvent[] }
  | { ok: false; error: Error; events: EvalEvent[] }

const baseline = snapshotSession(
  createSession({ hostBindings: { Math, Date, config: { db: { port: 5432 } } } })
)

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
  {
    name: 'cond macro expansion',
    code: '(cond false :no (= 1 1) :yes :else :bad)',
  },
  { name: 'case macro expansion', code: '(case 2 1 :one 2 :two :other)' },
  { name: 'when macro expansion', code: '(when true (+ 2 3))' },
  {
    name: 'if-let macro expansion',
    code: '(if-let [x (:a {:a 3})] (+ x 1) 0)',
  },
  { name: 'thread-first macro expansion', code: '(-> {:a 1} (assoc :b 2) :b)' },
  {
    name: 'thread-last macro expansion',
    code: '(->> [1 2 3] (map inc) (reduce +))',
  },
  {
    name: 'some-thread macro expansion',
    code: '(some-> {:a {:b 7}} :a :b inc)',
  },
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
    name: 'var special form',
    code: '(var +)',
  },
  {
    name: 'qualified var special form',
    code: '(var clojure.core/+)',
  },
  {
    name: 'lexical var special form',
    code: '(let [f (var +)] (var f))',
  },
  {
    name: 'letfn macro expansion',
    code: `(letfn [(even? [n] (if (= n 0) true (odd? (- n 1)))) 
                   (odd?  [n] (if (= n 0) false (even? (- n 1))))]
               (even? 4))`,
  },
  {
    name: 'top-level def',
    code: '(def x 1)',
  },
  {
    name: 'nested def in do',
    code: '(do (def x 1) (+ x 2))',
  },
  {
    name: 'bare def declaration',
    code: '(def native-shim)',
  },
  {
    name: 'bare def declaration in do',
    code: '(do (def native-shim) 42)',
  },
  {
    name: 'def dynamic var with binding and set!',
    code: '(do (def ^:dynamic *x* :root) (binding [*x* :bound] (set! *x* :mutated) *x*))',
  },
  {
    name: 'defn macro expansion',
    code: '(do (defn triple [x] (* x 3)) (triple 7))',
  },
  {
    name: 'defmacro same-source expansion',
    code: '(defmacro readiness-m [] 42) (readiness-m)',
  },
  {
    name: 'defmacro quasiquote body',
    code: '(defmacro readiness-twice [x] `(+ ~x ~x)) (readiness-twice 21)',
  },
  {
    name: 'defmacro variadic body',
    code: "(defmacro readiness-list [& xs] (cons 'list xs)) (readiness-list 1 2 3)",
  },
  {
    name: 'defmacro multi-arity body',
    code: '(defmacro readiness-choose ([] 1) ([x] x)) [(readiness-choose) (readiness-choose 9)]',
  },
  {
    name: 'macro-generated def',
    code: "(defmacro define-readiness-answer [] '(def readiness-answer 42)) (define-readiness-answer) readiness-answer",
  },
  {
    name: 'macro-defined macro',
    code: "(defmacro define-readiness-macro [] '(defmacro readiness-made [] 5)) (define-readiness-macro) (readiness-made)",
  },
  {
    name: 'function-body def interns globally',
    code: '(do ((fn [] (def inside-fn 42))) inside-fn)',
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
  {
    name: 'JS dot-chain property symbol',
    code: 'js/Math.PI',
  },
  {
    name: 'JS dot-chain nested value',
    code: 'js/config.db.port',
  },
  {
    name: 'JS dot-chain call',
    code: '(js/Math.pow 2 3)',
  },
  {
    name: 'JS interop dot call',
    code: '(. js/Math pow 2 3)',
  },
  {
    name: 'JS constructor interop',
    code: '(js/instanceof? (js/new js/Date "2026-01-01") js/Date)',
  },
]

const fallbackCases: FallbackCase[] = [
  {
    name: 'namespace declaration',
    code: '(ns readiness.foo)',
    category: 'unsupported-top-level-mutation',
  },
  {
    name: 'async special form',
    code: '(async 42)',
    category: 'unsupported-special-form',
  },
  {
    name: 'top-level fn literal with unsupported body',
    code: '(fn [] (letfn* [f (fn* [] (async 1))] (f)))',
    category: 'unsupported-special-form',
  },
]

const malformedCases: MalformedCase[] = [
  {
    name: 'malformed if',
    code: '(if true 1 2 3)',
    message: 'if requires 2 or 3 arguments, got 4',
    errorCode: 'malformed/if-arity',
  },
  {
    name: 'let* bindings must be vector',
    code: '(let* :not-a-vector 1)',
    message: 'let* bindings must be a vector',
    errorCode: 'malformed/binding-vector',
  },
  {
    name: 'let* bindings must be even',
    code: '(let* [x 1 y] x)',
    message: 'let* bindings must have an even number of forms',
    errorCode: 'malformed/binding-even',
  },
  {
    name: 'let* binding names must be symbols',
    code: '(let* [[x] [1]] x)',
    message: 'let* only supports simple symbol bindings; use let for destructuring',
    errorCode: 'malformed/let-binding-symbol',
  },
  {
    name: 'loop* bindings must be vector',
    code: '(loop* :not-a-vector 1)',
    message: 'loop* bindings must be a vector',
    errorCode: 'malformed/binding-vector',
  },
  {
    name: 'loop* bindings must be even',
    code: '(loop* [i 0 acc] acc)',
    message: 'loop* bindings must have an even number of forms',
    errorCode: 'malformed/binding-even',
  },
  {
    name: 'loop* binding names must be symbols',
    code: '(loop* [:i 0] :i)',
    message: 'loop* only supports simple symbol bindings; use loop for destructuring',
    errorCode: 'malformed/loop-binding-symbol',
  },
  {
    name: 'letfn* bindings must be vector',
    code: '(letfn* :bad nil)',
    message: 'letfn* bindings must be a vector',
    errorCode: 'malformed/letfn-bindings-vector',
  },
  {
    name: 'letfn* bindings must be even',
    code: '(letfn* [f (fn* [] 1) g] (f))',
    message: 'letfn* bindings must have an even number of forms',
    errorCode: 'malformed/letfn-bindings-even',
  },
  {
    name: 'letfn* binding names must be symbols',
    code: '(letfn* [1 (fn* [] 1)] 1)',
    message: 'letfn* binding names must be symbols',
    errorCode: 'malformed/letfn-name-symbol',
  },
  {
    name: 'set! requires two arguments',
    code: '(set! x)',
    message: 'set! requires exactly 2 arguments, got 1',
    errorCode: 'malformed/set-arity',
  },
  {
    name: 'set! target must be a symbol',
    code: '(set! 42 1)',
    message: 'set! first argument must be a symbol, got number',
    errorCode: 'malformed/set-target-symbol',
  },
]

function prepareSnapshot(setup: string[] = []): SessionSnapshot {
  const session = createSessionFromSnapshot(baseline, {
    vmExecutionMode: 'off',
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

function expectAnalyzerErrorCategory(
  events: EvalEvent[],
  category: VmFallbackReason['category']
): void {
  expect(events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        path: 'analyzer-error',
        reason: expect.objectContaining({ category }),
      }),
    ])
  )
}

describe('VM top-level readiness harness', () => {
  it.each(readyCases)('runs VM-ready top-level form: $name', (testCase) => {
    const snapshot = prepareSnapshot(testCase.setup)
    const off = runFromSnapshot(snapshot, testCase.code, 'off')
    const opportunistic = runFromSnapshot(
      snapshot,
      testCase.code,
      'opportunistic'
    )
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
        expect(required.error.message).toContain(
          'VM required but cannot compile'
        )
      }
    }
  )

  it.each(malformedCases)(
    'raises analyzer-owned malformed form: $name',
    (testCase) => {
      const snapshot = prepareSnapshot()
      const opportunistic = runFromSnapshot(
        snapshot,
        testCase.code,
        'opportunistic'
      )
      const required = runFromSnapshot(snapshot, testCase.code, 'vm-required')

      for (const outcome of [opportunistic, required]) {
        expect(outcome.ok).toBe(false)
        expectAnalyzerErrorCategory(outcome.events, 'compile-error')
        if (!outcome.ok) {
          expect(outcome.error.message).toContain(testCase.message)
          expect(outcome.error.message).toContain('^')
          expect((outcome.error as { code?: string }).code).toBe(
            testCase.errorCode
          )
        }
      }
    }
  )

  it('keeps the curated fallback histogram stable', () => {
    const histogram = new Map<VmFallbackReason['category'], number>()

    for (const testCase of fallbackCases) {
      const snapshot = prepareSnapshot(testCase.setup)
      const required = runFromSnapshot(snapshot, testCase.code, 'vm-required')
      const fallback = required.events.find(
        (event) => event.path === 'fallback'
      )
      const category = fallback?.reason?.category

      expect(required.ok).toBe(false)
      expect(category).toBe(testCase.category)
      if (category) histogram.set(category, (histogram.get(category) ?? 0) + 1)
    }

    expect(histogram).toEqual(
      new Map([
        ['unsupported-top-level-mutation', 1],
        ['unsupported-special-form', 2],
      ])
    )
  })
})
