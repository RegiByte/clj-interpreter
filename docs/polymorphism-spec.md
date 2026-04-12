# Polymorphism Spec — Protocols, Records, Keyword Hierarchy, and Discoverability

> **Status:** Design complete — Session 146. Implementation begins Session 147.
>
> This spec covers all planned polymorphism and introspection features for cljam. It is the authoritative design reference. Update it when decisions change.

---

## Philosophy

> Every cljam value knows what it is, what it contains, and what it can do. This information is always accessible as plain data, and the printer shows a clean, unambiguous representation by default.

This is a deliberate divergence from JVM Clojure, where protocol and record introspection is buried in implementation details and not surfaced cleanly. In cljam we control the full stack — the type system, the printer, the REPL, and eventually the MCP server. These must all be designed around the same core value: **legibility**.

Legibility matters for humans at the REPL. It matters even more for LLM agents that will one day manipulate a live cljam session. A self-describing runtime is both human-friendly and machine-friendly for the same underlying reason: it externalises knowledge that would otherwise have to be memorised.

---

## Part 1 — Protocols (`defprotocol`, `extend-protocol`, `extend-type`, `satisfies?`)

### 1.1 What a protocol is

A protocol is a **named contract** — a set of function signatures that a type can implement. It is the mechanism for type-based polymorphism in cljam.

Defining a protocol creates:
1. A `CljProtocol` object stored as a var in the current namespace (`myns/IShape`)
2. One dispatch function var per method (`myns/area`, `myns/perimeter`) — each a `CljNativeFunction` that closes over the protocol's impl table

### 1.2 Syntax

```clojure
(defprotocol IShape
  "Abstraction over geometric shapes."
  (area [this] "Compute the area.")
  (perimeter [this] "Compute the perimeter."))
```

After evaluation:
- `myns/IShape` → `CljProtocol` value
- `myns/area` → dispatch function (native fn, closes over `IShape`)
- `myns/perimeter` → dispatch function (native fn, closes over `IShape`)

The dispatch functions are **regular callables** from the evaluator's perspective. `(area x)` is resolved and dispatched exactly like any other function call — no special case in `dispatch.ts`. The type dispatch happens inside the function, not at the call site.

### 1.3 Type Name Registry

Protocol implementations are registered against a **type tag** — the string that identifies a cljam value's kind. The mapping from the symbol you write in Clojure code to the underlying `kind` is:

| Written in Clojure | `kind` matched |
|---|---|
| `nil` | `'nil'` |
| `String` | `'string'` |
| `Number` | `'number'` |
| `Boolean` | `'boolean'` |
| `Keyword` | `'keyword'` |
| `Symbol` | `'symbol'` |
| `List` | `'list'` |
| `Vector` | `'vector'` |
| `Map` | `'map'` |
| `Set` | `'set'` |
| `Function` | `'function'` |
| `NativeFunction` | `'native-function'` |
| `Atom` | `'atom'` |
| `LazySeq` | `'lazy-seq'` |
| `Cons` | `'cons'` |
| `Regex` | `'regex'` |
| `Var` | `'var'` |
| `JsValue` | `'js-value'` |
| Any defrecord name | `kind === 'record' && qualifiedType === 'my.ns/Name'` |

**Built-in type names are global** — `String`, `Number`, `nil`, etc. have no namespace prefix because they are singletons in the type system. **Record type tags are always namespace-qualified** — `my.shapes/Circle` and `other.shapes/Circle` are different entries in every protocol's impl table. Two `defrecord Circle` in different namespaces never collide.

This registry lives in a TypeScript map consulted when `extend-protocol` or `defrecord` runs. No reflection, no classpath — O(1) map lookup.

### 1.4 Extending types

```clojure
;; extend-protocol: one protocol, multiple types
(extend-protocol IShape
  nil
  (area [_] 0)
  (perimeter [_] 0)

  String
  (area [s] (count s))
  (perimeter [s] (* 2 (count s))))

;; extend-type: one type, multiple protocols
(extend-type Circle
  IShape
  (area [this] (* Math/PI (:radius this) (:radius this)))
  (perimeter [this] (* 2 Math/PI (:radius this)))

  ISerializable
  (to-json [this] (str "{\"radius\":" (:radius this) "}")))
```

### 1.5 Protocol dispatch internals

```
CljProtocol = {
  name: string
  ns: string
  fns: string[]
  meta: CljMap // with doc?: string
  impls: Map<string, Record<string, CljFunction | CljNativeFunction>>
  //          ^ type-tag   ^ fn-name → implementation
}
```

Dispatch algorithm inside each protocol function:
1. Get `args[0]`
2. Compute type tag:
   - If `value.kind === 'record'`: tag = `value.ns + '/' + value.recordType`  (e.g. `"my.shapes/Circle"`)
   - Otherwise: tag = `value.kind`  (e.g. `"string"`, `"nil"`, `"number"`)
3. Look up `protocol.impls.get(tag)`
4. If found: call `impl[fnName](args)`
5. If not found: throw `No implementation of 'area' for type 'my.shapes/Circle'`

**Namespace isolation is complete**: `my.shapes/Circle` and `other.shapes/Circle` are different keys in every protocol's impl table. `(extend-protocol IShape Circle ...)` in `my.shapes` registers under `"my.shapes/Circle"` and cannot be seen by or overwritten by the same form in `other.shapes`.

### 1.6 Namespace scoping and name collisions

Protocols are fully namespace-scoped. `my.shapes/IShape` and `other.shapes/IShape` are independent protocol objects with independent impl tables. Calling `(ms/area x)` dispatches through `my.shapes/IShape.impls`; calling `(os/area x)` dispatches through `other.shapes/IShape.impls`.

**Name collision footgun**: If two `defprotocol` forms in the **same namespace** declare a method with the same name (e.g. both declare `area`), the second `defprotocol` overwrites the `area` var. The first protocol object still exists and has its impl table intact, but its dispatch function is no longer reachable via the symbol `area`. This matches JVM Clojure behaviour.

**Mitigation**: emit a compile-time warning when `defprotocol` would shadow an existing protocol function var.

### 1.7 `satisfies?`

```clojure
(satisfies? IShape (->Circle 5))  ;; => true
(satisfies? IShape "hello")        ;; => false if not implemented
(satisfies? IShape nil)            ;; => true if nil extended
```

---

## Part 2 — Records (`defrecord`)

### 2.1 What a record is

A record is a **named, typed persistent map**. It has:
- A constructor: `->Circle` (positional), `map->Circle` (map-based)
- Named fields: accessible as map keys (`:radius`)
- A type tag: `{ kind: 'record', ns: 'my.shapes', recordType: 'Circle' }` — the dispatch key is always the qualified form `"my.shapes/Circle"`
- Protocol implementations: registered at definition time under the qualified type tag

Records remain full maps: `get`, `assoc`, `dissoc`, `keys`, `merge` all work. The type tag distinguishes them from plain maps for protocol dispatch.

### 2.2 Syntax

```clojure
(defrecord Circle [radius]
  IShape
  (area [this] (* Math/PI radius radius))
  (perimeter [this] (* 2 Math/PI radius)))
```

Field names (`radius`) are accessible directly in method bodies — `defrecord` expansion binds them via destructuring. Equivalently, `(:radius this)` always works.

### 2.3 Internal representation

```typescript
type CljRecord = {
  kind: 'record'
  recordType: string            // unqualified name: 'Circle'
  ns: string                    // defining namespace: 'my.shapes'
  // dispatch key = ns + '/' + recordType = 'my.shapes/Circle'
  fields: [CljValue, CljValue][]  // same structure as CljMap
  meta?: CljMap
}
```

`CljRecord` is added to the `CljValue` union. All map functions check for both `kind === 'map'` and `kind === 'record'` where appropriate. The `ns` field is stamped at `defrecord` evaluation time using the current namespace — the same way `def` stamps vars with their namespace.

### 2.4 Auto-implemented behaviours

`defrecord` automatically provides:
- `IPrintable` implementation (see Part 4): renders as `#Circle{:radius 5}`
- Default `=` / `hash` semantics based on type + field values
- A `describe` entry (see Part 3)

---

## Part 3 — Discoverability (`describe`, `protocols`, `extenders`)

### 3.1 Core functions

```clojure
;; What protocols does a VALUE implement?
(protocols (->Circle 5))
;; => [my.shapes/IShape other.shapes/ISerializable]

;; What types have extended a protocol?
(extenders IShape)
;; => ["my.shapes/Circle" "my.shapes/Rectangle" "nil"]

;; Does a value implement a protocol?
(satisfies? IShape my-circle)
;; => true

;; Comprehensive description of any value — returns plain map
(describe (->Circle 5))
;; => {:type     :record
;;     :name     "Circle"
;;     :ns       "my.shapes"
;;     :fields   {:radius 5}
;;     :implements [{:protocol "my.shapes/IShape"
;;                   :methods  [(area [this]) (perimeter [this])]}]}

(describe IShape)
;; => {:type         :protocol
;;     :name         "IShape"
;;     :ns           "my.shapes"
;;     :docstring    "Abstraction over geometric shapes."
;;     :methods      [{:name "area"      :arglists [[this]] :doc "Compute the area."}
;;                    {:name "perimeter" :arglists [[this]] :doc "Compute the perimeter."}]
;;     :implementors [Circle Rectangle nil]}

(describe (find-ns 'my.app))
;; => {:type :namespace
;;     :name "my.app"
;;     :vars {:circle  {:type :record   :fields [:radius] :implements [IShape]}
;;            :area    {:type :protocol-fn :protocol "my.shapes/IShape" :arglists [[this]]}
;;            :greet   {:type :function :arglists [[name]]}}}
```

`describe` always returns a **plain Clojure map** — composable, printable, diffable, EDN-serialisable. LLM agents and REPL users can `get-in`, `filter`, `keys` on it like any other data.

### 3.2 Implementation notes

- `protocols` walks the global protocol registry and checks `protocol.impls.has(typeTagOf(value))`
- `extenders` reads `protocol.impls.keys()` and maps back to type names
- `describe` is implemented primarily in Clojure source (`core.clj` or a dedicated `cljam.inspect` namespace) using the above primitives, not as a monolithic native function
- All these functions are in scope as part of the core library — no require needed

---

## Part 4 — The Printer Protocol (`IPrintable`)

### 4.1 Motivation

Today `printer.ts` is a large switch over `value.kind`. This is closed — users cannot customise how their records or types print. The printer protocol opens this up.

### 4.2 Design

```clojure
(defprotocol IPrintable
  (print-str [this] "Return the string representation of this value for printing."))
```

`IPrintable` is a **bootstrap protocol** — seeded at runtime initialisation with native implementations for all built-in types. It is defined in the `clojure.core` namespace.

`defrecord` automatically extends `IPrintable` with a default renderer:
```clojure
;; Auto-generated by defrecord Circle [radius]:
(extend-protocol IPrintable
  Circle
  (print-str [this] (str "#Circle" (print-str (into {} this)))))
```

Users can override:
```clojure
(extend-protocol IPrintable
  Circle
  (print-str [this] (str "Circle(r=" (:radius this) ")")))

(str (->Circle 5))  ;; => "Circle(r=5)"
(println (->Circle 5))  ;; prints: Circle(r=5)
```

### 4.3 Bootstrap strategy

The native printer (`printer.ts`) is kept as the **fallback**. The protocol dispatch is checked first; if a type has an `IPrintable` implementation, it is used. If not (during bootstrap, before the protocol system is initialised), the native switch runs.

This means the transition is safe: existing behaviour is unchanged until a record or user type actively extends `IPrintable`.

### 4.4 `str` integration

`str` already concatenates values. After this change, `str` routes through `IPrintable/print-str` for each argument, making record-to-string conversion automatic.

---

## Part 5 — Keyword Hierarchy (`isa?`, `derive`, `make-hierarchy`)

### 5.1 What it is

The hierarchy system lets you declare parent/child relationships between keywords (and symbols), then query those relationships. It is used by multimethod dispatch to support "inheritance-like" routing.

```clojure
;; Global hierarchy (default)
(derive :dog :animal)
(derive :cat :animal)
(derive :labrador :dog)

(isa? :labrador :dog)     ;; => true
(isa? :labrador :animal)  ;; => true (transitive)
(isa? :cat :dog)          ;; => false

(ancestors :labrador)     ;; => #{:dog :animal}
(descendants :animal)     ;; => #{:dog :cat :labrador}
(parents :labrador)       ;; => #{:dog}
```

### 5.2 Multimethod integration

Multimethods check the hierarchy during dispatch. If a method is registered for `:animal` and the dispatch value is `:dog`, the `:animal` method fires (because `:dog isa? :animal`).

This requires a small change to `dispatchMultiMethod` in `dispatch.ts`: after the exact match check fails, walk the registered methods and check `isa?` for each.

### 5.3 Data representation

The hierarchy is a plain Clojure map (fully inspectable):
```clojure
{:parents    {:labrador #{:dog} :dog #{:animal} :cat #{:animal}}
 :ancestors  {:labrador #{:dog :animal} :dog #{:animal} :cat #{:animal}}
 :descendants {:animal #{:dog :cat :labrador} :dog #{:labrador}}}
```

### 5.4 Functions

| Function | Description |
|---|---|
| `(make-hierarchy)` | Create a new empty hierarchy |
| `(derive tag parent)` | Add relationship to global hierarchy |
| `(derive h tag parent)` | Add relationship to explicit hierarchy |
| `(underive tag parent)` | Remove relationship from global hierarchy |
| `(underive h tag parent)` | Remove relationship from explicit hierarchy |
| `(isa? child parent)` | True if child is or descends from parent (global hierarchy) |
| `(isa? h child parent)` | Same against explicit hierarchy |
| `(parents tag)` | Direct parents in global hierarchy |
| `(ancestors tag)` | All ancestors (transitive) in global hierarchy |
| `(descendants tag)` | All descendants (transitive) in global hierarchy |

### 5.5 Implementation notes

The global hierarchy lives in an atom: `(def ^:dynamic *hierarchy* (atom (make-hierarchy)))`.

Most of the implementation can be written in `core.clj` as pure Clojure functions operating on maps. The only native pieces are:
- `make-hierarchy` (creates the empty map)
- Integration with `dispatchMultiMethod`

---

## Part 6 — Blast Radius and Phasing

### 6.1 What changes in the existing codebase

| File | Change |
|---|---|
| `types.ts` | Add `CljProtocol`, `CljRecord` to `CljValue` union |
| `printer.ts` | Check `IPrintable` before native switch; small additive change |
| `dispatch.ts` | Multimethod dispatch: add `isa?` check after exact match (keyword hierarchy only) |
| `core.clj` | Append: `defprotocol`, `extend-protocol`, `extend-type`, `defrecord`, `IPrintable`, hierarchy fns |

### 6.2 What is purely additive (zero existing-code impact)

| File | What |
|---|---|
| New `stdlib/protocols.ts` | `make-protocol!`, `extend-protocol!`, `satisfies?`, `protocols`, `extenders`, `describe` native fns |
| New `stdlib/hierarchy.ts` | `make-hierarchy`, `derive!`, `underive!`, `isa?` native fns |

### 6.3 Phasing

**Phase A — Protocols + Records (one session):**
- `CljProtocol`, `CljRecord` types
- `make-protocol!`, `extend-protocol!`, `satisfies?` native fns
- `defprotocol`, `extend-protocol`, `extend-type`, `defrecord` macros
- `protocols`, `extenders` introspection fns
- `describe` for records and protocols

**Phase B — Printer protocol (same session or next):**
- `IPrintable` bootstrap protocol
- Native implementations for all built-in types
- Auto-implementation in `defrecord`
- `str` integration

**Phase C — Keyword hierarchy (separate session):**
- `make-hierarchy`, `derive`, `isa?`, `ancestors`, `descendants`, `parents`
- Global `*hierarchy*` atom
- Multimethod dispatch integration

---

## Summary

The through-line of all these features is: **cljam should be a legible runtime**. Protocols and records are the extensibility mechanism. Discoverability (`describe`, `protocols`, `extenders`) makes the system observable. The printer protocol makes rendering customisable and extensible. The keyword hierarchy adds expressive power to multimethod dispatch. Together they give cljam the polymorphism story that serious projects need, built on top of a foundation that both humans and LLM agents can explore and understand.
