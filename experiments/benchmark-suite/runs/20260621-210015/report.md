# Cross-Engine Benchmark Report

- **Date:** 2026-06-21T21:00:15.477Z
- **Node:** v22.14.0 · **OS:** darwin 25.5.0 arm64 · **CPU:** Apple M1 Max
- **cljam git:** a9fe155 (dirty working tree) · **nbb:** 1.4.207
- **Method:** 5 samples/pair, warmup ≥3 calls & ≥100ms, batch target 15ms, fresh process per engine×workload, GC between samples

## Headline — geometric mean of per-workload ratios

| engine | vs js (slower by) | vs sci (slower by) | workloads |
|---|---:|---:|---:|
| cljam-interp | 1901× | 7.8× | 1/1 |
| cljam-vm | 749× | 3.1× | 1/1 |
| sci | 243× | 1.0× | 1/1 |
| js | 1.0× | 0.0× | 1/1 |

> Ratios > 1 mean the engine is that many times slower than the reference.

## Per-workload results (per-call time)

### vector-assoc — persistent vector assoc (path-copy update on a large vector) (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 279 | 274–290 | 273 | 291 | 1901× | 7.8× |  |
| cljam-vm | 110 | 109–114 | 107 | 122 | 749× | 3.1× |  |
| sci | 35.58 | 34.76–36.99 | 34.53 | 37.15 | 243× | 1.0× |  |
| js | 0.1466 | 0.1454–0.1484 | 0.1453 | 0.1492 | 1.0× | 0.0× |  |

## Setup time (session create + workload defs, once per pair)

| engine | vector-assoc |
|---|---:|
| cljam-interp | 54.75 |
| cljam-vm | 78.33 |
| sci | 12.41 |
| js | 0.3409 |

## Threats to validity

- cljam/SCI samples include a small per-call eval/parse cost of the run form; the js engine calls a function directly. Work sizes amortize this.
- nbb `loadString` is async; per-call promise overhead is noise at these sizes.
- One process per pair; cross-process variance not sampled. One machine, relative numbers only.
- The js reference is idiomatic mutable JS — a speed-of-light line, not a semantics-equivalent implementation.
