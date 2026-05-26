;; clojure.math constants and function semantics.

(ns clojure-suite.math-test
  (:require [clojure.test :refer [deftest is testing thrown-with-msg?]]
            [clojure.math :as m]))

(defn close? [expected actual]
  (< (m/abs (- expected actual)) 1.0e-10))

(deftest math-constants
  (is (close? 3.141592653589793 m/PI))
  (is (close? 2.718281828459045 m/E))
  (is (close? (* 2 m/PI) m/TAU)))

(deftest math-rounding
  (is (= 3 (m/floor 3.9)))
  (is (= -4 (m/floor -3.1)))
  (is (= 4 (m/ceil 3.1)))
  (is (= -3 (m/ceil -3.9)))
  (is (= 3 (m/round 3.4)))
  (is (= 4 (m/round 3.5)))
  (is (= -3 (m/round -3.5)))
  (is (= 2 (m/rint 2.5)))
  (is (= 4 (m/rint 3.5)))
  (is (= 4 (m/rint 4.5))))

(deftest math-exponents-and-logs
  (is (= 1024 (m/pow 2 10)))
  (is (= 3 (m/pow 9 0.5)))
  (is (= 1 (m/pow 2 0)))
  (is (close? m/E (m/exp 1)))
  (is (= 1 (m/exp 0)))
  (is (close? 1 (m/log m/E)))
  (is (= 0 (m/log 1)))
  (is (= 2 (m/log10 100)))
  (is (= 3 (m/log10 1000)))
  (is (= 3 (m/sqrt 9)))
  (is (close? 1.4142135623730951 (m/sqrt 2)))
  (is (NaN? (m/sqrt -1)))
  (is (= 3 (m/cbrt 27)))
  (is (close? -2 (m/cbrt -8)))
  (is (= 5 (m/hypot 3 4))))

(deftest math-trigonometry
  (is (close? 0 (m/sin 0)))
  (is (close? 1 (m/sin (/ m/PI 2))))
  (is (close? 1 (m/cos 0)))
  (is (close? -1 (m/cos m/PI)))
  (is (close? 1 (m/tan (/ m/PI 4))))
  (is (close? (/ m/PI 2) (m/asin 1)))
  (is (close? 0 (m/acos 1)))
  (is (close? (/ m/PI 4) (m/atan 1)))
  (is (close? (/ m/PI 4) (m/atan2 1 1)))
  (is (close? m/PI (m/atan2 0 -1))))

(deftest math-hyperbolic-and-misc
  (is (= 0 (m/sinh 0)))
  (is (= 1 (m/cosh 0)))
  (is (= 0 (m/tanh 0)))
  (is (>= (m/cosh 1) 1))
  (is (>= (m/cosh -1) 1))
  (is (>= (m/cosh 5) 1))
  (is (= 5 (m/abs -5)))
  (is (= 1 (m/signum 42)))
  (is (= -1 (m/signum -42)))
  (is (= 0 (m/signum 0)))
  (is (= 3 (m/floor-div 7 2)))
  (is (= -4 (m/floor-div -7 2)))
  (is (= -4 (m/floor-div 7 -2)))
  (is (= 1 (m/floor-mod 7 2)))
  (is (= 1 (m/floor-mod -7 2)))
  (is (= -1 (m/floor-mod 7 -2)))
  (is (close? 90 (m/to-degrees (m/to-radians 90))))
  (is (close? m/PI (m/to-radians (m/to-degrees m/PI))))
  (is (close? 1
              (let [angle (/ m/PI 6)]
                (+ (* (m/sin angle) (m/sin angle))
                   (* (m/cos angle) (m/cos angle)))))))

(deftest math-errors
  (is (thrown-with-msg? :default #"number" (m/floor "not a number")))
  (is (thrown-with-msg? :default #"number" (m/pow "x" 2)))
  (is (thrown-with-msg? :default #"division by zero" (m/floor-div 7 0)))
  (is (thrown-with-msg? :default #"division by zero" (m/floor-mod 7 0))))

(deftest math-require-alias
  (require '[clojure.math :as math])
  (is (= m/PI math/PI))
  (is (= 4 (math/sqrt 16))))
