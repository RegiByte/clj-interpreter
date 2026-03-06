import { describe, expect, it } from 'vitest'
import {
  cljKeyword,
  cljList,
  cljMap,
  cljNumber,
  cljString,
  cljVector,
} from '../factories'
import { expectError, freshSession, toCljValue } from './evaluator-test-utils'
describe('count', () => {
  it.each([
    ['(count [1 2 3])', 3],
    ['(count {"a" 1, "b" 2})', 2],
    ["(count '())", 0],
    ['(count [])', 0],
    ['(count {})', 0],
    ['(count "abc")', 3],
  ])(
    'should evaluate count core function: %s should be %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(cljNumber(expected))
    }
  )

  it.each([
    ['(count true)', 'count expects a countable value, got true'],
    ['(count 1)', 'count expects a countable value, got 1'],
    ['(count nil)', 'count expects a countable value, got nil'],
    ['(def x 1) (count x)', 'count expects a countable value, got 1'],
  ])(
    'should throw on invalid count function arguments: %s should be %s',
    (code, expected_err) => {
      expectError(code, expected_err)
    }
  )
})

describe('first', () => {
  it.each([
    ['(first [1 2 3])', 1],
    ['(first (quote (1 2 3)))', 1],
    ['(first (quote (1 2 3)))', 1],
    ['(first {})', null],
    ['(first [])', null],
    ["(first '())", null],
    ['(first {"a" 1 "b" 2})', [cljString('a'), cljNumber(1)]],
    ['(first [1 2])', 1],
    ["(first '(2 3))", 2],
  ])(
    'should evalute first core function: %s should be %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected))
    }
  )
})

describe('rest', () => {
  it.each([
    ['(rest (quote (1 2 3)))', cljList([cljNumber(2), cljNumber(3)])],
    ['(rest [1 2 3])', cljVector([cljNumber(2), cljNumber(3)])],
    ['(rest {"a" 1 "b" 2})', cljMap([[cljString('b'), cljNumber(2)]])],
    ['(rest {})', cljMap([])],
    ['(rest [])', cljVector([])],
    ["(rest '())", cljList([])],
  ])(
    'should evalute rest core function: %s should be %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected))
    }
  )
})

describe('conj', () => {
  it.each([
    // empty collections
    ['(conj [])', cljVector([])],
    ['(conj {})', cljMap([])],
    ["(conj '())", cljList([])],
    // no arguments, returns the collection unchanged
    [
      '(conj [1 2 3])',
      cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
    ],
    ['(conj {"a" 1})', cljMap([[cljString('a'), cljNumber(1)]])],
    ["(conj '(1 2))", cljList([cljNumber(1), cljNumber(2)])],
    // basic conj
    ['(conj [1 2 3] 4)', [1, 2, 3, 4]],
    ['(conj {} ["a" 1] ["b" 2])', { a: 1, b: 2 }],
    ['(conj [1 2] [3 4])', [1, 2, [3, 4]]],
    ['(conj [1 2] 3 4)', [1, 2, 3, 4]],
    ['(conj {"a" 1} ["b" 2])', { a: 1, b: 2 }],
    // conj on conj, replaces existing key
    ['(conj (conj {"a" 1} ["b" 2]) ["a" 5])', { a: 5, b: 2 }],
    [
      "(conj '(1 2 3) 4)",
      cljList([
        cljNumber(4), // added to the front
        cljNumber(1),
        cljNumber(2),
        cljNumber(3),
      ]),
    ],
    [
      "(conj '(1 2) 3 4)",
      cljList([cljNumber(4), cljNumber(3), cljNumber(1), cljNumber(2)]),
    ],
    [
      "(conj '(1 2) 3 4 5)",
      cljList([
        cljNumber(5),
        cljNumber(4),
        cljNumber(3),
        cljNumber(1),
        cljNumber(2),
      ]),
    ],
  ])(
    'should evalute conj core function: %s should be %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected))
    }
  )

  it.each([
    ['(conj)', 'conj expects a collection as first argument'],
    [
      '(conj {} "a" 1 "b")',
      'conj on maps expects each argument to be a vector key-pair for maps, got "a"',
    ],
    [
      '(conj {} "a")',
      'conj on maps expects each argument to be a vector key-pair for maps, got "a"',
    ],
    ['(conj "a" "b")', 'conj expects a collection, got "a"'],
  ])(
    'should throw on invalid conj function arguments: %s should be %s',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('assoc', () => {
  it.each([
    ['(assoc [1 2 3] 0 4)', [4, 2, 3]],
    ['(assoc [1 2 3] 1 4)', [1, 4, 3]],
    ['(assoc [1 2 3] 2 4)', [1, 2, 4]],
    ['(assoc [] 0 1)', [1]],
    ['(assoc {} "a" 1)', { a: 1 }],
    ['(assoc {} "a" 1 "b" 2, "c" 3)', { a: 1, b: 2, c: 3 }],
    ['(assoc {} "a" 1 "b" 2, "a" 3)', { a: 3, b: 2 }],
    ['(assoc {"a" 1} "b" 2)', { a: 1, b: 2 }],
  ])(
    'should evalute assoc core function: %s should be %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected))
    }
  )

  it.each([
    ['(assoc)', 'assoc expects a collection as first argument'],
    ['(assoc "a" "b")', 'assoc expects a collection, got "a"'],
    [
      '(assoc [1 2 3] "a" 1)',
      'assoc on vectors expects each key argument to be a index (number), got "a"',
    ],
    [
      '(assoc {} "a" 1 "b")',
      'assoc expects an even number of binding arguments',
    ],
  ])(
    'should throw on invalid assoc function arguments: %s should be %s',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('dissoc', () => {
  it.each([
    ['(dissoc [1 2 3] 0)', [2, 3]],
    ['(dissoc [1 2 3] 1)', [1, 3]],
    ['(dissoc [1 2 3] 2)', [1, 2]],
    ['(dissoc [] 0)', []],
    ['(dissoc {} "a")', {}],
    ['(dissoc {"a" 1} "b")', { a: 1 }],
    ['(dissoc {"a" 1} "a")', {}],
    ['(dissoc {"a" 1 "b" 2} "a" "b")', {}],
    ['(dissoc {"a" 1 "b" 2} "a")', { b: 2 }],
  ])(
    'should evalute dissoc core function: %s should be %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected))
    }
  )

  it.each([
    ['(dissoc)', 'dissoc expects a collection as first argument'],
    ['(dissoc "a" "b")', 'dissoc expects a collection, got "a"'],
    [
      '(dissoc [1 2 3] "a")',
      'dissoc on vectors expects each key argument to be a index (number), got "a"',
    ],
    [
      "(dissoc '(1) 0)",
      'dissoc on lists is not supported, use vectors instead',
    ],
  ])(
    'should throw on invalid dissoc function arguments: %s should be %s',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('get', () => {
  it.each([
    ['(get [1 2 3] 0)', 1],
    //
    ['(get [1 2 3] 0)', 1],
    ['(get [1 2 3] 1)', 2],
    ['(get [1 2 3] 2)', 3],

    ['(get [1 2 3] 3)', null],

    ['(get [1 2 3] -2)', null],

    ["(get '(1 2 3) 1)", null],
    ['(get \'(1 2 3) 1 "default")', 'default'],
    ['(get 20 0)', null],
    ['(get 20 0 "default")', 'default'],
    ['(get {:a 1 :b 2} :a)', 1],
    ['(get {:a 1 :b 2} :b)', 2],
    ['(get {:a 1 :b 2} :c)', null],
    ['(get {:a 1 :b 2} :c "default")', 'default'],
  ])(
    'get should get a value from a collection: %s should be %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected))
    }
  )

  it.each([
    ['((get {"a" (fn [n] (+ n 1))} "a") 10)', 11],
    [
      `(def the-vector [1 2 3 (fn [n] (+ n 1))])
   ((get the-vector 3) 41)`,
      42,
    ],
  ])(
    'evaluate function returned from expression as first member of a list: %s should be %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected))
    }
  )
})

describe('cons', () => {
  it.each([
    [
      `(cons 1 '(2 3 4 5 6))`,
      cljList([
        cljNumber(1),
        cljNumber(2),
        cljNumber(3),
        cljNumber(4),
        cljNumber(5),
        cljNumber(6),
      ]),
    ],
    [
      `(cons [1 2] [4 5 6])`,
      cljVector([
        cljVector([cljNumber(1), cljNumber(2)]),
        cljNumber(4),
        cljNumber(5),
        cljNumber(6),
      ]),
    ],
    [
      `(def db {:users [{:name "Eduardo"}]})
(def new-element {:name "Eva"})
(assoc db :users (cons new-element (:users db)))`,
      cljMap([
        [
          cljKeyword(':users'),
          cljVector([
            cljMap([[cljKeyword(':name'), cljString('Eva')]]),
            cljMap([[cljKeyword(':name'), cljString('Eduardo')]]),
          ]),
        ],
      ]),
    ],
  ])(
    'cons should prepend an element to a collection: %s should be %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected))
    }
  )

  it.each([
    [
      '(cons 1 "a")',
      'cons expects a collection as second argument, got "a"',
    ],
    ['(cons 1 1)', 'cons expects a collection as second argument, got 1'],
    [
      '(cons 1 {:a 2})',
      'cons on maps is not supported, use vectors instead',
    ],
  ])(
    'cons should throw on invalid arguments: %s should be %s',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('seq', () => {
  it.each([
    ['(seq [1 2 3])', cljList([cljNumber(1), cljNumber(2), cljNumber(3)])],
    ["(seq '(1 2 3))", cljList([cljNumber(1), cljNumber(2), cljNumber(3)])],
    [
      '(seq {:a 1 :b 2})',
      cljList([
        cljVector([cljKeyword(':a'), cljNumber(1)]),
        cljVector([cljKeyword(':b'), cljNumber(2)]),
      ]),
    ],
    ['(seq [])', null],
    ["(seq '())", null],
    ['(seq nil)', null],
  ])(
    'should evaluate seq core function: %s should be %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected))
    }
  )

  it.each([
    ['(seq "abc")', 'seq expects a collection or nil, got "abc"'],
    ['(seq 1)', 'seq expects a collection or nil, got 1'],
    ['(seq true)', 'seq expects a collection or nil, got true'],
  ])(
    'should throw on invalid seq arguments: %s should throw "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('map', () => {
  it('returns a transducer (function) when given 1 arg', () => {
    const session = freshSession()
    const result = session.evaluate('(map (fn [n] (+ n 1)))')
    expect(result.kind).toBe('function')
  })

  it.each([
    ['(map (fn [n] (+ n 1)) [1 2 3])', [2, 3, 4]],
    // list input now returns a vector (sequence always materialises into [])
    ["(map (fn [n] (+ n 1)) '(1 2 3))", [2, 3, 4]],
    [
      `(map 
   (fn [entry]
 [(str (get entry 0) (get entry 0)),
  (* 2 (get entry 1))])
   {:a 1 :b 2})`,
      [
        cljVector([cljString(':a:a'), cljNumber(2)]),
        cljVector([cljString(':b:b'), cljNumber(4)]),
      ],
    ],
    // nil collection returns empty vector
    ['(map (fn [n] (+ n 1)) nil)', []],
  ])(`should evaluate map: %s should be %s`, (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(toCljValue(expected))
  })

  it.each([
    ['(map)', 'No matching arity for 0'],
    ['(map "a" [1 2 3])', 'not a function'],
    ['(map (fn [n] (+ n 1)) "abc")', 'transduce expects a collection'],
    ['(map (fn [n] (+ n 1)) true)', 'transduce expects a collection'],
    ['(map (fn [n] (+ n 1)) false)', 'transduce expects a collection'],
    ['(map (fn [n] (+ n 1)) 0)', 'transduce expects a collection'],
  ])(
    'should throw on invalid map arguments: %s should throw "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )

  describe('multi-collection (zip)', () => {
    it('(map + [1 2 3] [10 20 30]) applies f to corresponding items', () => {
      const s = freshSession()
      expect(s.evaluate('(map + [1 2 3] [10 20 30])')).toMatchObject(
        cljVector([cljNumber(11), cljNumber(22), cljNumber(33)])
      )
    })

    it('(map vector ...) zips two collections into pairs', () => {
      const s = freshSession()
      expect(s.evaluate('(map vector [1 2 3] [4 5 6])')).toMatchObject(
        cljVector([
          cljVector([cljNumber(1), cljNumber(4)]),
          cljVector([cljNumber(2), cljNumber(5)]),
          cljVector([cljNumber(3), cljNumber(6)]),
        ])
      )
    })

    it('stops at the shortest collection', () => {
      const s = freshSession()
      expect(s.evaluate('(map + [1 2 3] [10 20])')).toMatchObject(
        cljVector([cljNumber(11), cljNumber(22)])
      )
    })

    it('returns empty vector when any collection is empty', () => {
      const s = freshSession()
      expect(s.evaluate('(map + [] [1 2 3])')).toMatchObject(cljVector([]))
    })

    it('3+ collections: (map + [1 2] [10 20] [100 200])', () => {
      const s = freshSession()
      expect(s.evaluate('(map + [1 2] [10 20] [100 200])')).toMatchObject(
        cljVector([cljNumber(111), cljNumber(222)])
      )
    })

    it('4 collections zip correctly', () => {
      const s = freshSession()
      expect(
        s.evaluate('(map + [1 2] [10 20] [100 200] [1000 2000])')
      ).toMatchObject(cljVector([cljNumber(1111), cljNumber(2222)]))
    })
  })
})

describe('filter', () => {
  it('returns a transducer (function) when given 1 arg', () => {
    const session = freshSession()
    const result = session.evaluate('(filter (fn [n] (> n 2)))')
    expect(result.kind).toBe('function')
  })

  it.each([
    ['(filter (fn [n] (> n 2)) [1 2 3 4 5])', [3, 4, 5]],
    // list input now returns a vector
    ["(filter (fn [n] (> n 2)) '(1 2 3 4 5))", [3, 4, 5]],
    [
      `(filter (fn [n] (not (= "a" n))) ["a" "b" "c" "a" "d" "e"])`,
      ['b', 'c', 'd', 'e'],
    ],
    [
      `(filter (fn [entry] (> (get entry 1) 2)) {:a 1 :b 2 :c 3 :d 4})`,
      [
        cljVector([cljKeyword(':c'), cljNumber(3)]),
        cljVector([cljKeyword(':d'), cljNumber(4)]),
      ],
    ],
    // nil collection returns empty vector
    ['(filter (fn [n] (> n 2)) nil)', []],
  ])('should evaluate filter: %s should be %s', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(toCljValue(expected))
  })

  it.each([
    ['(filter)', 'No matching arity for 0'],
    ['(filter "a" [1 2 3])', 'not a function'],
    ['(filter (fn [n] (+ n 1)) "abc")', 'transduce expects a collection'],
    ['(filter (fn [n] (+ n 1)) true)', 'transduce expects a collection'],
    ['(filter (fn [n] (+ n 1)) false)', 'transduce expects a collection'],
    ['(filter (fn [n] (+ n 1)) 0)', 'transduce expects a collection'],
  ])(
    'should throw on invalid filter arguments: %s should throw "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('reduce', () => {
  it.each([
    // 3-arg form: with initial value
    ['(reduce + 0 [1 2 3])', 6],
    ['(reduce + 0 [])', 0],
    ['(reduce + 42 [])', 42],
    ["(reduce + 0 '(1 2 3))", 6],
    ['(reduce * 1 [1 2 3 4])', 24],
    ['(reduce conj [] [1 2 3])', [1, 2, 3]],
    [
      `(reduce
     (fn [acc entry] (assoc acc (get entry 0) (* 2 (get entry 1))))
     {}
     {:a 1 :b 2 :c 3})`,
      cljMap([
        [cljKeyword(':a'), cljNumber(2)],
        [cljKeyword(':b'), cljNumber(4)],
        [cljKeyword(':c'), cljNumber(6)],
      ]),
    ],
    // 2-arg form: no initial value
    ['(reduce + [1 2 3])', 6],
    ['(reduce + [42])', 42],
    ['(reduce str \'("a" "b" "c"))', 'abc'],
  ])(
    'should evaluate reduce core function: %s should be %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected))
    }
  )

  it.each([
    ['(reduce)', 'reduce expects a function as first argument'],
    [
      '(reduce 1 [1 2 3])',
      'reduce expects a function as first argument, got 1',
    ],
    ['(reduce + "abc")', 'reduce expects a collection, got "abc"'],
    ['(reduce + 0 "abc")', 'reduce expects a collection, got "abc"'],
    ['(reduce +)', 'reduce expects 2 or 3 arguments'],
    ['(reduce + 0 [] [])', 'reduce expects 2 or 3 arguments'],
    [
      '(reduce + [])',
      'reduce called on empty collection with no initial value',
    ],
  ])(
    'should throw on invalid reduce arguments: %s should throw "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('nth', () => {
  it.each([
    ['(nth [10 20 30] 0)', 10],
    ['(nth [10 20 30] 2)', 30],
    ["(nth '(10 20 30) 1)", 20],
    ['(nth [10 20 30] 5 :missing)', cljKeyword(':missing')],
    ["(nth '() 0 :missing)", cljKeyword(':missing')],
  ])('should evaluate nth: %s → %s', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(toCljValue(expected as any))
  })

  it.each([
    ['(nth [1 2 3] 5)', 'nth index 5 is out of bounds'],
    ["(nth '(1 2) 10)", 'nth index 10 is out of bounds'],
    ['(nth {:a 1} 0)', 'nth expects a list or vector'],
    ['(nth [1 2] "a")', 'nth expects a number index'],
  ])(
    'should throw on invalid nth arguments: %s → "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('take and drop', () => {
  it('returns a transducer when given 1 arg', () => {
    const session = freshSession()
    expect(session.evaluate('(take 3)').kind).toBe('function')
    expect(session.evaluate('(drop 3)').kind).toBe('function')
  })

  it.each([
    ['(take 2 [1 2 3 4])', [1, 2]],
    ['(take 0 [1 2 3])', []],
    ['(take -1 [1 2 3])', []],
    ['(take 10 [1 2 3])', [1, 2, 3]],
    // list input now returns a vector
    ["(take 2 '(1 2 3 4))", [1, 2]],
    [
      '(take 2 {:a 1 :b 2 :c 3})',
      [
        cljVector([cljKeyword(':a'), cljNumber(1)]),
        cljVector([cljKeyword(':b'), cljNumber(2)]),
      ],
    ],
    ['(drop 2 [1 2 3 4])', [3, 4]],
    ['(drop 0 [1 2 3])', [1, 2, 3]],
    ['(drop -1 [1 2 3])', [1, 2, 3]],
    ['(drop 10 [1 2 3])', []],
    ["(drop 1 '(1 2 3))", [2, 3]],
  ])('should evaluate take / drop: %s → %s', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(
      cljVector((expected as any[]).map(toCljValue))
    )
  })

  it.each([
    // take/drop are now Clojure fns; non-number n causes dec error on first step
    ['(take "a" [1 2 3])', 'dec expects a number'],
    ['(take 2 "abc")', 'transduce expects a collection'],
    ['(drop "a" [1 2 3])', 'dec expects a number'],
    ['(drop 2 "abc")', 'transduce expects a collection'],
  ])(
    'should throw on invalid take / drop arguments: %s → "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('concat', () => {
  it.each([
    ['(concat)', []],
    ['(concat [1 2 3])', [1, 2, 3]],
    ["(concat [1 2] '(3 4))", [1, 2, 3, 4]],
    ["(concat '(1) [2] {:a 3})", [1, 2, [cljKeyword(':a'), 3]]],
    [
      "(concat '(1) [2 {:a 3}])",
      [
        cljNumber(1),
        cljNumber(2),
        cljMap([[cljKeyword(':a'), cljNumber(3)]]),
      ],
    ],
    ['(concat [] [])', []],
  ])('should evaluate concat: %s → %s', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(
      cljList((expected as any[]).map(toCljValue))
    )
  })

  it.each([
    ['(concat 1 [2 3])', 'concat expects collections, got 1'],
    ['(concat [1 2] "abc")', 'concat expects collections, got "abc"'],
  ])(
    'should throw on invalid concat arguments: %s → "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('into', () => {
  it.each([
    ["(into [] '(1 2 3))", [1, 2, 3]],
    ['(into [10] [1 2 3])', [10, 1, 2, 3]],
    ['(into [] [])', []],
  ])(
    'should evaluate into with vector target: %s → %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(
        cljVector((expected as number[]).map(toCljValue))
      )
    }
  )

  it.each([
    ["(into '() [1 2 3])", [3, 2, 1]],
    ["(into '() [])", []],
  ])(
    'should evaluate into with list target (reverses): %s → %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(
        cljList((expected as number[]).map(toCljValue))
      )
    }
  )

  it.each([
    [
      '(into {} [[:a 1] [:b 2]])',
      cljMap([
        [cljKeyword(':a'), cljNumber(1)],
        [cljKeyword(':b'), cljNumber(2)],
      ]),
    ],
    ['(into {} [])', {}],
  ])('should evaluate into with map target', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(toCljValue(expected))
  })

  it.each([
    // into is now (reduce conj to from); errors surface from conj/reduce
    ['(into 1 [1 2])', 'conj expects a collection'],
    ['(into [] "abc")', 'reduce expects a collection'],
    [
      '(into {} [1 2])',
      'conj on maps expects each argument to be a vector key-pair',
    ],
  ])(
    'should throw on invalid into arguments: %s → "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('zipmap', () => {
  it('should evaluate zipmap with equal length collections', () => {
    const session = freshSession()
    expect(session.evaluate('(zipmap [:a :b :c] [1 2 3])')).toMatchObject(
      cljMap([
        [cljKeyword(':a'), cljNumber(1)],
        [cljKeyword(':b'), cljNumber(2)],
        [cljKeyword(':c'), cljNumber(3)],
      ])
    )
  })

  it('should evaluate zipmap stopping at shorter keys', () => {
    const session = freshSession()
    expect(session.evaluate('(zipmap [:a] [1 2 3])')).toMatchObject(
      cljMap([[cljKeyword(':a'), cljNumber(1)]])
    )
  })

  it('should evaluate zipmap stopping at shorter vals', () => {
    const session = freshSession()
    expect(session.evaluate('(zipmap [:a :b :c] [1])')).toMatchObject(
      cljMap([[cljKeyword(':a'), cljNumber(1)]])
    )
  })

  it('should evaluate zipmap with empty collections', () => {
    const session = freshSession()
    expect(session.evaluate('(zipmap [] [])')).toMatchObject(cljMap([]))
  })

  it.each([
    [
      '(zipmap "abc" [1 2])',
      'zipmap expects a collection as first argument',
    ],
    [
      '(zipmap [:a :b] 1)',
      'zipmap expects a collection as second argument',
    ],
  ])(
    'should throw on invalid zipmap arguments: %s → "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('keys and vals', () => {
  it.each([
    ['(keys {:a 1 :b 2})', [cljKeyword(':a'), cljKeyword(':b')]],
    ['(keys {})', []],
    ['(vals {:a 1 :b 2})', [1, 2]],
    [
      '(vals {:a 1 :b 2 :c [1 2 3]})',
      [1, 2, cljVector([cljNumber(1), cljNumber(2), cljNumber(3)])],
    ],
    ['(vals {})', []],
  ])('should evaluate keys / vals: %s → %s', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(
      cljVector((expected as any[]).map(toCljValue))
    )
  })

  it.each([
    ['(keys [1 2 3])', 'keys expects a map'],
    ['(keys "abc")', 'keys expects a map'],
    ['(vals [1 2 3])', 'vals expects a map'],
    ['(vals "abc")', 'vals expects a map'],
  ])(
    'should throw on invalid keys / vals arguments: %s → "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})
