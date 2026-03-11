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

// ---------------------------------------------------------------------------
// Phase 3: Normalize namespace var storage / unified qualified lookup
// ---------------------------------------------------------------------------

describe('qualified symbol via full namespace name', () => {
  it('(vec (clojure.core/map inc [1 2 3])) works via full name', () => {
    const s = freshSession()
    const result = s.evaluate('(vec (clojure.core/map inc [1 2 3]))')
    expect(result).toMatchObject({ kind: 'vector', value: [
      { kind: 'number', value: 2 },
      { kind: 'number', value: 3 },
      { kind: 'number', value: 4 },
    ]})
  })

  it('(clojure.core/+ 1 2) works via full name', () => {
    const s = freshSession()
    const result = s.evaluate('(clojure.core/+ 1 2)')
    expect(result).toMatchObject({ kind: 'number', value: 3 })
  })
})

describe('qualified macro via full namespace name', () => {
  it('(clojure.core/when true 42) expands and evaluates', () => {
    const s = freshSession()
    const result = s.evaluate('(clojure.core/when true 42)')
    expect(result).toMatchObject({ kind: 'number', value: 42 })
  })

  it('(clojure.core/when false 42) returns nil', () => {
    const s = freshSession()
    const result = s.evaluate('(clojure.core/when false 42)')
    expect(result).toMatchObject({ kind: 'nil' })
  })
})

describe('qualified macro via :as alias', () => {
  it('(cc/when true 99) expands and evaluates via alias', () => {
    const s = freshSession()
    s.evaluate('(ns macro-alias-test (:require [clojure.core :as cc]))')
    const result = s.evaluate('(cc/when true 99)')
    expect(result).toMatchObject({ kind: 'number', value: 99 })
  })

  it('(cc/when-let [x 1] x) expands via alias', () => {
    const s = freshSession()
    s.evaluate('(ns wl-test (:require [clojure.core :as cc]))')
    const result = s.evaluate('(cc/when-let [x 10] x)')
    expect(result).toMatchObject({ kind: 'number', value: 10 })
  })
})

describe('dynamic var deref through qualified alias path', () => {
  it('alias path respects active dynamic binding', () => {
    // binding uses the referred *x* (unqualified); src/*x* accesses the same
    // var via the alias path. The fix: alias path uses derefValue(v) instead
    // of v.value, so it sees the active binding from the stack.
    const s = freshSession()
    s.evaluate('(ns dyn-source)')
    s.evaluate('(def ^:dynamic *x* :root)')
    s.evaluate('(ns dyn-consumer (:require [dyn-source :as src :refer [*x*]]))')
    const result = s.evaluate('(binding [*x* :bound] src/*x*)')
    expect(result).toMatchObject({ kind: 'keyword', name: ':bound' })
  })
})

describe(':refer of nonexistent symbol throws', () => {
  it('throws a clear error for nonexistent referred symbol', () => {
    const s = freshSession()
    expect(() =>
      s.evaluate('(ns bad-refer (:require [clojure.string :refer [does-not-exist]]))')
    ).toThrow('does-not-exist')
  })
})
