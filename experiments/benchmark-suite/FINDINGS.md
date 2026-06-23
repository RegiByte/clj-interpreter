# Findings — First Cross-Engine Benchmark Run

> **⚡ UPDATE (session 334, 2026-06-21): Finding 2 is RESOLVED.** The vector `conj`
> O(n²) pathology is fixed — `CljVector` now uses a 32-way trie + tail (the
> persistent-vector arc). `vector-build`: cljam **3.67s → 130ms (interp) / 46ms (VM)**,
> **437×/565× → 16.4×/5.8× SCI**, scaling now **linear** (2×n ⇒ ~1.7×t, was ~8×t).
> Geomean vs SCI dropped ~24× → ~17× (VM). Numbers below are the ORIGINAL 2026-06-11
> baseline, kept for the record; re-measure with `node bench.mjs` against the newest
> `runs/` dir for current state. (Finding 3 — lazy-seq — and Finding 4 — the map-assoc
> VM anomaly — remain open.)

**Date:** 2026-06-11
**Run:** `runs/20260611-141335/` (git `a9fe155` + working tree, Node v22.14.0, Apple M1 Max)
**Engines:** cljam-interp (`vmExecutionMode: 'off'`) · cljam-vm (`'function-body'`) · sci (nbb 1.4.207) · js (idiomatic reference)
**Integrity:** all 52 engine×workload pairs passed the correctness gate before timing.

## Problem

The VM arc was motivated by a performance ceiling in the tree-walker, but no
measurement existed of (a) how much the VM actually delivers, or (b) how cljam
compares to SCI, the incumbent for its niche. This run answers both.

## Headline numbers

Geometric mean across 13 workloads (per-call medians, ratios = times slower):

| engine | vs js | vs sci |
|---|---:|---:|
| cljam-interp | 1728× | 43.3× |
| cljam-vm | 973× | 24.4× |
| sci | 39.9× | 1.0× |

## Finding 1 — the VM is real, but modest: ~1.8× overall, 2–4× where execution dominates

VM speedup over the interpreter by workload: atom-swap **4.2×**, loop-sum
**3.4×**, closure-churn **2.9×**, try-catch **2.4×**, multimethod **2.0×**,
destructure **1.9×**, seq-pipeline ~1.9×, fib **1.4×** … and then:
data-transform 1.15×, string-build 1.16×, vector-build **1.00×**, map-assoc
**0.77× — the VM is slower than the interpreter** (379ms vs 491ms; anomaly,
see Finding 4).

Interpretation: the VM accelerates *instruction execution*, so it shines on
control-flow/call-heavy code and does nothing for allocation-bound code. The
ceiling the VM was built to break is, today, mostly not an execution ceiling.

## Finding 2 — the real bottleneck is data structures: vector conj is O(n²)

`vector-build` (50k conj + traversal): cljam **3.67 s** on BOTH engines —
**437× slower than SCI** (8.4 ms). A scaling probe confirms quadratic behavior
(conj-only: 10k→64ms, 20k→510ms, 40k→2459ms — 4× n ⇒ 38× time).

Root cause, with receipt: `CljVector` wraps a plain JS array
(`src/core/factories.ts:70`) and conj copies the whole array every call —
`v.vector([...collection.value, ...args])` at
`src/core/modules/core/stdlib/seq.ts:174`. SCI inherits ClojureScript's
32-way-trie PersistentVector (O(1) amortized conj, structural sharing).
`assoc`-on-vector and similar operations share the copy-on-write pattern.

The map story is structurally better (HAMT exists in `src/core/persistent/`)
but still **84–108× slower than SCI** on `map-assoc` — worth profiling
(Movement B) before assuming the kernel itself is the problem.

## Finding 3 — lazy sequences are pathologically expensive — ✅ RESOLVED (session 339)

`seq-pipeline` vs `transduce-pipeline` run the *same logical work*
(filter→map→take 1000→reduce over `(range 100000)`):

| | seq (lazy) | transducers | lazy / xf |
|---|---:|---:|---:|
| cljam-interp | 1031 ms | 8.3 ms | **124×** |
| cljam-vm | 547 ms | 4.7 ms | **116×** |
| sci | 0.27 ms | 0.13 ms | 2.1× |

In SCI laziness costs 2× over transducers; in cljam it costs >100×. The
lazy-seq cell machinery is the single largest per-workload gap in the suite
(2000–3800× vs SCI) and drags every seq-idiomatic program.

> **UPDATE (session 339) — the pathology is dead.** Root cause was NOT the lazy
> cell machinery (<2% of profile) but **O(n) array-copying `rest` over an eager
> array-backed source** → O(n²) traversal + GC storm (session 336 diagnosis). Fix:
> the **IndexedSeq** `{array, offset}` view — `seq`/`rest` now produce O(1) views
> (Phase C). `runs/20260622-164646/`:
> - `seq-pipeline` cljam-vm **547→950→14.25 ms** (the 950 was a later, cleaner
>   measurement; either way **~67× faster**), **~3485× → ~49× SCI**.
> - rest-walk @ N=40000 **1304 → 22.5 ms (~58×)**, scaling now **linear** (was O(n²)).
> - take-1000 pipeline **near-flat** in N. Phase D (lazy `range`) flattens the
>   residual eager-build slope. The remaining ~49× SCI = generic call overhead
>   (execution engine, Phase 2/3 — out of scope for this arc, as predicted).
>
> **UPDATE (session 340) — Phase D + streaming reduce; both pipelines now FLAT.**
> `runs/20260623-024052/`. Two changes:
> 1. **Lazy `range`** (Phase D) — `range` is now a pure-Clojure `lazy-seq` recurrence
>    (`core.clj`), matching Clojure (incl. zero-step → infinite `(repeat start)`).
>    Only pulled elements realize → the take-1000 pipeline is **flat in N** (source
>    size stops mattering): `seq-pipeline` holds ~18-19 ms across N=25k–400k.
> 2. **Streaming `reduce`/`transduce`** — Phase D *exposed* a latent bug: both
>    `reduce` (`hof.ts`) and `transduce` (`transducers.ts`) did `toSeq(coll)` —
>    **fully realizing a lazy source before reducing** — so an early-terminating
>    transducer (`take`) couldn't stop the pull. Eager `range` hid this (already a
>    list); lazy `range` made `(transduce (take 1000…) + 0 (range 100000))` realize
>    all 100k → **314 ms, linear in N**. Fix: a `streamSeq` generator (one-cell-at-
>    a-time via the existing `realizeLazySeq` trampoline); `reduce`/`transduce` now
>    **stream** lazy/cons sources (per-step `reduced` check, tail never realized) and
>    keep the materialized fast-path for concrete collections.
> - `seq-pipeline` cljam-vm **18.97 ms (64.8× SCI)**, flat in N.
> - `transduce-pipeline` cljam-vm **314 → 8.29 ms (60.9× SCI)**, flat in N (~38×).
> - **Transducers now correctly beat lazy seqs** (8.3 vs 19 ms) — the Finding's
>   original table had them *backwards* (lazy 116× *slower*). Order restored.
> - Headline cljam-vm geomean **15.1× → 11.7× SCI** (the transduce outlier gone).
> - Both pipelines now sit at the **~60× SCI generic-call-overhead floor** =
>   execution engine (Phase 2/3), the banked-and-stop line for this arc.
> - **Lesson:** lazy *production* needs streaming *consumption*. A consumer that
>   materializes before consuming throws away the producer's laziness at the
>   boundary — the eager half dominates. Both halves of the seq protocol must agree.

## Finding 4 — bright spots and anomalies

- **try-catch: cljam-vm BEATS SCI** — 36.4 ms vs 56.4 ms (0.6×), the only
  competitive win in the suite. Plausible cause: cljam's `ex-info` is a plain
  map while SCI's creates a JS `Error` (V8 stack capture per throw). cljam's
  unwinding design is genuinely cheap. Worth protecting as a feature.
- **map-assoc VM regression** (VM 1.3× slower than interpreter) — unexplained;
  top profiling target for Movement B.
- **Cold start:** cljam session bootstrap ~50–55 ms (interp) / ~65–73 ms (VM
  mode) vs nbb ~10 ms. Not fatal, but 5–7× behind on the embedding story.

## Strategic implication (recommendation, not decision)

Excluding the two pathological workloads, the VM sits ~12× behind SCI; with
them, 24×. An execution-engine rewrite cannot close a 437× data-structure gap —
**a persistent-data-structures arc (trie-backed vector, lazy-seq overhaul) is
worth roughly an order of magnitude; any execution work is worth ~2×.** The
natural sequencing question for the roadmap: does the DS arc come before or
after Phase 2/3? (Phase 2 is about architecture coherence, not speed — they
don't conflict; they compete for time.)

## What this suite does NOT measure (RegiByte, 2026-06-11)

Speed is not the VM's only justification. The VM holds call frames on the
heap, so recursion depth is bounded by memory, not the JS call stack (the
tree-walker overflowed around ~4k deep frames). SCI executes as nested JS
closure calls, so it shares the tree-walker's stack ceiling — this is a real
cljam-VM capability advantage over SCI that no timing number captures. It is
also the foundation for Phase 3 resumability and durable-session
serialization. v2 candidate: a depth-capability workload (max survivable
non-tail recursion per engine) reported as a capability, not a time.

## Alternatives considered

- Benchmarking against ClojureScript/Squint (compilers): deferred — different
  question; fib-benchmark already brackets it.
- Trusting `performance-baseline` numbers: insufficient — no competitor, no
  isolation, no correctness gates, no statistics.

## Impact

- The VM's value is now a measured fact: ~1.8× geomean, 2–4× on execution-bound
  code, ~0× on allocation-bound code.
- Top 3 optimization targets, ranked by measured impact: (1) persistent vector
  conj (O(n²) → trie), (2) lazy-seq machinery (>100× vs own transducers),
  (3) map-assoc path (84–108× vs SCI + VM regression anomaly).
- `runs/` is now the regression scoreboard: re-run after each phase/optimization
  and compare medians at identical workloads.
- Movement B (CPU profiling + VM fallback-reason histogram) has its targets:
  seq-pipeline, vector-build, map-assoc.
