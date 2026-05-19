// Public internal API for CljMap operations.
// All production code that reads or mutates maps should go through these
// helpers rather than touching .entries directly on the hot path.
//
// Import graph (acyclic):
//   map-helpers → types, hash, hamt-kernel          (no equality, no factories)
//   equality    → map-helpers  (one-way)
//   factories   → map-helpers  (one-way; imports makeCljMap, cljMap)
//
// Key-equality is injected by equality.ts at module init (see _injectIsEqual).
// This avoids the map-helpers ↔ equality cycle: map-helpers loads first (it is
// a dependency of equality.ts), then equality.ts calls _injectIsEqual(isEqual).

import type { CljMap, CljMapData, CljSet, CljValue, HamtMapData, SmallMapData } from '../types'
import { hashCljValue } from './hash'
import {
  EMPTY_NODE,
  NOT_FOUND,
  hamtAssoc,
  hamtCount,
  hamtDissoc,
  hamtEntries,
  hamtGet,
  type HamtNode,
} from './hamt-kernel'

export { NOT_FOUND }

export const SMALL_MAP_THRESHOLD = 8

// ─── isEqual injection (breaks equality ↔ map-helpers cycle) ─────────────────

// Initialized to a trivial fallback; equality.ts overwrites this immediately
// after it defines isEqual (before any map operations run in practice).
let _isEqual: (a: CljValue, b: CljValue) => boolean = (a, b) => a === b

/** Called by equality.ts at module init to wire in structural equality. */
export function _injectIsEqual(fn: (a: CljValue, b: CljValue) => boolean): void {
  _isEqual = fn
}

// ─── HAMT ops ─────────────────────────────────────────────────────────────────

const CLJ_MAP_OPS = {
  hash: hashCljValue,
  equal: (a: CljValue, b: CljValue) => _isEqual(a, b),
}

// ─── CljMap prototype (carries the entries compatibility getter) ──────────────

// Every CljMap instance is created via Object.create(CljMapPrototype) so the
// getter is always present. Plain object literals must never be used for CljMap.
export const CljMapPrototype: object = Object.create(Object.prototype)
Object.defineProperty(CljMapPrototype, 'entries', {
  get(this: CljMap): [CljValue, CljValue][] {
    const data = this._data
    if (data.kind === 'small') return data.entries
    return hamtEntries(data.root as HamtNode<CljValue, CljValue>)
  },
  enumerable: false,
  configurable: false,
})

// ─── CljMap constructors ──────────────────────────────────────────────────────

/** The single place CljMap objects are created. Ensures the entries getter exists. */
export function makeCljMap(data: CljMapData, meta?: CljMap): CljMap {
  const m: CljMap = Object.create(CljMapPrototype)
  m.kind = 'map' as const
  m._data = data
  if (meta !== undefined) m.meta = meta
  return m
}

function buildHamtFromEntries(entries: [CljValue, CljValue][]): HamtMapData {
  let root: HamtNode<CljValue, CljValue> = EMPTY_NODE
  for (const [k, v] of entries) {
    root = hamtAssoc(CLJ_MAP_OPS, root, hashCljValue(k), k, v)
  }
  return { kind: 'hamt', root, size: hamtCount(root) }
}

/** Last-write-wins deduplication for small-map construction. O(n²) but n ≤ 8. */
function deduplicateEntries(entries: [CljValue, CljValue][]): [CljValue, CljValue][] {
  const seen: CljValue[] = []
  const result: [CljValue, CljValue][] = []
  for (let i = entries.length - 1; i >= 0; i--) {
    const [k, v] = entries[i]
    if (!seen.some((sk) => _isEqual(sk, k))) {
      seen.push(k)
      result.unshift([k, v])
    }
  }
  return result
}

/** Build a CljMap from a flat entries array. SmallMapData for ≤8, HAMT for larger. */
export function cljMap(entries: [CljValue, CljValue][]): CljMap {
  if (entries.length === 0) return makeCljMap({ kind: 'small', entries: [] })
  if (entries.length <= SMALL_MAP_THRESHOLD) {
    return makeCljMap({ kind: 'small', entries: deduplicateEntries(entries) })
  }
  return makeCljMap(buildHamtFromEntries(entries))
}

// ─── Public map helpers ───────────────────────────────────────────────────────

export function mapCount(m: CljMap): number {
  const d = m._data
  if (d.kind === 'small') return d.entries.length
  return d.size
}

export function mapGet(m: CljMap, k: CljValue): CljValue | typeof NOT_FOUND {
  const d = m._data
  if (d.kind === 'small') {
    for (const [ek, ev] of d.entries) {
      if (_isEqual(ek, k)) return ev
    }
    return NOT_FOUND
  }
  return hamtGet(
    CLJ_MAP_OPS,
    d.root as HamtNode<CljValue, CljValue>,
    hashCljValue(k),
    k
  )
}

export function mapContains(m: CljMap, k: CljValue): boolean {
  return mapGet(m, k) !== NOT_FOUND
}

export function mapEntries(m: CljMap): [CljValue, CljValue][] {
  const d = m._data
  if (d.kind === 'small') return d.entries
  return hamtEntries(d.root as HamtNode<CljValue, CljValue>)
}

export function mapAssoc(m: CljMap, k: CljValue, v: CljValue): CljMap {
  const d = m._data
  if (d.kind === 'small') {
    const existing = d.entries
    for (let i = 0; i < existing.length; i++) {
      if (_isEqual(existing[i][0], k)) {
        if (existing[i][1] === v) return m
        const newEntries = existing.slice() as [CljValue, CljValue][]
        newEntries[i] = [k, v]
        return makeCljMap({ kind: 'small', entries: newEntries } as SmallMapData, m.meta)
      }
    }
    const newEntries = [...existing, [k, v]] as [CljValue, CljValue][]
    if (newEntries.length > SMALL_MAP_THRESHOLD) {
      return makeCljMap(buildHamtFromEntries(newEntries), m.meta)
    }
    return makeCljMap({ kind: 'small', entries: newEntries } as SmallMapData, m.meta)
  }
  const root = d.root as HamtNode<CljValue, CljValue>
  const newRoot = hamtAssoc(CLJ_MAP_OPS, root, hashCljValue(k), k, v)
  if (newRoot === root) return m
  return makeCljMap(
    { kind: 'hamt', root: newRoot, size: hamtCount(newRoot) } as HamtMapData,
    m.meta
  )
}

export function mapDissoc(m: CljMap, k: CljValue): CljMap {
  const d = m._data
  if (d.kind === 'small') {
    const existing = d.entries
    for (let i = 0; i < existing.length; i++) {
      if (_isEqual(existing[i][0], k)) {
        const newEntries = existing
          .slice(0, i)
          .concat(existing.slice(i + 1)) as [CljValue, CljValue][]
        return makeCljMap({ kind: 'small', entries: newEntries } as SmallMapData, m.meta)
      }
    }
    return m
  }
  const root = d.root as HamtNode<CljValue, CljValue>
  const newRoot = hamtDissoc(CLJ_MAP_OPS, root, hashCljValue(k), k)
  if (newRoot === root) return m
  const newSize = hamtCount(newRoot)
  if (newSize <= SMALL_MAP_THRESHOLD) {
    const entries = hamtEntries(newRoot as HamtNode<CljValue, CljValue>)
    return makeCljMap({ kind: 'small', entries } as SmallMapData, m.meta)
  }
  return makeCljMap(
    { kind: 'hamt', root: newRoot, size: newSize } as HamtMapData,
    m.meta
  )
}

/** Merge other into base — last-write-wins on duplicate keys. */
export function mapMerge(base: CljMap, other: CljMap): CljMap {
  let result = base
  for (const [k, v] of mapEntries(other)) {
    result = mapAssoc(result, k, v)
  }
  return result
}

// ─── CljSet helpers ───────────────────────────────────────────────────────────

/**
 * Sentinel value stored as the "value" for every key in a set's backing CljMap.
 * The identity of this object does not matter — mapContains checks key presence.
 */
export const SET_PRESENT: CljValue = { kind: 'boolean', value: true } as const

function makeSetObj(map: CljMap, meta?: CljMap): CljSet {
  const s: CljSet = { kind: 'set', _map: map }
  if (meta !== undefined) s.meta = meta
  return s
}

/** The sole constructor for CljSet. Deduplication is handled by the backing CljMap. */
export function makeCljSet(values: CljValue[]): CljSet {
  const entries = values.map((v) => [v, SET_PRESENT] as [CljValue, CljValue])
  return makeSetObj(cljMap(entries))
}

/** Returns the number of members in the set. */
export function setCount(s: CljSet): number {
  return mapCount(s._map)
}

/** Returns the set's members as an array. Insertion order is preserved for small sets (≤8). */
export function setValues(s: CljSet): CljValue[] {
  return mapEntries(s._map).map(([k]) => k)
}

/** Returns true if v is a member of set s. */
export function setContains(s: CljSet, v: CljValue): boolean {
  return mapContains(s._map, v)
}

/** Returns a new set with v added. Returns the same set if v is already a member. */
export function setConj(s: CljSet, v: CljValue): CljSet {
  const newMap = mapAssoc(s._map, v, SET_PRESENT)
  if (newMap === s._map) return s
  return makeSetObj(newMap, s.meta)
}

/** Returns a new set with v removed. Returns the same set if v is not a member. */
export function setDisj(s: CljSet, v: CljValue): CljSet {
  const newMap = mapDissoc(s._map, v)
  if (newMap === s._map) return s
  return makeSetObj(newMap, s.meta)
}
