import { describe, expect, it } from 'vitest'
import { cljBoolean, cljList, cljNil, cljNumber, cljVector } from '../../factories'
import { expectError, freshSession, materialize } from './evaluator-test-utils'

describe('reduced / unreduced / ensure-reduced', () => {
  it('(reduced 42) creates a reduced wrapper', () => {
    const s = freshSession()
    expect(s.evaluate('(reduced 42)').kind).toBe('reduced')
  })

  it('(reduced? (reduced 42)) is true', () => {
    const s = freshSession()
    expect(s.evaluate('(reduced? (reduced 42))')).toEqual(cljBoolean(true))
  })

  it('(reduced? 42) is false', () => {
    const s = freshSession()
    expect(s.evaluate('(reduced? 42)')).toEqual(cljBoolean(false))
  })

  it('(unreduced (reduced 42)) unwraps to 42', () => {
    const s = freshSession()
    expect(s.evaluate('(unreduced (reduced 42))')).toEqual(cljNumber(42))
  })

  it('(unreduced 42) returns 42 unchanged', () => {
    const s = freshSession()
    expect(s.evaluate('(unreduced 42)')).toEqual(cljNumber(42))
  })

  it('@(reduced 42) unwraps via deref', () => {
    const s = freshSession()
    expect(s.evaluate('(deref (reduced 42))')).toEqual(cljNumber(42))
  })

  it('(ensure-reduced 42) wraps in reduced', () => {
    const s = freshSession()
    expect(s.evaluate('(ensure-reduced 42)').kind).toBe('reduced')
  })

  it('(ensure-reduced (reduced 42)) returns the same reduced', () => {
    const s = freshSession()
    expect(s.evaluate('(ensure-reduced (reduced 42))').kind).toBe('reduced')
  })

  it('reduce short-circuits on reduced', () => {
    const s = freshSession()
    expect(
      s.evaluate(
        '(reduce (fn [acc x] (if (= x 3) (reduced acc) (conj acc x))) [] [1 2 3 4 5])'
      )
    ).toMatchObject(cljVector([cljNumber(1), cljNumber(2)]))
  })
})

describe('volatile!', () => {
  it('(volatile! 0) creates a volatile holding 0', () => {
    const s = freshSession()
    expect(s.evaluate('(volatile! 0)').kind).toBe('volatile')
  })

  it('(volatile? (volatile! 0)) is true', () => {
    const s = freshSession()
    expect(s.evaluate('(volatile? (volatile! 0))')).toEqual(cljBoolean(true))
  })

  it('(volatile? 42) is false', () => {
    const s = freshSession()
    expect(s.evaluate('(volatile? 42)')).toEqual(cljBoolean(false))
  })

  it('@v returns current value', () => {
    const s = freshSession()
    expect(s.evaluate('(let [v (volatile! 42)] @v)')).toEqual(cljNumber(42))
  })

  it('vreset! sets new value and returns it', () => {
    const s = freshSession()
    expect(s.evaluate('(let [v (volatile! 0)] (vreset! v 99) @v)')).toEqual(
      cljNumber(99)
    )
  })

  it('vswap! applies a function and stores result', () => {
    const s = freshSession()
    expect(s.evaluate('(let [v (volatile! 10)] (vswap! v + 5) @v)')).toEqual(
      cljNumber(15)
    )
  })

  it('vswap! returns the new value', () => {
    const s = freshSession()
    expect(s.evaluate('(let [v (volatile! 0)] (vswap! v inc))')).toEqual(
      cljNumber(1)
    )
  })

  it('vreset! on non-volatile throws', () => {
    expectError('(vreset! 42 1)', 'vreset! expects a volatile')
  })

  it('vswap! on non-volatile throws', () => {
    expectError('(vswap! 42 inc)', 'vswap! expects a volatile')
  })
})

describe('transduce', () => {
  it('(transduce (map inc) conj [] [1 2 3]) produces [2 3 4]', () => {
    const s = freshSession()
    expect(s.evaluate('(transduce (map inc) conj [] [1 2 3])')).toMatchObject(
      cljVector([cljNumber(2), cljNumber(3), cljNumber(4)])
    )
  })

  it('(transduce (filter even?) conj [] [1 2 3 4 5]) produces [2 4]', () => {
    const s = freshSession()
    expect(
      s.evaluate('(transduce (filter even?) conj [] [1 2 3 4 5])')
    ).toMatchObject(cljVector([cljNumber(2), cljNumber(4)]))
  })

  it('(transduce (remove even?) conj [] [1 3 5]) produces [1 3 5]', () => {
    const s = freshSession()
    expect(
      s.evaluate('(transduce (remove even?) conj [] [1 2 3 4 5])')
    ).toMatchObject(cljVector([cljNumber(1), cljNumber(3), cljNumber(5)]))
  })

  it('transduce over nil collection returns empty result', () => {
    const s = freshSession()
    expect(s.evaluate('(transduce (map inc) conj [] nil)')).toMatchObject(
      cljVector([])
    )
  })

  it('comp composes transducers left-to-right', () => {
    const s = freshSession()
    expect(
      s.evaluate(
        '(transduce (comp (map inc) (filter even?)) conj [] [1 2 3 4 5])'
      )
    ).toMatchObject(cljVector([cljNumber(2), cljNumber(4), cljNumber(6)]))
  })

  describe('3-arity (init derived from (f))', () => {
    it('(transduce (map inc) + [1 2 3]) sums incremented items, init from (+)', () => {
      // (+) = 0; map inc gives [2 3 4]; sum = 9
      const s = freshSession()
      expect(s.evaluate('(transduce (map inc) + [1 2 3])')).toMatchObject(
        cljNumber(9)
      )
    })

    it('(transduce (filter even?) + [1 2 3 4 5]) sums even items', () => {
      // (+) = 0; filter even? gives [2 4]; sum = 6
      const s = freshSession()
      expect(
        s.evaluate('(transduce (filter even?) + [1 2 3 4 5])')
      ).toMatchObject(cljNumber(6))
    })

    it('(transduce (map inc) * [1 2 3]) multiplies incremented items, init from (*)', () => {
      // (*) = 1; map inc gives [2 3 4]; product = 24
      const s = freshSession()
      expect(s.evaluate('(transduce (map inc) * [1 2 3])')).toMatchObject(
        cljNumber(24)
      )
    })

    it('3-arity transduce over nil collection returns init', () => {
      // (+) = 0; nil → empty loop; completion returns 0
      const s = freshSession()
      expect(s.evaluate('(transduce (map inc) + nil)')).toMatchObject(
        cljNumber(0)
      )
    })

    it('throws when f has no 0-arity', () => {
      // - requires at least 1 arg, so (-) throws
      const s = freshSession()
      expect(() => s.evaluate('(transduce (map inc) - [1 2 3])')).toThrow()
    })
  })

  describe('completing', () => {
    it('completing wraps a 2-arity fn so it works with transduce completion step', () => {
      // (defn my-sum [acc x] (+ acc x)) has no 1-arity; without completing,
      // transduce would call (my-sum 9) at completion and throw an arity error.
      // completing adds ([x] (identity x)) so the completion just returns acc.
      const s = freshSession()
      s.evaluate('(defn my-sum [acc x] (+ acc x))')
      expect(
        s.evaluate('(transduce (map inc) (completing my-sum) 0 [1 2 3])')
      ).toMatchObject(cljNumber(9))
    })

    it('completing accepts a custom completion fn', () => {
      // Use a completion fn that doubles the final result
      const s = freshSession()
      s.evaluate('(defn my-sum [acc x] (+ acc x))')
      expect(
        s.evaluate(
          '(transduce (map inc) (completing my-sum (fn [r] (* r 2))) 0 [1 2 3])'
        )
      ).toMatchObject(cljNumber(18))
    })

    it('completing (f) defaults to identity for 1-arity', () => {
      const s = freshSession()
      expect(
        s.evaluate('((completing (fn [acc x] (+ acc x))) 42)')
      ).toMatchObject(cljNumber(42))
    })
  })
})

describe('sequence', () => {
  it('(sequence coll) materialises coll into a seq (list)', () => {
    const s = freshSession()
    expect(s.evaluate("(sequence '(1 2 3))")).toMatchObject(
      cljList([cljNumber(1), cljNumber(2), cljNumber(3)])
    )
  })

  it('(sequence xf coll) applies transducer and returns a seq (list)', () => {
    const s = freshSession()
    expect(s.evaluate('(sequence (map inc) [1 2 3])')).toMatchObject(
      cljList([cljNumber(2), cljNumber(3), cljNumber(4)])
    )
  })
})

describe('into with transducer', () => {
  it('(into [] (map inc) [1 2 3]) applies transducer into vector', () => {
    const s = freshSession()
    expect(s.evaluate('(into [] (map inc) [1 2 3])')).toMatchObject(
      cljVector([cljNumber(2), cljNumber(3), cljNumber(4)])
    )
  })

  it('(into [] (filter odd?) [1 2 3 4 5]) keeps odds', () => {
    const s = freshSession()
    expect(s.evaluate('(into [] (filter odd?) [1 2 3 4 5])')).toMatchObject(
      cljVector([cljNumber(1), cljNumber(3), cljNumber(5)])
    )
  })

  it('(into [] (comp (map inc) (filter even?)) [1 2 3 4]) keeps evens after inc', () => {
    const s = freshSession()
    expect(
      s.evaluate('(into [] (comp (map inc) (filter even?)) [1 2 3 4])')
    ).toMatchObject(cljVector([cljNumber(2), cljNumber(4)]))
  })
})

describe('take-while transducer', () => {
  it('(take-while pos? [1 2 0 3]) stops at 0', () => {
    const s = freshSession()
    expect(materialize(s.evaluate('(take-while pos? [1 2 0 3])'))).toMatchObject(
      cljList([cljNumber(1), cljNumber(2)])
    )
  })

  it('(take-while pos?) returns a transducer', () => {
    const s = freshSession()
    expect(s.evaluate('(take-while pos?)').kind).toBe('function')
  })

  it('empty result when first element fails pred', () => {
    const s = freshSession()
    expect(materialize(s.evaluate('(take-while pos? [-1 2 3])'))).toMatchObject(
      cljList([])
    )
  })
})

describe('drop-last transducer', () => {
  it('(drop-last 2 [1 2 3 4]) drops the last 2 elements', () => {
    const s = freshSession()
    expect(s.evaluate('(drop-last 2 [1 2 3 4])')).toMatchObject(
      cljVector([cljNumber(1), cljNumber(2)])
    )
  })

  it('(drop-last [1 2 3 4]) drops the last 1 elements', () => {
    const s = freshSession()
    expect(s.evaluate('(drop-last [1 2 3 4])')).toMatchObject(
      cljVector([cljNumber(1), cljNumber(2), cljNumber(3)])
    )
  })
})

describe('drop-while transducer', () => {
  it('(drop-while neg? [-1 -2 3 4]) skips negatives', () => {
    const s = freshSession()
    expect(materialize(s.evaluate('(drop-while neg? [-1 -2 3 4])'))).toMatchObject(
      cljList([cljNumber(3), cljNumber(4)])
    )
  })

  it('passes through everything once pred fails', () => {
    const s = freshSession()
    expect(materialize(s.evaluate('(drop-while even? [2 4 5 6])'))).toMatchObject(
      cljList([cljNumber(5), cljNumber(6)])
    )
  })
})

describe('take-last transducer', () => {
  it('(take-last 2 [1 2 3 4]) takes the last 2 elements', () => {
    const s = freshSession()
    expect(s.evaluate('(take-last 2 [1 2 3 4])')).toMatchObject(
      cljList([cljNumber(3), cljNumber(4)])
    )
  })
})

describe('map-indexed transducer', () => {
  it('(map-indexed vector [10 20 30]) adds index', () => {
    const s = freshSession()
    expect(materialize(s.evaluate('(map-indexed vector [10 20 30])'))).toMatchObject(
      cljList([
        cljVector([cljNumber(0), cljNumber(10)]),
        cljVector([cljNumber(1), cljNumber(20)]),
        cljVector([cljNumber(2), cljNumber(30)]),
      ])
    )
  })

  it('(map-indexed vector) returns a transducer', () => {
    const s = freshSession()
    expect(s.evaluate('(map-indexed vector)').kind).toBe('function')
  })
})

describe('dedupe transducer', () => {
  it('(dedupe [1 1 2 3 3 3 4]) removes consecutive duplicates', () => {
    const s = freshSession()
    expect(s.evaluate('(dedupe [1 1 2 3 3 3 4])')).toMatchObject(
      cljList([cljNumber(1), cljNumber(2), cljNumber(3), cljNumber(4)])
    )
  })

  it('(dedupe) returns a transducer', () => {
    const s = freshSession()
    expect(s.evaluate('(dedupe)').kind).toBe('function')
  })

  it('non-consecutive duplicates are kept', () => {
    const s = freshSession()
    expect(s.evaluate('(dedupe [1 2 1 2])')).toMatchObject(
      cljList([cljNumber(1), cljNumber(2), cljNumber(1), cljNumber(2)])
    )
  })

  it('nil values handled correctly', () => {
    const s = freshSession()
    expect(s.evaluate('(dedupe [nil nil 1 nil])')).toMatchObject(
      cljList([cljNil(), cljNumber(1), cljNil()])
    )
  })
})

describe('partition-all transducer', () => {
  it('(partition-all 2 [1 2 3 4]) groups into pairs', () => {
    const s = freshSession()
    expect(s.evaluate('(partition-all 2 [1 2 3 4])')).toMatchObject(
      cljList([
        cljVector([cljNumber(1), cljNumber(2)]),
        cljVector([cljNumber(3), cljNumber(4)]),
      ])
    )
  })

  it('flushes partial partition at completion', () => {
    const s = freshSession()
    expect(s.evaluate('(partition-all 2 [1 2 3])')).toMatchObject(
      cljList([
        cljVector([cljNumber(1), cljNumber(2)]),
        cljVector([cljNumber(3)]),
      ])
    )
  })

  it('(partition-all 2) returns a transducer', () => {
    const s = freshSession()
    expect(s.evaluate('(partition-all 2)').kind).toBe('function')
  })

  it('empty collection produces empty result', () => {
    const s = freshSession()
    expect(s.evaluate('(partition-all 3 [])')).toMatchObject(cljList([]))
  })

  it('can compose with other transducers', () => {
    const s = freshSession()
    expect(
      s.evaluate(
        '(into [] (comp (filter odd?) (partition-all 2)) [1 2 3 4 5 6 7])'
      )
    ).toMatchObject(
      cljVector([
        cljVector([cljNumber(1), cljNumber(3)]),
        cljVector([cljNumber(5), cljNumber(7)]),
      ])
    )
  })
})
