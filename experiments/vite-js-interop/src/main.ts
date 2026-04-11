import { getSession } from 'virtual:clj-session'
import { printString } from '@regibyte/cljam'
// Side-effect imports: load the Clojure namespaces into the session.
// Dep order matters: utils and format must be loaded before pipeline.
import './clojure/demo/utils.clj'
import './clojure/demo/format.clj'   // ← has (:require ["date-fns" :as date-fns])
import './clojure/demo/pipeline.clj' // ← depends on demo.utils + demo.format

const session = getSession()

// ── Demo 1: Pure Clojure math (no JS deps) ──────────────────────────────────
const mul = printString(session.evaluate('(demo.utils/multiply 6 7)'))
console.log(`1. multiply 6×7 = ${mul}`)
// Expected: 42

// ── Demo 2: Mode 2 hostBindings — js/Math from src/conjure.ts ──────────────
// Use the dot special form: (. js/Math abs -99) calls Math.abs(-99)
const abs = printString(session.evaluate('(. js/Math abs -99)'))
console.log(`2. Math.abs(-99) = ${abs}`)
// Expected: 99

// ── Demo 3: String require — date-fns accessed via import map ───────────────
const formatted = printString(
  await session.evaluateAsync('(demo.format/format-iso "2024-01-15" "yyyy-MM-dd")')
)
console.log(`3. format-iso = ${formatted}`)
// Expected: "2024-01-15"

// ── Demo 4: Compare dates using compareAsc ──────────────────────────────────
const cmp = printString(
  await session.evaluateAsync('(demo.format/compare-dates 1000 2000)')
)
console.log(`4. compareAsc(1000, 2000) = ${cmp}`)
// Expected: -1 (1000 < 2000)

// ── Demo 5: Full pipeline — CLJ→CLJ chain with JS dep transitively ──────────
const pipe = printString(
  await session.evaluateAsync(
    '(demo.pipeline/process-numbers [1 2 3 4 5])'
  )
)
console.log(`5. process-numbers = ${pipe}`)
// Expected: {:sum-of-squares 55, :multiplied [10 20 30 40 50]}

// ── Demo 6: Pipeline report — composition of all layers ─────────────────────
const report = printString(
  await session.evaluateAsync(
    '(demo.pipeline/pipeline-report [3 4] "2025-06-01")'
  )
)
console.log(`6. pipeline-report = ${report}`)
// Expected string containing "date=2025-06-01" and "sum-sq=25"

console.log('\n✓ All demos complete')
