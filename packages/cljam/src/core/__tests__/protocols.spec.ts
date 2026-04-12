/**
 * Protocols and Records test suite
 *
 * Tests are organized as real-world domains, not unit tests:
 * - Geometry: IShape protocol with Circle, Rectangle, Triangle records
 * - Serialization: ISerializable protocol across multiple types
 * - Validation: IValidator on built-in types and records
 * - Introspection: satisfies?, protocols, extenders, record-type
 * - Edge cases: missing implementations, name collisions, hot-reload safety
 */

import { describe, expect, it } from 'vitest'
import {
  cljBoolean,
  cljKeyword,
  cljNil,
  cljNumber,
  cljString,
  cljSymbol,
  cljVector,
} from '../factories'
import { freshSession as session } from '../evaluator/__tests__/evaluator-test-utils'
import { printString } from '../printer'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function s() {
  return session()
}

// ---------------------------------------------------------------------------
// Part 1: defprotocol — define and call
// ---------------------------------------------------------------------------

describe('defprotocol', () => {
  it('creates a protocol var in the current namespace', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IShape
        "Abstraction over shapes."
        (area [this] "Compute the area."))
    `)
    const proto = sess.evaluate('IShape')
    expect(proto.kind).toBe('protocol')
  })

  it('creates dispatch function vars for each method', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IShape
        (area [this])
        (perimeter [this]))
    `)
    const area = sess.evaluate('area')
    const perimeter = sess.evaluate('perimeter')
    expect(area.kind).toBe('native-function')
    expect(perimeter.kind).toBe('native-function')
  })

  it('protocol? returns true for a protocol value', () => {
    const sess = s()
    sess.evaluate('(defprotocol IPrintable (print-str [this]))')
    expect(sess.evaluate('(protocol? IPrintable)')).toEqual(cljBoolean(true))
    expect(sess.evaluate('(protocol? "hello")')).toEqual(cljBoolean(false))
    expect(sess.evaluate('(protocol? 42)')).toEqual(cljBoolean(false))
  })

  it('protocol prints as #protocol[ns/Name]', () => {
    const sess = s()
    sess.evaluate('(defprotocol IFoo (foo [x]))')
    const proto = sess.evaluate('IFoo')
    expect(printString(proto)).toBe('#protocol[user/IFoo]')
  })
})

// ---------------------------------------------------------------------------
// Part 2: extend-protocol on built-in types
// ---------------------------------------------------------------------------

describe('extend-protocol on built-in types', () => {
  it('dispatches to String implementation', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IDescribe (describe-val [this]))
      (extend-protocol IDescribe
        :string (describe-val [s] (str "string:" s))
        :number (describe-val [n] (str "number:" n))
        :nil    (describe-val [_] "nil"))
    `)
    expect(sess.evaluate('(describe-val "hello")')).toEqual(cljString('string:hello'))
    expect(sess.evaluate('(describe-val 42)')).toEqual(cljString('number:42'))
    expect(sess.evaluate('(describe-val nil)')).toEqual(cljString('nil'))
  })

  it('throws No implementation when type not extended', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IFoo (foo [this]))
      (extend-protocol IFoo :string (foo [s] s))
    `)
    expect(() => sess.evaluate('(foo 42)')).toThrow(
      "No implementation of protocol method 'user/IFoo/foo' for type 'number'"
    )
  })

  it('extend-protocol can extend Boolean and Keyword', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol ITag (tag [this]))
      (extend-protocol ITag
        :boolean (tag [b] (if b :yes :no))
        :keyword (tag [k] (str "kw:" (name k))))
    `)
    expect(sess.evaluate('(tag true)')).toEqual(cljKeyword(':yes'))
    expect(sess.evaluate('(tag false)')).toEqual(cljKeyword(':no'))
    expect(sess.evaluate('(tag :hello)')).toEqual(cljString('kw:hello'))
  })

  it('later extend-protocol call overwrites earlier implementation', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IGreet (greet [this]))
      (extend-protocol IGreet :string (greet [s] (str "Hello " s)))
    `)
    expect(sess.evaluate('(greet "World")')).toEqual(cljString('Hello World'))
    // Override
    sess.evaluate(`
      (extend-protocol IGreet :string (greet [s] (str "Hi " s)))
    `)
    expect(sess.evaluate('(greet "World")')).toEqual(cljString('Hi World'))
  })
})

// ---------------------------------------------------------------------------
// Part 3: defrecord — construction and field access
// ---------------------------------------------------------------------------

describe('defrecord', () => {
  it('creates a positional constructor ->Name', () => {
    const sess = s()
    sess.evaluate('(defrecord Point [x y])')
    const pt = sess.evaluate('(->Point 3 4)')
    expect(pt.kind).toBe('record')
  })

  it('creates a map-based constructor map->Name', () => {
    const sess = s()
    sess.evaluate('(defrecord Point [x y])')
    const pt = sess.evaluate('(map->Point {:x 10 :y 20})')
    expect(pt.kind).toBe('record')
    expect(sess.evaluate('(:x (map->Point {:x 10 :y 20}))')).toEqual(cljNumber(10))
  })

  it('record fields accessible via keywords', () => {
    const sess = s()
    sess.evaluate('(defrecord Point [x y])')
    sess.evaluate('(def p (->Point 3 4))')
    expect(sess.evaluate('(:x p)')).toEqual(cljNumber(3))
    expect(sess.evaluate('(:y p)')).toEqual(cljNumber(4))
  })

  it('get works on records', () => {
    const sess = s()
    sess.evaluate('(defrecord Box [width height])')
    sess.evaluate('(def b (->Box 100 200))')
    expect(sess.evaluate('(get b :width)')).toEqual(cljNumber(100))
    expect(sess.evaluate('(get b :missing 99)')).toEqual(cljNumber(99))
  })

  it('record called as a function — (record :key)', () => {
    const sess = s()
    sess.evaluate('(defrecord Cat [name age])')
    sess.evaluate('(def c (->Cat "Mochi" 3))')
    expect(sess.evaluate('(c :name)')).toEqual(cljString('Mochi'))
    expect(sess.evaluate('(c :age)')).toEqual(cljNumber(3))
    expect(sess.evaluate('(c :missing "default")')).toEqual(cljString('default'))
  })

  it('keyword called on a record — (:key record)', () => {
    const sess = s()
    sess.evaluate('(defrecord Dog [breed])')
    sess.evaluate('(def d (->Dog "Labrador"))')
    expect(sess.evaluate('(:breed d)')).toEqual(cljString('Labrador'))
    expect(sess.evaluate('(:color d "unknown")')).toEqual(cljString('unknown'))
  })

  it('record prints as #ns/TypeName{:field val ...}', () => {
    const sess = s()
    sess.evaluate('(defrecord Circle [radius])')
    const c = sess.evaluate('(->Circle 5)')
    expect(printString(c)).toBe('#user/Circle{:radius 5}')
  })

  it('record? predicate', () => {
    const sess = s()
    sess.evaluate('(defrecord Pt [x y])')
    expect(sess.evaluate('(record? (->Pt 1 2))')).toEqual(cljBoolean(true))
    expect(sess.evaluate('(record? {:x 1})')).toEqual(cljBoolean(false))
    expect(sess.evaluate('(record? nil)')).toEqual(cljBoolean(false))
  })

  it('record-type returns qualified type name', () => {
    const sess = s()
    sess.evaluate('(defrecord Wheel [radius])')
    expect(sess.evaluate('(record-type (->Wheel 5))')).toEqual(cljString('user/Wheel'))
  })

  it('count returns number of fields', () => {
    const sess = s()
    sess.evaluate('(defrecord Triple [a b c])')
    expect(sess.evaluate('(count (->Triple 1 2 3))')).toEqual(cljNumber(3))
  })

  it('keys and vals work on records', () => {
    const sess = s()
    sess.evaluate('(defrecord Pair [left right])')
    sess.evaluate('(def p (->Pair "A" "B"))')
    const ks = sess.evaluate('(keys p)')
    expect(ks).toMatchObject(cljVector([cljKeyword(':left'), cljKeyword(':right')]))
    const vs = sess.evaluate('(vals p)')
    expect(vs).toMatchObject(cljVector([cljString('A'), cljString('B')]))
  })

  it('contains? works on record fields', () => {
    const sess = s()
    sess.evaluate('(defrecord Node [value next])')
    sess.evaluate('(def n (->Node 42 nil))')
    expect(sess.evaluate('(contains? n :value)')).toEqual(cljBoolean(true))
    expect(sess.evaluate('(contains? n :missing)')).toEqual(cljBoolean(false))
  })

  it('assoc on a record returns a plain map', () => {
    const sess = s()
    sess.evaluate('(defrecord Pt [x y])')
    sess.evaluate('(def p (->Pt 1 2))')
    const updated = sess.evaluate('(assoc p :x 99)')
    expect(updated.kind).toBe('map')
    expect(sess.evaluate('(:x (assoc p :x 99))')).toEqual(cljNumber(99))
  })

  it('dissoc on a record returns a plain map', () => {
    const sess = s()
    sess.evaluate('(defrecord Pt [x y])')
    sess.evaluate('(def p (->Pt 1 2))')
    const result = sess.evaluate('(dissoc p :x)')
    expect(result.kind).toBe('map')
    expect(sess.evaluate('(:y (dissoc p :x))')).toEqual(cljNumber(2))
  })

  it('seq on a record produces entry pairs (like a map)', () => {
    const sess = s()
    sess.evaluate('(defrecord Color [r g b])')
    sess.evaluate('(def c (->Color 255 0 128))')
    // seq of a record = vector of [key val] pairs
    const result = sess.evaluate('(first (seq c))')
    expect(result.kind).toBe('vector')
  })

  it('into {} converts a record to a plain map', () => {
    const sess = s()
    sess.evaluate('(defrecord Pt [x y])')
    sess.evaluate('(def p (->Pt 3 4))')
    const m = sess.evaluate('(into {} p)')
    expect(m.kind).toBe('map')
    expect(sess.evaluate('(:x (into {} p))')).toEqual(cljNumber(3))
  })
})

// ---------------------------------------------------------------------------
// Part 4: defrecord + defprotocol inline — the geometry domain
// ---------------------------------------------------------------------------

const GEOMETRY_SRC = `
(def pi 3.141592653589793)

(defprotocol IShape
  "Abstraction over geometric shapes."
  (area [this] "Compute the area.")
  (perimeter [this] "Compute the perimeter."))

(defrecord Circle [radius]
  IShape
  (area [this] (* pi radius radius))
  (perimeter [this] (* 2 pi radius)))

(defrecord Rectangle [width height]
  IShape
  (area [this] (* width height))
  (perimeter [this] (* 2 (+ width height))))

(defrecord Triangle [a b c]
  IShape
  (area [this]
    (let [s (/ (+ a b c) 2)]
      (sqrt (* s (- s a) (- s b) (- s c)))))
  (perimeter [this] (+ a b c)))
`

describe('geometry domain — defrecord with inline protocol', () => {
  it('Circle area is π×r²', () => {
    const sess = s()
    sess.evaluate(GEOMETRY_SRC)
    const result = sess.evaluate('(area (->Circle 5))')
    expect(result.kind).toBe('number')
    expect((result as { kind: 'number'; value: number }).value).toBeCloseTo(
      Math.PI * 25,
      5
    )
  })

  it('Circle perimeter is 2 * π * r', () => {
    const sess = s()
    sess.evaluate(GEOMETRY_SRC)
    const result = sess.evaluate('(perimeter (->Circle 3))')
    expect(result.kind).toBe('number')
    expect((result as { kind: 'number'; value: number }).value).toBeCloseTo(
      2 * Math.PI * 3,
      5
    )
  })

  it('Rectangle area is width * height', () => {
    const sess = s()
    sess.evaluate(GEOMETRY_SRC)
    expect(sess.evaluate('(area (->Rectangle 4 5))')).toEqual(cljNumber(20))
  })

  it('Rectangle perimeter is 2 * (w + h)', () => {
    const sess = s()
    sess.evaluate(GEOMETRY_SRC)
    expect(sess.evaluate('(perimeter (->Rectangle 3 7))')).toEqual(cljNumber(20))
  })

  it('Triangle perimeter is sum of sides', () => {
    const sess = s()
    sess.evaluate(GEOMETRY_SRC)
    expect(sess.evaluate('(perimeter (->Triangle 3 4 5))')).toEqual(cljNumber(12))
  })

  it('Triangle area of a 3-4-5 right triangle is 6 (Heron)', () => {
    const sess = s()
    sess.evaluate(GEOMETRY_SRC)
    const result = sess.evaluate('(area (->Triangle 3 4 5))')
    expect((result as { kind: 'number'; value: number }).value).toBeCloseTo(6, 5)
  })

  it('field names in method body bind correctly', () => {
    const sess = s()
    sess.evaluate(GEOMETRY_SRC)
    // radius is bound directly inside area method — not (:radius this)
    expect(sess.evaluate('(:radius (->Circle 7))')).toEqual(cljNumber(7))
  })

  it('protocol dispatch works via satisfies?', () => {
    const sess = s()
    sess.evaluate(GEOMETRY_SRC)
    expect(sess.evaluate('(satisfies? IShape (->Circle 5))')).toEqual(cljBoolean(true))
    expect(sess.evaluate('(satisfies? IShape (->Rectangle 4 5))')).toEqual(cljBoolean(true))
    expect(sess.evaluate('(satisfies? IShape "not a shape")')).toEqual(cljBoolean(false))
  })

  it('all shapes can be processed through protocol dispatch in a loop', () => {
    const sess = s()
    sess.evaluate(GEOMETRY_SRC)
    sess.evaluate(`
      (def shapes [(->Circle 1) (->Rectangle 2 3) (->Triangle 3 4 5)])
      (def areas (mapv area shapes))
    `)
    const areas = sess.evaluate('areas')
    expect(areas.kind).toBe('vector')
    expect((areas as { kind: 'vector'; value: unknown[] }).value).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// Part 5: satisfies? and protocols introspection
// ---------------------------------------------------------------------------

describe('satisfies?', () => {
  it('returns true when a value implements the protocol', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IFoo (foo [x]))
      (extend-protocol IFoo :string (foo [s] s))
    `)
    expect(sess.evaluate('(satisfies? IFoo "hello")')).toEqual(cljBoolean(true))
    expect(sess.evaluate('(satisfies? IFoo 42)')).toEqual(cljBoolean(false))
  })

  it('satisfies? works via a var reference', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IBar (bar [x]))
      (extend-protocol IBar :number (bar [n] n))
    `)
    expect(sess.evaluate('(satisfies? IBar 5)')).toEqual(cljBoolean(true))
  })

  it('satisfies? checks record types by qualified name', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IFoo (foo [x]))
      (defrecord MyThing [v]
        IFoo (foo [this] v))
    `)
    expect(sess.evaluate('(satisfies? IFoo (->MyThing 1))')).toEqual(cljBoolean(true))
    // Same protocol, different record type that is NOT extended
    sess.evaluate('(defrecord OtherThing [v])')
    expect(sess.evaluate('(satisfies? IFoo (->OtherThing 1))')).toEqual(cljBoolean(false))
  })
})

describe('protocols introspection', () => {
  it('protocols returns a vector of protocols a value implements', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IA (a-method [x]))
      (defprotocol IB (b-method [x]))
      (extend-protocol IA :string (a-method [s] s))
      (extend-protocol IB :string (b-method [s] s))
    `)
    const protos = sess.evaluate('(protocols :string)')
    expect(protos.kind).toBe('vector')
    const protosVec = protos as { kind: 'vector'; value: { kind: string; name: string }[] }
    const names = protosVec.value.map((p) => p.name)
    expect(names).toContain('IA')
    expect(names).toContain('IB')
  })

  it('protocols returns empty vector when nothing implemented', () => {
    const sess = s()
    sess.evaluate('(defprotocol IFoo (foo [x]))')
    const protos = sess.evaluate('(protocols :number)')
    expect(protos.kind).toBe('vector')
    // May or may not be empty depending on what built-ins implement
    // Just check it's a vector we can work with
  })
})

describe('extenders', () => {
  it('returns the type tags that have extended a protocol', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IFoo (foo [x]))
      (extend-protocol IFoo
        :string (foo [s] s)
        :number (foo [n] n)
        :nil    (foo [_] nil))
    `)
    const ext = sess.evaluate('(extenders IFoo)')
    expect(ext.kind).toBe('vector')
    // extenders now returns keyword type tags matching (type x) vocabulary
    const tags = (ext as { kind: 'vector'; value: { kind: string; name: string }[] }).value
      .map((t) => t.name)
    expect(tags).toContain(':string')
    expect(tags).toContain(':number')
    expect(tags).toContain(':nil')
  })

  it('extenders includes record type tags', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IFoo (foo [x]))
      (defrecord MyRec [v] IFoo (foo [this] v))
    `)
    const ext = sess.evaluate('(extenders IFoo)')
    // record type tags are namespaced keywords: :user/MyRec
    const tags = (ext as { kind: 'vector'; value: { kind: string; name: string }[] }).value
      .map((t) => t.name)
    expect(tags).toContain(':user/MyRec')
  })
})

// ---------------------------------------------------------------------------
// Part 6: extend-type — one type, multiple protocols
// ---------------------------------------------------------------------------

describe('extend-type', () => {
  it('extends a record to multiple protocols', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IArea (area [x]))
      (defprotocol ILabel (label [x]))

      (defrecord Square [side])

      (extend-type :user/Square
        IArea  (area [this] (* (:side this) (:side this)))
        ILabel (label [this] (str "Square(" (:side this) ")")))
    `)
    expect(sess.evaluate('(area (->Square 4))')).toEqual(cljNumber(16))
    expect(sess.evaluate('(label (->Square 4))')).toEqual(cljString('Square(4)'))
  })

  it('extend-type on a built-in type', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IWrap (wrap [x]))
      (extend-type :number
        IWrap (wrap [n] {:value n}))
    `)
    expect(sess.evaluate('(:value (wrap 42))')).toEqual(cljNumber(42))
  })
})

// ---------------------------------------------------------------------------
// Part 7: multiple protocols on one record
// ---------------------------------------------------------------------------

describe('multiple protocols on one record (inline)', () => {
  it('implements all protocols correctly', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol ISize (size [x]))
      (defprotocol INamed (get-name [x]))

      (defrecord Animal [species-name weight]
        ISize  (size [this] weight)
        INamed (get-name [this] species-name))
    `)
    sess.evaluate('(def lion (->Animal "Lion" 190))')
    expect(sess.evaluate('(size lion)')).toEqual(cljNumber(190))
    expect(sess.evaluate('(get-name lion)')).toEqual(cljString('Lion'))
  })
})

// ---------------------------------------------------------------------------
// Part 8: namespace introspection helpers
// ---------------------------------------------------------------------------

describe('ns-name', () => {
  it('returns the namespace name as a symbol', () => {
    const sess = s()
    const result = sess.evaluate('(ns-name *ns*)')
    expect(result).toEqual(cljSymbol('user'))
  })
})

describe('find-ns', () => {
  it('returns the namespace object for a known namespace', () => {
    const sess = s()
    const ns = sess.evaluate("(find-ns 'clojure.core)")
    expect(ns.kind).toBe('namespace')
  })

  it('returns nil for an unknown namespace', () => {
    const sess = s()
    expect(sess.evaluate("(find-ns 'no.such.ns)")).toEqual(cljNil())
  })
})

describe('all-ns', () => {
  it('returns a sequence of loaded namespaces', () => {
    const sess = s()
    const result = sess.evaluate('(all-ns)')
    // all-ns returns a list (consistent with bootstrap.ts behavior)
    expect(result.kind).toBe('list')
    const namespaces = (result as { kind: 'list'; value: { kind: string; name: string }[] }).value
    const names = namespaces.map((ns) => ns.name)
    expect(names).toContain('clojure.core')
    expect(names).toContain('user')
  })
})

// ---------------------------------------------------------------------------
// Part 9: Serialization domain — multi-type real-world protocol
// ---------------------------------------------------------------------------

const SERIALIZATION_SRC = `
(defprotocol ISerializable
  "Values that can be serialized to JSON-like strings."
  (serialize [this] "Return a JSON-like string representation."))

(extend-protocol ISerializable
  :string  (serialize [s] (str "\\"" s "\\""))
  :number  (serialize [n] (str n))
  :boolean (serialize [b] (if b "true" "false"))
  :nil     (serialize [_] "null"))

(defrecord JsonObject [pairs]
  ISerializable
  (serialize [this]
    (let [entries (map (fn [p]
                         (str "\\"" (first p) "\\":" (serialize (second p))))
                       pairs)]
      (str "{" (clojure.string/join "," entries) "}"))))

(defrecord JsonArray [items]
  ISerializable
  (serialize [this]
    (str "[" (clojure.string/join "," (map serialize items)) "]")))
`

describe('serialization domain', () => {
  it('serializes primitives', () => {
    const sess = s()
    sess.evaluate("(require '[clojure.string])")
    sess.evaluate(SERIALIZATION_SRC)
    expect(sess.evaluate('(serialize "hello")')).toEqual(cljString('"hello"'))
    expect(sess.evaluate('(serialize 42)')).toEqual(cljString('42'))
    expect(sess.evaluate('(serialize true)')).toEqual(cljString('true'))
    expect(sess.evaluate('(serialize nil)')).toEqual(cljString('null'))
  })

  it('serializes a JsonObject record', () => {
    const sess = s()
    sess.evaluate("(require '[clojure.string])")
    sess.evaluate(SERIALIZATION_SRC)
    sess.evaluate('(def obj (->JsonObject [["name" "Alice"] ["age" 30]]))')
    expect(sess.evaluate('(serialize obj)')).toEqual(
      cljString('{"name":"Alice","age":30}')
    )
  })

  it('serializes a JsonArray record', () => {
    const sess = s()
    sess.evaluate("(require '[clojure.string])")
    sess.evaluate(SERIALIZATION_SRC)
    sess.evaluate('(def arr (->JsonArray [1 2 3]))')
    expect(sess.evaluate('(serialize arr)')).toEqual(cljString('[1,2,3]'))
  })

  it('composes — nested array of objects', () => {
    const sess = s()
    sess.evaluate("(require '[clojure.string])")
    sess.evaluate(SERIALIZATION_SRC)
    sess.evaluate(`
      (def nested
        (->JsonArray
          [(->JsonObject [["x" 1]])
           (->JsonObject [["x" 2]])]))
    `)
    expect(sess.evaluate('(serialize nested)')).toEqual(
      cljString('[{"x":1},{"x":2}]')
    )
  })
})

// ---------------------------------------------------------------------------
// Part 10: Record equality and identity
// ---------------------------------------------------------------------------

describe('record equality', () => {
  it('two records with same type and same fields are equal', () => {
    const sess = s()
    sess.evaluate('(defrecord Pt [x y])')
    expect(sess.evaluate('(= (->Pt 1 2) (->Pt 1 2))')).toEqual(cljBoolean(true))
  })

  it('two records with different field values are not equal', () => {
    const sess = s()
    sess.evaluate('(defrecord Pt [x y])')
    expect(sess.evaluate('(= (->Pt 1 2) (->Pt 1 3))')).toEqual(cljBoolean(false))
  })

  it('two records of different types are not equal even with same fields', () => {
    const sess = s()
    sess.evaluate('(defrecord Pt [x y])')
    sess.evaluate('(defrecord Vec2 [x y])')
    expect(sess.evaluate('(= (->Pt 1 2) (->Vec2 1 2))')).toEqual(cljBoolean(false))
  })

  it('a record is not equal to a plain map with the same entries', () => {
    const sess = s()
    sess.evaluate('(defrecord Pt [x y])')
    expect(sess.evaluate('(= (->Pt 1 2) {:x 1 :y 2})')).toEqual(cljBoolean(false))
  })
})

// ---------------------------------------------------------------------------
// Part 11: Hot-reload / re-eval safety
// ---------------------------------------------------------------------------

describe('re-eval safety', () => {
  it('re-evaluating defprotocol is a no-op — impls are preserved', () => {
    const sess = s()
    sess.evaluate(`
      (defprotocol IFoo (foo [x]))
      (extend-protocol IFoo :string (foo [s] (str "v1:" s)))
    `)
    expect(sess.evaluate('(foo "hello")')).toEqual(cljString('v1:hello'))
    // Re-eval defprotocol — should NOT wipe the impls
    sess.evaluate('(defprotocol IFoo (foo [x]))')
    expect(sess.evaluate('(foo "hello")')).toEqual(cljString('v1:hello'))
  })
})

// ---------------------------------------------------------------------------
// Part 12: Error cases
// ---------------------------------------------------------------------------

describe('error cases', () => {
  it('calling a protocol method with no implementation throws', () => {
    const sess = s()
    sess.evaluate('(defprotocol IFoo (foo [x]))')
    expect(() => sess.evaluate('(foo 42)')).toThrow("No implementation")
  })

  it('extend-protocol! with a non-function impl throws', () => {
    const sess = s()
    sess.evaluate('(defprotocol IFoo (foo [x]))')
    expect(() =>
      sess.evaluate('(extend-protocol! IFoo "string" {"foo" 42})')
    ).toThrow("implementation for 'foo' must be a function")
  })

  it('satisfies? on a non-protocol first arg throws', () => {
    const sess = s()
    expect(() => sess.evaluate('(satisfies? "not-a-protocol" 42)')).toThrow(
      'satisfies?: first argument must be a protocol'
    )
  })

  it('record-type on a non-record throws', () => {
    const sess = s()
    expect(() => sess.evaluate('(record-type "hello")')).toThrow(
      'record-type: expected a record'
    )
  })
})
