# @regibyte/cljam-integrant

[![npm](https://img.shields.io/npm/v/%40regibyte%2Fcljam-integrant)](https://www.npmjs.com/package/@regibyte/cljam-integrant)
[![license](https://img.shields.io/npm/l/%40regibyte%2Fcljam-integrant)](LICENSE)

Data-driven system composition for [@regibyte/cljam](https://www.npmjs.com/package/@regibyte/cljam). A port of [Integrant](https://github.com/weavejester/integrant).

Define your system as a data map. Integrant resolves dependencies, starts components in topological order, and stops them in reverse. All lifecycle operations are async.

***

## Installation

```bash
npm install @regibyte/cljam-integrant
# peer dependency
npm install @regibyte/cljam
```

***

## Setup

```typescript
import { createSession, nodePreset } from '@regibyte/cljam'
import { library as integrantLib } from '@regibyte/cljam-integrant'

const session = createSession({
  ...nodePreset(),
  libraries: [integrantLib],
})
```

***

## Usage

### Define a config

```clojure
(ns my-app.system
  (:require [cljam.integrant.core :as ig]))

(def config
  {:app/db     {:url "postgresql://localhost/mydb"}
   :app/server {:port 3000 :db (ig/ref :app/db)}})
```

`ig/ref` declares a dependency. `:app/server` depends on `:app/db` — Integrant will start `:app/db` first and inject the started value.

### Implement lifecycle methods

```clojure
(defmethod ig/init-key :app/db [_ {:keys [url]}]
  (connect! url))   ;; return the running component

(defmethod ig/init-key :app/server [_ {:keys [port db]}]
  (start-server! port db))

(defmethod ig/halt-key! :app/db [_ db]
  (disconnect! db))

(defmethod ig/halt-key! :app/server [_ server]
  (stop-server! server))
```

### Start and stop

```clojure
(def *system (atom nil))

;; Start — returns a pending (Promise)
(-> (ig/init config)
    (then #(reset! *system %)))

;; Stop — also async
(-> (ig/halt! @*system)
    (then #(println "system stopped")))
```

### Partial start

Pass a set of keys to start only part of the system:

```clojure
;; Start only :app/db and its dependencies
(ig/init config #{:app/db})
```

***

## Dev-mode hot reload

`suspend!` and `resume` allow you to reload code without restarting unchanged components:

```clojure
;; Suspend the running system (calls suspend-key! in reverse order)
(-> (ig/suspend! @*system)
    (then (fn [_]
            ;; reload new config / code here...
            (ig/resume new-config @*system))))
```

`resume-key` defaults to calling `init-key` again. Override it to reuse the existing component when the config hasn't changed:

```clojure
(defmethod ig/resume-key :app/db [key value old-value old-impl]
  (if (= value old-value)
    old-impl      ;; config unchanged — reuse the connection
    (init-key key value)))
```

***

## References

| Constructor | Description |
|---|---|
| `(ig/ref key)` | Declares a dependency on `key`. Resolved to the started component during `init`. |
| `(ig/refset key)` | Like `ref`, but collects all matching keys into a set. |
| `(ig/ref? x)` | True if x is a ref |
| `(ig/refset? x)` | True if x is a refset |
| `(ig/reflike? x)` | True if x is a ref or refset |

Refs are plain Clojure maps — they're printable and inspectable at the REPL before the system starts.

***

## API Reference

### Lifecycle multimethods

Dispatch on the config key (qualified keyword).

| Multimethod | Signature | Default |
|---|---|---|
| `init-key` | `(key value) → component` | — (must implement) |
| `halt-key!` | `(key component) → nil` | Returns nil |
| `suspend-key!` | `(key component) → nil` | Calls `halt-key!` |
| `resume-key` | `(key value old-value old-impl) → component` | Calls `init-key` |
| `assert-key` | `(key value) → nil` | Returns nil |
| `resolve-key` | `(key value) → value` | Returns value unchanged |

### System operations

All return a `CljPending` (Promise).

| Function | Description |
|---|---|
| `(ig/init config)` | Start all components in dependency order |
| `(ig/init config keys)` | Start only the given keys (and their dependencies) |
| `(ig/halt! system)` | Stop all components in reverse order |
| `(ig/halt! system keys)` | Stop only the given keys |
| `(ig/suspend! system)` | Suspend all components (for hot reload) |
| `(ig/suspend! system keys)` | Suspend only the given keys |
| `(ig/resume config system)` | Restart, reusing unchanged components |
| `(ig/resume config system keys)` | Resume only the given keys |

### Utilities

| Function | Description |
|---|---|
| `(ig/build config init-fn)` | Low-level `init` with a custom init function |
| `(ig/run! system f)` | Call `(f key component)` for each key in dependency order |
| `(ig/reverse-run! system f)` | Same, in reverse order |
| `(ig/fold system f init-val)` | Synchronous reduce over the system in dependency order |
| `(ig/find-derived m key)` | Find all entries whose key matches (strict equality) |
| `(ig/find-derived-1 m key)` | Like `find-derived`, but throws if more than one match |

***

## License

MIT
