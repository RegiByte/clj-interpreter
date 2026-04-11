import { describe, expect, it } from 'vitest'
import { EvaluationError } from '../errors'
import { createSession } from '../session'
import { sandboxPreset } from '../../presets'
import type { CljamLibrary } from '../library'
import type { RuntimeModule } from '../module'

// ---------------------------------------------------------------------------
// Helpers — minimal CljamLibrary fixtures
// ---------------------------------------------------------------------------

const mathLib: CljamLibrary = {
  id: 'conjure-math',
  sources: {
    'conjure.math': `
      (ns conjure.math)
      (defn square [x] (* x x))
      (defn cube [x] (* x x x))
    `,
  },
}

const stringExtLib: CljamLibrary = {
  id: 'conjure-str',
  sources: {
    'conjure.str': `
      (ns conjure.str)
      (defn shout [s] (str s "!!!"))
    `,
    'conjure.str.utils': `
      (ns conjure.str.utils)
      (defn blank? [s] (= s ""))
    `,
  },
}

// ---------------------------------------------------------------------------
// 1. Source registration — namespaces loadable via :require
// ---------------------------------------------------------------------------

describe('CljamLibrary — source registration', () => {
  it('makes library namespace resolvable via :require', () => {
    const session = createSession({ libraries: [mathLib] })
    const result = session.evaluate(`
      (ns test.core
        (:require [conjure.math :as m]))
      (m/square 5)
    `)
    expect(result).toEqual({ kind: 'number', value: 25 })
  })

  it('makes multiple namespaces from one library resolvable', () => {
    const session = createSession({ libraries: [stringExtLib] })
    const r1 = session.evaluate(`
      (ns t1 (:require [conjure.str :as s]))
      (s/shout "hello")
    `)
    expect(r1).toEqual({ kind: 'string', value: 'hello!!!' })

    const r2 = session.evaluate(`
      (ns t2 (:require [conjure.str.utils :as u]))
      (u/blank? "")
    `)
    expect(r2).toEqual({ kind: 'boolean', value: true })
  })

  it('loads library namespaces lazily — not on session creation', () => {
    // If sources were evaluated eagerly, errors in them would surface at
    // createSession time. Instead, they only error when required.
    const badLib: CljamLibrary = {
      id: 'bad-lib',
      sources: { 'bad.ns': '(ns bad.ns) (/ 1 0)' }, // division by zero
    }
    // createSession does NOT throw — source is registered but not loaded
    const session = createSession({ libraries: [badLib] })
    // :require is what triggers loading — THAT should throw
    expect(() =>
      session.evaluate('(ns t (:require [bad.ns]))')
    ).toThrow()
  })

  it('throws at createSession when two libraries claim the same namespace', () => {
    const libA: CljamLibrary = {
      id: 'lib-a',
      sources: { 'shared.utils': '(ns shared.utils)' },
    }
    const libB: CljamLibrary = {
      id: 'lib-b',
      sources: { 'shared.utils': '(ns shared.utils)' },
    }
    expect(() => createSession({ libraries: [libA, libB] })).toThrow(
      "Library 'lib-b' tried to register namespace 'shared.utils', already registered by 'lib-a'."
    )
  })
})

// ---------------------------------------------------------------------------
// 2. allowedPackages enforcement
// ---------------------------------------------------------------------------

describe('allowedPackages — enforcement', () => {
  it('allows all packages when set to "all" (default)', () => {
    const session = createSession({
      libraries: [mathLib],
      allowedPackages: 'all',
    })
    const result = session.evaluate(`
      (ns t (:require [conjure.math :as m]))
      (m/cube 3)
    `)
    expect(result).toEqual({ kind: 'number', value: 27 })
  })

  it('blocks unlisted packages and throws with access-denied code', () => {
    const session = createSession({
      libraries: [mathLib, stringExtLib],
      allowedPackages: ['conjure-math'],
    })
    try {
      session.evaluate('(ns t (:require [conjure.str :as s]))')
      expect.fail('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(EvaluationError)
      expect((e as EvaluationError).code).toBe('namespace/access-denied')
      expect((e as EvaluationError).message).toContain('conjure.str')
      expect((e as EvaluationError).message).toContain('Access denied')
    }
  })

  it('prefix-matches: conjure.str covers conjure.str.utils', () => {
    const session = createSession({
      libraries: [stringExtLib],
      allowedPackages: ['conjure.str'],
    })
    // Both conjure.str and conjure.str.utils should be allowed
    expect(() =>
      session.evaluate('(ns t (:require [conjure.str :as s] [conjure.str.utils :as u]))')
    ).not.toThrow()
  })

  it('always allows clojure.* regardless of allowedPackages', () => {
    const session = createSession({ allowedPackages: [] })
    // clojure.string must still be requireable
    expect(() =>
      session.evaluate('(ns t (:require [clojure.string :as str]))')
    ).not.toThrow()
  })

  it('always allows "user" namespace regardless of allowedPackages', () => {
    const session = createSession({ allowedPackages: [] })
    expect(() => session.evaluate('(in-ns (quote user))')).not.toThrow()
  })

  it('error code distinguishes access-denied from not-found', () => {
    // not-found: allowedPackages: 'all' so the check passes, but namespace simply doesn't exist
    const openSession = createSession({ allowedPackages: 'all' })
    try {
      openSession.evaluate('(ns t (:require [nonexistent.ns]))')
      expect.fail('should have thrown')
    } catch (e) {
      expect((e as EvaluationError).code).toBe('namespace/not-found')
    }

    // access-denied: namespace exists as a library source but is blocked by allowedPackages
    const sandboxedSession = createSession({
      libraries: [stringExtLib],
      allowedPackages: ['conjure.math'], // conjure.str not listed
    })
    try {
      sandboxedSession.evaluate('(ns t (:require [conjure.str]))')
      expect.fail('should have thrown')
    } catch (e) {
      expect((e as EvaluationError).code).toBe('namespace/access-denied')
    }
  })

  it('sandboxPreset blocks all packages by default', () => {
    const session = createSession({
      ...sandboxPreset(),
      libraries: [mathLib],
    })
    // conjure-math is not in allowedPackages: [] — should be denied
    try {
      session.evaluate('(ns t (:require [conjure.math :as m]))')
      expect.fail('should have thrown')
    } catch (e) {
      expect((e as EvaluationError).code).toBe('namespace/access-denied')
    }
  })

  it('sandboxPreset with explicit allowedPackages works end-to-end', () => {
    const session = createSession({
      ...sandboxPreset(),
      libraries: [mathLib],
      allowedPackages: ['conjure.math'],
    })
    const result = session.evaluate(`
      (ns t (:require [conjure.math :as m]))
      (m/square 7)
    `)
    expect(result).toEqual({ kind: 'number', value: 49 })
  })
})

// ---------------------------------------------------------------------------
// 3. session.capabilities
// ---------------------------------------------------------------------------

describe('session.capabilities', () => {
  it('reflects allowedPackages: all by default', () => {
    const session = createSession()
    expect(session.capabilities.allowedPackages).toBe('all')
  })

  it('reflects explicit allowedPackages array', () => {
    const session = createSession({ allowedPackages: ['cljam-date'] })
    expect(session.capabilities.allowedPackages).toEqual(['cljam-date'])
  })

  it('reflects hostBindings keys', () => {
    const session = createSession({ hostBindings: { myLib: {}, anotherLib: {} } })
    expect(session.capabilities.hostBindings).toContain('myLib')
    expect(session.capabilities.hostBindings).toContain('anotherLib')
  })

  it('reflects allowDynamicImport correctly', () => {
    const noImport = createSession()
    expect(noImport.capabilities.allowDynamicImport).toBe(false)

    const withImport = createSession({ importModule: async () => ({}) })
    expect(withImport.capabilities.allowDynamicImport).toBe(true)
  })

  it('reflects library ids', () => {
    const session = createSession({ libraries: [mathLib, stringExtLib] })
    expect(session.capabilities.libraries).toEqual(['conjure-math', 'conjure-str'])
  })

  it('sandboxPreset produces capabilities with empty allowedPackages', () => {
    const session = createSession(sandboxPreset())
    expect(session.capabilities.allowedPackages).toEqual([])
    expect(session.capabilities.allowDynamicImport).toBe(false)
    expect(session.capabilities.libraries).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 4. Library with native module
// ---------------------------------------------------------------------------

describe('CljamLibrary — native module integration', () => {
  it('installs native module functions and makes them callable from Clojure', () => {
    const nativeModule: RuntimeModule = {
      id: 'conjure-greet',
      declareNs: [
        {
          name: 'conjure.greet.native',
          vars: () =>
            new Map([
              [
                'greet*',
                {
                  value: {
                    kind: 'native-function' as const,
                    name: 'greet*',
                    fn: (nameVal: import('../types').CljValue) => ({
                      kind: 'string' as const,
                      value: `Hello, ${(nameVal as any).value}!`,
                    }),
                  },
                },
              ],
            ]),
        },
      ],
    }

    const greetLib: CljamLibrary = {
      id: 'conjure-greet',
      sources: {
        'conjure.greet': `
          (ns conjure.greet
            (:require [conjure.greet.native :as n]))
          (defn greet [name] (n/greet* name))
        `,
      },
      module: nativeModule,
    }

    const session = createSession({ libraries: [greetLib] })
    const result = session.evaluate(`
      (ns t (:require [conjure.greet :as g]))
      (g/greet "RegiByte")
    `)
    expect(result).toEqual({ kind: 'string', value: 'Hello, RegiByte!' })
  })
})
