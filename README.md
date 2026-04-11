# Cljam

[![npm](https://img.shields.io/npm/v/%40regibyte%2Fcljam)](https://www.npmjs.com/package/@regibyte/cljam)
[![license](https://img.shields.io/npm/l/%40regibyte%2Fcljam)](LICENSE)

A Clojure interpreter written in TypeScript. Runs on Bun as a standalone CLI, embeds in any JS/TS project as a library, and exposes a full nREPL server compatible with Calva, Cursive, and CIDER.

**[Try it in the browser →](https://regibyte.github.io/cljam/)**

***

## Disclaimer

I am a Web developer with 12 years of experience, however, this is my first attempt at creating a language runtime. I do not recommend using this for anything serious yet. This is a learning project and I am not a Clojure expert.

If even knowing this, you still want to use this, feel free to contact me and I will help you with your use case.
Or even better, contribute to the project, open an issue or a pull request and I'll review it and merge if it's good.

## What it is

Cljam is an **interpreter**. Source code is read, macro-expanded, and evaluated at runtime. There is no compilation step and no bytecode — the evaluator walks the AST directly.

It is designed to be embedded. The core session API is a plain TypeScript object: create a session, inject host functions, evaluate strings. The CLI and nREPL server are thin wrappers around the same session.

An incremental compiler is built in — hot-path forms compile to native closures at definition time, giving a meaningful speed-up over pure tree-walking. There is no Clojure → JavaScript file output today; the compiler is an internal optimization, not a code generator.

***

## Features

### Language

* Immutable collections (no structural sharing): vectors, maps, sets, lists
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

`clojure.core` and `clojure.string` are implemented in Clojure itself and loaded at session startup. This means the standard library is readable, forkable, and patchable without touching TypeScript.

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

### nREPL Server

Full TCP nREPL server with bencode transport. Supports `eval`, `load-file`, `complete`, `clone`, `close`, `describe`, and `interrupt`. Namespace switching after `load-file` is handled automatically.

Writes `.nrepl-port` on startup for auto-connect.

### JS Interop

Call any JavaScript value from Clojure using the `js/` namespace. Host values cross the boundary wrapped in `CljJsValue` — no implicit coercion.

```clojure
;; Global objects
(. js/Math pow 2 10)              ;; => 1024.0
(. js/console log "hello")

;; Constructors
(def now (js/new js/Date))
(. now toISOString)               ;; => "2026-04-11T..."

;; Values from importMap (configured in SessionOptions)
;; Given importMap: { path: require('node:path') }
(. js/path join "a" "b" "c")     ;; => "a/b/c"
```

### Host I/O

`slurp`, `spit`, and `load` are available in both the CLI and nREPL sessions.

***

## Key Differences from JVM Clojure

Cljam is semantically close to Clojure but runs on a JavaScript host. The following are not implemented and are not planned for the interpreter phase:

| JVM Clojure | Cljam |
|---|---|
| Java interop (`.method`, `new Foo`, `java.lang.*`) | Not available |
| `deftype`, `defrecord`, `defprotocol` | Not available |
| `gen-class` | Not available |
| `future`, `promise`, `agent`, `ref`, STM | Not available — use `atom` |
| `Long`, `BigDecimal`, ratio literals (`1/3`) | Numbers are JS floats |
| Class-based `catch` (`catch Exception e`) | Predicate-based catch only |
| `import`, Java class hierarchy | Not available |

The core data model, namespace system, macro system, and standard library semantics match Clojure closely. Code that avoids Java interop and JVM-specific types will generally run without modification.

***

## Installation

```bash
npm install -g @regibyte/cljam
# or
bun install -g @regibyte/cljam
```

The main host environment is Bun's runtime
You may need to install [Bun](https://bun.sh) for certain features.

***

## Getting Started

### Interactive REPL

```bash
cljam repl
```

```
Cljam 0.0.1
Type (exit) to exit the REPL.
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
# Cljam nREPL server 0.0.1 started on port 7888
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

## Roadmap

### REPL UX

Multiline input with bracket-depth tracking (continuation prompt `...=>`), ANSI color output, and persistent history.

### nREPL Completeness

Full bencode op coverage: symbol info, docstring lookup, source location, cross-namespace navigation. The goal is feature parity with what Calva and CIDER expect from a production nREPL server.

### Browser nREPL Bridge

The Vite plugin (`vite-plugin-cljam`) will spawn a WebSocket nREPL endpoint alongside the dev server. A small runtime injected into the browser page connects to the WebSocket and acts as the nREPL evaluation target. Any compatible nREPL client — Calva, Cursive, CIDER — will be able to evaluate Clojure code that runs live in the browser, with full access to the DOM and the running application state.

```typescript
// vite.config.ts
cljPlugin({ sourceRoots: ['src'], nreplPort: 7889 })
```

### Compiler

An incremental compiler covering all hot-path forms is already built in. The next phase is full `def`, `binding`, and tail-call self-recursion support. The long-term goal is a self-hosting compiler: the compiler written in cljam and compiled with itself.

***

## License

MIT
