;; Keyword hierarchy semantics: make-hierarchy, derive, underive, isa?,
;; parents, ancestors, descendants, and multimethod dispatch.

(ns clojure-suite.hierarchy-test
  (:require [clojure.test :refer [deftest is testing thrown-with-msg?]]))

(deftest make-hierarchy-shape
  (let [h (make-hierarchy)]
    (is (map? h))
    (is (= #{:parents :ancestors :descendants} (set (keys h))))
    (is (empty? (:parents h)))
    (is (empty? (:ancestors h)))
    (is (empty? (:descendants h)))))

(deftest derive-pure-hierarchy
  (testing "derive adds direct and transitive relationships without mutation"
    (let [h  (make-hierarchy)
          h1 (derive h :kitten :cat)
          h2 (derive h1 :cat :animal)]
      (is (nil? (ancestors h :kitten)))
      (is (= #{:cat} (parents h2 :kitten)))
      (is (= #{:cat :animal} (ancestors h2 :kitten)))
      (is (= #{:kitten :cat} (descendants h2 :animal)))
      (is (isa? h2 :kitten :animal))
      (is (not (isa? h2 :animal :kitten)))))

  (testing "multiple parents are preserved"
    (let [h (-> (make-hierarchy)
                (derive :cat :animal)
                (derive :cat :pet))]
      (is (= #{:animal :pet} (parents h :cat)))
      (is (isa? h :cat :animal))
      (is (isa? h :cat :pet)))))

(deftest hierarchy-accessors
  (let [h (make-hierarchy)]
    (is (nil? (parents h :foo)))
    (is (nil? (ancestors h :foo)))
    (is (nil? (descendants h :foo))))
  (let [h (-> (make-hierarchy)
              (derive :a :b)
              (derive :b :c)
              (derive :c :d))]
    (is (= #{:b} (parents h :a)))
    (is (= #{:b :c :d} (ancestors h :a)))
    (is (= #{:a :b :c} (descendants h :d)))
    (is (isa? h :a :d))
    (is (not (isa? h :foo :bar)))
    (is (isa? h :unknown :unknown))))

(deftest underive-pure-hierarchy
  (testing "removes one edge and recomputes transitive closure"
    (let [h1 (-> (make-hierarchy)
                 (derive :kitten :cat)
                 (derive :cat :animal))
          h2 (underive h1 :kitten :cat)]
      (is (not (isa? h2 :kitten :cat)))
      (is (not (isa? h2 :kitten :animal)))
      (is (isa? h2 :cat :animal))))

  (testing "non-existent edge is a no-op"
    (let [h1 (derive (make-hierarchy) :cat :animal)
          h2 (underive h1 :dog :animal)]
      (is (isa? h2 :cat :animal)))))

(deftest derive-errors
  (is (thrown-with-msg? :default #"self"
        (derive (make-hierarchy) :cat :cat)))
  (is (thrown-with-msg? :default #"cycle"
        (let [h (derive (make-hierarchy) :a :b)]
          (derive h :b :a))))
  (is (thrown-with-msg? :default #"cycle"
        (let [h (-> (make-hierarchy) (derive :a :b) (derive :b :c))]
          (derive h :c :a)))))

(deftest global-hierarchy
  (derive :x/dog :x/animal)
  (is (isa? :x/dog :x/animal))
  (derive :x/cat :x/animal)
  (is (isa? :x/cat :x/animal))
  (underive :x/cat :x/animal)
  (is (not (isa? :x/cat :x/animal)))
  (derive :x/kitten :x/cat)
  (derive :x/cat :x/animal)
  (is (isa? :x/kitten :x/animal))
  (is (= #{:x/cat} (parents :x/kitten)))
  (is (contains? (ancestors :x/kitten) :x/animal))
  (is (contains? (descendants :x/animal) :x/kitten)))

(deftest hierarchy-multimethod-dispatch
  (defmulti sound :type)
  (defmethod sound :animal [_] "generic sound")
  (derive :cat :animal)
  (is (= "generic sound" (sound {:type :cat})))

  (defmethod sound :cat [_] "meow")
  (is (= "meow" (sound {:type :cat})))

  (defmulti inherited-sound :type)
  (defmethod inherited-sound :animal [_] "generic sound")
  (derive :tiny-kitten :animal)
  (is (= "generic sound" (inherited-sound {:type :tiny-kitten})))

  (defmulti describe-shape (fn [x] (:shape-type x)))
  (defmethod describe-shape :polygon [_] "a polygon")
  (derive :triangle :polygon)
  (is (= "a polygon" (describe-shape {:shape-type :triangle}))))

(deftest hierarchy-multimethod-default-and-ambiguity
  (defmulti classify :type)
  (defmethod classify :animal [_] "animal")
  (defmethod classify :pet [_] "pet")
  (defmethod classify :default [_] "unknown")
  (derive :robot-cat :animal)
  (derive :robot-cat :pet)
  (is (= "unknown" (classify {:type :robot})))
  (is (thrown-with-msg? :default #"Multiple methods"
        (classify {:type :robot-cat}))))

(deftest hierarchy-composes-with-functions
  (derive ::cat ::animal)
  (is (isa? ::cat ::animal))
  (let [h (-> (make-hierarchy)
              (derive :a :b)
              (derive :b :c))]
    (is ((fn [h x y] (isa? h x y)) h :a :c)))
  (let [h (-> (make-hierarchy)
              (derive :kitten :cat)
              (derive :cat :feline)
              (derive :feline :animal))]
    (is (isa? h :kitten :animal))
    (is (= 3 (count (ancestors h :kitten))))))
