# Vite Integration

The cljam Vite plugin brings Clojure into your frontend project as a first-class citizen:

- `.clj` files become ES modules, you can import Clojure defs directly from TypeScript
- A shared browser session lives in the page, reachable from Clojure code
- `hostBindings` exposes DOM, Math, and any JS value to the Clojure runtime, configurable by the user
- A browser nREPL relay lets Calva (and any nREPL client) evaluate code live in the running page
- HMR handling for `.clj` files, the page doesn't reload when you save a `.clj` file during development, keeping state intact

## Installation

```bash
npm install @regibyte/cljam
```

The plugin ships inside the main package, no extra install needed.

## Setup

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { cljPlugin } from '@regibyte/cljam/vite-plugin'

export default defineConfig({
  plugins: [cljPlugin({ sourceRoots: ['src/clojure'] })],
})
```

That's it, the plugin auto-generates a session with your `.clj` imports wired up.

## Importing Clojure namespaces

```clojure
;; src/clojure/my_app/math.clj
(ns my-app.math)

(defn square [x] (* x x))
(defn cube [x] (* x x x))
```

```typescript
// src/App.tsx
import { square, cube } from './clojure/my_app/math.clj'

console.log(square(4)) // 16
console.log(cube(3))   // 27
```

The plugin generates TypeScript declarations (`.clj.d.ts`) alongside each file, so you get basic autocomplete about what's available and how many arguments a function takes. That said, most type declarations are still "unknown", given clojure code is inherently dynamic and doesn't carry type information.

## Custom session options

If you want to customize the session host bindings, custom import routing, or extra libraries, point `entrypoint` at an options file:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [cljPlugin({
    sourceRoots: ['src/clojure'],
    entrypoint: 'src/cljam.ts',
  })],
})
```

The options file should return `SessionOptions`, the plugin injects `importModule` and `output` automatically, so you only provide what you need:

```typescript
// src/cljam.ts
import type { ImportMap, SessionOptions } from '@regibyte/cljam'

export default function cljamFactory(_importMap: ImportMap): SessionOptions 
{
  return {
    hostBindings: { Math, console, document },
  }
}
```

:::warning Return options, not a session
The factory must return a plain `SessionOptions` object, **not** the result of `createSession()`. The plugin calls `createSession()` itself and merges your options in.
:::

## JS interop in the browser

Once `document`, `Math`, or any other value is in `hostBindings`, it's available as `js/<key>`:

```clojure
;; Read a property
(. js/document title)                    ;; => "My App"

;; Call a method
(js/document.createElement "div")        ;; => #<js HTMLDivElement>

;; Read nested properties
(js/get-in js/document ["body" "style"]) ;; => #<js CSSStyleDeclaration>

;; Mutate a property
(js/set! (js/get js/document "body") "className" "dark-mode")

;; Build a DOM node from scratch
(let [h1 (js/document.createElement "h1")
      t  (js/document.createTextNode "Hello from Clojure!")]
  (. h1 appendChild t)
  (js/document.body.appendChild h1))
```

### The `js/` interop vocabulary

| Form | JS equivalent |
|---|---|
| `(. obj method arg...)` | `obj.method(arg...)` |
| `(. obj prop)` | `obj.prop` (read, no args) |
| `(js/get obj "key")` | `obj["key"]` |
| `(js/get obj "key" default)` | `obj["key"] ?? default` |
| `(js/get-in obj ["a" "b"])` | `obj.a.b` |
| `(js/set! obj "key" val)` | `obj["key"] = val` |
| `(js/call fn arg...)` | `fn(arg...)` |
| `(js/obj "a" 1 "b" 2)` | `{ a: 1, b: 2 }` |
| `(js/array 1 2 3)` | `[1, 2, 3]` |
| `(js/merge target {:x 1})` | `Object.assign({}, target, { x: 1 })` |
| `(js/keys obj)` | `Object.keys(obj)` |
| `(js/typeof val)` | `typeof val` |
| `(js/instanceof? val Cls)` | `val instanceof Cls` |

:::tip Property vs method call
`(. obj prop)` with no extra arguments is a property read. Add arguments and it becomes a method call: `(. obj method arg1 arg2)`. There is no `-prop` dash prefix like ClojureScript.
:::

## nREPL browser relay

The plugin starts a browser nREPL relay on top of the Vite dev server. Any nREPL client like Calva, CIDER, and cursive can connect and evaluate code directly inside your running browser tab.

Start the dev server:

```bash
vite dev
```

The relay port defaults to `7888`. Connect Calva: **Calva: Connect to a Running REPL Server** → host `localhost` → port `7888`.

You can also connect programmatically via the cljam MCP or any TCP nREPL client:

```clojure
;; Evaluated by an external nREPL client — runs in YOUR browser tab
(let [p (js/document.createElement "p")
      t (js/document.createTextNode "Hello from the REPL!")]
  (. p appendChild t)
  (js/document.body.appendChild p))
```

Multiple clients share the same browser session, so you from Calva and an MCP agent can both evaluate code in the page simultaneously. Whether that's something you want to do is up to you.

To customise the relay port:

```typescript
cljPlugin({ sourceRoots: ['src/clojure'], nreplPort: 7889 })
```

## Plugin options reference

| Option | Type | Default | Description |
|---|---|---|---|
| `sourceRoots` | `string[]` | `['src']` | Directories where `.clj` files live |
| `entrypoint` | `string` | — | Path to a Mode 2 session factory (relative to project root) |
| `nreplPort` | `number` | `7888` | TCP port for the browser nREPL relay |

## Vitest integration

For testing `.clj` files with Vitest, see the [Testing guide](./testing).
