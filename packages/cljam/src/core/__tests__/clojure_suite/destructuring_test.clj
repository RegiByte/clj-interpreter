;; Destructuring tests.
;; Covers user-visible destructuring semantics across let, fn, defn, loop,
;; kwargs-style rest args, and lazy sequence sources.

(ns clojure-suite.destructuring-test
  (:require [clojure.test :refer [deftest is testing thrown?]]))

;;; -- Vector destructuring -----------------------------------------------------

(deftest vector-destructuring-in-let
  (testing "positional bindings"
    (is (= [1 2] (let [[a b] [1 2]] [a b])))
    (is (= [1 2 nil] (let [[a b c] [1 2]] [a b c])))
    (is (= 1 (let [[a] [1 2 3]] a))))

  (testing "rest bindings"
    (is (= [1 [2 3] 2]
           (let [[a & more] [1 2 3]]
             [a (vec more) (count more)])))
    (is (nil? (let [[a & more] [1]] more)))
    (is (= [1 2 3]
           (let [[a & [b c]] [1 2 3]]
             [a b c]))))

  (testing ":as binds the original sequential value"
    (is (= [[1 2] 1 2]
           (let [[a b :as v] [1 2]]
             [v a b])))
    (is (= '((1 2) 1 2)
           (let [[a b :as v] '(1 2)]
             [v a b]))))

  (testing "nested vectors and nil sources"
    (is (= [1 2 3]
           (let [[[a b] c] [[1 2] 3]]
             [a b c])))
    (is (= 42
           (let [[[[x]]] [[[42]]]]
             x)))
    (is (= [nil nil]
           (let [[a b] nil]
             [a b])))))

(deftest vector-destructuring-sources
  (testing "lists and lazy seqs are valid sequential sources"
    (is (= [10 20]
           (let [[a b] '(10 20)]
             [a b])))
    (is (= [11 21 31]
           (let [[a b c] (map inc [10 20 30])]
             [a b c])))
    (is (= [0 [1 2 3]]
           (let [[x & xs] (iterate inc 0)]
             [x (vec (take 3 xs))]))))

  (testing "non-sequential values fail clearly"
    (is (thrown? :default
                 (let [[a b] 42]
                   [a b])))))

;;; -- Map destructuring --------------------------------------------------------

(deftest map-destructuring-in-let
  (testing "direct key expressions and keyword shorthand"
    (is (= [1 2]
           (let [{a :a b :b} {:a 1 :b 2}]
             [a b])))
    (is (= [1 2]
           (let [{:keys [a b]} {:a 1 :b 2}]
             [a b])))
    (is (nil? (let [{:keys [missing]} {:a 1}] missing))))

  (testing "string and symbol shorthand"
    (is (= [1 2]
           (let [{:strs [a b]} {"a" 1 "b" 2}]
             [a b])))
    (is (= [1 2]
           (let [{:syms [a b]} {'a 1 'b 2}]
             [a b]))))

  (testing ":as binds the original map"
    (is (= [1 2 {:a 1 :b 2}]
           (let [{:keys [a] :as m} {:a 1 :b 2}]
             [a (:b m) m]))))

  (testing ":or defaults use contains? semantics"
    (is (= [1 99]
           (let [{:keys [a b] :or {b 99}} {:a 1}]
             [a b])))
    (is (nil? (let [{:keys [a] :or {a 99}} {:a nil}] a))))

  (testing "nil and sequential sources"
    (is (= [nil nil]
           (let [{:keys [a b]} nil]
             [a b])))
    (is (= [1 2]
           (let [{:keys [a b]} '(:a 1 :b 2)]
             [a b])))))

(deftest map-destructuring-nested-and-qualified
  (testing "nested maps and mixed vector/map patterns"
    (is (= 42
           (let [{{:keys [x]} :inner} {:inner {:x 42}}]
             x)))
    (is (= [1 2]
           (let [[a {:keys [b]}] [1 {:b 2}]]
             [a b])))
    (is (= [10 20]
           (let [{[a b] :pair} {:pair [10 20]}]
             [a b]))))

  (testing "qualified :keys bind the unqualified local name"
    (is (= ["Alice" 30]
           (let [{:keys [person/name person/age]}
                 {:person/name "Alice" :person/age 30}]
             [name age])))
    (is (= [1 42]
           (let [{:keys [x db/id]} {:x 1 :db/id 42}]
             [x id])))
    (is (= 99
           (let [{:keys [ns/foo] :or {foo 99}} {}]
             foo)))))

(deftest map-destructuring-default-evaluation
  (testing "default expressions are lazy and only run for absent keys"
    (let [called (atom false)
          result (let [{:keys [x] :or {x (do (reset! called true) 99)}} {:x 42}]
                   [x @called])]
      (is (= [42 false] result)))
    (let [called (atom 0)
          result (let [{:keys [x] :or {x (do (swap! called inc) 99)}} {}]
                   [x @called])]
      (is (= [99 1] result)))))

;;; -- Binding sites ------------------------------------------------------------

(deftest destructuring-in-functions
  (testing "fn parameters"
    (is (= 3 ((fn [[a b]] (+ a b)) [1 2])))
    (is (= 7 ((fn [{:keys [x y]}] (+ x y)) {:x 3 :y 4})))
    (is (= [1 2 3] ((fn [a & [b c]] [a b c]) 1 2 3)))
    (is (= [0 1 2 3] ((fn [x [a b] y] [x a b y]) 0 [1 2] 3))))

  (testing "defn parameters"
    (defn destructuring-test-add-pair [[a b]]
      (+ a b))
    (defn destructuring-test-greet [{:keys [name greeting]
                                     :or {greeting "Hello"}}]
      (str greeting ", " name))
    (is (= 7 (destructuring-test-add-pair [3 4])))
    (is (= "Hello, World" (destructuring-test-greet {:name "World"})))))

(deftest kwargs-style-rest-destructuring
  (defn destructuring-test-make-person [name & {:keys [age city]}]
    [name age city])
  (defn destructuring-test-greet-kwargs [name & {:keys [greeting]
                                                 :or {greeting "Hello"}}]
    (str greeting ", " name))
  (defn destructuring-test-capture-kwargs [a & {:keys [b] :as opts}]
    [a b (:c opts)])

  (is (= ["Alice" 30 "NYC"]
         (destructuring-test-make-person "Alice" :age 30 :city "NYC")))
  (is (= "Hello, World"
         (destructuring-test-greet-kwargs "World")))
  (is (= [1 2 3]
         (destructuring-test-capture-kwargs 1 :b 2 :c 3)))
  (is (= [1 2 3]
         (let [[x & {:keys [y z]}] [1 :y 2 :z 3]]
           [x y z])))
  (is (thrown? :default
               (let [[a & {:keys [b]}] [1 :b]]
                 [a b]))))

(deftest destructuring-in-loop
  (testing "vector destructuring rebinds on recur"
    (is (= 6
           (loop [[x & xs] [1 2 3]
                  acc 0]
             (if (nil? x)
               acc
               (recur xs (+ acc x)))))))

  (testing "map destructuring rebinds on recur"
    (is (= 120
           (loop [{:keys [n acc]} {:n 5 :acc 1}]
             (if (<= n 1)
               acc
               (recur {:n (dec n) :acc (* acc n)})))))))

(deftest destructuring-evaluates-source-once
  (testing "vector and map RHS expressions are evaluated once"
    (let [calls (atom 0)
          result (let [[a b] (do (swap! calls inc) [1 2])]
                   [a b @calls])]
      (is (= [1 2 1] result)))
    (let [calls (atom 0)
          result (let [{:keys [a b]} (do (swap! calls inc) {:a 1 :b 2})]
                   [a b @calls])]
      (is (= [1 2 1] result)))))
