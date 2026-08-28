;; clojure.set semantic coverage.

(ns clojure-suite.sets-test
  (:require [clojure.test :refer [deftest is testing]]
            [clojure.set :as set]))

(deftest set-union
  (is (= #{1 2 3} (set/union #{1 2} #{2 3})))
  (is (= #{1 2} (set/union #{1 2} #{})))
  (is (= #{} (set/union)))
  (is (= #{1 2 3} (set/union #{1} #{2} #{3}))))

(deftest set-intersection
  (is (= #{2 3} (set/intersection #{1 2 3} #{2 3 4})))
  (is (= #{} (set/intersection #{1 2} #{3 4})))
  (is (= #{1 2 3} (set/intersection #{1 2 3}))))

(deftest set-difference
  (is (= #{1 3} (set/difference #{1 2 3} #{2})))
  (is (= #{1 2 3} (set/difference #{1 2 3} #{})))
  (is (= #{1 2} (set/difference #{1 2}))))

(deftest set-select
  (is (= #{2 4} (set/select even? #{1 2 3 4})))
  (is (= #{} (set/select neg? #{1 2 3}))))

(deftest subset-and-superset
  (testing "subset?"
    (is (set/subset? #{1 2} #{1 2 3}))
    (is (not (set/subset? #{1 4} #{1 2 3})))
    (is (set/subset? #{} #{1 2})))

  (testing "superset?"
    (is (set/superset? #{1 2 3} #{1 2}))
    (is (not (set/superset? #{1 2} #{1 2 3})))))

(deftest map-invert-and-rename-keys
  (is (= {1 :a 2 :b} (set/map-invert {:a 1 :b 2})))
  (is (= {:x 1 :b 2} (set/rename-keys {:a 1 :b 2} {:a :x}))))
