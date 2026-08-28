import { loadString } from 'nbb'

const def = await loadString('(defn fib [n] (if (<= n 1) n (+ (fib (- n 1)) (fib (- n 2)))))')
console.log('defined:', String(def))
const r = await loadString('(fib 25)')
console.log('fib(25) =', r, typeof r)
const persist = await loadString('(do (def xs (vec (range 10))) (reduce + xs))')
console.log('persistent state =', persist)
const t0 = performance.now()
await loadString('(fib 25)')
console.log('one fib(25) call ms:', (performance.now() - t0).toFixed(1))
