# cljam Core Language

> This document defines the **minimal post-expansion language** — the set of forms that survive macro expansion and reach the evaluator. This is the **compilation target**: what a compiler must handle to compile all valid cljam programs.
>
> Everything above this level is syntax sugar, macros, or reader transforms that reduce to these forms before evaluation begins.

---

## Overview

The cljam evaluator pipeline:

```
Source (.clj)
  → Tokenizer
  → Reader          ← quasiquote handled here (reader transform)
  → Expander        ← all macros expand here; quasiquote completes here
  → Core Language   ← the forms defined in this document
  → Evaluator / Compiler
  → CljValue
```

After the expander runs, only the forms listed in this document remain. Macros are gone. `defmacro`, `when`, `->`, `cond`, `letfn`, `defmulti`, `defmethod`, `delay` — all expanded to core forms. The evaluator and any future compiler only need to handle what is listed below.

---

## Tier 1 — True Primitives

These forms cannot be implemented as macros. The evaluator and compiler handle them explicitly.

---

### Literals

Self-evaluating values. A literal compiles to a constant closure: `() => value`.

| Form | Examples |
|------|---------|
| Nil | `nil` |
| Boolean | `true`, `false` |
| Integer | `42`, `-7` |
| Float | `3.14`, `-0.5` |
| String | `"hello"` |
| Keyword | `:foo`, `::bar`, `:ns/kw` |
| Character | `\a`, `\newline`, `\space` |
| Regex | `#"pattern"` |

---

### Collection Literals

```
[expr*]     — vector literal
{expr*}     — map literal (must have even number of forms)
#{expr*}    — set literal
```

Each element is evaluated left-to-right. Compiles to: evaluate all elements, construct the collection.

---

### Symbol

```
sym
```

Look up `sym` in the lexical env chain; deref the var. Compiles to: `(env) => lookup("sym", env)`. With slot indexing: `(env) => env[slot]`.

---

### `quote`

```clojure
(quote x)
```

Returns `x` unevaluated. `x` is any value — symbol, list, map, etc. Compiles to a constant.

---

### `if`

```clojure
(if test then)
(if test then else)
```

Evaluates `test`. If truthy (not `nil` and not `false`), evaluates and returns `then`. Otherwise evaluates and returns `else` (or `nil` if absent). **Short-circuits** — only one branch is evaluated.

Compiles to: `(env) => isTruthy(test(env)) ? then(env) : else(env)`.

---

### `do`

```clojure
(do expr*)
```

Evaluates each expression in order. Returns the value of the last expression. Returns `nil` if no expressions.

Compiles to: evaluate all in sequence, return last.

---

### `let*`

```clojure
(let* [sym1 val1  sym2 val2  ...] body*)
```

Introduces lexical bindings. Each `sym` is bound to its `val` in a new scope frame. Bindings are sequential — `sym2` can reference `sym1`. Body expressions are evaluated in sequence; the last is returned.

**Slot indexing opportunity:** At compile time, the slot position of each `sym` is known. The compiler assigns integer slots instead of name-based env lookup.

Compiles to:
```javascript
(env) => {
  const env1 = extend(env, slot0, val1(env))
  const env2 = extend(env1, slot1, val2(env1))
  return body(env2)
}
```

---

### `fn*`

```clojure
(fn* name? [params] body*)
(fn* name? ([params] body*) ([params] body*) ...)
```

Creates a closure. Captures the lexical environment at creation time. Supports multi-arity, rest args (`& rest`), and destructuring in params.

The optional `name` is for self-reference (recursive anonymous functions) — it is bound in the function's own body scope.

Compiles to: `(env) => makeClosure(compiledBody, env)`. Params become slot-indexed entries in a new env frame.

---

### `letfn*`

```clojure
(letfn* [sym1 fn1  sym2 fn2  ...] body*)
```

Like `let*` but all bindings are in scope for all functions simultaneously. This is the mutual recursion primitive. `sym1` can call `sym2` and vice versa.

Used by the `letfn` macro (defined in `clojure/core.clj`):
```clojure
(defmacro letfn [fnspecs & body]
  `(letfn* ~(vec (interleave (map first fnspecs)
                             (map #(cons 'fn %) fnspecs)))
           ~@body))
```

---

### `loop*` and `recur`

```clojure
(loop* [sym1 init1  sym2 init2  ...] body*)
(recur new-val1 new-val2 ...)
```

`loop*` establishes a recursion point with initial bindings. `recur` jumps back to the nearest `loop*` (or `fn*` for self-tail-calls), rebinding the loop variables to new values. `recur` must be in tail position.

Compiles to a `while` loop — no stack growth:
```javascript
(env) => {
  let [s0, s1] = [init1(env), init2(env)]
  while (true) {
    const result = body(envWithSlots(s0, s1))
    if (result instanceof RecurSignal) { [s0, s1] = result.values; continue }
    return result
  }
}
```

---

### `def`

```clojure
(def sym)
(def sym val)
(def sym docstring val)
```

Interns a var in the current namespace. If the var already exists, updates its root binding. Returns the `CljVar`.

---

### `set!`

```clojure
(set! sym val)
```

Mutates the root binding of a var. Used for dynamic var binding stack mutation. In normal code, prefer `binding`.

---

### `var`

```clojure
(var sym)
```

Returns the `CljVar` object for `sym` without dereferencing it. Reader sugar: `#'sym`.

---

### `binding`

```clojure
(binding [^:dynamic sym1 val1  ^:dynamic sym2 val2  ...] body*)
```

Establishes dynamic var bindings for the duration of `body`. Thread-local in JVM Clojure; call-stack-scoped in cljam. All vars must be declared `^:dynamic`.

Used for `*out*`, `*err*`, `*print-length*`, and user-defined dynamic vars.

---

### `throw`

```clojure
(throw expr)
```

Evaluates `expr` and throws the result as an exception. Can throw any `CljValue`.

---

### `try`

```clojure
(try
  body*
  (catch ExType sym body*)
  (finally body*))
```

Executes `body`. On exception, finds a matching `catch` clause and executes its body with `sym` bound to the thrown value. `finally` body always runs (return value discarded). `catch` and `finally` are both optional.

`ExType` may be `js/Error` or any string/keyword that the runtime uses to match exception types.

---

### `.` (JS member access / method call)

```clojure
(. obj field)          — property access: obj.field
(. obj (method args*)) — method call: obj.method(args...)
```

The unified JS interop form. `obj` is evaluated; must hold a `CljJsValue`. Returns a `CljJsValue`.

Reader sugar: `(.method obj args*)` and `(.-field obj)`.

---

### `js/new`

```clojure
(js/new Constructor arg*)
```

Calls a JS constructor. Equivalent to `new Constructor(args...)`. Returns a `CljJsValue`.

---

### `async`

```clojure
(async body*)
```

Creates an async evaluation boundary. Evaluates `body` in an async context where `@` can be used to await `CljPending` values. Returns a `CljPending`.

The `async` form is cljam-specific. It is **not** equivalent to a JS `async` function — it is an explicit opt-in to async evaluation. The sync evaluator stays sync; `async` is the boundary.

---

### `lazy-seq`

```clojure
(lazy-seq body)
```

Creates a lazy sequence. `body` is not evaluated until the sequence is realized. Body must return `nil` (empty) or a `CljSeq`.

Used by the `lazy-seq` macro (in `clojure/core.clj`) which wraps body in a thunk automatically. The special form receives the pre-wrapped thunk.

---

## Tier 2 — Bootstrap-Only Forms

These forms appear during macro loading but should not appear in user programs after expansion.

### `defmacro`

```clojure
(defmacro name [params] body*)
```

Defines a macro. Sugar for `def` + `fn*` + `:macro true` metadata. Only meaningful during bootstrap. After bootstrap, macros are ordinary `CljFunction` values with `:macro true` metadata in their var.

### `ns`

```clojure
(ns name (:require ...) (:import ...) ...)
```

Declares and activates a namespace. Complex declaration form that sets the current namespace, processes requires and imports. Only meaningful at top-level.

---

## What Macros Expand To

For reference — the major macros and their expansion targets:

| Macro | Expands to core forms |
|-------|-----------------------|
| `let` | `let*` (after destructuring transform) |
| `letfn` | `letfn*` |
| `fn` | `fn*` (after destructuring transform) |
| `defn` | `def` + `fn*` |
| `when` | `if` + `do` |
| `when-not` | `if` + `do` |
| `and` | nested `if` |
| `or` | nested `if` + `let*` |
| `cond` | nested `if` |
| `->`, `->>` | nested function calls |
| `for` | `lazy-seq` + `let*` + `if` + `recur` |
| `doseq` | `loop*` + `recur` + `if` |
| `delay` | `make-delay` + `fn*` |
| `defmulti` | `def` + `make-multimethod` (with re-eval guard) |
| `defmethod` | `add-method!` |
| `with-out-str` | `binding` + `*out*` + `StringBuilder` |

---

## Forms Handled Before Evaluation

### Quasiquote

```clojure
`(foo ~x ~@ys)
```

Handled entirely by the **reader and expander**. Never reaches the evaluator.

Expands to:
```clojure
(seq (concat (list 'foo) (list x) ys))
```

The `quasiquote` symbol does not appear in the core language. It is a reader/expander concern only.

---

## Compiler Strategy (Reference)

See `docs/roadmap.md` Level 4 for the phased compilation plan.

Each core form compiles to a `CompiledExpr`:
```typescript
type CompiledExpr = (ctx: EvaluationContext) => CljValue
```

Key properties of compiled expressions:
- **Literals** → constant closures `() => value`
- **Symbols** → slot-indexed env access `(ctx) => ctx.env[slot]` (for `let*`-bound vars) or `ctx.resolveNs(ns).vars.get(name).deref()` (for dynamic/global vars)
- **`if`** → short-circuit: `(ctx) => isTruthy(test(ctx)) ? then(ctx) : else(ctx)`
- **`fn*`** → captures lexical env at creation: `(ctx) => makeClosure(compiledBody, ctx.env)`
- **`loop*`/`recur`** → `while` loop, no stack growth
- **Dynamic vars** → always resolved through `ctx.resolveNs` at call time, never captured at compile time

---

## Intentional Divergences from JVM Clojure

cljam-JS is not a port — it's an independent implementation that targets the same semantics where they make sense, and improves on them where it doesn't. The divergences below are deliberate.

### `:or` defaults in destructuring are evaluated lazily

In JVM Clojure, the `destructure` function generates `(get m k default-expr)` for
`:or` entries. Because Clojure uses applicative-order (eager) evaluation, `default-expr`
is always evaluated as an argument to `get` — even when `k` is already present in the map.

```clojure
;; JVM Clojure — default-expr runs even when :x is present
(let [called (atom false)]
  (let [{:keys [x] :or {x (do (reset! called true) 99)}} {:x 42}]
    @called))
;; => true  (default expression ran)
```

cljam-JS generates `(if (contains? m k) (get m k) default-expr)` instead. The
default expression is only evaluated when the key is absent.

```clojure
;; cljam-JS — default-expr only runs when :x is missing
(let [called (atom false)]
  (let [{:keys [x] :or {x (do (reset! called true) 99)}} {:x 42}]
    @called))
;; => false  (default expression skipped)
```

**Why JVM Clojure behaves this way:** `destructure` is a code generator (a macro-time
function). Its job is to emit binding forms using existing primitives. `get` was the
natural primitive — it encodes the concept of "value or default" directly. The eager
evaluation of the default is an artifact of how function calls work in Clojure, not a
deliberate semantic choice about destructuring.

**Why cljam-JS diverges:** The generated code should accurately represent the user's
intent — "use this default *if* the key is missing." Emitting `if/contains?` makes the
code generator's output match the construct's meaning, rather than leaking the
implementation detail of which function was used to produce it.

**In practice:** This only matters when a `:or` default expression has side effects.
For the vast majority of uses — constants, simple data structures — behavior is
identical. Code relying on JVM Clojure's eager evaluation of `:or` defaults would be
surprising to most Clojure programmers anyway.
