/**
 * Workload definitions shared by every runner.
 *
 * Contract:
 * - `clj.setup` — array of forms evaluated once, in order, in a fresh session.
 *   IDENTICAL source for cljam and SCI: dialect-intersection only (no records,
 *   no sorted collections, no format, integer math via quot/mod, errors via
 *   ex-info + (catch :default e) + ex-data).
 * - `clj.run` — one form, evaluated per timed call, returns a scalar checksum.
 * - `js()` — factory returning { run } with the idiomatic-JS port (mutable
 *   structures on purpose: it is the speed-of-light reference, not a
 *   persistent-DS simulation).
 * - `expected` — hand-computed checksum. Verified against the JS port at module
 *   load; null means "trust the JS port" (used where hand-computing is error
 *   prone). Engines must match it exactly or they are excluded from timing.
 */

export const WORKLOADS = [
  {
    name: 'fib',
    kind: 'micro',
    subsystem: 'function-call overhead (naive recursion)',
    clj: {
      setup: ['(defn fib [n] (if (<= n 1) n (+ (fib (- n 1)) (fib (- n 2)))))'],
      run: '(fib 27)',
    },
    js: () => {
      const fib = (n) => (n <= 1 ? n : fib(n - 1) + fib(n - 2))
      return { run: () => fib(27) }
    },
    expected: 196418,
  },

  {
    name: 'loop-sum',
    kind: 'micro',
    subsystem: 'loop/recur, zero allocation',
    clj: {
      setup: [
        '(defn loop-sum [n] (loop [i 0 acc 0] (if (= i n) acc (recur (inc i) (+ acc i)))))',
      ],
      run: '(loop-sum 1000000)',
    },
    js: () => {
      const loopSum = (n) => {
        let acc = 0
        for (let i = 0; i < n; i++) acc += i
        return acc
      }
      return { run: () => loopSum(1000000) }
    },
    expected: 499999500000,
  },

  {
    name: 'closure-churn',
    kind: 'micro',
    subsystem: 'closure creation + capture + invocation',
    clj: {
      setup: [
        `(defn closure-churn [n]
           (loop [i 0 acc 0]
             (if (= i n)
               acc
               (let [a i
                     b (* 2 i)
                     f (fn [x] (+ a b x))]
                 (recur (inc i) (+ acc (f i)))))))`,
      ],
      run: '(closure-churn 10000)',
    },
    js: () => {
      const churn = (n) => {
        let acc = 0
        for (let i = 0; i < n; i++) {
          const a = i
          const b = 2 * i
          const f = (x) => a + b + x
          acc += f(i)
        }
        return acc
      }
      return { run: () => churn(10000) }
    },
    expected: 199980000,
  },

  {
    name: 'vector-build',
    kind: 'micro',
    subsystem: 'persistent vector conj/nth/peek/reduce',
    clj: {
      setup: [
        `(defn vector-build [n]
           (let [v (loop [i 0 v []] (if (= i n) v (recur (inc i) (conj v i))))]
             (+ (count v) (nth v (quot n 2)) (peek v) (reduce + 0 v))))`,
      ],
      run: '(vector-build 50000)',
    },
    js: () => {
      const build = (n) => {
        const v = []
        for (let i = 0; i < n; i++) v.push(i)
        let sum = 0
        for (const x of v) sum += x
        return v.length + v[Math.floor(n / 2)] + v[v.length - 1] + sum
      }
      return { run: () => build(50000) }
    },
    expected: 1250099999,
  },

  {
    name: 'vector-assoc',
    kind: 'micro',
    subsystem: 'persistent vector assoc (path-copy update on a large vector)',
    clj: {
      // Base built ONCE in setup so the timed form isolates assoc, not vec-build.
      // Each timed call threads `iters` path-copy updates from the shared immutable
      // base (structural sharing — the whole point of the trie), then checksums.
      setup: [
        '(def assoc-base (vec (range 10000)))',
        `(defn vector-assoc [iters]
           (loop [i 0 acc assoc-base]
             (if (= i iters)
               (reduce + 0 acc)
               (recur (inc i) (assoc acc (mod i 10000) i)))))`,
      ],
      run: '(vector-assoc 100000)',
    },
    js: () => {
      const N = 10000
      const ITERS = 100000
      const base = Array.from({ length: N }, (_, i) => i)
      const run = () => {
        // Speed-of-light reference: copy the base once, then mutate in place.
        // Same final contents as the threaded persistent assocs above.
        const v = base.slice()
        for (let i = 0; i < ITERS; i++) v[i % N] = i
        let sum = 0
        for (const x of v) sum += x
        return sum
      }
      return { run }
    },
    expected: 949995000,
  },

  {
    name: 'map-assoc',
    kind: 'micro',
    subsystem: 'persistent map assoc + lookup (HAMT)',
    clj: {
      setup: [
        `(defn map-assoc [n]
           (let [m (loop [i 0 m {}] (if (= i n) m (recur (inc i) (assoc m i (* i i)))))]
             (loop [i 0 acc 0] (if (= i n) acc (recur (inc i) (+ acc (get m i)))))))`,
      ],
      run: '(map-assoc 10000)',
    },
    js: () => {
      const mapAssoc = (n) => {
        const m = new Map()
        for (let i = 0; i < n; i++) m.set(i, i * i)
        let acc = 0
        for (let i = 0; i < n; i++) acc += m.get(i)
        return acc
      }
      return { run: () => mapAssoc(10000) }
    },
    expected: 333283335000,
  },

  {
    name: 'seq-pipeline',
    kind: 'micro',
    subsystem: 'lazy sequences: filter/map/take/reduce',
    clj: {
      setup: [
        `(defn seq-pipeline [n]
           (reduce + 0 (take 1000 (map (fn [x] (* x x)) (filter even? (range n))))))`,
      ],
      run: '(seq-pipeline 100000)',
    },
    js: () => {
      const pipeline = (n) => {
        let acc = 0
        let taken = 0
        for (let i = 0; i < n && taken < 1000; i++) {
          if (i % 2 === 0) {
            acc += i * i
            taken++
          }
        }
        return acc
      }
      return { run: () => pipeline(100000) }
    },
    expected: 1331334000,
  },

  {
    name: 'transduce-pipeline',
    kind: 'micro',
    subsystem: 'transducers: same logical work as seq-pipeline',
    clj: {
      setup: [
        '(def bench-xf (comp (filter even?) (map (fn [x] (* x x))) (take 1000)))',
        '(defn transduce-pipeline [n] (transduce bench-xf + 0 (range n)))',
      ],
      run: '(transduce-pipeline 100000)',
    },
    js: () => {
      // Same port as seq-pipeline: idiomatic JS has one obvious shape for this
      // work; the clj variants isolate laziness cost vs transducer cost.
      const pipeline = (n) => {
        let acc = 0
        let taken = 0
        for (let i = 0; i < n && taken < 1000; i++) {
          if (i % 2 === 0) {
            acc += i * i
            taken++
          }
        }
        return acc
      }
      return { run: () => pipeline(100000) }
    },
    expected: 1331334000,
  },

  {
    name: 'multimethod',
    kind: 'micro',
    subsystem: 'defmulti keyword dispatch',
    clj: {
      setup: [
        '(defmulti area :shape)',
        '(defmethod area :circle [s] (* 3 (:r s) (:r s)))',
        '(defmethod area :square [s] (* (:side s) (:side s)))',
        '(defmethod area :rect [s] (* (:w s) (:h s)))',
        '(def shapes [{:shape :circle :r 2} {:shape :square :side 3} {:shape :rect :w 2 :h 5}])',
        `(defn multimethod-bench [n]
           (loop [i 0 acc 0]
             (if (= i n) acc (recur (inc i) (+ acc (area (nth shapes (mod i 3))))))))`,
      ],
      run: '(multimethod-bench 30000)',
    },
    js: () => {
      const shapes = [
        { shape: 'circle', r: 2 },
        { shape: 'square', side: 3 },
        { shape: 'rect', w: 2, h: 5 },
      ]
      const area = (s) => {
        switch (s.shape) {
          case 'circle':
            return 3 * s.r * s.r
          case 'square':
            return s.side * s.side
          case 'rect':
            return s.w * s.h
        }
      }
      const bench = (n) => {
        let acc = 0
        for (let i = 0; i < n; i++) acc += area(shapes[i % 3])
        return acc
      }
      return { run: () => bench(30000) }
    },
    expected: 310000,
  },

  {
    name: 'try-catch',
    kind: 'micro',
    subsystem: 'throw/catch unwinding (ex-info + ex-data)',
    clj: {
      setup: [
        `(defn safe-op [a b]
           (try
             (if (zero? b)
               (throw (ex-info "div-by-zero" {:code 7}))
               (quot a b))
             (catch :default e (:code (ex-data e)))))`,
        `(defn try-catch-bench [n]
           (loop [i 0 acc 0]
             (if (= i n) acc (recur (inc i) (+ acc (safe-op 100 (mod i 4)))))))`,
      ],
      run: '(try-catch-bench 20000)',
    },
    js: () => {
      const safeOp = (a, b) => {
        try {
          if (b === 0) {
            const e = new Error('div-by-zero')
            e.code = 7
            throw e
          }
          return Math.floor(a / b)
        } catch (err) {
          return err.code
        }
      }
      const bench = (n) => {
        let acc = 0
        for (let i = 0; i < n; i++) acc += safeOp(100, i % 4)
        return acc
      }
      return { run: () => bench(20000) }
    },
    expected: 950000,
  },

  {
    name: 'destructure',
    kind: 'micro',
    subsystem: 'map/vector destructuring in fn params + let',
    clj: {
      setup: [
        `(defn process [{:keys [a b c] :or {c 5}}]
           (let [[x y] [a b]]
             (+ x y c)))`,
        `(def destructure-items
           (mapv (fn [i] (if (even? i) {:a i :b (* 2 i)} {:a i :b (* 2 i) :c 1}))
                 (range 100)))`,
        `(defn destructure-bench [n]
           (loop [i 0 acc 0]
             (if (= i n)
               acc
               (recur (inc i) (+ acc (process (nth destructure-items (mod i 100))))))))`,
      ],
      run: '(destructure-bench 20000)',
    },
    js: () => {
      const items = Array.from({ length: 100 }, (_, i) =>
        i % 2 === 0 ? { a: i, b: 2 * i } : { a: i, b: 2 * i, c: 1 }
      )
      const process = ({ a, b, c = 5 }) => {
        const [x, y] = [a, b]
        return x + y + c
      }
      const bench = (n) => {
        let acc = 0
        for (let i = 0; i < n; i++) acc += process(items[i % 100])
        return acc
      }
      return { run: () => bench(20000) }
    },
    expected: 3030000,
  },

  {
    name: 'atom-swap',
    kind: 'micro',
    subsystem: 'atom swap!/deref',
    clj: {
      setup: [
        '(def bench-counter (atom 0))',
        `(defn atom-bench [n]
           (reset! bench-counter 0)
           (loop [i 0]
             (if (= i n)
               (deref bench-counter)
               (do (swap! bench-counter inc) (recur (inc i))))))`,
      ],
      run: '(atom-bench 50000)',
    },
    js: () => {
      const counter = { value: 0 }
      const bench = (n) => {
        counter.value = 0
        for (let i = 0; i < n; i++) counter.value++
        return counter.value
      }
      return { run: () => bench(50000) }
    },
    expected: 50000,
  },

  {
    name: 'data-transform',
    kind: 'macro',
    subsystem: 'realistic ETL: filter → enrich → group-by → aggregate (5k records)',
    clj: {
      setup: [
        `(def bench-users
           (mapv (fn [i] {:id i
                          :name (str "user-" i)
                          :age (mod i 80)
                          :score (* 7 (mod i 100))})
                 (range 5000)))`,
        `(defn data-transform []
           (let [adults (filter (fn [u] (>= (:age u) 18)) bench-users)
                 enriched (map (fn [u] (assoc u :rank (quot (:score u) 100))) adults)
                 grouped (group-by :rank enriched)]
             (reduce (fn [acc k] (+ acc k (count (get grouped k)))) 0 (keys grouped))))`,
      ],
      run: '(data-transform)',
    },
    js: () => {
      const users = Array.from({ length: 5000 }, (_, i) => ({
        id: i,
        name: `user-${i}`,
        age: i % 80,
        score: 7 * (i % 100),
      }))
      const run = () => {
        const adults = users.filter((u) => u.age >= 18)
        const enriched = adults.map((u) => ({ ...u, rank: Math.floor(u.score / 100) }))
        const grouped = new Map()
        for (const u of enriched) {
          const group = grouped.get(u.rank)
          if (group) group.push(u)
          else grouped.set(u.rank, [u])
        }
        let acc = 0
        for (const [rank, group] of grouped) acc += rank + group.length
        return acc
      }
      return { run }
    },
    expected: null,
  },

  {
    name: 'string-build',
    kind: 'micro',
    subsystem: 'string construction + clojure.string/join',
    clj: {
      setup: [
        "(require '[clojure.string :as bench-str])",
        `(defn string-build [n]
           (count (bench-str/join "," (map (fn [i] (str "item-" i)) (range n)))))`,
      ],
      run: '(string-build 2000)',
    },
    js: () => {
      const build = (n) => Array.from({ length: n }, (_, i) => `item-${i}`).join(',').length
      return { run: () => build(2000) }
    },
    expected: 18889,
  },
]

for (const workload of WORKLOADS) {
  const jsResult = workload.js().run()
  if (workload.expected === null) {
    workload.expected = jsResult
  } else if (jsResult !== workload.expected) {
    throw new Error(
      `workload '${workload.name}': JS port returned ${jsResult}, expected ${workload.expected} — fix the port or the checksum before benchmarking anything`
    )
  }
}

export function getWorkload(name) {
  const workload = WORKLOADS.find((w) => w.name === name)
  if (!workload) {
    throw new Error(`unknown workload '${name}' (have: ${WORKLOADS.map((w) => w.name).join(', ')})`)
  }
  return workload
}
