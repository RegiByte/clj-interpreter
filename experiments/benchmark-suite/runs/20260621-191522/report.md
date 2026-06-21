# Cross-Engine Benchmark Report

- **Date:** 2026-06-21T19:15:22.795Z
- **Node:** v22.14.0 · **OS:** darwin 25.5.0 arm64 · **CPU:** Apple M1 Max
- **cljam git:** a9fe155 (dirty working tree) · **nbb:** 1.4.207
- **Method:** 5 samples/pair, warmup ≥3 calls & ≥100ms, batch target 15ms, fresh process per engine×workload, GC between samples

## Headline — geometric mean of per-workload ratios

| engine | vs js (slower by) | vs sci (slower by) | workloads |
|---|---:|---:|---:|
| cljam-interp | — | 560× | 1/1 |
| cljam-vm | — | 565× | 1/1 |
| sci | — | 1.0× | 1/1 |

> Ratios > 1 mean the engine is that many times slower than the reference.

## Per-workload results (per-call time)

### vector-build — persistent vector conj/nth/peek/reduce (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 4517 | 4516–4541 | 4465 | 4608 | — | 560× |  |
| cljam-vm | 4552 | 4511–4557 | 4501 | 4568 | — | 565× |  |
| sci | 8.06 | 7.86–8.08 | 7.74 | 8.14 | — | 1.0× |  |

## Setup time (session create + workload defs, once per pair)

| engine | vector-build |
|---|---:|
| cljam-interp | 52.30 |
| cljam-vm | 69.71 |
| sci | 10.51 |

## Threats to validity

- cljam/SCI samples include a small per-call eval/parse cost of the run form; the js engine calls a function directly. Work sizes amortize this.
- nbb `loadString` is async; per-call promise overhead is noise at these sizes.
- One process per pair; cross-process variance not sampled. One machine, relative numbers only.
- The js reference is idiomatic mutable JS — a speed-of-light line, not a semantics-equivalent implementation.
