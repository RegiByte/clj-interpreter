import { describe, expect, it } from 'vitest'
import { readNamespaceVars } from '../static-analysis'

// ---------------------------------------------------------------------------
// Helpers for compact arity assertions
// ---------------------------------------------------------------------------

function arityShape(fixedCount: number, variadic: boolean) {
  return {
    params: expect.arrayContaining(
      Array.from({ length: fixedCount }, () => expect.objectContaining({ kind: 'symbol' }))
    ),
    restParam: variadic ? expect.objectContaining({ kind: 'symbol' }) : null,
    body: [],
  }
}

// ---------------------------------------------------------------------------
// defn
// ---------------------------------------------------------------------------

describe('readNamespaceVars — defn', () => {
  it('single-arity defn produces a fn var', () => {
    const vars = readNamespaceVars('(defn add [a b] (+ a b))')
    expect(vars).toHaveLength(1)
    expect(vars[0]).toMatchObject({ name: 'add', kind: 'fn', isPrivate: false, isMacro: false })
    expect(vars[0].arities).toHaveLength(1)
    expect(vars[0].arities![0].params).toHaveLength(2)
    expect(vars[0].arities![0].restParam).toBeNull()
  })

  it('zero-arity defn', () => {
    const vars = readNamespaceVars('(defn greet [] "hello")')
    expect(vars[0]).toMatchObject({ name: 'greet', kind: 'fn' })
    expect(vars[0].arities![0].params).toHaveLength(0)
    expect(vars[0].arities![0].restParam).toBeNull()
  })

  it('single-arity defn with docstring', () => {
    const vars = readNamespaceVars('(defn foo "does foo" [x] x)')
    expect(vars).toHaveLength(1)
    expect(vars[0]).toMatchObject({ name: 'foo', kind: 'fn' })
    expect(vars[0].arities).toHaveLength(1)
    expect(vars[0].arities![0].params).toHaveLength(1)
  })

  it('multi-arity defn', () => {
    const vars = readNamespaceVars('(defn foo ([a] a) ([a b] (+ a b)))')
    expect(vars).toHaveLength(1)
    expect(vars[0]).toMatchObject({ name: 'foo', kind: 'fn' })
    expect(vars[0].arities).toHaveLength(2)
    expect(vars[0].arities![0].params).toHaveLength(1)
    expect(vars[0].arities![1].params).toHaveLength(2)
  })

  it('multi-arity defn with docstring', () => {
    const vars = readNamespaceVars('(defn foo "docstring" ([a] a) ([a b] b))')
    expect(vars[0].arities).toHaveLength(2)
  })

  it('variadic defn with & rest param', () => {
    const vars = readNamespaceVars('(defn log [level & args] nil)')
    expect(vars[0]).toMatchObject({ name: 'log', kind: 'fn' })
    expect(vars[0].arities![0].params).toHaveLength(1)
    expect(vars[0].arities![0].restParam).not.toBeNull()
    expect((vars[0].arities![0].restParam as { kind: string; name: string }).name).toBe('args')
  })

  it('variadic defn with no fixed params', () => {
    const vars = readNamespaceVars('(defn all [& xs] xs)')
    expect(vars[0].arities![0].params).toHaveLength(0)
    expect(vars[0].arities![0].restParam).not.toBeNull()
  })

  it('defn- marks var as private', () => {
    const vars = readNamespaceVars('(defn- helper [x] x)')
    expect(vars[0]).toMatchObject({ name: 'helper', kind: 'fn', isPrivate: true, isMacro: false })
  })

  it('defn with ^:private metadata marks var as private', () => {
    const vars = readNamespaceVars('(defn ^:private helper [x] x)')
    expect(vars[0]).toMatchObject({ name: 'helper', kind: 'fn', isPrivate: true, isMacro: false })
  })

  it('defmacro marks var as macro', () => {
    const vars = readNamespaceVars('(defmacro when-let [bindings & body] nil)')
    expect(vars[0]).toMatchObject({ name: 'when-let', kind: 'fn', isPrivate: false, isMacro: true })
    expect(vars[0].arities).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// def
// ---------------------------------------------------------------------------

describe('readNamespaceVars — def', () => {
  it('def with number literal → const with tsType number', () => {
    const vars = readNamespaceVars('(def max-retries 3)')
    expect(vars[0]).toMatchObject({ name: 'max-retries', kind: 'const', tsType: 'number', isPrivate: false, isMacro: false })
  })

  it('def with negative number literal', () => {
    const vars = readNamespaceVars('(def offset -1)')
    expect(vars[0]).toMatchObject({ name: 'offset', kind: 'const', tsType: 'number' })
  })

  it('def with string literal → const with tsType string', () => {
    const vars = readNamespaceVars('(def greeting "hello")')
    expect(vars[0]).toMatchObject({ name: 'greeting', kind: 'const', tsType: 'string' })
  })

  it('def with boolean true → const with tsType boolean', () => {
    const vars = readNamespaceVars('(def debug? true)')
    expect(vars[0]).toMatchObject({ name: 'debug?', kind: 'const', tsType: 'boolean' })
  })

  it('def with boolean false → const with tsType boolean', () => {
    const vars = readNamespaceVars('(def disabled? false)')
    expect(vars[0]).toMatchObject({ name: 'disabled?', kind: 'const', tsType: 'boolean' })
  })

  it('def with nil → const with tsType null', () => {
    const vars = readNamespaceVars('(def nothing nil)')
    expect(vars[0]).toMatchObject({ name: 'nothing', kind: 'const', tsType: 'null' })
  })

  it('def with keyword → const with tsType string', () => {
    const vars = readNamespaceVars('(def status :active)')
    expect(vars[0]).toMatchObject({ name: 'status', kind: 'const', tsType: 'string' })
  })

  it('def with computed expression → unknown', () => {
    const vars = readNamespaceVars('(def result (+ 1 2))')
    expect(vars[0]).toMatchObject({ name: 'result', kind: 'unknown' })
    expect(vars[0].tsType).toBeUndefined()
  })

  it('def with symbol reference → unknown', () => {
    const vars = readNamespaceVars('(def alias other-var)')
    expect(vars[0]).toMatchObject({ name: 'alias', kind: 'unknown' })
  })

  it('def with no value (declaration only) → unknown', () => {
    const vars = readNamespaceVars('(def unbound)')
    expect(vars[0]).toMatchObject({ name: 'unbound', kind: 'unknown' })
  })

  it('def with ^:private metadata marks var as private', () => {
    const vars = readNamespaceVars('(def ^:private secret 42)')
    expect(vars[0]).toMatchObject({ name: 'secret', kind: 'const', tsType: 'number', isPrivate: true })
  })

  it('def with inline fn → fn with extracted arity', () => {
    const vars = readNamespaceVars('(def transform (fn [x] (* x 2)))')
    expect(vars[0]).toMatchObject({ name: 'transform', kind: 'fn' })
    expect(vars[0].arities).toHaveLength(1)
    expect(vars[0].arities![0].params).toHaveLength(1)
  })

  it('def with named inline fn', () => {
    const vars = readNamespaceVars('(def transform (fn my-fn [x] x))')
    expect(vars[0]).toMatchObject({ name: 'transform', kind: 'fn' })
    expect(vars[0].arities![0].params).toHaveLength(1)
  })

  it('def with multi-arity inline fn', () => {
    const vars = readNamespaceVars('(def f (fn ([x] x) ([x y] y)))')
    expect(vars[0]).toMatchObject({ name: 'f', kind: 'fn' })
    expect(vars[0].arities).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// defonce
// ---------------------------------------------------------------------------

describe('readNamespaceVars — defonce', () => {
  it('defonce with literal → same as def const', () => {
    const vars = readNamespaceVars('(defonce counter 0)')
    expect(vars[0]).toMatchObject({ name: 'counter', kind: 'const', tsType: 'number' })
  })

  it('defonce with expression → unknown', () => {
    const vars = readNamespaceVars('(defonce state (atom {}))')
    expect(vars[0]).toMatchObject({ name: 'state', kind: 'unknown' })
  })
})

// ---------------------------------------------------------------------------
// declare
// ---------------------------------------------------------------------------

describe('readNamespaceVars — declare', () => {
  it('declare produces unknown var', () => {
    const vars = readNamespaceVars('(declare forward-ref)')
    expect(vars[0]).toMatchObject({ name: 'forward-ref', kind: 'unknown', isPrivate: false, isMacro: false })
    expect(vars[0].arities).toBeUndefined()
    expect(vars[0].tsType).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Skipped forms
// ---------------------------------------------------------------------------

describe('readNamespaceVars — skipped forms', () => {
  it('ns form is skipped', () => {
    const vars = readNamespaceVars('(ns my.app (:require [clojure.string :as str]))')
    expect(vars).toHaveLength(0)
  })

  it('non-def top-level call is skipped', () => {
    const vars = readNamespaceVars('(println "hello")')
    expect(vars).toHaveLength(0)
  })

  it('plain symbol is skipped', () => {
    const vars = readNamespaceVars('foo')
    expect(vars).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Multiple top-level forms
// ---------------------------------------------------------------------------

describe('readNamespaceVars — multiple forms', () => {
  it('extracts vars from a full realistic namespace', () => {
    const source = `
(ns my.app
  (:require [clojure.string :as str]))

(def version "1.0.0")

(defn- internal-helper [x] x)

(defn greet
  "Returns a greeting string."
  [name]
  (str "Hello, " name "!"))

(defn add
  ([a] (add a 0))
  ([a b] (+ a b)))

(defmacro when-debug [& body] nil)

(declare lazy-var)
`
    const vars = readNamespaceVars(source)
    expect(vars.map(v => v.name)).toEqual([
      'version', 'internal-helper', 'greet', 'add', 'when-debug', 'lazy-var'
    ])

    const version = vars.find(v => v.name === 'version')!
    expect(version).toMatchObject({ kind: 'const', tsType: 'string', isPrivate: false })

    const helper = vars.find(v => v.name === 'internal-helper')!
    expect(helper).toMatchObject({ kind: 'fn', isPrivate: true, isMacro: false })

    const greet = vars.find(v => v.name === 'greet')!
    expect(greet).toMatchObject({ kind: 'fn', isPrivate: false })
    expect(greet.arities).toHaveLength(1)
    expect(greet.arities![0].params).toHaveLength(1)

    const add = vars.find(v => v.name === 'add')!
    expect(add).toMatchObject({ kind: 'fn' })
    expect(add.arities).toHaveLength(2)

    const macro = vars.find(v => v.name === 'when-debug')!
    expect(macro).toMatchObject({ kind: 'fn', isMacro: true })

    const lazy = vars.find(v => v.name === 'lazy-var')!
    expect(lazy).toMatchObject({ kind: 'unknown' })
  })

  it('preserves declaration order', () => {
    const source = `(def z 1) (def a 2) (def m 3)`
    const vars = readNamespaceVars(source)
    expect(vars.map(v => v.name)).toEqual(['z', 'a', 'm'])
  })

  it('private and public vars are both returned (caller decides to filter)', () => {
    const source = `(defn pub [x] x) (defn- priv [x] x)`
    const vars = readNamespaceVars(source)
    expect(vars).toHaveLength(2)
    expect(vars.find(v => v.name === 'pub')!.isPrivate).toBe(false)
    expect(vars.find(v => v.name === 'priv')!.isPrivate).toBe(true)
  })
})
