# Cross-Engine Benchmark Suite — Design

**Date:** 2026-06-11
**Status:** Active

## Problem

cljam's bytecode VM exists because the tree-walking interpreter hit a performance
ceiling — yet the repository contains no reproducible evidence that the VM is
faster, by how much, on what kinds of code, or how cljam compares to the
incumbent for its niche (SCI — interpreted Clojure embedded in JS). Existing
experiments measure cljam against itself (`performance-baseline`), profile V8
internals (`v8-diagnostics`), or race a single workload against a compiler
(`fib-benchmark`). None compare engines across a representative workload set
with statistical discipline.

## Why

Three decisions depend on these numbers:

1. **Phase 2/3 prioritization** — if the VM's lead over the interpreter is small
   or workload-dependent, that reshapes how much effort the resumable-VM driver
   deserves vs. raw execution speed work.
2. **Positioning** — "why cljam instead of nbb/SCI?" needs an honest performance
   answer, whatever it is.
3. **Regression tracking** — every future phase (interpreter-over-AST, async VM,
   legacy-compiler deletion) needs a before/after scoreboard.

## How

### Engines

| Engine | What it is | Invocation |
|---|---|---|
| `cljam-interp` | cljam tree-walking interpreter | `createSession({ vmExecutionMode: 'off' })` |
| `cljam-vm` | cljam production default (fn bodies → bytecode) | `createSession({ vmExecutionMode: 'function-body' })` |
| `sci` | SCI via **nbb** 1.4.x (borkdude's SCI-on-Node, the incumbent for embedded interpreted Clojure on JS) | `loadString` from the `nbb` npm package |
| `js` | hand-written idiomatic JavaScript | direct function call |

**Fairness rules:**

- **Same JS runtime for every engine** — Node (V8), one variable at a time.
  Comparing cljam-on-Bun vs nbb-on-Node would measure JSC vs V8, not the
  Clojure implementations.
- **Published artifacts, not dev source** — cljam is imported from
  `packages/cljam/dist/index.mjs` (rebuilt from the current branch before each
  run; the harness records the git SHA). nbb is the published npm package.
  We benchmark what users install.
- **Same Clojure source, verbatim, for `cljam-*` and `sci`** — workloads use
  only the dialect intersection: no records (dispatch semantics differ), no
  `sorted-map`/`format`/`##Inf` (cljam gaps), no string-as-char-seq ops,
  integer math via `quot`/`mod` (both engines use IEEE-754 doubles, so numerics
  are inherently fair). Error handling uses `ex-info` + `(catch :default e)` +
  `ex-data`, supported identically by both.
- **The JS reference is idiomatic, not simulated** — mutable arrays, objects,
  `Map`, `switch`. It answers "what does the platform offer a JS developer?",
  i.e. it is the speed-of-light line, not a persistent-data-structure
  reimplementation.
- **Correctness gate before timing** — every workload's run form returns a
  scalar checksum (number/string). Each engine must produce the expected
  checksum or the workload is marked FAILED for that engine and excluded from
  timing. We never publish a time for a wrong answer.

### Measurement method

- **Process isolation**: each (engine × workload) pair runs in a fresh Node
  child process. V8 JIT state, inline caches, and GC pressure do not leak
  between engines or workloads. The parent orchestrates and aggregates.
- **Warmup**: per pair, the run form is executed until both ≥3 calls and
  ≥300 ms of warmup have elapsed (lets V8 tier up; cljam's bytecode cache and
  SCI's analysis cache settle).
- **Batching against timer resolution**: per pair, a batch size K is calibrated
  (doubling) until one batch of K calls takes ≥25 ms. A *sample* is one timed
  batch; per-call time = batch time / K. For slow engines K=1; for raw JS K may
  be thousands. This is standard practice (criterium, nanobench) and the only
  place engines are treated differently — the *work* is identical.
- **Samples**: N timed samples per pair (default 10; `--quick` 5). If
  available (`--expose-gc`), GC is requested between samples to reduce
  cross-sample interference.
- **Statistics**: report **median** (robust to GC pauses), p25/p75 (IQR),
  min/max, and relative dispersion ((p75−p25)/median) as a noise flag —
  samples with dispersion >15% are marked in the report. Cross-workload
  summary uses the **geometric mean** of per-workload ratios (the standard
  for averaging benchmark ratios; arithmetic means over-weight slow workloads).
- **Environment capture**: node version, OS, CPU model, git SHA + dirty flag,
  timestamp — recorded in `results.json`.
- **Secondary metric**: per-engine session bootstrap + workload setup time
  (the "cold start" story), recorded once per pair.

### Workloads

Eleven micro + two macro workloads, each exercising a distinct runtime
subsystem. Sizes are fixed constants (identical work for every engine) chosen
so the slowest engine stays under ~2 s per call.

| # | Name | Subsystem under test |
|---|---|---|
| 1 | `fib` | function-call overhead, naive recursion (fib 27) |
| 2 | `loop-sum` | tightest loop/recur path, zero allocation (1M iterations) |
| 3 | `closure-churn` | closure creation + capture + invocation in a loop (10k closures) |
| 4 | `vector-build` | persistent vector conj/nth/peek (50k elements) |
| 5 | `map-assoc` | persistent map assoc + lookup (10k integer keys) |
| 6 | `seq-pipeline` | lazy-seq machinery: filter/map/take/reduce over 100k |
| 7 | `transduce-pipeline` | same pipeline via transducers (vs #6 isolates laziness cost) |
| 8 | `multimethod` | defmulti keyword dispatch (30k dispatches over 3 methods) |
| 9 | `try-catch` | throw/catch ex-info unwinding (20k throws) |
| 10 | `destructure` | map/vector destructuring in fn params + let (20k calls) |
| 11 | `atom-swap` | atom swap!/deref machinery (50k swaps) |
| 12 | `data-transform` | **macro**: realistic ETL — 5k user maps → filter, enrich, group-by, aggregate |
| 13 | `string-build` | str/clojure.string.join over 2k items |

The pairing of #6/#7 is deliberate: same logical work through two abstraction
mechanisms, so their ratio is itself a finding. #1/#2 bracket call overhead vs
loop overhead. #12 is the "does this matter for real code" anchor.

### Architecture

```
experiments/benchmark-suite/
  DESIGN.md            — this document
  README.md            — how to run
  bench.mjs            — orchestrator: spawns children, aggregates, reports
  workloads/
    workloads.mjs      — workload definitions: shared .clj source + JS ports + checksums
  runners/
    run-cljam.mjs      — child process: cljam engine (mode via argv)
    run-sci.mjs        — child process: nbb/SCI engine
    run-js.mjs         — child process: raw JS engine
  lib/
    measure.mjs        — warmup/calibration/sampling (shared by all runners)
    stats.mjs          — median/quartiles/geomean
    report.mjs         — markdown report generation
  runs/<timestamp>/
    results.json       — machine-readable: env, per-pair samples, checksums
    report.md          — human-readable tables + headline ratios
```

Child protocol: runner receives one JSON argv payload
(`{workload, mode, samples, warmupMs, targetBatchMs}`), prints one JSON result
line to stdout (`{ok, checksum, pass, batchSize, setupMs, samplesMs[]}`),
logs to stderr. The parent enforces a timeout and treats non-zero exit /
malformed output as engine failure (recorded, not fatal to the run).

## Alternatives considered

- **SCI from ClojureScript source via shadow-cljs** — rejected: adds a JVM +
  CLJS toolchain to the repo for no extra signal; nbb *is* SCI packaged for
  Node by its author, and is the actual incumbent users would choose.
- **Scittle** — rejected: browser script-tag packaging, wrong environment.
- **Squint/cherry as engines** — rejected for v1: they are compilers, answer a
  different question ("compile-time vs runtime"), use JS-native data structures
  (not semantics-comparable on persistent-DS workloads), and `fib-benchmark`
  already covers the headline. Worth revisiting as a bracket line later.
- **Bun as the runtime** — rejected as default (nbb targets Node; JSC vs V8
  would confound). The harness takes `--runtime` for curiosity runs later.
- **Auto-scaling workload sizes per engine** — rejected: identical work
  everywhere is non-negotiable; batching solves timer resolution instead.
- **Single shared process for all engines** — rejected: JIT/GC cross-talk;
  process isolation is cheap and v8-diagnostics already proved the pattern.
- **benchmark.js / tinybench** — rejected: brings its own loop/stats model that
  obscures the batching decision and complicates the per-engine child protocol.
  ~150 lines of measurement code we fully understand beats a dependency here.

## Impact

- First reproducible cross-engine numbers for cljam; the VM's value becomes a
  measured fact (in either direction).
- A permanent regression scoreboard for Phases 2–4 (`runs/` keeps dated
  results with git SHAs).
- Movement B (profiling, fallback histogram) plugs into the same workloads.
- No changes to any published package; everything lives under
  `experiments/benchmark-suite/`.

## Definition of Done

1. `node bench.mjs` runs the full engine × workload matrix from a cold start
   and writes `runs/<timestamp>/{results.json, report.md}`.
2. Every workload passes the correctness gate on every engine before being
   timed; failures are reported per-engine without aborting the run.
3. All 13 workloads implemented for cljam/SCI (shared source) and JS (ports);
   any engine-specific exclusion is documented in the report, not silent.
4. Statistics as specified: median/IQR/min/max per pair, noise flags,
   geometric-mean summary ratios (vs `js` and vs `sci`).
5. Report includes environment block (node, CPU, git SHA, dirty flag).
6. Threats to validity documented (below) and re-stated in the report footer.
7. No modifications outside `experiments/benchmark-suite/` (plus a rebuilt
   `packages/cljam/dist`, which is generated output).

## Threats to validity (known, accepted for v1)

- **Eval-call overhead asymmetry**: cljam/SCI samples go through
  `evaluate("(bench-run)")` / `loadString("(bench-run)")` per call (a small
  constant parse+dispatch cost); the JS runner calls a function directly.
  Mitigated by sizing workloads so per-call work dominates (≥ tens of ms on
  Clojure engines); noted because it slightly flatters JS.
- **nbb `loadString` is async** — per-call promise overhead (~microseconds) is
  noise at our workload sizes.
- **Single process per pair** — cross-process variance (CPU thermal state,
  scheduler) is not sampled; medians + dated runs mitigate. A `--repeat`
  process-level flag is future work.
- **One machine, one Node version** — results are relative, not absolute;
  the environment block makes runs comparable over time on the same machine.
