# Cljam

[![npm](https://img.shields.io/npm/v/%40regibyte%2Fcljam)](https://www.npmjs.com/package/@regibyte/cljam)
[![license](https://img.shields.io/npm/l/%40regibyte%2Fcljam)](LICENSE)

A Clojure interpreter written in TypeScript. Runs as a standalone CLI on Node.js 18+ or Bun, embeds in any JS/TS project as a library, and exposes a full nREPL server compatible with Calva, Cursive, and CIDER.

**[Try it in the browser →](https://regibyte.github.io/cljam/)**

***

## Project status

**Complete, not actively maintained.** cljam reached its design goal — a Clojure interpreter with an analyzer front-end, a tree-walking reference engine, and a bytecode VM kept in exact agreement by a differential test harness — and development stopped there at version 0.1.0. Issues and pull requests are welcome and will be reviewed, but no further features are planned.

This was a learning project by a web developer with no prior language-runtime experience. It is not recommended for production use. The [conformance page](https://regibyte.github.io/cljam/guide/conformance) records exactly what matches JVM Clojure and what does not.

***

## What it is

Cljam is an **interpreter** with a real compiler front-end. Source code is read, macro-expanded, and **analyzed**: a resolver pass turns every form into a resolved AST — lexical slots, closure capture sets, tail positions — and rejects malformed forms with precise, positioned errors before anything runs.

Evaluation is a tree walk over that resolved AST. A bytecode VM shares the same front-end: function bodies can additionally be compiled to bytecode and run on the VM, and a differential test harness keeps both engines in exact semantic agreement across the whole test suite. There is no Clojure → JavaScript file output; both engines are internal to the runtime.

It is designed to be embedded. The core session API is a plain TypeScript object: create a session, inject host functions, evaluate strings. The CLI and nREPL server are thin wrappers around the same session.

***

## Features

### Language

* Immutable persistent collections with structural sharing: vectors (32-way trie), maps (HAMT), sets, lists, lazy sequences
* Namespaces with `ns`, `require`, `refer`, `alias`
* Multi-arity and variadic functions
* Sequential and associative destructuring, including nested patterns, `:keys`, `:syms`, `:strs`, qualified keys, and `& {:keys [...]}` kwargs
* Macros: `defmacro`, quasiquote/unquote/splicing, `macroexpand`, `macroexpand-all`
* Atoms for controlled mutable state
* `loop`/`recur` with tail-call optimization
* Transducers: `transduce`, `into` with xf
* Threading macros: `->`, `->>`
* Anonymous function shorthand: `#(+ % 1)`

### Standard Library

`clojure.core`, `clojure.string`, `clojure.edn`, `clojure.math`, and `clojure.test` are implemented in Clojure itself and loaded at session startup. This means the standard library is readable, forkable, and patchable without touching TypeScript.

### Error Handling

`try/catch/finally` where any value can be thrown and catch clauses use discriminators to decide what to handle. There is no class hierarchy. The discriminator in each `catch` clause is one of:

* **`:default`** — catches everything
* **`:error/runtime`** — catches interpreter-level errors (type errors, arity errors, etc.)
* **A keyword** — catches when the thrown value is a map whose `:type` key equals that keyword
* **A predicate function** — catches when `(pred thrown-value)` is truthy

```clojure
;; keyword discriminator — matches (:type thrown-value)
(try
  (throw {:type :error/not-found :id 99})
  (catch :error/not-found e (:id e)))   ;; => 99

;; predicate discriminator — matches any map
(try
  (throw {:type :error/not-found :id 99})
  (catch map? e "got a map"))           ;; => "got a map"

;; catch everything
(try
  (/ 1 0)
  (catch :default e (ex-message e)))

;; catch interpreter errors
(try
  (+ 1 "not-a-number")
  (catch :error/runtime e (ex-message e)))

;; ex-info produces a plain map {:message "..." :data {...}}
;; to catch it by keyword, put :type in the data map and throw the ex-info result
(defn validate! [x]
  (when (neg? x)
    (throw (assoc (ex-info "Negative value" {:value x}) :type :error/validation))))

(try
  (validate! -1)
  (catch :error/validation e
    {:msg (ex-message e) :data (ex-data e)}))
```

### Async

`(async body)` evaluates its body asynchronously and immediately returns a **pending value** — cljam's promise. Inside an `async` block, `@` (`deref`) on a pending value awaits it, exactly like `await`:

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

**Async is a lexical boundary, and closures never inherit it** — the JavaScript model. `@` awaits only in code written literally inside the `(async ...)` form. A `fn` defined inside an async block has a sync body: `@` there is a sync deref and throws a teaching error, the same way `await` inside a plain callback is a syntax error in JS:

```clojure
(async (mapv (fn [x] @(fetch x)) xs))       ; ✗ fn body is sync — throws
```

```js
async () => xs.map((x) => await fetch(x))    // ✗ SyntaxError in JS
```

Give each callback its own async context instead — a collection of pendings, like an array of Promises — and gather with `all`:

```clojure
(async
  (let [ps (mapv (fn [x] (async @(fetch x))) xs)]  ; each call returns a pending
    @(all ps)))                                     ; like Promise.all
```

Pendings also compose without an `async` block, and `deref` takes the JVM's 3-arg timeout form:

```clojure
(then p (fn [x] (* x 10)))          ; like p.then(...)
(catch* p (fn [e] :recovered))      ; like p.catch(...) — e is the error value
(deref p 100 :timed-out)            ; JVM parity: timeout-ms + timeout-val
(pending? p)                        ; predicate
```

`try`/`catch`/`finally` work inside `async` bodies across await points, and a rejected pending awaited with `@` throws the same catchable value sync code would see. At the top level, the REPL and `session.evaluateAsync` resolve a returned pending before printing.

### nREPL Server

Full TCP nREPL server with bencode transport. Supports `eval`, `load-file`, `complete`, `clone`, `close`, `describe`, and `interrupt`. Namespace switching after `load-file` is handled automatically.

Writes `.nrepl-port` on startup for auto-connect.

### Host I/O

`slurp`, `spit`, and `load` are available in both the CLI and nREPL sessions.

### JS Interop

Call any JavaScript value from Clojure using the `js/` namespace. Host values cross the boundary wrapped in `CljJsValue` — no implicit coercion.

```clojure
;; Global objects
(. js/Math pow 2 10)              ;; => 1024.0
(. js/console log "hello")

;; Constructors
(def now (js/new js/Date))
(. now toISOString)               ;; => "2026-04-11T..."

;; Values from hostBindings (configured in SessionOptions)
;; Given hostBindings: { path: require('node:path') }
(. js/path join "a" "b" "c")     ;; => "a/b/c"
```

***

## Differences from JVM Clojure

cljam runs on a JavaScript host and makes a few deliberate departures from JVM Clojure:

| JVM Clojure | cljam |
|---|---|
| Java interop, `import`, `gen-class`, `deftype`, `reify` | Not available — `js/` interop and `defrecord` instead |
| `future`, `agent`, `ref`, STM | Not available — `atom` for state, `(async ...)` + pending values for concurrency |
| `Long`, `BigInt`, `BigDecimal`, ratios | One IEEE-754 number type; `(= 1 1.0)` is `true` |
| Class-based `catch` (`catch Exception e`) | Keyword / predicate discriminators; class symbols never match |
| Chars from string traversal | `(first "a")` is a 1-char string, not `\a` |
| `sorted-map`, `sorted-set`, `prefer-method`, `##Inf` literals | Not implemented |

Beyond the design differences, a black-box review against JVM Clojure 1.12.1 catalogued every observable divergence — silent value differences, errors where the JVM succeeds, printing differences, and missing API — with the areas that matched byte-for-byte. Read it before porting code: **[Conformance with JVM Clojure](https://regibyte.github.io/cljam/guide/conformance)** ([source](packages/docs/guide/conformance.md)).

***

## Installation

```bash
npm install -g @regibyte/cljam
# or
bun install -g @regibyte/cljam
```

Requires Node.js 18+ or [Bun](https://bun.sh).

***

## Getting Started

### Interactive REPL

```bash
cljam repl
```

```
cljam REPL
Type (exit) to exit.
user=> (map #(* % %) [1 2 3 4 5])
(1 4 9 16 25)
user=> (defn greet [name] (str "Hello, " name "!"))
#'user/greet
user=> (greet "World")
"Hello, World!"
user=> (exit)
```

### Run a File

```bash
cljam run my-script.clj
```

### nREPL Server

```bash
cljam nrepl-server
# cljam nREPL server started on port 7888
```

Options:

```bash
cljam nrepl-server --port 7889 --host 0.0.0.0
```

#### Connecting with Calva (VS Code)

Add to `.vscode/settings.json` in your project:

```json
{
  "calva.replConnectSequences": [
    {
      "name": "Cljam nREPL",
      "projectType": "generic",
      "nReplPortFile": [".nrepl-port"]
    }
  ]
}
```

Then: **Calva: Connect to Running REPL Server in Project** → select `Cljam nREPL`.

#### Connecting with CIDER (Emacs)

```
M-x cider-connect RET
Host: localhost RET
Port: 7888 RET
```

#### Connecting with Cursive (IntelliJ)

Run → Edit Configurations → `+` → Clojure REPL → Remote → host `localhost`, port `7888`.

### Embed as a Library

```typescript
import { createSession, printString, nodePreset } from '@regibyte/cljam'

const session = createSession({
  ...nodePreset(),
})

const result = session.evaluate('(map inc [1 2 3])')
console.log(printString(result)) // => (2 3 4)
```

`nodePreset()` wires up Node.js filesystem and standard I/O. Use `sandboxPreset()` for an isolated context with no host access.

***

## Source Root Discovery

When running `cljam nrepl-server` or `cljam run`, Cljam looks for source roots by reading the `cljam.sourceRoots` field in `package.json`:

```json
{
  "cljam": {
    "sourceRoots": ["src/clojure"]
  }
}
```

If no config is found, it falls back to the current working directory. Source roots control how `require` resolves namespace files.

***

## Testing

```bash
bun install
bun run test            # all packages
cd packages/cljam && bun run test && bun run typecheck
```

`packages/cljam` carries 134 spec files (~4800 assertions): TypeScript unit tests for the reader, analyzer, VM, printer, and namespace loader; a Clojure-language semantic suite in `clojure.test` (21 files, several mirroring the [jank](https://github.com/jank-lang/jank) suite); and a differential harness that evaluates every suite form on both the AST walker and the bytecode VM and asserts identical results, thrown values included.

***

## Packages

| Package | Purpose |
|---|---|
| [`@regibyte/cljam`](packages/cljam) | Interpreter, CLI, nREPL server, Vite plugin |
| [`@regibyte/cljam-schema`](packages/cljam-schema) | Data validation (Malli-style schemas) |
| [`@regibyte/cljam-date`](packages/cljam-date) | Date/time utilities over the host `Date` |
| [`@regibyte/cljam-integrant`](packages/cljam-integrant) | System lifecycle management (Integrant port) |
| [`@regibyte/cljam-ring`](packages/cljam-ring) | Ring-style HTTP request/response handling |
| [`@regibyte/cljam-mcp`](packages/cljam-mcp) | MCP server exposing a persistent cljam REPL to LLM agents |

The satellite packages are written in Clojure and compiled into their npm bundle with `gen-library-sources`; each requires `@regibyte/cljam >= 0.1.0`.

***

## Repository layout

```text
packages/cljam/src/core/analyzer/    resolver + context passes → resolved AST
packages/cljam/src/core/walker/      AST walker (reference engine) + async twin
packages/cljam/src/core/vm/          ir-compiler.ts + vm.ts (bytecode backend)
packages/cljam/src/core/evaluator/   shared runtime services (arity, apply, defs, interop, …)
packages/cljam/src/core/loader/      namespace loader / linker
packages/cljam/src/clojure/          clojure.core, clojure.string, … in Clojure
packages/cljam/src/nrepl/            bencode nREPL server
packages/cljam/src/cli/              cljam CLI
packages/docs/                       VitePress site + browser playground
experiments/benchmark-suite/         benchmark harness and findings
```

## License

MIT
