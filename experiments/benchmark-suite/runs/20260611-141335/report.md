# Cross-Engine Benchmark Report

- **Date:** 2026-06-11T14:13:35.402Z
- **Node:** v22.14.0 · **OS:** darwin 23.6.0 arm64 · **CPU:** Apple M1 Max
- **cljam git:** a9fe155 (dirty working tree) · **nbb:** 1.4.207
- **Method:** 10 samples/pair, warmup ≥3 calls & ≥300ms, batch target 25ms, fresh process per engine×workload, GC between samples

## Headline — geometric mean of per-workload ratios

| engine | vs js (slower by) | vs sci (slower by) | workloads |
|---|---:|---:|---:|
| cljam-interp | 1728× | 43.3× | 13/13 |
| cljam-vm | 973× | 24.4× | 13/13 |
| sci | 39.9× | 1.0× | 13/13 |
| js | 1.0× | 0.0× | 13/13 |

> Ratios > 1 mean the engine is that many times slower than the reference.

## Per-workload results (per-call time)

### fib — function-call overhead (naive recursion) (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 674 | 672–710 | 668 | 1516 | 278× | 19.3× |  |
| cljam-vm | 483 | 479–493 | 477 | 572 | 200× | 13.8× |  |
| sci | 34.91 | 31.26–40.39 | 30.53 | 57.86 | 14.4× | 1.0× | ⚠️ 26% |
| js | 2.42 | 2.42–2.43 | 2.41 | 2.43 | 1.0× | 0.1× |  |

### loop-sum — loop/recur, zero allocation (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 2264 | 2212–2292 | 2183 | 2324 | 2343× | 46.7× |  |
| cljam-vm | 671 | 670–673 | 666 | 679 | 695× | 13.8× |  |
| sci | 48.51 | 48.31–49.02 | 48.06 | 103 | 50.2× | 1.0× |  |
| js | 0.9664 | 0.9631–0.9716 | 0.9587 | 0.9911 | 1.0× | 0.0× |  |

### closure-churn — closure creation + capture + invocation (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 49.95 | 49.22–50.65 | 48.60 | 52.77 | 2808× | 19.4× |  |
| cljam-vm | 17.25 | 16.95–22.39 | 16.10 | 23.07 | 970× | 6.7× | ⚠️ 32% |
| sci | 2.57 | 2.49–2.62 | 2.46 | 2.69 | 145× | 1.0× |  |
| js | 0.0178 | 0.0177–0.0179 | 0.0177 | 0.0181 | 1.0× | 0.0× |  |

### vector-build — persistent vector conj/nth/peek/reduce (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 3663 | 3631–3767 | 3617 | 3822 | 15172× | 437× |  |
| cljam-vm | 3670 | 3604–3714 | 3582 | 3849 | 15199× | 437× |  |
| sci | 8.39 | 8.36–8.42 | 8.34 | 8.46 | 34.7× | 1.0× |  |
| js | 0.2415 | 0.2404–0.2434 | 0.2380 | 0.2485 | 1.0× | 0.0× |  |

### map-assoc — persistent map assoc + lookup (HAMT) (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 379 | 376–384 | 370 | 390 | 681× | 83.6× |  |
| cljam-vm | 491 | 490–493 | 336 | 522 | 882× | 108× |  |
| sci | 4.53 | 4.51–4.56 | 4.49 | 4.62 | 8.1× | 1.0× |  |
| js | 0.5568 | 0.5511–0.5613 | 0.5418 | 0.6228 | 1.0× | 0.1× |  |

### seq-pipeline — lazy sequences: filter/map/take/reduce (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 1031 | 519–1045 | 494 | 1141 | 540631× | 3798× | ⚠️ 51% |
| cljam-vm | 547 | 514–995 | 509 | 1065 | 286760× | 2015× | ⚠️ 88% |
| sci | 0.2716 | 0.2696–0.2774 | 0.2674 | 0.2871 | 142× | 1.0× |  |
| js | 0.0019 | 0.0019–0.0019 | 0.0019 | 0.0019 | 1.0× | 0.0× |  |

### transduce-pipeline — transducers: same logical work as seq-pipeline (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 8.31 | 8.08–8.61 | 7.89 | 8.78 | 4373× | 65.7× |  |
| cljam-vm | 4.74 | 4.66–6.45 | 4.64 | 7.04 | 2492× | 37.4× | ⚠️ 38% |
| sci | 0.1266 | 0.1237–0.1297 | 0.1208 | 0.1325 | 66.6× | 1.0× |  |
| js | 0.0019 | 0.0019–0.0019 | 0.0019 | 0.0019 | 1.0× | 0.0× |  |

### multimethod — defmulti keyword dispatch (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 125 | 124–127 | 123 | 147 | 1255× | 9.9× |  |
| cljam-vm | 61.91 | 60.94–62.27 | 59.75 | 72.58 | 624× | 4.9× |  |
| sci | 12.54 | 12.45–12.78 | 12.33 | 33.66 | 126× | 1.0× |  |
| js | 0.0993 | 0.0982–0.1000 | 0.0974 | 0.1006 | 1.0× | 0.0× |  |

### try-catch — throw/catch unwinding (ex-info + ex-data) (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 86.28 | 85.34–86.74 | 82.72 | 88.08 | 8.0× | 1.5× |  |
| cljam-vm | 36.35 | 36.31–36.74 | 35.95 | 49.21 | 3.4× | 0.6× |  |
| sci | 56.37 | 55.99–56.73 | 54.49 | 66.09 | 5.2× | 1.0× |  |
| js | 10.78 | 10.73–10.85 | 10.65 | 11.02 | 1.0× | 0.2× |  |

### destructure — map/vector destructuring in fn params + let (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 157 | 156–159 | 155 | 161 | 3286× | 13.3× |  |
| cljam-vm | 83.66 | 82.51–85.04 | 80.32 | 99.05 | 1749× | 7.1× |  |
| sci | 11.83 | 11.72–11.91 | 11.62 | 12.30 | 247× | 1.0× |  |
| js | 0.0478 | 0.0478–0.0481 | 0.0476 | 0.0484 | 1.0× | 0.0× |  |

### atom-swap — atom swap!/deref (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 163 | 161–167 | 157 | 198 | 3401× | 22.8× |  |
| cljam-vm | 39.20 | 38.92–39.62 | 38.59 | 54.52 | 816× | 5.5× |  |
| sci | 7.15 | 7.11–7.20 | 7.08 | 7.40 | 149× | 1.0× |  |
| js | 0.0480 | 0.0477–0.0482 | 0.0476 | 0.0497 | 1.0× | 0.0× |  |

### data-transform — realistic ETL: filter → enrich → group-by → aggregate (5k records) (macro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 128 | 127–130 | 126 | 133 | 1038× | 49.2× |  |
| cljam-vm | 111 | 110–112 | 107 | 116 | 899× | 42.6× |  |
| sci | 2.61 | 2.60–2.64 | 2.57 | 2.99 | 21.1× | 1.0× |  |
| js | 0.1235 | 0.1219–0.1319 | 0.1206 | 0.1371 | 1.0× | 0.0× |  |

### string-build — string construction + clojure.string/join (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 23.81 | 23.17–25.04 | 22.69 | 25.60 | 235× | 52.0× |  |
| cljam-vm | 20.50 | 20.41–20.72 | 19.80 | 25.53 | 202× | 44.8× |  |
| sci | 0.4581 | 0.4463–0.4626 | 0.4409 | 0.4736 | 4.5× | 1.0× |  |
| js | 0.1013 | 0.1006–0.1026 | 0.1001 | 0.2770 | 1.0× | 0.2× |  |

## Setup time (session create + workload defs, once per pair)

| engine | fib | loop-sum | closure-churn | vector-build | map-assoc | seq-pipeline | transduce-pipeline | multimethod | try-catch | destructure | atom-swap | data-transform | string-build |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cljam-interp | 53.65 | 55.68 | 53.83 | 54.62 | 50.79 | 49.55 | 49.33 | 51.71 | 52.72 | 53.11 | 54.11 | 99.36 | 54.34 |
| cljam-vm | 70.94 | 73.10 | 68.74 | 67.35 | 70.36 | 67.52 | 65.80 | 72.98 | 70.75 | 69.41 | 65.13 | 119 | 70.77 |
| sci | 9.20 | 10.51 | 11.31 | 10.55 | 11.09 | 8.04 | 9.46 | 14.67 | 11.33 | 14.11 | 9.90 | 24.03 | 9.40 |
| js | 0.0027 | 0.0021 | 0.0032 | 0.0021 | 0.0029 | 0.0023 | 0.0040 | 0.0051 | 0.0061 | 0.0128 | 0.0031 | 0.4426 | 0.0018 |

## Threats to validity

- cljam/SCI samples include a small per-call eval/parse cost of the run form; the js engine calls a function directly. Work sizes amortize this.
- nbb `loadString` is async; per-call promise overhead is noise at these sizes.
- One process per pair; cross-process variance not sampled. One machine, relative numbers only.
- The js reference is idiomatic mutable JS — a speed-of-light line, not a semantics-equivalent implementation.
