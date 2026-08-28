# benchmark-suite

Cross-engine benchmark: **cljam-interp** (tree-walker, `vmExecutionMode: 'off'`) ·
**cljam-vm** (production default, `'function-body'`) · **sci** (SCI via
[nbb](https://github.com/babashka/nbb) — the incumbent for embedded interpreted
Clojure on JS) · **js** (idiomatic JavaScript, the speed-of-light reference).

Design, fairness rules, and threats to validity: [DESIGN.md](./DESIGN.md).

## Run

From this directory (requires `bun install` here once, and a fresh cljam dist):

```sh
cd ../../packages/cljam && bun run build-npm-library && cd -   # rebuild dist
node bench.mjs                                                  # full matrix (~5 min)
node bench.mjs --quick                                          # fewer samples, faster
node bench.mjs --workloads fib,loop-sum --engines cljam-vm,sci  # subset
node bench.mjs --samples 20                                     # more rigor
```

Each run writes `runs/<timestamp>/results.json` (machine-readable, includes git
SHA + every raw sample) and `runs/<timestamp>/report.md` (tables + headline
geometric-mean ratios). Runs are kept in git — they are the regression
scoreboard across architecture phases.

## How it measures

One fresh Node child process per engine × workload (no JIT/GC cross-talk),
correctness gate before timing (every engine must return the workload's
expected checksum), warmup, batch-size calibration against timer resolution,
N samples, median/IQR reporting. All engines run under the same Node binary;
cljam is imported from its built `dist/index.mjs` — the published artifact,
same as nbb.

## Adding a workload

Add an entry to `workloads/workloads.mjs`: shared `.clj` source (dialect
intersection of cljam and SCI — see DESIGN.md fairness rules), an idiomatic JS
port, and a hand-computed scalar checksum (`expected`). The module self-checks
the JS port against the checksum at load; the orchestrator gates every engine
on it at runtime.

## Smoke scripts

`smoke-cljam.mjs` / `smoke-nbb.mjs` — minimal sanity checks that each engine
loads and evaluates in this environment.
