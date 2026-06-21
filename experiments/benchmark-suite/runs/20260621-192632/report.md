# Cross-Engine Benchmark Report

- **Date:** 2026-06-21T19:26:32.625Z
- **Node:** v22.14.0 · **OS:** darwin 25.5.0 arm64 · **CPU:** Apple M1 Max
- **cljam git:** a9fe155 (dirty working tree) · **nbb:** 1.4.207
- **Method:** 5 samples/pair, warmup ≥3 calls & ≥100ms, batch target 15ms, fresh process per engine×workload, GC between samples

## Headline — geometric mean of per-workload ratios

| engine | vs js (slower by) | vs sci (slower by) | workloads |
|---|---:|---:|---:|
| cljam-interp | — | 30.8× | 13/13 |
| cljam-vm | — | 16.9× | 13/13 |
| sci | — | 1.0× | 13/13 |

> Ratios > 1 mean the engine is that many times slower than the reference.

## Per-workload results (per-call time)

### fib — function-call overhead (naive recursion) (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 685 | 685–686 | 682 | 690 | — | 21.8× |  |
| cljam-vm | 484 | 483–485 | 481 | 498 | — | 15.4× |  |
| sci | 31.43 | 31.42–32.08 | 31.26 | 32.18 | — | 1.0× |  |

### loop-sum — loop/recur, zero allocation (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 2269 | 2266–2296 | 2265 | 2921 | — | 45.5× |  |
| cljam-vm | 730 | 727–735 | 716 | 743 | — | 14.6× |  |
| sci | 49.93 | 49.88–50.17 | 49.35 | 51.06 | — | 1.0× |  |

### closure-churn — closure creation + capture + invocation (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 53.14 | 51.78–55.17 | 50.27 | 55.54 | — | 19.2× |  |
| cljam-vm | 17.63 | 17.37–17.83 | 17.35 | 28.83 | — | 6.4× |  |
| sci | 2.76 | 2.74–2.80 | 2.73 | 2.81 | — | 1.0× |  |

### vector-build — persistent vector conj/nth/peek/reduce (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 133 | 132–135 | 128 | 137 | — | 16.0× |  |
| cljam-vm | 45.18 | 44.98–45.83 | 44.44 | 58.16 | — | 5.5× |  |
| sci | 8.27 | 8.19–8.32 | 8.13 | 8.39 | — | 1.0× |  |

### map-assoc — persistent map assoc + lookup (HAMT) (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 394 | 394–396 | 388 | 450 | — | 74.9× |  |
| cljam-vm | 509 | 506–512 | 350 | 555 | — | 96.7× |  |
| sci | 5.26 | 5.20–5.26 | 5.19 | 5.28 | — | 1.0× |  |

### seq-pipeline — lazy sequences: filter/map/take/reduce (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 1108 | 1101–1118 | 1073 | 1194 | — | 3024× |  |
| cljam-vm | 1116 | 1075–1141 | 551 | 1152 | — | 3047× |  |
| sci | 0.3664 | 0.3617–0.3664 | 0.3345 | 0.3665 | — | 1.0× |  |

### transduce-pipeline — transducers: same logical work as seq-pipeline (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 8.65 | 8.48–8.70 | 8.47 | 8.82 | — | 52.8× |  |
| cljam-vm | 5.08 | 4.99–5.10 | 4.89 | 8.77 | — | 31.0× |  |
| sci | 0.1640 | 0.1605–0.1664 | 0.1596 | 0.1680 | — | 1.0× |  |

### multimethod — defmulti keyword dispatch (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 134 | 133–134 | 131 | 134 | — | 10.1× |  |
| cljam-vm | 69.11 | 68.68–70.78 | 68.03 | 80.84 | — | 5.2× |  |
| sci | 13.24 | 13.18–13.39 | 12.91 | 13.81 | — | 1.0× |  |

### try-catch — throw/catch unwinding (ex-info + ex-data) (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 92.89 | 90.13–92.99 | 89.02 | 94.41 | — | 1.6× |  |
| cljam-vm | 39.52 | 39.23–40.54 | 38.19 | 52.74 | — | 0.7× |  |
| sci | 57.02 | 56.45–58.16 | 56.01 | 58.78 | — | 1.0× |  |

### destructure — map/vector destructuring in fn params + let (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 177 | 175–178 | 170 | 181 | — | 13.6× |  |
| cljam-vm | 93.86 | 90.41–95.76 | 89.26 | 106 | — | 7.2× |  |
| sci | 12.99 | 12.93–13.09 | 12.91 | 13.66 | — | 1.0× |  |

### atom-swap — atom swap!/deref (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 155 | 155–155 | 151 | 159 | — | 20.5× |  |
| cljam-vm | 41.58 | 41.01–41.70 | 40.87 | 55.00 | — | 5.5× |  |
| sci | 7.57 | 7.51–7.65 | 7.35 | 7.70 | — | 1.0× |  |

### data-transform — realistic ETL: filter → enrich → group-by → aggregate (5k records) (macro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 135 | 132–136 | 131 | 137 | — | 38.9× |  |
| cljam-vm | 115 | 114–116 | 113 | 156 | — | 32.9× |  |
| sci | 3.48 | 3.36–3.58 | 3.35 | 3.73 | — | 1.0× |  |

### string-build — string construction + clojure.string/join (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 22.65 | 21.45–27.01 | 21.25 | 27.64 | — | 34.0× | ⚠️ 25% |
| cljam-vm | 18.45 | 17.24–19.11 | 16.98 | 28.78 | — | 27.7× |  |
| sci | 0.6664 | 0.6615–0.6707 | 0.6397 | 0.6813 | — | 1.0× |  |

## Setup time (session create + workload defs, once per pair)

| engine | fib | loop-sum | closure-churn | vector-build | map-assoc | seq-pipeline | transduce-pipeline | multimethod | try-catch | destructure | atom-swap | data-transform | string-build |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cljam-interp | 55.23 | 56.50 | 59.33 | 56.96 | 54.60 | 54.28 | 52.05 | 58.52 | 54.84 | 61.90 | 55.39 | 89.54 | 61.02 |
| cljam-vm | 72.82 | 74.27 | 67.95 | 69.04 | 74.94 | 72.76 | 72.44 | 74.62 | 70.39 | 76.68 | 74.36 | 113 | 83.38 |
| sci | 7.59 | 10.52 | 10.83 | 11.33 | 11.43 | 8.25 | 9.53 | 15.06 | 11.85 | 14.00 | 11.26 | 22.58 | 10.09 |

## Threats to validity

- cljam/SCI samples include a small per-call eval/parse cost of the run form; the js engine calls a function directly. Work sizes amortize this.
- nbb `loadString` is async; per-call promise overhead is noise at these sizes.
- One process per pair; cross-process variance not sampled. One machine, relative numbers only.
- The js reference is idiomatic mutable JS — a speed-of-light line, not a semantics-equivalent implementation.
