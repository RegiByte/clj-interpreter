# Spec: Dot-Path Interop — `$(...)` Reader Macro

**Status:** Proposal
**Author:** Claude (Session 128 analysis)
**Relates to:** Session 127 — deferred design discussion

---

## 1. The Problem

JS interop today requires the `(. obj method args...)` special form. It works, but it has friction:

```clojure
;; Current — functional, but noisy
(. path join "a" "b")
(. js/Math pow 2 3)
(. js/console log "hello")
(. (. response headers) get "content-type")  ;; chained access
```

There are two specific cases that came up in Session 127:

**Case A — `js/console.log` style:** When you have a `js/`-qualified symbol where the
name part contains dots (e.g. `console.log`). These are already produced by the tokenizer
as a single symbol `{namespace: "js", name: "console.log"}` but the evaluator then tries
to look up the var named `"console.log"` in the `js` namespace — which doesn't exist.
So `(js/console.log "hello")` currently **fails**.

**Case B — `path.join` style:** When you have a module alias (e.g. `path` from
`(:require ["node:path" :as path])`) and want to call a method on it ergonomically.
`path.join` tokenizes as a single symbol, and the evaluator does `lookup("path.join", env)`
— which fails unless something was literally bound under that name.

The user proposal was: a `$` reader dispatch that expands `$(path.join "a" "b")` to a
`(js-resolve* path.join "a" "b")` call, similar to how `#(...)` expands to `(fn [...] ...)`.

---

## 2. Existing Interop Vocabulary (for context)

Before proposing new syntax, it's worth charting what we already have:

| Pattern | Example | What it does |
|---|---|---|
| Dot form | `(. obj method args)` | Method call / property access |
| `js/get` | `(js/get obj "key")` | Dynamic property read |
| `js/set!` | `(js/set! obj "key" val)` | Dynamic property write |
| `js/call` | `(js/call fn args)` | Call JS fn with no `this` |
| `js/new` | `(js/new ClassName args)` | Constructor call |
| `hostBindings` | `js/Math`, `js/console` | Inject host globals |

The `(. ...)` form covers Cases A and B completely — it's just verbose. Everything
below is about ergonomics, not capability.

---

## 3. My Assessment of the `js-resolve*` Approach

The user proposed: `$(path.join "a" "b")` → `(js-resolve* path.join "a" "b")`

**The problem:** `js-resolve*` would need to receive the symbol `path.join` as a *value*.
But symbols evaluate before reaching a function. If `path.join` evaluates, the evaluator
tries `lookup("path.join", env)` — same failure as today.

The only way out is quoting: `(js-resolve* 'path.join "a" "b")`. But then `js-resolve*`
receives a quoted symbol and needs to inspect its name, split on dots, look up the object
by name in the calling environment — which a function cannot do (functions don't see the
caller's lexical scope).

The alternatives are worse:
- Make `js-resolve*` a macro (now it needs the macro system, complicates evaluation order)
- Pass the object separately: `(js-resolve* path "join" "a" "b")` — this is just `(. path join "a" "b")` with a different name

**The `js-resolve*` middleman is unnecessary.** The right tool is a pure reader transform.

---

## 4. My Counterproposal: Pure Reader Expansion to `(.  ...)` Chains

The `$` dispatch should be a reader-level macro that transforms dot-path calls **at read
time** into nested `(. ...)` forms. No new runtime function needed. The compiler already
knows how to compile `(. ...)`. Error messages point to `(. ...)` forms users understand.

### Expansion Rules

Given `$(head arg1 arg2 ...)`:

1. Extract the `head` expression and `args` from the list.
2. If `head` is a symbol (qualified or unqualified), check for dots **in the name part**:
   - Qualified `ns/name`: split only the `name` part on dots. The `ns/first-segment` is the
     object; remaining segments are property accesses.
   - Unqualified `a.b.c.d`: split the whole name on dots. First segment is the object;
     remaining segments are property accesses.
3. Build a nested `(. ...)` chain from the segments.
4. If `head` has no dots in the name (e.g. `my-ns.core/fn`), pass through as `(head args)`.
5. If `head` is a non-symbol expression (e.g. `(get-obj)`), treat it as the object and
   require the first arg to be the method name — or just pass through as `(head args)`.

### Expansion Examples

```clojure
;; Case A — js/ qualified, dots in name part
$(js/console.log "hello")
;; → (. js/console log "hello")

$(js/Math.pow 2 3)
;; → (. js/Math pow 2 3)

;; Case B — alias-qualified, plain symbol with dots
$(path.join "a" "b")
;; → (. path join "a" "b")

$(path.basename "/foo/bar.ts")
;; → (. path basename "/foo/bar.ts")

;; Deep chain — a.b.c.d x → nested property accesses + call
$(a.b.c.d x y)
;; → (. (. (. a b) c) d x y)

;; Property read, zero extra args
$(js/console.log)
;; → (. js/console log)
;; This returns the function reference — consistent with (. obj prop) semantics

;; Chained access on the result
$($(path.resolve ".").length)
;; → (. (. path resolve ".") length)
;; (or with explicit nesting — see "composition" section below)

;; No-op: qualified symbol, dot only in namespace part
$(my-ns.core/fn arg)
;; → (my-ns.core/fn arg)   — name is "fn", no dots, pass through
```

### The Dot Ambiguity Is Resolved Naturally

The critical edge case is `my-ns.core/fn` — a Clojure-style namespaced symbol where the
dots are in the **namespace** part, not the name part. The rule "only expand dots in the
name part after `/`" handles this perfectly:

- `js/console.log` → namespace=`js`, name=`console.log` → **expand** → `(. js/console log)`
- `my-ns.core/fn` → namespace=`my-ns.core`, name=`fn` → **no dots in name** → pass through
- `path.join` → no `/` → treat entire thing as dot-chain → `(. path join)`
- `a.b.c.d` → no `/` → deep chain → `(. (. (. a b) c) d)`

This means `$(my-ns.core/fn arg)` is strictly equivalent to `(my-ns.core/fn arg)` — the
`$` wrapper is a no-op. That's fine; it's not an error, and it gives users a consistent
habit ("always use `$` for JS-ish calls").

---

## 5. Implementation Sketch

### Tokenizer change: add `$` dispatch

In `tokenizer.ts`, `parseDispatch` currently handles `#`. We add a parallel handler for `$`:

```typescript
// In tokenParseEntries:
[(char) => char === '$', parseDollarDispatch]

function parseDollarDispatch(ctx): Token {
  const start = ctx.scanner.position()
  ctx.scanner.advance() // consume '$'
  const next = ctx.scanner.peek()
  if (next === '(') {
    ctx.scanner.advance() // consume '('
    return { kind: 'DotCallStart', start, end: ctx.scanner.position() }
  }
  throw new TokenizerError(`Unknown dispatch: $${next ?? 'EOF'}`, start)
}
```

(Or `$` could be handled as a new dispatch character in `parseDispatch` instead of a
separate function — either works.)

### Reader change: expand `DotCallStart`

In `reader.ts`, add a `readDotCall` function and a case in `readForm`:

```typescript
case tokenKeywords.DotCallStart:
  return readDotCall(ctx)
```

```typescript
const readDotCall = (ctx: ReaderCtx): CljValue => {
  // consume DotCallStart — reads like readList but transforms the result
  const forms = readUntilClose(ctx, tokenKeywords.RParen)
  if (forms.length === 0) throw new ReaderError('$() requires a head expression')

  const [head, ...args] = forms
  return expandDotCall(head, args)
}

function expandDotCall(head: CljValue, args: CljValue[]): CljValue {
  if (!is.symbol(head)) {
    // Non-symbol head — pass through as normal call
    return v.list([head, ...args])
  }

  const name = head.name
  const slashIdx = name.indexOf('/')

  let objectExpr: CljValue
  let propertyChain: string[]

  if (slashIdx > 0) {
    // Qualified: ns/name — check name part for dots
    const ns = name.slice(0, slashIdx)
    const localName = name.slice(slashIdx + 1)
    const dotIdx = localName.indexOf('.')
    if (dotIdx < 0) {
      // No dots in name — pass through
      return v.list([head, ...args])
    }
    const segments = localName.split('.')
    // Object is ns/first-segment
    objectExpr = v.symbol(`${ns}/${segments[0]}`)
    propertyChain = segments.slice(1)
  } else {
    // Unqualified — split entire name on dots
    const segments = name.split('.')
    if (segments.length === 1) {
      // No dots — pass through
      return v.list([head, ...args])
    }
    objectExpr = v.symbol(segments[0])
    propertyChain = segments.slice(1)
  }

  // Build nested (. ...) chain for intermediate property accesses
  let current: CljValue = objectExpr
  for (let i = 0; i < propertyChain.length - 1; i++) {
    current = v.list([v.symbol('.'), current, v.symbol(propertyChain[i])])
  }

  // Final form: include args on the innermost method call
  const lastProp = propertyChain[propertyChain.length - 1]
  return v.list([v.symbol('.'), current, v.symbol(lastProp), ...args])
}
```

That's it. ~50 lines across two files. No new runtime function. No new evaluator case.
No compiler changes. The `(. ...)` machinery already handles everything.

---

## 6. What About Case A Alone (Without `$`)?

Case A — `js/console.log` in call position — can be fixed **without any new syntax** by
changing the symbol evaluator in `evaluate.ts`:

```typescript
case valueKeywords.symbol: {
  const slashIdx = expr.name.indexOf('/')
  if (slashIdx > 0) {
    const alias = expr.name.slice(0, slashIdx)
    const sym = expr.name.slice(slashIdx + 1)
    // NEW: if sym contains dots, do a property chain lookup
    if (sym.includes('.')) {
      const segments = sym.split('.')
      const nsEnv = getNamespaceEnv(env)
      const targetNs = nsEnv.ns?.aliases.get(alias) ?? ctx.resolveNs(alias) ?? null
      if (!targetNs) throw new EvaluationError(...)
      const rootVar = targetNs.vars.get(segments[0])
      if (!rootVar) throw new EvaluationError(...)
      let result: CljValue = derefValue(rootVar)
      for (const prop of segments.slice(1)) {
        // property access via js-interop
        result = jsToClj((result as any).value?.[prop])
      }
      return result
    }
    // ... existing qualified symbol handling
  }
}
```

This is a targeted, contained fix for Case A. It makes `js/console.log` resolve by
doing `js.console["log"]` — correct behavior with no new syntax.

However, it only fixes **evaluation** of `js/` symbols. It doesn't fix them in **call
position** (e.g. `(js/console.log "hi")`) because call position is handled in
`evaluateList`/`dispatch.ts`, which reads the head as an expression first.

For call position, you'd also need a reader transform or an evaluator special case
in `evaluateList`. At that point, you're doing the reader transform anyway — so the
`$()` macro is cleaner.

**My recommendation: fix Case A in the evaluator as a standalone improvement, AND add
`$()` for ergonomic call syntax.**

---

## 7. Composition and HOF Usage

One of the best things about this design: `$(...)` composes naturally because it expands
to `(. ...)` at read time, and `(. ...)` returns normal CljValues.

```clojure
;; In a threading macro
(-> "/usr/local/bin/conjure"
    #($(path.dirname %))    ;; works — expands before eval
    #($(path.basename %)))

;; In a map — using #() for the lambda
(mapv #($(path.extname %)) ["index.ts" "core.clj" "styles.css"])
;; expands to:
(mapv #(. path extname %) ["index.ts" "core.clj" "styles.css"])

;; Nested calls
$(path.dirname $(path.join "a" "b"))
;; → (. path dirname (. path join "a" "b"))
```

The `$()` form is not a HOF-friendly value on its own (it's a call site, not a function
reference). For first-class function references, users still use `(js/get path "join")`
or `(. path join)` (zero-args = property access = function reference). That's fine and
consistent with how Clojure interop works — you don't pull `String.prototype.toUpperCase`
out of thin air either.

---

## 8. What I Would NOT Do

### Against `js-resolve*` as a runtime function

As analyzed in §3: the only way a runtime function can access the name of an unbound
symbol (`path.join`) is if the symbol is quoted. At that point the function needs access
to the caller's lexical scope to resolve `path` — which is impossible for a regular
function. Making it a macro is possible but adds complexity with no gain over a pure
reader transform.

### Against automatic `js/symbol.chain` in the evaluator only

Fixing `js/console.log` in the evaluator (§6) is a good standalone fix. But extending
this to ALL qualified symbols with dots (e.g. `path.join` where `path` is an alias)
blurs the line between Clojure namespaces and JS property access. The rule
"aliases can have dots in them" (`my-ns.core`) and "property access uses dots in the name
part of `js/`-qualified symbols" would now be generalized to ALL namespace aliases — which
is surprising and potentially ambiguous.

The `$()` reader macro is better because it is **explicit** — the user declares "this is
a dot-path call", and the expansion is visible and predictable.

### Against using `#.` as the dispatch character

`#.(path.join "a" "b")` would be an alternative sigil. It's more "Lispy" but:
- `#` already dispatches on the **next character** in `parseDispatch` — adding `.` is a minor change
- But `#.` reads as "hash-dot" — could be confused with interop syntax from other languages (e.g. Kotlin's `?.`)
- `$` is clean, visually distinct, and has existing precedent in template literal contexts as a "JS-land marker"

### Against making `$(...)` a special form

The power of making it a pure reader transform is that the evaluator and compiler never
see `$`. They only see `(. ...)`. No new dispatch case, no new compiler phase, no new
type in the AST. The simplicity is the feature.

---

## 9. Open Questions

1. **Should `$(plain-symbol args)` with no dots pass through silently, or be a reader error?**
   I lean toward silent pass-through — `$(inc 5)` → `(inc 5)`. This makes `$` usable
   as a general "I'm calling into JS land" marker even for cases where no dot expansion
   is needed, which is ergonomically nice.

2. **Should `$` support non-list forms?** E.g. `$path.join` as a property reference
   without a call. This could expand `$sym` (not wrapped in parens) to a chain of
   property reads. I'd leave this out of V1 — call sites are the common case.

3. **Compiler support:** The compiler already compiles `(. ...)`. Since `$()` expands
   before the compiler sees anything, no compiler changes are needed. This is a gift.

4. **Error messages:** A user who writes `$(path.join "a" "b")` and `path` isn't loaded
   will get an error from `(. path join "a" "b")`. The `(. ...)` form is visible in
   the expanded source if you print the AST. We could thread a position through from
   the original `$` token to improve error location.

---

## 10. Recommendation

**Ship in two phases:**

**Phase 1 (evaluator only, no new syntax):**
Fix `js/console.log` and similar in the symbol evaluator. When a qualified symbol's name
part contains dots, resolve by walking the property chain. This is a one-method change
in `evaluate.ts`, non-breaking, and handles the most common frustration (`js/Math.PI`,
`js/console.log`, etc.).

**Phase 2 (reader macro):**
Add `$(...)` as a reader-level dispatch that expands to `(. ...)` chains. This covers
`path.join` style (alias-qualified property access) and makes the pattern composable
and explicit. Implementation is ~50 lines: tokenizer dispatch + reader transform function.

Together, these two changes cover both cases from Session 127 cleanly, require zero
runtime function additions, and leave the evaluator/compiler untouched for Phase 2.

---

## Appendix: Side-by-Side Comparison

```clojure
;; Before                                After (both phases)

;; js/ globals
(. js/Math pow 2 3)                   →   $(js/Math.pow 2 3)
(. js/console log "hello")            →   $(js/console.log "hello")

;; Module alias
(. path join "a" "b")                 →   $(path.join "a" "b")
(. path dirname "/usr/local")         →   $(path.dirname "/usr/local")

;; Chained
(. (. obj foo) bar 1 2)               →   $(obj.foo.bar 1 2)

;; HOF with anon fn
(mapv #(. path extname %) files)      →   (mapv #($(path.extname %)) files)

;; No change needed — format.clj already uses these verbosely:
(let [parse-iso (js/get date-fns "parseISO")
      fmt       (js/get date-fns "format")])
;; → could become:
(let [parse-iso $(date-fns.parseISO)    ;; property read
      fmt       $(date-fns.format)])     ;; property read
```

The verbosity reduction is real. More importantly, the pattern is **familiar to JS
developers** who know `obj.method()` — the `$()` wrapper is a clear interop boundary,
not magic.
