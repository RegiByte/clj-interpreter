# Library Distribution Spec

**Status:** Implemented — Sessions 135–143 (2026-04-04 → 2026-04-11)  
**Scope:** `CljamLibrary` format · preset system · `allowedPackages` permission model · source registration · three concrete library designs

> **Note:** Sections 1–7 are implemented. Sections 8.1 (`cljam-date`) and 8.3 parts map to `@regibyte/cljam-integrant`. Section 8.2 (`cljam-schema`) and 8.3 (`cljam-ring`) remain future work.

---

## 1. Design Principles

**Simple by default.** A user who just wants to ship something calls `createSession()` with no options. A user who wants Node.js globals calls `createSession(nodePreset())`. Library use is `createSession({ ...nodePreset(), libraries: [dateLib] })`. Every layer of control is additive — you only pay for what you use.

**Secure by design for LLMs.** An LLM session is a session where the host explicitly enumerates what the model can access. `sandboxPreset()` is the starting point: no IO, no dynamic imports, no host globals beyond pure-computation builtins. You add back only what you intend. The allowlist is not a bolt-on — it is a first-class contract.

**JS is the ecosystem.** Libraries are TypeScript/JavaScript packages published to npm. The Clojure source ships as strings inside the package — no compilation step required. The runtime compiles everything at load time.

**Presets are data, not magic.** A preset is a plain `SessionOptions` object. Composition is spread. No hidden registration, no framework, no DI container.

---

## 2. The `CljamLibrary` Format

`CljamLibrary` is the user-facing unit of capability for cljam. It wraps:
- Clojure source namespaces (optional — pure-native libraries may not have any)
- A native `RuntimeModule` (optional — pure-Clojure libraries may not have one)

```typescript
// packages/@regibyte/cljam/src/core/library.ts

export type CljamLibrary = {
  /** Unique library identifier — used in error messages and deduplication. */
  id: string
  /**
   * Clojure source files, keyed by namespace name.
   * Each value is the full source text of the .clj file.
   * These namespaces become resolvable via (:require [my-lib.ns]) after the
   * library is installed — they are NOT loaded eagerly.
   */
  sources?: Record<string, string>
  /**
   * Optional native RuntimeModule — install JS-backed functions into namespaces.
   * Use this for functions that must call into JS directly (constructors,
   * async APIs, DOM access, etc.).
   */
  module?: RuntimeModule
}
```

### Why not put sources in `RuntimeModule`?

`RuntimeModule` is an established internal abstraction: it installs named vars into namespaces and has dependency ordering. It knows nothing about file loading or `:require` resolution. Mixing `.clj` source concerns into it would pollute a clean boundary.

`CljamLibrary` is the external, user-facing concept. Internally, `createSession` decomposes it: native module → handed to `runtime.installModules()`; sources → registered in the runtime's source registry.

### Library manifest convention (npm packages)

A cljam library published to npm exports its library from a `conjure.ts` entry:

```typescript
// my-conjure-lib/conjure.ts
import type { CljamLibrary } from '@regibyte/cljam'
import { makeNativeModule } from './native'

export const library: CljamLibrary = {
  id: 'my-conjure-lib',
  sources: {
    'my-lib.core': /* the .clj source as a string, typically inlined at build time */,
    'my-lib.utils': /* ... */,
  },
  module: makeNativeModule(),
}
```

Users import and use it:
```typescript
import { library as myLib } from 'my-conjure-lib/conjure'
createSession({ ...nodePreset(), libraries: [myLib] })
```

The `conjure.ts` entry is a convention, not enforced by the runtime. It makes library authoring feel natural and is IDE-friendly.

---

## 3. `SessionOptions` Additions

```typescript
export type SessionOptions = {
  // --- existing ---
  output?: (text: string) => void
  stderr?: (text: string) => void
  entries?: string[]
  sourceRoots?: string[]
  readFile?: (filePath: string) => string
  modules?: RuntimeModule[]
  hostBindings?: Record<string, unknown>
  importModule?: (specifier: string) => unknown | Promise<unknown>

  // --- new ---
  /**
   * Libraries to install into this session.
   * Each library's sources become resolvable via (:require [ns]).
   * Each library's module (if any) is installed via installModules().
   * Libraries are processed after modules.
   */
  libraries?: CljamLibrary[]
  /**
   * Controls which Clojure namespaces may be loaded via (:require [ns]).
   * - 'all' (default): any namespace may be loaded (existing behaviour)
   * - string[]: only namespaces whose root package matches one of these prefixes
   *   may be loaded. 'clojure.*' and built-in namespaces are always allowed.
   *   Example: ['cljam-date', 'cljam-schema'] allows 'cljam-date.core',
   *   'cljam-date.utils', etc. but blocks everything else.
   */
  allowedPackages?: string[] | 'all'
}
```

---

## 4. Source Registration Mechanics

### How it works

When `createSession` processes `libraries`, it builds a source map and passes it to the runtime. The runtime keeps a `Map<string, string>` (namespace name → Clojure source) called `registeredSources`.

When `processRequireSpec` encounters `(:require [my-lib.core])`:
1. Checks `registeredSources` for `'my-lib.core'`
2. If found: loads and evaluates the source (same path as loading a file)
3. If not found: checks `sourceRoots` / `readFile` as today
4. If still not found: throws `"Namespace 'my-lib.core' not found"`

Sources are loaded lazily — registering a library does not eagerly evaluate its namespaces. Only `(:require [...])` triggers loading.

### `RuntimeOptions` addition

```typescript
export type RuntimeOptions = {
  sourceRoots?: string[]
  readFile?: (filePath: string) => string
  registeredSources?: Map<string, string>  // new
}
```

`createSession` constructs this map from all `libraries[].sources` entries before calling `createRuntime`.

### Deduplication

If two libraries register the same namespace, `createSession` throws at construction time:
```
Library 'lib-b' tried to register namespace 'shared.utils', already registered by 'lib-a'.
```

---

## 5. The `allowedPackages` Permission Model

### Allowlist mechanics

`allowedPackages` is checked during `processRequireSpec` for symbol requires only (not string `(:require ["npm-pkg" :as X])` — those are controlled by whether `importModule` is provided).

**Always allowed regardless of `allowedPackages`:**
- `clojure.*` (built-in namespaces: `clojure.core`, `clojure.string`, etc.)
- `user` (the default REPL namespace)
- The session's own namespaces already in the registry

**Prefix matching:**  
`allowedPackages: ['cljam-date', 'my-app']` allows any namespace whose dotted name starts with `cljam-date.` or `my-app.` (or exactly equals `cljam-date` / `my-app`).

**Error message on violation:**
```
Access denied: namespace 'some-lib.core' is not in the allowed packages for this session.
Allowed packages: ["cljam-date", "cljam-schema"]
To allow all packages, use: allowedPackages: 'all'
```

### Where it's checked

In `processRequireSpec` (and its async variant) inside `runtime.ts`, before the namespace is resolved. The allowed set is passed as part of the `EvaluationContext`:

```typescript
// EvaluationContext addition
allowedPackages?: string[] | 'all'
```

`createSession` sets `ctx.allowedPackages = options?.allowedPackages ?? 'all'`.

### LLM session pattern

```typescript
createSession({
  ...sandboxPreset(),
  libraries: [dateLib, schemaLib],
  allowedPackages: ['cljam-date', 'cljam-schema'],
})
```

The model gets exactly what you gave it. Nothing else loads. The error message is informative enough that an LLM can understand why a require failed.

---

## 6. The Preset System

Presets are plain functions returning `SessionOptions`. No registration. No magic. Compose with spread.

```typescript
// packages/@regibyte/cljam/src/presets.ts

export function nodePreset(): SessionOptions {
  return {
    output: (text) => process.stdout.write(text + '\n'),
    stderr: (text) => process.stderr.write(text + '\n'),
    importModule: (specifier) => import(specifier),
    hostBindings: {
      Math,
      console,
      process,
      Buffer,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      fetch: globalThis.fetch,
    },
    allowedPackages: 'all',
  }
}

export function browserPreset(): SessionOptions {
  return {
    output: (text) => console.log(text),
    stderr: (text) => console.error(text),
    importModule: (specifier) => import(specifier),
    hostBindings: {
      Math,
      console,
      window: globalThis,
      document: globalThis.document,
      fetch: globalThis.fetch,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    },
    allowedPackages: 'all',
  }
}

/**
 * Secure-by-default preset for LLM sessions and sandboxed evaluation.
 * - No IO (output goes nowhere by default — caller overrides output/stderr if needed)
 * - No importModule — dynamic JS imports disabled
 * - No host globals beyond pure-computation builtins
 * - allowedPackages defaults to [] — nothing loads unless you add it
 */
export function sandboxPreset(): SessionOptions {
  return {
    output: () => { /* noop */ },
    stderr: () => { /* noop */ },
    // importModule intentionally absent
    hostBindings: {
      Math,  // pure computation, no side effects
    },
    allowedPackages: [],
  }
}
```

### Composition examples

```typescript
// Node + extra globals
createSession({
  ...nodePreset(),
  hostBindings: { ...nodePreset().hostBindings, myCustomLib },
})

// LLM session with specific libraries and captured output
const output: string[] = []
createSession({
  ...sandboxPreset(),
  output: (text) => output.push(text),
  stderr: (text) => output.push(`[err] ${text}`),
  libraries: [dateLib, schemaLib],
  allowedPackages: ['cljam-date', 'cljam-schema'],
})

// Browser with restricted package access
createSession({
  ...browserPreset(),
  allowedPackages: ['my-app'],
})
```

---

## 7. Session Capabilities Introspection

For LLM integrations, the session should be self-describing. A `capabilities` property on `Session` gives the model (or any caller) a read-only view of what is available:

```typescript
export type SessionCapabilities = {
  /** Which package prefixes may be required. 'all' means unrestricted. */
  allowedPackages: string[] | 'all'
  /** Names of host bindings available as js/<name>. */
  hostBindings: string[]
  /** Whether dynamic JS imports are enabled ((:require ["pkg" :as X])). */
  allowDynamicImport: boolean
  /** Names of installed library IDs. */
  libraries: string[]
}
```

Added to `Session`:
```typescript
readonly capabilities: SessionCapabilities
```

This is primarily useful when building LLM tools: you can inject `session.capabilities` into the model's system prompt or tool context so it knows what functions it can call.

---

## 8. Concrete Library Designs

### 8.1 `cljam-date` — Thin date library

**Goal:** Ergonomic date handling without reaching for `js/new`.  
**Peer dependencies:** None (uses native `Date` and `Intl`).

**Native layer** (`cljam.date.native`):
| Function | Wraps | Notes |
|---|---|---|
| `now*` | `new Date()` | Returns CljJsValue wrapping a Date |
| `from-millis*` | `new Date(n)` | |
| `from-iso*` | `new Date(s)` | |
| `to-millis*` | `date.getTime()` | Returns CljNumber |
| `to-iso*` | `date.toISOString()` | Returns CljString |
| `format*` | `Intl.DateTimeFormat` | `(format* date locale options-map)` |
| `year*` / `month*` / `day*` etc. | `.getFullYear()` etc. | Accessors |
| `add-millis*` | `new Date(d.getTime() + n)` | |

**Clojure layer** (`cljam.date`):
```clojure
(ns cljam.date
  (:require [cljam.date.native :as n]))

(defn now [] (n/now*))
(defn from-millis [ms] (n/from-millis* ms))
(defn from-iso [s] (n/from-iso* s))
(defn to-millis [d] (n/to-millis* d))
(defn to-iso [d] (n/to-iso* d))
(defn year [d] (n/year* d))
(defn month [d] (n/month* d))   ; 1-indexed (unlike JS)
(defn day [d] (n/day* d))
(defn format [d pattern] ...)   ; thin wrapper over Intl.DateTimeFormat

;; Arithmetic
(defn add-days [d n] (n/add-millis* d (* n 86400000)))
(defn diff-days [a b] (quot (- (to-millis b) (to-millis a)) 86400000))
```

**Usage:**
```clojure
(ns my-app.core
  (:require [cljam.date :as d]))

(def today (d/now))
(def tomorrow (d/add-days today 1))
(println (d/to-iso tomorrow))
```

**Design note:** Dates are opaque `CljJsValue` — users never touch the raw `Date`. The native layer handles all the mutation-prone Date API surface. The Clojure layer provides idiomatic naming (1-indexed months, etc.).

---

### 8.2 `cljam-schema` — Zod-backed schema validation

**Goal:** Validate data and get Clojure maps as output (not JS objects).  
**Peer dependencies:** `zod`.

**Schema DSL:**
```clojure
;; Schemas are Clojure values built with schema constructors
(def user-schema
  (s/object {:name (s/string)
             :age  (s/number {:min 0})
             :role (s/enum :admin :user)}))
```

**Parsing:**
```clojure
;; parse — throws on failure with Clojure error data
(s/parse user-schema {:name "Alice" :age 30 :role :admin})
;; => {:name "Alice" :age 30 :role :admin}

;; safe-parse — always returns a result map
(s/safe-parse user-schema {:name "Alice"})
;; => {:ok false
;;     :issues [{:path [:age]  :message "Required"}
;;              {:path [:role] :message "Required"}]}

(s/safe-parse user-schema {:name "Alice" :age 30 :role :admin})
;; => {:ok true :value {:name "Alice" :age 30 :role :admin}}
```

**Key native conversions:**

The hardest part is translating zod's schema DSL into native zod calls, and translating zod's issue objects back into Clojure maps. This is done entirely in the native layer — the Clojure layer never sees zod objects.

```typescript
// Issues converted to Clojure maps:
// { path: ['name', 'first'], message: 'Required' }
// → {:path [:name :first] :message "Required"}
function zodIssuesToClj(issues: ZodIssue[]): CljValue {
  // ... convert each issue to a CljMap, wrap in CljVector
}
```

**Schema registry** (optional, for named schemas):
```clojure
(s/defschema ::user
  (s/object {:name (s/string) :age (s/number)}))

(s/validate ::user data)  ; same as safe-parse but uses registered name in errors
```

---

### 8.3 `cljam-ring` — Ring-like HTTP server

**Goal:** Create web servers with a pure Clojure handler model.  
**Peer dependencies:** None at the library level (runtime-dependent: Bun or Node).

**The Ring model:**
- Handler: `(fn [request] response)`
- Request: Clojure map
- Response: Clojure map
- Middleware: `(fn [handler] (fn [request] (handler ...)))`

**Request map:**
```clojure
{:method  :get
 :uri     "/users/42"
 :path    "/users/42"
 :query   "page=1"
 :params  {}                     ; populated by router
 :headers {:content-type "application/json"}
 :body    nil}                   ; string for text, nil for empty
```

**Response map:**
```clojure
{:status  200
 :headers {:content-type "text/html; charset=utf-8"}
 :body    "<h1>Hello</h1>"}
```

**Server lifecycle (native function):**
```clojure
;; Start a server — returns a server handle (CljJsValue)
(def server (ring/serve my-handler {:port 3000}))

;; Stop it
(ring/stop! server)
```

**Routing (pure Clojure):**
```clojure
(ns my-app.routes
  (:require [cljam.ring :as ring]
            [cljam.ring.response :as res]))

(defn user-handler [req]
  (res/json {:id (get-in req [:params :id])
             :name "Alice"}))

(def app
  (ring/routes
    (ring/GET  "/"            (fn [_] (res/html "<h1>Hello</h1>")))
    (ring/GET  "/users/:id"   user-handler)
    (ring/POST "/users"       create-user-handler)
    (ring/not-found           (fn [_] (res/status 404 "Not Found")))))

(ring/serve app {:port 3000})
```

**Middleware:**
```clojure
;; Middleware is just function wrapping — pure Clojure
(defn logger-middleware [handler]
  (fn [req]
    (println (str (:method req) " " (:uri req)))
    (handler req)))

(def app
  (-> base-handler
      logger-middleware
      (ring/wrap-json-body)
      (ring/wrap-cors {:origin "*"})))
```

**Implementation layers:**
- `cljam.ring.native` — `serve*`, `stop*`: wraps Bun.serve or Node http.createServer; converts JS request → Clojure map; invokes handler; converts response map → JS response
- `cljam.ring` — `serve`, `stop!`, `routes`, `GET`, `POST`, etc.
- `cljam.ring.response` — `json`, `html`, `text`, `status`, `redirect`
- `cljam.ring.middleware` — `wrap-json-body`, `wrap-cors`, `wrap-params`

**Runtime adapter pattern:**  
The native module is injected differently for Bun vs Node. The library accepts an optional adapter:
```typescript
// For Bun
createSession({
  ...nodePreset(),
  libraries: [makeRingLibrary({ adapter: 'bun' })],
})

// For Node
createSession({
  ...nodePreset(),
  libraries: [makeRingLibrary({ adapter: 'node' })],
})
```

The adapter is the only runtime-specific piece. The Clojure layer is identical for both.

---

## 9. Implementation Order

This spec describes the design. Implementation should happen in this order:

1. **`CljamLibrary` type + `libraries` option in `SessionOptions`** — the scaffolding
2. **Source registration mechanics** — `registeredSources` in `RuntimeOptions` + lookup in `processRequireSpec`
3. **`allowedPackages` enforcement** — thread through `ctx`, check in `processRequireSpec`
4. **Preset functions** — `nodePreset`, `browserPreset`, `sandboxPreset` in `src/presets.ts`
5. **`session.capabilities`** — read-only introspection property
6. **`cljam-date`** — first library, minimal native surface, validates the whole pipeline
7. **`cljam-schema`** — second library, validates cross-boundary data conversion
8. **`cljam-ring`** — third library, validates async server integration

Steps 1–5 are the core infra. Steps 6–8 are the payoff — each library will surface gaps in the spec as they're built.

---

## 10. Open Questions

| Question | Status | Notes |
|---|---|---|
| Should `CljamLibrary.sources` support lazy-load functions `() => Record<...>` instead of eagerly materialized strings? | Deferred | Strings are simpler; revisit if large libraries cause bundle-size issues |
| Should `allowedPackages` use exact-match or prefix-match? | **Decided: prefix** | `'cljam-date'` covers `cljam-date.core`, `cljam-date.utils`, etc. |
| Should `session.capabilities` be live (reactive to `addSourceRoot` etc.) or a snapshot? | Deferred | Snapshot is simpler; revisit for LLM agent use cases |
| How does `cljam-ring` handle async handlers? | Open | Option A: handler returns a `CljPending`; Option B: `ring/serve-async`. Needs its own design pass. |
| Should the ring library be runtime-agnostic at the spec level (Bun + Node)? | **Decided: yes** | Adapter pattern; Clojure layer is identical |
| Should `cljam-schema` support custom validators (`:refine` / `:transform`)? | Deferred | Ship the happy path first |
| Where do library packages live (monorepo vs separate repos)? | Deferred | First library in `packages/cljam-date`; extract later if ecosystem grows |
