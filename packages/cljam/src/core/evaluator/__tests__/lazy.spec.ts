import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { freshSession, materialize } from './evaluator-test-utils'

describe('delay / force', () => {
  it('(delay expr) creates a delay', () => {
    const session = freshSession()
    const result = session.evaluate('(delay 42)')
    expect(result.kind).toBe('delay')
  })

  it('(force (delay expr)) returns the value', () => {
    const session = freshSession()
    const result = session.evaluate('(force (delay 42))')
    expect(result).toMatchObject(v.number(42))
  })

  it('@(delay expr) returns the value via deref', () => {
    const session = freshSession()
    const result = session.evaluate('@(delay 42)')
    expect(result).toMatchObject(v.number(42))
  })

  it('delay? predicate', () => {
    const session = freshSession()
    expect(session.evaluate('(delay? (delay 1))')).toMatchObject(
      v.boolean(true)
    )
    expect(session.evaluate('(delay? 42)')).toMatchObject(v.boolean(false))
    expect(session.evaluate('(delay? nil)')).toMatchObject(v.boolean(false))
  })

  it('realized? is false before force, true after', () => {
    const session = freshSession()
    session.evaluate('(def d (delay 42))')
    expect(session.evaluate('(realized? d)')).toMatchObject(v.boolean(false))
    session.evaluate('(force d)')
    expect(session.evaluate('(realized? d)')).toMatchObject(v.boolean(true))
  })

  it('side effects run only once', () => {
    const session = freshSession()
    session.evaluate('(def counter (atom 0))')
    session.evaluate('(def d (delay (swap! counter inc)))')
    expect(session.evaluate('@counter')).toMatchObject(v.number(0))
    session.evaluate('(force d)')
    expect(session.evaluate('@counter')).toMatchObject(v.number(1))
    session.evaluate('(force d)')
    expect(session.evaluate('@counter')).toMatchObject(v.number(1))
  })

  it('force on non-delay returns the value unchanged', () => {
    const session = freshSession()
    expect(session.evaluate('(force 42)')).toMatchObject(v.number(42))
    expect(session.evaluate('(force nil)')).toMatchObject(v.nil())
    expect(session.evaluate('(force "hello")')).toMatchObject(v.string('hello'))
  })

  it('delay body can reference lexical scope', () => {
    const session = freshSession()
    const result = session.evaluate('(let [x 10] (force (delay (+ x 5))))')
    expect(result).toMatchObject(v.number(15))
  })
})

describe('lazy-seq basics', () => {
  it('(lazy-seq nil) realizes to nil', () => {
    const session = freshSession()
    const result = session.evaluate('(seq (lazy-seq nil))')
    expect(result).toMatchObject(v.nil())
  })

  it('(lazy-seq (list 1 2 3)) realizes to (1 2 3)', () => {
    const session = freshSession()
    const result = materialize(session.evaluate("(lazy-seq '(1 2 3))"))
    expect(result).toMatchObject(
      v.list([v.number(1), v.number(2), v.number(3)])
    )
  })

  it('lazy-seq? predicate', () => {
    const session = freshSession()
    expect(session.evaluate('(lazy-seq? (lazy-seq nil))')).toMatchObject(
      v.boolean(true)
    )
    expect(session.evaluate('(lazy-seq? (list 1 2))')).toMatchObject(
      v.boolean(false)
    )
    expect(session.evaluate('(lazy-seq? nil)')).toMatchObject(v.boolean(false))
  })

  it('realized? works on lazy-seq', () => {
    const session = freshSession()
    session.evaluate('(def ls (lazy-seq (list 1 2)))')
    expect(session.evaluate('(realized? ls)')).toMatchObject(v.boolean(false))
    session.evaluate('(first ls)')
    expect(session.evaluate('(realized? ls)')).toMatchObject(v.boolean(true))
  })

  it('first on lazy-seq', () => {
    const session = freshSession()
    const result = session.evaluate('(first (lazy-seq (cons 1 nil)))')
    expect(result).toMatchObject(v.number(1))
  })

  it('rest on lazy-seq', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(rest (lazy-seq (cons 1 (cons 2 nil))))')
    )
    expect(result).toMatchObject(v.list([v.number(2)]))
  })

  it('thunk evaluates lazily (not on creation)', () => {
    const session = freshSession()
    session.evaluate('(def counter (atom 0))')
    session.evaluate('(def ls (lazy-seq (do (swap! counter inc) (list 1))))')
    expect(session.evaluate('@counter')).toMatchObject(v.number(0))
    session.evaluate('(first ls)')
    expect(session.evaluate('@counter')).toMatchObject(v.number(1))
  })
})

describe('cons cell', () => {
  it('cons with lazy-seq tail returns cons', () => {
    const session = freshSession()
    const result = session.evaluate('(cons 1 (lazy-seq nil))')
    expect(result.kind).toBe('cons')
  })

  it('first/rest on cons cell', () => {
    const session = freshSession()
    expect(session.evaluate('(first (cons 1 (lazy-seq nil)))')).toMatchObject(
      v.number(1)
    )
    const rest = session.evaluate('(rest (cons 1 (lazy-seq nil)))')
    expect(rest.kind).toBe('lazy-seq')
  })

  it('nested cons chains work', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(cons 1 (cons 2 (cons 3 nil)))')
    )
    expect(result).toMatchObject(
      v.list([v.number(1), v.number(2), v.number(3)])
    )
  })
})

describe('infinite sequences', () => {
  it('(take 5 (iterate inc 0))', () => {
    const session = freshSession()
    const result = materialize(session.evaluate('(take 5 (iterate inc 0))'))
    expect(result).toMatchObject(
      v.list([v.number(0), v.number(1), v.number(2), v.number(3), v.number(4)])
    )
  })

  it('(take 3 (repeatedly f)) with side effects', () => {
    const session = freshSession()
    session.evaluate('(def counter (atom 0))')
    const result = materialize(
      session.evaluate('(take 3 (repeatedly (fn [] (swap! counter inc))))')
    )
    expect(result).toMatchObject(
      v.list([v.number(1), v.number(2), v.number(3)])
    )
  })

  it('(take 7 (cycle [1 2 3]))', () => {
    const session = freshSession()
    const result = materialize(session.evaluate('(take 7 (cycle [1 2 3]))'))
    expect(result).toMatchObject(
      v.list([
        v.number(1),
        v.number(2),
        v.number(3),
        v.number(1),
        v.number(2),
        v.number(3),
        v.number(1),
      ])
    )
  })

  it('(take 5 (range))', () => {
    const session = freshSession()
    const result = materialize(session.evaluate('(take 5 (range))'))
    expect(result).toMatchObject(
      v.list([v.number(0), v.number(1), v.number(2), v.number(3), v.number(4)])
    )
  })

  it('(take 3 (repeat :x))', () => {
    const session = freshSession()
    const result = materialize(session.evaluate('(take 3 (repeat :x))'))
    expect(result).toMatchObject(
      v.list([v.keyword(':x'), v.keyword(':x'), v.keyword(':x')])
    )
  })
})

describe('lazy composition', () => {
  it('(take 3 (map inc (range))) — lazy map over infinite range', () => {
    const session = freshSession()
    const result = materialize(session.evaluate('(take 3 (map inc (range)))'))
    expect(result).toMatchObject(
      v.list([v.number(1), v.number(2), v.number(3)])
    )
  })

  it('(take 3 (filter even? (range))) — lazy filter over infinite range', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(take 3 (filter even? (range)))')
    )
    expect(result).toMatchObject(
      v.list([v.number(0), v.number(2), v.number(4)])
    )
  })

  it('(take 3 (drop 5 (range))) — lazy drop over infinite range', () => {
    const session = freshSession()
    const result = materialize(session.evaluate('(take 3 (drop 5 (range)))'))
    expect(result).toMatchObject(
      v.list([v.number(5), v.number(6), v.number(7)])
    )
  })

  it('(take 4 (take-while #(< % 10) (range))) — lazy take-while', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(take 4 (take-while (fn [x] (< x 10)) (range)))')
    )
    expect(result).toMatchObject(
      v.list([v.number(0), v.number(1), v.number(2), v.number(3)])
    )
  })

  it('(take 3 (drop-while #(< % 5) (range))) — lazy drop-while', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(take 3 (drop-while (fn [x] (< x 5)) (range)))')
    )
    expect(result).toMatchObject(
      v.list([v.number(5), v.number(6), v.number(7)])
    )
  })

  it('(take 4 (keep #(when (even? %) (* % 10)) (range))) — lazy keep', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate(
        '(take 4 (keep (fn [x] (when (even? x) (* x 10))) (range)))'
      )
    )
    expect(result).toMatchObject(
      v.list([v.number(0), v.number(20), v.number(40), v.number(60)])
    )
  })

  it('(take 5 (concat [1 2] (iterate inc 3))) — lazy concat with infinite tail', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(take 5 (concat [1 2] (iterate inc 3)))')
    )
    expect(result).toMatchObject(
      v.list([v.number(1), v.number(2), v.number(3), v.number(4), v.number(5)])
    )
  })

  it('chained: (take 3 (map inc (filter even? (range))))', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(take 3 (map inc (filter even? (range))))')
    )
    expect(result).toMatchObject(
      v.list([v.number(1), v.number(3), v.number(5)])
    )
  })
})

describe('side-effect ordering', () => {
  it('elements are computed on demand, not eagerly', () => {
    const session = freshSession()
    session.evaluate('(def log (atom []))')
    session.evaluate(`
      (def nums (map (fn [x]
                       (swap! log conj x)
                       x)
                     (iterate inc 0)))
    `)
    // Nothing logged yet — lazy
    expect(materialize(session.evaluate('@log'))).toMatchObject(v.vector([]))
    // Take 3 forces computation of 3 elements
    session.evaluate('(doall (take 3 nums))')
    const log = materialize(session.evaluate('@log'))
    expect(log).toMatchObject(v.vector([v.number(0), v.number(1), v.number(2)]))
  })
})

describe('backward compatibility', () => {
  it('(iterate inc 0 5) — finite 3-arg form still works', () => {
    const session = freshSession()
    const result = session.evaluate('(iterate inc 0 5)')
    expect(result).toMatchObject(
      v.vector([
        v.number(0),
        v.number(1),
        v.number(2),
        v.number(3),
        v.number(4),
      ])
    )
  })

  it('(repeatedly 3 f) — finite 2-arg form still works', () => {
    const session = freshSession()
    session.evaluate('(def counter (atom 0))')
    const result = session.evaluate(
      '(repeatedly 3 (fn [] (swap! counter inc)))'
    )
    expect(result).toMatchObject(
      v.vector([v.number(1), v.number(2), v.number(3)])
    )
  })

  it('(cycle 2 [1 2]) — finite 2-arg form still works', () => {
    const session = freshSession()
    const result = session.evaluate('(cycle 2 [1 2])')
    expect(result).toMatchObject(
      v.vector([v.number(1), v.number(2), v.number(1), v.number(2)])
    )
  })

  it('(range 5) — finite range still works', () => {
    const session = freshSession()
    const result = session.evaluate('(range 5)')
    expect(result).toMatchObject(
      v.list([v.number(0), v.number(1), v.number(2), v.number(3), v.number(4)])
    )
  })

  it('(range 1 4) — finite range with start/end', () => {
    const session = freshSession()
    const result = session.evaluate('(range 1 4)')
    expect(result).toMatchObject(
      v.list([v.number(1), v.number(2), v.number(3)])
    )
  })

  it('(repeat 3 :x) — finite repeat still works', () => {
    const session = freshSession()
    const result = session.evaluate('(repeat 3 :x)')
    expect(result).toMatchObject(
      v.list([v.keyword(':x'), v.keyword(':x'), v.keyword(':x')])
    )
  })
})

describe('destructuring with lazy seqs', () => {
  it('(let [[a b c] (map inc [10 20 30])] [a b c])', () => {
    const session = freshSession()
    const result = session.evaluate(
      '(let [[a b c] (map inc [10 20 30])] [a b c])'
    )
    expect(result).toMatchObject(
      v.vector([v.number(11), v.number(21), v.number(31)])
    )
  })

  it('(let [[x & xs] (iterate inc 0)] [x (take 3 xs)])', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(let [[x & xs] (iterate inc 0)] [x (vec (take 3 xs))])')
    )
    expect(result).toMatchObject(
      v.vector([v.number(0), v.vector([v.number(1), v.number(2), v.number(3)])])
    )
  })
})

describe('reduce over lazy', () => {
  it('(reduce + 0 (take 5 (range)))', () => {
    const session = freshSession()
    const result = session.evaluate('(reduce + 0 (take 5 (range)))')
    expect(result).toMatchObject(v.number(10))
  })

  it('(reduce + (take 4 (iterate inc 1)))', () => {
    const session = freshSession()
    const result = session.evaluate('(reduce + (take 4 (iterate inc 1)))')
    expect(result).toMatchObject(v.number(10))
  })
})

describe('into/vec with lazy seqs', () => {
  it('(vec (take 3 (range)))', () => {
    const session = freshSession()
    const result = session.evaluate('(vec (take 3 (range)))')
    expect(result).toMatchObject(
      v.vector([v.number(0), v.number(1), v.number(2)])
    )
  })

  it('(into [] (take 3 (iterate inc 10)))', () => {
    const session = freshSession()
    const result = session.evaluate('(into [] (take 3 (iterate inc 10)))')
    expect(result).toMatchObject(
      v.vector([v.number(10), v.number(11), v.number(12)])
    )
  })

  it('(into #{} (take 4 (cycle [1 2])))', () => {
    const session = freshSession()
    const result = session.evaluate('(into #{} (take 4 (cycle [1 2])))')
    // Set deduplicates: #{1 2}
    expect(result.kind).toBe('set')
  })
})

describe('printing lazy seqs', () => {
  it('prints realized lazy-seq as list', () => {
    const session = freshSession()
    const result = session.evaluate('(str (take 3 (range)))')
    expect(result).toMatchObject(v.string('(0 1 2)'))
  })

  it('delay prints as #<Delay ...>', () => {
    const session = freshSession()
    expect(session.evaluate('(str (delay 42))')).toMatchObject(
      v.string('#<Delay pending>')
    )
    session.evaluate('(def d (delay 42))')
    session.evaluate('(force d)')
    expect(session.evaluate('(str d)')).toMatchObject(v.string('#<Delay @42>'))
  })
})

describe('doall — force full realization', () => {
  it('doall is not yet defined but vec forces realization', () => {
    const session = freshSession()
    const result = session.evaluate('(vec (map inc (range 5)))')
    expect(result).toMatchObject(
      v.vector([
        v.number(1),
        v.number(2),
        v.number(3),
        v.number(4),
        v.number(5),
      ])
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// New lazy functions
// ─────────────────────────────────────────────────────────────────────────────

describe('map-indexed — lazy 2-arg form', () => {
  it('finite coll returns lazy seq of [index item] pairs', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(map-indexed vector [:a :b :c])')
    )
    expect(result).toMatchObject(
      v.list([
        v.vector([v.number(0), v.keyword(':a')]),
        v.vector([v.number(1), v.keyword(':b')]),
        v.vector([v.number(2), v.keyword(':c')]),
      ])
    )
  })

  it('is lazy — works over infinite range', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(take 4 (map-indexed vector (iterate inc 10)))')
    )
    expect(result).toMatchObject(
      v.list([
        v.vector([v.number(0), v.number(10)]),
        v.vector([v.number(1), v.number(11)]),
        v.vector([v.number(2), v.number(12)]),
        v.vector([v.number(3), v.number(13)]),
      ])
    )
  })

  it('empty coll produces empty seq', () => {
    const session = freshSession()
    const result = materialize(session.evaluate('(map-indexed vector [])'))
    expect(result).toMatchObject(v.list([]))
  })
})

describe('keep-indexed — lazy 2-arg form', () => {
  it('keeps non-nil results with index', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate(
        '(keep-indexed (fn [i x] (when (even? i) x)) [:a :b :c :d :e])'
      )
    )
    expect(result).toMatchObject(
      v.list([v.keyword(':a'), v.keyword(':c'), v.keyword(':e')])
    )
  })

  it('is lazy — works over infinite range', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate(
        '(take 3 (keep-indexed (fn [i x] (when (even? i) x)) (range)))'
      )
    )
    expect(result).toMatchObject(
      v.list([v.number(0), v.number(2), v.number(4)])
    )
  })

  it('nil results are excluded', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate(
        '(keep-indexed (fn [i x] (when (odd? i) (* x 10))) [1 2 3 4])'
      )
    )
    expect(result).toMatchObject(v.list([v.number(20), v.number(40)]))
  })
})

describe('interleave — lazy', () => {
  it('2-arg: interleaves two finite seqs', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(interleave [1 2 3] [:a :b :c])')
    )
    expect(result).toMatchObject(
      v.list([
        v.number(1),
        v.keyword(':a'),
        v.number(2),
        v.keyword(':b'),
        v.number(3),
        v.keyword(':c'),
      ])
    )
  })

  it('stops at the shorter coll', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(interleave [1 2] [:a :b :c :d])')
    )
    expect(result).toMatchObject(
      v.list([v.number(1), v.keyword(':a'), v.number(2), v.keyword(':b')])
    )
  })

  it('is lazy — works with infinite seqs', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(take 6 (interleave (range) (iterate inc 100)))')
    )
    expect(result).toMatchObject(
      v.list([
        v.number(0),
        v.number(100),
        v.number(1),
        v.number(101),
        v.number(2),
        v.number(102),
      ])
    )
  })

  it('3-arg: interleaves three seqs', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(interleave [1 2] [:a :b] ["x" "y"])')
    )
    expect(result).toMatchObject(
      v.list([
        v.number(1),
        v.keyword(':a'),
        v.string('x'),
        v.number(2),
        v.keyword(':b'),
        v.string('y'),
      ])
    )
  })
})

describe('interpose — lazy, no count on coll', () => {
  it('inserts separator between elements', () => {
    const session = freshSession()
    const result = materialize(session.evaluate('(interpose "," [1 2 3])'))
    expect(result).toMatchObject(
      v.list([
        v.number(1),
        v.string(','),
        v.number(2),
        v.string(','),
        v.number(3),
      ])
    )
  })

  it('single element — no separator', () => {
    const session = freshSession()
    const result = materialize(session.evaluate('(interpose "," [42])'))
    expect(result).toMatchObject(v.list([v.number(42)]))
  })

  it('empty coll — empty result', () => {
    const session = freshSession()
    const result = materialize(session.evaluate('(interpose "," [])'))
    expect(result).toMatchObject(v.list([]))
  })

  it('is lazy — works with infinite seqs (no OOM from count)', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(take 5 (interpose 0 (range)))')
    )
    expect(result).toMatchObject(
      v.list([v.number(0), v.number(0), v.number(1), v.number(0), v.number(2)])
    )
  })

  it('transducer form works', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(into [] (interpose :sep) [1 2 3])')
    )
    expect(result).toMatchObject(
      v.vector([
        v.number(1),
        v.keyword(':sep'),
        v.number(2),
        v.keyword(':sep'),
        v.number(3),
      ])
    )
  })
})

describe('partition-by — lazy', () => {
  it('partitions by pred value change', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(partition-by odd? [1 1 2 2 3])')
    )
    expect(result).toMatchObject(
      v.list([
        v.vector([v.number(1), v.number(1)]),
        v.vector([v.number(2), v.number(2)]),
        v.vector([v.number(3)]),
      ])
    )
  })

  it('is lazy — take from infinite partition-by', () => {
    const session = freshSession()
    // Groups from (range): [0] [1] [2] ... each number is its own partition by identity
    const result = materialize(
      session.evaluate('(take 3 (partition-by identity (range)))')
    )
    expect(result).toMatchObject(
      v.list([
        v.vector([v.number(0)]),
        v.vector([v.number(1)]),
        v.vector([v.number(2)]),
      ])
    )
  })

  it('consecutive equal values grouped', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(partition-by identity [1 1 1 2 2 3])')
    )
    expect(result).toMatchObject(
      v.list([
        v.vector([v.number(1), v.number(1), v.number(1)]),
        v.vector([v.number(2), v.number(2)]),
        v.vector([v.number(3)]),
      ])
    )
  })

  it('transducer form still works', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(into [] (partition-by odd?) [1 1 2 2 3])')
    )
    expect(result).toMatchObject(
      v.vector([
        v.vector([v.number(1), v.number(1)]),
        v.vector([v.number(2), v.number(2)]),
        v.vector([v.number(3)]),
      ])
    )
  })
})

describe('nfirst, newline', () => {
  it('nfirst = (next (first x))', () => {
    const session = freshSession()
    const result = materialize(session.evaluate('(nfirst [[1 2 3] [4 5]])'))
    expect(result).toMatchObject(v.list([v.number(2), v.number(3)]))
  })

  it('nfirst of single-element inner returns nil', () => {
    const session = freshSession()
    expect(session.evaluate('(nfirst [[1] [2 3]])')).toMatchObject(v.nil())
  })

  it('newline returns nil', () => {
    const session = freshSession()
    expect(session.evaluate('(newline)')).toMatchObject(v.nil())
  })
})

describe('with-redefs', () => {
  it('temporarily replaces a var value', () => {
    const session = freshSession()
    session.evaluate('(defn greet [] "hello")')
    expect(session.evaluate('(greet)')).toMatchObject(v.string('hello'))
    const result = session.evaluate(
      '(with-redefs [greet (fn [] "hi")] (greet))'
    )
    expect(result).toMatchObject(v.string('hi'))
    // restored after block
    expect(session.evaluate('(greet)')).toMatchObject(v.string('hello'))
  })

  it('restores even if body throws', () => {
    const session = freshSession()
    session.evaluate('(defn greet [] "hello")')
    try {
      session.evaluate(
        '(with-redefs [greet (fn [] "boom")] (throw (ex-info "err" {})))'
      )
    } catch (_) {
      /* expected */
    }
    expect(session.evaluate('(greet)')).toMatchObject(v.string('hello'))
  })

  it('multiple bindings all restored', () => {
    const session = freshSession()
    session.evaluate('(defn f [] 1)')
    session.evaluate('(defn g [] 2)')
    const result = session.evaluate(
      '(with-redefs [f (fn [] 10) g (fn [] 20)] [(f) (g)])'
    )
    expect(result).toMatchObject(v.vector([v.number(10), v.number(20)]))
    expect(session.evaluate('(f)')).toMatchObject(v.number(1))
    expect(session.evaluate('(g)')).toMatchObject(v.number(2))
  })

  it('empty bindings just runs body', () => {
    const session = freshSession()
    expect(session.evaluate('(with-redefs [] 42)')).toMatchObject(v.number(42))
  })
})

describe('mapcat — lazy', () => {
  it('flattens one level over finite coll', () => {
    const session = freshSession()
    const result = materialize(session.evaluate('(mapcat #(list % %) [1 2 3])'))
    expect(result).toMatchObject(
      v.list([
        v.number(1),
        v.number(1),
        v.number(2),
        v.number(2),
        v.number(3),
        v.number(3),
      ])
    )
  })

  it('is lazy — works over infinite seq without OOM', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(take 6 (mapcat #(list % (* % 10)) (range)))')
    )
    expect(result).toMatchObject(
      v.list([
        v.number(0),
        v.number(0),
        v.number(1),
        v.number(10),
        v.number(2),
        v.number(20),
      ])
    )
  })

  it('empty inner lists produce no output', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('(mapcat (fn [x] (if (even? x) [x] [])) [1 2 3 4])')
    )
    expect(result).toMatchObject(v.list([v.number(2), v.number(4)]))
  })
})

describe('nfirst — edge cases', () => {
  it('nfirst of nil returns nil', () => {
    const session = freshSession()
    expect(session.evaluate('(nfirst nil)')).toMatchObject(v.nil())
  })

  it('nfirst of empty outer coll returns nil', () => {
    const session = freshSession()
    expect(session.evaluate('(nfirst [])')).toMatchObject(v.nil())
  })

  it('nfirst of empty inner coll returns nil', () => {
    const session = freshSession()
    expect(session.evaluate('(nfirst [[]])')).toMatchObject(v.nil())
  })
})

describe('quasiquote ~@ splicing with lazy seqs', () => {
  it('splices a lazy seq into a list', () => {
    const session = freshSession()
    // (map inc [1 2 3]) returns a lazy seq — splice it
    const result = materialize(session.evaluate('`(0 ~@(map inc [1 2 3]) 5)'))
    expect(result).toMatchObject(
      v.list([v.number(0), v.number(2), v.number(3), v.number(4), v.number(5)])
    )
  })

  it('splices nil as empty (no elements)', () => {
    const session = freshSession()
    const result = materialize(session.evaluate('`(1 ~@nil 2)'))
    expect(result).toMatchObject(v.list([v.number(1), v.number(2)]))
  })

  it('splices a cons cell', () => {
    const session = freshSession()
    const result = materialize(
      session.evaluate('`(0 ~@(cons 1 (cons 2 nil)) 3)')
    )
    expect(result).toMatchObject(
      v.list([v.number(0), v.number(1), v.number(2), v.number(3)])
    )
  })
})
