import {
  createSession,
  cljNumber,
  cljToJs,
} from '../../../packages/cljam/dist/index.mjs'

function assertEqual(label, actual, expected) {
  const js = cljToJs(actual)
  if (js !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${js}`)
  }
}

function makeTimedCase({ name, group, description, setup, run }) {
  return {
    name,
    group,
    description,
    setup,
    run,
  }
}

function makeInstrumentedSession(extra = {}) {
  const events = []
  const session = createSession({
    output: () => {},
    instrumentation: { onEvent: (event) => events.push(event) },
    ...extra,
  })
  return { session, events }
}

export const workloads = [
  makeTimedCase({
    name: 'cold-eval',
    group: 'eval',
    description: 'Create a fresh session and evaluate a small loop function call.',
    setup() {
      return {}
    },
    run() {
      const session = createSession({ output: () => {} })
      const result = session.evaluate(`
        (do
          (defn cold-sum [n]
            (loop [i 0 acc 0]
              (if (> i n)
                acc
                (recur (+ i 1) (+ acc i)))))
          (cold-sum 1000))
      `)
      assertEqual('cold-eval', result, 500500)
    },
  }),

  makeTimedCase({
    name: 'cached-eval',
    group: 'eval',
    description: 'Repeated top-level evaluation of the same cached VM-ready form.',
    setup() {
      const session = createSession({ output: () => {} })
      session.evaluate(`
        (defn cached-sum [n]
          (loop [i 0 acc 0]
            (if (> i n)
              acc
              (recur (+ i 1) (+ acc i)))))
      `)
      const source = '(cached-sum 10000)'
      assertEqual('cached-eval warmup', session.evaluate(source), 50005000)
      return { session, source }
    },
    run({ session, source }) {
      assertEqual('cached-eval', session.evaluate(source), 50005000)
    },
  }),

  makeTimedCase({
    name: 'hot-bytecode-function',
    group: 'vm',
    description: 'Call a bytecode-backed cljam function directly through the session callable boundary.',
    setup() {
      const session = createSession({ output: () => {} })
      session.evaluate(`
        (defn hot-sum [n]
          (loop [i 0 acc 0]
            (if (> i n)
              acc
              (recur (+ i 1) (+ acc i)))))
      `)
      const fn = session.evaluate('hot-sum')
      const arg = cljNumber(10000)
      assertEqual('hot-bytecode-function warmup', session.applyFunction(fn, [arg]), 50005000)
      return { session, fn, arg }
    },
    run({ session, fn, arg }) {
      assertEqual('hot-bytecode-function', session.applyFunction(fn, [arg]), 50005000)
    },
  }),

  makeTimedCase({
    name: 'recursive-calls',
    group: 'vm',
    description: 'Naive recursive Fibonacci to stress VM call frames and return paths.',
    setup() {
      const session = createSession({ output: () => {} })
      session.evaluate(`
        (defn fib [n]
          (if (<= n 1)
            n
            (+ (fib (- n 1)) (fib (- n 2)))))
      `)
      const fn = session.evaluate('fib')
      const arg = cljNumber(24)
      assertEqual('recursive-calls warmup', session.applyFunction(fn, [cljNumber(10)]), 55)
      return { session, fn, arg }
    },
    run({ session, fn, arg }) {
      assertEqual('recursive-calls', session.applyFunction(fn, [arg]), 46368)
    },
  }),

  makeTimedCase({
    name: 'loop-recur',
    group: 'vm',
    description: 'Large loop/recur workload dominated by local loads, arithmetic intrinsics, jumps, and Recur.',
    setup() {
      const session = createSession({ output: () => {} })
      session.evaluate(`
        (defn sum-loop [n]
          (loop [i 0 acc 0]
            (if (> i n)
              acc
              (recur (+ i 1) (+ acc i)))))
      `)
      const fn = session.evaluate('sum-loop')
      const arg = cljNumber(100000)
      assertEqual('loop-recur warmup', session.applyFunction(fn, [cljNumber(10)]), 55)
      return { session, fn, arg }
    },
    run({ session, fn, arg }) {
      assertEqual('loop-recur', session.applyFunction(fn, [arg]), 5000050000)
    },
  }),

  makeTimedCase({
    name: 'generic-ifn',
    group: 'call',
    description: 'Collection/HOF workload with keyword, map, vector, native, and user function calls.',
    setup() {
      const session = createSession({ output: () => {} })
      session.evaluate(`
        (def data
          (mapv
            (fn [i] {:id i :score (* i 3) :flag (even? i)})
            (range 1000)))
        (defn generic-score [xs]
          (reduce
            (fn [acc item]
              (if (:flag item)
                (+ acc (:score item))
                acc))
            0
            xs))
      `)
      const fn = session.evaluate('generic-score')
      const data = session.evaluate('data')
      assertEqual('generic-ifn warmup', session.applyFunction(fn, [data]), 748500)
      return { session, fn, data }
    },
    run({ session, fn, data }) {
      assertEqual('generic-ifn', session.applyFunction(fn, [data]), 748500)
    },
  }),

  makeTimedCase({
    name: 'js-interop',
    group: 'interop',
    description: 'Synchronous host method calls from VM-compiled cljam code.',
    setup() {
      const host = {
        inc(x) {
          return x + 1
        },
        add(a, b) {
          return a + b
        },
      }
      const session = createSession({
        output: () => {},
        hostBindings: { benchHost: host },
      })
      session.evaluate(`
        (defn host-loop [n]
          (loop [i 0 acc 0]
            (if (= i n)
              acc
              (recur (+ i 1) (js/benchHost.add acc (js/benchHost.inc i))))))
      `)
      const fn = session.evaluate('host-loop')
      const arg = cljNumber(10000)
      assertEqual('js-interop warmup', session.applyFunction(fn, [cljNumber(10)]), 55)
      return { session, fn, arg }
    },
    run({ session, fn, arg }) {
      assertEqual('js-interop', session.applyFunction(fn, [arg]), 50005000)
    },
  }),

  makeTimedCase({
    name: 'suite-session-bootstrap',
    group: 'suite',
    description:
      'Create a real session and evaluate a small expression, mirroring repeated test setup cost.',
    setup() {
      return {}
    },
    run() {
      const { session } = makeInstrumentedSession()
      assertEqual('suite-session-bootstrap', session.evaluate('(+ 1 2)'), 3)
    },
  }),

  makeTimedCase({
    name: 'suite-namespace-macro-alias',
    group: 'suite',
    description:
      'Repeated namespace creation plus clojure.core alias macro expansion, inspired by namespace-values.spec.ts.',
    setup() {
      const { session, events } = makeInstrumentedSession()
      return { session, events, counter: 0 }
    },
    run(state) {
      state.counter++
      const ns = `suite.macro.alias.${state.counter}`
      state.session.evaluate(`(ns ${ns} (:require [clojure.core :as cc]))`)
      const result = state.session.evaluate(`
        [(cc/when true 99)
         (cc/when-let [x 1] (+ x 41))
         (cc/cond-> {:a 1} true (assoc :b 2))]
      `)
      const js = cljToJs(result)
      if (js[0] !== 99 || js[1] !== 42 || js[2].a !== 1 || js[2].b !== 2) {
        throw new Error(`suite-namespace-macro-alias: unexpected result ${JSON.stringify(js)}`)
      }
    },
  }),

  makeTimedCase({
    name: 'suite-bytecode-census',
    group: 'suite',
    description:
      'Run cljam.vm namespace census/stat helpers over clojure.core, inspired by bytecode-info/census tests.',
    setup() {
      const { session, events } = makeInstrumentedSession()
      session.evaluate("(require '[cljam.vm :as vm])")
      const source = `
        (let [census (vm/namespace-census 'clojure.core {:include-private? true})
              totals (:totals census)
              freqs (vm/top-opcodes census 8)]
          [(:vars totals)
           (:chunks totals)
           (count freqs)])
      `
      const first = cljToJs(session.evaluate(source))
      if (first[0] < 400 || first[1] < 100 || first[2] === 0) {
        throw new Error(`suite-bytecode-census warmup: unexpected result ${JSON.stringify(first)}`)
      }
      return { session, events, source }
    },
    run({ session, source }) {
      const result = cljToJs(session.evaluate(source))
      if (result[0] < 400 || result[1] < 100 || result[2] === 0) {
        throw new Error(`suite-bytecode-census: unexpected result ${JSON.stringify(result)}`)
      }
    },
  }),

  makeTimedCase({
    name: 'suite-js-interop-composition',
    group: 'suite',
    description:
      'Mixed host property/method calls and clj/js conversion, inspired by JS interop composition tests.',
    setup() {
      const host = {
        data: {
          users: [
            { id: 1, score: 10, active: true },
            { id: 2, score: 20, active: false },
            { id: 3, score: 30, active: true },
          ],
        },
        user(index) {
          return this.data.users[index]
        },
        count() {
          return this.data.users.length
        },
        score(user) {
          return user.score
        },
        active(user) {
          return user.active
        },
      }
      const { session, events } = makeInstrumentedSession({
        hostBindings: { suiteHost: host },
      })
      session.evaluate(`
        (defn active-score []
          (loop [i 0 acc 0]
            (if (= i (js/suiteHost.count))
              acc
              (let [user (js/suiteHost.user i)]
                (recur
                  (+ i 1)
                  (if (js/suiteHost.active user)
                    (+ acc (js/suiteHost.score user))
                    acc))))))
      `)
      const fn = session.evaluate('active-score')
      assertEqual('suite-js-interop-composition warmup', session.applyFunction(fn, []), 40)
      return { session, events, fn }
    },
    run({ session, fn }) {
      assertEqual('suite-js-interop-composition', session.applyFunction(fn, []), 40)
    },
  }),

  makeTimedCase({
    name: 'suite-unwind-mix',
    group: 'suite',
    description:
      'Exception/catch/finally/binding-heavy VM code, inspired by unwind compiler tests.',
    setup() {
      const { session, events } = makeInstrumentedSession()
      session.evaluate(`
        (defn guarded [n]
          (loop [i 0 acc 0]
            (if (= i n)
              acc
              (recur
                (+ i 1)
                (+ acc
                   (try
                     (if (= 0 (mod i 17))
                       (throw {:type :skip :value i})
                       i)
                     (catch :skip e 0)
                     (finally (+ i 1))))))))
      `)
      const fn = session.evaluate('guarded')
      assertEqual('suite-unwind-mix warmup', session.applyFunction(fn, [cljNumber(10)]), 45)
      return { session, events, fn, arg: cljNumber(500) }
    },
    run({ session, fn, arg }) {
      assertEqual('suite-unwind-mix', session.applyFunction(fn, [arg]), 117355)
    },
  }),
]

export function findWorkload(name) {
  return workloads.find((workload) => workload.name === name)
}
