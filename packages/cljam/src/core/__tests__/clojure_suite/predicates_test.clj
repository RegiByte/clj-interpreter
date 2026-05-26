;; Type predicate tests written in Clojure.
;; Mirrors jank suite *_qmark.cljc files for the predicates we support.

(ns clojure-suite.predicates-test
  (:require [clojure.test :refer [deftest is testing are]]))

(deftest nil?-predicate
  (is (nil? nil))
  (is (not (nil? false)))
  (is (not (nil? 0)))
  (is (not (nil? "")))
  (is (not (nil? []))))

(deftest boolean?-predicate
  (is (boolean? true))
  (is (boolean? false))
  (is (not (boolean? nil)))
  (is (not (boolean? 0)))
  (is (not (boolean? ""))))

(deftest number?-predicate
  (is (number? 0))
  (is (number? 42))
  (is (number? -1))
  (is (number? 3.14))
  (is (not (number? nil)))
  (is (not (number? "42")))
  (is (not (number? :42))))

(deftest int?-predicate
  (is (int? 0))
  (is (int? 42))
  (is (int? -5))
  (is (not (int? 3.14)))
  (is (not (int? nil))))

(deftest integer?-predicate
  (are [expected x] (= expected (integer? x))
    true 0
    true 42
    true -5
    false 3.14
    false -0.25
    false nil
    false true
    false "42"
    false :42
    false [1 2]
    false {:a 1}
    false #{1 2}
    false '(1 2)))

(deftest float?-predicate
  (are [expected x] (= expected (float? x))
    true 3.14
    true -0.25
    false 0
    false 42
    false -5
    false nil
    false true
    false "3.14"
    false :3.14
    false [1 2]
    false {:a 1}
    false #{1 2}
    false '(1 2)))

(deftest pos?-neg?-zero?
  (is (pos? 1))
  (is (pos? 0.1))
  (is (not (pos? 0)))
  (is (not (pos? -1)))
  (is (neg? -1))
  (is (neg? -0.1))
  (is (not (neg? 0)))
  (is (not (neg? 1)))
  (is (zero? 0))
  (is (zero? 0.0))
  (is (not (zero? 1)))
  (is (not (zero? -1))))

(deftest pos-int?-neg-int?
  (is (pos-int? 1))
  (is (not (pos-int? 0)))
  (is (not (pos-int? -1)))
  (is (not (pos-int? 1.5)))
  (is (neg-int? -1))
  (is (not (neg-int? 0)))
  (is (not (neg-int? 1))))

(deftest even?-odd?
  (is (even? 0))
  (is (even? 2))
  (is (even? -4))
  (is (not (even? 1)))
  (is (odd? 1))
  (is (odd? -3))
  (is (not (odd? 0)))
  (is (not (odd? 2))))

(deftest string?-predicate
  (is (string? ""))
  (is (string? "hello"))
  (is (not (string? nil)))
  (is (not (string? :hello)))
  (is (not (string? 42))))

(deftest keyword?-predicate
  (is (keyword? :foo))
  (is (keyword? :ns/foo))
  (is (not (keyword? nil)))
  (is (not (keyword? "foo")))
  (is (not (keyword? 'foo))))

(deftest symbol?-predicate
  (is (symbol? 'foo))
  (is (symbol? 'ns/foo))
  (is (not (symbol? nil)))
  (is (not (symbol? :foo)))
  (is (not (symbol? "foo"))))

(deftest ident?-predicate
  (is (ident? :foo))
  (is (ident? 'foo))
  (is (not (ident? "foo")))
  (is (not (ident? nil))))

(deftest qualified-predicates
  (is (qualified-keyword? :ns/foo))
  (is (not (qualified-keyword? :foo)))
  (is (qualified-symbol? 'ns/foo))
  (is (not (qualified-symbol? 'foo)))
  (is (qualified-ident? :ns/foo))
  (is (qualified-ident? 'ns/foo))
  (is (not (qualified-ident? :foo)))
  (is (not (qualified-ident? 'foo))))

(deftest simple-predicates
  (is (simple-keyword? :foo))
  (is (not (simple-keyword? :ns/foo)))
  (is (simple-symbol? 'foo))
  (is (not (simple-symbol? 'ns/foo)))
  (is (simple-ident? :foo))
  (is (simple-ident? 'foo))
  (is (not (simple-ident? :ns/foo))))

(deftest fn?-predicate
  (is (fn? identity))
  (is (fn? (fn [] nil)))
  (is (fn? #(+ 1 %)))
  (is (not (fn? nil)))
  (is (not (fn? 42)))
  (is (not (fn? :not-a-fn))))

(defrecord PredicateRecord [x])

(deftest ifn?-predicate
  (is (ifn? identity))
  (is (ifn? (fn [] nil)))
  (is (ifn? #(+ 1 %)))
  (is (ifn? :keyword))
  (is (ifn? {:a 1}))
  (is (ifn? #{:a}))
  (is (ifn? [:a :b]))
  (is (ifn? #'ifn?))
  (is (ifn? (->PredicateRecord 1)))
  (is (not (ifn? nil)))
  (is (not (ifn? 42)))
  (is (not (ifn? "string")))
  (is (not (ifn? 'symbol))))

(deftest map?-predicate
  (is (map? {}))
  (is (map? {:a 1}))
  (is (not (map? [])))
  (is (not (map? nil)))
  (is (not (map? #{:a}))))

(deftest vector?-predicate
  (is (vector? []))
  (is (vector? [1 2 3]))
  (is (not (vector? '())))
  (is (not (vector? nil))))

(deftest set?-predicate
  (is (set? #{}))
  (is (set? #{1 2}))
  (is (not (set? [])))
  (is (not (set? nil))))

(deftest list?-predicate
  (is (list? '()))
  (is (list? '(1 2 3)))
  (is (not (list? [])))
  (is (not (list? nil))))

(deftest seq?-predicate
  (is (seq? '()))
  (is (seq? '(1 2 3)))
  (is (seq? (seq [1 2 3])))
  (is (seq? (lazy-seq (list 1 2 3))))
  (is (seq? (cons 1 (lazy-seq nil))))
  (is (not (seq? [1 2 3])))
  (is (not (seq? {:a 1})))
  (is (not (seq? #{:a})))
  (is (not (seq? "string")))
  (is (not (seq? nil)))
  (is (not (seq? 42)))
  (is (not (seq? :keyword))))

(deftest coll?-predicate
  (is (coll? []))
  (is (coll? '()))
  (is (coll? {}))
  (is (coll? #{}))
  (is (not (coll? nil)))
  (is (not (coll? 42)))
  (is (not (coll? "string"))))

(deftest sequential?-predicate
  (is (sequential? []))
  (is (sequential? '()))
  (is (sequential? (seq [1 2])))
  (is (not (sequential? {})))
  (is (not (sequential? #{})))
  (is (not (sequential? nil))))

(deftest associative?-predicate
  (is (associative? {}))
  (is (associative? [1 2 3]))
  (is (not (associative? '())))
  (is (not (associative? #{})))
  (is (not (associative? nil))))

(deftest counted?-predicate
  (is (counted? []))
  (is (counted? {}))
  (is (counted? #{}))
  (is (not (counted? nil))))

(deftest seqable?-predicate
  (is (seqable? []))
  (is (seqable? '()))
  (is (seqable? {}))
  (is (seqable? #{}))
  (is (seqable? "hello"))
  ;; NOTE: in cljam, nil is not seqable (differs from JVM Clojure).
  (is (not (seqable? nil)))
  (is (not (seqable? 42)))
  (is (not (seqable? :kw))))

(deftest empty?-predicate
  (is (empty? []))
  (is (empty? '()))
  (is (empty? {}))
  (is (empty? #{}))
  (is (empty? ""))
  (is (not (empty? [1])))
  (is (not (empty? {:a 1}))))

(deftest any?-and-some?
  (is (any? nil))
  (is (any? false))
  (is (any? 42))
  (is (some? 42))
  (is (some? false))
  (is (not (some? nil))))

(deftest true?-false?
  (is (true? true))
  (is (not (true? false)))
  (is (not (true? 1)))
  (is (false? false))
  (is (not (false? true)))
  (is (not (false? nil))))

(deftest truthy-falsy-and-boolean-coercion
  (is (truthy? true))
  (is (truthy? 0))
  (is (truthy? ""))
  (is (not (truthy? false)))
  (is (not (truthy? nil)))
  (is (falsy? false))
  (is (falsy? nil))
  (is (not (falsy? 0)))
  (is (= true (boolean 1)))
  (is (= true (boolean "x")))
  (is (= false (boolean false)))
  (is (= false (boolean nil))))

(deftest every-with-ifn-predicates
  (is (every? :a [{:a 1} {:a true}]))
  (is (every? #{1 2 3} [1 2]))
  (is (every? {:a true :b true} [:a :b])))

(deftest nat-int-and-floating-edge-predicates
  (is (nat-int? 0))
  (is (nat-int? 5))
  (is (not (nat-int? -1)))
  (is (not (nat-int? 1.2))))

(deftest var?-predicate
  (def test-var-for-predicate 42)
  (is (var? #'test-var-for-predicate))
  (is (not (var? nil)))
  (is (not (var? 42))))
