import { createSession, cljToJs } from '../../packages/cljam/src/core/index.ts'
import { library as schemaLib } from '../../packages/cljam-schema/schema.ts'

const RUNS = Number.parseInt(process.env.RUNS ?? '5', 10)

function createBenchSession(options = {}) {
  return createSession(options)
}

function formatMs(ms) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(3)}s`
  return `${ms.toFixed(1)}ms`
}

function bench(label, fn) {
  const times = []
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now()
    fn()
    times.push(performance.now() - start)
  }
  const avg = times.reduce((sum, t) => sum + t, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)
  console.log(
    `${label.padEnd(34)} avg ${formatMs(avg).padStart(8)}  min ${formatMs(min).padStart(8)}  max ${formatMs(max).padStart(8)}`
  )
  return { label, avg, min, max, times }
}

function assertJsEqual(label, actual, expected) {
  const a = JSON.stringify(cljToJs(actual))
  const e = JSON.stringify(expected)
  if (a !== e) {
    throw new Error(`${label}: expected ${e}, got ${a}`)
  }
}

console.log(`cljam performance baseline (${RUNS} runs each)`)
console.log(`Bun ${Bun.version} / ${process.platform} ${process.arch}`)
console.log()

const results = []

{
  const s = createBenchSession()
  s.evaluate(`
    (defn fib [n]
      (if (<= n 1)
        n
        (+ (fib (- n 1)) (fib (- n 2)))))
  `)
  assertJsEqual('fib correctness', s.evaluate('(fib 10)'), 55)
  results.push(bench('fib(35) recursion', () => s.evaluate('(fib 35)')))
}

{
  const s = createBenchSession()
  s.evaluate(`
    (defn sum-loop [n]
      (loop [i 0 acc 0]
        (if (> i n)
          acc
          (recur (+ i 1) (+ acc i)))))
  `)
  assertJsEqual('loop correctness', s.evaluate('(sum-loop 10)'), 55)
  results.push(bench('1M loop/recur sum', () => s.evaluate('(sum-loop 1000000)')))
}

{
  const s = createBenchSession()
  s.evaluate('(require \'[clojure.string :as str])')
  s.evaluate('(def data (vec (range 1000)))')
  s.evaluate('(def words (vec (map str (range 200))))')
  s.evaluate(`
    (def state
      {:users (mapv
                (fn [i] {:id i :name (str "user-" i) :score (* i 3)})
                (range 100))})
  `)
  assertJsEqual(
    'data transform correctness',
    s.evaluate('(count (mapv #(* % %) (filter even? data)))'),
    500
  )
  results.push(bench('filter/map vector workload', () => {
    s.evaluate('(mapv #(* % %) (filter even? data))')
  }))
  results.push(bench('assoc/reduce map workload', () => {
    s.evaluate('(reduce (fn [m i] (assoc m i (* i i))) {} (range 500))')
  }))
  results.push(bench('string join workload', () => {
    s.evaluate('(str/join ", " words)')
  }))
  results.push(bench('nested map update workload', () => {
    s.evaluate('(update state :users (fn [users] (mapv (fn [u] (update u :score inc)) users)))')
  }))
}

{
  const s = createBenchSession({
    libraries: [schemaLib],
    allowedPackages: ['cljam-schema', 'cljam.schema'],
  })
  s.evaluate('(ns baseline.schema (:require [cljam.schema.core :as schema]))')
  s.evaluate(`
    (def user-schema
      [:map
       [:id :int]
       [:name [:string {:min 1}]]
       [:email [:string {:pattern ".+@.+"}]]
       [:tags [:vector :keyword]]])
  `)
  s.evaluate(`
    (def users
      (mapv
        (fn [i]
          {:id i
           :name (str "user-" i)
           :email (str "user-" i "@example.com")
           :tags [:active :baseline]})
        (range 500)))
  `)
  assertJsEqual(
    'schema correctness',
    s.evaluate('(:ok (schema/validate [:vector user-schema] users))'),
    true
  )
  results.push(bench('schema validate 500 users', () => {
    s.evaluate('(schema/validate [:vector user-schema] users)')
  }))
}

{
  const s = createBenchSession()
  s.evaluate(`
    (defn lazy-pipeline [n]
      (->> (range n)
           (filter even?)
           (map #(* % %))
           (take 1000)
           (reduce + 0)))
  `)
  assertJsEqual('lazy correctness', s.evaluate('(lazy-pipeline 10000)'), 1331334000)
  results.push(bench('lazy seq pipeline', () => s.evaluate('(lazy-pipeline 10000)')))
}

{
  const s = createBenchSession()
  s.evaluate(`
    (def xf
      (comp
        (filter even?)
        (map #(* % %))
        (take 1000)))
    (defn transducer-pipeline [n]
      (transduce xf + 0 (range n)))
  `)
  assertJsEqual('transducer correctness', s.evaluate('(transducer-pipeline 10000)'), 1331334000)
  results.push(bench('transducer pipeline', () => s.evaluate('(transducer-pipeline 10000)')))
}

{
  const host = {
    inc(x) {
      return x + 1
    },
    add(a, b) {
      return a + b
    },
  }
  const s = createBenchSession({ hostBindings: { benchHost: host } })
  s.evaluate(`
    (defn host-loop [n]
      (loop [i 0 acc 0]
        (if (= i n)
          acc
          (recur (+ i 1) (js/benchHost.add acc (js/benchHost.inc i))))))
  `)
  assertJsEqual('host interop correctness', s.evaluate('(host-loop 10)'), 55)
  results.push(bench('host interop 100k calls', () => s.evaluate('(host-loop 100000)')))
}

{
  const s = createBenchSession()
  s.evaluate('(ns baseline.test (:require [clojure.test :as t :refer [deftest is run-tests]]))')
  s.evaluate(`
    (defmethod t/report :begin-test-ns [_] nil)
    (defmethod t/report :summary [_] nil)
  `)
  s.evaluate(`
    (deftest arithmetic-baseline
      (doseq [i (range 200)]
        (is (= i (+ i 0)))
        (is (= (* i i) (* i i)))))
  `)
  assertJsEqual('clojure.test correctness', s.evaluate('(:fail (run-tests \'baseline.test))'), 0)
  results.push(bench('clojure.test 400 assertions', () => {
    s.evaluate('(run-tests \'baseline.test)')
  }))
}

console.log()
console.log('| workload | avg ms | min ms | max ms |')
console.log('|---|---:|---:|---:|')
for (const r of results) {
  console.log(`| ${r.label} | ${r.avg.toFixed(2)} | ${r.min.toFixed(2)} | ${r.max.toFixed(2)} |`)
}
