// Public internal API for CljVector operations.
// All production code that reads or builds vectors should go through these helpers
// rather than touching .value directly on the hot path — .value is a compatibility
// getter that materializes the trie rep to a flat array on every call.
//
// Import graph (acyclic — gotchas.md #12):
//   vector-kernel  → types                              (CljValue + TrieVectorData, type-only)
//   vector-helpers → types, vector-kernel, hash         (no equality, no factories)
//   factories      → vector-helpers  (one-way; imports makeCljVector, cljVector)
//   equality       → vector-helpers  (one-way; reads _data, uses vectorCount/Nth)
//
// Unlike map-helpers, NO isEqual injection is needed: vectors are positional, so
// no operation here ever needs key/element equality (vectorAssoc is by index).

import type {
  CljMap,
  CljValue,
  CljVector,
  CljVectorData,
} from '../types'
import { hashConj } from './hash'
import {
  trieAssoc,
  trieConj,
  trieFromArray,
  triePop,
  trieNth,
  trieToArray,
} from './vector-kernel'

// One tail's worth: vectors of ≤32 elements stay a flat array (zero overhead,
// identical to the old behavior); larger vectors use the trie. Promotion happens
// when a conj would push an array-rep vector past 32; demotion when a pop brings a
// trie-rep vector back down to ≤32.
export const VECTOR_THRESHOLD = 32

// ─── CljVector prototype (carries the `value` compatibility getter) ───────────

// Every CljVector instance is created via Object.create(CljVectorPrototype) so the
// getter is always present. Plain object literals / object-spread must never be
// used to build a CljVector — spreading strips this prototype getter (the exact
// bug class CljMap's `entries` getter taught us; see cljWithMeta + registry clone).
export const CljVectorPrototype: object = Object.create(Object.prototype)
Object.defineProperty(CljVectorPrototype, 'value', {
  get(this: CljVector): CljValue[] {
    const data = this._data
    // Array rep returns its live items array directly (O(1), no defensive copy —
    // gotchas.md #1 verified nothing mutates a returned .value in place). Trie rep
    // materializes on demand (O(n)) — this is the cost the hot-path migration removes.
    return data.kind === 'array' ? data.items : trieToArray(data)
  },
  enumerable: false,
  configurable: false,
})

// ─── CljVector constructors ───────────────────────────────────────────────────

/** The single place CljVector objects are created. Ensures the `value` getter
 *  exists and carries meta + the map-entry marker. */
export function makeCljVector(
  data: CljVectorData,
  meta?: CljMap,
  isMapEntry?: boolean
): CljVector {
  const vec: CljVector = Object.create(CljVectorPrototype)
  vec.kind = 'vector' as const
  vec._data = data
  if (meta !== undefined) vec.meta = meta
  if (isMapEntry) vec.__cljamMapEntry = true
  return vec
}

/** Build a CljVector from a flat array. Array rep for ≤32, trie for larger
 *  (bulk O(n) build via trieFromArray — the preferred path for vec/into). */
export function cljVector(items: CljValue[]): CljVector {
  if (items.length <= VECTOR_THRESHOLD) {
    return makeCljVector({ kind: 'array', items })
  }
  return makeCljVector(trieFromArray(items))
}

// ─── Read accessors ───────────────────────────────────────────────────────────

export function vectorCount(v: CljVector): number {
  const d = v._data
  return d.kind === 'array' ? d.items.length : d.count
}

/** Indexed read. Faithfully reproduces the old `coll.value[i]` semantics:
 *  out-of-bounds yields `undefined` (NOT a throw). The seq layer owns Clojure's
 *  throw-vs-nil bounds policy on top, exactly as it did when vectors were flat
 *  arrays (gotchas.md #11). The kernel's trieNth throws on OOB, so we bounds-check
 *  before calling it to preserve the array rep's lenient behavior. */
export function vectorNth(v: CljVector, i: number): CljValue {
  const d = v._data
  if (d.kind === 'array') return d.items[i]
  return i >= 0 && i < d.count
    ? trieNth(d, i)
    : (undefined as unknown as CljValue)
}

/** Last element, O(1). Matches the old `coll.value[length-1]` (undefined on empty). */
export function vectorPeek(v: CljVector): CljValue {
  const d = v._data
  if (d.kind === 'array') {
    return d.items.length === 0
      ? (undefined as unknown as CljValue)
      : d.items[d.items.length - 1]
  }
  // Trie rep always has a non-empty tail, and the last element is its tail end.
  return d.tail[d.tail.length - 1]
}

/** Materialize to a flat array. Array rep returns its live items (O(1), no copy);
 *  trie rep materializes (O(n)). Use when you genuinely need every element as a JS
 *  array — the honest explicit form of reaching `.value`. */
export function vectorToArray(v: CljVector): CljValue[] {
  const d = v._data
  return d.kind === 'array' ? d.items : trieToArray(d)
}

/** `coll.value.slice(start, end)` drop-in — returns a plain JS array slice. */
export function vectorSlice(v: CljVector, start?: number, end?: number): CljValue[] {
  return vectorToArray(v).slice(start, end)
}

// A streaming `vectorIterator` (chunked leaf-walk that never materializes the full
// array) was deliberately dropped: until that chunked walk exists it would only
// `yield* trieToArray(d)` — identical cost to vectorToArray with extra generator
// overhead and no caller. Reintroduce it *with* the chunked implementation when the
// lazy-seq arc needs it (gotchas.md #8).

// ─── Update accessors (structural sharing + hash maintenance) ─────────────────

/** Append one element, handling array→trie promotion and incremental hashing. */
function conjOne(data: CljVectorData, x: CljValue): CljVectorData {
  if (data.kind === 'array') {
    if (data.items.length < VECTOR_THRESHOLD) {
      return { kind: 'array', items: [...data.items, x] }
    }
    // Array is full (exactly 32) — promote to a trie and append. The 32 items land
    // in the new trie's tail; trieConj then pushes them as a leaf and starts a
    // fresh tail with x. The promoted trie carries no cached _hash (lazy).
    return trieConj(trieFromArray(data.items), x)
  }
  const next = trieConj(data, x)
  // Maintain the cached hash incrementally — but ONLY if the source already had
  // one. The build-by-conj hot loop never asks for a hash, so _hash stays
  // undefined throughout and the loop pays zero hashing cost (hash-equality-strategy.md).
  if (data._hash !== undefined) next._hash = hashConj(data._hash, x)
  return next
}

export function vectorConj(v: CljVector, ...xs: CljValue[]): CljVector {
  if (xs.length === 0) return v
  let data = v._data
  for (const x of xs) data = conjOne(data, x)
  // Derived vector: carry meta (Clojure preserves vector metadata across conj),
  // drop the map-entry marker (a conj'd map entry is a plain vector, not a 2-tuple).
  return makeCljVector(data, v.meta)
}

/** Update at index. assoc-at-end (i === count) appends, as Clojure allows.
 *  Invalidates the cached hash — a positional change recomputes lazily, which is
 *  simpler and less error-prone than subtracting a positional contribution
 *  (hash-equality-strategy.md Part 1). */
export function vectorAssoc(v: CljVector, i: number, x: CljValue): CljVector {
  const d = v._data
  if (d.kind === 'array') {
    if (i === d.items.length) return vectorConj(v, x)
    const items = d.items.slice()
    items[i] = x
    return makeCljVector({ kind: 'array', items }, v.meta)
  }
  // trieAssoc returns a fresh node with no _hash set → the cache is invalidated by
  // construction (no explicit clear needed).
  return makeCljVector(trieAssoc(d, i, x), v.meta)
}

/** Remove the last element, handling trie→array demotion. Invalidates the hash. */
export function vectorPop(v: CljVector): CljVector {
  const d = v._data
  if (d.kind === 'array') {
    // Faithful to the old `coll.value.slice(0, -1)` — empty stays empty (no throw).
    return makeCljVector({ kind: 'array', items: d.items.slice(0, -1) }, v.meta)
  }
  const next = triePop(d)
  // Demote back to the array rep once at/under the threshold so small vectors never
  // carry trie + materialization overhead and .value stays O(1) for them (mirrors
  // mapDissoc's HAMT→small demotion; gotchas.md #7).
  if (next.count <= VECTOR_THRESHOLD) {
    return makeCljVector({ kind: 'array', items: trieToArray(next) }, v.meta)
  }
  return makeCljVector(next, v.meta)
}

// ─── Hash ──────────────────────────────────────────────────────────────────
// vectorHash (cached-or-compute) lives in hash.ts next to hashSequential/hashConj
// — keeping the recurrence and its cache together, and avoiding a hash ↔ helpers
// import cycle. Re-exported here so callers have one consistent helper surface.
// This layer still OWNS the _hash lifecycle: conjOne maintains it incrementally;
// vectorAssoc/vectorPop invalidate it (by handing back kernel data with no _hash).
export { vectorHash } from './hash'
