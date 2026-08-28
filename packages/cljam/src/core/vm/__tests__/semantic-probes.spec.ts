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

type ProbeDomain =
  | 'arithmetic'
  | 'predicates'
  | 'collections'
  | 'ifn'
  | 'state'
  | 'metadata'
  | 'vars'
  | 'destructuring'
  | 'lazy-seq'
  | 'unwind'
  | 'hof'
  | 'transducers'
  | 'multi-arity'
  | 'threading'
  | 'namespace-introspection'
  | 'interop'
  | 'known-unsupported'

type ReadyProbe = {
  name: string
  domain: ProbeDomain
  code: string
  setup?: string[]
}

type ThrowProbe = {
  name: string
  domain: ProbeDomain
  code: string
  message: string | RegExp
  setup?: string[]
}

type FallbackProbe = {
  name: string
  domain: ProbeDomain
  code: string
  category: VmFallbackReason['category']
  setup?: string[]
  opportunisticThrows?: string | RegExp
}

type RunOutcome =
  | { ok: true; value: CljValue; events: EvalEvent[] }
  | { ok: false; error: Error; events: EvalEvent[] }

const baseline = snapshotSession(createSession({ hostBindings: { Math, Date } }))

const readyProbes: ReadyProbe[] = [
  { domain: 'arithmetic', name: 'addition arity zero', code: '(+)' },
  { domain: 'arithmetic', name: 'nested arithmetic', code: '(+ 1 (* 2 3))' },
  {
    domain: 'arithmetic',
    name: 'comparison chain',
    code: '[(> 3 2 1) (< 3 4 5) (>= 5 3 3 1) (<= 1 2 2 4)]',
  },
  { domain: 'arithmetic', name: 'inc dec min max', code: '[(inc 5) (dec 5) (min 3 1 2) (max 3 1 2)]' },

  { domain: 'predicates', name: 'truthiness helpers', code: '[(truthy? 0) (falsy? nil) (true? true) (false? false) (not (= 1 0))]' },
  {
    domain: 'predicates',
    name: 'type predicates',
    code: '[(number? 42) (string? "x") (boolean? false) (vector? [1]) (map? {:a 1}) (keyword? :a) (symbol? (quote x)) (fn? +)]',
  },
  {
    domain: 'predicates',
    name: 'type over representative values',
    code: '[(type 42) (type "x") (type true) (type nil) (type :k) (type (quote x)) (type [1]) (type {:a 1})]',
  },

  { domain: 'collections', name: 'count over core values', code: '[(count [1 2 3]) (count {:a 1 :b 2}) (count "abc") (count nil)]' },
  { domain: 'collections', name: 'first rest get', code: '[(first [1 2 3]) (vec (rest [1 2 3])) (get {:a 1} :a) (get {:a 1} :z :default)]' },
  { domain: 'collections', name: 'conj assoc dissoc', code: '[(conj [1 2] 3) (assoc {:a 1} :b 2) (dissoc {:a 1 :b 2} :a)]' },
  { domain: 'collections', name: 'quoted lists', code: '[(first (quote (1 2 3))) (vec (rest (quote (1 2 3)))) (= (quote (1)) (quote (1)))]' },

  { domain: 'ifn', name: 'keyword map vector IFn', code: '[(:a {:a 1}) ({:a 1} :a) ([10 20 30] 1)]' },
  { domain: 'ifn', name: 'IFn in higher-order position', code: '[(vec (map {:a 1 :b 2} [:a :b])) (vec (map #{:a :c} [:a :b :c]))]' },
  { domain: 'ifn', name: 'conditional callee', code: '((if true + -) 10 3)' },
  { domain: 'ifn', name: 'vector IFn through comp', code: '((comp [10 20 30]) 1)' },

  { domain: 'state', name: 'atom deref swap reset', code: '(let [a (atom 0)] (swap! a inc) (reset! a (+ @a 9)) @a)' },
  { domain: 'state', name: 'atom swap with extra args', code: '(let [a (atom {:x 1})] (swap! a assoc :x 2) @a)' },
  { domain: 'state', name: 'swap-vals and reset-vals', code: '(do (def a (atom 1)) [(swap-vals! a inc) (reset-vals! a 99) @a])' },
  { domain: 'state', name: 'compare-and-set success and failure', code: '(let [a (atom 1)] [(compare-and-set! a 1 2) (compare-and-set! a 1 3) @a])' },
  { domain: 'state', name: 'watchers observe swaps', code: '(do (def a (atom 0)) (def log (atom [])) (add-watch a :log (fn [k ref old new] (swap! log conj [old new]))) (swap! a inc) (swap! a inc) @log)' },
  { domain: 'state', name: 'validator permits valid state', code: '(do (def a (atom 1)) (set-validator! a pos?) (reset! a 5) @a)' },

  { domain: 'metadata', name: 'with-meta and meta on function', code: '(do (def f (with-meta (fn [x] x) {:doc "id"})) (:doc (meta f)))' },
  { domain: 'metadata', name: 'defn doc and arglists metadata', code: '(do (defn add "Adds." [a b] (+ a b)) [(:doc (meta (var add))) (vector? (:arglists (meta (var add)))) (add 1 2)])' },
  { domain: 'metadata', name: 'reader metadata on collection', code: '[(meta ^:fast []) (:a (meta ^{:a 1} []))]' },

  { domain: 'vars', name: 'def lookup and var-get', code: '(do (def x 5) [(= x 5) (var? (var x)) (var-get (var x))])' },
  { domain: 'vars', name: 'alter-var-root', code: '(do (def x 5) (alter-var-root (var x) inc) x)' },
  { domain: 'vars', name: 'dynamic binding restores', code: '(do (def ^:dynamic *probe* :root) [(binding [*probe* :bound] *probe*) *probe*])' },
  { domain: 'vars', name: 'set inside binding', code: '(do (def ^:dynamic *probe* :root) [(binding [*probe* :bound] (set! *probe* :mutated) *probe*) *probe*])' },

  { domain: 'destructuring', name: 'vector destructuring', code: '(let [[a b & more] [1 2 3 4]] [a b (vec more)])' },
  { domain: 'destructuring', name: 'map destructuring defaults', code: '(let [{:keys [a b] :or {b 99}} {:a 1}] [a b])' },
  { domain: 'destructuring', name: 'nested mixed destructuring', code: '(let [[a {:keys [b]}] [1 {:b 2}]] [a b])' },
  { domain: 'destructuring', name: 'function parameter destructuring', code: '((fn [[a b] {:keys [c]}] [a b c]) [1 2] {:c 3})' },
  { domain: 'destructuring', name: 'loop destructuring with recur', code: '(loop [[x & xs] [1 2 3] acc 0] (if (nil? x) acc (recur xs (+ acc x))))' },

  { domain: 'lazy-seq', name: 'delay force', code: '(let [x 10] (force (delay (+ x 5))))' },
  { domain: 'lazy-seq', name: 'lazy seq realizes through vec', code: '(vec (lazy-seq (list 1 2 3)))' },
  { domain: 'lazy-seq', name: 'map filter take range reduce', code: '[(vec (take 3 (map inc (range)))) (vec (take 3 (filter even? (range)))) (reduce + (map inc (filter odd? (range 8))))]' },
  { domain: 'lazy-seq', name: 'iterate cycle repeat', code: '[(vec (take 5 (iterate inc 0))) (vec (take 7 (cycle [1 2 3]))) (vec (take 3 (repeat :x)))]' },
  { domain: 'lazy-seq', name: 'drop take-while keep', code: '[(vec (take 3 (drop 5 (range)))) (vec (take 4 (take-while (fn [x] (< x 10)) (range)))) (vec (take 4 (keep (fn [x] (when (even? x) (* x 10))) (range))))]' },

  { domain: 'unwind', name: 'keyword catch', code: '(try (throw {:type :error/test :message "oops"}) (catch :error/test e (:message e)))' },
  { domain: 'unwind', name: 'default catch bare value', code: '(try (throw 99) (catch :default e e))' },
  { domain: 'unwind', name: 'predicate catch', code: '(try (throw "oops") (catch string? e (str "got: " e)))' },
  { domain: 'unwind', name: 'finally preserves catch result', code: '(try (throw {:type :error/test}) (catch :default e "catch-result") (finally "finally-result"))' },
  { domain: 'unwind', name: 'binding unwinds through throw', code: '(do (def ^:dynamic *n* 0) (try (binding [*n* 99] (throw {:type :error/test})) (catch :default e *n*)))' },

  { domain: 'hof', name: 'str and apply', code: '[(str "x:" 42) (apply + 42 [1 2 3])]' },
  { domain: 'hof', name: 'juxt variants', code: '[((juxt inc dec) 10) ((juxt + *) 2 3 4) ((juxt) 1 2 3)]' },
  { domain: 'hof', name: 'merge select update', code: '[(merge {:a 1} {:a 2 :b 3}) (select-keys {:a nil :b 2} [:a]) (update {:a [1]} :a conj 2 3)]' },
  { domain: 'hof', name: 'frequencies group-by distinct flatten', code: '[(frequencies [1 1 2 3 2]) (group-by odd? [1 2 3 4]) (vec (distinct [1 2 1 3 2])) (vec (flatten [1 [2 [3 4] []] 5]))]' },
  { domain: 'hof', name: 'reduce-kv sort sort-by', code: '[(reduce-kv (fn [acc k v] (+ acc k v)) 0 [10 20 30]) (vec (sort > [3 1 2])) (vec (sort-by first [[2 "b"] [1 "a"] [3 "c"]]))]' },
  { domain: 'hof', name: 'comp and partial', code: '[((comp str inc dec) 5) ((comp :name) {:name "Alice" :age 30}) ((partial + 10) 5 3) (vec ((partial map inc) [1 2 3]))]' },

  { domain: 'transducers', name: 'reduced helpers', code: '[(reduced? (reduced 42)) (unreduced (reduced 42)) (deref (reduced 42)) (reduced? 42)]' },
  { domain: 'transducers', name: 'reduce short-circuits on reduced', code: '(reduce (fn [acc x] (if (= x 3) (reduced acc) (conj acc x))) [] [1 2 3 4 5])' },
  { domain: 'transducers', name: 'volatile state', code: '(let [v (volatile! 10)] [(volatile? v) (vswap! v + 5) @v (vreset! v 99) @v])' },
  { domain: 'transducers', name: 'transduce map filter comp', code: '[(transduce (map inc) conj [] [1 2 3]) (transduce (filter even?) conj [] [1 2 3 4 5]) (transduce (comp (map inc) (filter even?)) conj [] [1 2 3 4 5])]' },
  { domain: 'transducers', name: 'sequence and into transducer', code: '[(vec (sequence (map inc) [1 2 3])) (into [] (filter odd?) [1 2 3 4 5]) (into [] (comp (map inc) (filter even?)) [1 2 3 4])]' },
  { domain: 'transducers', name: 'take/drop transducer functions', code: '[(vec (take-while pos? [1 2 0 3])) (vec (drop-while neg? [-1 -2 3 4])) (vec (drop-last 2 [1 2 3 4])) (vec (take-last 2 [1 2 3 4]))]' },

  { domain: 'multi-arity', name: 'fn dispatch by arity', code: '(do (def f (fn ([] 0) ([x] x) ([x y] (+ x y)))) [(f) (f 5) (f 3 4)])' },
  { domain: 'multi-arity', name: 'fixed arity preferred over variadic', code: '(do (def f (fn ([x] :exact) ([x & rest] :variadic))) [(f 1) (f 1 2 3)])' },
  { domain: 'multi-arity', name: 'multi-arity recur', code: '(do (def factorial (fn ([n] (factorial n 1)) ([n acc] (if (<= n 1) acc (recur (dec n) (* n acc)))))) (factorial 5))' },
  { domain: 'multi-arity', name: 'multi-arity macro recursion', code: '(defmacro probe-and ([] true) ([x] x) ([x & more] `(if ~x (probe-and ~@more) ~x))) [(probe-and) (probe-and true true 99) (probe-and true false 99)]' },

  { domain: 'threading', name: 'as-> and cond->', code: '[(as-> 1 x (+ x 1) (* x 2)) (cond-> 0 true inc true inc false inc) (cond-> 10 true (+ 5))]' },
  { domain: 'threading', name: 'cond->> and some threading', code: '[(vec (cond->> [1 2 3] true (map inc))) (some-> 1 inc inc) (some-> nil inc) (vec (some->> [1 2 3] (map inc) (filter even?)))]' },

  { domain: 'namespace-introspection', name: 'current namespace symbols', code: '[(symbol? (ns-name *ns*)) (contains? (ns-publics (quote clojure.core)) (quote +)) (contains? (ns-interns (quote clojure.core)) (quote +))]' },
  { domain: 'namespace-introspection', name: 'namespace values and lookup', code: '[(namespace? *ns*) (= (find-ns (quote user)) *ns*) (symbol? (ns-name (find-ns (quote clojure.core)))) (every? namespace? (all-ns))]' },
  { domain: 'namespace-introspection', name: 'private vars excluded from publics', code: '(do (defn- private-fn [x] x) (defn public-fn [x] x) [(contains? (ns-publics (quote user)) (quote private-fn)) (contains? (ns-interns (quote user)) (quote private-fn)) (contains? (ns-publics (quote user)) (quote public-fn))])' },

  { domain: 'interop', name: 'JS property symbol', code: 'js/Math.PI' },
  { domain: 'interop', name: 'JS dot call', code: '(. js/Math pow 2 3)' },
  { domain: 'interop', name: 'JS constructor', code: '(js/instanceof? (js/new js/Date "2026-01-01") js/Date)' },
]

const throwProbes: ThrowProbe[] = [
  { domain: 'arithmetic', name: 'division by zero', code: '(/ 1 0)', message: /division by zero/i },
  { domain: 'arithmetic', name: 'bad comparison arg', code: '(< 3 2 "a")', message: '< expects all arguments to be numbers' },
  { domain: 'collections', name: 'bad count arg', code: '(count true)', message: 'count expects a countable value' },
  { domain: 'collections', name: 'bad conj arg', code: '(conj "a" "b")', message: 'conj expects a collection' },
  { domain: 'ifn', name: 'map IFn with no args', code: '({:a 1})', message: 'Map used as function requires at least one argument' },
  { domain: 'ifn', name: 'vector IFn bad arity', code: '([10 20 30] 3 0)', message: 'Vector used as function requires exactly one argument' },
  { domain: 'state', name: 'deref rejects non-reference', code: '(deref 42)', message: 'deref expects an atom' },
  { domain: 'state', name: 'swap rejects non-atom', code: '(swap! 42 inc)', message: 'swap! expects an atom' },
  { domain: 'state', name: 'validator rejects invalid state', code: '(do (def a (atom 1)) (set-validator! a pos?) (reset! a -1))', message: 'Invalid reference state' },
  { domain: 'vars', name: 'binding refuses non-dynamic var', code: '(do (def x 1) (binding [x 2] x))', message: /non-dynamic/ },
  { domain: 'unwind', name: 'unhandled throw', code: '(throw {:type :error/test})', message: 'Unhandled throw' },
  { domain: 'hof', name: 'juxt rejects non-callable', code: '((juxt 1) 10)', message: 'apply expects a callable as first argument' },
  { domain: 'hof', name: 'partial rejects non-callable', code: '(partial 42)', message: 'partial expects a callable' },
  { domain: 'transducers', name: 'volatile reset rejects non-volatile', code: '(vreset! 42 1)', message: 'vreset! expects a volatile' },
  { domain: 'multi-arity', name: 'fn arity mismatch', code: '((fn ([] 0) ([x y] (+ x y))) 1)', message: 'No matching arity for 1 arguments' },
]

const fallbackProbes: FallbackProbe[] = [
  { domain: 'known-unsupported', name: 'namespace declaration boundary', code: '(ns probe.boundary)', category: 'unsupported-top-level-mutation' },
  { domain: 'known-unsupported', name: 'async special form', code: '(async 42)', category: 'unsupported-special-form' },
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

function expectMessage(error: Error, expected: string | RegExp): void {
  if (typeof expected === 'string') {
    expect(error.message).toContain(expected)
  } else {
    expect(error.message).toMatch(expected)
  }
}

describe('VM semantic probe harness', () => {
  it.each(readyProbes)(
    'runs evaluator-style probe in vm-required: $domain / $name',
    (probe) => {
      const snapshot = prepareSnapshot(probe.setup)
      const off = runFromSnapshot(snapshot, probe.code, 'off')
      const opportunistic = runFromSnapshot(
        snapshot,
        probe.code,
        'opportunistic'
      )
      const required = runFromSnapshot(snapshot, probe.code, 'vm-required')

      expect(off.ok).toBe(true)
      expect(opportunistic.ok).toBe(true)
      expect(required.ok).toBe(true)
      if (!off.ok || !opportunistic.ok || !required.ok) return

      expect(opportunistic.value).toEqual(off.value)
      expect(required.value).toEqual(off.value)
      expectTopLevelVm(opportunistic.events, 'opportunistic')
      expectTopLevelVm(required.events, 'vm-required')
    }
  )

  it.each(throwProbes)(
    'throws like the interpreter in vm-required: $domain / $name',
    (probe) => {
      const snapshot = prepareSnapshot(probe.setup)
      const off = runFromSnapshot(snapshot, probe.code, 'off')
      const required = runFromSnapshot(snapshot, probe.code, 'vm-required')

      expect(off.ok).toBe(false)
      expect(required.ok).toBe(false)
      if (off.ok || required.ok) return

      expect(required.error.constructor).toBe(off.error.constructor)
      expectMessage(required.error, probe.message)
      expectTopLevelVm(required.events, 'vm-required')
    }
  )

  it.each(fallbackProbes)(
    'classifies expected unsupported probe: $domain / $name',
    (probe) => {
      const snapshot = prepareSnapshot(probe.setup)
      const opportunistic = runFromSnapshot(
        snapshot,
        probe.code,
        'opportunistic'
      )
      const required = runFromSnapshot(snapshot, probe.code, 'vm-required')

      expectFallbackCategory(opportunistic.events, probe.category)
      if (probe.opportunisticThrows) {
        expect(opportunistic.ok).toBe(false)
        if (!opportunistic.ok) expectMessage(opportunistic.error, probe.opportunisticThrows)
      } else {
        expect(opportunistic.ok).toBe(true)
      }

      expect(required.ok).toBe(false)
      expectFallbackCategory(required.events, probe.category)
      if (!required.ok) {
        expect(required.error.message).toContain(
          'VM required but cannot compile'
        )
      }
    }
  )

  it('keeps the discovery matrix intentionally broad', () => {
    const domains = new Set<ProbeDomain>()
    for (const probe of [...readyProbes, ...throwProbes, ...fallbackProbes]) {
      domains.add(probe.domain)
    }

    expect(domains).toEqual(
      new Set<ProbeDomain>([
        'arithmetic',
        'predicates',
        'collections',
        'ifn',
        'state',
        'metadata',
        'vars',
        'destructuring',
        'lazy-seq',
        'unwind',
        'hof',
        'transducers',
        'multi-arity',
        'threading',
        'namespace-introspection',
        'interop',
        'known-unsupported',
      ])
    )
  })
})
