// Structural equality for CljValue.
// Extracted from assertions.ts to break the circular import:
//   map-helpers.ts → isEqual(equality.ts) → map-helpers.ts  ← cycle
// equality.ts imports hamt-kernel.ts and hash.ts directly for HAMT-aware map
// comparison; it does NOT import map-helpers.ts.
//
// assertions.ts re-exports isEqual from here so all existing call sites are
// unchanged.

import {
  type CljAtom,
  type CljBoolean,
  type CljChar,
  type CljCons,
  type CljDelay,
  type CljKeyword,
  type CljLazySeq,
  type CljList,
  type CljMap,
  type CljNamespace,
  type CljNumber,
  type CljReduced,
  type CljRecord,
  type CljRegex,
  type CljSet,
  type CljString,
  type CljSymbol,
  type CljValue,
  type CljVar,
  type CljVector,
  type CljVolatile,
} from '../types.ts'
import { valueKeywords } from '../keywords.ts'
import { _injectIsEqual, mapContains, mapCount, mapEntries, mapGet, NOT_FOUND, setValues } from './map-helpers'

// ─── lazy-seq realizer (local copy — avoids importing transformations.ts) ────

/** Realize a lazy-seq for equality comparison (trampoline to handle chains). */
function realizeLazySeqForEquality(ls: CljLazySeq): CljValue {
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

/** Convert any sequential value to a flat JS array for equality. Returns null
 *  for non-sequential values. Will not terminate on infinite lazy sequences
 *  (matches Clojure semantics). */
function seqToArrayForEquality(value: CljValue): CljValue[] | null {
  if (value.kind === 'nil') return []
  if (value.kind === 'list' || value.kind === 'vector') {
    return (value as CljList | CljVector).value
  }
  if (value.kind === 'lazy-seq') {
    const realized = realizeLazySeqForEquality(value as CljLazySeq)
    return seqToArrayForEquality(realized)
  }
  if (value.kind === 'cons') {
    const result: CljValue[] = []
    let current: CljValue = value
    while (true) {
      if (current.kind === 'nil') break
      if (current.kind === 'cons') {
        result.push((current as CljCons).head)
        current = (current as CljCons).tail
        continue
      }
      if (current.kind === 'lazy-seq') {
        current = realizeLazySeqForEquality(current as CljLazySeq)
        continue
      }
      if (current.kind === 'list' || current.kind === 'vector') {
        result.push(...(current as CljList | CljVector).value)
        break
      }
      return null
    }
    return result
  }
  return null
}

// ─── equality handlers ───────────────────────────────────────────────────────

const equalityHandlers = {
  [valueKeywords.number]: (a: CljNumber, b: CljNumber) => a.value === b.value,
  [valueKeywords.string]: (a: CljString, b: CljString) => a.value === b.value,
  [valueKeywords.character]: (a: CljChar, b: CljChar) => a.value === b.value,
  [valueKeywords.boolean]: (a: CljBoolean, b: CljBoolean) =>
    a.value === b.value,
  [valueKeywords.nil]: () => true,
  [valueKeywords.symbol]: (a: CljSymbol, b: CljSymbol) => a.name === b.name,
  [valueKeywords.keyword]: (a: CljKeyword, b: CljKeyword) => a.name === b.name,
  [valueKeywords.vector]: (a: CljVector, b: CljVector) => {
    if (a.value.length !== b.value.length) return false
    return a.value.every((value, index) => isEqual(value, b.value[index]))
  },
  [valueKeywords.map]: (a: CljMap, b: CljMap) => {
    const aCount = mapCount(a)
    if (aCount !== mapCount(b)) return false
    for (const [k, av] of mapEntries(a)) {
      const bv = mapGet(b, k)
      if (bv === NOT_FOUND) return false
      if (!isEqual(av, bv)) return false
    }
    return true
  },
  [valueKeywords.list]: (a: CljList, b: CljList) => {
    if (a.value.length !== b.value.length) return false
    return a.value.every((value, index) => isEqual(value, b.value[index]))
  },
  [valueKeywords.atom]: (a: CljAtom, b: CljAtom) => a === b,
  [valueKeywords.reduced]: (a: CljReduced, b: CljReduced) =>
    isEqual(a.value, b.value),
  [valueKeywords.volatile]: (a: CljVolatile, b: CljVolatile) => a === b,
  [valueKeywords.regex]: (a: CljRegex, b: CljRegex) => a === b,
  [valueKeywords.var]: (a: CljVar, b: CljVar) => a === b,
  [valueKeywords.set]: (a: CljSet, b: CljSet) => {
    if (mapCount(a._map) !== mapCount(b._map)) return false
    return setValues(a).every((av) => mapContains(b._map, av))
  },
  [valueKeywords.delay]: (a: CljDelay, b: CljDelay) => a === b,
  [valueKeywords.lazySeq]: (a: CljLazySeq, b: CljLazySeq) => {
    const aVal = realizeLazySeqForEquality(a)
    const bVal = realizeLazySeqForEquality(b)
    return isEqual(aVal, bVal)
  },
  [valueKeywords.cons]: (a: CljCons, b: CljCons) =>
    isEqual(a.head, b.head) && isEqual(a.tail, b.tail),
  [valueKeywords.namespace]: (a: CljNamespace, b: CljNamespace) => a === b,
  [valueKeywords.record]: (a: CljRecord, b: CljRecord) => {
    if (a.ns !== b.ns || a.recordType !== b.recordType) return false
    if (a.fields.length !== b.fields.length) return false
    return a.fields.every(([k, av], i) => {
      const [bk, bv] = b.fields[i]
      return isEqual(k, bk) && isEqual(av, bv)
    })
  },
}

// ─── isEqual ─────────────────────────────────────────────────────────────────

export const isEqual = (a: CljValue, b: CljValue): boolean => {
  if (a.kind === 'lazy-seq') {
    return isEqual(realizeLazySeqForEquality(a as CljLazySeq), b)
  }
  if (b.kind === 'lazy-seq') {
    return isEqual(a, realizeLazySeqForEquality(b as CljLazySeq))
  }

  // Cross-type sequential equality: lists, vectors, cons cells all compare as
  // ordered sequences. (= [1 2 3] '(1 2 3)) => true
  const aIsSeq = a.kind === 'list' || a.kind === 'vector' || a.kind === 'cons'
  const bIsSeq = b.kind === 'list' || b.kind === 'vector' || b.kind === 'cons'
  if (aIsSeq && bIsSeq) {
    const aArr = seqToArrayForEquality(a)
    const bArr = seqToArrayForEquality(b)
    if (aArr === null || bArr === null) return false
    if (aArr.length !== bArr.length) return false
    return aArr.every((av, i) => isEqual(av, bArr![i]))
  }

  if (a.kind !== b.kind) return false

  const handler = equalityHandlers[a.kind as keyof typeof equalityHandlers]
  if (!handler) return false
  return handler(a as never, b as never)
}

// Wire isEqual into map-helpers so it can compare CljValue map keys.
// map-helpers.ts initializes before this module (it is our dependency),
// so _injectIsEqual is defined by the time we reach this line.
_injectIsEqual(isEqual)
