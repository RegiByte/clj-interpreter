# Changelog

## 0.1.0 — 2026-08-28

Final release. The project is complete and not actively maintained.

### Architecture

- **Analyzer front-end.** Source is read, macro-expanded, and resolved into an AST with lexical slots, closure capture sets, tail positions, and source positions. Malformed forms are rejected with positioned errors before evaluation. The analyzer is the sole owner of macro expansion.
- **AST walker** is the reference engine. Evaluates the resolved AST directly; owns top-level forms, macros, async, and any function the VM declines.
- **Bytecode VM** shares the analyzer front-end (`ir-compiler.ts`). Default execution mode is `function-body`: capture-free function bodies compile to bytecode. Tail self-calls compile to constant-stack `FnRecur`; non-tail recursion runs on heap-allocated frames up to 100 000 deep, then throws a catchable error.
- **Differential harness** evaluates every form of the Clojure semantic suite on both engines and asserts identical results, thrown values included (290/290).
- **Namespace loader/linker.** Graph-aware `loadFileAsync`, fail-fast `loadFile`, one namespace per file, cycle detection, `cljam.sourceRoots` resolution.
- **Async as a lexical boundary.** `(async …)` is an analyzer op; `@` awaits inside it; closures never inherit async-ness.
- All legacy engines removed: form walker, async evaluator, original compiler, TypeScript destructuring (destructuring is now `clojure.core` lowering to symbol-only `let*`/`loop*`).

### Semantics

- Records follow JVM rules: assoc of unknown keys keeps the record; dissoc of a basis key demotes to a map; `map->P`, positional constructor, and equality match JVM.
- `letfn` names are captured in `lazy-seq` thunks.
- Runtime reader errors (`read-string`, `clojure.edn/read-string`) are catchable Clojure errors.
- Persistent vector is a 32-way trie; maps are HAMTs; `IndexedSeq` removes the O(n²) behaviour of lazy traversal over vectors.

### Tooling

- CLI (`repl`, `run`, `nrepl-server`), bencode nREPL server (Calva / CIDER / Cursive), Vite plugin, MCP server, browser playground.
- Conformance review against JVM Clojure 1.12.1 documented in `packages/docs/guide/conformance.md`.

### Satellite packages

`cljam-schema`, `cljam-date`, `cljam-integrant`, `cljam-mcp` 0.2.0 and `cljam-ring` 0.1.0 (first publish) require `@regibyte/cljam >= 0.1.0`. Earlier cljam versions are not supported.

## 0.0.20 and earlier

Pre-analyzer interpreter. No changelog was kept; see the git history on `main` before 2026-04-27.
