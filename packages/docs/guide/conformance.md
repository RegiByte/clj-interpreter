# Conformance with JVM Clojure

cljam targets the semantics of JVM Clojure 1.12. This page records how that claim was tested, what matched, and what does not. It is the authoritative list of known divergences.

## How it was tested

Three independent layers, each catching a different class of error.

### 1. Clojure semantic suite

`packages/cljam/src/core/__tests__/clojure_suite/` — 21 `.clj` files written in `clojure.test`, engine-independent, run through the session API. Several files mirror the [jank](https://github.com/jank-lang/jank) test suite (`eq.cljc`, the `*_qmark.cljc` predicate files, namespace behaviour), adapted to the subset cljam supports. Areas: arithmetic, atoms, chars, collections, destructuring, edn, equality, error handling, hierarchies, higher-order fns, macros, math, metadata, multimethods, namespaces, predicates, sequences, sets, strings, transducers, vars.

### 2. Differential harness (walker ⇄ VM)

cljam has two execution engines sharing one analyzer front-end: the AST walker (the semantic reference) and a bytecode VM used for function bodies by default. `differential.spec.ts` evaluates every suite form on both engines and asserts identical results, including thrown values. 290/290 forms agree with 290/290 VM coverage. This guarantees the fast path cannot silently drift from the reference.

### 3. Black-box review against JVM Clojure 1.12.1

Six independent reviewers, given no knowledge of cljam internals or its known-gaps list, solved 16 practical challenges (collections, laziness, equality, destructuring, arity/recursion, macros, records/protocols, multimethods, state, dynamic vars, namespaces, reader, printing, exceptions, transducer pipelines, integration katas) on JVM Clojure and on cljam, then reported every observable difference with a minimal repro. Findings were deduplicated and ranked by how silently they fail.

Result: **16/16 challenges scored PARTIAL** — every area had a working core and at least one divergence. Nothing was unsolvable; nothing passed byte-for-byte end to end.

## What matches JVM Clojure

Probed hard and came back value- or byte-identical:

- **Destructuring** — the full matrix: nested map/vector, `:keys`/`:strs`/`:syms`, namespaced and `::keys`, `:or` referencing earlier bindings, `:as`, `& rest`, kwargs, nil sources.
- **Functions and recursion** — multi-arity/variadic dispatch, `recur` in fn and loop tails, both recur compile-error forms, `trampoline`, `letfn` mutual recursion, `partial`/`comp`/`juxt`/`apply`; 10M-iteration `loop`/`recur`; non-tail recursion to 100k frames (deeper than a default JVM stack) with a catchable overflow error.
- **Macros** — `defmacro`, syntax-quote/unquote/splicing into vector and set literals, auto-gensym, `macroexpand-1`/`macroexpand`, expansion-time helpers, recursive macros.
- **Records** — value equality, record ≠ map, assoc of an unknown key stays a record, dissoc of a basis key demotes to a map, `map->P`, positional `->P`, protocol dispatch after assoc.
- **Protocols and multimethods** — keyword and arbitrary-fn dispatch, `:default`, global `derive`/`isa?`/`parents`/`ancestors`/`descendants`, last-definition-wins, catchable missing-method and ambiguity errors.
- **State** — `swap!` (multi-arg, CAS), `swap-vals!`/`reset-vals!`, watches, volatiles, `delay`/`force`/`realized?`, `memoize`.
- **Dynamic vars** — `binding` nesting with restore on exit and on throw, `set!` inside `binding`, `with-redefs`, `alter-var-root`, forward declarations, and the lazy-seq binding-conveyance behaviour reproduced exactly.
- **Exceptions on cljam's idiom** — `ex-info`/`ex-data`/`ex-message`, `finally` on success and error, nested `finally` ordering, rethrow with data intact.
- **Namespaces** — multi-file projects via `cljam.sourceRoots`, transitive requires, `:as`, `:refer [syms]`, circular-require detection, one-namespace-per-file.
- **Reader** — `#_`, metadata forms, quote/var/deref/syntax-quote, char and string literals, dotted/slashed keywords, `::auto`, `#(… %1 %2 %&)`, regex literals with named groups and inline flags.
- **Printing** — `pr-str` ↔ `read-string` byte-identical on nested structures; `*print-length*`/`*print-level*`.
- **Laziness** — creation is free, `lazy-seq` recursion, `take`/`drop`/`take-while`, `cycle`/`repeat`/`iterate`, `doall`/`dorun`, `mapcat`, `realized?`, `apply concat` spine realization.
- **Transducers** — `transduce`, `completing`, `into` with xf, `sequence` with xf, `partition-by`/`partition-all` as transducers, early termination, `dedupe`.
- **Equality** — cross-type sequential equality, equal ⇒ same hash including cross-type set/map lookup, stable sort, `min-key`/`max-key` ties.

## Known divergences

Grouped by how they fail. **Silent** means code runs and produces a different value; **loud** means cljam errors where JVM succeeds.

### Silent — wrong value, no error

| Behaviour | JVM | cljam |
|---|---|---|
| `(catch Exception e …)` | matches | never matches — class symbols are not discriminators; use `:default`, a keyword, or a predicate |
| `(= 1 1.0)` | `false` | `true` — one IEEE-754 number type; `{1 :a 1.0 :b}` has one entry |
| `(= \a (first "a"))` | `true` | `false` — `\a` is a char, string traversal yields 1-char strings |
| `(first (partition 3 (range)))` | `(0 1 2)` | hangs — `partition` is eager (`partition-all` is lazy) |
| Integer literal > 2⁵³ | exact | precision lost at read time |
| Integer overflow | throws | returns a double |
| `017` | `15` (octal) | `17` |
| `"\101"` | `"A"` | `"101"` |
| `(assoc [1 2 3] -1 :x)` | throws | returns the vector unchanged |
| `(let [{a 0} [10 20]] a)` | `10` | `nil` |
| `atom` `:validator`, `defmulti :hierarchy` | honoured | ignored |
| Duplicate keys in a map literal | read error | last wins |
| Local shadowing a macro name | local wins | macro wins |
| `((->R 5 6) :w)` (record as fn) | throws | `5` |
| Cross-namespace access to `defn-` | error | allowed |
| `(identical? :a (keyword "a"))` | `true` | `false` (`=` is fine) |
| Chunked seqs | 32-element realization | 1 element at a time (values identical; side-effect counts differ) |

### Loud — error where JVM succeeds

- `(conj nil x)`, `(dissoc nil k)`, `(pop nil)` throw; `(conj {} {})` does not merge.
- `compare` rejects vectors, symbols, booleans — `(sort [[3] [1 2]])` throws.
- `(/ 1.0 0.0)` throws (JVM `##Inf`).
- `(println (seq "hi"))` and string destructuring crash.
- `&form`/`&env` are not bound inside macros.
- `@#'var` fails; `(resolve 'x)` returns the value, not a var.
- Clojure 1.11 trailing-map kwargs call form fails.
- `iterate` applies its fn one extra time; `(doall n coll)`/`(dorun n coll)` arities missing.
- `delay` does not cache a thrown exception.

### Output and printing

- `print`/`pr` append a newline; `println`/`prn` emit two.
- Uncaught `ex-info` at the CLI prints `[object Object]` with no message, data, or source position.
- Maps print without comma separators; `sort`/`sort-by`/`keys`/`vals` return vectors and print as `[…]`.
- Record tag prints as `#user/P{…}` and cannot be read back.
- `NaN`/`Infinity` print in JS form (unreadable); `1e3` prints `1000`.
- `(str ["a"])` → `"[a]"` (JVM `"[\"a\"]"`).
- `class` returns strings; `type` on records returns a keyword.
- Reader error positions are 0-based.

### Not implemented

- **Sorted collections**: `sorted-map`, `sorted-set`, `sorted-*-by`, `subseq`, `rsubseq`, `sorted?`, `rseq`.
- **Numeric tower**: `==`, `##Inf`/`##-Inf`/`##NaN`, hex/radix/ratio/bigint/bigdec literals, `\oNNN`.
- **Multimethod API**: `prefer-method`, `prefers`, `methods`, `get-method`, `remove-method`, `remove-all-methods`; no dispatch dominance (diamond hierarchies are unresolvable); no vector `isa?` dispatch.
- **Types**: `deftype`, `reify`, `array-map`.
- **Transducers**: `eduction`, `halt-when`, 0-arity `distinct`.
- **Namespace tooling**: `alias`, `ns-resolve`, `requiring-resolve`, `:rename`, `:refer :all`.
- **Reader**: reader conditionals `#?` (including `.cljc`), `#inst`/`#uuid` in code, `*read-eval*`.
- **Vars**: `bound?`, `thread-bound?`, `*print-meta*`.
- **Regex**: `re-matcher`, `re-groups`.
- **Host**: Java interop, `import`, `gen-class`, `future`, `agent`, `ref`/STM.

## Intended design differences

These are not bugs; they follow from running on a JavaScript host and are stable.

- **Exceptions**: any value can be thrown; `catch` discriminators are `:default`, `:error/runtime`, a keyword matched against `(:type thrown)`, or a predicate. There is no class hierarchy.
- **Numbers**: one IEEE-754 double type. `(= nan nan)` is `false` everywhere.
- **Async**: `(async …)` is a lexical boundary; `@` inside it awaits; closures never inherit async-ness (the JavaScript model).
- **Protocols** dispatch on keyword type tags, not classes.
- **Recursion**: non-tail recursion runs on heap-allocated VM frames to a fixed 100k budget, then throws a catchable error.
