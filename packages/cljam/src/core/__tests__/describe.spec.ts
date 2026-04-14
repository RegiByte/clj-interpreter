/**
 * describe — introspection for any cljam value
 *
 * Tests are organized by value kind.  The through-line: describe always
 * returns a plain Clojure map, keyed with keywords, composable with get/get-in.
 *
 * Coverage:
 *   - protocols (name, ns, doc, methods, extenders)
 *   - records (type, fields, protocols list)
 *   - user functions (name, arglists, doc — named, anonymous, multi-arity)
 *   - native functions (name, arglists, doc)
 *   - protocol dispatch functions (kind :protocol-fn, protocol, arglists)
 *   - multimethods (name, dispatch-vals, default?)
 *   - namespaces (var-count, vars summary, *describe-limit* pagination)
 *   - vars (ns, name, dynamic, nested value describe)
 *   - primitives (string, number, boolean, nil, keyword, symbol,
 *                 list, vector, map, set, atom, regex, lazy-seq)
 *   - composability (get-in, (type x) consistency)
 */

import { describe, expect, it } from 'vitest'
import { v } from '../factories'
import { freshSession as session } from '../evaluator/__tests__/evaluator-test-utils'
import type { CljValue } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function s() {
  return session()
}

/** Convert a CljMap value to a plain JS object keyed by keyword/string name. */
function mapToObj(value: CljValue): Record<string, CljValue> {
  if (value.kind !== 'map') throw new Error(`Expected map, got ${value.kind}`)
  const obj: Record<string, CljValue> = {}
  for (const [k, v] of value.entries) {
    if (k.kind === 'keyword') obj[k.name] = v
    else if (k.kind === 'string') obj[k.value] = v
  }
  return obj
}

// ---------------------------------------------------------------------------
// Protocols
// ---------------------------------------------------------------------------

describe('describe — protocol', () => {
  it('returns basic protocol metadata', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IShape
        "Abstraction over shapes."
        (area [this] "Compute the area.")
        (perimeter [this] "Compute the perimeter."))
    `)
    const result = sess.evaluate('(describe IShape)')
    expect(result.kind).toBe('map')
    const m = mapToObj(result)
    expect(m[':kind']).toEqual(v.keyword(':protocol'))
    expect(m[':name']).toEqual(v.string('IShape'))
    expect(m[':ns']).toEqual(v.string('user'))
    expect(m[':doc']).toEqual(v.string('Abstraction over shapes.'))
  })

  it('includes nil doc when no docstring provided', () => {
    const sess = s()
    sess.evaluate('(defprotocol IFoo (foo [x]))')
    const m = mapToObj(sess.evaluate('(describe IFoo)'))
    expect(m[':doc']).toEqual(v.nil())
  })

  it('methods have name, arglists, and doc', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IShape
        (area [this] "Compute the area."))
    `)
    const methods = sess.evaluate('(:methods (describe IShape))')
    expect(methods.kind).toBe('vector')
    if (methods.kind !== 'vector') return
    expect(methods.value).toHaveLength(1)
    const method = mapToObj(methods.value[0])
    expect(method[':name']).toEqual(v.string('area'))
    expect(method[':arglists'].kind).toBe('vector')
    expect(method[':doc']).toEqual(v.string('Compute the area.'))
  })

  it('multi-method protocol has multiple methods listed', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IShape
        (area [this])
        (perimeter [this]))
    `)
    const methods = sess.evaluate('(:methods (describe IShape))')
    expect(methods.kind).toBe('vector')
    if (methods.kind !== 'vector') return
    expect(methods.value).toHaveLength(2)
  })

  it('extenders are keyword type tags', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IFoo (foo [x]))
      (extend-protocol IFoo
        :string (foo [s] s)
        :number (foo [n] n))
    `)
    const m = mapToObj(sess.evaluate('(describe IFoo)'))
    expect(m[':extenders'].kind).toBe('vector')
    if (m[':extenders'].kind !== 'vector') return
    expect(m[':extenders'].value).toContainEqual(v.keyword(':string'))
    expect(m[':extenders'].value).toContainEqual(v.keyword(':number'))
  })

  it('extenders includes namespaced record keywords', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IFoo (foo [x]))
      (defrecord MyRec [v] IFoo (foo [this] v))
    `)
    const m = mapToObj(sess.evaluate('(describe IFoo)'))
    if (m[':extenders'].kind !== 'vector') return
    expect(m[':extenders'].value).toContainEqual(v.keyword(':user/MyRec'))
  })
})

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

describe('describe — record', () => {
  it('returns record metadata with type keyword', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IShape (area [x]))
      (defrecord Circle [radius]
        IShape (area [this] (* 3.14 radius radius)))
    `)
    const m = mapToObj(sess.evaluate('(describe (->Circle 5))'))
    expect(m[':kind']).toEqual(v.keyword(':record'))
    expect(m[':type']).toEqual(v.keyword(':user/Circle'))
    expect(m[':ns']).toEqual(v.string('user'))
    expect(m[':name']).toEqual(v.string('Circle'))
  })

  it('includes field values as a map', () => {
    const sess = s()
    sess.evaluate('(defrecord Point [x y])')
    const m = mapToObj(sess.evaluate('(describe (->Point 3 4))'))
    expect(m[':fields'].kind).toBe('map')
    const fields = mapToObj(m[':fields'])
    expect(fields[':x']).toEqual(v.number(3))
    expect(fields[':y']).toEqual(v.number(4))
  })

  it('protocols list contains keyword type tags', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IShape (area [x]))
      (defrecord Circle [radius]
        IShape (area [this] radius))
    `)
    const m = mapToObj(sess.evaluate('(describe (->Circle 5))'))
    expect(m[':protocols'].kind).toBe('vector')
    if (m[':protocols'].kind !== 'vector') return
    expect(m[':protocols'].value).toContainEqual(v.keyword(':user/IShape'))
  })

  it('empty protocols list when record has no implementations', () => {
    const sess = s()
    sess.evaluate('(defrecord Bare [x])')
    const m = mapToObj(sess.evaluate('(describe (->Bare 1))'))
    expect(m[':protocols'].kind).toBe('vector')
    if (m[':protocols'].kind !== 'vector') return
    expect(m[':protocols'].value).toHaveLength(0)
  })

  it('multiple protocols listed', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IFoo (foo [x]))
      (defprotocol IBar (bar [x]))
      (defrecord Dual [v]
        IFoo (foo [this] v)
        IBar (bar [this] v))
    `)
    const m = mapToObj(sess.evaluate('(describe (->Dual 1))'))
    if (m[':protocols'].kind !== 'vector') return
    expect(m[':protocols'].value).toHaveLength(2)
    expect(m[':protocols'].value).toContainEqual(v.keyword(':user/IFoo'))
    expect(m[':protocols'].value).toContainEqual(v.keyword(':user/IBar'))
  })
})

// ---------------------------------------------------------------------------
// User-defined functions
// ---------------------------------------------------------------------------

describe('describe — fn', () => {
  it('returns fn metadata with name and arglists', () => {
    const sess = s()
    sess.evaluate('(defn greet "Greets someone." [name] (str "Hello " name))')
    const m = mapToObj(sess.evaluate('(describe greet)'))
    expect(m[':kind']).toEqual(v.keyword(':fn'))
    expect(m[':name']).toEqual(v.string('greet'))
    expect(m[':arglists'].kind).toBe('vector')
    expect(m[':doc']).toEqual(v.string('Greets someone.'))
  })

  it('multi-arity function shows all arglists', () => {
    const sess = s()
    sess.evaluate('(defn greet ([name] name) ([name greeting] greeting))')
    const m = mapToObj(sess.evaluate('(describe greet)'))
    expect(m[':arglists'].kind).toBe('vector')
    if (m[':arglists'].kind !== 'vector') return
    expect(m[':arglists'].value).toHaveLength(2)
  })

  it('anonymous fn has nil name', () => {
    const sess = s()
    sess.evaluate('(def anon (fn [x] x))')
    const m = mapToObj(sess.evaluate('(describe anon)'))
    expect(m[':kind']).toEqual(v.keyword(':fn'))
    expect(m[':name']).toEqual(v.nil())
  })

  it('variadic fn shows & in arglists', () => {
    const sess = s()
    sess.evaluate('(defn variadic [x & rest] rest)')
    const m = mapToObj(sess.evaluate('(describe variadic)'))
    if (m[':arglists'].kind !== 'vector') return
    const arity = m[':arglists'].value[0]
    if (arity.kind !== 'vector') return
    const argNames = arity.value.map((s) => (s.kind === 'string' ? s.value : ''))
    expect(argNames).toContain('&')
    expect(argNames).toContain('rest')
  })

  it('no-doc fn has nil doc', () => {
    const sess = s()
    sess.evaluate('(defn no-doc [x] x)')
    const m = mapToObj(sess.evaluate('(describe no-doc)'))
    expect(m[':doc']).toEqual(v.nil())
  })
})

// ---------------------------------------------------------------------------
// Native functions
// ---------------------------------------------------------------------------

describe('describe — native-fn', () => {
  it('returns native-fn metadata', () => {
    const sess = s()
    const m = mapToObj(sess.evaluate('(describe println)'))
    expect(m[':kind']).toEqual(v.keyword(':native-fn'))
    expect(m[':name']).toEqual(v.string('println'))
    expect(m[':arglists'].kind).toBe('vector')
  })

  it('includes doc string for documented native fns', () => {
    const sess = s()
    const m = mapToObj(sess.evaluate('(describe str)'))
    expect(m[':kind']).toEqual(v.keyword(':native-fn'))
    expect(m[':doc'].kind).toBe('string')
  })

  it('shows arglists for core functions', () => {
    const sess = s()
    const m = mapToObj(sess.evaluate('(describe map)'))
    expect(m[':arglists'].kind).toBe('vector')
    if (m[':arglists'].kind !== 'vector') return
    expect(m[':arglists'].value.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Protocol dispatch functions
// ---------------------------------------------------------------------------

describe('describe — protocol-fn', () => {
  it('identifies protocol dispatch fns by :kind', () => {
    const sess = s()
    sess.evaluate('(defprotocol IShape (area [this] "Compute area."))')
    const m = mapToObj(sess.evaluate('(describe area)'))
    expect(m[':kind']).toEqual(v.keyword(':protocol-fn'))
    expect(m[':name']).toEqual(v.string('area'))
    expect(m[':protocol']).toEqual(v.string('user/IShape'))
  })

  it('includes arglists from the parent protocol definition', () => {
    const sess = s()
    sess.evaluate('(defprotocol IFeed (eat [this food] "Eat something."))')
    const m = mapToObj(sess.evaluate('(describe eat)'))
    expect(m[':arglists'].kind).toBe('vector')
    if (m[':arglists'].kind !== 'vector') return
    expect(m[':arglists'].value.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Multimethods
// ---------------------------------------------------------------------------

describe('describe — multi-method', () => {
  it('returns multi-method metadata', () => {
    const sess = s()
    sess.evaluate(`
      (defmulti greet :type)
      (defmethod greet :circle [x] "a circle")
      (defmethod greet :square [x] "a square")
    `)
    const m = mapToObj(sess.evaluate('(describe greet)'))
    expect(m[':kind']).toEqual(v.keyword(':multi-method'))
    expect(m[':name']).toEqual(v.string('greet'))
    expect(m[':dispatch-vals'].kind).toBe('vector')
    expect(m[':default?']).toEqual(v.boolean(false))
  })

  it('dispatch-vals contains registered values', () => {
    const sess = s()
    sess.evaluate(`
      (defmulti classify identity)
      (defmethod classify :dog [x] "dog")
      (defmethod classify :cat [x] "cat")
    `)
    const m = mapToObj(sess.evaluate('(describe classify)'))
    if (m[':dispatch-vals'].kind !== 'vector') return
    expect(m[':dispatch-vals'].value).toContainEqual(v.keyword(':dog'))
    expect(m[':dispatch-vals'].value).toContainEqual(v.keyword(':cat'))
  })

  it('default? is true when :default method is registered', () => {
    const sess = s()
    sess.evaluate(`
      (defmulti greet :type)
      (defmethod greet :default [x] "default greeting")
    `)
    const m = mapToObj(sess.evaluate('(describe greet)'))
    expect(m[':default?']).toEqual(v.boolean(true))
  })
})

// ---------------------------------------------------------------------------
// Namespaces
// ---------------------------------------------------------------------------

describe('describe — namespace', () => {
  it('returns namespace metadata', () => {
    const sess = s()
    sess.evaluate('(defn hello [x] x)')
    const m = mapToObj(sess.evaluate("(describe (find-ns 'user))"))
    expect(m[':kind']).toEqual(v.keyword(':namespace'))
    expect(m[':name']).toEqual(v.string('user'))
    expect(m[':var-count'].kind).toBe('number')
    expect(m[':vars'].kind).toBe('map')
  })

  it('vars map contains defined symbols', () => {
    const sess = s()
    sess.evaluate('(defn my-fn [x] x)')
    const result = sess.evaluate("(get (:vars (describe (find-ns 'user))) \"my-fn\")")
    expect(result.kind).toBe('map')
    const varDesc = mapToObj(result)
    expect(varDesc[':kind']).toEqual(v.keyword(':fn'))
  })

  it('protocol vars appear in namespace describe', () => {
    const sess = s()
    sess.evaluate('(defprotocol IFoo (foo [x]))')
    const result = sess.evaluate("(get (:vars (describe (find-ns 'user))) \"IFoo\")")
    const varDesc = mapToObj(result)
    expect(varDesc[':kind']).toEqual(v.keyword(':protocol'))
  })

  it('protocol dispatch fn vars appear as :protocol-fn', () => {
    const sess = s()
    sess.evaluate('(defprotocol IFoo (foo [x]))')
    const result = sess.evaluate("(get (:vars (describe (find-ns 'user))) \"foo\")")
    const varDesc = mapToObj(result)
    expect(varDesc[':kind']).toEqual(v.keyword(':protocol-fn'))
  })

  it('limits vars with *describe-limit* (default 50)', () => {
    const sess = s()
    for (let i = 0; i < 60; i++) {
      sess.evaluate(`(def var-${i} ${i})`)
    }
    const m = mapToObj(sess.evaluate("(describe (find-ns 'user))"))
    const varCount = m[':var-count']
    const showing = m[':showing']
    expect(varCount.kind).toBe('number')
    expect(showing.kind).toBe('number')
    if (varCount.kind === 'number') expect(varCount.value).toBe(60)
    if (showing.kind === 'number') expect(showing.value).toBe(50)
    expect(m[':vars'].kind).toBe('map')
    if (m[':vars'].kind !== 'map') return
    expect(m[':vars'].entries).toHaveLength(50)
  })

  it('no :showing key when under the limit', () => {
    const sess = s()
    sess.evaluate('(def just-one 1)')
    const m = mapToObj(sess.evaluate("(describe (find-ns 'user))"))
    expect(m[':showing']).toBeUndefined()
  })

  it('nil limit gives all vars', () => {
    const sess = s()
    for (let i = 0; i < 10; i++) {
      sess.evaluate(`(def v${i} ${i})`)
    }
    const m = mapToObj(sess.evaluate("(describe (find-ns 'user) nil)"))
    expect(m[':showing']).toBeUndefined()
    if (m[':vars'].kind !== 'map') return
    expect(m[':vars'].entries).toHaveLength(10)
  })

  it('custom limit via second argument', () => {
    const sess = s()
    for (let i = 0; i < 20; i++) {
      sess.evaluate(`(def x${i} ${i})`)
    }
    const m = mapToObj(sess.evaluate("(describe (find-ns 'user) 5)"))
    const showing = m[':showing']
    expect(showing.kind).toBe('number')
    if (showing.kind === 'number') expect(showing.value).toBe(5)
    if (m[':vars'].kind !== 'map') return
    expect(m[':vars'].entries).toHaveLength(5)
  })

  it('explicit limit via second argument overrides default', () => {
    const sess = s()
    for (let i = 0; i < 20; i++) {
      sess.evaluate(`(def y${i} ${i})`)
    }
    // Pass explicit limit as second arg — works regardless of compiler/binding status
    const m = mapToObj(sess.evaluate("(describe (find-ns 'user) 7)"))
    const showing = m[':showing']
    expect(showing.kind).toBe('number')
    if (showing.kind === 'number') expect(showing.value).toBe(7)
  })

  // NOTE: (binding [*describe-limit* N] (describe ns)) requires Phase 10 of the
  // compiler (dynamic var scoping in compiled fn bodies). Bootstrap-compiled
  // functions see the root var value, not thread-local bindings, until that phase
  // is implemented. Use (describe ns limit) directly in the meantime.
})

// ---------------------------------------------------------------------------
// Vars
// ---------------------------------------------------------------------------

describe('describe — var', () => {
  it('returns var wrapper metadata', () => {
    const sess = s()
    sess.evaluate('(defn greet [name] name)')
    const m = mapToObj(sess.evaluate('(describe (var greet))'))
    expect(m[':kind']).toEqual(v.keyword(':var'))
    expect(m[':ns']).toEqual(v.string('user'))
    expect(m[':name']).toEqual(v.string('greet'))
    expect(m[':dynamic']).toEqual(v.boolean(false))
  })

  it(':value contains a nested describe of the var value', () => {
    const sess = s()
    sess.evaluate('(defn greet "Greets someone." [name] name)')
    const m = mapToObj(sess.evaluate('(describe (var greet))'))
    expect(m[':value'].kind).toBe('map')
    const inner = mapToObj(m[':value'])
    expect(inner[':kind']).toEqual(v.keyword(':fn'))
  })

  it('doc is visible on both (describe fn) and (describe #\'name)', () => {
    const sess = s()
    sess.evaluate('(defn greet "Greets someone." [name] name)')
    // Doc is propagated from var meta to the function value at def-time
    const fnDesc = mapToObj(sess.evaluate('(describe greet)'))
    expect(fnDesc[':doc']).toEqual(v.string('Greets someone.'))
    // The var path also works
    const varDesc = mapToObj(sess.evaluate('(describe (var greet))'))
    expect(varDesc[':kind']).toEqual(v.keyword(':var'))
  })

  it('dynamic? is true for dynamic vars', () => {
    const sess = s()
    sess.evaluate('(def ^:dynamic *my-config* 42)')
    const m = mapToObj(sess.evaluate('(describe (var *my-config*))'))
    expect(m[':dynamic']).toEqual(v.boolean(true))
  })
})

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

describe('describe — primitives', () => {
  it('string: kind, value, count', () => {
    const sess = s()
    const m = mapToObj(sess.evaluate('(describe "hello")'))
    expect(m[':kind']).toEqual(v.keyword(':string'))
    expect(m[':value']).toEqual(v.string('hello'))
    expect(m[':count']).toEqual(v.number(5))
  })

  it('number: kind and value', () => {
    const sess = s()
    const m = mapToObj(sess.evaluate('(describe 42)'))
    expect(m[':kind']).toEqual(v.keyword(':number'))
    expect(m[':value']).toEqual(v.number(42))
  })

  it('boolean: kind and value', () => {
    const sess = s()
    expect(mapToObj(sess.evaluate('(describe true)'))[':kind']).toEqual(v.keyword(':boolean'))
    expect(mapToObj(sess.evaluate('(describe false)'))[':value']).toEqual(v.boolean(false))
  })

  it('nil: kind only', () => {
    const sess = s()
    const m = mapToObj(sess.evaluate('(describe nil)'))
    expect(m[':kind']).toEqual(v.keyword(':nil'))
    expect(Object.keys(m)).toHaveLength(1)
  })

  it('simple keyword: kind, name, nil ns', () => {
    const sess = s()
    const m = mapToObj(sess.evaluate('(describe :foo)'))
    expect(m[':kind']).toEqual(v.keyword(':keyword'))
    expect(m[':name']).toEqual(v.string('foo'))
    expect(m[':ns']).toEqual(v.nil())
  })

  it('namespaced keyword: kind, name, ns string', () => {
    const sess = s()
    const m = mapToObj(sess.evaluate('(describe :user/bar)'))
    expect(m[':name']).toEqual(v.string('bar'))
    expect(m[':ns']).toEqual(v.string('user'))
  })

  it('symbol: kind, name, ns', () => {
    const sess = s()
    const m = mapToObj(sess.evaluate("(describe 'hello)"))
    expect(m[':kind']).toEqual(v.keyword(':symbol'))
    expect(m[':name']).toEqual(v.string('hello'))
    expect(m[':ns']).toEqual(v.nil())
  })

  it('list: kind, count', () => {
    const sess = s()
    const m = mapToObj(sess.evaluate("(describe '(1 2 3))"))
    expect(m[':kind']).toEqual(v.keyword(':list'))
    expect(m[':count']).toEqual(v.number(3))
  })

  it('vector: kind, count', () => {
    const sess = s()
    const m = mapToObj(sess.evaluate('(describe [1 2 3 4])'))
    expect(m[':kind']).toEqual(v.keyword(':vector'))
    expect(m[':count']).toEqual(v.number(4))
  })

  it('map: kind, count', () => {
    const sess = s()
    const m = mapToObj(sess.evaluate('(describe {:a 1 :b 2})'))
    expect(m[':kind']).toEqual(v.keyword(':map'))
    expect(m[':count']).toEqual(v.number(2))
  })

  it('set: kind, count', () => {
    const sess = s()
    const m = mapToObj(sess.evaluate('(describe #{1 2 3})'))
    expect(m[':kind']).toEqual(v.keyword(':set'))
    expect(m[':count']).toEqual(v.number(3))
  })

  it('atom: kind and deref-kind', () => {
    const sess = s()
    const m = mapToObj(sess.evaluate('(describe (atom {:x 1}))'))
    expect(m[':kind']).toEqual(v.keyword(':atom'))
    expect(m[':deref-kind']).toEqual(v.keyword(':map'))
  })

  it('regex: kind, pattern, flags', () => {
    const sess = s()
    const m = mapToObj(sess.evaluate('(describe #"\\d+")'))
    expect(m[':kind']).toEqual(v.keyword(':regex'))
    expect(m[':pattern']).toEqual(v.string('\\d+'))
    expect(m[':flags']).toEqual(v.string(''))
  })

  it('lazy-seq: kind, realized', () => {
    const sess = s()
    // (map inc [1 2 3]) returns a lazy-seq in cljam; (range 5) is eagerly realized as a list
    const m = mapToObj(sess.evaluate('(describe (map inc [1 2 3]))'))
    expect(m[':kind']).toEqual(v.keyword(':lazy-seq'))
    expect(m[':realized'].kind).toBe('boolean')
  })
})

// ---------------------------------------------------------------------------
// Composability
// ---------------------------------------------------------------------------

describe('describe — composability', () => {
  it('get-in works on protocol methods', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IShape
        "A shape."
        (area [this] "Compute area."))
    `)
    const methodName = sess.evaluate('(get-in (describe IShape) [:methods 0 :name])')
    expect(methodName).toEqual(v.string('area'))
  })

  it(':type in record describe matches (type x)', () => {
    const sess = s()
    sess.evaluate('(defrecord Foo [x])')
    const typeResult = sess.evaluate('(type (->Foo 1))')
    const descType = sess.evaluate('(:type (describe (->Foo 1)))')
    expect(typeResult).toEqual(descType)
  })

  it('protocols in record describe are consistent with (protocols (type x))', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IShape (area [x]))
      (defrecord Circle [r] IShape (area [this] r))
    `)
    const firstProto = sess.evaluate('(first (:protocols (describe (->Circle 1))))')
    expect(firstProto).toEqual(v.keyword(':user/IShape'))
  })

  it('result is a map — keys returns the describe keys', () => {
    const sess = s()
    sess.evaluate('(defn greet [x] x)')
    const keys = sess.evaluate('(keys (describe greet))')
    // (keys m) returns a vector in cljam
    expect(keys.kind).toBe('vector')
  })

  it('(describe nil) returns a map, not an error', () => {
    const sess = s()
    const result = sess.evaluate('(describe nil)')
    expect(result.kind).toBe('map')
  })
})
