import { describe, it } from 'vitest'
import { expectFnBodyChunkParity } from './ir-parity-utils'

// Direct byte-parity for the fn-body entry point (tryCompileVmFnBody vs
// tryCompileVmFnBodyFromIr) — the live `special-forms.ts` swap site. The
// top-level `(fn ...)` parity tests share emitMethodBodyToChunk but never
// exercise the bare-chunk synth wrapper, so cover it explicitly here.
describe('ir-parity: fn-body entry point', () => {
  it('simple body', () =>
    expectFnBodyChunkParity({ params: ['x'], body: ['x'] }))

  it('intrinsic call body', () =>
    expectFnBodyChunkParity({
      params: ['x'],
      body: ['(clojure.core/+ x 1)'],
    }))

  it('let in body', () =>
    expectFnBodyChunkParity({
      params: ['x'],
      body: ['(let [y (clojure.core/inc x)] y)'],
    }))

  it('variadic body', () =>
    expectFnBodyChunkParity({
      params: ['x'],
      rest: 'xs',
      body: ['(vector x xs)'],
    }))

  it('named fn self-recursion in tail position', () =>
    expectFnBodyChunkParity({
      params: ['n'],
      self: 'fact-helper',
      body: [
        '(if (clojure.core/= n 0) 1 (fact-helper (clojure.core/dec n)))',
      ],
    }))

  it('loop/recur in body', () =>
    expectFnBodyChunkParity({
      params: ['n'],
      body: [
        '(loop [i n acc 0] (if (clojure.core/= i 0) acc (recur (clojure.core/dec i) (clojure.core/inc acc))))',
      ],
    }))
})
