import { describe, it } from 'vitest'
import {
  expectChunkParity,
  expectIrVmMatchesInterpreter,
} from './ir-parity-utils'

describe('ir-parity: intrinsic gate', () => {
  it('arithmetic intrinsics', () => {
    expectChunkParity('(+ 1 2)')
    expectChunkParity('(- 5 2)')
    expectChunkParity('(* 2 3)')
    expectChunkParity('(/ 6 2)')
  })
  it('comparison intrinsics', () => {
    expectChunkParity('(< 1 2)')
    expectChunkParity('(> 2 1)')
    expectChunkParity('(<= 1 1)')
    expectChunkParity('(>= 2 1)')
    expectChunkParity('(= 1 1)')
  })
  it('nested intrinsics', () => expectChunkParity('(+ 1 (* 2 3) (- 10 4))'))
  it('qualified operator is NOT an intrinsic (plain Call)', () =>
    expectChunkParity('(clojure.core/+ 1 2)'))
  it('intrinsic shadowed by a local is a plain Call', () =>
    expectChunkParity('(let [+ vector] (+ 1 2))'))
  it('variadic intrinsic', () => expectChunkParity('(+ 1 2 3 4 5)'))
})

describe('ir-parity: fn', () => {
  it('identity', () => expectChunkParity('(fn [x] x)'))
  it('two params', () => expectChunkParity('(fn [x y] (vector x y))'))
  it('named', () => expectChunkParity('(fn foo [x] x)'))
  it('variadic', () => expectChunkParity('(fn [x & rest] rest)'))
  it('variadic with fixed', () =>
    expectChunkParity('(fn [a b & rest] (vector a b rest))'))
  it('multi-arity', () =>
    expectChunkParity('(fn ([x] x) ([x y] (vector x y)))'))
  it('multi-arity with variadic', () =>
    expectChunkParity('(fn ([x] x) ([x & xs] (vector x xs)))'))
  it('body with let', () => expectChunkParity('(fn [x] (let [y (inc x)] y))'))
})

describe('ir-parity: closures / captures', () => {
  it('captures an outer let binding', () =>
    expectChunkParity('(let [a 1] (fn [x] (vector a x)))'))
  it('nested closures', () =>
    expectChunkParity('(fn [a] (fn [b] (vector a b)))'))
  it('triple-nested capture', () =>
    expectChunkParity('(fn [a] (fn [b] (fn [c] (vector a b c))))'))
  it('capture shared across multi-arity', () =>
    expectChunkParity('(let [a 1] (fn ([x] (vector a x)) ([x y] (vector a x y))))'))
})

describe('ir-parity: tail self-call', () => {
  it('fixed-arity self recursion in tail position', () =>
    expectChunkParity(
      '(fn foo [x] (if (clojure.core/< x 10) (foo (clojure.core/inc x)) x))'
    ))
  it('variadic self recursion', () =>
    expectChunkParity('(fn foo [x & xs] (if x (foo xs) xs))'))
  it('non-tail self call is a plain Call', () =>
    expectChunkParity('(fn foo [x] (vector (foo x)))'))
  it('multi-arity self recursion targets current arity', () =>
    expectChunkParity(
      '(fn foo ([x] (foo x x)) ([x y] (if (clojure.core/< x y) (foo (clojure.core/inc x) y) x)))'
    ))
})

// letfn captures INTENTIONALLY diverge from the legacy bytecode: the analyzer
// captures the letfn binding (RB-007 fix) instead of the legacy fn self-slot, so
// these are verified behaviorally (IR-VM result == interpreter), not by byte diff.
describe('ir-parity: letfn (intended divergence — behavioral)', () => {
  it('mutually recursive letfn', () =>
    expectIrVmMatchesInterpreter(
      '(letfn [(my-even? [n] (if (clojure.core/= n 0) true (my-odd? (clojure.core/dec n)))) (my-odd? [n] (if (clojure.core/= n 0) false (my-even? (clojure.core/dec n))))] (my-even? 10))'
    ))
  it('single letfn', () =>
    expectIrVmMatchesInterpreter('(letfn [(f [x] (clojure.core/inc x))] (f 1))'))
})
