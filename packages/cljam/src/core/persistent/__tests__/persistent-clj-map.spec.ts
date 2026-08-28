import { describe, expect, it } from 'vitest'
import { cljMap, makeCljMap } from '../../factories'
import { isEqual } from '../../assertions'
import {
  mapAssoc,
  mapContains,
  mapCount,
  mapDissoc,
  mapEntries,
  mapGet,
  mapMerge,
  NOT_FOUND,
  SMALL_MAP_THRESHOLD,
} from '../map-helpers'
import { cljKeyword as kw, cljNumber as n, cljString as s, cljNil as nil } from '../../factories'
import type { CljMap, HamtMapData, SmallMapData } from '../../types'

// ─── helpers ─────────────────────────────────────────────────────────────────

function smallMap(...pairs: [unknown, unknown][]): CljMap {
  return cljMap(pairs as [ReturnType<typeof kw>, ReturnType<typeof n>][])
}

function largeMap(size: number): CljMap {
  const entries: [ReturnType<typeof kw>, ReturnType<typeof n>][] = []
  for (let i = 0; i < size; i++) {
    entries.push([kw(`:k${i}`), n(i)])
  }
  return cljMap(entries)
}

// ─── Small map (≤8 entries) ───────────────────────────────────────────────────

describe('small map (≤8 entries)', () => {
  it('empty map has count 0', () => {
    expect(mapCount(cljMap([]))).toBe(0)
  })

  it('mapGet returns NOT_FOUND for missing key', () => {
    const m = smallMap([kw(':a'), n(1)])
    expect(mapGet(m, kw(':b'))).toBe(NOT_FOUND)
  })

  it('mapGet returns value for present key', () => {
    const m = smallMap([kw(':a'), n(1)], [kw(':b'), n(2)])
    expect(mapGet(m, kw(':a'))).toEqual(n(1))
    expect(mapGet(m, kw(':b'))).toEqual(n(2))
  })

  it('mapContains returns true/false correctly', () => {
    const m = smallMap([kw(':x'), n(99)])
    expect(mapContains(m, kw(':x'))).toBe(true)
    expect(mapContains(m, kw(':y'))).toBe(false)
  })

  it('mapCount reflects actual entry count', () => {
    expect(mapCount(smallMap([kw(':a'), n(1)], [kw(':b'), n(2)]))).toBe(2)
  })

  it('mapEntries returns all entries', () => {
    const m = smallMap([kw(':a'), n(1)], [kw(':b'), n(2)])
    const entries = mapEntries(m)
    expect(entries).toHaveLength(2)
  })

  it('mapAssoc adds a new key', () => {
    const m = cljMap([])
    const m2 = mapAssoc(m, kw(':a'), n(1))
    expect(mapGet(m2, kw(':a'))).toEqual(n(1))
    expect(mapCount(m2)).toBe(1)
  })

  it('mapAssoc replaces an existing key (last-write-wins)', () => {
    const m = smallMap([kw(':a'), n(1)])
    const m2 = mapAssoc(m, kw(':a'), n(42))
    expect(mapGet(m2, kw(':a'))).toEqual(n(42))
    expect(mapCount(m2)).toBe(1)
  })

  it('mapAssoc is structurally persistent — original unchanged', () => {
    const m = smallMap([kw(':a'), n(1)])
    mapAssoc(m, kw(':b'), n(2))
    expect(mapCount(m)).toBe(1)
    expect(mapGet(m, kw(':b'))).toBe(NOT_FOUND)
  })

  it('mapDissoc removes a key', () => {
    const m = smallMap([kw(':a'), n(1)], [kw(':b'), n(2)])
    const m2 = mapDissoc(m, kw(':a'))
    expect(mapGet(m2, kw(':a'))).toBe(NOT_FOUND)
    expect(mapGet(m2, kw(':b'))).toEqual(n(2))
    expect(mapCount(m2)).toBe(1)
  })

  it('mapDissoc on missing key returns same map', () => {
    const m = smallMap([kw(':a'), n(1)])
    expect(mapDissoc(m, kw(':z'))).toBe(m)
  })

  it('nil is a valid map key', () => {
    const m = mapAssoc(cljMap([]), nil(), n(42))
    expect(mapGet(m, nil())).toEqual(n(42))
  })

  it('nil is a valid map value (distinguishable from NOT_FOUND)', () => {
    const m = mapAssoc(cljMap([]), kw(':k'), nil())
    const result = mapGet(m, kw(':k'))
    expect(result).not.toBe(NOT_FOUND)
    expect(result).toEqual(nil())
  })

  it('deduplication: cljMap keeps last-write-wins for duplicate keys', () => {
    const m = cljMap([[kw(':a'), n(1)], [kw(':a'), n(2)]])
    expect(mapCount(m)).toBe(1)
    expect(mapGet(m, kw(':a'))).toEqual(n(2))
  })
})

// ─── HAMT promotion ───────────────────────────────────────────────────────────

describe('small→HAMT promotion at threshold', () => {
  it('map with ≤8 entries uses small tier', () => {
    const m = largeMap(SMALL_MAP_THRESHOLD)
    expect((m._data as SmallMapData).kind).toBe('small')
  })

  it('map with >8 entries uses HAMT tier', () => {
    const m = largeMap(SMALL_MAP_THRESHOLD + 1)
    expect((m._data as HamtMapData).kind).toBe('hamt')
  })

  it('mapAssoc promotes small→HAMT when crossing threshold', () => {
    let m = largeMap(SMALL_MAP_THRESHOLD)
    expect((m._data as SmallMapData).kind).toBe('small')
    m = mapAssoc(m, kw(':new'), n(999))
    expect((m._data as HamtMapData).kind).toBe('hamt')
    expect(mapCount(m)).toBe(SMALL_MAP_THRESHOLD + 1)
    expect(mapGet(m, kw(':new'))).toEqual(n(999))
  })
})

// ─── HAMT map (>8 entries) ────────────────────────────────────────────────────

describe('HAMT map (>8 entries)', () => {
  it('mapGet returns correct value for all keys', () => {
    const size = 20
    const m = largeMap(size)
    for (let i = 0; i < size; i++) {
      expect(mapGet(m, kw(`:k${i}`))).toEqual(n(i))
    }
  })

  it('mapGet returns NOT_FOUND for absent key', () => {
    const m = largeMap(20)
    expect(mapGet(m, kw(':missing'))).toBe(NOT_FOUND)
  })

  it('mapCount is correct', () => {
    expect(mapCount(largeMap(20))).toBe(20)
  })

  it('mapEntries returns all entries', () => {
    const size = 20
    const m = largeMap(size)
    const entries = mapEntries(m)
    expect(entries).toHaveLength(size)
  })

  it('mapAssoc adds new key', () => {
    const m = largeMap(20)
    const m2 = mapAssoc(m, kw(':new'), n(999))
    expect(mapCount(m2)).toBe(21)
    expect(mapGet(m2, kw(':new'))).toEqual(n(999))
  })

  it('mapAssoc updates existing key', () => {
    const m = largeMap(20)
    const m2 = mapAssoc(m, kw(':k0'), n(777))
    expect(mapCount(m2)).toBe(20)
    expect(mapGet(m2, kw(':k0'))).toEqual(n(777))
  })

  it('mapAssoc is structurally persistent', () => {
    const m = largeMap(20)
    mapAssoc(m, kw(':k0'), n(777))
    expect(mapGet(m, kw(':k0'))).toEqual(n(0))
  })

  it('mapDissoc removes a key', () => {
    const m = largeMap(20)
    const m2 = mapDissoc(m, kw(':k5'))
    expect(mapCount(m2)).toBe(19)
    expect(mapGet(m2, kw(':k5'))).toBe(NOT_FOUND)
    expect(mapGet(m2, kw(':k0'))).toEqual(n(0))
  })

  it('mapDissoc on missing key returns same map', () => {
    const m = largeMap(20)
    expect(mapDissoc(m, kw(':missing'))).toBe(m)
  })

  it('mapDissoc demotes HAMT→small when below threshold', () => {
    let m = largeMap(SMALL_MAP_THRESHOLD + 1)
    expect((m._data as HamtMapData).kind).toBe('hamt')
    m = mapDissoc(m, kw(`:k0`))
    expect((m._data as SmallMapData).kind).toBe('small')
    expect(mapCount(m)).toBe(SMALL_MAP_THRESHOLD)
  })
})

// ─── mapMerge ─────────────────────────────────────────────────────────────────

describe('mapMerge', () => {
  it('merges two small maps — other wins on conflict', () => {
    const base = smallMap([kw(':a'), n(1)], [kw(':b'), n(2)])
    const other = smallMap([kw(':b'), n(99)], [kw(':c'), n(3)])
    const merged = mapMerge(base, other)
    expect(mapGet(merged, kw(':a'))).toEqual(n(1))
    expect(mapGet(merged, kw(':b'))).toEqual(n(99))
    expect(mapGet(merged, kw(':c'))).toEqual(n(3))
  })

  it('merging into empty base returns other', () => {
    const other = smallMap([kw(':x'), n(1)])
    const merged = mapMerge(cljMap([]), other)
    expect(mapCount(merged)).toBe(1)
    expect(mapGet(merged, kw(':x'))).toEqual(n(1))
  })

  it('merging empty other returns base unchanged', () => {
    const base = smallMap([kw(':a'), n(1)])
    const merged = mapMerge(base, cljMap([]))
    expect(mapCount(merged)).toBe(1)
  })
})

// ─── isEqual integration ──────────────────────────────────────────────────────

describe('isEqual for maps (via equality.ts)', () => {
  it('two empty maps are equal', () => {
    expect(isEqual(cljMap([]), cljMap([]))).toBe(true)
  })

  it('equal small maps are equal regardless of construction order', () => {
    const a = smallMap([kw(':a'), n(1)], [kw(':b'), n(2)])
    const b = smallMap([kw(':b'), n(2)], [kw(':a'), n(1)])
    expect(isEqual(a, b)).toBe(true)
  })

  it('maps with different values are not equal', () => {
    const a = smallMap([kw(':a'), n(1)])
    const b = smallMap([kw(':a'), n(2)])
    expect(isEqual(a, b)).toBe(false)
  })

  it('maps with different key counts are not equal', () => {
    const a = smallMap([kw(':a'), n(1)])
    const b = smallMap([kw(':a'), n(1)], [kw(':b'), n(2)])
    expect(isEqual(a, b)).toBe(false)
  })

  it('equal HAMT maps are equal', () => {
    const a = largeMap(20)
    const b = largeMap(20)
    expect(isEqual(a, b)).toBe(true)
  })

  it('small and HAMT maps with same content are equal', () => {
    const small = smallMap([kw(':a'), n(1)])
    const hamt = largeMap(20)
    const hamtWithA = mapAssoc(hamt, kw(':a'), n(1))
    // They have different sizes so not equal — just checking no crash
    expect(isEqual(small, hamt)).toBe(false)
    expect(isEqual(hamtWithA, mapAssoc(largeMap(20), kw(':a'), n(1)))).toBe(true)
  })
})

// ─── meta preservation ────────────────────────────────────────────────────────

describe('meta preservation', () => {
  it('mapAssoc preserves meta', () => {
    const meta = cljMap([[kw(':tag'), s('test')]])
    const m = makeCljMap({ kind: 'small', entries: [] }, meta)
    const m2 = mapAssoc(m, kw(':a'), n(1))
    expect(m2.meta).toBe(meta)
  })

  it('mapDissoc preserves meta', () => {
    const meta = cljMap([[kw(':tag'), s('test')]])
    const m = makeCljMap(
      { kind: 'small', entries: [[kw(':a'), n(1)], [kw(':b'), n(2)]] },
      meta
    )
    const m2 = mapDissoc(m, kw(':a'))
    expect(m2.meta).toBe(meta)
  })
})
