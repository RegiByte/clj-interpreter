// Invariants for the trie-backed CljVector rep (Phase B/C of the persistent-vector
// arc). The kernel fuzz (persistent-vector-kernel.spec.ts) proves the trie
// structure in isolation; THIS file pins the helper-layer contracts that the kernel
// deliberately leaves out: dual-rep promotion/demotion, the cached/incremental
// _hash, the cross-type hash invariant, and the layered equality fast-paths.

import { describe, expect, it } from 'vitest'
import { cljWithMeta, v } from '../../factories.ts'
import type { CljMap, CljValue } from '../../types.ts'
import { hashCljValue, hashConj, hashSequential, vectorHash } from '../hash.ts'
import { isEqual } from '../equality.ts'
import {
  cljVector,
  makeCljVector,
  vectorAssoc,
  vectorConj,
  vectorCount,
  vectorPop,
} from '../vector-helpers.ts'

const n = (x: number): CljValue => v.number(x)
const range = (count: number): CljValue[] =>
  Array.from({ length: count }, (_, i) => n(i))

describe('CljVector dual representation', () => {
  it('uses the array rep at or below the 32 threshold, trie above', () => {
    expect(cljVector(range(0))._data.kind).toBe('array')
    expect(cljVector(range(32))._data.kind).toBe('array')
    expect(cljVector(range(33))._data.kind).toBe('trie')
    expect(cljVector(range(1000))._data.kind).toBe('trie')
  })

  it('promotes array → trie when a conj crosses 32', () => {
    const at32 = cljVector(range(32))
    expect(at32._data.kind).toBe('array')
    const at33 = vectorConj(at32, n(32))
    expect(at33._data.kind).toBe('trie')
    expect(vectorCount(at33)).toBe(33)
  })

  it('demotes trie → array when a pop drops back to 32', () => {
    const at33 = cljVector(range(33))
    expect(at33._data.kind).toBe('trie')
    const at32 = vectorPop(at33)
    expect(at32._data.kind).toBe('array')
    expect(vectorCount(at32)).toBe(32)
  })

  it('preserves meta across conj/assoc/pop', () => {
    const meta = v.map([[v.keyword(':tag'), n(1)]]) as CljMap
    const withMeta = cljWithMeta(cljVector(range(40)), meta) as ReturnType<
      typeof cljVector
    >
    expect(vectorConj(withMeta, n(99)).meta).toBe(meta)
    expect(vectorAssoc(withMeta, 0, n(0)).meta).toBe(meta)
    expect(vectorPop(withMeta).meta).toBe(meta)
  })
})

describe('CljVector hashing', () => {
  it('hashConj folds to the same value as hashSequential', () => {
    const items = range(200)
    let folded = 1 // hashSequential seed
    for (const x of items) folded = hashConj(folded, x)
    expect(folded).toBe(hashSequential(items))
  })

  it('holds the cross-type invariant: a conj-built vector hashes like the equal list', () => {
    // (= '(0..999) [0..999]) ⟹ their hashes must match (gotchas.md #4).
    let vec = cljVector([])
    for (let i = 0; i < 1000; i++) vec = vectorConj(vec, n(i))
    const list = v.list(range(1000))
    expect(hashCljValue(vec)).toBe(hashCljValue(list))
    expect(hashCljValue(vec)).toBe(hashSequential(range(1000)))
  })

  it('caches _hash lazily on the trie rep and memoizes on first request', () => {
    const vec = cljVector(range(100))
    expect(vec._data.kind).toBe('trie')
    if (vec._data.kind !== 'trie') return
    expect(vec._data._hash).toBeUndefined() // lazy — never computed during build
    const h = vectorHash(vec._data)
    expect(vec._data._hash).toBe(h) // memoized
  })

  it('maintains _hash incrementally on conj once it is warm', () => {
    const base = cljVector(range(100))
    vectorHash(base._data) // warm the cache
    const grown = vectorConj(base, n(100))
    if (grown._data.kind !== 'trie') throw new Error('expected trie')
    // conj maintained it incrementally (no recompute needed) and it is correct.
    expect(grown._data._hash).toBe(hashSequential(range(101)))
    expect(hashCljValue(grown)).toBe(hashCljValue(cljVector(range(101))))
  })

  it('invalidates _hash on assoc and pop, recomputing correctly', () => {
    const base = cljVector(range(100))
    vectorHash(base._data) // warm

    const assoced = vectorAssoc(base, 0, n(999))
    if (assoced._data.kind === 'trie') expect(assoced._data._hash).toBeUndefined()
    const expectArr = range(100)
    expectArr[0] = n(999)
    expect(vectorHash(assoced._data)).toBe(hashSequential(expectArr))

    const popped = vectorPop(base)
    if (popped._data.kind === 'trie') expect(popped._data._hash).toBeUndefined()
    expect(vectorHash(popped._data)).toBe(hashSequential(range(99)))
  })
})

describe('CljVector equality fast-paths', () => {
  it('rejects on count mismatch', () => {
    expect(isEqual(cljVector(range(1000)), cljVector(range(999)))).toBe(false)
  })

  it('accepts structurally-shared vectors (shared root & tail)', () => {
    const a = cljVector(range(100))
    const b = makeCljVector(a._data) // same trie nodes by reference
    expect(isEqual(a, b)).toBe(true)
  })

  it('compares equal-but-distinct vectors true via the element walk', () => {
    const a = cljVector(range(1000))
    let b = cljVector([])
    for (let i = 0; i < 1000; i++) b = vectorConj(b, n(i))
    expect(a._data).not.toBe(b._data) // genuinely distinct structures
    expect(isEqual(a, b)).toBe(true)
  })

  it('keeps cross-type sequential equality: (= [..] (list ..))', () => {
    expect(isEqual(cljVector(range(50)), v.list(range(50)))).toBe(true)
  })

  it('is consistent with hash: equal vectors hash equally (large, trie rep)', () => {
    const a = cljVector(range(500))
    let b = cljVector([])
    for (let i = 0; i < 500; i++) b = vectorConj(b, n(i))
    expect(isEqual(a, b)).toBe(true)
    expect(hashCljValue(a)).toBe(hashCljValue(b))
  })
})
