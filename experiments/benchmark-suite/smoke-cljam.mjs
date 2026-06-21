import { createSession } from '../../packages/cljam/dist/index.mjs'

for (const mode of ['off', 'function-body']) {
  const s = createSession({ vmExecutionMode: mode })
  s.evaluate('(defn fib [n] (if (<= n 1) n (+ (fib (- n 1)) (fib (- n 2)))))')
  const r = s.evaluate('(fib 25)')
  const t0 = performance.now()
  s.evaluate('(fib 25)')
  const ms = performance.now() - t0
  console.log(`mode=${mode.padEnd(13)} fib(25)=${r} (${typeof r})  one call ms: ${ms.toFixed(1)}`)
}
