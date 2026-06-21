# Cross-Engine Benchmark Report

- **Date:** 2026-06-21T19:25:37.749Z
- **Node:** v22.14.0 · **OS:** darwin 25.5.0 arm64 · **CPU:** Apple M1 Max
- **cljam git:** a9fe155 (dirty working tree) · **nbb:** 1.4.207
- **Method:** 5 samples/pair, warmup ≥3 calls & ≥100ms, batch target 15ms, fresh process per engine×workload, GC between samples

## Headline — geometric mean of per-workload ratios

| engine | vs js (slower by) | vs sci (slower by) | workloads |
|---|---:|---:|---:|
| cljam-interp | — | 16.9× | 1/1 |
| cljam-vm | — | 5.8× | 1/1 |
| sci | — | 1.0× | 1/1 |

> Ratios > 1 mean the engine is that many times slower than the reference.

## Per-workload results (per-call time)

### vector-build — persistent vector conj/nth/peek/reduce (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 132 | 127–133 | 127 | 142 | — | 16.9× |  |
| cljam-vm | 45.30 | 45.02–46.42 | 44.18 | 57.45 | — | 5.8× |  |
| sci | 7.83 | 7.69–8.01 | 7.59 | 8.11 | — | 1.0× |  |

## Setup time (session create + workload defs, once per pair)

| engine | vector-build |
|---|---:|
| cljam-interp | 54.27 |
| cljam-vm | 70.83 |
| sci | 10.32 |

## Threats to validity

- cljam/SCI samples include a small per-call eval/parse cost of the run form; the js engine calls a function directly. Work sizes amortize this.
- nbb `loadString` is async; per-call promise overhead is noise at these sizes.
- One process per pair; cross-process variance not sampled. One machine, relative numbers only.
- The js reference is idiomatic mutable JS — a speed-of-light line, not a semantics-equivalent implementation.
