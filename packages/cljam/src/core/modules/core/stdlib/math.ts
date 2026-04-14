// Native math helpers used by clojure.math.
// All public API lives in src/clojure/math.clj; these are private helpers.
import { EvaluationError } from '../../../errors'
import { v } from '../../../factories'
import { printString } from '../../../printer'
import type { CljNumber, CljValue } from '../../../types'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function assertNum(val: CljValue | undefined, fnName: string): number {
  if (val === undefined || val.kind !== 'number') {
    throw new EvaluationError(
      `${fnName} expects a number${val !== undefined ? `, got ${printString(val)}` : ''}`,
      { val }
    )
  }
  return (val as CljNumber).value
}

function assertNum2(
  a: CljValue | undefined,
  b: CljValue | undefined,
  fnName: string
): [number, number] {
  return [assertNum(a, fnName), assertNum(b, fnName)]
}

// IEEE 754 round-half-to-even (banker's rounding).
// JavaScript's Math.round is half-up, which differs from Clojure's rint.
function rint(x: number): number {
  const floor = Math.floor(x)
  const diff = x - floor
  if (diff === 0.5) {
    return floor % 2 === 0 ? floor : floor + 1
  }
  return Math.round(x)
}

// ---------------------------------------------------------------------------
// Exported record
// ---------------------------------------------------------------------------

export const mathFunctions: Record<string, CljValue> = {
  // ── Rounding ──────────────────────────────────────────────────────────────

  'math-floor*': v
    .nativeFn('math-floor*', function mathFloorImpl(x: CljValue) {
      return v.number(Math.floor(assertNum(x, 'floor')))
    })
    .doc('Returns the largest integer ≤ x.', [['x']]),

  'math-ceil*': v
    .nativeFn('math-ceil*', function mathCeilImpl(x: CljValue) {
      return v.number(Math.ceil(assertNum(x, 'ceil')))
    })
    .doc('Returns the smallest integer ≥ x.', [['x']]),

  'math-round*': v
    .nativeFn('math-round*', function mathRoundImpl(x: CljValue) {
      return v.number(Math.round(assertNum(x, 'round')))
    })
    .doc('Returns the closest integer to x, with ties rounding up.', [['x']]),

  'math-rint*': v
    .nativeFn('math-rint*', function mathRintImpl(x: CljValue) {
      return v.number(rint(assertNum(x, 'rint')))
    })
    .doc(
      'Returns the integer closest to x, with ties rounding to the nearest even (IEEE 754 round-half-to-even).',
      [['x']]
    ),

  // ── Exponents / logarithms ────────────────────────────────────────────────

  'math-pow*': v
    .nativeFn('math-pow*', function mathPowImpl(x: CljValue, y: CljValue) {
      const [xn, yn] = assertNum2(x, y, 'pow')
      return v.number(Math.pow(xn, yn))
    })
    .doc('Returns x raised to the power of y.', [['x', 'y']]),

  'math-exp*': v
    .nativeFn('math-exp*', function mathExpImpl(x: CljValue) {
      return v.number(Math.exp(assertNum(x, 'exp')))
    })
    .doc("Returns Euler's number e raised to the power of x.", [['x']]),

  'math-log*': v
    .nativeFn('math-log*', function mathLogImpl(x: CljValue) {
      return v.number(Math.log(assertNum(x, 'log')))
    })
    .doc('Returns the natural logarithm (base e) of x.', [['x']]),

  'math-log10*': v
    .nativeFn('math-log10*', function mathLog10Impl(x: CljValue) {
      return v.number(Math.log10(assertNum(x, 'log10')))
    })
    .doc('Returns the base-10 logarithm of x.', [['x']]),

  'math-cbrt*': v
    .nativeFn('math-cbrt*', function mathCbrtImpl(x: CljValue) {
      return v.number(Math.cbrt(assertNum(x, 'cbrt')))
    })
    .doc('Returns the cube root of x.', [['x']]),

  'math-hypot*': v
    .nativeFn('math-hypot*', function mathHypotImpl(x: CljValue, y: CljValue) {
      const [xn, yn] = assertNum2(x, y, 'hypot')
      return v.number(Math.hypot(xn, yn))
    })
    .doc('Returns sqrt(x² + y²), the length of the hypotenuse.', [['x', 'y']]),

  // ── Trigonometry ──────────────────────────────────────────────────────────

  'math-sin*': v
    .nativeFn('math-sin*', function mathSinImpl(x: CljValue) {
      return v.number(Math.sin(assertNum(x, 'sin')))
    })
    .doc('Returns the sine of x (in radians).', [['x']]),

  'math-cos*': v
    .nativeFn('math-cos*', function mathCosImpl(x: CljValue) {
      return v.number(Math.cos(assertNum(x, 'cos')))
    })
    .doc('Returns the cosine of x (in radians).', [['x']]),

  'math-tan*': v
    .nativeFn('math-tan*', function mathTanImpl(x: CljValue) {
      return v.number(Math.tan(assertNum(x, 'tan')))
    })
    .doc('Returns the tangent of x (in radians).', [['x']]),

  'math-asin*': v
    .nativeFn('math-asin*', function mathAsinImpl(x: CljValue) {
      return v.number(Math.asin(assertNum(x, 'asin')))
    })
    .doc('Returns the arc sine of x, in radians.', [['x']]),

  'math-acos*': v
    .nativeFn('math-acos*', function mathAcosImpl(x: CljValue) {
      return v.number(Math.acos(assertNum(x, 'acos')))
    })
    .doc('Returns the arc cosine of x, in radians.', [['x']]),

  'math-atan*': v
    .nativeFn('math-atan*', function mathAtanImpl(x: CljValue) {
      return v.number(Math.atan(assertNum(x, 'atan')))
    })
    .doc('Returns the arc tangent of x, in radians.', [['x']]),

  'math-atan2*': v
    .nativeFn('math-atan2*', function mathAtan2Impl(y: CljValue, x: CljValue) {
      const [yn, xn] = assertNum2(y, x, 'atan2')
      return v.number(Math.atan2(yn, xn))
    })
    .doc('Returns the angle θ from the conversion of rectangular (x, y) to polar (r, θ). Args: y, x.', [
      ['y', 'x'],
    ]),

  // ── Hyperbolic ────────────────────────────────────────────────────────────

  'math-sinh*': v
    .nativeFn('math-sinh*', function mathSinhImpl(x: CljValue) {
      return v.number(Math.sinh(assertNum(x, 'sinh')))
    })
    .doc('Returns the hyperbolic sine of x.', [['x']]),

  'math-cosh*': v
    .nativeFn('math-cosh*', function mathCoshImpl(x: CljValue) {
      return v.number(Math.cosh(assertNum(x, 'cosh')))
    })
    .doc('Returns the hyperbolic cosine of x.', [['x']]),

  'math-tanh*': v
    .nativeFn('math-tanh*', function mathTanhImpl(x: CljValue) {
      return v.number(Math.tanh(assertNum(x, 'tanh')))
    })
    .doc('Returns the hyperbolic tangent of x.', [['x']]),

  // ── Miscellaneous ─────────────────────────────────────────────────────────

  'math-signum*': v
    .nativeFn('math-signum*', function mathSignumImpl(x: CljValue) {
      const n = assertNum(x, 'signum')
      if (n === 0 || Number.isNaN(n)) return v.number(n)
      return v.number(n > 0 ? 1.0 : -1.0)
    })
    .doc('Returns -1.0, 0.0, or 1.0 indicating the sign of x.', [['x']]),

  'math-floor-div*': v
    .nativeFn('math-floor-div*', function mathFloorDivImpl(x: CljValue, y: CljValue) {
      const [xn, yn] = assertNum2(x, y, 'floor-div')
      if (yn === 0) throw new EvaluationError('floor-div: division by zero', { x, y })
      return v.number(Math.floor(xn / yn))
    })
    .doc('Returns the largest integer ≤ x/y (floor division).', [['x', 'y']]),

  'math-floor-mod*': v
    .nativeFn('math-floor-mod*', function mathFloorModImpl(x: CljValue, y: CljValue) {
      const [xn, yn] = assertNum2(x, y, 'floor-mod')
      if (yn === 0) throw new EvaluationError('floor-mod: division by zero', { x, y })
      return v.number(((xn % yn) + yn) % yn)
    })
    .doc('Returns x - (floor-div x y) * y (floor modulo).', [['x', 'y']]),

  'math-to-radians*': v
    .nativeFn('math-to-radians*', function mathToRadiansImpl(x: CljValue) {
      return v.number((assertNum(x, 'to-radians') * Math.PI) / 180)
    })
    .doc('Converts an angle in degrees to radians.', [['deg']]),

  'math-to-degrees*': v
    .nativeFn('math-to-degrees*', function mathToDegreesImpl(x: CljValue) {
      return v.number((assertNum(x, 'to-degrees') * 180) / Math.PI)
    })
    .doc('Converts an angle in radians to degrees.', [['rad']]),
}
