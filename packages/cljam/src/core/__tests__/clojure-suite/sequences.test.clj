;; Sequence operation tests written in Clojure.
;; Covers map, filter, reduce, apply and lazy sequence semantics.

(ns cljam.suite.sequences-test
  (:require [clojure.test :refer [deftest is testing are]]))

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
  ;; NOTE: key/val (map entry accessors) are not yet in cljam core.
  ;; Use keys/vals for collections: (set (keys {:a 1 :b 2})) works.
  (is (= #{:a :b :c} (set (keys {:a 1 :b 2 :c 3})))))

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

;; NOTE: map-indexed has a known issue with lazy-seq + letfn upvalue capture
;; in the current VM. See NEXT_STEPS for tracking.

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
  (is (= [7 7 7] (vec (repeat 3 7)))))

(deftest iterate-unfolds
  (is (= [0 1 2 3 4] (vec (take 5 (iterate inc 0)))))
  (is (= [1 2 4 8 16] (vec (take 5 (iterate #(* 2 %) 1))))))

(deftest lazy-seq-is-lazy
  ;; lazy-seq must not realize elements until forced
  (let [realized (atom 0)
        xs (map (fn [x] (swap! realized inc) x) (range 10))]
    (is (= 0 @realized))
    (first xs)
    (is (pos? @realized))))

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
  (is (= [[1 2] [3 4] [5 nil]] (vec (partition 2 2 [nil] [1 2 3 4 5])))))

(deftest flatten-nested
  (is (= [1 2 3 4 5] (flatten [1 [2 [3 [4 [5]]]]])))
  (is (= [1 2 3] (flatten '(1 (2 (3))))))
  (is (= [] (flatten []))))
