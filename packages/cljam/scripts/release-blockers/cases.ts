/**
 * Minimal repro definitions for release blockers discovered during
 * semantic test migration (session 298).
 *
 * Run with: bun run scripts/release-blockers/run-repros.ts
 */

export type BlockerCategory =
  | 'runtime-hang'
  | 'compile-error-missing'
  | 'file-load-failure'
  | 'test-harness-limitation'
  | 'unknown'

export type BlockerCase = {
  id: string
  title: string
  /** What JVM Clojure does, if known */
  jvmExpected: string
  /** What cljam should do for release */
  cljamExpected: string
  category: BlockerCategory
  /** Plain session.evaluate form, unless noted */
  form?: string
  /** Setup evaluated before the main form (e.g. require) */
  setup?: string[]
  /** If true, a thrown error is the correct outcome */
  expectError?: boolean
  /** Substring the error message should contain, when expectError */
  errorContains?: string
  /** If set, compare evaluate result to this JS number (quick check) */
  expectNumber?: number
}

export const BLOCKER_CASES: BlockerCase[] = [
  {
    id: 'RB-001',
    title: 'Invalid self-referential let fn (should not hang)',
    jvmExpected:
      'Compile error: Unable to resolve symbol: factorial in this context',
    cljamExpected:
      'Clear compile/resolve error before evaluation — not a hang or silent global lookup',
    category: 'compile-error-missing',
    form: `(let [factorial (fn ([n] (factorial n 1))
                              ([n acc] (if (<= n 1) acc (recur (dec n) (* n acc)))))]
           (factorial 5))`,
    expectError: true,
    errorContains: 'factorial',
  },
  {
    id: 'RB-002',
    title: 'letfn multi-arity factorial with recur (control: simple multi-arity passes)',
    jvmExpected: 'Returns 120',
    cljamExpected: 'Returns 120 without hanging',
    category: 'runtime-hang',
    form: `(letfn [(factorial ([n] (factorial n 1))
                              ([n acc] (if (<= n 1) acc (recur (dec n) (* n acc)))))]
           (factorial 5))`,
    expectNumber: 120,
  },
  {
    id: 'RB-002-control',
    title: 'letfn simple multi-arity (control — known good)',
    jvmExpected: 'Returns 15',
    cljamExpected: 'Returns 15',
    category: 'unknown',
    form: `(letfn [(f ([x] (f x 10))
                      ([x y] (+ x y)))]
           (f 5))`,
    expectNumber: 15,
  },
  {
    id: 'RB-003',
    title: 'take-nth over infinite range with bounded take (control: finite range passes)',
    jvmExpected: 'Returns lazy seq (0 3 6 9)',
    cljamExpected: 'Returns (0 3 6 9) without hanging',
    category: 'runtime-hang',
    form: '(vec (take 4 (take-nth 3 (range))))',
    expectNumber: undefined, // vector — checked separately
  },
  {
    id: 'RB-003-control',
    title: 'take-nth over finite range (control — known good)',
    jvmExpected: 'Returns (0 3 6 9)',
    cljamExpected: 'Returns (0 3 6 9)',
    category: 'unknown',
    form: '(vec (take 4 (take-nth 3 (range 12))))',
  },
  {
    id: 'RB-004',
    title: 'Top-level def multi-arity self-recur via def (control — known good in TS)',
    jvmExpected: 'Returns 120',
    cljamExpected: 'Returns 120',
    category: 'unknown',
    setup: [
      `(def factorial (fn ([n] (factorial n 1))
                         ([n acc] (if (<= n 1) acc (recur (dec n) (* n acc))))))`,
    ],
    form: '(factorial 5)',
    expectNumber: 120,
  },
  {
    id: 'RB-007',
    title: 'letfn-bound names not captured in lazy-seq thunk closures',
    jvmExpected: 'Returns [1 2] — letfn mutual recursion works inside lazy-seq',
    cljamExpected: 'Returns [1 2] without "Symbol not found" error',
    category: 'runtime-hang',
    form: `(letfn [(a [] (lazy-seq (cons 1 (b))))
                   (b [] (lazy-seq (cons 2 nil)))]
             (vec (a)))`,
  },
  {
    id: 'RB-007-control',
    title: 'letfn mutual recursion without lazy-seq (control — known good)',
    jvmExpected: 'Returns true',
    cljamExpected: 'Returns true',
    category: 'unknown',
    form: `(letfn [(my-even? [n] (if (zero? n) true  (my-odd?  (dec n))))
                   (my-odd?  [n] (if (zero? n) false (my-even? (dec n))))]
             (my-even? 10))`,
  },
  {
    id: 'RB-005',
    title: 'EDN map reader error catchable via thrown? in Clojure',
    jvmExpected: 'thrown? returns truthy for reader errors',
    cljamExpected:
      'thrown? can catch EDN reader errors from within a deftest body',
    category: 'test-harness-limitation',
    setup: [
      "(require '[clojure.edn :as edn])",
      "(require '[clojure.test :refer [thrown?]])",
    ],
    form: '(thrown? :default (edn/read-string "{:a}"))',
  },
  {
    id: 'RB-005-alt',
    title: 'EDN map reader error catchable via try/catch in Clojure',
    jvmExpected: 'try/catch returns :caught',
    cljamExpected: 'try/catch can catch EDN reader errors',
    category: 'test-harness-limitation',
    setup: ["(require '[clojure.edn :as edn])"],
    form: '(try (edn/read-string "{:a}") (catch :default _ :caught))',
  },
  {
    id: 'RB-005-control',
    title: 'EDN empty-input error catchable via try/catch (control)',
    jvmExpected: 'try/catch returns :caught',
    cljamExpected: 'try/catch returns :caught',
    category: 'unknown',
    setup: ["(require '[clojure.edn :as edn])"],
    form: '(try (edn/read-string "") (catch :default _ :caught))',
  },
]

/** Minimal Clojure test file source for RB-006 file-load probe */
export const PROTOCOL_TEST_FILE_SOURCE = `(ns repro.protocol-test
  (:require [clojure.test :refer [deftest is]]))

(defprotocol IShape
  (area [this]))

(defrecord Circle [radius]
  IShape
  (area [this] (* 3.14 (* radius radius))))

(deftest protocol-smoke
  (is (= 78.5 (area (->Circle 5)))))
`

/** defrecord-only file (works in predicates_test.clj today) */
export const DEFRECORD_ONLY_FILE_SOURCE = `(ns repro.defrecord-test
  (:require [clojure.test :refer [deftest is]]))

(defrecord Point [x y])

(deftest record-smoke
  (is (= 1 (:x (->Point 1 2)))))
`
