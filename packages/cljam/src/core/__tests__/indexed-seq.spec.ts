import { describe, expect, it } from 'vitest'
import { v } from '../factories'
import { is } from '../assertions'
import { consToArray, toSeq } from '../transformations'
import { isEqual } from '../persistent/equality'
import { hashCljValue } from '../persistent/hash'
import { printString } from '../printer'
import type { CljIndexedSeq, CljValue } from '../types'

// Phase A is INERT: nothing in the runtime produces or consumes an indexed-seq
// yet (that is Phases B/C). So these tests exercise the view in isolation —
// the factory's empty→nil invariant, the predicate, and the seq-protocol
// contract expressed as pure equations on the {array, offset} structure. Those
// equations are the executable oracle Phase C implements its O(1) fast-paths
// against (see indexed-seq-design.md, "Seq-protocol contract").

const nums = (...ns: number[]): CljValue[] => ns.map((n) => v.number(n))

// A view is guaranteed non-empty by the factory invariant, so casting the
// factory result to CljIndexedSeq after asserting `is.indexedSeq` is sound.
const view = (array: CljValue[], offset = 0): CljIndexedSeq => {
  const result = v.indexedSeq(array, offset)
  if (!is.indexedSeq(result)) {
    throw new Error('expected a non-empty indexed-seq for this fixture')
  }
  return result
}

describe('indexedSeq factory — empty→nil invariant (a seq is never empty)', () => {
  it('an empty backing array yields nil, not an empty view', () => {
    expect(is.nil(v.indexedSeq([], 0))).toBe(true)
  })

  it('an offset at the array length yields nil (exhausted view)', () => {
    expect(is.nil(v.indexedSeq(nums(1, 2, 3), 3))).toBe(true)
  })

  it('an offset past the array length yields nil', () => {
    expect(is.nil(v.indexedSeq(nums(1, 2, 3), 5))).toBe(true)
  })

  it('an in-bounds offset yields an indexed-seq with that offset', () => {
    const s = v.indexedSeq(nums(1, 2, 3), 1)
    expect(is.indexedSeq(s)).toBe(true)
    expect((s as CljIndexedSeq).offset).toBe(1)
    expect((s as CljIndexedSeq).kind).toBe('indexed-seq')
  })

  it('defaults offset to 0', () => {
    expect((view(nums(1, 2, 3)) as CljIndexedSeq).offset).toBe(0)
  })
})

describe('is.indexedSeq predicate', () => {
  it('is true for an indexed-seq view', () => {
    expect(is.indexedSeq(view(nums(1, 2, 3)))).toBe(true)
  })

  it('is false for other seq-ish values (list / cons / nil / vector)', () => {
    expect(is.indexedSeq(v.list(nums(1, 2, 3)))).toBe(false)
    expect(is.indexedSeq(v.cons(v.number(1), v.list(nums(2, 3))))).toBe(false)
    expect(is.indexedSeq(v.nil())).toBe(false)
    expect(is.indexedSeq(v.vector(nums(1, 2, 3)))).toBe(false)
  })

  it('counts as seqable + a collection but is NOT a list (Phase B wiring)', () => {
    // Phase A asserted these were all false (the inertness guarantee). Phase B
    // turns the seq-family predicates on: an indexed-seq is now seqable and a
    // collection (coll? parity — a realized seq is a collection, like cons), but
    // it is still not a `list?` (that stays kind-exact).
    const s = view(nums(1, 2, 3))
    expect(is.seqable(s)).toBe(true)
    expect(is.collection(s)).toBe(true)
    expect(is.list(s)).toBe(false)
  })
})

describe('seq-protocol contract as pure equations (the Phase C oracle)', () => {
  const array = nums(10, 20, 30, 40)

  it('first = array[offset], across every valid offset', () => {
    for (let offset = 0; offset < array.length; offset++) {
      const s = view(array, offset)
      expect(s.array[s.offset]).toBe(array[offset])
    }
  })

  it('count = array.length - offset, across every valid offset', () => {
    for (let offset = 0; offset < array.length; offset++) {
      const s = view(array, offset)
      expect(s.array.length - s.offset).toBe(array.length - offset)
    }
  })

  it('nth i = array[offset + i] for in-bounds i', () => {
    const s = view(array, 1) // [20 30 40]
    expect(s.array[s.offset + 0]).toBe(array[1])
    expect(s.array[s.offset + 1]).toBe(array[2])
    expect(s.array[s.offset + 2]).toBe(array[3])
  })

  it('toSeq = array.slice(offset) round-trips the remaining elements', () => {
    const s = view(array, 2)
    expect(s.array.slice(s.offset)).toEqual(array.slice(2))
  })
})

describe('advancing a view (next-like termination via the factory)', () => {
  // rest→() vs next→nil is a Phase C producer concern (seq.ts). At the FACTORY
  // level there is only one normalization: empty→nil. So advancing offset+1
  // through the factory walks to nil — the next-like behavior. The rest→()
  // distinction is layered on top in Phase C and tested there.
  it('walks offset+1 to nil at the end of the view', () => {
    const array = nums(1, 2)
    let cur: CljValue = view(array, 0)
    const seen: CljValue[] = []
    while (is.indexedSeq(cur)) {
      seen.push(cur.array[cur.offset])
      cur = v.indexedSeq(cur.array, cur.offset + 1)
    }
    expect(seen).toEqual(array)
    expect(is.nil(cur)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Phase B — consumer readiness (NOT inert; proves the world tolerates an
// indexed-seq BEFORE any producer flips in Phase C). The full .clj suite cannot
// exercise these paths because nothing produces an indexed-seq yet, so these
// hand-constructed views ARE the regression net for the Phase B consumer wiring.
// Each test targets the actual consumer function the matching stdlib op delegates
// to: reduce/map/count → toSeq; = → isEqual; hash/set-membership → hashCljValue;
// pr-str → printString; cons-tail walking → consToArray.
// ─────────────────────────────────────────────────────────────────────────────
describe('Phase B consumer readiness — funnel (toSeq / consToArray)', () => {
  it('toSeq realizes the view from its offset (the reduce/map/count funnel)', () => {
    expect(toSeq(view(nums(10, 20, 30, 40), 1))).toEqual(nums(20, 30, 40))
  })

  it('toSeq of an offset-0 view returns the whole backing array', () => {
    expect(toSeq(view(nums(1, 2, 3)))).toEqual(nums(1, 2, 3))
  })

  it('consToArray walks a cons cell whose TAIL is an indexed-seq view', () => {
    // cons now accepts an indexed-seq tail (seq.ts) — the chain must flatten.
    const chain = v.cons(v.number(0), view(nums(1, 2, 3)))
    expect(consToArray(chain)).toEqual(nums(0, 1, 2, 3))
  })
})

describe('Phase B consumer readiness — equality is cross-type (= )', () => {
  it('an indexed-seq equals the list of the same elements', () => {
    expect(isEqual(view(nums(1, 2, 3)), v.list(nums(1, 2, 3)))).toBe(true)
  })

  it('an indexed-seq equals the vector of the same elements (either arg order)', () => {
    expect(isEqual(view(nums(1, 2, 3)), v.vector(nums(1, 2, 3)))).toBe(true)
    expect(isEqual(v.vector(nums(1, 2, 3)), view(nums(1, 2, 3)))).toBe(true)
  })

  it('an OFFSET view equals only its remaining elements', () => {
    expect(isEqual(view(nums(0, 1, 2, 3), 1), v.list(nums(1, 2, 3)))).toBe(true)
    expect(isEqual(view(nums(0, 1, 2, 3), 1), v.list(nums(0, 1, 2, 3)))).toBe(
      false
    )
  })
})

describe('Phase B consumer readiness — cross-type hash invariant', () => {
  // = values MUST hash equal, or an indexed-seq could never be a map key / set
  // member consistently with the list/vector it equals.
  it('an indexed-seq hashes equal to the equal list and vector', () => {
    const s = view(nums(1, 2, 3))
    expect(hashCljValue(s)).toBe(hashCljValue(v.list(nums(1, 2, 3))))
    expect(hashCljValue(s)).toBe(hashCljValue(v.vector(nums(1, 2, 3))))
  })

  it('an offset view hashes equal to the list of its remaining elements', () => {
    expect(hashCljValue(view(nums(9, 1, 2, 3), 1))).toBe(
      hashCljValue(v.list(nums(1, 2, 3)))
    )
  })
})

describe('Phase B consumer readiness — printer (pr-str)', () => {
  it('prints as a seq in list syntax', () => {
    expect(printString(view(nums(1, 2, 3)))).toBe('(1 2 3)')
  })

  it('prints from the offset, not the whole backing array', () => {
    expect(printString(view(nums(0, 1, 2, 3), 2))).toBe('(2 3)')
  })
})

describe('the backing array is SHARED and never mutated by us', () => {
  it('views at different offsets share the SAME array reference', () => {
    const array = nums(1, 2, 3)
    const a = view(array, 0)
    const b = view(array, 2)
    expect(a.array).toBe(array)
    expect(b.array).toBe(array)
    expect(a.array).toBe(b.array)
  })

  it('constructing a view does not mutate the source array', () => {
    const array = nums(1, 2, 3)
    const snapshot = [...array]
    view(array, 1)
    v.indexedSeq(array, 2)
    expect(array).toEqual(snapshot)
  })
})
