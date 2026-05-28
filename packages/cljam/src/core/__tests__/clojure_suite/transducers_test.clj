;; User-visible transducer and reduced-value semantics.

(ns clojure-suite.transducers-test
  (:require [clojure.test :refer [deftest is testing thrown?]]))

(deftest reduced-semantics
  (is (reduced? (reduced 42)))
  (is (not (reduced? 42)))
  (is (= 42 (unreduced (reduced 42))))
  (is (= 42 (unreduced 42)))
  (is (= 42 (deref (reduced 42))))
  (is (reduced? (ensure-reduced 42)))
  (is (reduced? (ensure-reduced (reduced 42))))
  (is (= [1 2]
         (reduce (fn [acc x]
                   (if (= x 3)
                     (reduced acc)
                     (conj acc x)))
                 []
                 [1 2 3 4 5]))))

(deftest transduce-map-filter-remove
  (is (= [2 3 4] (transduce (map inc) conj [] [1 2 3])))
  (is (= [2 4] (transduce (filter even?) conj [] [1 2 3 4 5])))
  (is (= [1 3 5] (transduce (remove even?) conj [] [1 2 3 4 5])))
  (is (= [] (transduce (map inc) conj [] nil)))
  (is (= [2 4 6]
         (transduce (comp (map inc) (filter even?)) conj [] [1 2 3 4 5]))))

(deftest transduce-three-arity-and-completing
  (is (= 9 (transduce (map inc) + [1 2 3])))
  (is (= 6 (transduce (filter even?) + [1 2 3 4 5])))
  (is (= 24 (transduce (map inc) * [1 2 3])))
  (is (= 0 (transduce (map inc) + nil)))
  (is (thrown? :default (transduce (map inc) - [1 2 3])))
  (let [my-sum (fn [acc x] (+ acc x))]
    (is (= 9 (transduce (map inc) (completing my-sum) 0 [1 2 3])))
    (is (= 18
           (transduce (map inc)
                      (completing my-sum (fn [r] (* r 2)))
                      0
                      [1 2 3])))
    (is (= 42 ((completing my-sum) 42)))))

(deftest sequence-and-into-with-transducers
  (is (= '(1 2 3) (sequence '(1 2 3))))
  (is (= '(2 3 4) (sequence (map inc) [1 2 3])))
  (is (= [2 3 4] (into [] (map inc) [1 2 3])))
  (is (= [1 3 5] (into [] (filter odd?) [1 2 3 4 5])))
  (is (= [2 4] (into [] (comp (map inc) (filter even?)) [1 2 3 4]))))

(deftest sequence-lazy-contract
  ;; 1-arg: must not force a lazy-seq
  (let [realized (atom false)
        lz (lazy-seq (do (reset! realized true) [1 2 3]))]
    (sequence lz)
    (is (false? @realized) "sequence 1-arg must not force lazy body"))
  ;; 1-arg: result is seq? for non-seq inputs
  (is (seq? (sequence [1 2 3])))
  (is (seq? (sequence {:a 1})))
  ;; 1-arg: nil/empty → ()
  (is (= '() (sequence nil)))
  (is (= '() (sequence [])))
  ;; 2-arg: finite source, correct values (regression)
  (is (= '(2 3 4) (sequence (map inc) [1 2 3])))
  ;; 2-arg: empty and nil source → ()
  (is (= '() (sequence (map inc) [])))
  (is (= '() (sequence (map inc) nil)))
  ;; 2-arg: result is seq?
  (is (seq? (sequence (map inc) [1 2 3])))
  ;; 2-arg: infinite source with filtering transducer
  (is (= '(1 3 5 7 9) (take 5 (sequence (filter odd?) (range)))))
  ;; 2-arg: early-termination transducer on infinite source
  (is (= '(0 1 2) (sequence (take 3) (range))))
  ;; 2-arg: stateful transducer (partition-all) on infinite source
  (is (= '([0 1] [2 3] [4 5]) (take 3 (sequence (partition-all 2) (range)))))
  ;; 2-arg: composed transducer on infinite source
  (is (= '(2 6 10 14 18)
         (take 5 (sequence (comp (filter odd?) (map #(* % 2))) (range))))))

(deftest transducer-producing-arities
  (testing "single-arity calls return transducers that compose with into"
    (is (= [1 2] (into [] (take-while pos?) [1 2 0 3])))
    (is (= [] (into [] (take-while pos?) [-1 2 3])))
    (is (= [3 4] (into [] (drop-while neg?) [-1 -2 3 4])))
    (is (= [[0 10] [1 20] [2 30]]
           (into [] (map-indexed vector) [10 20 30])))
    (is (= [1 2 3 4] (into [] (dedupe) [1 1 2 3 3 3 4])))
    (is (= [[1 2] [3 4] [5]]
           (into [] (partition-all 2) [1 2 3 4 5])))))

(deftest collection-returning-transducer-families
  (is (= '(1 2) (take-while pos? [1 2 0 3])))
  (is (= '(3 4) (drop-while neg? [-1 -2 3 4])))
  (is (= [1 2] (drop-last 2 [1 2 3 4])))
  (is (= [1 2 3] (drop-last [1 2 3 4])))
  (is (= '(3 4) (take-last 2 [1 2 3 4])))
  (is (= '([0 10] [1 20] [2 30]) (map-indexed vector [10 20 30])))
  (is (= '(1 2 3 4) (dedupe [1 1 2 3 3 3 4])))
  (is (= '(nil 1 nil) (dedupe [nil nil 1 nil])))
  (is (= '([1 2] [3 4]) (partition-all 2 [1 2 3 4])))
  (is (= '([1 2] [3]) (partition-all 2 [1 2 3]))))
