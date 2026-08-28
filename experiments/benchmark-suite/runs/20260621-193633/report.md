# Cross-Engine Benchmark Report

- **Date:** 2026-06-21T19:36:33.362Z
- **Node:** v22.14.0 · **OS:** darwin 25.5.0 arm64 · **CPU:** Apple M1 Max
- **cljam git:** a9fe155 (dirty working tree) · **nbb:** 1.4.207
- **Method:** 8 samples/pair, warmup ≥3 calls & ≥300ms, batch target 25ms, fresh process per engine×workload, GC between samples

## Headline — geometric mean of per-workload ratios

| engine | vs js (slower by) | vs sci (slower by) | workloads |
|---|---:|---:|---:|
| cljam-interp | — | 16.4× | 1/1 |
| cljam-vm | — | 5.8× | 1/1 |
| sci | — | 1.0× | 1/1 |

> Ratios > 1 mean the engine is that many times slower than the reference.

## Per-workload results (per-call time)

### vector-build — persistent vector conj/nth/peek/reduce (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 130 | 126–132 | 124 | 139 | — | 16.4× |  |
| cljam-vm | 46.11 | 45.52–46.39 | 44.82 | 61.19 | — | 5.8× |  |
| sci | 7.94 | 7.88–7.99 | 7.81 | 8.13 | — | 1.0× |  |

## Setup time (session create + workload defs, once per pair)

| engine | vector-build |
|---|---:|
| cljam-interp | 54.67 |
| cljam-vm | 69.22 |
| sci | 10.31 |

## Threats to validity

- cljam/SCI samples include a small per-call eval/parse cost of the run form; the js engine calls a function directly. Work sizes amortize this.
- nbb `loadString` is async; per-call promise overhead is noise at these sizes.
- One process per pair; cross-process variance not sampled. One machine, relative numbers only.
- The js reference is idiomatic mutable JS — a speed-of-light line, not a semantics-equivalent implementation.
