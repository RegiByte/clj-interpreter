import { describe, expect, it, vi } from 'vitest'
import {
  cljBoolean,
  cljKeyword,
  cljList,
  cljMap,
  cljNil,
  cljNumber,
  cljString,
  cljVector,
} from '../factories'
import { createSession } from '../session'
import { expectError, freshSession, toCljValue } from './evaluator-test-utils'
describe('str', () => {
  it.each([
    ['(str)', ''],
    ['(str "hello")', 'hello'],
    ['(str "hello" " " "world")', 'hello world'],
    ['(str 1 2 3)', '123'],
    ['(str "x:" 42)', 'x:42'],
    ['(str [1 2 3])', '[1 2 3]'],
    ['(str {:a 1})', '{:a 1}'],
    ['(str nil)', 'nil'],
    ['(str true false)', 'truefalse'],
  ])(
    'str should concatenate arguments to string: %s should be %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(cljString(expected))
    }
  )
})

describe('println', () => {
  it('println should call output callback and return nil', () => {
    const outputs: string[] = []
    const session = createSession({ output: (text) => outputs.push(text) })

    expect(session.evaluate('(println "Hello" "world")')).toMatchObject(
      cljNil()
    )
    expect(outputs).toEqual(['Hello world'])

    expect(session.evaluate('(println 1 2 3)')).toMatchObject(cljNil())
    expect(outputs).toEqual(['Hello world', '1 2 3'])
  })

  it('println falls back to console.log when no output callback provided', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(freshSession().evaluate('(println "test")')).toMatchObject(cljNil())
    expect(spy).toHaveBeenCalledWith('test')
    spy.mockRestore()
  })
})

describe('eval', () => {
  it.each([
    ['(eval (quote (+ 1 2 3)))', 6],
    ["(eval '(+ 1 2 3))", 6],
    [
      `(eval '(def x 10))
  (eval 'x)`,
      10,
    ],
  ])(
    'should evaluate eval core function %s should be %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected))
    }
  )

  it.each([['(eval)', 'eval expects a form as argument']])(
    'should throw on invalid eval arguments: %s should throw "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('apply', () => {
  it.each([
    ['(apply + [1 2 3])', 6],
    ['(apply + 42 [1 2 3])', 48],
    ['(apply + 0 [1 2 3])', 6],
  ])(
    'should evaluate apply core function %s should be %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected))
    }
  )

  it('(apply map ...) returns a seq (list)', () => {
    const session = freshSession()
    const result = session.evaluate(
      `(def inc (fn [n] (+ n 1)))
       (apply map [inc [1 2 3 4 5]])`
    )
    expect(result).toMatchObject(
      cljList([cljNumber(2), cljNumber(3), cljNumber(4), cljNumber(5), cljNumber(6)])
    )
  })
})

describe('juxt', () => {
  it.each([
    ['((juxt inc dec) 10)', [11, 9]],
    ['((juxt + *) 2 3 4)', [9, 24]],
    ['((juxt first last count) [1 2 3 4])', [1, 4, 4]],
    ['((juxt) 1 2 3)', []],
  ])(
    'should evaluate juxt core function: %s should be %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected))
    }
  )

  it.each([
    ['((juxt 1) 10)', 'apply expects a callable as first argument, got 1'],
    ['((juxt (fn [x] x)) 1 2)', 'No matching arity for 2'],
  ])(
    'should throw on invalid juxt usage: %s should throw "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('merge', () => {
  it.each([
    ['(merge)', null],
    [
      '(merge {:a 1} {:b 2})',
      cljMap([
        [cljKeyword(':a'), cljNumber(1)],
        [cljKeyword(':b'), cljNumber(2)],
      ]),
    ],
    [
      '(merge {:a 1} {:a 2 :b 3})',
      cljMap([
        [cljKeyword(':a'), cljNumber(2)],
        [cljKeyword(':b'), cljNumber(3)],
      ]),
    ],
    ['(merge nil {:a 1})', cljMap([[cljKeyword(':a'), cljNumber(1)]])],
  ])('should evaluate merge core function: %s', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(toCljValue(expected))
  })

  it.each([['(merge 1 {:a 2})', 'assoc expects a collection, got 1']])(
    'should throw on invalid merge arguments: %s → "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('select-keys', () => {
  it.each([
    [
      '(select-keys {:a 1 :b 2} [:a])',
      cljMap([[cljKeyword(':a'), cljNumber(1)]]),
    ],
    [
      '(select-keys {:a nil :b 2} [:a])',
      cljMap([[cljKeyword(':a'), cljNil()]]),
    ],
    ['(select-keys nil [:a])', cljMap([])],
    ['(select-keys {:a 1} nil)', cljMap([])],
  ])('should evaluate select-keys core function: %s', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(toCljValue(expected))
  })

  it.each([['(select-keys {:a 1} 1)', 'reduce expects a collection']])(
    'should throw on invalid select-keys arguments: %s → "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('update', () => {
  it.each([
    [
      '(update {:a 1 :b 2} :a inc)',
      cljMap([
        [cljKeyword(':a'), cljNumber(2)],
        [cljKeyword(':b'), cljNumber(2)],
      ]),
    ],
    [
      '(update {:a [1]} :a conj 2 3)',
      cljMap([
        [
          cljKeyword(':a'),
          cljVector([cljNumber(1), cljNumber(2), cljNumber(3)]),
        ],
      ]),
    ],
    [
      '(update nil :a (fn [x] (if (nil? x) 0 x)))',
      cljMap([[cljKeyword(':a'), cljNumber(0)]]),
    ],
  ])('should evaluate update core function: %s', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(toCljValue(expected))
  })

  it.each([
    ['(update {:a 1} :a 42)', 'f is not callable'],
    ['(update)', 'No matching arity for 0'],
  ])(
    'should throw on invalid update arguments: %s → "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('frequencies', () => {
  it.each([
    [
      '(frequencies [1 1 2 3 2])',
      cljMap([
        [cljNumber(1), cljNumber(2)],
        [cljNumber(2), cljNumber(2)],
        [cljNumber(3), cljNumber(1)],
      ]),
    ],
    ['(frequencies nil)', cljMap([])],
  ])('should evaluate frequencies core function: %s', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(toCljValue(expected))
  })

  it.each([['(frequencies 42)', 'reduce expects a collection']])(
    'should throw on invalid frequencies arguments: %s → "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('group-by', () => {
  it.each([
    [
      '(group-by odd? [1 2 3 4])',
      cljMap([
        [cljBoolean(true), cljVector([cljNumber(1), cljNumber(3)])],
        [cljBoolean(false), cljVector([cljNumber(2), cljNumber(4)])],
      ]),
    ],
    ['(group-by inc nil)', cljMap([])],
  ])('should evaluate group-by core function: %s', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(toCljValue(expected))
  })

  it.each([['(group-by 42 [1 2])', 'not callable']])(
    'should throw on invalid group-by arguments: %s → "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('distinct', () => {
  it.each([
    ['(distinct [1 2 1 3 2])', [1, 2, 3]],
    ["(distinct '(1 1 2 2 3))", [1, 2, 3]],
    ['(distinct nil)', []],
  ])('should evaluate distinct core function: %s', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(toCljValue(expected))
  })

  it.each([['(distinct 42)', 'reduce expects a collection']])(
    'should throw on invalid distinct arguments: %s → "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('flatten', () => {
  it.each([
    ['(flatten [1 [2 [3 4] []] 5])', [1, 2, 3, 4, 5]],
    ["(flatten '((1 2) (3 (4))))", [1, 2, 3, 4]],
    ['(flatten nil)', []],
    ['(flatten 42)', [42]],
  ])('should evaluate flatten core function: %s', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(toCljValue(expected))
  })
})

describe('reduce-kv', () => {
  it.each([
    ['(reduce-kv (fn [acc k v] (+ acc k v)) 0 [10 20 30])', 63],
    [
      '(reduce-kv (fn [acc k v] (assoc acc k (* v 2))) {} {:a 1 :b 2})',
      cljMap([
        [cljKeyword(':a'), cljNumber(2)],
        [cljKeyword(':b'), cljNumber(4)],
      ]),
    ],
  ])('should evaluate reduce-kv core function: %s', (code, expected) => {
    const session = freshSession()
    const result = session.evaluate(code)
    expect(result).toMatchObject(toCljValue(expected))
  })

  it.each([
    ["(reduce-kv + 0 '(1 2))", 'reduce-kv expects a map or vector'],
  ])(
    'should throw on invalid reduce-kv arguments: %s → "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('sort and sort-by', () => {
  it.each([
    ['(sort [3 1 2])', [1, 2, 3]],
    ['(sort > [3 1 2])', [3, 2, 1]],
    ['(sort (fn [a b] (- b a)) [1 3 2])', [3, 2, 1]],
    ['(sort nil)', []],
    [
      '(sort-by first [[2 "b"] [1 "a"] [3 "c"]])',
      [
        [1, 'a'],
        [2, 'b'],
        [3, 'c'],
      ],
    ],
    [
      '(sort-by first > [[2 "b"] [1 "a"] [3 "c"]])',
      [
        [3, 'c'],
        [2, 'b'],
        [1, 'a'],
      ],
    ],
  ])(
    'should evaluate sort/sort-by core functions: %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected))
    }
  )

  it.each([
    ['(sort)', 'No matching arity for 0'],
    ['(sort 42)', 'reduce expects a collection'],
    ['(sort-by inc)', 'No matching arity for 1'],
  ])(
    'should throw on invalid sort/sort-by arguments: %s → "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('comp', () => {
  it.each([
    ['((comp) 42)', 42],
    ['((comp inc) 1)', 2],
    ['((comp inc inc) 1)', 3],
    ['((comp str inc) 41)', '42'],
    // composed in right-to-left order: first inc, then str
    ['((comp str inc dec) 5)', '5'],
  ])(
    'should evaluate comp: %s → %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected))
    }
  )

  it('comp with a keyword (IFn) — most common real-world use case', () => {
    const session = freshSession()
    const result = session.evaluate(
      `(def users [{:name "Alice" :role :admin} {:name "Bob" :role :user}])
       (filter (comp #(= % :admin) :role) users)`
    )
    expect(result).toMatchObject(
      cljList([cljMap([[cljKeyword(':name'), cljString('Alice')], [cljKeyword(':role'), cljKeyword(':admin')]])])
    )
  })

  it('(comp :role) as a standalone extractor', () => {
    const session = freshSession()
    const result = session.evaluate('((comp :name) {:name "Alice" :age 30})')
    expect(result).toMatchObject(cljString('Alice'))
  })

  it.each([
    ['(comp 1 inc)', 'comp expects functions'],
  ])(
    'should throw on non-callable arguments: %s → "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})

describe('partial', () => {
  it.each([
    ['((partial + 10) 5)', 15],
    ['((partial + 10) 5 3)', 18],
    ['((partial str "hello") " world")', 'hello world'],
    ['((partial map inc) [1 2 3])', cljList([cljNumber(2), cljNumber(3), cljNumber(4)])],
  ])(
    'should evaluate partial: %s → %s',
    (code, expected) => {
      const session = freshSession()
      const result = session.evaluate(code)
      expect(result).toMatchObject(toCljValue(expected as any))
    }
  )

  it('partial with a keyword', () => {
    const session = freshSession()
    const result = session.evaluate('((partial :name) {:name "Alice"})')
    expect(result).toMatchObject(cljString('Alice'))
  })

  it.each([
    ['(partial 42)', 'partial expects a callable'],
  ])(
    'should throw on non-callable first argument: %s → "%s"',
    (code, expected) => {
      expectError(code, expected)
    }
  )
})
