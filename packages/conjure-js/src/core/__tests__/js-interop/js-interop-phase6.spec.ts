import { describe, expect, it } from 'vitest'
import { createSession } from '../../session'

// ---------------------------------------------------------------------------
// Phase 6 — importModule + string :require in ns form
// ---------------------------------------------------------------------------

// A fake module for use in tests. Real-world usage: importModule: (s) => import(s)
const fakeReact = {
  createElement: (tag: string, _props: unknown, ...children: unknown[]) =>
    ({ tag, children }),
  version: '18.0.0',
  default: 'react-default-export',
}

const fakeUtils = {
  double: (n: number) => n * 2,
  greet: (name: string) => `Hello, ${name}!`,
}

function makeSession(extraBindings = {}) {
  return createSession({
    importModule: (specifier) => {
      if (specifier === 'react') return fakeReact
      if (specifier === './utils.js') return fakeUtils
      if (specifier === 'async-mod') return Promise.resolve({ value: 42 })
      throw new Error(`Unknown module: ${specifier}`)
    },
    hostBindings: extraBindings,
  })
}

describe('Phase 6 — importModule + string :require', () => {
  describe('basic module loading', () => {
    it('binds the module to the alias as a CljJsValue', async () => {
      const session = makeSession()
      const result = await session.evaluateAsync(`
        (ns my-app.core
          (:require ["react" :as React]))
        React
      `)
      expect(result.kind).toBe('js-value')
      expect((result as any).value).toBe(fakeReact)
    })

    it('loads multiple string requires in one ns form', async () => {
      const session = makeSession()
      const [reactResult, utilsResult] = await Promise.all([
        session.evaluateAsync(`
          (ns multi-test
            (:require ["react" :as React]
                      ["./utils.js" :as utils]))
          React
        `),
        session.evaluateAsync(`
          (ns multi-test2
            (:require ["react" :as React]
                      ["./utils.js" :as utils]))
          utils
        `),
      ])
      expect((reactResult as any).value).toBe(fakeReact)
      expect((utilsResult as any).value).toBe(fakeUtils)
    })

    it('resolves async importModule (Promise-returning)', async () => {
      const session = makeSession()
      const result = await session.evaluateAsync(`
        (ns async-test
          (:require ["async-mod" :as asyncMod]))
        asyncMod
      `)
      expect(result.kind).toBe('js-value')
      expect((result as any).value).toEqual({ value: 42 })
    })
  })

  describe('using the loaded module', () => {
    it('can call a function from the module via .', async () => {
      const session = makeSession()
      const result = await session.evaluateAsync(`
        (ns usage-test
          (:require ["react" :as React]))
        (. React createElement "div" nil "hello")
      `)
      expect(result.kind).toBe('js-value')
      expect((result as any).value).toEqual({ tag: 'div', children: ['hello'] })
    })

    it('can access a primitive property via .', async () => {
      const session = makeSession()
      const result = await session.evaluateAsync(`
        (ns usage-test2
          (:require ["react" :as React]))
        (. React version)
      `)
      expect(result.kind).toBe('string')
      expect((result as any).value).toBe('18.0.0')
    })

    it('can access a property via js/get', async () => {
      const session = makeSession()
      const result = await session.evaluateAsync(`
        (ns usage-test3
          (:require ["./utils.js" :as utils]))
        (js/get utils "double")
      `)
      expect(result.kind).toBe('js-value')
      expect(typeof (result as any).value).toBe('function')
    })

    it('can call a loaded module function that was stored in a var', async () => {
      const session = makeSession()
      const result = await session.evaluateAsync(`
        (ns call-test
          (:require ["./utils.js" :as utils]))
        (let [double-fn (. utils double)]
          (double-fn 21))
      `)
      expect(result.kind).toBe('number')
      expect((result as any).value).toBe(42)
    })
  })

  describe('mixed string + symbol requires', () => {
    it('handles string and symbol requires in the same ns form', async () => {
      const session = makeSession()
      // First create a clojure namespace to require
      session.evaluate('(ns my-utils) (defn add [a b] (+ a b))')
      const result = await session.evaluateAsync(`
        (ns mixed-test
          (:require [my-utils :as mu]
                    ["react" :as React]))
        [(mu/add 1 2) (. React version)]
      `)
      expect(result.kind).toBe('vector')
      const vec = (result as any).value
      expect(vec[0]).toEqual({ kind: 'number', value: 3 })
      expect(vec[1]).toEqual({ kind: 'string', value: '18.0.0' })
    })
  })

  describe('error cases', () => {
    it('throws when importModule is not configured and a string require is used', async () => {
      const session = createSession() // no importModule
      await expect(
        session.evaluateAsync(`
          (ns no-importer-test
            (:require ["react" :as React]))
          React
        `)
      ).rejects.toThrow(/importModule is not configured/)
    })

    it('throws when string require is missing :as alias', async () => {
      const session = makeSession()
      await expect(
        session.evaluateAsync(`
          (ns no-alias-test
            (:require ["react"]))
          nil
        `)
      ).rejects.toThrow(/must have an :as alias/)
    })

    it('throws a helpful error when string require used with sync evaluate()', () => {
      const session = makeSession()
      expect(() =>
        session.evaluate(`
          (ns sync-test
            (:require ["react" :as React]))
          React
        `)
      ).toThrow(/use evaluateAsync/)
    })

    it('throws when importModule throws for an unknown specifier', async () => {
      const session = makeSession()
      await expect(
        session.evaluateAsync(`
          (ns unknown-mod-test
            (:require ["unknown-package" :as Unknown]))
          Unknown
        `)
      ).rejects.toThrow(/Unknown module: unknown-package/)
    })
  })

  describe('evaluateAsync regression — non-string requires still work', () => {
    it('loads a clojure namespace via evaluateAsync', async () => {
      const session = makeSession()
      session.evaluate('(ns my-lib) (defn greet [name] (str "Hi, " name "!"))')
      const result = await session.evaluateAsync(`
        (ns regression-test
          (:require [my-lib :as lib]))
        (lib/greet "world")
      `)
      expect(result.kind).toBe('string')
      expect((result as any).value).toBe('Hi, world!')
    })

    it('evaluateAsync with no ns form still returns the result', async () => {
      const session = makeSession()
      const result = await session.evaluateAsync('(+ 1 2)')
      expect(result).toEqual({ kind: 'number', value: 3 })
    })

    it('evaluateAsync still awaits CljPending results', async () => {
      const session = makeSession()
      const result = await session.evaluateAsync('(async (+ 1 2))')
      expect(result).toEqual({ kind: 'number', value: 3 })
    })
  })
})
