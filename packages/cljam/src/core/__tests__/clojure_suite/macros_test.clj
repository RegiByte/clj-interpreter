;; Macro and quote semantic tests written in Clojure.
;; Covers quote, quasiquote, unquote, unquote-splicing, defmacro,
;; macroexpand, macroexpand-1, macroexpand-all, gensym, and macro hygiene.

(ns clojure-suite.macros-test
  (:require [clojure.test :refer [deftest is testing thrown?]]))

(defmacro pass-through [x] x)

(defmacro ignore-form [x] :ignored)

(defmacro my-when [condition & body]
  `(if ~condition
     (do ~@body)
     nil))

(defmacro documented-macro
  "Does macro things."
  [a b & rest]
  a)

(defmacro choose-form
  ([x] x)
  ([x y] y)
  ([x y & more] `(vector ~x ~y ~@more)))

(defmacro expands-to-when [condition & body]
  `(when ~condition ~@body))

(defmacro expands-to-when-not [condition & body]
  `(when (not ~condition) ~@body))

(defmacro my-or [a b]
  `(let [v# ~a]
     (if v# v# ~b)))

;;; -- quote / quasiquote -------------------------------------------------------

(deftest quote-produces-data
  (testing "quote returns forms without evaluating them"
    (is (= 'x (quote x)))
    (is (= '(+ 1 2) (quote (+ 1 2))))
    (is (= [1 'x :k] [1 (quote x) :k])))

  (testing "quoted collections preserve their shape"
    (is (= '(1 2 3) '(1 2 3)))
    (is (= '[a b c] (quote [a b c])))
    (is (= '{:a 1 :b 2} (quote {:a 1 :b 2})))))

(deftest quasiquote-qualifies-symbols
  (testing "bare symbols in a quasiquote are auto-qualified"
    (is (= 'clojure-suite.macros-test/local-symbol `local-symbol))
    (is (= '(clojure-suite.macros-test/a
             clojure-suite.macros-test/b
             clojure-suite.macros-test/c)
           `(a b c)))
    (is (= '[clojure-suite.macros-test/a
             clojure-suite.macros-test/b
             clojure-suite.macros-test/c]
           `[a b c])))

  (testing "keywords and scalar literals are not namespace-qualified"
    (is (= {:a 1 :b 2} `{:a 1 :b 2}))
    (is (= [:a 1 "x" nil true false] `[:a 1 "x" nil true false]))))

(deftest quasiquote-unquote-and-splicing
  (testing "unquote evaluates in the surrounding lexical environment"
    (let [x 42]
      (is (= 42 `~x))
      (is (= '(clojure-suite.macros-test/value 42)
             `(value ~x)))))

  (testing "unquote-splicing inserts sequence elements"
    (let [xs [1 2 3]]
      (is (= '(clojure-suite.macros-test/a 1 2 3 clojure-suite.macros-test/b)
             `(a ~@xs b)))
      (is (= [0 1 2 3 4]
             `[0 ~@xs 4]))))

  (testing "unquote-splicing works in set templates"
    (let [xs [:a :b]]
      (is (= #{:a :b :c} `#{~@xs :c})))))

;;; -- defmacro ----------------------------------------------------------------

(deftest defmacro-basic-expansion
  (testing "macros return forms which are then evaluated"
    (is (= 42 (pass-through 42)))
    (is (= "hello" (pass-through "hello")))
    (is (= :foo (pass-through :foo)))
    (is (nil? (pass-through nil))))

  (testing "macro arguments are passed as unevaluated forms"
    (is (= :ignored (ignore-form missing-symbol)))))

(deftest defmacro-with-quasiquote
  (is (= 3 (my-when true 1 2 3)))
  (is (= :zero (my-when (= 0 (- 1 1)) :zero)))
  (is (nil? (my-when false 1 2 3))))

(deftest defmacro-metadata
  (is (var? #'documented-macro))
  (is (= "Does macro things." (:doc (meta #'documented-macro))))
  (is (= 1 (count (:arglists (meta #'documented-macro)))))
  (is (= "[a b & rest]" (str (first (:arglists (meta #'documented-macro))))))
  (is (= "Does macro things." (:doc (:value (describe #'documented-macro))))))

(deftest multi-arity-defmacro
  (is (= :one (choose-form :one)))
  (is (= :two (choose-form :one :two)))
  (is (= [:one :two :three :four]
         (choose-form :one :two :three :four)))
  (is (= 3 (count (:arglists (meta #'choose-form))))))

;;; -- macroexpand -------------------------------------------------------------

(deftest macroexpand-one
  (is (= '(if true (do 1 2) nil)
         (macroexpand-1 '(when true 1 2))))
  (is (= '(if false nil (do 42))
         (macroexpand-1 '(when-not false 42))))
  (is (= '(+ 1 2)
         (macroexpand-1 '(+ 1 2))))
  (is (= 42 (macroexpand-1 42)))

  (testing "macroexpand-1 expands only the outermost macro"
    (is (= '(clojure.core/when true :ok)
           (macroexpand-1 '(expands-to-when true :ok))))))

(deftest macroexpand-fully
  (is (= '(if true (do 1) nil)
         (macroexpand '(when true 1))))
  (is (= '(if (clojure.core/not false) (do 1) nil)
         (macroexpand '(expands-to-when-not false 1))))
  (is (= '(+ 1 2)
         (macroexpand '(+ 1 2)))))

(deftest macroexpand-all-descends
  (is (= '(if true (do 42) nil)
         (macroexpand-all '(when true 42))))
  (is (= '(let* [x (if true (do 1) nil)] x)
         (macroexpand-all '(let [x (when true 1)] x))))
  (is (= '(if test (if a (do 1) nil) (if b (do 2) nil))
         (macroexpand-all '(if test (when a 1) (when b 2)))))
  (is (= '(quote (when true 1))
         (macroexpand-all '(quote (when true 1))))))

;;; -- gensym and hygiene ------------------------------------------------------

(deftest gensym-basics
  (let [a (gensym)
        b (gensym)
        prefixed (gensym "prefix")]
    (is (symbol? a))
    (is (symbol? b))
    (is (not= a b))
    (is (re-matches #"G__\d+" (name a)))
    (is (re-matches #"prefix__\d+" (name prefixed))))

  (is (thrown? :default (gensym "a" "b")))
  (is (thrown? :default (gensym 42))))

(deftest auto-gensym-in-quasiquote
  (testing "auto-gensym creates symbols"
    (let [x `x#]
      (is (symbol? x))
      (is (re-matches #"x__\d+" (name x)))))

  (testing "the same auto-gensym name is stable inside one quasiquote"
    (let [form `(let [v# 1] v#)
          bindings (second form)
          binding-sym (first bindings)
          body-sym (nth form 2)]
      (is (symbol? binding-sym))
      (is (= binding-sym body-sym))
      (is (re-matches #"v__\d+" (name binding-sym)))))

  (testing "different quasiquotes produce different gensyms"
    (is (not= `x# `x#))))

(deftest core-macro-hygiene
  (testing "and/or do not collide with caller locals"
    (is (= 99 (let [__v 99] (and true __v))))
    (is (= 99 (let [__v 99] (or false __v))))
    (is (= 3 (and 1 (or nil 2) 3)))
    (is (= 2 (or nil (and 1 2)))))

  (testing "user macros can use auto-gensym for hygienic bindings"
    (is (= 10 (let [v 10] (my-or false v))))))
