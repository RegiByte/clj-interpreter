import type {
  CljCons,
  CljKeyword,
  CljLazySeq,
  CljList,
  CljMap,
  CljRecord,
  CljSet,
  CljValue,
  CljVector,
} from '../types.ts'
import { identityHash } from './identity-hash.ts'
import { hamtEntries, type HamtNode } from './hamt-kernel.ts'

// ─── seeds and fixed hash constants ─────────────────────────────────────────

const KEYWORD_SEED = 0x9e3779b9
const SYMBOL_SEED = 0x517cc1b7
const CHAR_SEED = 0x3713
const REDUCED_SEED = 0xdeadbeef | 0 // ToInt32: -559038737

const HASH_NIL = 0
const HASH_TRUE = 0x42108421 // matching JVM Clojure
const HASH_FALSE = 0x42108420

// ─── mix helpers ────────────────────────────────────────────────────────────

// 2-round avalanche: used to finalize XOR-accumulation (maps, sets)
function mix2(h: number): number {
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 16
  return h
}

// 3-round MurmurHash3 finalization: used for strings, keywords, symbols, chars, records
function mix3(h: number): number {
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h
}

// ─── per-type hash helpers ───────────────────────────────────────────────────

export function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return mix3(h)
}

function hashNumber(n: number): number {
  // Integers in signed 32-bit range: return the integer bits directly
  if (Number.isInteger(n) && n >= -2147483648 && n <= 2147483647) {
    return n | 0
  }
  // Floats (and large integers): XOR the two 32-bit halves of the IEEE 754 bits
  const buf = new ArrayBuffer(8)
  new Float64Array(buf)[0] = n
  const view = new Int32Array(buf)
  return view[0] ^ view[1]
}

// Both CljList and CljVector call this. Do not include kind in the seed
// so that equal sequences of any type hash identically (Clojure cross-type seq equality).
function hashSequential(items: CljValue[]): number {
  let h = 1
  for (const item of items) {
    h = (Math.imul(31, h) + hashCljValue(item)) | 0
  }
  return h
}

// Order-independent: XOR of per-pair hashes. Pairs mix key and value before XOR-ing
// so that (:a 1) and (:b 1) contribute different pair hashes.
function hashMapEntries(entries: [CljValue, CljValue][]): number {
  let h = 0
  for (const [k, v] of entries) {
    const pairHash = (Math.imul(hashCljValue(k), 0x9e3779b9) ^ hashCljValue(v)) | 0
    h ^= pairHash
  }
  return mix2(h)
}

// Order-independent: XOR of element hashes.
function hashSetValues(values: CljValue[]): number {
  let h = 0
  for (const v of values) {
    h ^= hashCljValue(v)
  }
  return mix2(h)
}

// Local lazy-seq realizer — must not import transformations.ts to avoid circular deps.
function realizeLazySeqLocal(ls: CljLazySeq): CljValue {
  let current: CljValue = ls
  while (current.kind === 'lazy-seq') {
    const lazy = current as CljLazySeq
    if (lazy.realized) {
      current = lazy.value!
    } else if (lazy.thunk) {
      lazy.value = lazy.thunk()
      lazy.thunk = null
      lazy.realized = true
      current = lazy.value!
    } else {
      return { kind: 'nil', value: null }
    }
  }
  return current
}

// Traverses a cons chain to a flat array, following list/vector tails and lazy-seq tails.
function hashCons(cons: CljCons): number {
  const items: CljValue[] = []
  let cur: CljValue = cons
  while (true) {
    if (cur.kind === 'nil') break
    if (cur.kind === 'cons') {
      items.push((cur as CljCons).head)
      cur = (cur as CljCons).tail
      continue
    }
    if (cur.kind === 'list' || cur.kind === 'vector') {
      items.push(...(cur as CljList | CljVector).value)
      break
    }
    if (cur.kind === 'lazy-seq') {
      cur = realizeLazySeqLocal(cur as CljLazySeq)
      continue
    }
    break // non-sequential tail — truncate (best effort)
  }
  return hashSequential(items)
}

// Field order is canonical for records (positional equality), so use a rolling hash.
// Type identity (ns + recordType) is included so records never collide with plain maps.
function hashRecord(rec: CljRecord): number {
  const typeHash = hashString(rec.ns + '/' + rec.recordType)
  let h = typeHash
  for (const [k, v] of rec.fields) {
    h = (Math.imul(31, h) + (hashCljValue(k) ^ hashCljValue(v))) | 0
  }
  return mix3(h)
}

// ─── public API ──────────────────────────────────────────────────────────────

export function hashCljValue(v: CljValue): number {
  switch (v.kind) {
    // ── primitives ──────────────────────────────────────────────────────────
    case 'nil':
      return HASH_NIL
    case 'boolean':
      return v.value ? HASH_TRUE : HASH_FALSE
    case 'number':
      return hashNumber(v.value)
    case 'string':
      return hashString(v.value)
    // Separate chars from numbers and strings with the same code point / content.
    case 'character':
      return mix3(v.value.charCodeAt(0) ^ CHAR_SEED)
    // Keyword and symbol must not collide for the same name string.
    case 'keyword': {
      // Cache on first call — keywords are immutable and reused constantly.
      const kw = v as CljKeyword & { _hashCode?: number }
      if (kw._hashCode !== undefined) return kw._hashCode
      const h = mix3(hashString(v.name) ^ KEYWORD_SEED)
      kw._hashCode = h
      return h
    }
    case 'symbol':
      return mix3(hashString(v.name) ^ SYMBOL_SEED) // v.meta intentionally ignored

    // ── sequential — must all use hashSequential so cross-type equality holds ──
    case 'list':
      return hashSequential(v.value) // v.meta intentionally ignored
    case 'vector':
      return hashSequential(v.value) // v.meta intentionally ignored
    case 'cons':
      return hashCons(v)
    case 'lazy-seq':
      return hashCljValue(realizeLazySeqLocal(v))

    // ── maps and sets ────────────────────────────────────────────────────────
    case 'map': {
      // Inline _data access like the set case — avoids the .entries getter.
      const data = (v as CljMap)._data
      const entries: [CljValue, CljValue][] =
        data.kind === 'small'
          ? data.entries
          : hamtEntries(data.root as HamtNode<CljValue, CljValue>)
      return hashMapEntries(entries) // v.meta intentionally ignored
    }
    case 'set': {
      // hash.ts cannot import map-helpers (it would be circular), so we inline
      // the key extraction directly from the backing CljMap's _data.
      const data = (v as CljSet)._map._data
      const keys: CljValue[] =
        data.kind === 'small'
          ? data.entries.map(([k]) => k)
          : hamtEntries(data.root as HamtNode<CljValue, CljValue>).map(([k]) => k)
      return hashSetValues(keys)
    }

    // ── records ──────────────────────────────────────────────────────────────
    case 'record':
      return hashRecord(v)

    // ── structural wrappers where equality is structural ─────────────────────
    // isEqual(reduced(a), reduced(b)) === isEqual(a, b), so hash must depend on content.
    case 'reduced':
      return mix3(hashCljValue(v.value) ^ REDUCED_SEED)

    // ── reference / identity types ───────────────────────────────────────────
    // All types below use reference equality or have no equality handler.
    // identityHash gives a stable integer per object without structural traversal.
    case 'atom':
      return identityHash(v)
    case 'var':
      return identityHash(v)
    case 'function':
      return identityHash(v)
    case 'native-function':
      return identityHash(v)
    case 'macro':
      return identityHash(v)
    case 'namespace':
      return identityHash(v)
    case 'delay':
      return identityHash(v)
    case 'pending':
      return identityHash(v)
    case 'js-value':
      return identityHash(v) // hash the wrapper object, not v.value (which may be a primitive)
    case 'multi-method':
      return identityHash(v)
    case 'protocol':
      return identityHash(v)
    case 'volatile':
      return identityHash(v)
    case 'regex':
      return identityHash(v)
  }
}
