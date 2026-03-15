# Conjure-JS — Roadmap

> **This is the north star document.** It describes what Conjure is, where it stands today, and where it is going. Update it when decisions change. Read it at the start of every work session.

---

## What Conjure Is

A **runtime-embeddable, snapshot-capable, module-injectable Clojure interpreter that runs anywhere JavaScript runs.**

This is unoccupied territory:
- ClojureScript requires AOT compilation and the full CLJS toolchain — not embeddable
- Babashka runs on the JVM — not JS-native
- Nobody else has done this

**The interpreter overhead is a feature, not just a limitation.** The ability to evaluate code at runtime, inspect and evolve a live namespace, and snapshot/restore a session is what makes live programming, metaprogramming, and runtime composition possible. An AOT-compiled approach cannot do this. We optimize the interpreter — we do not replace it.

---

## Target Use Cases

Conjure shines wherever **business logic, flexibility, metaprogramming, and live programming** are valuable in combination. Concretely:

- **Data processing scripts** — readable, composable, data-oriented pipelines
- **Business logic layers** — hot-swappable rules, live REPL iteration
- **MCP server runtimes** — give an AI a full live Clojure runtime to eval and evolve its own code during a session
- **Live/exploratory programming** — REPL-driven development in any JS environment
- **Custom embedded languages** — inject domain capabilities as namespaces via the RuntimeModule system

The **RuntimeModule system** is the key extensibility primitive. Users inject host capabilities (IO, HTTP, databases, domain APIs) as namespaces — not just Clojure source. This makes Conjure run correctly in any environment with a custom capability surface.

---

## Current State (as of Session 107, 2026-03-14)

### What is fully working
- Complete interpreter pipeline: Tokenizer → Reader → Expander → Evaluator → Printer
- Full Clojure stdlib coverage including lazy sequences, transducers, atoms, multimethods
- Macro system: `defmacro`, quasiquote, `syntax-quote`, `gensym`
- Namespace model with `require`, namespace aliasing, qualified keywords
- Try/catch/finally, destructuring (vector + map, nested, lazy-aware)
- Dynamic vars (`*out*`, `*err*`), `with-out-str`/`with-err-str`
- Async foundation: `CljPending`, `(async ...)` special form, `@` unwrap, `then`/`catch*`
- Session API: `createSession`, `evaluateAsync`, `snapshotSession`, `createSessionFromSnapshot`
- RuntimeModule system with Kahn-sorted dependency resolution
- nREPL server (TCP, bencode) — Calva connects via Generic project type
- JS interop: `CljJsValue`, `js/` namespace, `.` member access, `js/new`, full conversion layer
- Vite plugin: static analysis, codegen, HMR, TypeScript binding generation, nREPL relay
- Node and browser host modules
- Distributed nREPL mesh experiment (Redis-backed, streaming stdout)
- ~2100 tests, 0 failures

### Known technical debt
1. **`readPrintCtx` env aliasing** — `tryLookup('*print-length*', callEnv)` is a latent bug (same class as the Session 86 bug). Fix: use `ctx.resolveNs` instead of `tryLookup`. One line.
2. **`runtime.ts` at ~977 lines** — mixes registry management, bootstrap, and the snapshot invariant. The "never reinstall stdlib in restoreRuntime" rule is only in comments.
3. **Async/sync evaluator duplication** — `async-evaluator.ts` (~554 lines) duplicates special-form handling. The divergence at function application is intentional and correct; the rest is reducible.
4. **`collections.ts` at ~958 lines** — too large. Natural splits: `seq.ts`, `maps-sets.ts`, `vectors.ts`.
5. **`nrepl-relay.ts` in wrong package** — lives in `vite-plugin-clj/`, should be `src/nrepl/relay.ts`.
6. **`browser.ts` in wrong location** — lives in `vite-plugin-clj/`, should be `src/host/browser.ts`.
7. **Mode 2 factory uses positional args** — `(importMap, onOutput?)` should be `ConjureFactoryContext` object.

---

## Priority Queue

Work items in order. Do not skip ahead — each layer is the foundation for the next.

### Level 1 — Immediate (fix before anything else)

- [ ] **Fix `readPrintCtx` env aliasing** — one line in `printer.ts`, prevents a latent time bomb
- [ ] **Move `browser.ts` → `src/host/browser.ts`** — fixes asymmetry with node host module
- [ ] **Move `nrepl-relay.ts` → `src/nrepl/relay.ts`** — correct conceptual home
- [ ] **Split `collections.ts`** → `seq.ts` + `maps-sets.ts` + `vectors.ts`

### Level 2 — Architecture (before adding new features)

- [ ] **Move `quasiquote` to the expander** — purely syntactic transform, should never reach the evaluator. Remove from `specialFormKeywords`.
- [ ] **Rename `letfn` → `letfn*`** (the special form is the mutual-recursion primitive); add `letfn` as a macro in `clojure/core.clj`
- [ ] **Extract multimethod primitives** — `make-multimethod`, `add-method!`, `multimethod?` as native functions; rewrite `defmulti`/`defmethod` as macros in `core.clj` using these. Preserve the re-eval guard: if the var already holds a multimethod, don't reset it.
- [ ] **Make `delay` a macro** — `(defmacro delay [expr] \`(make-delay (fn* [] ~expr)))`; expose `make-delay` as a native function in the core module
- [ ] **Split `runtime.ts`** → `src/core/registry.ts` (namespace registry + clone), `src/core/bootstrap.ts` (buildRuntime + installModules + invariant documentation), thin `src/core/runtime.ts` (createRuntime / restoreRuntime orchestrators)

### Level 3 — Medium Term

- [ ] **Reduce async/sync evaluator duplication** — extract shared helpers (`evaluateBody`, `evaluateDestructure`, `evaluateArgs`) that both paths call. Divergence at function application is intentional; everything else should converge.
- [ ] **Library distribution strategy** — decide how `.clj` libraries ship via npm. Leading candidate: ship `.clj` source files + a manifest; the Vite static analysis pass follows requires across package boundaries. Needs a dedicated design session.
- [ ] **`ConjureFactoryContext` object** — replace `(importMap, onOutput?)` with `{ importMap, onOutput?, onError? }` for forward-compatibility

### Level 4 — Long Term (Compiler)

See `docs/core-language.md` for the compilation target.

- [ ] **Phase 1: Compiler foundation** — `evaluator/compiler.ts`; compile literals, symbols, and plain function calls to JS closures `(ctx) => CljValue`
- [ ] **Phase 2: Control flow** — compile `if`, `do`, `throw`, `try`
- [ ] **Phase 3: Slot indexing** — compile `let*`, assign variable slots at compile time; `env[0]` replaces `tryLookup("x", env)`. This is the key performance gain.
- [ ] **Phase 4: Closure compilation** — compile `fn*`; slot-indexed params; var-object deref for globals
- [ ] **Phase 5: Tail calls** — compile `loop*`/`recur` to `while` loops; no stack growth

---

## Architecture Principles

These are the rules that must not be broken as the codebase evolves:

1. **The core interpreter is host-agnostic.** No `fs`, `net`, or browser globals in `src/core/`. Host capabilities enter only through `RuntimeModule`.

2. **Never reinstall stdlib in `restoreRuntime`.** `clojure.core.clj` overwrites many native functions with lazy Clojure versions. The snapshot contains these. Reinstalling native versions silently reverts them.

3. **Dynamic vars use `ctx.resolveNs`, not `tryLookup`.** Functions defined during bootstrap close over the original snapshot env. `tryLookup` traverses that env and finds stale pre-clone vars. `ctx.resolveNs` goes through the current session's registry and is always correct.

4. **`@` is the only explicit async unwrap.** No auto-awaiting in `applyCallableAsync`. The sync evaluator stays sync; `async` is the opt-in boundary.

5. **IO routes through `emitToOut`/`emitToErr`.** Never call `ctx.io.stdout` directly. Always go through the IO routing layer so `*out*`/`*err*` dynamic binding and `with-out-str` work correctly.

---

## Long-Term Vision

Once the architecture cleanup is complete and the compiler phases are underway, the project's major effort shifts to:

1. **Documentation and integration guides** — clear setup guides for Node, Bun, Deno, browser, Vite. The experiments folder becomes `examples/` with runnable, documented setups.
2. **Library distribution** — a path for sharing Clojure namespaces via npm.
3. **Self-hosting milestones** — gradually implement more of the evaluator in Clojure itself, using the compiler infrastructure.

The dream: a project where you can write Clojure in any JavaScript environment, share libraries via npm, inject domain capabilities as namespaces, and have a live REPL anywhere — with performance good enough for production use cases.

**We have already proven this is achievable. The architecture works. The path is clear.**
