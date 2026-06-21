import { describe, expect, it } from 'vitest'
import type { CljValue, TrieVectorData } from '../../types.ts'
import {
  EMPTY_TRIE,
  type TrieNode,
  trieAssoc,
  trieConj,
  trieFromArray,
  trieNth,
  triePop,
  trieToArray,
} from '../vector-kernel.ts'

// The kernel stores leaf payloads opaquely (it never inspects them), so plain
// numbers stand in for CljValue throughout these tests.
const v = (n: number): CljValue => n as unknown as CljValue

// Deterministic PRNG (mulberry32) — a failing fuzz seed reproduces exactly.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildByConj(n: number): TrieVectorData {
  let d = EMPTY_TRIE
  for (let i = 0; i < n; i++) d = trieConj(d, v(i))
  return d
}

// The core oracle: the trie must materialize to exactly `model`, and indexed
// access must agree at every position.
function assertMatches(data: TrieVectorData, model: CljValue[]): void {
  expect(data.count).toBe(model.length)
  expect(trieToArray(data)).toEqual(model)
  for (let i = 0; i < model.length; i++) {
    expect(trieNth(data, i)).toBe(model[i])
  }
}

// Sizes chosen to straddle every depth transition: the tail boundary (32/33), the
// first internal level filling (1024 = 32², 1025), and the second (32768 = 32³).
const BOUNDARIES = [0, 1, 2, 31, 32, 33, 64, 1023, 1024, 1025, 32767, 32768, 32769]

describe('EMPTY_TRIE', () => {
  it('is an empty, well-formed trie', () => {
    expect(EMPTY_TRIE.count).toBe(0)
    expect(trieToArray(EMPTY_TRIE)).toEqual([])
  })

  it('pop on empty throws', () => {
    expect(() => triePop(EMPTY_TRIE)).toThrow(/empty/)
  })
})

describe('trieConj — build by repeated conj', () => {
  for (const n of BOUNDARIES) {
    it(`materializes correctly at count ${n}`, () => {
      const model = Array.from({ length: n }, (_, i) => v(i))
      assertMatches(buildByConj(n), model)
    })
  }

  it('does not mutate the input vector', () => {
    const a = buildByConj(50)
    const before = trieToArray(a)
    trieConj(a, v(999))
    expect(trieToArray(a)).toEqual(before)
    expect(a.count).toBe(50)
  })
})

describe('trieFromArray — bulk build equals fold-conj', () => {
  for (const n of BOUNDARIES) {
    it(`agrees with conj-fold at count ${n} (same structure)`, () => {
      const model = Array.from({ length: n }, (_, i) => v(i))
      const bulk = trieFromArray(model)
      const folded = buildByConj(n)
      assertMatches(bulk, model)
      // Same materialization AND same height — a real structural equivalence check.
      expect(bulk.shift).toBe(folded.shift)
      expect(bulk.count).toBe(folded.count)
    })
  }
})

describe('trieFromArray then grow by conj — composition stays consistent', () => {
  // A bulk-built vector must keep growing correctly under trieConj. If trieFromArray
  // ever parked an extra empty internal level, the resulting `shift` would mislead
  // trieConj's grow-taller check — this catches that across every depth boundary.
  for (const base of BOUNDARIES) {
    it(`bulk-build ${base} then conj 80 more matches pure conj`, () => {
      const model = Array.from({ length: base }, (_, i) => v(i))
      let d = trieFromArray(model.slice())
      for (let k = 0; k < 80; k++) {
        const x = v(base + k)
        d = trieConj(d, x)
        model.push(x)
      }
      assertMatches(d, model)
      expect(d.shift).toBe(buildByConj(base + 80).shift)
    })
  }
})

describe('trieAssoc — update at index', () => {
  it('updates tail-region and deep indices, leaving the original intact', () => {
    const n = 2000
    const original = buildByConj(n)
    const model = Array.from({ length: n }, (_, i) => v(i))

    // Deep index (in the trie), tail-region index, first, last.
    for (const i of [0, 1, 17, 1000, 1983, 1984, 1999]) {
      const updated = trieAssoc(original, i, v(-i - 1))
      expect(trieNth(updated, i)).toBe(v(-i - 1))
      const expected = model.slice()
      expected[i] = v(-i - 1)
      assertMatches(updated, expected)
      // immutability: original untouched
      expect(trieNth(original, i)).toBe(v(i))
    }
  })

  it('assoc at count === conj (append at the end)', () => {
    const d = buildByConj(40)
    const appended = trieAssoc(d, 40, v(40))
    assertMatches(appended, Array.from({ length: 41 }, (_, i) => v(i)))
  })
})

describe('triePop — remove last, including across height shrinks', () => {
  // Pop all the way to empty from sizes that cross every depth-shrink boundary.
  // Full materialization is O(n); doing it every step is O(n²) in the TEST, so we
  // reserve it for small sizes and a tight window around each height-shrink
  // boundary (1024 = 32², 32768 = 32³) where the trie actually changes height.
  const nearShrink = (len: number) => Math.abs(len - 1024) <= 2 || Math.abs(len - 32768) <= 2
  for (const n of [33, 1025, 32769]) {
    it(`pops from ${n} down to empty, matching the model at every step`, () => {
      let d = buildByConj(n)
      const model = Array.from({ length: n }, (_, i) => v(i))
      while (model.length > 0) {
        d = triePop(d)
        model.pop()
        if (model.length < 40 || nearShrink(model.length)) {
          assertMatches(d, model)
        } else {
          expect(d.count).toBe(model.length)
          expect(trieNth(d, model.length - 1)).toBe(model[model.length - 1])
        }
      }
      expect(d.count).toBe(0)
      expect(trieToArray(d)).toEqual([])
    }, 20000)
  }

  it('does not mutate the input vector', () => {
    const a = buildByConj(1025)
    const before = trieToArray(a)
    triePop(a)
    expect(trieToArray(a)).toEqual(before)
  })
})

describe('structural sharing', () => {
  it('conj with tail room shares the root by reference', () => {
    const d = buildByConj(100) // tail has room (100 - 96 = 4 < 32)
    const next = trieConj(d, v(100))
    expect(next.root).toBe(d.root) // off-path: the entire tree is untouched
    expect(next).not.toBe(d)
  })

  it('conj that pushes a full tail shares off-path sibling subtrees', () => {
    // At count 2048 the tail is full (2048 - 2016 = 32) and the trie spans two
    // internal levels; the next conj pushes the tail under root[1], leaving root[0]
    // untouched and therefore shared by reference.
    const d = buildByConj(2048)
    const next = trieConj(d, v(2048))
    expect((next.root as TrieNode[])[0]).toBe((d.root as TrieNode[])[0])
    expect(next.root).not.toBe(d.root)
  })
})

describe('randomized fuzz vs array oracle', () => {
  for (const seed of [1, 7, 42, 1337, 99991]) {
    it(`mixed conj/assoc/pop sequence agrees with the model (seed ${seed})`, () => {
      const rand = mulberry32(seed)
      let d = EMPTY_TRIE
      const model: CljValue[] = []
      let nextVal = 0

      for (let step = 0; step < 4000; step++) {
        const roll = rand()
        if (model.length === 0 || roll < 0.55) {
          // conj — biased high so the structure grows across boundaries
          const x = v(nextVal++)
          d = trieConj(d, x)
          model.push(x)
        } else if (roll < 0.8) {
          // assoc at a random valid index
          const i = Math.floor(rand() * model.length)
          const x = v(nextVal++)
          d = trieAssoc(d, i, x)
          model[i] = x
        } else {
          // pop
          d = triePop(d)
          model.pop()
        }

        // Cheap per-step invariant; full materialization occasionally.
        expect(d.count).toBe(model.length)
        if (step % 200 === 0) assertMatches(d, model)
      }
      assertMatches(d, model)
    })
  }
})
