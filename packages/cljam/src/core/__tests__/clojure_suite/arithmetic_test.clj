;; Arithmetic operation tests written in Clojure.
;; Covers +, -, *, /, mod, rem, quot, abs, inc, dec, max, min, compare.
;;
;; cljam differences from JVM Clojure noted inline:
;;   - (/ a b) returns a JS float, never a ratio (no ratio type in cljam)
;;   - (/ x) single-arg returns 1/x as a float (0.5, 0.25, etc.)
;;   - BigInt (1N) and BigDecimal (1.0M) types do not exist
;;   - ##Inf / ##NaN reader literals are not supported
;;   - (+ 1 nil) throws, matching JVM behavior (unlike ClojureScript)

(ns clojure-suite.arithmetic-test
  (:require [clojure.test :refer [deftest is testing are thrown?]]))

;;; ── Addition ─────────────────────────────────────────────────────────────────

(deftest addition
  (testing "zero-arg returns identity"
    (is (= 0 (+))))

  (testing "single arg is identity"
    (is (= 1 (+ 1)))
    (is (= -5 (+ -5)))
    (is (= 3.14 (+ 3.14))))

  (testing "two-arg int"
    (is (= 3  (+ 1 2)))
    (is (= 0  (+ 1 -1)))
    (is (= -2 (+ -1 -1))))

  (testing "two-arg float"
    (is (= 3.0  (+ 1.0 2.0)))
    (is (= 0.0  (+ 1.0 -1.0)))
    (is (= -2.0 (+ -1.0 -1.0))))

  (testing "mixed int/float"
    (is (= 3.0 (+ 1 2.0)))
    (is (= 3.0 (+ 1.0 2))))

  (testing "multi-arg"
    (is (= 45 (+ 0 1 2 3 4 5 6 7 8 9))))

  (testing "commutativity"
    (are [x y] (= (+ x y) (+ y x))
      1   2
      1.0 2.0
      0   -1))

  (testing "throws on nil"
    (is (thrown? :default (+ 1 nil)))
    (is (thrown? :default (+ nil 1)))))

;;; ── Subtraction ──────────────────────────────────────────────────────────────

(deftest subtraction
  (testing "zero-arg throws"
    (is (thrown? :default (-))))

  (testing "single arg negates"
    (is (= -3    (- 3)))
    (is (= 3     (- -3)))
    (is (= 0     (- 0)))
    (is (= -3.14 (- 3.14))))

  (testing "two-arg int"
    (is (= 2  (- 5 3)))
    (is (= -1 (- 0 1)))
    (is (= 0  (- 1 1))))

  (testing "two-arg float"
    (is (= 2.0  (- 5.0 3.0)))
    (is (= -1.0 (- 0.0 1.0))))

  (testing "multi-arg"
    (is (= -45 (- 0 1 2 3 4 5 6 7 8 9)))))

;;; ── Multiplication ───────────────────────────────────────────────────────────

(deftest multiplication
  (testing "zero-arg returns identity"
    (is (= 1 (*))))

  (testing "single arg is identity"
    (is (= 5  (* 5)))
    (is (= -5 (* -5))))

  (testing "two-arg int"
    (is (= 6  (* 2 3)))
    (is (= 0  (* 0 5)))
    (is (= -6 (* 2 -3)))
    (is (= 6  (* -2 -3))))

  (testing "two-arg float"
    (is (= 6.0  (* 2.0 3.0)))
    (is (= -6.0 (* 2.0 -3.0))))

  (testing "multi-arg"
    (is (= 362880 (* 1 2 3 4 5 6 7 8 9)))))

;;; ── Division ─────────────────────────────────────────────────────────────────

(deftest division
  (testing "two-arg exact"
    (is (= 5.0 (/ 10 2)))
    (is (= 3.0 (/ 15 5)))
    (is (= 2.5 (/ 10.0 4.0))))

  (testing "two-arg non-exact produces float, not ratio"
    ;; cljam: (/ 10 3) = 3.333... — no ratio type
    (is (< 3.33 (/ 10 3) 3.34)))

  (testing "single arg is 1/x"
    ;; (/ x) computes 1/x as a float
    (is (= 0.5  (/ 2)))
    (is (= 0.25 (/ 4)))
    (is (= 0.1  (/ 10))))

  (testing "multi-arg"
    (is (= 10.0 (/ 100 2 5))))

  (testing "division by zero throws"
    (is (thrown? :default (/ 1 0)))
    (is (thrown? :default (/ 0)))
    (is (thrown? :default (/ 1 nil)))))

;;; ── mod ──────────────────────────────────────────────────────────────────────

(deftest modulo
  ;; mod result always has the same sign as the divisor (floor division)
  (testing "positive divisor"
    (is (= 1  (mod 10 3)))
    (is (= 2  (mod -10 3)))   ;; negative dividend → positive result (sign of divisor)
    (is (= 0  (mod 9 3))))

  (testing "negative divisor"
    (is (= -2 (mod 10 -3)))   ;; positive dividend → negative result (sign of divisor)
    (is (= -1 (mod -10 -3)))) ;; both negative → negative result

  (testing "float operands"
    (is (= 1.0  (mod 10.0 3.0)))
    (is (= 2.0  (mod -10.0 3.0)))
    (is (= -2.0 (mod 10.0 -3.0))))

  (testing "division by zero throws"
    (is (thrown? :default (mod 10 0)))))

;;; ── rem ──────────────────────────────────────────────────────────────────────

(deftest remainder
  ;; rem result always has the same sign as the dividend (truncating division)
  (testing "positive dividend"
    (is (= 1  (rem 10 3)))
    (is (= 1  (rem 10 -3))))  ;; positive dividend → positive result regardless of divisor sign

  (testing "negative dividend"
    (is (= -1 (rem -10 3)))
    (is (= -1 (rem -10 -3)))) ;; negative dividend → negative result

  (testing "float operands"
    (is (= 1.0  (rem 10.0 3.0)))
    (is (= -1.0 (rem -10.0 3.0))))

  (testing "division by zero throws"
    (is (thrown? :default (rem 10 0)))))

;;; ── quot ─────────────────────────────────────────────────────────────────────

(deftest quotient
  ;; quot truncates toward zero
  (testing "truncates toward zero"
    (is (= 3  (quot 10 3)))
    (is (= -3 (quot -10 3)))
    (is (= -3 (quot 10 -3)))
    (is (= 3  (quot -10 -3))))

  (testing "exact division"
    (is (= 5 (quot 15 3)))
    (is (= 2 (quot 6 3))))

  (testing "float operands"
    (is (= 3.0  (quot 10.0 3.0)))
    (is (= -3.0 (quot -10.0 3.0))))

  (testing "division by zero throws"
    (is (thrown? :default (quot 10 0)))))

;;; ── mod vs rem semantic distinction ─────────────────────────────────────────

(deftest mod-vs-rem-signs
  ;; The key semantic difference:
  ;; mod → result sign follows the divisor (floor division)
  ;; rem → result sign follows the dividend (truncating division)
  (testing "positive dividend, negative divisor"
    (is (= -2 (mod 10 -3)))   ;; mod: follows divisor (negative)
    (is (= 1  (rem 10 -3))))  ;; rem: follows dividend (positive)

  (testing "negative dividend, positive divisor"
    (is (= 2  (mod -10 3)))   ;; mod: follows divisor (positive)
    (is (= -1 (rem -10 3))))) ;; rem: follows dividend (negative)

;;; ── abs ──────────────────────────────────────────────────────────────────────

(deftest absolute-value
  (is (= 5    (abs -5)))
  (is (= 5    (abs 5)))
  (is (= 3.14 (abs -3.14)))
  (is (= 0    (abs 0)))
  (is (= 0.0  (abs 0.0))))

;;; ── inc / dec ────────────────────────────────────────────────────────────────

(deftest increment-decrement
  (is (= 2   (inc 1)))
  (is (= 0   (inc -1)))
  (is (= 1   (inc 0)))
  (is (= 2.5 (inc 1.5)))
  (is (= 0   (dec 1)))
  (is (= -2  (dec -1)))
  (is (= -1  (dec 0)))
  (is (= 0.5 (dec 1.5))))

;;; ── max / min ────────────────────────────────────────────────────────────────

(deftest max-and-min
  (testing "two-arg"
    (is (= 2 (max 1 2)))
    (is (= 2 (max 2 1)))
    (is (= 1 (min 1 2)))
    (is (= 1 (min 2 1))))

  (testing "single-arg identity"
    (is (= 5 (max 5)))
    (is (= 5 (min 5))))

  (testing "multi-arg"
    (is (= 5 (max 1 2 3 4 5)))
    (is (= 5 (max 5 4 3 2 1)))
    (is (= 1 (min 1 2 3 4 5)))
    (is (= 1 (min 5 4 3 2 1))))

  (testing "float operands"
    (is (= 2.0 (max 1.0 2.0)))
    (is (= 1.0 (min 1.0 2.0))))

  (testing "throws on nil"
    (is (thrown? :default (max 1 nil)))
    (is (thrown? :default (min 1 nil)))))

  ;; NOTE: NaN propagation in max/min works correctly ((max NaN 1) → NaN),
  ;; but ##NaN reader literals and js/Math host bindings are not available
  ;; in the vitest test context. Tested manually via the REPL.

;;; ── compare ──────────────────────────────────────────────────────────────────

(deftest compare-ordering
  (testing "numbers"
    (is (= -1 (compare 1 2)))
    (is (= 1  (compare 2 1)))
    (is (= 0  (compare 1 1)))
    (is (= -1 (compare 1.0 2.0)))
    (is (= 0  (compare 1 1.0))))

  (testing "strings"
    (is (= -1 (compare "a" "b")))
    (is (= 1  (compare "b" "a")))
    (is (= 0  (compare "a" "a"))))

  (testing "keywords"
    (is (= 0 (compare :a :a)))
    (is (not= 0 (compare :a :b)))))
