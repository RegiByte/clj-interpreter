import { describe, expect, it } from 'vitest'
import {
  cljKeyword,
  cljList,
  cljMap,
  cljNil,
  cljNumber,
  cljString,
  cljVector,
} from '../../factories'
import { expectError, freshSession, materialize, toCljValue } from './evaluator-test-utils'
describe('count', () => {
  it.each([
    ['(count [1 2 3])', 3],
    ['(count {"a" 1, "b" 2})', 2],
    ["(count '())", 0],
    ['(count [])', 0],
    ['(count {})', 0],
    ['(count "abc")', 3],
    ['(count nil)', 0],
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
    ['(first "hello")', 'h'],
    ['(first "")', null],
    ['(first nil)', null],
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
    ['(rest "hello")', cljList([cljString('e'), cljString('l'), cljString('l'), cljString('o')])],
    ['(rest "a")', cljList([])],
    ['(rest "")', cljList([])],
    ['(rest nil)', cljList([])],
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
      'cons on maps and sets is not supported, use vectors instead',
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
    [
      '(seq "hello")',
      cljList([cljString('h'), cljString('e'), cljString('l'), cljString('l'), cljString('o')]),
    ],
    ['(seq "a")', cljList([cljString('a')])],
    ['(seq "")', null],
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
    ['(seq 1)', 'seq expects a collection, string, or nil, got 1'],
    ['(seq true)', 'seq expects a collection, string, or nil, got true'],
  ])(
    'should throw on invalid seq arguments: %s should throw "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('strings as seqable', () => {
  it('reduce over a string', () => {
    const session = freshSession()
    const result = session.evaluate('(reduce str "" "hello")')
    expect(result).toMatchObject(cljString('hello'))
  })

  it('apply str over a string', () => {
    const session = freshSession()
    const result = session.evaluate('(apply str "abc")')
    expect(result).toMatchObject(cljString('abc'))
  })

  it('map over a string', () => {
    const session = freshSession()
    const result = session.evaluate('(into [] (map identity) "hi")')
    expect(result).toMatchObject(toCljValue(['h', 'i']))
  })

  it('count on a string', () => {
    const session = freshSession()
    const result = session.evaluate('(count "hello")')
    expect(result).toMatchObject(cljNumber(5))
  })

  it('unicode-safe seq', () => {
    const session = freshSession()
    const result = session.evaluate('(count (seq "café"))')
    expect(result).toMatchObject(cljNumber(4))
  })
})

describe('map', () => {
  it('returns a transducer (function) when given 1 arg', () => {
    const session = freshSession()
    const result = session.evaluate('(map (fn [n] (+ n 1)))')
    expect(result.kind).toBe('function')
  })

  it.each([
    // 2-arg map returns a seq (list), matching Clojure semantics
    [
      '(map (fn [n] (+ n 1)) [1 2 3])',
      cljList([cljNumber(2), cljNumber(3), cljNumber(4)]),
    ],
    [
      "(map (fn [n] (+ n 1)) '(1 2 3))",
      cljList([cljNumber(2), cljNumber(3), cljNumber(4)]),
    ],
    [
      `(map 
   (fn [entry]
 [(str (get entry 0) (get entry 0)),
  (* 2 (get entry 1))])
   {:a 1 :b 2})`,
      cljList([
        cljVector([cljString(':a:a'), cljNumber(2)]),
        cljVector([cljString(':b:b'), cljNumber(4)]),
      ]),
    ],
    // nil collection returns empty seq
    ['(map (fn [n] (+ n 1)) nil)', cljList([])],
  ])(`should evaluate map: %s should be %s`, (code, expected) => {
    const session = freshSession()
    const result = materialize(session.evaluate(code))
    expect(result).toMatchObject(expected)
  })

  it.each([
    ['(map)', 'No matching arity for 0'],
    ['(vec (map "a" [1 2 3]))', 'not callable'],
    ['(vec (map (fn [n] (+ n 1)) true))', 'seq expects a collection'],
    ['(vec (map (fn [n] (+ n 1)) false))', 'seq expects a collection'],
    ['(vec (map (fn [n] (+ n 1)) 0))', 'seq expects a collection'],
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
    // 2-arg filter returns a seq (list), matching Clojure semantics
    [
      '(filter (fn [n] (> n 2)) [1 2 3 4 5])',
      cljList([cljNumber(3), cljNumber(4), cljNumber(5)]),
    ],
    [
      "(filter (fn [n] (> n 2)) '(1 2 3 4 5))",
      cljList([cljNumber(3), cljNumber(4), cljNumber(5)]),
    ],
    [
      `(filter (fn [n] (not (= "a" n))) ["a" "b" "c" "a" "d" "e"])`,
      cljList([cljString('b'), cljString('c'), cljString('d'), cljString('e')]),
    ],
    [
      `(filter (fn [entry] (> (get entry 1) 2)) {:a 1 :b 2 :c 3 :d 4})`,
      cljList([
        cljVector([cljKeyword(':c'), cljNumber(3)]),
        cljVector([cljKeyword(':d'), cljNumber(4)]),
      ]),
    ],
    // nil collection returns empty seq
    ['(filter (fn [n] (> n 2)) nil)', cljList([])],
  ])('should evaluate filter: %s should be %s', (code, expected) => {
    const session = freshSession()
    const result = materialize(session.evaluate(code))
    expect(result).toMatchObject(expected)
  })

  it.each([
    ['(filter)', 'No matching arity for 0'],
    ['(vec (filter "a" [1 2 3]))', 'not callable'],
    ['(vec (filter (fn [n] (+ n 1)) true))', 'seq expects a collection'],
    ['(vec (filter (fn [n] (+ n 1)) false))', 'seq expects a collection'],
    ['(vec (filter (fn [n] (+ n 1)) 0))', 'seq expects a collection'],
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
    // take/drop return a seq (list), matching Clojure semantics
    ['(take 2 [1 2 3 4])', [cljNumber(1), cljNumber(2)]],
    ['(take 0 [1 2 3])', []],
    ['(take -1 [1 2 3])', []],
    ['(take 10 [1 2 3])', [cljNumber(1), cljNumber(2), cljNumber(3)]],
    ["(take 2 '(1 2 3 4))", [cljNumber(1), cljNumber(2)]],
    [
      '(take 2 {:a 1 :b 2 :c 3})',
      [
        cljVector([cljKeyword(':a'), cljNumber(1)]),
        cljVector([cljKeyword(':b'), cljNumber(2)]),
      ],
    ],
    ['(drop 2 [1 2 3 4])', [cljNumber(3), cljNumber(4)]],
    ['(drop 0 [1 2 3])', [cljNumber(1), cljNumber(2), cljNumber(3)]],
    ['(drop -1 [1 2 3])', [cljNumber(1), cljNumber(2), cljNumber(3)]],
    ['(drop 10 [1 2 3])', []],
    ["(drop 1 '(1 2 3))", [cljNumber(2), cljNumber(3)]],
  ])('should evaluate take / drop: %s → %s', (code, expected) => {
    const session = freshSession()
    const result = materialize(session.evaluate(code))
    expect(result).toMatchObject(
      cljList((expected as any[]).map(toCljValue))
    )
  })

  it.each([
    // take/drop are now lazy Clojure fns; errors surface on realization
    ['(vec (take "a" [1 2 3]))', 'expects a number'],
    ['(vec (drop "a" [1 2 3]))', 'expects a number'],
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
    const result = materialize(session.evaluate(code))
    const expectedList = cljList((expected as any[]).map(toCljValue))
    if ((expected as any[]).length === 0) {
      // (concat) may return nil; materialized nil stays nil — both represent empty seq
      expect(result.kind === 'nil' || (result.kind === 'list' && result.value.length === 0)).toBe(true)
    } else {
      expect(result).toMatchObject(expectedList)
    }
  })

  it.each([
    ['(vec (concat 1 [2 3]))', 'seq expects a collection'],
    ['(vec (concat [1 2] true))', 'seq expects a collection'],
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
      '(zipmap true [1 2])',
      'zipmap expects a collection or string as first argument',
    ],
    [
      '(zipmap [:a :b] 1)',
      'zipmap expects a collection or string as second argument',
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

describe('empty?', () => {
  it.each([
    ['(empty? [])', true],
    ["(empty? '())", true],
    ['(empty? {})', true],
    ['(empty? "")', true],
    ['(empty? nil)', true],
    ['(empty? [1 2])', false],
    ["(empty? '(1))", false],
    ['(empty? {:a 1})', false],
    ['(empty? "hello")', false],
  ])('should evaluate empty?: %s → %s', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(toCljValue(expected))
  })

  it.each([
    ['(empty? 42)', 'empty? expects a collection, string, or nil, got 42'],
    ['(empty? true)', 'empty? expects a collection, string, or nil, got true'],
  ])(
    'should throw on invalid empty? arguments: %s → "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('contains?', () => {
  it.each([
    ['(contains? {:a 1 :b 2} :a)', true],
    ['(contains? {:a 1 :b 2} :c)', false],
    // distinguishes absent key from key with nil value
    ['(contains? {:a nil} :a)', true],
    ['(contains? {:a nil} :b)', false],
    // vector index bounds
    ['(contains? [10 20 30] 0)', true],
    ['(contains? [10 20 30] 2)', true],
    ['(contains? [10 20 30] 3)', false],
    ['(contains? [10 20 30] -1)', false],
    // nil
    ['(contains? nil :a)', false],
    // non-number key on vector
    ['(contains? [1 2 3] :a)', false],
  ])('should evaluate contains?: %s → %s', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(toCljValue(expected))
  })

  it.each([
    ['(contains? "hello" 0)', "contains? expects a map, set, vector, or nil, got"],
    ['(contains? 42 0)', "contains? expects a map, set, vector, or nil, got"],
  ])(
    'should throw on invalid contains? arguments: %s → "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})
