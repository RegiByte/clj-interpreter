import { describe, expect, it } from 'vitest'
import { freshSession, materialize } from './evaluator-test-utils'

function ev(code: string) {
  const session = freshSession()
  return session.evaluate(code)
}

describe('Sequence utilities', () => {
  it('butlast', () => {
    expect(ev('(butlast [1 2 3])')).toMatchObject({ kind: 'list' })
    expect(ev('(into [] (butlast [1 2 3]))')).toMatchObject({
      kind: 'vector', value: [
        { kind: 'number', value: 1 },
        { kind: 'number', value: 2 },
      ]
    })
    expect(ev('(butlast [1])')).toMatchObject({ kind: 'nil' })
    expect(ev('(butlast [])')).toMatchObject({ kind: 'nil' })
  })

  it('fnext / nnext / nthnext / nthrest', () => {
    expect(ev('(fnext [1 2 3])')).toMatchObject({ value: 2 })
    expect(ev('(nnext [1 2 3])')).toMatchObject({ kind: 'list' })
    expect(ev('(first (nnext [1 2 3]))')).toMatchObject({ value: 3 })
    expect(ev('(nthnext [1 2 3 4] 2)')).toMatchObject({ kind: 'list' })
    expect(ev('(first (nthnext [1 2 3 4] 2))')).toMatchObject({ value: 3 })
    expect(ev('(into [] (nthrest [1 2 3 4] 2))')).toMatchObject({
      kind: 'vector', value: [
        { kind: 'number', value: 3 },
        { kind: 'number', value: 4 },
      ]
    })
  })

  it('list*', () => {
    expect(ev('(into [] (list* [1 2 3]))')).toMatchObject({
      kind: 'vector', value: [
        { value: 1 }, { value: 2 }, { value: 3 }
      ]
    })
    expect(ev('(into [] (list* 0 [1 2]))')).toMatchObject({
      kind: 'vector', value: [
        { value: 0 }, { value: 1 }, { value: 2 }
      ]
    })
  })
})

describe('Collection utilities', () => {
  it('vec', () => {
    expect(ev('(vec \'(1 2 3))')).toMatchObject({
      kind: 'vector', value: [{ value: 1 }, { value: 2 }, { value: 3 }]
    })
    expect(ev('(vec nil)')).toMatchObject({ kind: 'vector', value: [] })
    expect(ev('(vec #{1 2})')).toMatchObject({ kind: 'vector' })
  })

  it('subvec', () => {
    expect(ev('(subvec [1 2 3 4 5] 2)')).toMatchObject({
      kind: 'vector', value: [{ value: 3 }, { value: 4 }, { value: 5 }]
    })
    expect(ev('(subvec [1 2 3 4 5] 1 3)')).toMatchObject({
      kind: 'vector', value: [{ value: 2 }, { value: 3 }]
    })
  })

  it('peek', () => {
    expect(ev('(peek [1 2 3])')).toMatchObject({ value: 3 })
    expect(ev('(peek \'(1 2 3))')).toMatchObject({ value: 1 })
    expect(ev('(peek nil)')).toMatchObject({ kind: 'nil' })
  })

  it('pop', () => {
    expect(ev('(pop [1 2 3])')).toMatchObject({
      kind: 'vector', value: [{ value: 1 }, { value: 2 }]
    })
    expect(ev('(pop \'(1 2 3))')).toMatchObject({
      kind: 'list', value: [{ value: 2 }, { value: 3 }]
    })
  })

  it('empty', () => {
    expect(ev('(empty [1 2])')).toMatchObject({ kind: 'vector', value: [] })
    expect(ev('(empty \'(1 2))')).toMatchObject({ kind: 'list', value: [] })
    expect(ev('(empty {:a 1})')).toMatchObject({ kind: 'map', entries: [] })
    expect(ev('(empty nil)')).toMatchObject({ kind: 'nil' })
  })

  it('not-empty', () => {
    expect(ev('(not-empty [1 2])')).toMatchObject({ kind: 'vector' })
    expect(ev('(not-empty [])')).toMatchObject({ kind: 'nil' })
    expect(ev('(not-empty nil)')).toMatchObject({ kind: 'nil' })
  })

  it('mapv', () => {
    expect(ev('(mapv inc [1 2 3])')).toMatchObject({
      kind: 'vector', value: [{ value: 2 }, { value: 3 }, { value: 4 }]
    })
  })

  it('filterv', () => {
    expect(ev('(filterv even? [1 2 3 4])')).toMatchObject({
      kind: 'vector', value: [{ value: 2 }, { value: 4 }]
    })
  })

  it('run!', () => {
    const session = freshSession()
    const result = session.evaluate('(run! identity [1 2 3])')
    expect(result).toMatchObject({ kind: 'nil' })
  })
})

describe('HOF: keep, keep-indexed, mapcat', () => {
  it('keep - eager', () => {
    expect(ev('(into [] (keep #(if (even? %) %) [1 2 3 4 5]))')).toMatchObject({
      kind: 'vector', value: [{ value: 2 }, { value: 4 }]
    })
  })

  it('keep - transducer', () => {
    expect(ev('(into [] (keep #(if (even? %) %)) [1 2 3 4 5])')).toMatchObject({
      kind: 'vector', value: [{ value: 2 }, { value: 4 }]
    })
  })

  it('keep-indexed - eager', () => {
    expect(ev('(into [] (keep-indexed (fn [idx v] (if (even? idx) v)) [:a :b :c :d]))')).toMatchObject({
      kind: 'vector', value: [{ name: ':a' }, { name: ':c' }]
    })
  })

  it('mapcat - eager', () => {
    expect(ev('(into [] (mapcat #(list % %) [1 2 3]))')).toMatchObject({
      kind: 'vector', value: [
        { value: 1 }, { value: 1 },
        { value: 2 }, { value: 2 },
        { value: 3 }, { value: 3 },
      ]
    })
  })

  it('mapcat - transducer', () => {
    expect(ev('(into [] (mapcat #(list % %)) [1 2 3])')).toMatchObject({
      kind: 'vector', value: [
        { value: 1 }, { value: 1 },
        { value: 2 }, { value: 2 },
        { value: 3 }, { value: 3 },
      ]
    })
  })
})

describe('interleave / interpose', () => {
  it('interleave two colls', () => {
    expect(ev('(into [] (interleave [1 2 3] [:a :b :c]))')).toMatchObject({
      kind: 'vector', value: [
        { value: 1 }, { name: ':a' },
        { value: 2 }, { name: ':b' },
        { value: 3 }, { name: ':c' },
      ]
    })
  })

  it('interleave uneven', () => {
    expect(ev('(into [] (interleave [1 2] [:a :b :c]))')).toMatchObject({
      kind: 'vector', value: [
        { value: 1 }, { name: ':a' },
        { value: 2 }, { name: ':b' },
      ]
    })
  })

  it('interpose', () => {
    expect(ev('(into [] (interpose :sep [1 2 3]))')).toMatchObject({
      kind: 'vector', value: [
        { value: 1 }, { name: ':sep' },
        { value: 2 }, { name: ':sep' },
        { value: 3 },
      ]
    })
  })

  it('interpose - transducer', () => {
    expect(ev('(into [] (interpose :sep) [1 2 3])')).toMatchObject({
      kind: 'vector', value: [
        { value: 1 }, { name: ':sep' },
        { value: 2 }, { name: ':sep' },
        { value: 3 },
      ]
    })
  })
})

describe('iterate / repeatedly / cycle / take-nth', () => {
  it('iterate', () => {
    expect(ev('(iterate inc 0 5)')).toMatchObject({
      kind: 'vector', value: [
        { value: 0 }, { value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }
      ]
    })
  })

  it('repeatedly', () => {
    const result = ev('(count (repeatedly 5 (fn [] 42)))')
    expect(result).toMatchObject({ value: 5 })
  })

  it('cycle', () => {
    expect(ev('(cycle 3 [1 2])')).toMatchObject({
      kind: 'vector', value: [
        { value: 1 }, { value: 2 },
        { value: 1 }, { value: 2 },
        { value: 1 }, { value: 2 },
      ]
    })
  })

  it('take-nth - eager', () => {
    expect(ev('(into [] (take-nth 2 [0 1 2 3 4 5]))')).toMatchObject({
      kind: 'vector', value: [{ value: 0 }, { value: 2 }, { value: 4 }]
    })
  })

  it('take-nth - transducer', () => {
    expect(ev('(into [] (take-nth 3) (range 10))')).toMatchObject({
      kind: 'vector', value: [{ value: 0 }, { value: 3 }, { value: 6 }, { value: 9 }]
    })
  })
})

describe('partition / partition-by / reductions', () => {
  it('partition', () => {
    expect(ev('(partition 2 [1 2 3 4 5])')).toMatchObject({
      kind: 'vector', value: [
        { kind: 'vector', value: [{ value: 1 }, { value: 2 }] },
        { kind: 'vector', value: [{ value: 3 }, { value: 4 }] },
      ]
    })
  })

  it('partition with step', () => {
    expect(ev('(partition 2 1 [1 2 3 4])')).toMatchObject({
      kind: 'vector', value: [
        { kind: 'vector', value: [{ value: 1 }, { value: 2 }] },
        { kind: 'vector', value: [{ value: 2 }, { value: 3 }] },
        { kind: 'vector', value: [{ value: 3 }, { value: 4 }] },
      ]
    })
  })

  it('partition with pad', () => {
    expect(ev('(partition 3 3 [0] [1 2 3 4 5])')).toMatchObject({
      kind: 'vector', value: [
        { kind: 'vector', value: [{ value: 1 }, { value: 2 }, { value: 3 }] },
        { kind: 'vector', value: [{ value: 4 }, { value: 5 }, { value: 0 }] },
      ]
    })
  })

  it('partition-by', () => {
    expect(materialize(ev('(partition-by odd? [1 1 2 2 3])'))).toMatchObject({
      kind: 'list', value: [
        { kind: 'vector', value: [{ value: 1 }, { value: 1 }] },
        { kind: 'vector', value: [{ value: 2 }, { value: 2 }] },
        { kind: 'vector', value: [{ value: 3 }] },
      ]
    })
  })

  it('reductions', () => {
    expect(ev('(reductions + [1 2 3 4])')).toMatchObject({
      kind: 'vector', value: [
        { value: 1 }, { value: 3 }, { value: 6 }, { value: 10 }
      ]
    })
  })

  it('reductions with init', () => {
    expect(ev('(reductions + 0 [1 2 3])')).toMatchObject({
      kind: 'vector', value: [
        { value: 0 }, { value: 1 }, { value: 3 }, { value: 6 }
      ]
    })
  })
})

describe('split-at / split-with', () => {
  it('split-at', () => {
    const result = ev('(split-at 2 [1 2 3 4 5])')
    expect(result).toMatchObject({
      kind: 'vector', value: [
        { kind: 'vector', value: [{ value: 1 }, { value: 2 }] },
        { kind: 'vector', value: [{ value: 3 }, { value: 4 }, { value: 5 }] },
      ]
    })
  })

  it('split-with', () => {
    const result = ev('(split-with #(< % 3) [1 2 3 4 5])')
    expect(result).toMatchObject({
      kind: 'vector', value: [
        { kind: 'vector', value: [{ value: 1 }, { value: 2 }] },
        { kind: 'vector', value: [{ value: 3 }, { value: 4 }, { value: 5 }] },
      ]
    })
  })
})

describe('merge-with / update-keys / update-vals', () => {
  it('merge-with', () => {
    expect(ev('(merge-with + {:a 1 :b 2} {:a 3 :c 4})')).toMatchObject({
      kind: 'map'
    })
    expect(ev('(get (merge-with + {:a 1 :b 2} {:a 3 :c 4}) :a)')).toMatchObject({ value: 4 })
    expect(ev('(get (merge-with + {:a 1 :b 2} {:a 3 :c 4}) :b)')).toMatchObject({ value: 2 })
    expect(ev('(get (merge-with + {:a 1 :b 2} {:a 3 :c 4}) :c)')).toMatchObject({ value: 4 })
  })

  it('update-keys', () => {
    expect(ev('(get (update-keys {:a 1 :b 2} name) "a")')).toMatchObject({ value: 1 })
  })

  it('update-vals', () => {
    expect(ev('(get (update-vals {:a 1 :b 2} inc) :a)')).toMatchObject({ value: 2 })
  })
})

describe('memoize', () => {
  it('caches results', () => {
    const session = freshSession()
    session.evaluate('(def call-count (atom 0))')
    session.evaluate('(def mf (memoize (fn [x] (swap! call-count inc) (* x x))))')
    expect(session.evaluate('(mf 5)')).toMatchObject({ value: 25 })
    expect(session.evaluate('(mf 5)')).toMatchObject({ value: 25 })
    expect(session.evaluate('@call-count')).toMatchObject({ value: 1 })
    expect(session.evaluate('(mf 6)')).toMatchObject({ value: 36 })
    expect(session.evaluate('@call-count')).toMatchObject({ value: 2 })
  })
})

describe('trampoline', () => {
  it('bounces until non-fn', () => {
    expect(ev('(trampoline (fn [] 42))')).toMatchObject({ value: 42 })
  })

  it('mutual recursion', () => {
    const session = freshSession()
    session.evaluate('(defn my-even? [n] (if (zero? n) true (fn [] (my-odd? (dec n)))))')
    session.evaluate('(defn my-odd? [n] (if (zero? n) false (fn [] (my-even? (dec n)))))')
    expect(session.evaluate('(trampoline my-even? 10)')).toMatchObject({ value: true })
    expect(session.evaluate('(trampoline my-odd? 10)')).toMatchObject({ value: false })
  })
})

describe('Macros: conditionals', () => {
  it('if-some', () => {
    expect(ev('(if-some [x 42] x :none)')).toMatchObject({ value: 42 })
    expect(ev('(if-some [x nil] x :none)')).toMatchObject({ name: ':none' })
    expect(ev('(if-some [x false] x :none)')).toMatchObject({ value: false })
  })

  it('when-some', () => {
    expect(ev('(when-some [x 42] (inc x))')).toMatchObject({ value: 43 })
    expect(ev('(when-some [x nil] (inc x))')).toMatchObject({ kind: 'nil' })
  })

  it('when-first', () => {
    expect(ev('(when-first [x [1 2 3]] x)')).toMatchObject({ value: 1 })
    expect(ev('(when-first [x []] x)')).toMatchObject({ kind: 'nil' })
  })

  it('condp', () => {
    expect(ev('(condp = 1 1 :one 2 :two :default)')).toMatchObject({ name: ':one' })
    expect(ev('(condp = 2 1 :one 2 :two :default)')).toMatchObject({ name: ':two' })
    expect(ev('(condp = 3 1 :one 2 :two :default)')).toMatchObject({ name: ':default' })
  })

  it('case', () => {
    expect(ev('(case 1 1 :one 2 :two :default)')).toMatchObject({ name: ':one' })
    expect(ev('(case 2 1 :one 2 :two :default)')).toMatchObject({ name: ':two' })
    expect(ev('(case 3 1 :one 2 :two :default)')).toMatchObject({ name: ':default' })
  })

  it('case throws on no match without default', () => {
    expect(() => ev('(case 99 1 :one 2 :two)')).toThrow()
  })
})

describe('Macros: iteration', () => {
  it('dotimes', () => {
    const session = freshSession()
    session.evaluate('(def result (atom []))')
    session.evaluate('(dotimes [i 3] (swap! result conj i))')
    expect(session.evaluate('@result')).toMatchObject({
      kind: 'vector', value: [{ value: 0 }, { value: 1 }, { value: 2 }]
    })
  })

  it('while', () => {
    const session = freshSession()
    session.evaluate('(def cnt (atom 0))')
    session.evaluate('(while (< @cnt 5) (swap! cnt inc))')
    expect(session.evaluate('@cnt')).toMatchObject({ value: 5 })
  })

  it('doseq - basic', () => {
    const session = freshSession()
    session.evaluate('(def result (atom []))')
    session.evaluate('(doseq [x [1 2 3]] (swap! result conj x))')
    expect(session.evaluate('@result')).toMatchObject({
      kind: 'vector', value: [{ value: 1 }, { value: 2 }, { value: 3 }]
    })
  })

  it('doseq - nested', () => {
    const session = freshSession()
    session.evaluate('(def result (atom []))')
    session.evaluate('(doseq [x [1 2] y [:a :b]] (swap! result conj [x y]))')
    const result = session.evaluate('@result')
    expect(result).toMatchObject({ kind: 'vector' })
    expect((result as any).value.length).toBe(4)
  })

  it('for - basic', () => {
    expect(ev('(into [] (for [x [1 2 3]] (* x x)))')).toMatchObject({
      kind: 'vector', value: [{ value: 1 }, { value: 4 }, { value: 9 }]
    })
  })

  it('for - nested', () => {
    const result = ev('(into [] (for [x [1 2] y [3 4]] [x y]))')
    expect(result).toMatchObject({ kind: 'vector' })
    expect((result as any).value.length).toBe(4)
  })

  it('for - with :when', () => {
    expect(ev('(into [] (for [x (range 10) :when (even? x)] x))')).toMatchObject({
      kind: 'vector', value: [{ value: 0 }, { value: 2 }, { value: 4 }, { value: 6 }, { value: 8 }]
    })
  })

  it('for - with :let', () => {
    expect(ev('(into [] (for [x [1 2 3] :let [y (* x x)]] y))')).toMatchObject({
      kind: 'vector', value: [{ value: 1 }, { value: 4 }, { value: 9 }]
    })
  })
})

describe('Arithmetic: abs, quot, rem', () => {
  it('abs', () => {
    expect(ev('(abs -5)')).toMatchObject({ value: 5 })
    expect(ev('(abs 5)')).toMatchObject({ value: 5 })
    expect(ev('(abs 0)')).toMatchObject({ value: 0 })
  })

  it('quot', () => {
    expect(ev('(quot 10 3)')).toMatchObject({ value: 3 })
    expect(ev('(quot -10 3)')).toMatchObject({ value: -3 })
  })

  it('rem', () => {
    expect(ev('(rem 10 3)')).toMatchObject({ value: 1 })
    expect(ev('(rem -10 3)')).toMatchObject({ value: -1 })
  })
})

describe('Random functions', () => {
  it('rand returns number in range', () => {
    const result = ev('(rand)')
    expect(result.kind).toBe('number')
    expect((result as any).value).toBeGreaterThanOrEqual(0)
    expect((result as any).value).toBeLessThan(1)
  })

  it('rand with n', () => {
    const result = ev('(rand 100)')
    expect(result.kind).toBe('number')
    expect((result as any).value).toBeGreaterThanOrEqual(0)
    expect((result as any).value).toBeLessThan(100)
  })

  it('rand-int', () => {
    const result = ev('(rand-int 10)')
    expect(result.kind).toBe('number')
    expect(Number.isInteger((result as any).value)).toBe(true)
  })

  it('rand-nth', () => {
    const result = ev('(rand-nth [1 2 3])')
    expect(result.kind).toBe('number')
    expect([1, 2, 3]).toContain((result as any).value)
  })

  it('shuffle returns same elements', () => {
    expect(ev('(count (shuffle [1 2 3 4 5]))')).toMatchObject({ value: 5 })
    expect(ev('(sort (shuffle [1 2 3 4 5]))')).toMatchObject({
      kind: 'vector', value: [
        { value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }
      ]
    })
  })
})

describe('Bit operations', () => {
  it('bit-and', () => expect(ev('(bit-and 5 3)')).toMatchObject({ value: 1 }))
  it('bit-or', () => expect(ev('(bit-or 5 3)')).toMatchObject({ value: 7 }))
  it('bit-xor', () => expect(ev('(bit-xor 5 3)')).toMatchObject({ value: 6 }))
  it('bit-not', () => expect(ev('(bit-not 0)')).toMatchObject({ value: -1 }))
  it('bit-shift-left', () => expect(ev('(bit-shift-left 1 4)')).toMatchObject({ value: 16 }))
  it('bit-shift-right', () => expect(ev('(bit-shift-right 16 4)')).toMatchObject({ value: 1 }))
})

describe('Predicates', () => {
  it('identical?', () => {
    expect(ev('(identical? 1 1)')).toMatchObject({ value: false }) // different objects
    expect(ev('(let [x [1]] (identical? x x))')).toMatchObject({ value: true })
  })

  it('seqable?', () => {
    expect(ev('(seqable? [1 2])')).toMatchObject({ value: true })
    expect(ev('(seqable? "hi")')).toMatchObject({ value: true })
    expect(ev('(seqable? 42)')).toMatchObject({ value: false })
    expect(ev('(seqable? nil)')).toMatchObject({ value: false })
  })

  it('sequential?', () => {
    expect(ev('(sequential? [1])')).toMatchObject({ value: true })
    expect(ev('(sequential? \'(1))')).toMatchObject({ value: true })
    expect(ev('(sequential? {:a 1})')).toMatchObject({ value: false })
  })

  it('associative?', () => {
    expect(ev('(associative? {:a 1})')).toMatchObject({ value: true })
    expect(ev('(associative? [1 2])')).toMatchObject({ value: true })
    expect(ev('(associative? \'(1))')).toMatchObject({ value: false })
  })

  it('counted?', () => {
    expect(ev('(counted? [1])')).toMatchObject({ value: true })
    expect(ev('(counted? "hi")')).toMatchObject({ value: true })
  })

  it('int?', () => {
    expect(ev('(int? 42)')).toMatchObject({ value: true })
    expect(ev('(int? 42.5)')).toMatchObject({ value: false })
  })

  it('compare', () => {
    expect(ev('(compare 1 2)')).toMatchObject({ value: -1 })
    expect(ev('(compare 2 1)')).toMatchObject({ value: 1 })
    expect(ev('(compare 1 1)')).toMatchObject({ value: 0 })
    expect(ev('(compare "a" "b")')).toMatchObject({ value: -1 })
  })

  it('hash', () => {
    expect(ev('(number? (hash 42))')).toMatchObject({ value: true })
    expect(ev('(= (hash :foo) (hash :foo))')).toMatchObject({ value: true })
  })
})

describe('read-string', () => {
  it('reads a form', () => {
    expect(ev('(read-string "(+ 1 2)")')).toMatchObject({ kind: 'list' })
    expect(ev('(eval (read-string "(+ 1 2)"))')).toMatchObject({ value: 3 })
  })

  it('returns nil for empty', () => {
    expect(ev('(read-string "")')).toMatchObject({ kind: 'nil' })
  })
})

describe('Print functions', () => {
  it('pr-str', () => {
    expect(ev('(pr-str "hello")')).toMatchObject({ value: '"hello"' })
    expect(ev('(pr-str 1 2 3)')).toMatchObject({ value: '1 2 3' })
  })

  it('prn-str', () => {
    expect(ev('(prn-str 1 2)')).toMatchObject({ value: '1 2\n' })
  })

  it('print-str', () => {
    expect(ev('(print-str "hello")')).toMatchObject({ value: 'hello' })
  })

  it('println-str', () => {
    expect(ev('(println-str "hello" "world")')).toMatchObject({ value: 'hello world\n' })
  })
})

describe('letfn', () => {
  it('basic binding', () => {
    expect(ev('(letfn [(f [x] (+ x 1))] (f 5))')).toMatchObject({ value: 6 })
  })

  it('mutual recursion', () => {
    const result = ev(`
      (letfn [(my-even? [n] (if (zero? n) true (my-odd? (dec n))))
              (my-odd? [n] (if (zero? n) false (my-even? (dec n))))]
        [(my-even? 10) (my-odd? 10)])
    `)
    expect(result).toMatchObject({
      kind: 'vector', value: [
        { kind: 'boolean', value: true },
        { kind: 'boolean', value: false },
      ]
    })
  })

  it('multi-arity', () => {
    expect(ev(`
      (letfn [(f ([x] (f x 10))
                 ([x y] (+ x y)))]
        (f 5))
    `)).toMatchObject({ value: 15 })
  })
})

describe('clojure.walk', () => {
  it('postwalk', () => {
    const session = freshSession()
    session.evaluate('(require \'[clojure.walk :as w])')
    expect(session.evaluate('(w/postwalk #(if (number? %) (inc %) %) [1 2 [3 4]])')).toMatchObject({
      kind: 'vector', value: [
        { value: 2 }, { value: 3 },
        { kind: 'vector', value: [{ value: 4 }, { value: 5 }] }
      ]
    })
  })

  it('prewalk', () => {
    const session = freshSession()
    session.evaluate('(require \'[clojure.walk :as w])')
    expect(session.evaluate('(w/prewalk #(if (number? %) (inc %) %) [1 2 [3]])')).toMatchObject({
      kind: 'vector', value: [
        { value: 2 }, { value: 3 },
        { kind: 'vector', value: [{ value: 4 }] }
      ]
    })
  })

  it('keywordize-keys', () => {
    const session = freshSession()
    session.evaluate('(require \'[clojure.walk :as w])')
    expect(session.evaluate('(get (w/keywordize-keys {"a" 1 "b" 2}) :a)')).toMatchObject({ value: 1 })
  })

  it('stringify-keys', () => {
    const session = freshSession()
    session.evaluate('(require \'[clojure.walk :as w])')
    expect(session.evaluate('(get (w/stringify-keys {:a 1 :b 2}) "a")')).toMatchObject({ value: 1 })
  })

  it('postwalk-replace', () => {
    const session = freshSession()
    session.evaluate('(require \'[clojure.walk :as w])')
    expect(session.evaluate('(w/postwalk-replace {:a :b} [:a :c :a])')).toMatchObject({
      kind: 'vector', value: [
        { name: ':b' }, { name: ':c' }, { name: ':b' }
      ]
    })
  })
})

describe('symbol function', () => {
  it('creates symbol from string', () => {
    expect(ev('(symbol "foo")')).toMatchObject({ kind: 'symbol', name: 'foo' })
  })

  it('creates qualified symbol', () => {
    expect(ev('(symbol "ns" "foo")')).toMatchObject({ kind: 'symbol', name: 'ns/foo' })
  })

  it('returns symbol as-is', () => {
    expect(ev("(symbol 'foo)")).toMatchObject({ kind: 'symbol', name: 'foo' })
  })
})
