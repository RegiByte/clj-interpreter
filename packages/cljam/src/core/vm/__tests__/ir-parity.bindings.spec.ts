import { describe, it } from 'vitest'
import { expectChunkParity } from './ir-parity-utils'

describe('ir-parity: binding forms', () => {
  describe('let*', () => {
    it('single binding', () => expectChunkParity('(let [x 1] x)'))
    it('multiple bindings', () => expectChunkParity('(let [x 1 y 2] (vector x y))'))
    it('sequential dependency', () => expectChunkParity('(let [x 1 y (inc x)] y)'))
    it('shadowing', () => expectChunkParity('(let [x 1] (let [x 2] x))'))
    it('nested lets', () =>
      expectChunkParity('(let [x 1] (let [y 2] (vector x y)))'))
    it('multi-expr body', () =>
      expectChunkParity('(let [x 1] (identity x) x)'))
    it('body references outer', () =>
      expectChunkParity('(let [a 1 b 2 c 3] (vector a b c))'))
  })

  describe('loop* / recur', () => {
    it('loop with no recur', () =>
      expectChunkParity('(loop [x 1 y 2] (vector x y))'))
    it('countdown accumulator', () =>
      expectChunkParity(
        '(loop [i 5 acc 0] (if (clojure.core/= i 0) acc (recur (clojure.core/dec i) (clojure.core/+ acc i))))'
      ))
    it('single-binding loop with recur in branch', () =>
      expectChunkParity(
        '(loop [i 0] (if (clojure.core/< i 3) (recur (clojure.core/inc i)) i))'
      ))
  })

  describe('nested binding forms', () => {
    it('let containing loop', () =>
      expectChunkParity(
        '(let [n 3] (loop [i 0] (if (clojure.core/< i n) (recur (clojure.core/inc i)) i)))'
      ))
    it('loop containing let', () =>
      expectChunkParity(
        '(loop [i 0] (let [j (clojure.core/inc i)] (if (clojure.core/< j 3) (recur j) j)))'
      ))
  })
})
