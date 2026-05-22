;; Higher-order function tests.
;; Covers comp, partial, juxt, constantly, complement, fnil, memoize, apply, trampoline.
;;
;; cljam differences from JVM Clojure noted inline:
;;   - ((comp) x y z) returns x (first arg). JVM (comp) returns identity which is strict 1-arity.
;;   - cljam arity checking is lenient for native fns — ((partial inc 1) 2) returns 2, not throw.

(ns clojure-suite.higher-order-test
  (:require [clojure.test :refer [deftest is testing thrown?]]))

;;; ── comp ─────────────────────────────────────────────────────────────────────

(deftest comp-basic
  (testing "comp is a fn"
    (is (fn? comp)))

  (testing "single-arg comp applies the fn"
    (is (= 6  ((comp inc) 5)))
    (is (= -5 ((comp -) 5)))
    (is (= "5" ((comp str) 5))))

  (testing "two-arg comp applies right-to-left"
    (is (= 5   ((comp inc dec) 5)))
    (is (= "6" ((comp str inc) 5))))

  (testing "three-arg comp chains right-to-left"
    (is (= "6" ((comp str inc dec inc) 5))))

  (testing "zero-arg comp acts like identity for single arg"
    (is (= 42 ((comp) 42)))
    (is (= :kw ((comp) :kw)))))

(deftest comp-with-ifn
  (testing "keywords are callable — usable in comp"
    (is (= 42 ((comp :a) {:a 42}))))

  (testing "maps are callable — usable in comp"
    (is (= :v ((comp {:k :v}) :k))))

  (testing "comp chains keyword and fn"
    (is (= 43 ((comp inc :count) {:count 42})))))

;;; ── some-fn / every-pred ────────────────────────────────────────────────────

(deftest some-fn-basic
  (testing "some-fn is a fn factory"
    (is (fn? some-fn))
    (is (fn? (some-fn even?))))

  (testing "returns the first truthy predicate result"
    (is (= nil ((some-fn even?))))
    (is (= false ((some-fn even?) 1)))
    (is (= true ((some-fn even?) 1 2)))
    (is (= 2 ((some-fn :a :b) {:a nil :b 2})))
    (is (= 3 ((some-fn #{1 2} #{3 4}) 5 3 7))))

  (testing "short-circuits predicates and arguments"
    (let [calls (atom [])]
      (is (= :hit
             ((some-fn (fn [x] (swap! calls conj [:p1 x]) (when (= x 2) :hit))
                       (fn [x] (swap! calls conj [:p2 x]) false))
              1 2 3)))
      (is (= [[:p1 1] [:p1 2]] @calls))))

  (testing "bad predicate values fail when the returned fn is invoked"
    (is (fn? (some-fn 42)))
    (is (thrown? :default ((some-fn 42) nil)))))

(deftest every-pred-basic
  (testing "every-pred is a fn factory"
    (is (fn? every-pred))
    (is (fn? (every-pred even?))))

  (testing "returns true only when every predicate accepts every argument"
    (is (= true ((every-pred even?) 2 4 6)))
    (is (= false ((every-pred even?) 2 3 4)))
    (is (= true ((every-pred pos? integer?) 1 2 3)))
    (is (= false ((every-pred :a :b) {:a true})))
    (is (= true ((every-pred :a :b) {:a true :b 1}))))

  (testing "zero-arg result function returns true"
    (is (= true ((every-pred even?)))))

  (testing "short-circuits on first falsy predicate result"
    (let [calls (atom [])]
      (is (= false
             ((every-pred (fn [x] (swap! calls conj [:p1 x]) (not= x 2))
                          (fn [x] (swap! calls conj [:p2 x]) true))
              1 2 3)))
      (is (= [[:p1 1] [:p1 2]] @calls))))

  (testing "bad predicate values fail when the returned fn is invoked"
    (is (fn? (every-pred 42)))
    (is (thrown? :default ((every-pred 42) nil)))))

(deftest max-key-min-key-basic
  (testing "single item returns the original item without invoking k"
    (is (= 1 (max-key nil 1)))
    (is (= 1 (min-key nil 1))))

  (testing "selects by computed key"
    (is (= -3 (max-key #(* % %) -3 -1 2)))
    (is (= -1 (min-key #(* % %) -3 -1 2)))
    (is (= "ccc" (max-key count "a" "bb" "ccc")))
    (is (= "a" (min-key count "a" "bb" "ccc"))))

  (testing "ties return the later item"
    (is (= "bb" (max-key count "aa" "bb")))
    (is (= :c (min-key (constantly 5) :a :b :c))))

  (testing "key values must be numeric for cljam's comparison predicates"
    (is (thrown? :default (max-key identity "x" "y")))
    (is (thrown? :default (min-key identity :a :b)))))

(deftest comp-multi-arg-result
  (testing "result fn can accept multiple args when first fn is variadic"
    ;; vector collects all args, then str joins them
    (is (= "123" ((comp (partial apply str) vector) 1 2 3))))

  (testing "comp of juxt and +"
    ;; (juxt inc dec) of 5 → [6 4], then (apply +) → 10
    (is (= 10 ((comp (partial apply +) (juxt inc dec)) 5)))))

;;; ── partial ──────────────────────────────────────────────────────────────────

(deftest partial-basic
  (testing "partial is a fn"
    (is (fn? partial)))

  (testing "partial pre-fills one argument"
    (is (= 3 ((partial + 1) 2))))

  (testing "partial pre-fills multiple arguments"
    (is (= 6 ((partial + 1 2) 3))))

  (testing "variadic result fn"
    (is (= [1 2 3 4 5] ((partial vector 1 2 3) 4 5))))

  (testing "partial of partial"
    (let [add1  (partial + 1)
          add13 (partial add1 3)]
      (is (= 4 (add1 3)))
      (is (= 7 (add13 3)))))

  (testing "partial with lazy sequences"
    (let [take5 (partial take 5)]
      (is (= '(0 1 2 3 4) (take5 (range))))))

  (testing "map over sequence of partials"
    (let [doublers (map #(partial * 2 %) (range 1 4))]
      (is (= [2 4 6] (map #(%) doublers))))))

;;; ── juxt ─────────────────────────────────────────────────────────────────────

(deftest juxt-basic
  (testing "juxt is a fn"
    (is (fn? juxt)))

  (testing "result is a vector"
    (is (vector? ((juxt inc dec) 5))))

  (testing "basic two-fn juxt"
    (is (= [6 4] ((juxt inc dec) 5))))

  (testing "three-fn juxt"
    (let [arg 10]
      (is (= [(inc arg) (dec arg) arg]
             ((juxt inc dec identity) arg)))))

  (testing "multi-arg juxt — all fns receive all args"
    ;; str receives all args (1 2 3 4 5) → "12345", min/max scan all args
    ;; matches jank suite: (juxt str min max)
    (is (= ["12345" 1 5] ((juxt str min max) 1 2 3 4 5)))))

(deftest juxt-with-ifn
  (testing "keywords as fns in juxt"
    (is (= [1 2] ((juxt :a :b) {:a 1 :b 2}))))

  (testing "missing key returns nil"
    (is (= ["foo" nil "bar"]
           ((juxt :foo :missing :bar) {:foo "foo" :bar "bar"}))))

  (testing "map as fn in juxt"
    (is (= [:v] ((juxt {:k :v}) :k))))

  (testing "keyword as fn in juxt"
    (is (= [:v] ((juxt :k) {:k :v}))))

  (testing "namespace and name of keyword"
    (is (= [:ns/kw "kw" "ns"]
           ((juxt identity name namespace) :ns/kw)))))

;;; ── constantly ───────────────────────────────────────────────────────────────

(deftest constantly-basic
  (testing "always returns the same value"
    (is (= 42 ((constantly 42) 1 2 3))))

  (testing "ignores all arguments"
    (is (= :fixed ((constantly :fixed) :a :b :c))))

  (testing "useful as a default fn"
    (let [always-zero (constantly 0)]
      (is (= [0 0 0] (map always-zero [1 2 3]))))))

;;; ── complement ───────────────────────────────────────────────────────────────

(deftest complement-basic
  (testing "inverts truthy/falsy"
    (is (= true  ((complement even?) 3)))
    (is (= false ((complement even?) 4))))

  (testing "complement of nil?"
    (is (= true  ((complement nil?) 5)))
    (is (= false ((complement nil?) nil))))

  (testing "double complement is identity for booleans"
    (is (= true  ((complement (complement even?)) 4)))
    (is (= false ((complement (complement even?)) 3)))))

;;; ── fnil ─────────────────────────────────────────────────────────────────────

(deftest fnil-basic
  (testing "replaces nil first arg with default"
    (is (= 1 ((fnil inc 0) nil)))
    (is (= 6 ((fnil inc 0) 5))))

  (testing "two-arg fnil replaces up to two nils"
    (is (= 0  ((fnil + 0 0) nil nil)))
    (is (= 5  ((fnil + 0 0) nil 5)))
    (is (= 3  ((fnil + 0 0) nil 3)))
    (is (= 8  ((fnil + 0 0) 3 5)))))

;;; ── memoize ──────────────────────────────────────────────────────────────────

(deftest memoize-basic
  (testing "memoize caches results"
    (let [call-count (atom 0)
          memo-sq    (memoize (fn [x] (swap! call-count inc) (* x x)))]
      (is (= 25 (memo-sq 5)))
      (is (= 25 (memo-sq 5)))
      (is (= 1  @call-count))     ;; called only once despite two invocations
      (is (= 9  (memo-sq 3)))
      (is (= 2  @call-count))))   ;; new arg → second invocation

  (testing "different args are cached independently"
    (let [memo-str (memoize str)]
      (is (= "1" (memo-str 1)))
      (is (= "2" (memo-str 2)))
      (is (= "1" (memo-str 1))))))

;;; ── apply ────────────────────────────────────────────────────────────────────

(deftest apply-basic
  (testing "apply with just a sequence"
    (is (= 6  (apply + [1 2 3])))
    (is (= 6  (apply * [1 2 3]))))

  (testing "apply with leading args before sequence"
    (is (= 10 (apply + 1 2 [3 4])))
    (is (= 6  (apply + 1 [2 3]))))

  (testing "apply str"
    (is (= "hello world" (apply str ["hello" " " "world"]))))

  (testing "apply with empty sequence"
    (is (= 0 (apply + [])))
    (is (= 1 (apply * [])))))

;;; ── trampoline ───────────────────────────────────────────────────────────────

(deftest trampoline-basic
  (testing "non-fn result returned directly"
    (is (= 3 (trampoline + 1 2))))

  (testing "fn result is bounced until non-fn"
    (is (= 42 (trampoline (fn [] (fn [] 42))))))

  (testing "mutual recursion without stack overflow"
    (letfn [(my-even? [n] (if (zero? n) true  #(my-odd?  (dec n))))
            (my-odd?  [n] (if (zero? n) false #(my-even? (dec n))))]
      (is (= true  (trampoline my-even? 10)))
      (is (= false (trampoline my-even? 11)))
      (is (= true  (trampoline my-odd?  11)))
      (is (= false (trampoline my-odd?  10))))))
