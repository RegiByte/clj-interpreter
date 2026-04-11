# Cljam-JS — Roadmap

> **This is the north star document.** It describes what cljam is, where it stands today, and where it is going. Update it when decisions change. Read it at the start of every work session.

---

## What Cljam Is

A **runtime-embeddable, snapshot-capable, module-injectable Clojure interpreter that runs anywhere JavaScript runs.**

This is unoccupied territory:
- ClojureScript requires AOT compilation and the full CLJS toolchain — not embeddable
- Babashka runs on the JVM — not JS-native
- Nobody else has done this

**The interpreter overhead is a feature, not just a limitation.** The ability to evaluate code at runtime, inspect and evolve a live namespace, and snapshot/restore a session is what makes live programming, metaprogramming, and runtime composition possible. An AOT-compiled approach cannot do this. We optimize the interpreter — we do not replace it.

---

## Target Use Cases

Cljam shines wherever **business logic, flexibility, metaprogramming, and live programming** are valuable in combination or independently. Concretely:

- **Data processing scripts** — readable, composable, data-oriented pipelines
- **Business logic layers** — hot-swappable rules, live REPL iteration
- **MCP server runtimes** — give an AI a full live Clojure runtime to eval and evolve its own code during a session
- **Live/exploratory programming** — REPL-driven development in any JS environment
- **Custom embedded languages** — inject domain capabilities as namespaces via the RuntimeModule system

The **RuntimeModule system** is the key extensibility primitive. Users inject host capabilities (IO, HTTP, databases, domain APIs) as namespaces — not just Clojure source. This makes Cljam run correctly in any environment with a custom capability surface.

---

## Current State (as of Session 144, 2026-04-11)

### What is fully working
- Complete interpreter pipeline: Tokenizer → Reader → Expander → Evaluator → Printer
- Full Clojure stdlib coverage including lazy sequences, transducers, atoms, multimethods
- Macro system: `defmacro`, quasiquote, `syntax-quote`, `gensym`
- `let`, `fn`, `loop`, `delay` are Clojure macros — `let*`/`fn*`/`loop*`/`make-delay` are the true primitives
- Namespace model with `require`, namespace aliasing, qualified keywords
- Try/catch/finally with predicate-based discriminators, destructuring (vector + map, nested, lazy-aware)
- Dynamic vars (`*out*`, `*err*`), `with-out-str`/`with-err-str`
- Async foundation: `CljPending`, `(async ...)` special form, `@` unwrap, `then`/`catch*`
- Session API: `createSession`, `evaluateAsync`, `snapshotSession`, `createSessionFromSnapshot`
- RuntimeModule system with Kahn-sorted dependency resolution
- nREPL server (TCP, bencode) — Calva connects via Generic project type
- JS interop: `CljJsValue`, `js/` namespace, `.` member access, `js/new`, full conversion layer
- Vite plugin: static analysis, codegen, HMR, TypeScript binding generation, nREPL relay
- Node and browser host modules
- Distributed nREPL mesh experiment (Redis-backed, streaming stdout)
- **Library system**: `CljamLibrary` format, `libraries` option in `SessionOptions`, `allowedPackages` permission model, `session.capabilities` introspection, `gen-library-sources` script
- **Published libraries**: `@regibyte/cljam-date@0.1.0`, `@regibyte/cljam-integrant@0.1.0`
- **npm packages**: `@regibyte/cljam@0.0.14`, `@regibyte/cljam-date@0.1.0`, `@regibyte/cljam-integrant@0.1.0` — all live
- **Incremental compiler** covering all hot-path forms — literals, symbols, `if`, `do`, `let*`, `fn*`, `loop*`/`recur`, function calls, qualified symbols, vector/map/set literals, `try`/`catch`/`finally`
- 2759 tests, 0 failures

### Known technical debt
1. **Async/sync evaluator duplication** — `async-evaluator.ts` duplicates special-form handling. Divergence at function application is intentional; the rest is reducible.
2. **Mode 2 factory uses positional args** — `(importMap, onOutput?)` should be `CljamFactoryContext` object.

---

## Priority Queue

Work items in order. Do not skip ahead — each layer is the foundation for the next.

### Level 1 — Immediate (fix before anything else)

- [x] **Move `browser.ts` → `src/host/browser.ts`** — fixes asymmetry with node host module
- [x] **Move `nrepl-relay.ts` → `src/nrepl/relay.ts`** — correct conceptual home

### Level 2 — Architecture (before adding new features)

- [ ] **Move `quasiquote` to the expander** — purely syntactic transform, should never reach the evaluator. Remove from `specialFormKeywords`.
- [ ] **Rename `letfn` → `letfn*`** (the special form is the mutual-recursion primitive); add `letfn` as a macro in `clojure/core.clj`
- [ ] **Extract multimethod primitives** — `make-multimethod`, `add-method!`, `multimethod?` as native functions; rewrite `defmulti`/`defmethod` as macros in `core.clj` using these. Preserve the re-eval guard: if the var already holds a multimethod, don't reset it.
- [x] **Make `delay` a macro** — `(defmacro delay [expr] \`(make-delay (fn* [] ~expr)))`; expose `make-delay` as a native function in the core module

### Level 3 — Medium Term

- [ ] **Reduce async/sync evaluator duplication** — extract shared helpers (`evaluateBody`, `evaluateDestructure`, `evaluateArgs`) that both paths call. Divergence at function application is intentional; everything else should converge.
- [x] **Library distribution strategy** — `CljamLibrary` format ships `.clj` source files as strings in the npm package; `gen-library-sources` script generates the sources manifest at build time. Implemented in `@regibyte/cljam-date` and `@regibyte/cljam-integrant`.
- [ ] **`CljamFactoryContext` object** — replace `(importMap, onOutput?)` with `{ importMap, onOutput?, onError? }` for forward-compatibility

### Level 4 — Compiler (ongoing)

See `docs/core-language.md` for the compilation target. See `docs/compiler-implementation-guide.md` for the concrete implementation reference.

- [x] **Phase 1: Compiler foundation** — literals + unqualified symbols; wired into `evaluateWithContext` with null fallback (Session 113)
- [x] **Phase 2: Control flow** — `if`, `do` (Session 114)
- [x] **Phase 3A: Function calls** — generic `(f arg1 arg2)` for any compilable head (Session 115)
- [x] **Phase 3B: `let*` slot indexing** — simple-symbol bindings; `SlotRef` + `CompileEnv` (Session 116)
- [x] **Phase 4: `fn*` body caching** — `compileDo` on body at definition time; `arity.compiledBody` (Session 117)
- [x] **Phase 5: `loop*`/`recur` → while** — no stack growth; `while(true)` with mutable slot cells (Session 118)
- [x] **Phase 6: Qualified symbols** — `ns/sym` resolved at runtime via `ctx.resolveNs` (Session 123)
- [x] **Phase 4b: `fn*` param slots** — `compileFnBody`; slot-indexed params; compiled fn-level recur (Session 124)
- [x] **Cleanup: Remove TS `let`/`fn`/`loop` handlers** — `let`, `fn`, `loop` now live entirely as Clojure macros (Session 125)
- [x] **Phase 7: Collection literals** — `[...]`, `{...}`, `#{...}` compile recursively; set deduplication via `is.equal` (Session 126)
- [x] **Phase 8: `try`/`catch`/`finally`** — compile body + catch branches + finally; rethrow non-matching errors.
- [ ] **Phase 9: `def`** — compile top-level var definitions; intern result returned as var object.
- [ ] **Phase 10: `binding`** — compile dynamic var scoping; push/pop binding stack in compiled closures.

### Level 5 — Pre-release

These are the gates before public release. Work on these after Level 1 + Level 2 are complete and most compiler phases are done.

- [ ] **Documentation and integration guides** — clear setup guides for Node, Bun, Deno, browser, Vite. The experiments folder becomes `examples/` with runnable, documented setups.
- [ ] **Update `compiler-implementation-guide.md`** — add Phase 4b (fn param slots), Phase 6 (qualified symbols), Phase 7 (collection literals) sections.
- [ ] **Public API review** — verify all exported types + functions are intentional; add JSDoc to public surface.
- [ ] **Library distribution strategy** — decide how `.clj` libraries ship via npm (see Level 3).
- [ ] **Self-hosting milestones** — gradually implement more of the evaluator in Clojure itself, using the compiler infrastructure.

---

## Architecture Principles

These are the rules that must not be broken as the codebase evolves:

1. **The core interpreter is host-agnostic.** No `fs`, `net`, or browser globals in `src/core/`. Host capabilities enter only through `RuntimeModule`.

2. **Never reinstall stdlib in `restoreRuntime`.** `clojure.core.clj` overwrites many native functions with lazy Clojure versions. The snapshot contains these. Reinstalling native versions silently reverts them.

3. **Dynamic vars use `ctx.resolveNs`, not `tryLookup`.** Functions defined during bootstrap close over the original snapshot env. `tryLookup` traverses that env and finds stale pre-clone vars. `ctx.resolveNs` goes through the current session's registry and is always correct.

4. **`@` is the only explicit async unwrap.** No auto-awaiting in `applyCallableAsync`. The sync evaluator stays sync; `async` is the opt-in boundary.

5. **IO routes through `emitToOut`/`emitToErr`.** Never call `ctx.io.stdout` directly. Always go through the IO routing layer so `*out*`/`*err*` dynamic binding and `with-out-str` work correctly.

6. **The compiler bails conservatively.** `compile()` returns `null` for any unsupported form — the interpreter handles it. An all-or-nothing bail propagates upward: if any sub-expression bails, the parent bails too. Never partially compile a form.

---

## Long-Term Vision

Once the architecture cleanup is complete and the compiler covers the remaining hot-path forms, the project's major effort shifts to:

1. **Documentation and integration guides** — clear setup guides for Node, Bun, Deno, browser, Vite. The experiments folder becomes `examples/` with runnable, documented setups.
2. **Library distribution** — a path for sharing Clojure namespaces via npm.
3. **Self-hosting milestones** — gradually implement more of the evaluator in Clojure itself, using the compiler infrastructure.

The dream: a project where you can write Clojure in any JavaScript environment, share libraries via npm, inject domain capabilities as namespaces, and have a live REPL anywhere — with performance good enough for production use cases.

**We have already proven this is achievable. The architecture works. The path is clear.**
