# cljam V8 Diagnostics

Repeatable Node/V8 diagnostics for the cljam VM.

This experiment runs representative cljam workloads in separate Node processes, captures V8 diagnostics, and writes artifacts under `runs/`.

## Run

From the repository root:

```sh
node experiments/v8-diagnostics/scripts/run.mjs
```

Useful options:

```sh
node experiments/v8-diagnostics/scripts/run.mjs --workload loop-recur --iterations 30 --warmup 10
node experiments/v8-diagnostics/scripts/run.mjs --mode timing
node experiments/v8-diagnostics/scripts/run.mjs --mode trace
node experiments/v8-diagnostics/scripts/run.mjs --mode cpu
node experiments/v8-diagnostics/scripts/run.mjs --out experiments/v8-diagnostics/runs/my-run
```

Suite-inspired direct cljam workloads are included for profiling behavior that
showed up in real tests without profiling Vitest itself:

```sh
node experiments/v8-diagnostics/scripts/run.mjs --workload suite-session-bootstrap --mode timing,cpu
node experiments/v8-diagnostics/scripts/run.mjs --workload suite-bytecode-census --iterations 5 --warmup 1 --mode timing,cpu
node experiments/v8-diagnostics/scripts/run.mjs --workload suite-namespace-macro-alias --workload suite-unwind-mix --mode timing,cpu
```

Available suite workloads:

- `suite-session-bootstrap` - repeated real `createSession` plus a small eval.
- `suite-namespace-macro-alias` - top-level `ns` plus aliased `clojure.core` macro expansion.
- `suite-bytecode-census` - `cljam.vm` namespace census/stat helpers over `clojure.core`.
- `suite-js-interop-composition` - synchronous host property/method interop from VM code.
- `suite-unwind-mix` - catch/finally-heavy VM function execution.

The harness imports `packages/cljam/dist/index.mjs`, so rebuild the package first when source changes:

```sh
bun run --filter '@regibyte/cljam' build-npm-library
```

## Profile The Test Suite

The synthetic workload runner is useful for isolated VM paths, but broad performance
regressions should also be checked against the real Vitest suite. This runs Vitest
under Node/V8, captures diagnostics, and writes the same local `runs/` style
artifacts:

```sh
node experiments/v8-diagnostics/scripts/test-suite.mjs --maxWorkers 1
```

Useful variants:

```sh
node experiments/v8-diagnostics/scripts/test-suite.mjs --pattern src/core/vm --mode cpu --maxWorkers 1
node experiments/v8-diagnostics/scripts/test-suite.mjs --pattern src/core/vm --mode cpu,trace --maxWorkers 1
node experiments/v8-diagnostics/scripts/test-suite.mjs --pattern src/core/vm/__tests__/vm.spec.ts --mode cpu,trace,gc --maxWorkers 1
node experiments/v8-diagnostics/scripts/test-suite.mjs -- --reporter=verbose
```

The test-suite profiler runs against live TypeScript source through the package's
Vitest config, not `packages/cljam/dist/index.mjs`, so it does not require a
library rebuild after source edits.

## Artifacts

Each run writes:

- `results.json` - machine-readable timing, V8 summary, metadata, and artifact paths.
- `summary.md` - human-readable report.
- `charts.html` - simple graphable report for timing, deopts, GC, and CPU samples.
- `logs/*.log` - raw stdout/stderr from each child process.
- `profiles/*.cpuprofile` - Chrome DevTools-compatible CPU profiles for `cpu` mode.

## V8 Trace Shapes

`--trace-opt` emits optimization lifecycle lines:

```text
[marking ... <JSFunction executeInstruction ...> for optimization ... reason: hot and stable]
[completed optimizing ... <JSFunction executeInstruction ...> (target TURBOFAN)]
```

`--trace-deopt` emits bailout lines:

```text
[bailout (kind: deopt-eager, reason: wrong map): begin. deoptimizing ... <JSFunction executeInstruction ...>, ... bytecode offset 42 ...]
```

The most important fields for this stage are function name, deopt reason, and count. Common reasons include unstable object shapes (`wrong map`), number representation assumptions (`not a Smi`), and missing feedback (`Insufficient type feedback...`).

`--trace-gc-nvp` emits key-value GC lines. The report extracts pause totals and event counts when V8 includes fields such as `pause=...`.

`--cpu-prof` writes `.cpuprofile` JSON with `nodes`, `samples`, and `timeDeltas`. The report turns samples into a top-functions table; the same file can be loaded directly in Chrome DevTools.
