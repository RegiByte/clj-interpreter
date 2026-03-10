import { describe, expect, it } from 'vitest'
import { freshSession } from './evaluator-test-utils'

// ---------------------------------------------------------------------------
// Qualified macro calls (e.g. clojure.core/when-let)
//
// Cursive's REPL init probe sends:
//   (clojure.core/when-let [requires-var (clojure.core/resolve ...)] ...)
// The expansion phase must recognise clojure.core/when-let as a macro and
// expand it — not pass the raw macro value to dispatch where it would fail
// the isCallable check.
// ---------------------------------------------------------------------------

describe('qualified macro calls', () => {
  it('clojure.core/when-let expands and evaluates with truthy binding', () => {
    const s = freshSession()
    const result = s.evaluate('(clojure.core/when-let [x 1] x)')
    expect(result).toMatchObject({ kind: 'number', value: 1 })
  })

  it('clojure.core/when-let returns nil when binding is nil', () => {
    const s = freshSession()
    const result = s.evaluate('(clojure.core/when-let [x nil] :should-not-run)')
    expect(result.kind).toBe('nil')
  })

  it('clojure.core/when-let returns nil when binding is false', () => {
    const s = freshSession()
    const result = s.evaluate('(clojure.core/when-let [x false] :should-not-run)')
    expect(result.kind).toBe('nil')
  })

  it('clojure.core/when-let evaluates body forms with binding in scope', () => {
    const s = freshSession()
    const result = s.evaluate('(clojure.core/when-let [n 7] (str "n=" n))')
    expect(result).toMatchObject({ kind: 'string', value: 'n=7' })
  })

  it('clojure.core/when evaluates with truthy condition', () => {
    const s = freshSession()
    const result = s.evaluate('(clojure.core/when true :yes)')
    expect(result).toMatchObject({ kind: 'keyword', name: ':yes' })
  })

  it('clojure.core/when returns nil with falsy condition', () => {
    const s = freshSession()
    const result = s.evaluate('(clojure.core/when false :yes)')
    expect(result.kind).toBe('nil')
  })

  it('clojure.core/and works as qualified macro call', () => {
    const s = freshSession()
    const result = s.evaluate('(clojure.core/and 1 2 3)')
    expect(result).toMatchObject({ kind: 'number', value: 3 })
  })

  it('clojure.core/or works as qualified macro call', () => {
    const s = freshSession()
    const result = s.evaluate('(clojure.core/or nil false 42)')
    expect(result).toMatchObject({ kind: 'number', value: 42 })
  })

  it('Cursive startup scenario: qualified when-let with resolve-like pattern', () => {
    const s = freshSession()
    // Mirrors the shape of Cursive's init probe:
    // (clojure.core/when-let [v (clojure.core/resolve 'clojure.core/+)] v)
    const result = s.evaluate(
      "(clojure.core/when-let [v (resolve 'clojure.core/+)] (fn? v))"
    )
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })
})

// ---------------------------------------------------------------------------
// Namespace introspection
//
// *ns* holds a first-class CljNamespace value (kind: 'namespace').
// ns-name, all-ns, find-ns, the-ns work with namespace objects.
// ---------------------------------------------------------------------------

describe('*ns*', () => {
  it('is a namespace object in the default user namespace', () => {
    const s = freshSession()
    const result = s.evaluate('*ns*')
    expect(result).toMatchObject({ kind: 'namespace', name: 'user' })
  })

  it('updates when ns is switched via setNs', () => {
    const s = freshSession()
    s.setNs('my.app')
    const result = s.evaluate('*ns*')
    expect(result).toMatchObject({ kind: 'namespace', name: 'my.app' })
  })

  it('updates when evaluate processes an ns declaration', () => {
    const s = freshSession()
    s.evaluate('(ns my.other.ns)')
    const result = s.evaluate('*ns*')
    expect(result).toMatchObject({ kind: 'namespace', name: 'my.other.ns' })
  })
})

describe('ns-name', () => {
  it('returns the symbol unchanged when passed a symbol', () => {
    const s = freshSession()
    const result = s.evaluate("(ns-name 'user)")
    expect(result).toMatchObject({ kind: 'symbol', name: 'user' })
  })

  it('returns a symbol when passed a string', () => {
    const s = freshSession()
    const result = s.evaluate('(ns-name "clojure.core")')
    expect(result).toMatchObject({ kind: 'symbol', name: 'clojure.core' })
  })

  it('(ns-name *ns*) returns a symbol for the current namespace', () => {
    const s = freshSession()
    const result = s.evaluate('(ns-name *ns*)')
    expect(result).toMatchObject({ kind: 'symbol', name: 'user' })
  })

  it('result of (ns-name *ns*) is a symbol', () => {
    const s = freshSession()
    const result = s.evaluate('(symbol? (ns-name *ns*))')
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })

  it('returns nil for non-symbol/string input', () => {
    const s = freshSession()
    const result = s.evaluate('(ns-name 42)')
    expect(result.kind).toBe('nil')
  })
})

describe('all-ns', () => {
  it('returns a list', () => {
    const s = freshSession()
    const result = s.evaluate('(list? (all-ns))')
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })

  it('includes clojure.core', () => {
    const s = freshSession()
    const result = s.evaluate("(some #(= (ns-name %) 'clojure.core) (all-ns))")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })

  it('includes user namespace', () => {
    const s = freshSession()
    const result = s.evaluate("(some #(= (ns-name %) 'user) (all-ns))")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })

  it('contains namespace objects', () => {
    const s = freshSession()
    const result = s.evaluate('(every? namespace? (all-ns))')
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })
})

describe('find-ns', () => {
  it('returns a namespace object when namespace exists', () => {
    const s = freshSession()
    const result = s.evaluate("(find-ns 'clojure.core)")
    expect(result).toMatchObject({ kind: 'namespace', name: 'clojure.core' })
  })

  it('returns nil when namespace does not exist', () => {
    const s = freshSession()
    const result = s.evaluate("(find-ns 'does.not.exist)")
    expect(result.kind).toBe('nil')
  })

  it('returns nil for non-symbol input', () => {
    const s = freshSession()
    const result = s.evaluate('(find-ns "clojure.core")')
    expect(result.kind).toBe('nil')
  })

  it('finds a namespace after it is created', () => {
    const s = freshSession()
    s.evaluate('(ns my.new.ns)')
    // Switch back to user so we can call find-ns from there
    s.setNs('user')
    const result = s.evaluate("(find-ns 'my.new.ns)")
    expect(result).toMatchObject({ kind: 'namespace', name: 'my.new.ns' })
  })
})

// ---------------------------------------------------------------------------
// ns-aliases, ns-interns, ns-publics, ns-refers, ns-map
// ---------------------------------------------------------------------------

describe('ns-aliases', () => {
  it('returns a map', () => {
    const s = freshSession()
    const result = s.evaluate("(map? (ns-aliases 'user))")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })

  it('returns empty map for namespace with no aliases', () => {
    const s = freshSession()
    const result = s.evaluate("(count (ns-aliases 'user))")
    expect(result).toMatchObject({ kind: 'number', value: 0 })
  })

  it('returns alias entries after require :as', () => {
    const s = freshSession()
    s.evaluate('(ns my.aliased (:require [clojure.string :as str]))')
    s.setNs('user')
    const result = s.evaluate("(get (ns-aliases 'my.aliased) 'str)")
    expect(result).toMatchObject({ kind: 'namespace', name: 'clojure.string' })
  })

  it('returns empty map for unknown namespace', () => {
    const s = freshSession()
    const result = s.evaluate("(ns-aliases 'no.such.ns)")
    expect(result).toMatchObject({ kind: 'map' })
  })
})

describe('ns-interns', () => {
  it('returns a map', () => {
    const s = freshSession()
    const result = s.evaluate("(map? (ns-interns 'user))")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })

  it('includes vars defined in the namespace', () => {
    const s = freshSession()
    s.evaluate('(def my-val 42)')
    const result = s.evaluate("(var? (get (ns-interns 'user) 'my-val))")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })

  it('clojure.core has many interns', () => {
    const s = freshSession()
    const result = s.evaluate("(> (count (ns-interns 'clojure.core)) 10)")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })

  it('returns empty map for unknown namespace', () => {
    const s = freshSession()
    const result = s.evaluate("(ns-interns 'no.such.ns)")
    expect(result).toMatchObject({ kind: 'map' })
  })
})

describe('ns-publics', () => {
  it('returns a map', () => {
    const s = freshSession()
    const result = s.evaluate("(map? (ns-publics 'clojure.core))")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })

  it('includes public vars', () => {
    const s = freshSession()
    s.evaluate('(def public-thing :hello)')
    const result = s.evaluate("(var? (get (ns-publics 'user) 'public-thing))")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })
})

describe('ns-refers', () => {
  it('returns a map', () => {
    const s = freshSession()
    const result = s.evaluate("(map? (ns-refers 'user))")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })
})

describe('ns-map', () => {
  it('returns a map', () => {
    const s = freshSession()
    const result = s.evaluate("(map? (ns-map 'user))")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })

  it('includes vars from the namespace', () => {
    const s = freshSession()
    s.evaluate('(def mapped-thing 99)')
    const result = s.evaluate("(var? (get (ns-map 'user) 'mapped-thing))")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })
})

// ---------------------------------------------------------------------------
// Java-interop stubs: instance?, class, class?, ns-imports, the-ns,
// special-symbol?, loaded-libs
// ---------------------------------------------------------------------------

describe('instance?', () => {
  it('always returns false (no Java class hierarchy)', () => {
    const s = freshSession()
    const result = s.evaluate("(instance? nil 42)")
    expect(result).toMatchObject({ kind: 'boolean', value: false })
  })

  it('returns false for any two args', () => {
    const s = freshSession()
    const result = s.evaluate('(instance? :some-class "hello")')
    expect(result).toMatchObject({ kind: 'boolean', value: false })
  })
})

describe('class', () => {
  it('returns a string describing the kind', () => {
    const s = freshSession()
    const result = s.evaluate('(class 42)')
    expect(result).toMatchObject({ kind: 'string', value: 'conjure.number' })
  })

  it('returns conjure.string for strings', () => {
    const s = freshSession()
    const result = s.evaluate('(class "hello")')
    expect(result).toMatchObject({ kind: 'string', value: 'conjure.string' })
  })

  it('returns nil for no arg', () => {
    const s = freshSession()
    const result = s.evaluate('(class nil)')
    expect(result).toMatchObject({ kind: 'string', value: 'conjure.nil' })
  })
})

describe('class?', () => {
  it('always returns false', () => {
    const s = freshSession()
    const result = s.evaluate('(class? 42)')
    expect(result).toMatchObject({ kind: 'boolean', value: false })
  })
})

describe('ns-imports', () => {
  it('returns an empty map', () => {
    const s = freshSession()
    const result = s.evaluate("(map? (ns-imports 'user))")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })

  it('is always empty (no Java imports)', () => {
    const s = freshSession()
    const result = s.evaluate("(count (ns-imports 'clojure.core))")
    expect(result).toMatchObject({ kind: 'number', value: 0 })
  })
})

describe('the-ns', () => {
  it('returns a namespace object for a known namespace', () => {
    const s = freshSession()
    const result = s.evaluate("(the-ns 'clojure.core)")
    expect(result).toMatchObject({ kind: 'namespace', name: 'clojure.core' })
  })

  it('returns nil for unknown namespace', () => {
    const s = freshSession()
    const result = s.evaluate("(the-ns 'no.such.ns)")
    expect(result.kind).toBe('nil')
  })
})

describe('special-symbol?', () => {
  it('returns true for def', () => {
    const s = freshSession()
    const result = s.evaluate("(special-symbol? 'def)")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })

  it('returns true for if', () => {
    const s = freshSession()
    const result = s.evaluate("(special-symbol? 'if)")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })

  it('returns false for non-special symbols', () => {
    const s = freshSession()
    const result = s.evaluate("(special-symbol? 'map)")
    expect(result).toMatchObject({ kind: 'boolean', value: false })
  })

  it('returns false for non-symbols', () => {
    const s = freshSession()
    const result = s.evaluate('(special-symbol? 42)')
    expect(result).toMatchObject({ kind: 'boolean', value: false })
  })
})

describe('loaded-libs', () => {
  it('returns a set', () => {
    const s = freshSession()
    const result = s.evaluate('(set? (loaded-libs))')
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })

  it('contains clojure.core', () => {
    const s = freshSession()
    const result = s.evaluate("(contains? (loaded-libs) 'clojure.core)")
    expect(result).toMatchObject({ kind: 'boolean', value: true })
  })
})
