# Cljam-JS — Roadmap

> **Historical document.** Written early in development as the project's north star. The project concluded at v0.1.0 (2026-08); this file is kept as a design record and is no longer updated. For the current state see the root README and the [conformance page](../packages/docs/guide/conformance.md).

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

## Current State (as of Planning Session, 2026-04-29)

### What is fully working
- Complete interpreter pipeline: Tokenizer → Reader → Expander → Evaluator → Printer
- Full Clojure stdlib coverage including lazy sequences, transducers, atoms, multimethods
- Macro system: `defmacro`, quasiquote, `syntax-quote`, `gensym`
- `let`, `fn`, `loop`, `delay` are Clojure macros — `let*`/`fn*`/`loop*`/`make-delay` are the true primitives
- Namespace model with `require`, namespace aliasing, qualified keywords
- Try/catch/finally with predicate-based discriminators, destructuring (vector + map, nested, lazy-aware)
- Dynamic vars (`*out*`, `*err*`), `with-out-str`/`with-err-str`
- Async foundation: `CljPending`, `(async ...)` special form, explicit `@` unwrap, `then`/`catch*`
- Session API: `createSession`, `evaluateAsync`, `snapshotSession`, `createSessionFromSnapshot`
- RuntimeModule system with Kahn-sorted dependency resolution
- nREPL server (TCP, bencode) — Calva connects via Generic project type
- JS interop: `CljJsValue`, `js/` namespace, `.` member access, `js/new`, full conversion layer
- Vite plugin: static analysis, codegen, HMR, TypeScript binding generation, nREPL relay
- Node and browser host modules
- **Library system**: `CljamLibrary` format, `libraries` option in `SessionOptions`, `allowedPackages` permission model, `session.capabilities` introspection, `gen-library-sources` script
- **Published package family**: `@regibyte/cljam`, `@regibyte/cljam-date`, `@regibyte/cljam-integrant`, `@regibyte/cljam-schema`, `@regibyte/cljam-ring`, `@regibyte/cljam-mcp`
- **Polymorphism and discoverability**: `CljProtocol`, `CljRecord`, `defprotocol`, `extend-protocol`, `extend-type`, `defrecord`, `satisfies?`, `protocols`, `extenders`, `describe`
- **Standard namespaces**: `clojure.core`, `clojure.string`, `clojure.edn`, `clojure.math`, `clojure.test`, `clojure.walk`, `clojure.set`
- **Incremental closure compiler** covering literals, symbols, qualified symbols, dot-chain qualified symbols, `if`, `do`, function calls, `let*`, `loop*`/`recur`, function-body caching, fn param slots, vector/map/set literals, `try`/`catch`/`finally`, and `binding`
- **Current verification snapshot**: core test suite has 3321 passing tests in this environment; nREPL server tests could not bind localhost under sandboxing and failed on `EPERM`

### Known technical debt
1. **Roadmap and docs drift** — implementation has moved faster than this document in several areas. Keep this roadmap, `docs/core-language.md`, and `docs/compiler-implementation-guide.md` current as decisions change.
2. **Async architecture needs officialization** — async is a core JavaScript-host feature, not a hack. The current `CljPending` model works and should be documented as an execution invariant before the bytecode VM is designed.
3. **Async/sync evaluator semantic drift risk** — `async-evaluator.ts` intentionally provides an async-aware gateway, but all shared semantics must remain aligned with the sync evaluator and future compiled/VM paths.
4. **nREPL library/CLI boundary** — CLI-friendly bind failures currently call `process.exit(1)`. Embedded and test callers need a clean error surface.
5. **Mode 2 factory uses positional args** — `(importMap, onOutput?)` should be `CljamFactoryContext` object.

---

## Priority Queue

Work items in order. Do not skip ahead — each layer is the foundation for the next.

### Level 1 — Immediate (fix before anything else)

- [x] **Move `browser.ts` → `src/host/browser.ts`** — fixes asymmetry with node host module
- [x] **Move `nrepl-relay.ts` → `src/nrepl/relay.ts`** — correct conceptual home

### Level 2 — Architecture Cleanup

- [ ] **Move `quasiquote` to the expander** — purely syntactic transform, should never reach the evaluator. Remove from `specialFormKeywords`.
- [x] **Rename `letfn` → `letfn*`** (the special form is the mutual-recursion primitive); add `letfn` as a macro in `clojure/core.clj`
- [x] **Extract multimethod primitives** — `make-multimethod!`, `add-method!`, `multimethod?` as native functions; rewrite `defmulti`/`defmethod` as macros in `core.clj` using these. Preserve the re-eval guard: if the var already holds a multimethod, don't reset it.
- [x] **Make `delay` a macro** — `(defmacro delay [expr] \`(make-delay (fn* [] ~expr)))`; expose `make-delay` as a native function in the core module

### Level 3 — Runtime Semantics and API

- [ ] **Officialize async execution semantics** — document `CljPending`, `(async ...)`, explicit `@` unwrap, `then`/`catch*`, timeout behavior, sync/async evaluator boundaries, and how host async APIs should be exposed.
- [ ] **Reduce async/sync evaluator semantic drift** — extract shared helpers where it helps (`evaluateBody`, `evaluateDestructure`, `evaluateArgs`) while preserving the intentional async gateway.
- [x] **Library distribution strategy** — `CljamLibrary` format ships `.clj` source files as strings in the npm package; `gen-library-sources` script generates the sources manifest at build time. Implemented in `@regibyte/cljam-date` and `@regibyte/cljam-integrant`.
- [ ] **`CljamFactoryContext` object** — replace `(importMap, onOutput?)` with `{ importMap, onOutput?, onError? }` for forward-compatibility
- [ ] **nREPL embedded error boundary** — keep CLI startup failures friendly, but avoid `process.exit` for embedded/test paths.

### Level 4 — Closure Compiler Completion (next line of work)

See `docs/core-language.md` for the compilation target. See `docs/compiler-implementation-guide.md` for the concrete implementation reference.

The closure compiler is the bridge to the future bytecode VM. Finish it first so the VM design is grounded in actual cljam semantics instead of a theoretical opcode list.

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
- [x] **Phase 9: `binding`** — compile dynamic var scoping; push/pop binding stack in compiled closures.
- [ ] **Phase 10: `def`** — compile top-level var definitions; preserve var metadata, docstrings, dynamic markers, source positions, and redefinition semantics.
- [ ] **Phase 11: `var` and `set!`** — compile var lookup without deref and root mutation while preserving live-var semantics.
- [ ] **Phase 12: `quote`** — compile quoted forms to constants, including source-position safe behavior for error reporting.
- [ ] **Phase 13: JS interop special forms** — compile `.`, `js/new`, and any remaining host interop forms without weakening `CljJsValue` boundaries.
- [ ] **Phase 14: `letfn*`** — compile mutual-recursion primitive or clearly document why it remains interpreter-only.
- [ ] **Phase 15: lazy and async boundary forms** — decide whether `lazy-seq` and `(async ...)` compile to closures, remain interpreter-only, or become explicit VM-era control forms.
- [ ] **Phase 16: destructuring strategy** — decide whether destructuring should compile directly, lower earlier into simple `let*` bindings, or remain macro/native helper work.
- [ ] **Compiler coverage audit** — keep `src/core/compiler/__tests__/compiler-coverage.spec.ts` as the executable compiler roadmap. Every newly compiled form must move from "bails" to "compiles".
- [ ] **Update compiler guide** — bring `docs/compiler-implementation-guide.md` current with fn param slots, qualified symbols, dot-chain qualified symbols, collection literals, try/catch/finally, and binding.

### Level 5 — VM Design (after closure compiler completion)

Do not implement the bytecode VM until the closure compiler work above is mostly complete and documented. The VM should be the next backend for the existing compiler pipeline, not a rewrite of the runtime.

- [ ] **Write `docs/vm-invariants.md`** — define non-negotiable runtime properties: live vars, namespace introspection, `describe`, loaded namespace listing, dynamic vars, snapshots, source positions, stack traces, host capability boundaries, and async pending semantics.
- [ ] **Write `docs/bytecode-ir.md`** — define `Chunk`, constants table, instruction stream, operands, source map, stack/register choice, local slot model, closure/capture model, and fallback contract.
- [ ] **Define initial opcode set** — start with literals, locals, var lookup, qualified var lookup, control flow, calls, return, collection construction, dynamic binding, throw/try, and explicit async unwrap.
- [ ] **Choose the async execution model** — one bytecode model with sync and async runners, or one resumable VM loop. Preserve explicit `@` unwrap and avoid implicit auto-await across ordinary calls.
- [ ] **Build a VM spike** — compile and run literals, locals, `if`, `do`, simple calls, and return. Keep interpreter fallback intact.
- [ ] **Benchmark against tree-walker and closure compiler** — fib, loop/recur, function calls, map/reduce, protocol dispatch, dynamic vars, and async-heavy Ring/Integrant examples.

### Level 6 — Polymorphism and Discoverability

Full design in `docs/polymorphism-spec.md`. Phase A is implemented; the remaining work is the printer protocol and keyword hierarchy.

**Phase A — Protocols + Records**
- [x] `CljProtocol`, `CljRecord` types in `types.ts`
- [x] `defprotocol`, `extend-protocol`, `extend-type` macros + native backing fns (`make-protocol!`, `extend-protocol!`)
- [x] `defrecord` — typed persistent map with inline protocol implementation
- [x] `satisfies?`, `protocols`, `extenders` introspection functions
- [x] `describe` — returns plain map describing any value (record, protocol, namespace, fn, multimethod)

**Phase B — Printer protocol**
- [ ] `IPrintable` bootstrap protocol with native implementations for all built-in types
- [ ] `defrecord` auto-extends `IPrintable` with default `#RecordType{...}` renderer
- [ ] `str` routes through `IPrintable/print-str`
- [ ] Users can override print format per record type

**Phase C — Keyword hierarchy**
- [ ] `make-hierarchy`, `derive`, `underive`, `isa?`, `ancestors`, `descendants`, `parents`
- [ ] Global `*hierarchy*` atom
- [ ] Multimethod dispatch checks `isa?` after exact-match failure

### Level 7 — Standard Library Expansion

- [x] `clojure.test` — `deftest`, `is`, `testing`, `run-tests`. Enables library authors to write tests in cljam.
- [x] `clojure.edn` — `edn/read-string`, `edn/pr-str`. Makes cljam data interoperable with JVM Clojure servers.
- [x] `clojure.math` — wrap `js/Math`. `PI`, `sin`, `cos`, `floor`, `ceil`, `pow`.
- [ ] `clojure.data` — `diff` function for change tracking.
- [ ] `clojure.pprint` namespace — `pprint` exists in core today; a dedicated namespace still needs to be split out if we want JVM-like require semantics.
- [ ] `clojure.repl` — `doc`, `dir`, `find-doc` — REPL quality of life.

### Level 8 — Libraries and Integrations

- [x] **`cljam-date`** — date handling library.
- [x] **`cljam-integrant`** — data-driven system composition.
- [x] **`cljam-schema`** — data-driven schema validation and JSON Schema generation.
- [x] **`cljam-ring`** — Ring-style HTTP server around Node's `http` module. Async handler model. Compose with `cljam-integrant` — boot/halt server from nREPL.
- [x] **`cljam-mcp`** — persistent interactive cljam sessions exposed through MCP.
- [ ] **Examples instead of experiments** — promote stable experiments into documented examples.

### Level 9 — Pre-release

These are the gates before public release.

- [ ] **Documentation and integration guides** — clear setup guides for Node, Bun, Deno, browser, Vite. The experiments folder becomes `examples/` with runnable, documented setups.
- [ ] **Public API review** — verify all exported types + functions are intentional; add JSDoc to public surface.
- [ ] **Self-hosting milestones** — gradually implement more of the evaluator in Clojure itself, using the compiler infrastructure.

---

## Architecture Principles

These are the rules that must not be broken as the codebase evolves:

1. **The core interpreter is host-agnostic.** No `fs`, `net`, or browser globals in `src/core/`. Host capabilities enter only through `RuntimeModule`.

2. **Never reinstall stdlib in `restoreRuntime`.** `clojure.core.clj` overwrites many native functions with lazy Clojure versions. The snapshot contains these. Reinstalling native versions silently reverts them.

3. **Dynamic vars use `ctx.resolveNs`, not `tryLookup`.** Functions defined during bootstrap close over the original snapshot env. `tryLookup` traverses that env and finds stale pre-clone vars. `ctx.resolveNs` goes through the current session's registry and is always correct.

4. **`@` is the only explicit async unwrap.** No auto-awaiting in `applyCallableAsync`. The sync evaluator stays sync; `async` is the opt-in boundary.

5. **Async is a first-class JavaScript-host feature.** Any compiler or VM design must preserve `CljPending` values, explicit unwrap, async Ring/Integrant workflows, and host APIs that naturally return promises.

6. **IO routes through `emitToOut`/`emitToErr`.** Never call `ctx.io.stdout` directly. Always go through the IO routing layer so `*out*`/`*err*` dynamic binding and `with-out-str` work correctly.

7. **The compiler bails conservatively.** `compile()` returns `null` for any unsupported form — the interpreter handles it. An all-or-nothing bail propagates upward: if any sub-expression bails, the parent bails too. Never partially compile a form.

8. **The bytecode VM is a backend, not a semantic rewrite.** The interpreter remains the oracle. The VM must execute the same post-expansion core language, preserve the same dynamic runtime model, and keep fallback paths available during incremental rollout.

---

## Long-Term Vision

The next strategic sequence is:

1. **Closure compiler completion** — finish compiling the remaining core forms, document the exact bails, and use the closure compiler as the practical map of VM requirements.
2. **Async semantics officialization** — make `CljPending` and explicit unwrap part of the runtime contract before bytecode design hardens.
3. **VM invariants and bytecode IR** — design the VM around cljam's actual dynamic properties: live vars, namespaces, introspection, dynamic bindings, snapshots, and async host APIs.
4. **Bytecode VM spike** — implement a small, measured backend under the existing compiler/fallback contract.
5. **Printer protocol and keyword hierarchy** — finish the remaining polymorphism surface.
6. **Documentation and examples** — move the project from impressive prototype to legible platform.

Longer-term areas remain:

- `clojure.data`, `clojure.repl`, and richer REPL documentation
- public API review and JSDoc
- stable examples for Node, Bun, browser, Vite, Ring, Integrant, MCP, and schema workflows
- self-hosting milestones, gradually implementing more of the evaluator/runtime in Clojure itself

The dream: a project where you can write Clojure in any JavaScript environment, share libraries via npm, inject domain capabilities as namespaces, have a live REPL anywhere — and have a runtime legible enough that LLM agents can use it as a first-class programming environment.

**We have already proven this is achievable. The architecture works. The path is clear.**
