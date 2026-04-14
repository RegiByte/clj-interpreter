// Auto-generated from src/clojure/math.clj — do not edit directly.
// Re-generate with: npm run gen:core-source
export const clojure_mathSource = `\
(ns clojure.math)

;; Runtime-injected native helpers. Declared here so clojure-lsp can resolve
;; them; the interpreter treats bare (def name) as a no-op and leaves the
;; native binding from coreEnv intact.
(def math-floor*)
(def math-ceil*)
(def math-round*)
(def math-rint*)
(def math-pow*)
(def math-exp*)
(def math-log*)
(def math-log10*)
(def math-cbrt*)
(def math-hypot*)
(def math-sin*)
(def math-cos*)
(def math-tan*)
(def math-asin*)
(def math-acos*)
(def math-atan*)
(def math-atan2*)
(def math-sinh*)
(def math-cosh*)
(def math-tanh*)
(def math-signum*)
(def math-floor-div*)
(def math-floor-mod*)
(def math-to-radians*)
(def math-to-degrees*)

;; ---------------------------------------------------------------------------
;; Constants
;; ---------------------------------------------------------------------------

(def PI
  "The ratio of the circumference of a circle to its diameter."
  3.141592653589793)

(def E
  "The base of the natural logarithms."
  2.718281828459045)

(def TAU
  "The ratio of the circumference of a circle to its radius (2 * PI)."
  6.283185307179586)

;; ---------------------------------------------------------------------------
;; Rounding
;; ---------------------------------------------------------------------------

(defn floor
  "Returns the largest integer value ≤ x."
  [x]
  (math-floor* x))

(defn ceil
  "Returns the smallest integer value ≥ x."
  [x]
  (math-ceil* x))

(defn round
  "Returns the closest integer to x, with ties rounding up (half-up)."
  [x]
  (math-round* x))

(defn rint
  "Returns the integer closest to x, with ties rounding to the nearest even
  integer (IEEE 754 round-half-to-even / banker's rounding)."
  [x]
  (math-rint* x))

;; ---------------------------------------------------------------------------
;; Exponents and logarithms
;; ---------------------------------------------------------------------------

(defn pow
  "Returns x raised to the power of y."
  [x y]
  (math-pow* x y))

(defn exp
  "Returns Euler's number e raised to the power of x."
  [x]
  (math-exp* x))

(defn log
  "Returns the natural logarithm (base e) of x."
  [x]
  (math-log* x))

(defn log10
  "Returns the base-10 logarithm of x."
  [x]
  (math-log10* x))

(defn sqrt
  "Returns the positive square root of x."
  [x]
  (clojure.core/sqrt x))

(defn cbrt
  "Returns the cube root of x."
  [x]
  (math-cbrt* x))

(defn hypot
  "Returns sqrt(x² + y²), avoiding intermediate overflow or underflow."
  [x y]
  (math-hypot* x y))

;; ---------------------------------------------------------------------------
;; Trigonometry
;; ---------------------------------------------------------------------------

(defn sin
  "Returns the trigonometric sine of angle x in radians."
  [x]
  (math-sin* x))

(defn cos
  "Returns the trigonometric cosine of angle x in radians."
  [x]
  (math-cos* x))

(defn tan
  "Returns the trigonometric tangent of angle x in radians."
  [x]
  (math-tan* x))

(defn asin
  "Returns the arc sine of x, in the range [-π/2, π/2]."
  [x]
  (math-asin* x))

(defn acos
  "Returns the arc cosine of x, in the range [0, π]."
  [x]
  (math-acos* x))

(defn atan
  "Returns the arc tangent of x, in the range (-π/2, π/2)."
  [x]
  (math-atan* x))

(defn atan2
  "Returns the angle θ from the conversion of rectangular coordinates (x, y)
  to polar (r, θ). Arguments are y first, then x."
  [y x]
  (math-atan2* y x))

;; ---------------------------------------------------------------------------
;; Hyperbolic
;; ---------------------------------------------------------------------------

(defn sinh
  "Returns the hyperbolic sine of x."
  [x]
  (math-sinh* x))

(defn cosh
  "Returns the hyperbolic cosine of x."
  [x]
  (math-cosh* x))

(defn tanh
  "Returns the hyperbolic tangent of x."
  [x]
  (math-tanh* x))

;; ---------------------------------------------------------------------------
;; Miscellaneous
;; ---------------------------------------------------------------------------

(defn abs
  "Returns the absolute value of x."
  [x]
  (clojure.core/abs x))

(defn signum
  "Returns -1.0, 0.0, or 1.0 indicating the sign of x."
  [x]
  (math-signum* x))

(defn floor-div
  "Returns the largest integer ≤ (/ x y). Unlike quot, floor-div rounds toward
  negative infinity rather than zero."
  [x y]
  (math-floor-div* x y))

(defn floor-mod
  "Returns x - (floor-div x y) * y. Unlike rem, the result has the same sign
  as y."
  [x y]
  (math-floor-mod* x y))

(defn to-radians
  "Converts an angle measured in degrees to an approximately equivalent angle
  measured in radians."
  [deg]
  (math-to-radians* deg))

(defn to-degrees
  "Converts an angle measured in radians to an approximately equivalent angle
  measured in degrees."
  [rad]
  (math-to-degrees* rad))
`
