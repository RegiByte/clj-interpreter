# @regibyte/cljam

[![npm](https://img.shields.io/npm/v/%40regibyte%2Fcljam)](https://www.npmjs.com/package/@regibyte/cljam)
[![license](https://img.shields.io/npm/l/%40regibyte%2Fcljam)](LICENSE)

A Clojure interpreter written in TypeScript. Embeds in any JS/TS project as a library, runs as a standalone CLI on Bun, and exposes a full nREPL server compatible with Calva, Cursive, and CIDER.

**[Try it in the browser →](https://regibyte.github.io/cljam/)**

***

## What it is

cljam is an **interpreter**. Source code is read, macro-expanded, and evaluated at runtime. An incremental compiler is built in — hot-path forms compile to native closures at definition time — but there is no Clojure → JavaScript file output today.

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
# As a CLI (Bun required)
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

```typescript
import { createSession, sandboxPreset } from '@regibyte/cljam'

const session = createSession({
  ...sandboxPreset(),
  importMap: {
    myApi: {
      fetchUser: async (id: number) => ({ id, name: 'Alice' }),
    },
  },
})

// In Clojure: (def u @(js/call js/myApi "fetchUser" 42))
```

### Using libraries

```typescript
import { createSession, nodePreset } from '@regibyte/cljam'
import { dateLib } from '@regibyte/cljam-date'

const session = createSession({
  ...nodePreset(),
  libraries: [dateLib],
})

session.evaluate(`
  (require '[cljam.date :as d])
  (d/format-date (d/now) "yyyy-MM-dd")
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
* JS interop: `js/` namespace, `.` member access, `js/new`

`clojure.core` and `clojure.string` are implemented in Clojure itself and loaded at session startup — the standard library is readable, forkable, and patchable.

***

## JS Interop

Call any JavaScript value from Clojure using the `js/` namespace:

```clojure
;; Global objects
(. js/Math pow 2 10)            ;; => 1024.0
(. js/console log "hello")

;; Constructors
(def now (js/new js/Date))
(. now toISOString)

;; Values from importMap
;; Given importMap: { path: require('node:path') }
(. js/path join "a" "b" "c")   ;; => "a/b/c"
```

***

## Key Differences from JVM Clojure

| JVM Clojure | cljam |
|---|---|
| Java interop (`.method`, `new Foo`, `java.lang.*`) | Not available — use `js/` namespace |
| `deftype`, `defrecord`, `defprotocol` | Not available |
| `future`, `promise`, `agent`, `ref`, STM | Not available — use `atom` |
| `Long`, `BigDecimal`, ratio literals (`1/3`) | Numbers are JS floats |
| Class-based `catch` (`catch Exception e`) | Predicate/keyword discriminators only |
| `import`, Java class hierarchy | Not available |

***

## License

MIT
