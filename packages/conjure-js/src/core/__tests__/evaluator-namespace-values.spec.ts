import { describe, expect, it } from 'vitest'
import { freshSession } from './evaluator-test-utils'

// ---------------------------------------------------------------------------
// Phase 1: CljNamespace as first-class CljValue
// ---------------------------------------------------------------------------

describe('*ns* as namespace object', () => {
  it('*ns* returns a namespace object', () => {
    const s = freshSession()
    const result = s.evaluate('*ns*')
    expect(result).toMatchObject({ kind: 'namespace', name: 'user' })
  })

  it('(ns-name *ns*) returns a symbol', () => {
    const s = freshSession()
    const result = s.evaluate('(ns-name *ns*)')
    expect(result).toMatchObject({ kind: 'symbol', name: 'user' })
  })

  it('(namespace? *ns*) returns true', () => {
    const s = freshSession()
    const result = s.evaluate('(namespace? *ns*)')
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })

  it("(namespace? 'user) returns false", () => {
    const s = freshSession()
    const result = s.evaluate("(namespace? 'user)")
    expect(result).toMatchObject({ kind: 'boolean', value: false })
  })

  it('(pr-str *ns*) returns "#namespace[user]"', () => {
    const s = freshSession()
    const result = s.evaluate('(pr-str *ns*)')
    expect(result).toMatchObject({ kind: 'string', value: '#namespace[user]' })
  })

  it('(= *ns* *ns*) is true (reference equality)', () => {
    const s = freshSession()
    const result = s.evaluate('(= *ns* *ns*)')
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })
})

describe('find-ns and the-ns return namespace objects', () => {
  it("(find-ns 'clojure.core) returns a namespace object", () => {
    const s = freshSession()
    const result = s.evaluate("(find-ns 'clojure.core)")
    expect(result).toMatchObject({ kind: 'namespace', name: 'clojure.core' })
  })

  it("(ns-name (find-ns 'clojure.core)) returns a symbol", () => {
    const s = freshSession()
    const result = s.evaluate("(ns-name (find-ns 'clojure.core))")
    expect(result).toMatchObject({ kind: 'symbol', name: 'clojure.core' })
  })

  it("(the-ns 'user) returns a namespace object", () => {
    const s = freshSession()
    const result = s.evaluate("(the-ns 'user)")
    expect(result).toMatchObject({ kind: 'namespace', name: 'user' })
  })

  it('(= (find-ns (quote user)) *ns*) is true (same object)', () => {
    const s = freshSession()
    const result = s.evaluate("(= (find-ns 'user) *ns*)")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })
})

describe('all-ns contains namespace objects', () => {
  it('(every? namespace? (all-ns)) is true', () => {
    const s = freshSession()
    const result = s.evaluate('(every? namespace? (all-ns))')
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })
})

// ---------------------------------------------------------------------------
// Phase 2: Accurate ns-interns / ns-refers
// ---------------------------------------------------------------------------

describe('ns-interns vs ns-refers accuracy', () => {
  it('ns-refers contains upper-case after :refer', () => {
    const s = freshSession()
    s.evaluate("(ns my.check (:require [clojure.string :refer [upper-case]]))")
    s.setNs('user')
    const result = s.evaluate("(contains? (ns-refers 'my.check) 'upper-case)")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })

  it('ns-interns does NOT contain upper-case after :refer', () => {
    const s = freshSession()
    s.evaluate("(ns my.check (:require [clojure.string :refer [upper-case]]))")
    s.setNs('user')
    const result = s.evaluate("(contains? (ns-interns 'my.check) 'upper-case)")
    expect(result).toMatchObject({ kind: 'boolean', value: false })
  })

  it('ns-interns contains locally defined vars', () => {
    const s = freshSession()
    s.evaluate('(def local-fn 1)')
    const result = s.evaluate("(contains? (ns-interns 'user) 'local-fn)")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })

  it('ns-refers does NOT contain locally defined vars', () => {
    const s = freshSession()
    s.evaluate('(def local-fn 1)')
    const result = s.evaluate("(contains? (ns-refers 'user) 'local-fn)")
    expect(result).toMatchObject({ kind: 'boolean', value: false })
  })

  it('ns-refers returns a non-empty map after :refer', () => {
    const s = freshSession()
    s.evaluate("(ns my.check2 (:require [clojure.string :refer [upper-case lower-case]]))")
    s.setNs('user')
    const result = s.evaluate("(> (count (ns-refers 'my.check2)) 0)")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })
})
