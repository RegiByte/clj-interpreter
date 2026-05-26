;; Sequence operation tests written in Clojure.
;; Covers map, filter, reduce, apply and lazy sequence semantics.

(ns clojure-suite.sequences-test
  (:require [clojure.test :refer [deftest is testing are thrown?]]))

(defn lazy-range-from
  [n]
  (lazy-seq
    (cons n (lazy-range-from (inc n)))))

;;; ── Core sequence access ──────────────────────────────────────────────────────

(deftest first-rest-next
  (is (= 1 (first [1 2 3])))
  (is (= 1 (first '(1 2 3))))
  (is (nil? (first [])))
  (is (nil? (first nil)))
  (is (= '(2 3) (rest [1 2 3])))
  (is (= '() (rest [1])))
  (is (= '() (rest [])))
  (is (= '(2 3) (next [1 2 3])))
  (is (nil? (next [1])))
  (is (nil? (next []))))

(deftest expanded-sequence-accessors
  (is (= 2 (fnext [1 2 3])))
  (is (= '(3) (nnext [1 2 3])))
  (is (= '(3 4) (nthnext [1 2 3 4] 2)))
  (is (= [3 4] (vec (nthrest [1 2 3 4] 2))))
  (is (= '(1 2 3 4) (list* 1 2 [3 4])))
  (is (= '(1 2 3) (list* 1 [2 3]))))

(deftest last-butlast
  (is (= 3 (last [1 2 3])))
  (is (= 3 (last '(1 2 3))))
  (is (nil? (last [])))
  (is (= [1 2] (butlast [1 2 3])))
  (is (nil? (butlast [1])))
  (is (nil? (butlast []))))

(deftest second-and-nth
  (is (= 2 (second [1 2 3])))
  (is (nil? (second [1])))
  (is (= 3 (nth [1 2 3] 2)))
  (is (= :nope (nth [1 2 3] 10 :nope))))

;;; ── Transformation ───────────────────────────────────────────────────────────

(deftest map-transforms
  (is (= [2 4 6] (vec (map #(* 2 %) [1 2 3]))))
  (is (= [] (vec (map inc []))))
  (is (= [5 7 9] (vec (map + [1 2 3] [4 5 6]))))
  (is (= #{:a :b :c} (set (map key {:a 1 :b 2 :c 3}))))
  (is (= #{1 2 3} (set (map val {:a 1 :b 2 :c 3})))))

(deftest filter-removes
  (is (= [2 4 6] (vec (filter even? [1 2 3 4 5 6]))))
  (is (= [] (vec (filter even? [1 3 5]))))
  (is (= [1 2 3] (vec (filter some? [1 nil 2 nil 3])))))

(deftest remove-is-filter-complement
  (is (= [1 3 5] (vec (remove even? [1 2 3 4 5 6]))))
  (is (= [nil nil] (vec (remove some? [1 nil 2 nil])))))

(deftest keep-filters-and-transforms
  (is (= [2 4] (vec (keep #(when (even? %) %) [1 2 3 4 5]))))
  (is (= [10 30] (vec (keep-indexed #(when (even? %1) (* %2 10)) [1 2 3])))))

(deftest mapcat-flattens
  (is (= [1 2 2 3 3 4] (vec (mapcat #(list % (inc %)) [1 2 3]))))
  (is (= [:a :b :c] (vec (mapcat identity [[:a] [:b :c]])))))

(deftest eager-vector-sequence-helpers
  (is (= [2 3 4] (mapv inc [1 2 3])))
  (is (= [2 4] (filterv even? [1 2 3 4])))
  (let [seen (atom [])]
    (is (nil? (run! #(swap! seen conj %) [1 2 3])))
    (is (= [1 2 3] @seen))))

(deftest map-indexed-preserves-letfn-lazy-captures
  ;; Regression coverage for a former VM issue where map-indexed's letfn helper
  ;; did not survive the lazy-seq boundary with its captured locals intact.
  (is (= [[0 :a] [1 :b] [2 :c]]
         (vec (map-indexed (fn [i x] [i x]) [:a :b :c]))))
  (is (= [[0 10] [1 11] [2 12] [3 13]]
         (vec (take 4 (map-indexed vector (iterate inc 10)))))))

;;; ── Reduction ────────────────────────────────────────────────────────────────

(deftest reduce-with-init
  (is (= 6 (reduce + 0 [1 2 3])))
  (is (= 0 (reduce + 0 [])))
  (is (= 1 (reduce + 1 [])))
  (is (= [1 2 3] (reduce conj [] '(1 2 3)))))

(deftest reduce-without-init
  (is (= 6 (reduce + [1 2 3])))
  (is (= 1 (reduce + [1])))
  (is (= 1 (reduce (fn [_ x] x) [1]))))

(deftest reduce-reduced-short-circuits
  (is (= 3 (reduce (fn [acc x]
                     (if (= x 3)
                       (reduced x)
                       (+ acc x)))
                   0
                   [1 2 3 4 5]))))

(deftest apply-spreads-args
  (is (= 6 (apply + [1 2 3])))
  (is (= 6 (apply + 1 2 [3])))
  (is (= 6 (apply + 1 [2 3])))
  (is (= 0 (apply + [])))
  (is (= [1 2 3] (apply conj [] [1 2 3])))
  (is (= 1 (apply {:a 1} [:a])))
  (is (= 1 (apply :a [{:a 1}])))
  (is (= 2 (apply [0 1 2 3] [2])))
  (is (= :a (apply #{:a :b} [:a]))))

;;; ── Subsequences ─────────────────────────────────────────────────────────────

(deftest take-and-drop
  (is (= [1 2 3] (vec (take 3 [1 2 3 4 5]))))
  (is (= [1 2 3] (vec (take 10 [1 2 3]))))
  (is (= [] (vec (take 0 [1 2 3]))))
  (is (= [4 5] (vec (drop 3 [1 2 3 4 5]))))
  (is (= [] (vec (drop 10 [1 2 3]))))
  (is (= [1 2 3] (vec (drop 0 [1 2 3])))))

(deftest take-while-drop-while
  (is (= [1 2] (vec (take-while #(< % 3) [1 2 3 4]))))
  (is (= [3 4] (vec (drop-while #(< % 3) [1 2 3 4]))))
  (is (= [] (vec (take-while neg? [1 2 3])))))

(deftest take-last-drop-last
  (is (= [3 4 5] (vec (take-last 3 [1 2 3 4 5]))))
  (is (= [1 2 3] (vec (drop-last 2 [1 2 3 4 5])))))

(deftest nth-rest
  (is (= '(3 4 5) (nthnext [1 2 3 4 5] 2)))
  (is (= [3 4 5] (vec (nthrest [1 2 3 4 5] 2)))))

;;; ── Lazy sequences ───────────────────────────────────────────────────────────

(deftest range-produces-ints
  (is (= [0 1 2 3 4] (vec (range 5))))
  (is (= [2 3 4] (vec (range 2 5))))
  (is (= [0 2 4] (vec (range 0 6 2))))
  (is (= [] (vec (range 0 0))))
  (is (= [3 2 1] (vec (range 3 0 -1)))))

(deftest cycle-repeats
  (is (= [1 2 3 1 2 3 1] (vec (take 7 (cycle [1 2 3]))))))

(deftest repeat-replicates
  (is (= [42 42 42] (vec (take 3 (repeat 42)))))
  (is (= [7 7 7] (vec (repeat 3 7))))
  (is (= [0 0 0] (vec (take 3 (repeatedly (constantly 0)))))))

(deftest iterate-unfolds
  (is (= [0 1 2 3 4] (vec (take 5 (iterate inc 0)))))
  (is (= [1 2 4 8 16] (vec (take 5 (iterate #(* 2 %) 1)))))
  ;; cljam's take-nth currently realizes too eagerly for an unbounded range.
  (is (= [0 3 6 9] (vec (take-nth 3 (range 12))))))

(deftest lazy-seq-is-lazy
  ;; lazy-seq must not realize elements until forced
  (let [realized (atom 0)
        xs (map (fn [x] (swap! realized inc) x) (range 10))]
    (is (= 0 @realized))
    (first xs)
    (is (pos? @realized))))

(deftest lazy-seq-realization-boundaries
  (let [xs (lazy-seq (cons 1 (lazy-seq (cons 2 nil))))]
    (is (lazy-seq? xs))
    (is (not (realized? xs)))
    (is (= 1 (first xs)))
    (is (realized? xs))
    (let [tail (rest xs)]
      (is (lazy-seq? tail))
      (is (not (realized? tail)))
      (is (= 2 (first tail)))
      (is (realized? tail)))))

(deftest lazy-seq-realizes-body-once
  (let [hits (atom [])
        xs (lazy-seq
             (swap! hits conj :realized)
             [1 2 3])]
    (is (= [] @hits))
    (is (= 1 (first xs)))
    (is (= [:realized] @hits))
    (is (= [1 2 3] (vec xs)))
    (is (= [:realized] @hits))))

(deftest lazy-seq-oddball-realized-values
  (is (nil? (first (lazy-seq nil))))
  (is (= '() (rest (lazy-seq nil))))
  (is (nil? (next (lazy-seq nil))))
  (is (nil? (first (lazy-seq '()))))
  (is (= '() (rest (lazy-seq '()))))
  (is (nil? (next (lazy-seq '()))))
  (let [xs (lazy-seq
             (lazy-seq
               (lazy-seq
                 (cons 1
                       (lazy-seq
                         (lazy-seq
                           (cons 2
                                 (lazy-seq
                                   (lazy-seq
                                     (cons 3 nil))))))))))]
    (is (= [1 2 3] (vec xs)))))

(deftest lazy-seq-invalid-realized-value-throws
  (is (thrown? js/Error (first (lazy-seq 1)))))

(deftest bounded-consumers-do-not-over-realize
  (let [seen (atom [])
        xs (map (fn [x]
                  (swap! seen conj x)
                  x)
                (lazy-range-from 0))]
    (is (= [] @seen))
    (is (= [0 1 2] (vec (take 3 xs))))
    (is (= [0 1 2] @seen))
    (is (= 3 (first (drop 3 xs))))
    (is (= [0 1 2 3] @seen))))

(deftest take-zero-does-not-realize-source
  (let [seen (atom [])
        xs (map (fn [x]
                  (swap! seen conj x)
                  x)
                (lazy-range-from 0))]
    (is (= [] (vec (take 0 xs))))
    (is (= [] @seen))))

(deftest filter-and-keep-realize-only-needed-prefix
  (let [filter-seen (atom [])
        evens (filter (fn [x]
                        (swap! filter-seen conj x)
                        (even? x))
                      (lazy-range-from 0))]
    (is (= [0 2 4] (vec (take 3 evens))))
    (is (= [0 1 2 3 4] @filter-seen)))
  (let [keep-seen (atom [])
        kept (keep (fn [x]
                     (swap! keep-seen conj x)
                     (when (even? x) (* x 10)))
                   (lazy-range-from 0))]
    (is (= [0 20 40] (vec (take 3 kept))))
    (is (= [0 1 2 3 4] @keep-seen))))

(deftest nth-over-infinite-lazy-sequences
  (is (= 5 (nth (iterate inc 0) 5)))
  (is (= 100 (nth (range) 100)))
  (is (= 4 (nth (map inc (range)) 3)))
  (is (= :not-found (nth (take 3 (range)) 10 :not-found)))
  (is (thrown? js/Error (nth (take 3 (range)) 10))))

;;; ── Aggregation ──────────────────────────────────────────────────────────────

(deftest some-and-every
  (is (some even? [1 2 3]))
  (is (nil? (some even? [1 3 5])))
  (is (= 2 (some #(when (even? %) %) [1 2 3])))
  (is (every? even? [2 4 6]))
  (is (not (every? even? [1 2 3])))
  (is (every? any? []))
  (is (not-any? even? [1 3 5]))
  (is (not-every? even? [1 2 3])))

(deftest sort-and-sort-by
  (is (= [1 1 2 3 4 5 5 6 9] (sort [3 1 4 1 5 9 2 6 5])))
  (is (= [1 1 2 3 4 5 5 6 9] (sort < [3 1 4 1 5 9 2 6 5])))
  (is (= [9 6 5 5 4 3 2 1 1] (sort > [3 1 4 1 5 9 2 6 5])))
  (is (= ["a" "bb" "ccc"] (sort-by count ["bb" "a" "ccc"])))
  (is (= ["ccc" "bb" "a"] (sort-by count > ["bb" "a" "ccc"]))))

(deftest reverse-works
  (is (= [3 2 1] (reverse [1 2 3])))
  (is (= '(3 2 1) (reverse '(1 2 3))))
  (is (= [] (reverse []))))

(deftest concat-chains
  (is (= [1 2 3 4] (vec (concat [1 2] [3 4]))))
  (is (= [1 2 3] (vec (concat [1 2] [3]))))
  (is (= [1 2] (vec (concat [] [1 2]))))
  (is (= [] (vec (concat [] [])))))

(deftest interleave-and-interpose
  (is (= [1 :a 2 :b 3 :c] (vec (interleave [1 2 3] [:a :b :c]))))
  (is (= [1 :a 2 :b] (vec (interleave [1 2 3] [:a :b]))))
  (is (= [1 "," 2 "," 3] (vec (interpose "," [1 2 3]))))
  (is (= [] (vec (interpose "," [])))))

(deftest zipmap-pairs
  (is (= {:a 1 :b 2 :c 3} (zipmap [:a :b :c] [1 2 3])))
  (is (= {:a 1} (zipmap [:a :b :c] [1])))
  (is (= {} (zipmap [] []))))

(deftest group-by-partitions
  (let [result (group-by even? [1 2 3 4 5 6])]
    (is (= [2 4 6] (sort (result true))))
    (is (= [1 3 5] (sort (result false))))))

(deftest frequencies-counts
  (is (= {:a 3 :b 2 :c 1} (frequencies [:a :b :a :c :b :a]))))

(deftest partition-chunks
  (is (= [[1 2] [3 4] [5 6]] (vec (partition 2 [1 2 3 4 5 6]))))
  (is (= [[1 2] [3 4]] (vec (partition 2 [1 2 3 4 5]))))
  (is (= [[1 2 3] [3 4 5] [5 6 7]] (vec (partition 3 2 [1 2 3 4 5 6 7]))))
  (is (= [[1 2] [3 4] [5 nil]] (vec (partition 2 2 [nil] [1 2 3 4 5]))))
  (is (= [[1 3 5] [2 4 6]] (vec (partition-by odd? [1 3 5 2 4 6])))))

(deftest reductions-and-splitting
  (is (= [0 1 3 6] (vec (reductions + 0 [1 2 3]))))
  (is (= [1 3 6] (vec (reductions + [1 2 3]))))
  (is (= [[1 2] [3 4]] (split-at 2 [1 2 3 4])))
  (is (= [[1 2] [3 4]] (split-with #(< % 3) [1 2 3 4]))))

(deftest flatten-nested
  (is (= [1 2 3 4 5] (flatten [1 [2 [3 [4 [5]]]]])))
  (is (= [1 2 3] (flatten '(1 (2 (3))))))
  (is (= [] (flatten []))))
