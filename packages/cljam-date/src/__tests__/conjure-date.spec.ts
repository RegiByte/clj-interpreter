import { describe, expect, it } from 'vitest'
import { createSession, sandboxPreset, EvaluationError } from '@regibyte/cljam'
import { library as dateLib } from '../../conjure'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a session with cljam-date installed and allowed. */
function makeDateSession() {
  return createSession({
    libraries: [dateLib],
    allowedPackages: ['cljam-date', 'cljam.date'],
  })
}

// A fixed ISO date we use for predictable accessor tests.
const FIXED_ISO = '2026-04-05T12:30:45.000Z'
// 2026-04-05 UTC — year=2026, month=4 (April), day=5

// ---------------------------------------------------------------------------
// 1. Session setup — library loads without error
// ---------------------------------------------------------------------------

describe('cljam-date — session setup', () => {
  it('installs without error', () => {
    expect(() => createSession({ libraries: [dateLib] })).not.toThrow()
  })

  it('appears in session.capabilities.libraries', () => {
    const session = createSession({ libraries: [dateLib] })
    expect(session.capabilities.libraries).toContain('cljam-date')
  })

  it('cljam.date namespace is lazily loaded on :require', () => {
    const session = makeDateSession()
    // Before require: evaluating something unrelated works fine
    expect(session.evaluate('(+ 1 2)')).toEqual({ kind: 'number', value: 3 })
    // Require triggers load
    expect(() =>
      session.evaluate('(ns t (:require [cljam.date :as d]))')
    ).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// 2. Date construction
// ---------------------------------------------------------------------------

describe('cljam-date — construction', () => {
  it('now returns an opaque js-value wrapping a Date', () => {
    const session = makeDateSession()
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (d/now)
    `)
    expect(result.kind).toBe('js-value')
    expect((result as any).value).toBeInstanceOf(Date)
  })

  it('from-millis constructs a date from epoch ms', () => {
    const session = makeDateSession()
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (d/from-millis 0)
    `)
    expect(result.kind).toBe('js-value')
    expect((result as any).value.getTime()).toBe(0)
  })

  it('from-iso constructs a date from an ISO string', () => {
    const session = makeDateSession()
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (d/from-iso "${FIXED_ISO}")
    `)
    expect(result.kind).toBe('js-value')
    expect((result as any).value.toISOString()).toBe(FIXED_ISO)
  })

  it('from-iso throws on invalid string', () => {
    const session = makeDateSession()
    expect(() =>
      session.evaluate(`
        (ns t (:require [cljam.date :as d]))
        (d/from-iso "not-a-date")
      `)
    ).toThrow()
  })
})

// ---------------------------------------------------------------------------
// 3. Serialisation — to-millis / to-iso round-trips
// ---------------------------------------------------------------------------

describe('cljam-date — serialisation', () => {
  it('from-millis → to-millis round-trips', () => {
    const session = makeDateSession()
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (d/to-millis (d/from-millis 1234567890000))
    `)
    expect(result).toEqual({ kind: 'number', value: 1234567890000 })
  })

  it('from-iso → to-iso round-trips', () => {
    const session = makeDateSession()
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (d/to-iso (d/from-iso "${FIXED_ISO}"))
    `)
    expect(result).toEqual({ kind: 'string', value: FIXED_ISO })
  })
})

// ---------------------------------------------------------------------------
// 4. Accessors — known date, verify 1-indexed month
// ---------------------------------------------------------------------------

describe('cljam-date — accessors', () => {
  // All accessor tests use FIXED_ISO = 2026-04-05T12:30:45.000Z
  // But note: local timezone may shift year/month/day. We test to-millis
  // and from-iso round-trip separately; for accessor tests we use the UTC
  // accessors indirectly — what matters is that month is 1-indexed.

  it('year returns a number', () => {
    const session = makeDateSession()
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (d/year (d/from-millis 0))
    `)
    // new Date(0).getFullYear() is 1970 in UTC
    expect(result.kind).toBe('number')
    expect((result as any).value).toBe(1970)
  })

  it('month is 1-indexed (January = 1)', () => {
    const session = makeDateSession()
    // new Date(0) = 1970-01-01 in UTC, but local time may be Dec 31.
    // Use a date far enough from midnight to be safe: 1970-06-15T12:00:00Z
    const juneDate = new Date('1970-06-15T12:00:00Z').getTime()
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (d/month (d/from-millis ${juneDate}))
    `)
    // June = 6 (1-indexed). JS getMonth() would return 5.
    expect(result.kind).toBe('number')
    expect((result as any).value).toBe(6)
  })

  it('day returns day-of-month', () => {
    const session = makeDateSession()
    const date15 = new Date('2000-01-15T12:00:00Z').getTime()
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (d/day (d/from-millis ${date15}))
    `)
    expect(result).toEqual({ kind: 'number', value: 15 })
  })

  it('hour returns hours component', () => {
    const session = makeDateSession()
    // new Date(0).getHours() varies by timezone — but we can test hour* directly
    // by constructing from a known UTC time and checking the result is a number.
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (d/hour (d/from-millis 0))
    `)
    expect(result.kind).toBe('number')
  })

  it('minute and second return their components', () => {
    const session = makeDateSession()
    // 2026-04-05T12:30:45.000Z — but local tz shifts the local h/m/s
    // Use a date where only minutes and seconds matter and hours offset won't affect them.
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (let [date (d/from-iso "${FIXED_ISO}")]
        [(d/minute date) (d/second date)])
    `)
    // minutes and seconds are not affected by timezone — they're always 30 and 45
    expect(result.kind).toBe('vector')
    expect((result as any).value[0]).toEqual({ kind: 'number', value: 30 })
    expect((result as any).value[1]).toEqual({ kind: 'number', value: 45 })
  })
})

// ---------------------------------------------------------------------------
// 5. Arithmetic — add-days / diff-days
// ---------------------------------------------------------------------------

describe('cljam-date — arithmetic', () => {
  it('add-days adds whole days', () => {
    const session = makeDateSession()
    const baseMs = new Date('2026-01-01T12:00:00Z').getTime()
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (d/to-millis (d/add-days (d/from-millis ${baseMs}) 7))
    `)
    const expected = baseMs + 7 * 86400000
    expect(result).toEqual({ kind: 'number', value: expected })
  })

  it('add-days with negative n goes backwards', () => {
    const session = makeDateSession()
    const baseMs = new Date('2026-01-10T12:00:00Z').getTime()
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (d/to-millis (d/add-days (d/from-millis ${baseMs}) -3))
    `)
    const expected = baseMs - 3 * 86400000
    expect(result).toEqual({ kind: 'number', value: expected })
  })

  it('diff-days computes whole-day difference', () => {
    const session = makeDateSession()
    const aMs = new Date('2026-01-01T12:00:00Z').getTime()
    const bMs = new Date('2026-01-11T12:00:00Z').getTime()
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (d/diff-days (d/from-millis ${aMs}) (d/from-millis ${bMs}))
    `)
    expect(result).toEqual({ kind: 'number', value: 10 })
  })

  it('diff-days is negative when b is before a', () => {
    const session = makeDateSession()
    const aMs = new Date('2026-01-11T12:00:00Z').getTime()
    const bMs = new Date('2026-01-01T12:00:00Z').getTime()
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (d/diff-days (d/from-millis ${aMs}) (d/from-millis ${bMs}))
    `)
    expect(result).toEqual({ kind: 'number', value: -10 })
  })

  it('add-days and diff-days compose correctly', () => {
    const session = makeDateSession()
    const baseMs = new Date('2026-06-15T00:00:00Z').getTime()
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (let [base (d/from-millis ${baseMs})
            future (d/add-days base 30)]
        (d/diff-days base future))
    `)
    expect(result).toEqual({ kind: 'number', value: 30 })
  })
})

// ---------------------------------------------------------------------------
// 6. format
// ---------------------------------------------------------------------------

describe('cljam-date — format', () => {
  it('format with no args returns a string', () => {
    const session = makeDateSession()
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (d/format (d/from-millis 0))
    `)
    expect(result.kind).toBe('string')
    expect(typeof (result as any).value).toBe('string')
    expect((result as any).value.length).toBeGreaterThan(0)
  })

  it('format with locale returns a locale-aware string', () => {
    const session = makeDateSession()
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (d/format (d/from-millis 0) "en-US")
    `)
    expect(result.kind).toBe('string')
    expect(typeof (result as any).value).toBe('string')
  })

  it('format with locale and options map returns formatted string', () => {
    const session = makeDateSession()
    const epochMs = new Date('2026-04-05T00:00:00Z').getTime()
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (d/format (d/from-millis ${epochMs}) "en-US" {:year "numeric"})
    `)
    // With {:year "numeric"} we expect just the year
    expect(result.kind).toBe('string')
    expect((result as any).value).toContain('2026')
  })
})

// ---------------------------------------------------------------------------
// 7. Error handling
// ---------------------------------------------------------------------------

describe('cljam-date — error handling', () => {
  it('throws when passing non-date to to-millis', () => {
    const session = makeDateSession()
    expect(() =>
      session.evaluate(`
        (ns t (:require [cljam.date :as d]))
        (d/to-millis "not-a-date")
      `)
    ).toThrow()
  })

  it('throws when passing non-number to from-millis', () => {
    const session = makeDateSession()
    expect(() =>
      session.evaluate(`
        (ns t (:require [cljam.date :as d]))
        (d/from-millis "not-a-number")
      `)
    ).toThrow()
  })
})

// ---------------------------------------------------------------------------
// 8. Security integration — sandboxPreset + allowedPackages
// ---------------------------------------------------------------------------

describe('cljam-date — security integration', () => {
  it('works end-to-end with sandboxPreset when package is allowed', () => {
    const session = createSession({
      ...sandboxPreset(),
      libraries: [dateLib],
      allowedPackages: ['cljam-date', 'cljam.date'],
    })
    const result = session.evaluate(`
      (ns t (:require [cljam.date :as d]))
      (d/diff-days (d/from-millis 0) (d/from-millis 86400000))
    `)
    expect(result).toEqual({ kind: 'number', value: 1 })
  })

  it('blocks cljam.date when not in allowedPackages', () => {
    const session = createSession({
      ...sandboxPreset(),
      libraries: [dateLib],
      // allowedPackages intentionally omits cljam-date
    })
    try {
      session.evaluate('(ns t (:require [cljam.date :as d]))')
      expect.fail('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(EvaluationError)
      expect((e as EvaluationError).code).toBe('namespace/access-denied')
    }
  })
})

// ---------------------------------------------------------------------------
// 9. End-to-end — realistic usage pattern
// ---------------------------------------------------------------------------

describe('cljam-date — end-to-end usage', () => {
  it('compute days until a future date', () => {
    const session = makeDateSession()
    const todayMs = new Date('2026-04-05T12:00:00Z').getTime()
    const result = session.evaluate(`
      (ns my-app.core
        (:require [cljam.date :as d]))

      (def today (d/from-millis ${todayMs}))
      (def deadline (d/add-days today 30))

      {:days-left  (d/diff-days today deadline)
       :year       (d/year today)
       :month      (d/month today)
       :day        (d/day today)}
    `)
    expect(result.kind).toBe('map')
    const entries = (result as any).entries as [any, any][]
    const get = (k: string) =>
      entries.find(([key]) => key.name === `:${k}`)?.[1].value

    expect(get('days-left')).toBe(30)
    expect(get('year')).toBe(2026)
    expect(get('month')).toBe(4)  // April, 1-indexed
    expect(get('day')).toBe(5)
  })
})
