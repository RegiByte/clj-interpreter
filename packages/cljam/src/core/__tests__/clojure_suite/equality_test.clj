;; Semantic equality tests written in Clojure.
;; Mirrors the spirit of the jank test suite eq.cljc, stripped of
;; multi-platform reader conditionals and JVM-specific type nuances.

(ns clojure-suite.equality-test
  (:require [clojure.test :refer [deftest is testing are]]))

(deftest scalars-are-equal
  (testing "identical values are ="
    (are [x] (= x x)
      nil true false
      42 3.14 0
      "hello" "" "unicode-αβγ"
      :a-key :ns/key
      'a-sym 'ns/sym))

  (testing "nil equality"
    (is (= nil nil))
    (is (not= nil false))
    (is (not= nil 0))
    (is (not= nil "")))

  (testing "numbers"
    (is (= 0 0))
    (is (= 42 42))
    (is (= -7 -7))
    (is (= 3.14 3.14))
    (is (not= 1 2))
    (is (not= 1 1.1)))

  (testing "strings"
    (is (= "hello" "hello"))
    (is (not= "hello" "world"))
    (is (not= "hello" :hello))
    (is (not= "hello" 'hello)))

  (testing "keywords"
    (is (= :foo :foo))
    (is (= :a/b :a/b))
    (is (not= :foo :bar))
    (is (not= :a/b :c/b)))

  (testing "symbols"
    (is (= 'foo 'foo))
    (is (= 'a/b 'a/b))
    (is (not= 'foo 'bar))
    (is (not= 'foo :foo))))

(deftest collections-are-equal
  (testing "empty collections"
    (is (= [] []))
    (is (= '() '()))
    (is (= {} {}))
    (is (= #{} #{}))
    (is (= [] '()))
    (is (= '() [])))

  (testing "vectors and lists cross-equal"
    (is (= [1 2 3] '(1 2 3)))
    (is (= '(1 2 3) [1 2 3]))
    (is (= [1 2 3] (range 1 4))))

  (testing "maps are order-independent"
    (is (= {:a 1 :b 2} {:b 2 :a 1}))
    (is (= {"x" 10 "y" 20} {"y" 20 "x" 10}))
    (is (not= {:a 1} {:a 2}))
    (is (not= {:a 1} {:b 1})))

  (testing "sets"
    (is (= #{1 2 3} #{3 1 2}))
    (is (not= #{1 2 3} #{1 2 4}))
    (is (not= #{} #{}  {:a 1})))

  (testing "nested collections"
    (is (= {:a [1 2 #{3}]} {:a '(1 2 #{3})}))
    (is (= [#{:a} {:b '(1 2)}] [#{:a} {:b [1 2]}])))

  (testing "nil is not an empty collection"
    (is (not= nil []))
    (is (not= nil '()))
    (is (not= nil #{}))
    (is (not= nil {}))))

(deftest not=-semantics
  (is (not= 1 2))
  (is (not= :a :b))
  (is (not= [1] [2]))
  (is (false? (not= 1 1)))
  (is (false? (not= :a :a))))

(deftest variadic-equality
  (is (= 1 1 1))
  (is (= :a :a :a :a))
  (is (not= 1 1 2))
  (is (not= 1 2 1))
  (is (= [1 2] [1 2] '(1 2)))
  (is (not= [] '() #{})))

(deftest function-reference-equality
  ;; cljam functions are equal only when identical? (same object reference).
  ;; Note: cljam's = does not check identity for functions like JVM Clojure does.
  ;; Two separate #() literals are never equal.
  (is (not= #(+ 1 %) #(+ 1 %))))

(deftest regex-reference-equality
  ;; In cljam (like ClojureScript), two regex literals are NOT =
  ;; unless they are the same object reference.
  (is (not= #"hello" #"hello"))
  (let [r #"hello"
        r' r]
    (is (= r r'))))
