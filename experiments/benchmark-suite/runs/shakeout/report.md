# Cross-Engine Benchmark Report

- **Date:** 2026-06-11T14:13:07.250Z
- **Node:** v22.14.0 · **OS:** darwin 23.6.0 arm64 · **CPU:** Apple M1 Max
- **cljam git:** a9fe155 (dirty working tree) · **nbb:** 1.4.207
- **Method:** 5 samples/pair, warmup ≥3 calls & ≥100ms, batch target 15ms, fresh process per engine×workload, GC between samples

## Headline — geometric mean of per-workload ratios

| engine | vs js (slower by) | vs sci (slower by) | workloads |
|---|---:|---:|---:|
| cljam-interp | 280× | 22.4× | 1/1 |
| cljam-vm | 195× | 15.6× | 1/1 |
| sci | 12.5× | 1.0× | 1/1 |
| js | 1.0× | 0.1× | 1/1 |

> Ratios > 1 mean the engine is that many times slower than the reference.

## Per-workload results (per-call time)

### fib — function-call overhead (naive recursion) (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 688 | 688–691 | 685 | 696 | 280× | 22.4× |  |
| cljam-vm | 480 | 479–489 | 477 | 496 | 195× | 15.6× |  |
| sci | 30.73 | 30.66–31.36 | 30.33 | 32.32 | 12.5× | 1.0× |  |
| js | 2.46 | 2.46–2.46 | 2.45 | 2.47 | 1.0× | 0.1× |  |

## Setup time (session create + workload defs, once per pair)

| engine | fib |
|---|---:|
| cljam-interp | 54.31 |
| cljam-vm | 73.53 |
| sci | 8.44 |
| js | 0.0037 |

## Threats to validity

- cljam/SCI samples include a small per-call eval/parse cost of the run form; the js engine calls a function directly. Work sizes amortize this.
- nbb `loadString` is async; per-call promise overhead is noise at these sizes.
- One process per pair; cross-process variance not sampled. One machine, relative numbers only.
- The js reference is idiomatic mutable JS — a speed-of-light line, not a semantics-equivalent implementation.
