import { describe, expect, it } from 'vitest'
import { v } from '../../core/factories'
import { freshSession } from '../../core/evaluator/__tests__/evaluator-test-utils'

// All tests require clojure.math, so create a shared session helper.
function mathSession() {
  const s = freshSession()
  s.evaluate("(require '[clojure.math :as m])")
  return s
}

describe('clojure.math', () => {
  // ── Constants ─────────────────────────────────────────────────────────────

  describe('1. constants', () => {
    it('PI matches JavaScript Math.PI', () => {
      const s = mathSession()
      const result = s.evaluate('m/PI')
      expect(result).toEqual(v.number(Math.PI))
    })

    it('E matches JavaScript Math.E', () => {
      const s = mathSession()
      const result = s.evaluate('m/E')
      expect(result).toEqual(v.number(Math.E))
    })

    it('TAU is 2 * PI', () => {
      const s = mathSession()
      const result = s.evaluate('m/TAU')
      if (result.kind !== 'number') throw new Error('expected number')
      expect(result.value).toBeCloseTo(2 * Math.PI, 10)
    })
  })

  // ── Rounding ──────────────────────────────────────────────────────────────

  describe('2. rounding', () => {
    it('floor rounds down', () => {
      const s = mathSession()
      expect(s.evaluate('(m/floor 3.9)')).toEqual(v.number(3))
      expect(s.evaluate('(m/floor -3.1)')).toEqual(v.number(-4))
      expect(s.evaluate('(m/floor 3.0)')).toEqual(v.number(3))
    })

    it('ceil rounds up', () => {
      const s = mathSession()
      expect(s.evaluate('(m/ceil 3.1)')).toEqual(v.number(4))
      expect(s.evaluate('(m/ceil -3.9)')).toEqual(v.number(-3))
      expect(s.evaluate('(m/ceil 4.0)')).toEqual(v.number(4))
    })

    it('round rounds to nearest, ties go up', () => {
      const s = mathSession()
      expect(s.evaluate('(m/round 3.4)')).toEqual(v.number(3))
      expect(s.evaluate('(m/round 3.5)')).toEqual(v.number(4))
      expect(s.evaluate('(m/round 3.6)')).toEqual(v.number(4))
      expect(s.evaluate('(m/round -3.5)')).toEqual(v.number(-3))
    })

    it('rint uses banker rounding — ties go to nearest even', () => {
      const s = mathSession()
      expect(s.evaluate('(m/rint 2.5)')).toEqual(v.number(2)) // 2 is even
      expect(s.evaluate('(m/rint 3.5)')).toEqual(v.number(4)) // 4 is even
      expect(s.evaluate('(m/rint 4.5)')).toEqual(v.number(4)) // 4 is even
      expect(s.evaluate('(m/rint 5.5)')).toEqual(v.number(6)) // 6 is even
      expect(s.evaluate('(m/rint 2.4)')).toEqual(v.number(2)) // normal round
    })
  })

  // ── Exponents and logarithms ──────────────────────────────────────────────

  describe('3. exponents and logarithms', () => {
    it('pow raises x to y', () => {
      const s = mathSession()
      expect(s.evaluate('(m/pow 2 10)')).toEqual(v.number(1024))
      expect(s.evaluate('(m/pow 9 0.5)')).toEqual(v.number(3))
      expect(s.evaluate('(m/pow 2 0)')).toEqual(v.number(1))
    })

    it('exp returns e^x', () => {
      const s = mathSession()
      const result = s.evaluate('(m/exp 1)')
      if (result.kind !== 'number') throw new Error('expected number')
      expect(result.value).toBeCloseTo(Math.E, 10)
      expect(s.evaluate('(m/exp 0)')).toEqual(v.number(1))
    })

    it('log returns natural log', () => {
      const s = mathSession()
      const r = s.evaluate('(m/log m/E)')
      if (r.kind !== 'number') throw new Error('expected number')
      expect(r.value).toBeCloseTo(1, 10)
      expect(s.evaluate('(m/log 1)')).toEqual(v.number(0))
    })

    it('log10 returns base-10 log', () => {
      const s = mathSession()
      expect(s.evaluate('(m/log10 100)')).toEqual(v.number(2))
      expect(s.evaluate('(m/log10 1000)')).toEqual(v.number(3))
      expect(s.evaluate('(m/log10 1)')).toEqual(v.number(0))
    })

    it('sqrt returns positive square root', () => {
      const s = mathSession()
      expect(s.evaluate('(m/sqrt 9)')).toEqual(v.number(3))
      expect(s.evaluate('(m/sqrt 2)')).toEqual(v.number(Math.sqrt(2)))
    })

    it('sqrt of negative returns NaN', () => {
      const s = mathSession()
      const r = s.evaluate('(m/sqrt -1)')
      if (r.kind !== 'number') throw new Error('expected number')
      expect(Number.isNaN(r.value)).toBe(true)
    })

    it('cbrt returns cube root', () => {
      const s = mathSession()
      expect(s.evaluate('(m/cbrt 27)')).toEqual(v.number(3))
      const r = s.evaluate('(m/cbrt -8)')
      if (r.kind !== 'number') throw new Error('expected number')
      expect(r.value).toBeCloseTo(-2, 10)
    })

    it('hypot returns length of hypotenuse', () => {
      const s = mathSession()
      expect(s.evaluate('(m/hypot 3 4)')).toEqual(v.number(5))
      expect(s.evaluate('(m/hypot 5 12)')).toEqual(v.number(13))
    })
  })

  // ── Trigonometry ──────────────────────────────────────────────────────────

  describe('4. trigonometry', () => {
    it('sin of known angles', () => {
      const s = mathSession()
      const r0 = s.evaluate('(m/sin 0)')
      expect((r0 as { kind: 'number'; value: number }).value).toBeCloseTo(0, 10)
      const rPi2 = s.evaluate('(m/sin (/ m/PI 2))')
      expect((rPi2 as { kind: 'number'; value: number }).value).toBeCloseTo(1, 10)
    })

    it('cos of known angles', () => {
      const s = mathSession()
      const r0 = s.evaluate('(m/cos 0)')
      expect((r0 as { kind: 'number'; value: number }).value).toBeCloseTo(1, 10)
      const rPi = s.evaluate('(m/cos m/PI)')
      expect((rPi as { kind: 'number'; value: number }).value).toBeCloseTo(-1, 10)
    })

    it('tan of known angles', () => {
      const s = mathSession()
      const r = s.evaluate('(m/tan (/ m/PI 4))')
      expect((r as { kind: 'number'; value: number }).value).toBeCloseTo(1, 10)
    })

    it('asin / acos / atan round-trip', () => {
      const s = mathSession()
      const r1 = s.evaluate('(m/asin 1)')
      expect((r1 as { kind: 'number'; value: number }).value).toBeCloseTo(Math.PI / 2, 10)
      const r2 = s.evaluate('(m/acos 1)')
      expect((r2 as { kind: 'number'; value: number }).value).toBeCloseTo(0, 10)
      const r3 = s.evaluate('(m/atan 1)')
      expect((r3 as { kind: 'number'; value: number }).value).toBeCloseTo(Math.PI / 4, 10)
    })

    it('atan2 returns angle from origin to (x, y)', () => {
      const s = mathSession()
      // atan2(1, 1) should be π/4
      const r = s.evaluate('(m/atan2 1 1)')
      expect((r as { kind: 'number'; value: number }).value).toBeCloseTo(Math.PI / 4, 10)
      // atan2(0, -1) should be π
      const r2 = s.evaluate('(m/atan2 0 -1)')
      expect((r2 as { kind: 'number'; value: number }).value).toBeCloseTo(Math.PI, 10)
    })
  })

  // ── Hyperbolic ────────────────────────────────────────────────────────────

  describe('5. hyperbolic', () => {
    it('sinh / cosh / tanh at zero', () => {
      const s = mathSession()
      expect(s.evaluate('(m/sinh 0)')).toEqual(v.number(0))
      expect(s.evaluate('(m/cosh 0)')).toEqual(v.number(1))
      expect(s.evaluate('(m/tanh 0)')).toEqual(v.number(0))
    })

    it('cosh is always >= 1', () => {
      const s = mathSession()
      const vals = ['(m/cosh 1)', '(m/cosh -1)', '(m/cosh 5)']
      for (const expr of vals) {
        const r = s.evaluate(expr)
        expect((r as { kind: 'number'; value: number }).value).toBeGreaterThanOrEqual(1)
      }
    })
  })

  // ── Miscellaneous ─────────────────────────────────────────────────────────

  describe('6. miscellaneous', () => {
    it('abs delegates to clojure.core/abs', () => {
      const s = mathSession()
      expect(s.evaluate('(m/abs -5)')).toEqual(v.number(5))
      expect(s.evaluate('(m/abs 5)')).toEqual(v.number(5))
      expect(s.evaluate('(m/abs 0)')).toEqual(v.number(0))
    })

    it('signum returns sign', () => {
      const s = mathSession()
      expect(s.evaluate('(m/signum 42)')).toEqual(v.number(1.0))
      expect(s.evaluate('(m/signum -42)')).toEqual(v.number(-1.0))
      expect(s.evaluate('(m/signum 0)')).toEqual(v.number(0))
    })

    it('floor-div rounds toward negative infinity', () => {
      const s = mathSession()
      expect(s.evaluate('(m/floor-div 7 2)')).toEqual(v.number(3))
      expect(s.evaluate('(m/floor-div -7 2)')).toEqual(v.number(-4)) // differs from quot
      expect(s.evaluate('(m/floor-div 7 -2)')).toEqual(v.number(-4))
    })

    it('floor-mod result has the sign of the divisor', () => {
      const s = mathSession()
      expect(s.evaluate('(m/floor-mod 7 2)')).toEqual(v.number(1))
      expect(s.evaluate('(m/floor-mod -7 2)')).toEqual(v.number(1)) // positive, like y
      expect(s.evaluate('(m/floor-mod 7 -2)')).toEqual(v.number(-1)) // negative, like y
    })

    it('to-radians and to-degrees are inverses', () => {
      const s = mathSession()
      const r = s.evaluate('(m/to-degrees (m/to-radians 90))')
      expect((r as { kind: 'number'; value: number }).value).toBeCloseTo(90, 10)
      const r2 = s.evaluate('(m/to-radians (m/to-degrees m/PI))')
      expect((r2 as { kind: 'number'; value: number }).value).toBeCloseTo(Math.PI, 10)
    })

    it('to-radians of 180 is PI', () => {
      const s = mathSession()
      const r = s.evaluate('(m/to-radians 180)')
      expect((r as { kind: 'number'; value: number }).value).toBeCloseTo(Math.PI, 10)
    })
  })

  // ── Error handling ────────────────────────────────────────────────────────

  describe('7. error handling', () => {
    it('floor throws on non-number', () => {
      const s = mathSession()
      expect(() => s.evaluate('(m/floor "not a number")')).toThrow()
    })

    it('pow throws on non-number argument', () => {
      const s = mathSession()
      expect(() => s.evaluate('(m/pow "x" 2)')).toThrow()
    })

    it('floor-div throws on division by zero', () => {
      const s = mathSession()
      expect(() => s.evaluate('(m/floor-div 7 0)')).toThrow('floor-div: division by zero')
    })

    it('floor-mod throws on division by zero', () => {
      const s = mathSession()
      expect(() => s.evaluate('(m/floor-mod 7 0)')).toThrow('floor-mod: division by zero')
    })
  })

  // ── Practical usage ───────────────────────────────────────────────────────

  describe('8. practical usage', () => {
    it('unit circle: sin² + cos² = 1', () => {
      const s = mathSession()
      s.evaluate("(require '[clojure.math :as m])")
      const r = s.evaluate(
        '(let [angle (/ m/PI 6)] (+ (* (m/sin angle) (m/sin angle)) (* (m/cos angle) (m/cos angle))))'
      )
      expect((r as { kind: 'number'; value: number }).value).toBeCloseTo(1, 10)
    })

    it('Euler identity: e^(i*PI) + 1 ≈ 0 (via cosh + sinh)', () => {
      // e^x = cosh(x) + sinh(x), so this just sanity-checks internal consistency
      const s = mathSession()
      const r = s.evaluate('(- (+ (m/cosh 1) (m/sinh 1)) (m/exp 1))')
      expect((r as { kind: 'number'; value: number }).value).toBeCloseTo(0, 10)
    })

    it('distance function using hypot', () => {
      const s = mathSession()
      s.evaluate('(defn dist [x1 y1 x2 y2] (m/hypot (- x2 x1) (- y2 y1)))')
      expect(s.evaluate('(dist 0 0 3 4)')).toEqual(v.number(5))
      expect(s.evaluate('(dist 1 1 4 5)')).toEqual(v.number(5))
    })

    it('can require as different alias', () => {
      const s = freshSession()
      s.evaluate("(require '[clojure.math :as math])")
      expect(s.evaluate('math/PI')).toEqual(v.number(Math.PI))
      expect(s.evaluate('(math/sqrt 16)')).toEqual(v.number(4))
    })
  })
})
