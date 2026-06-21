# Cross-Engine Benchmark Report

- **Date:** 2026-06-21T21:00:40.429Z
- **Node:** v22.14.0 · **OS:** darwin 25.5.0 arm64 · **CPU:** Apple M1 Max
- **cljam git:** a9fe155 (dirty working tree) · **nbb:** 1.4.207
- **Method:** 10 samples/pair, warmup ≥3 calls & ≥300ms, batch target 25ms, fresh process per engine×workload, GC between samples

## Headline — geometric mean of per-workload ratios

| engine | vs js (slower by) | vs sci (slower by) | workloads |
|---|---:|---:|---:|
| cljam-interp | 1418× | 30.5× | 14/14 |
| cljam-vm | 748× | 16.1× | 14/14 |
| sci | 46.5× | 1.0× | 14/14 |
| js | 1.0× | 0.0× | 14/14 |

> Ratios > 1 mean the engine is that many times slower than the reference.

## Per-workload results (per-call time)

### fib — function-call overhead (naive recursion) (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 670 | 668–680 | 664 | 694 | 267× | 21.5× |  |
| cljam-vm | 463 | 456–487 | 454 | 517 | 184× | 14.8× |  |
| sci | 31.19 | 30.89–31.62 | 30.79 | 33.84 | 12.4× | 1.0× |  |
| js | 2.51 | 2.47–2.56 | 2.45 | 2.66 | 1.0× | 0.1× |  |

### loop-sum — loop/recur, zero allocation (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 2273 | 2264–2294 | 2262 | 2352 | 2145× | 45.7× |  |
| cljam-vm | 747 | 741–749 | 732 | 761 | 705× | 15.0× |  |
| sci | 49.68 | 49.46–49.96 | 48.97 | 50.96 | 46.9× | 1.0× |  |
| js | 1.06 | 1.03–1.13 | 1.00 | 1.19 | 1.0× | 0.0× |  |

### closure-churn — closure creation + capture + invocation (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 51.81 | 50.55–52.25 | 49.05 | 53.09 | 2882× | 19.1× |  |
| cljam-vm | 18.73 | 17.79–22.43 | 17.05 | 24.07 | 1042× | 6.9× | ⚠️ 25% |
| sci | 2.71 | 2.58–2.74 | 2.54 | 2.75 | 151× | 1.0× |  |
| js | 0.0180 | 0.0178–0.0182 | 0.0177 | 0.0196 | 1.0× | 0.0× |  |

### vector-build — persistent vector conj/nth/peek/reduce (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 137 | 135–140 | 131 | 140 | 484× | 17.7× |  |
| cljam-vm | 45.91 | 45.35–48.04 | 45.06 | 60.86 | 162× | 5.9× |  |
| sci | 7.74 | 7.69–7.83 | 7.59 | 7.96 | 27.3× | 1.0× |  |
| js | 0.2837 | 0.2825–0.2857 | 0.2704 | 0.2881 | 1.0× | 0.0× |  |

### vector-assoc — persistent vector assoc (path-copy update on a large vector) (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 277 | 274–279 | 273 | 284 | 2919× | 8.2× |  |
| cljam-vm | 106 | 105–106 | 104 | 117 | 1117× | 3.1× |  |
| sci | 33.80 | 33.55–34.04 | 33.09 | 34.50 | 357× | 1.0× |  |
| js | 0.0948 | 0.0940–0.0955 | 0.0938 | 0.1698 | 1.0× | 0.0× |  |

### map-assoc — persistent map assoc + lookup (HAMT) (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 388 | 385–393 | 381 | 406 | 665× | 82.8× |  |
| cljam-vm | 511 | 506–543 | 354 | 626 | 877× | 109× |  |
| sci | 4.69 | 4.66–4.73 | 4.63 | 4.84 | 8.0× | 1.0× |  |
| js | 0.5834 | 0.5754–0.5845 | 0.5660 | 0.5895 | 1.0× | 0.1× |  |

### seq-pipeline — lazy sequences: filter/map/take/reduce (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 1169 | 1103–1206 | 570 | 1364 | 597412× | 3717× |  |
| cljam-vm | 1096 | 1088–1119 | 531 | 1164 | 560141× | 3485× |  |
| sci | 0.3146 | 0.3083–0.3446 | 0.2890 | 0.3666 | 161× | 1.0× |  |
| js | 0.0020 | 0.0020–0.0020 | 0.0019 | 0.0020 | 1.0× | 0.0× |  |

### transduce-pipeline — transducers: same logical work as seq-pipeline (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 8.77 | 8.54–8.94 | 8.30 | 10.90 | 4436× | 62.9× |  |
| cljam-vm | 5.15 | 5.02–6.78 | 4.94 | 7.62 | 2605× | 36.9× | ⚠️ 34% |
| sci | 0.1394 | 0.1364–0.1445 | 0.1336 | 0.1624 | 70.5× | 1.0× |  |
| js | 0.0020 | 0.0020–0.0020 | 0.0020 | 0.0021 | 1.0× | 0.0× |  |

### multimethod — defmulti keyword dispatch (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 135 | 134–136 | 132 | 139 | 1328× | 10.4× |  |
| cljam-vm | 68.79 | 68.50–69.55 | 68.30 | 85.06 | 674× | 5.3× |  |
| sci | 13.01 | 12.84–13.24 | 12.68 | 13.29 | 128× | 1.0× |  |
| js | 0.1020 | 0.1015–0.1030 | 0.1010 | 0.1124 | 1.0× | 0.0× |  |

### try-catch — throw/catch unwinding (ex-info + ex-data) (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 89.75 | 88.90–91.06 | 88.44 | 94.64 | 8.0× | 1.6× |  |
| cljam-vm | 39.59 | 39.50–39.70 | 39.29 | 53.96 | 3.5× | 0.7× |  |
| sci | 54.40 | 54.16–54.94 | 54.11 | 61.13 | 4.8× | 1.0× |  |
| js | 11.25 | 10.92–11.47 | 10.71 | 11.82 | 1.0× | 0.2× |  |

### destructure — map/vector destructuring in fn params + let (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 173 | 172–173 | 171 | 177 | 3291× | 13.5× |  |
| cljam-vm | 90.59 | 89.95–92.63 | 88.50 | 104 | 1725× | 7.1× |  |
| sci | 12.79 | 12.71–13.03 | 12.65 | 13.82 | 244× | 1.0× |  |
| js | 0.0525 | 0.0518–0.0544 | 0.0490 | 0.0565 | 1.0× | 0.0× |  |

### atom-swap — atom swap!/deref (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 158 | 156–160 | 155 | 176 | 3206× | 20.8× |  |
| cljam-vm | 42.13 | 41.87–42.94 | 41.69 | 55.99 | 854× | 5.5× |  |
| sci | 7.60 | 7.53–7.69 | 7.45 | 7.90 | 154× | 1.0× |  |
| js | 0.0493 | 0.0488–0.0502 | 0.0485 | 0.0510 | 1.0× | 0.0× |  |

### data-transform — realistic ETL: filter → enrich → group-by → aggregate (5k records) (macro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 134 | 132–135 | 130 | 138 | 1049× | 46.3× |  |
| cljam-vm | 116 | 111–117 | 110 | 122 | 907× | 40.1× |  |
| sci | 2.88 | 2.84–2.95 | 2.80 | 3.02 | 22.6× | 1.0× |  |
| js | 0.1275 | 0.1251–0.1350 | 0.1241 | 0.1427 | 1.0× | 0.0× |  |

### string-build — string construction + clojure.string/join (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-interp | 28.72 | 28.10–29.31 | 27.40 | 30.26 | 277× | 50.5× |  |
| cljam-vm | 17.82 | 17.32–25.26 | 16.89 | 31.34 | 172× | 31.3× | ⚠️ 45% |
| sci | 0.5685 | 0.5521–0.6057 | 0.5304 | 0.6460 | 5.5× | 1.0× |  |
| js | 0.1038 | 0.1033–0.1062 | 0.1019 | 0.1075 | 1.0× | 0.2× |  |

## Setup time (session create + workload defs, once per pair)

| engine | fib | loop-sum | closure-churn | vector-build | vector-assoc | map-assoc | seq-pipeline | transduce-pipeline | multimethod | try-catch | destructure | atom-swap | data-transform | string-build |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cljam-interp | 53.90 | 56.71 | 70.21 | 59.70 | 56.01 | 59.14 | 54.28 | 55.87 | 56.05 | 55.86 | 60.77 | 57.80 | 131 | 85.76 |
| cljam-vm | 72.92 | 72.03 | 74.55 | 73.18 | 71.85 | 71.64 | 71.74 | 72.59 | 72.69 | 72.39 | 208 | 72.47 | 109 | 81.05 |
| sci | 8.54 | 9.50 | 11.00 | 10.55 | 11.51 | 11.22 | 10.58 | 8.18 | 15.10 | 11.97 | 14.73 | 10.83 | 26.40 | 9.86 |
| js | 0.0024 | 0.0022 | 0.0025 | 0.0024 | 0.3252 | 0.0027 | 0.0030 | 0.0033 | 0.0039 | 0.0024 | 0.0140 | 0.0037 | 0.3247 | 0.0022 |

## Threats to validity

- cljam/SCI samples include a small per-call eval/parse cost of the run form; the js engine calls a function directly. Work sizes amortize this.
- nbb `loadString` is async; per-call promise overhead is noise at these sizes.
- One process per pair; cross-process variance not sampled. One machine, relative numbers only.
- The js reference is idiomatic mutable JS — a speed-of-light line, not a semantics-equivalent implementation.
