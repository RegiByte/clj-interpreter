# @regibyte/cljam-date

[![npm](https://img.shields.io/npm/v/%40regibyte%2Fcljam-date)](https://www.npmjs.com/package/@regibyte/cljam-date)
[![license](https://img.shields.io/npm/l/%40regibyte%2Fcljam-date)](LICENSE)

Date handling library for [@regibyte/cljam](https://www.npmjs.com/package/@regibyte/cljam).

Provides ergonomic date construction, accessors, formatting, and arithmetic via the `cljam.date` namespace — without reaching for `js/new js/Date`.

***

## Installation

```bash
npm install @regibyte/cljam-date
# peer dependency
npm install @regibyte/cljam
```

***

## Setup

```typescript
import { createSession, nodePreset } from '@regibyte/cljam'
import { library as dateLib } from '@regibyte/cljam-date'

const session = createSession({
  ...nodePreset(),
  libraries: [dateLib],
})
```

***

## Usage

```clojure
(ns my-app.core
  (:require [cljam.date :as d]))

;; Construction
(def now     (d/now))
(def past    (d/from-millis 0))
(def release (d/from-iso "2026-04-11T00:00:00Z"))

;; Accessors
(d/year now)     ;; => 2026
(d/month now)    ;; => 4    (1-indexed — January = 1)
(d/day now)      ;; => 11
(d/hour now)     ;; => 14
(d/minute now)   ;; => 30
(d/second now)   ;; => 7

;; Serialization
(d/to-iso now)   ;; => "2026-04-11T14:30:07.000Z"
(d/to-millis now) ;; => 1744378207000

;; Arithmetic
(def tomorrow (d/add-days now 1))
(def next-hr  (d/add-hours now 1))
(d/diff-days past now)  ;; => whole days between past and now

;; Formatting (wraps Intl.DateTimeFormat)
(d/format now)                  ;; system locale, default options
(d/format now "en-US")          ;; explicit locale
(d/format now "de-DE" {:year "numeric" :month "long" :day "numeric"})
;; => "11. April 2026"
```

***

## API Reference

| Function | Signature | Description |
|---|---|---|
| `now` | `() → date` | Current instant |
| `from-millis` | `(ms) → date` | Construct from epoch milliseconds |
| `from-iso` | `(s) → date` | Construct from ISO 8601 string |
| `to-millis` | `(d) → number` | Epoch milliseconds |
| `to-iso` | `(d) → string` | ISO 8601 string |
| `year` | `(d) → number` | Full year (e.g. 2026) |
| `month` | `(d) → number` | Month, **1-indexed** (Jan = 1) |
| `day` | `(d) → number` | Day of month (1–31) |
| `hour` | `(d) → number` | Hours component (0–23) |
| `minute` | `(d) → number` | Minutes component (0–59) |
| `second` | `(d) → number` | Seconds component (0–59) |
| `format` | `(d), (d locale), (d locale opts) → string` | Format via `Intl.DateTimeFormat` |
| `add-days` | `(d n) → date` | New date n days after d |
| `add-hours` | `(d n) → date` | New date n hours after d |
| `diff-days` | `(a b) → number` | Whole days between a and b (b − a) |

Dates are opaque host values — never manipulate them directly. All mutation-prone JS `Date` API surface is handled in the native layer.

***

## License

MIT
