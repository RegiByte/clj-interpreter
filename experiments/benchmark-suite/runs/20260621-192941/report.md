# Cross-Engine Benchmark Report

- **Date:** 2026-06-21T19:29:41.105Z
- **Node:** v22.14.0 · **OS:** darwin 25.5.0 arm64 · **CPU:** Apple M1 Max
- **cljam git:** a9fe155 (dirty working tree) · **nbb:** 1.4.207
- **Method:** 10 samples/pair, warmup ≥3 calls & ≥300ms, batch target 25ms, fresh process per engine×workload, GC between samples

## Headline — geometric mean of per-workload ratios

| engine | vs js (slower by) | vs sci (slower by) | workloads |
|---|---:|---:|---:|
| cljam-vm | — | — | 1/1 |
| cljam-interp | — | — | 1/1 |

> Ratios > 1 mean the engine is that many times slower than the reference.

## Per-workload results (per-call time)

### seq-pipeline — lazy sequences: filter/map/take/reduce (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-vm | 554 | 541–572 | 529 | 1110 | — | — |  |
| cljam-interp | 813 | 551–1144 | 536 | 1202 | — | — | ⚠️ 73% |

## Setup time (session create + workload defs, once per pair)

| engine | seq-pipeline |
|---|---:|
| cljam-vm | 72.00 |
| cljam-interp | 55.57 |

## Threats to validity

- cljam/SCI samples include a small per-call eval/parse cost of the run form; the js engine calls a function directly. Work sizes amortize this.
- nbb `loadString` is async; per-call promise overhead is noise at these sizes.
- One process per pair; cross-process variance not sampled. One machine, relative numbers only.
- The js reference is idiomatic mutable JS — a speed-of-light line, not a semantics-equivalent implementation.
