# @regibyte/cljam

[![npm](https://img.shields.io/npm/v/%40regibyte%2Fcljam)](https://www.npmjs.com/package/@regibyte/cljam)
[![license](https://img.shields.io/npm/l/%40regibyte%2Fcljam)](LICENSE)

> **Status:** complete, not actively maintained (v0.1.0). Issues and PRs are reviewed; no further features are planned.

A Clojure interpreter written in TypeScript. Embeds in any JS/TS project as a library, runs as a standalone CLI on Node.js 18+ or Bun, and exposes a full nREPL server compatible with Calva, Cursive, and CIDER.

**[Try it in the browser →](https://regibyte.github.io/cljam/)**

***

## What it is

cljam is an **interpreter** with a real compiler front-end. Source code is read, macro-expanded, and **analyzed** into a resolved AST (lexical slots, closure capture sets, tail positions, precise malformed-form errors). Evaluation is a tree walk over that resolved AST; a bytecode VM shares the same front-end and is kept in exact semantic agreement by a differential test harness. There is no Clojure → JavaScript file output today.

It is designed to be embedded. The core session API is a plain TypeScript object: create a session, inject host capabilities, evaluate strings. The CLI and nREPL server are thin wrappers around the same session.

***

## Installation

```bash
# As a library
npm install @regibyte/cljam
# or
bun add @regibyte/cljam
```

```bash
# As a CLI (Node.js 18+ or Bun)
npm install -g @regibyte/cljam
# or
bun install -g @regibyte/cljam
```

***

## Embedding

```typescript
import { createSession, printString, nodePreset } from '@regibyte/cljam'

const session = createSession({
  ...nodePreset(),
})

const result = session.evaluate('(map inc [1 2 3])')
console.log(printString(result)) // => (2 3 4)
```

`nodePreset()` wires up Node.js filesystem and standard I/O. Use `browserPreset()` for the DOM, `sandboxPreset()` for an isolated evaluation context with no host access.

### Injecting host capabilities

`hostBindings` makes any TypeScript value available as `js/<key>` in Clojure:

```typescript
import { createSession, sandboxPreset } from '@regibyte/cljam'

const session = createSession({
  ...sandboxPreset(),
  hostBindings: {
    db: {
      findUser: (id: number) => ({ id, name: 'Alice' }),
    },
  },
})
```

```clojure
;; Method call: (. obj method args...)
(. js/db findUser 42)
;; => {:id 42 :name "Alice"}
```

### Using libraries

```typescript
import { createSession, nodePreset } from '@regibyte/cljam'
import { library as dateLib } from '@regibyte/cljam-date'

const session = createSession({
  ...nodePreset(),
  libraries: [dateLib],
})

session.evaluate(`
  (require '[cljam.date :as d])
  (d/to-iso (d/now))
`)
```

***

## CLI

```bash
# Interactive REPL
cljam repl

# Run a file
cljam run my-script.clj

# Start nREPL server (default port 7888)
cljam nrepl-server
cljam nrepl-server --port 7889 --host 0.0.0.0
```

***

## nREPL

Full TCP nREPL server with bencode transport. Supports `eval`, `load-file`, `complete`, `clone`, `close`, `describe`, and `interrupt`. Writes `.nrepl-port` on startup for auto-connect.

#### Calva (VS Code)

Add to `.vscode/settings.json`:

```json
{
  "calva.replConnectSequences": [
    {
      "name": "cljam nREPL",
      "projectType": "generic",
      "nReplPortFile": [".nrepl-port"]
    }
  ]
}
```

Then: **Calva: Connect to Running REPL Server in Project** → select `cljam nREPL`.

#### CIDER (Emacs)

```
M-x cider-connect RET
Host: localhost RET
Port: 7888 RET
```

#### Cursive (IntelliJ)

Run → Edit Configurations → `+` → Clojure REPL → Remote → host `localhost`, port `7888`.

***

## Source Root Discovery

When running `cljam nrepl-server` or `cljam run`, cljam reads the `cljam.sourceRoots` field from `package.json`:

```json
{
  "cljam": {
    "sourceRoots": ["src/clojure"]
  }
}
```

Source roots control how `require` resolves namespace files. Falls back to the current working directory if not set.

***

## Language Features

* Immutable collections: vectors, maps, sets, lists
* Namespaces with `ns`, `require`, `refer`, `alias`
* Multi-arity and variadic functions
* Sequential and associative destructuring (nested, `:keys`, `:syms`, `:strs`, kwargs)
* Macros: `defmacro`, quasiquote/unquote/splicing, `macroexpand`, `macroexpand-all`
* Atoms for controlled mutable state
* `loop`/`recur` with tail-call optimization
* Transducers: `transduce`, `into` with xf
* Threading macros: `->`, `->>`
* Anonymous function shorthand: `#(+ % 1)`
* `try/catch/finally` with predicate-based discriminators (no class hierarchy)
* Protocols and records: `defprotocol`, `defrecord`, `extend-protocol`, `extend-type`
* Multimethods: `defmulti`, `defmethod`, keyword hierarchy (`derive`, `isa?`)
* Character literals: `\a`, `\space`, `\newline`, `\uXXXX`
* EDN reader: `clojure.edn/read-string`, reader tags `#inst` and `#uuid`
* JS interop: `js/` namespace, `.` member access, `js/new`
* Async: `(async ...)` blocks with `@` as await, pending values as promises (`then`, `catch*`, `all`)

**Standard namespaces** bundled at startup: `clojure.core` `clojure.string` `clojure.edn` `clojure.math` `clojure.test` — all implemented in Clojure itself and readable in the source tree.

***

## JS Interop

Inject host values with `hostBindings`, then access them as `js/<key>` in Clojure:

```typescript
createSession({
  ...nodePreset(),
  hostBindings: { Math, console, myLib: require('./my-lib') },
})
```

```clojure
;; Method call: (. obj method args...)
(. js/Math pow 2 10)            ;; => 1024.0
(. js/console log "hello")

;; Constructors
(def now (js/new js/Date))
(. now toISOString)             ;; => "2026-04-14T..."

;; Injected objects — hostBindings: { myLib: require('./my-lib') }
(. js/myLib greet "world")      ;; => calls myLib.greet("world")

;; Call a bare function with no this binding
(js/call js/myFn 1 2 3)

;; Load a Node/npm module via (:require ["specifier" :as alias])
;; Requires importModule: (s) => import(s) in session options
```

```clojure
(ns demo
  (:require ["node:path" :as path]))

(. path join "a" "b" "c")      ;; => "a/b/c"
```

***

## Async

`(async body)` evaluates its body asynchronously and immediately returns a **pending value** — cljam's promise. Inside an `async` block, `@` (`deref`) on a pending awaits it, exactly like `await`:

```clojure
(async
  (let [user @(fetch-user 42)]        ; awaits
    (str "hello, " (:name user))))    ; => pending of "hello, ..."
```

```js
(async () => {
  const user = await fetchUser(42)    // awaits
  return `hello, ${user.name}`        // => Promise of "hello, ..."
})()
```

**Async is a lexical boundary, and closures never inherit it** — the JavaScript model. A `fn` defined inside an async block has a sync body; `@` there throws a teaching error, just as `await` inside a plain callback is a syntax error in JS. Give each callback its own async context and gather with `all`:

```clojure
(async
  (let [ps (mapv (fn [x] (async @(fetch x))) xs)]  ; each call returns a pending
    @(all ps)))                                     ; like Promise.all
```

Pendings compose without an `async` block, and `deref` takes the JVM's 3-arg timeout form:

```clojure
(then p (fn [x] (* x 10)))          ; like p.then(...)
(catch* p (fn [e] :recovered))      ; like p.catch(...)
(deref p 100 :timed-out)            ; timeout-ms + timeout-val
(pending? p)
```

`try`/`catch`/`finally` work across await points; a rejected pending awaited with `@` throws the same catchable value sync code would see. Crossing the host boundary, pendings convert to real Promises (`cljToJs`) and thenables convert back.

***

## Building Libraries

A cljam library is a TypeScript package that provides a `CljamLibrary` manifest containing Clojure namespaces and/or native runtime modules. The `cljam gen-lib-source` command generates the TypeScript sources map from your `.clj` files.

### Quickstart

```bash
# devDependency in your library package
npm install --save-dev @regibyte/cljam
```

```json
// package.json
{
  "scripts": {
    "gen:sources": "cljam gen-lib-source src/clojure src/generated/sources.ts",
    "prepublishOnly": "npm run gen:sources"
  }
}
```

```typescript
// library.ts — the library manifest
import type { CljamLibrary } from '@regibyte/cljam'
import { sources } from './src/generated/sources'

export const library: CljamLibrary = {
  id: 'my-lib',
  sources,
}
```

```clojure
;; src/clojure/my-lib/core.clj
(ns my-lib.core)

(defn greet [name] (str "Hello, " name "!"))
```

Run `npm run gen:sources` to regenerate `sources.ts` whenever you edit `.clj` files. The generated file is checked in — it only rewrites when content changes, so diffs stay clean.

For libraries with native TypeScript modules (wrapping JS APIs), see `@regibyte/cljam-date` as a reference implementation.

***

## Protocols and Records

`defprotocol`, `defrecord`, `extend-protocol`, and `extend-type` work as in JVM Clojure. Dispatch uses keyword type tags instead of Java class names:

```clojure
(require '[clojure.math :as math])

(defprotocol IArea
  (area [shape] "Compute the area"))

(defrecord Circle [radius])
(defrecord Rect [w h])

(extend-protocol IArea
  :user/Circle (area [c] (* math/PI (:radius c) (:radius c)))
  :user/Rect   (area [r] (* (:w r) (:h r))))

(area (->Circle 5))   ;; => 78.53981633974483
(area (->Rect 4 6))   ;; => 24
```

Type tags are keywords of the form `:ns/RecordName` for records, and `:string` `:number` `:boolean` etc. for built-in types. Use `(type x)` to get the tag for any value.

***

## Testing with `clojure.test`

`clojure.test` is built in. `*.test.clj` and `*.spec.clj` files run natively in Vitest via `cljTestPlugin()`:

```clojure
(ns my-app.core-test
  (:require [clojure.test :refer [deftest is testing run-tests]]))

(deftest arithmetic-works
  (testing "addition"
    (is (= 4 (+ 2 2))))
  (testing "strings"
    (is (= "hello" (str "hel" "lo")))))

(run-tests 'my-app.core-test)
;; {:test 1 :pass 2 :fail 0 :error 0}
```

To enable `*.test.clj` → Vitest integration:

```typescript
// vite.config.ts
import { cljTestPlugin } from '@regibyte/cljam/vite-plugin'

export default { plugins: [cljTestPlugin()] }
```

***

## Key Differences from JVM Clojure

| JVM Clojure | cljam |
|---|---|
| Java interop (`.method`, `new Foo`, `java.lang.*`) | Not available — use `js/` namespace |
| `defrecord`, `defprotocol`, `extend-protocol` | Available — dispatch on keyword type tags, not Java classes |
| `deftype`, `reify` | Not available |
| `future`, `agent`, STM (`ref`, `dosync`) | Not available — use `(async ...)` with `@deref` as await |
| `Long`, `BigDecimal`, ratio literals (`1/3`) | One IEEE-754 number type; `(= 1 1.0)` is `true` |
| Class-based `catch` (`catch Exception e`) | Predicate/keyword discriminators only; class symbols never match |
| `import`, Java class hierarchy | Not available |
| `##NaN`, `##Inf`, `##-Inf` reader literals | Not available — `(require '[clojure.math :as math])` then `(math/sqrt -1)` for NaN, `(math/log 0)` for -∞ |
| Chars from string traversal | `(first "a")` is a 1-char string, not `\a` |
| `sorted-map`, `sorted-set`, `prefer-method`, `eduction`, reader conditionals | Not implemented |

The full catalogue of divergences — silent value differences, errors where the JVM succeeds, printing differences, missing API, and what matches exactly — is in [Conformance with JVM Clojure](https://regibyte.github.io/cljam/guide/conformance).

***

## LLM Integration

`@regibyte/cljam-mcp` is an [MCP](https://modelcontextprotocol.io/) server that exposes a persistent cljam REPL to LLM agents. Eval code, load files, introspect with `describe`, and pair-program with a human developer in Calva — sharing the same live runtime.

See [`@regibyte/cljam-mcp`](https://www.npmjs.com/package/@regibyte/cljam-mcp) for setup instructions.

## License

MIT
