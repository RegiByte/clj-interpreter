;; Multimethod semantics.

(ns clojure-suite.multimethods-test
  (:require [clojure.test :refer [deftest is thrown?]]))

(deftest defmulti-and-defmethod
  (defmulti mm-kind :kind)
  (is (var? #'mm-kind))
  (defmethod mm-kind :a [_] :A)
  (defmethod mm-kind :default [_] :unknown)
  (is (= :A (mm-kind {:kind :a})))
  (is (= :unknown (mm-kind {:kind :z}))))

(deftest multimethod-dispatch-shapes
  (defmulti explicit-dispatch (fn [x] (:type x)))
  (defmethod explicit-dispatch :user [x] (:name x))
  (is (= "Ada" (explicit-dispatch {:type :user :name "Ada"})))

  (defmulti vector-dispatch (fn [x] [(:type x) (:state x)]))
  (defmethod vector-dispatch [:job :done] [_] :complete)
  (is (= :complete (vector-dispatch {:type :job :state :done})))

  (defmulti multi-arg-mm (fn [x y] [x y]))
  (defmethod multi-arg-mm [:a :b] [_ _] :ab)
  (is (= :ab (multi-arg-mm :a :b))))

(deftest multimethod-extension-and-replacement
  (defmulti open-mm :kind)
  (defmethod open-mm :a [_] 1)
  (is (= 1 (open-mm {:kind :a})))
  (defmethod open-mm :b [_] 2)
  (is (= 2 (open-mm {:kind :b})))
  (defmethod open-mm :a [_] 10)
  (is (= 10 (open-mm {:kind :a}))))

(deftest multimethod-errors-and-custom-default
  (defmulti no-default-mm :kind)
  (defmethod no-default-mm :a [_] :A)
  (is (thrown? :default (no-default-mm {:kind :z})))
  (is (thrown? :default (defmethod not-a-multimethod :a [_] :bad)))

  (defmulti custom-default :kind :default :fallback)
  (defmethod custom-default :default [_] :literal-default)
  (defmethod custom-default :fallback [_] :fallback)
  (is (= :literal-default (custom-default {:kind :default})))
  (is (= :fallback (custom-default {:kind :missing}))))

(deftest multimethod-multi-arity-handlers
  (defmulti handler-arity (fn [& xs] (count xs)))
  (defmethod handler-arity 1
    ([x] [:one x]))
  (defmethod handler-arity 2
    ([x y] [:two x y]))
  (is (= [:one :a] (handler-arity :a)))
  (is (= [:two :a :b] (handler-arity :a :b))))
