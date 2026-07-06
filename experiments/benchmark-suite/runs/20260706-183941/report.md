# Cross-Engine Benchmark Report

- **Date:** 2026-07-06T18:39:41.911Z
- **Node:** v22.14.0 · **OS:** darwin 25.5.0 arm64 · **CPU:** Apple M1 Max
- **cljam git:** dd22218 (dirty working tree) · **nbb:** 1.4.207
- **Method:** 10 samples/pair, warmup ≥3 calls & ≥300ms, batch target 25ms, fresh process per engine×workload, GC between samples

## Headline — geometric mean of per-workload ratios

| engine | vs js (slower by) | vs sci (slower by) | workloads |
|---|---:|---:|---:|
| cljam-walker | 555× | 12.0× | 14/14 |
| cljam-vm | 520× | 11.2× | 14/14 |
| sci | 46.2× | 1.0× | 14/14 |
| js | 1.0× | 0.0× | 14/14 |

> Ratios > 1 mean the engine is that many times slower than the reference.

## Per-workload results (per-call time)

### fib — function-call overhead (naive recursion) (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-walker | 335 | 334–337 | 332 | 343 | 135× | 10.6× |  |
| cljam-vm | 475 | 473–481 | 468 | 518 | 191× | 15.1× |  |
| sci | 31.45 | 31.11–32.23 | 30.45 | 33.06 | 12.7× | 1.0× |  |
| js | 2.48 | 2.44–2.48 | 2.42 | 2.58 | 1.0× | 0.1× |  |

### loop-sum — loop/recur, zero allocation (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-walker | 1307 | 1297–1327 | 1285 | 1417 | 1334× | 26.6× |  |
| cljam-vm | 720 | 717–721 | 713 | 747 | 735× | 14.7× |  |
| sci | 49.08 | 48.98–49.18 | 48.59 | 49.46 | 50.1× | 1.0× |  |
| js | 0.9796 | 0.9766–0.9853 | 0.9625 | 1.00 | 1.0× | 0.0× |  |

### closure-churn — closure creation + capture + invocation (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-walker | 20.29 | 20.12–20.45 | 19.30 | 21.78 | 1131× | 7.7× |  |
| cljam-vm | 17.35 | 17.20–21.47 | 16.79 | 23.09 | 967× | 6.6× | ⚠️ 25% |
| sci | 2.64 | 2.56–2.67 | 2.48 | 2.69 | 147× | 1.0× |  |
| js | 0.0179 | 0.0179–0.0181 | 0.0177 | 0.0184 | 1.0× | 0.0× |  |

### vector-build — persistent vector conj/nth/peek/reduce (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-walker | 74.82 | 74.31–75.83 | 73.47 | 76.90 | 266× | 9.4× |  |
| cljam-vm | 46.02 | 45.48–46.73 | 44.82 | 56.56 | 164× | 5.8× |  |
| sci | 7.94 | 7.84–8.09 | 7.68 | 8.84 | 28.3× | 1.0× |  |
| js | 0.2808 | 0.2791–0.2994 | 0.2685 | 0.3247 | 1.0× | 0.0× |  |

### vector-assoc — persistent vector assoc (path-copy update on a large vector) (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-walker | 131 | 129–133 | 129 | 137 | 1407× | 3.9× |  |
| cljam-vm | 111 | 110–114 | 110 | 123 | 1189× | 3.3× |  |
| sci | 33.72 | 33.46–34.03 | 32.81 | 34.27 | 362× | 1.0× |  |
| js | 0.0932 | 0.0926–0.0958 | 0.0900 | 0.0971 | 1.0× | 0.0× |  |

### map-assoc — persistent map assoc + lookup (HAMT) (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-walker | 522 | 521–529 | 365 | 562 | 873× | 110× |  |
| cljam-vm | 501 | 498–505 | 497 | 566 | 838× | 105× |  |
| sci | 4.76 | 4.73–4.78 | 4.71 | 4.86 | 8.0× | 1.0× |  |
| js | 0.5975 | 0.5880–0.6039 | 0.5650 | 0.6616 | 1.0× | 0.1× |  |

### seq-pipeline — lazy sequences: filter/map/take/reduce (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-walker | 13.44 | 12.85–13.67 | 12.46 | 14.36 | 6806× | 47.3× |  |
| cljam-vm | 14.45 | 14.32–19.44 | 14.02 | 22.74 | 7318× | 50.8× | ⚠️ 35% |
| sci | 0.2842 | 0.2804–0.2889 | 0.2740 | 0.3173 | 144× | 1.0× |  |
| js | 0.0020 | 0.0020–0.0020 | 0.0019 | 0.0020 | 1.0× | 0.0× |  |

### transduce-pipeline — transducers: same logical work as seq-pipeline (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-walker | 5.37 | 5.28–5.41 | 5.12 | 5.49 | 2724× | 40.9× |  |
| cljam-vm | 7.79 | 7.74–9.94 | 7.61 | 12.75 | 3947× | 59.2× | ⚠️ 28% |
| sci | 0.1315 | 0.1300–0.1392 | 0.1242 | 0.1467 | 66.7× | 1.0× |  |
| js | 0.0020 | 0.0020–0.0020 | 0.0019 | 0.0021 | 1.0× | 0.0× |  |

### multimethod — defmulti keyword dispatch (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-walker | 73.27 | 72.93–74.35 | 72.24 | 76.07 | 720× | 5.5× |  |
| cljam-vm | 66.73 | 65.91–68.08 | 65.46 | 79.03 | 656× | 5.0× |  |
| sci | 13.33 | 13.10–13.62 | 12.64 | 14.93 | 131× | 1.0× |  |
| js | 0.1018 | 0.1004–0.1023 | 0.0982 | 0.1059 | 1.0× | 0.0× |  |

### try-catch — throw/catch unwinding (ex-info + ex-data) (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-walker | 41.61 | 40.46–42.37 | 39.81 | 83.48 | 3.8× | 0.8× |  |
| cljam-vm | 39.30 | 38.88–39.40 | 38.52 | 52.26 | 3.6× | 0.7× |  |
| sci | 53.32 | 52.94–53.54 | 52.26 | 53.74 | 4.9× | 1.0× |  |
| js | 10.99 | 10.60–11.49 | 10.43 | 20.63 | 1.0× | 0.2× |  |

### destructure — map/vector destructuring in fn params + let (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-walker | 82.54 | 81.52–83.14 | 80.22 | 84.93 | 1683× | 6.7× |  |
| cljam-vm | 89.69 | 88.50–90.90 | 87.38 | 103 | 1829× | 7.2× |  |
| sci | 12.40 | 12.30–12.76 | 11.97 | 13.07 | 253× | 1.0× |  |
| js | 0.0490 | 0.0489–0.0507 | 0.0483 | 0.0691 | 1.0× | 0.0× |  |

### atom-swap — atom swap!/deref (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-walker | 61.82 | 60.69–62.44 | 59.47 | 62.62 | 1264× | 8.1× |  |
| cljam-vm | 40.86 | 40.13–41.18 | 39.39 | 55.89 | 835× | 5.4× |  |
| sci | 7.59 | 7.40–7.69 | 7.24 | 13.70 | 155× | 1.0× |  |
| js | 0.0489 | 0.0483–0.0497 | 0.0482 | 0.0541 | 1.0× | 0.0× |  |

### data-transform — realistic ETL: filter → enrich → group-by → aggregate (5k records) (macro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-walker | 37.04 | 36.27–38.10 | 35.57 | 40.68 | 287× | 13.5× |  |
| cljam-vm | 39.63 | 38.72–50.55 | 37.51 | 69.54 | 308× | 14.4× | ⚠️ 30% |
| sci | 2.75 | 2.68–2.75 | 2.59 | 2.89 | 21.3× | 1.0× |  |
| js | 0.1289 | 0.1237–0.1410 | 0.1214 | 0.2760 | 1.0× | 0.0× |  |

### string-build — string construction + clojure.string/join (micro)

| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |
|---|---:|---:|---:|---:|---:|---:|---|
| cljam-walker | 13.10 | 12.69–13.39 | 12.10 | 13.71 | 128× | 24.5× |  |
| cljam-vm | 15.14 | 15.00–19.03 | 14.79 | 21.39 | 148× | 28.3× | ⚠️ 27% |
| sci | 0.5356 | 0.5302–0.5458 | 0.5211 | 0.5779 | 5.2× | 1.0× |  |
| js | 0.1021 | 0.1015–0.1038 | 0.0997 | 0.1048 | 1.0× | 0.2× |  |

## Setup time (session create + workload defs, once per pair)

| engine | fib | loop-sum | closure-churn | vector-build | vector-assoc | map-assoc | seq-pipeline | transduce-pipeline | multimethod | try-catch | destructure | atom-swap | data-transform | string-build |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cljam-walker | 60.90 | 60.61 | 61.23 | 59.83 | 93.68 | 62.08 | 63.98 | 65.16 | 61.42 | 65.26 | 64.88 | 63.41 | 104 | 67.25 |
| cljam-vm | 122 | 82.65 | 86.73 | 87.84 | 141 | 85.59 | 91.91 | 94.08 | 85.86 | 82.53 | 85.42 | 84.04 | 148 | 91.25 |
| sci | 7.91 | 9.28 | 10.62 | 11.08 | 11.93 | 10.88 | 7.82 | 10.16 | 14.58 | 11.47 | 14.57 | 9.64 | 23.18 | 9.47 |
| js | 0.0020 | 0.0033 | 0.0046 | 0.0020 | 0.3472 | 0.0026 | 0.0032 | 0.0035 | 0.0051 | 0.0038 | 0.0138 | 0.0028 | 0.3278 | 0.0023 |

## Threats to validity

- cljam/SCI samples include a small per-call eval/parse cost of the run form; the js engine calls a function directly. Work sizes amortize this.
- nbb `loadString` is async; per-call promise overhead is noise at these sizes.
- One process per pair; cross-process variance not sampled. One machine, relative numbers only.
- The js reference is idiomatic mutable JS — a speed-of-light line, not a semantics-equivalent implementation.
