;; Vars, dynamic binding, var quote, and set! semantics.

(ns clojure-suite.vars-test
  (:require [clojure.test :refer [deftest is thrown?]]))

(def root-value :root)
(def ^:dynamic *dyn* :root)
(def ^:dynamic *other-dyn* :other-root)

(deftest var-quote-and-var-get
  (is (var? #'root-value))
  (is (= :root (var-get #'root-value)))
  (is (var? #'clojure.core/inc))
  (is (= 2 (#'clojure.core/inc 1)))
  (is (= [2 3 4] (map #'inc [1 2 3])))
  (is (= 6 (apply #'+ [1 2 3]))))

(deftest vars-as-callable-live-references
  (def hot-swap (fn [x] (inc x)))
  (let [f #'hot-swap]
    (is (= 2 (f 1)))
    (def hot-swap (fn [x] (+ x 10)))
    (is (= 11 (f 1)))))

(deftest dynamic-binding
  (is (= :root *dyn*))
  (is (= :bound (binding [*dyn* :bound] *dyn*)))
  (is (= :root *dyn*))
  (is (= [:outer :inner :outer]
         (binding [*dyn* :outer]
           [*dyn*
            (binding [*dyn* :inner] *dyn*)
            *dyn*])))
  (is (thrown? :default (binding [root-value :bad] root-value)))
  (is (thrown? :default (binding [missing-var :bad] missing-var))))

(deftest set-bang-dynamic-vars
  (is (= :changed
         (binding [*dyn* :bound]
           (set! *dyn* :changed))))
  (is (= :root *dyn*))
  (is (= [:inner-changed :outer]
         (binding [*dyn* :outer]
           [(binding [*dyn* :inner]
              (set! *dyn* :inner-changed)
              *dyn*)
            *dyn*])))
  (is (thrown? :default (set! root-value :bad)))
  (is (thrown? :default (set! *dyn* :bad))))

(deftest macros-and-multimethods-are-vars
  (defmacro vars-test-macro [x] x)
  (is (var? #'vars-test-macro))
  (is (var? (defmacro vars-test-returned [x] x)))
  (defmulti vars-test-mm :type)
  (defmethod vars-test-mm :a [_] :A)
  (is (var? #'vars-test-mm))
  (is (= :A (#'vars-test-mm {:type :a}))))
