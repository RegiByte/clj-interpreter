import { describe, expect, it } from 'vitest'
import { isEqual } from '../../assertions.ts'
import { v } from '../../factories.ts'
import type { CljMap, CljSymbol, CljValue } from '../../types.ts'
import { hashCljValue } from '../hash.ts'

// ─── shorthand factories ────────────────────────────────────────────────────

const n = (x: number) => v.number(x)
const s = (x: string) => v.string(x)
const kw = (name: string) => v.keyword(name)
const sym = (name: string) => v.symbol(name)
const nil = () => v.nil()
const bool = (x: boolean) => v.boolean(x)
const char = (c: string) => v.char(c)

// ─── helpers ────────────────────────────────────────────────────────────────

// Verify both that the pair is actually equal (per isEqual) and that hashes match.
// This catches bugs in both the test assumptions and the hash implementation.
function assertHashConsistency(a: CljValue, b: CljValue) {
  expect(isEqual(a, b)).toBe(true)
  expect(hashCljValue(a)).toBe(hashCljValue(b))
}

// ─── determinism ────────────────────────────────────────────────────────────

describe('hashCljValue', () => {
  describe('determinism — same call returns same number', () => {
    it('hash(nil) is deterministic', () => {
      const h = hashCljValue(nil())
      expect(hashCljValue(nil())).toBe(h)
      expect(hashCljValue(nil())).toBe(h)
    })

    it('hash(42) is deterministic', () => {
      const h = hashCljValue(n(42))
      expect(hashCljValue(n(42))).toBe(h)
      expect(hashCljValue(n(42))).toBe(h)
    })

    it('hash("hello") is deterministic', () => {
      const h = hashCljValue(s('hello'))
      expect(hashCljValue(s('hello'))).toBe(h)
      expect(hashCljValue(s('hello'))).toBe(h)
    })

    it('hash(:keyword) is deterministic', () => {
      const h = hashCljValue(kw(':foo'))
      expect(hashCljValue(kw(':foo'))).toBe(h)
      expect(hashCljValue(kw(':foo'))).toBe(h)
    })

    it('hash(symbol) is deterministic', () => {
      const h = hashCljValue(sym('foo'))
      expect(hashCljValue(sym('foo'))).toBe(h)
      expect(hashCljValue(sym('foo'))).toBe(h)
    })

    it('hash([1 2 3]) is deterministic', () => {
      const vec = v.vector([n(1), n(2), n(3)])
      const h = hashCljValue(vec)
      expect(hashCljValue(v.vector([n(1), n(2), n(3)]))).toBe(h)
      expect(hashCljValue(v.vector([n(1), n(2), n(3)]))).toBe(h)
    })
  })

  // ─── nil ─────────────────────────────────────────────────────────────────

  describe('nil', () => {
    it('returns a number (no crash)', () => {
      expect(typeof hashCljValue(nil())).toBe('number')
    })

    it('hash(nil) === hash(nil)', () => {
      expect(hashCljValue(nil())).toBe(hashCljValue(nil()))
    })

    it('hash(nil) is the constant 0', () => {
      expect(hashCljValue(nil())).toBe(0)
    })
  })

  // ─── boolean ─────────────────────────────────────────────────────────────

  describe('boolean', () => {
    it('hash(true) === hash(true)', () => {
      expect(hashCljValue(bool(true))).toBe(hashCljValue(bool(true)))
    })

    it('hash(false) === hash(false)', () => {
      expect(hashCljValue(bool(false))).toBe(hashCljValue(bool(false)))
    })

    it('hash(true) !== hash(false)', () => {
      expect(hashCljValue(bool(true))).not.toBe(hashCljValue(bool(false)))
    })

    it('hash(true) matches JVM Clojure constant 0x42108421', () => {
      expect(hashCljValue(bool(true))).toBe(0x42108421)
    })

    it('hash(false) matches JVM Clojure constant 0x42108420', () => {
      expect(hashCljValue(bool(false))).toBe(0x42108420)
    })
  })

  // ─── number ──────────────────────────────────────────────────────────────

  describe('number', () => {
    it('hash(42) === hash(42)', () => {
      expect(hashCljValue(n(42))).toBe(hashCljValue(n(42)))
    })

    it('hash(42) !== hash(43)', () => {
      expect(hashCljValue(n(42))).not.toBe(hashCljValue(n(43)))
    })

    it('hash(0) === hash(0)', () => {
      expect(hashCljValue(n(0))).toBe(hashCljValue(n(0)))
    })

    it('hash(-1) === hash(-1)', () => {
      expect(hashCljValue(n(-1))).toBe(hashCljValue(n(-1)))
    })

    it('hash(0) is 0 (integer identity in 32-bit range)', () => {
      expect(hashCljValue(n(0))).toBe(0)
    })

    it('hash(1) is 1', () => {
      expect(hashCljValue(n(1))).toBe(1)
    })

    it("hash(-1) is -1 (two's complement 32-bit)", () => {
      expect(hashCljValue(n(-1))).toBe(-1)
    })

    it('hash(3.14) === hash(3.14) — float determinism', () => {
      expect(hashCljValue(n(3.14))).toBe(hashCljValue(n(3.14)))
    })

    it('hash(3.14) !== hash(3) — float vs integer', () => {
      expect(hashCljValue(n(3.14))).not.toBe(hashCljValue(n(3)))
    })

    it('hash(1.0) === hash(1) — 1.0 is an integer in JS', () => {
      // Number.isInteger(1.0) is true in JS, so both take the integer path
      expect(hashCljValue(n(1.0))).toBe(hashCljValue(n(1)))
    })

    it('hash(NaN) returns a consistent number — no crash', () => {
      const h = hashCljValue(n(NaN))
      expect(typeof h).toBe('number')
      expect(hashCljValue(n(NaN))).toBe(h)
    })

    it('hash(Infinity) returns a consistent number', () => {
      const h = hashCljValue(n(Infinity))
      expect(typeof h).toBe('number')
      expect(hashCljValue(n(Infinity))).toBe(h)
    })

    it('hash(large integer > 2^31) uses float path', () => {
      // 2^32 is outside the signed 32-bit range — uses float bit XOR path
      const h = hashCljValue(n(2 ** 32))
      expect(typeof h).toBe('number')
      expect(hashCljValue(n(2 ** 32))).toBe(h)
    })
  })

  // ─── string ──────────────────────────────────────────────────────────────

  describe('string', () => {
    it('hash("foo") === hash("foo")', () => {
      expect(hashCljValue(s('foo'))).toBe(hashCljValue(s('foo')))
    })

    it('hash("foo") !== hash("bar")', () => {
      expect(hashCljValue(s('foo'))).not.toBe(hashCljValue(s('bar')))
    })

    it('hash("") === hash("")', () => {
      expect(hashCljValue(s(''))).toBe(hashCljValue(s('')))
    })

    it('hash("abc") !== hash("bca") — position matters', () => {
      expect(hashCljValue(s('abc'))).not.toBe(hashCljValue(s('bca')))
    })

    it('hash("a") !== hash("aa") — length matters', () => {
      expect(hashCljValue(s('a'))).not.toBe(hashCljValue(s('aa')))
    })
  })

  // ─── keyword ─────────────────────────────────────────────────────────────

  describe('keyword', () => {
    it('hash(:foo) === hash(:foo)', () => {
      expect(hashCljValue(kw(':foo'))).toBe(hashCljValue(kw(':foo')))
    })

    it('hash(:foo) !== hash(:bar)', () => {
      expect(hashCljValue(kw(':foo'))).not.toBe(hashCljValue(kw(':bar')))
    })

    it('hash(:a) !== hash(:b)', () => {
      expect(hashCljValue(kw(':a'))).not.toBe(hashCljValue(kw(':b')))
    })
  })

  // ─── symbol ──────────────────────────────────────────────────────────────

  describe('symbol', () => {
    it('hash(foo) === hash(foo) — same name, different objects', () => {
      expect(hashCljValue(sym('foo'))).toBe(hashCljValue(sym('foo')))
    })

    it('hash(foo) !== hash(bar)', () => {
      expect(hashCljValue(sym('foo'))).not.toBe(hashCljValue(sym('bar')))
    })

    it('hash(ns/name) === hash(ns/name) — qualified symbol', () => {
      expect(hashCljValue(sym('clojure.core/map'))).toBe(
        hashCljValue(sym('clojure.core/map'))
      )
    })
  })

  // ─── keyword vs symbol separation (critical) ─────────────────────────────

  describe('keyword vs symbol — same name must produce different hashes', () => {
    it('hash(:foo) !== hash(foo) — same name string, different types', () => {
      expect(hashCljValue(kw(':foo'))).not.toBe(hashCljValue(sym('foo')))
    })

    it('hash(:a) !== hash(a)', () => {
      expect(hashCljValue(kw(':a'))).not.toBe(hashCljValue(sym('a')))
    })

    it('keyword does not collide with string of same name', () => {
      expect(hashCljValue(kw(':foo'))).not.toBe(hashCljValue(s('foo')))
    })

    it('symbol does not collide with string of same name', () => {
      expect(hashCljValue(sym('foo'))).not.toBe(hashCljValue(s('foo')))
    })
  })

  // ─── character ───────────────────────────────────────────────────────────

  describe('character', () => {
    it('hash(\\a) === hash(\\a)', () => {
      expect(hashCljValue(char('a'))).toBe(hashCljValue(char('a')))
    })

    it('hash(\\a) !== hash(\\b)', () => {
      expect(hashCljValue(char('a'))).not.toBe(hashCljValue(char('b')))
    })

    it('hash(\\a) !== hash(number(97)) — char is not the same as its codepoint', () => {
      expect(hashCljValue(char('a'))).not.toBe(hashCljValue(n(97)))
    })

    it('hash(\\a) !== hash(string("a")) — char is not the same as a single-char string', () => {
      expect(hashCljValue(char('a'))).not.toBe(hashCljValue(s('a')))
    })

    it('hash(\\space) === hash(\\space)', () => {
      expect(hashCljValue(char(' '))).toBe(hashCljValue(char(' ')))
    })
  })

  // ─── cross-type sequential equality (THE critical invariant) ─────────────

  describe('cross-type sequential equality — list, vector, cons, lazy-seq with same elements must hash identically', () => {
    it('hash([1 2 3]) === hash(\'(1 2 3))', () => {
      const vec = v.vector([n(1), n(2), n(3)])
      const lst = v.list([n(1), n(2), n(3)])
      expect(hashCljValue(vec)).toBe(hashCljValue(lst))
    })

    it('hash([]) === hash(\'())', () => {
      const vec = v.vector([])
      const lst = v.list([])
      expect(hashCljValue(vec)).toBe(hashCljValue(lst))
    })

    it('hash([:a :b :c]) === hash(\'(:a :b :c))', () => {
      const vec = v.vector([kw(':a'), kw(':b'), kw(':c')])
      const lst = v.list([kw(':a'), kw(':b'), kw(':c')])
      expect(hashCljValue(vec)).toBe(hashCljValue(lst))
    })

    it('hash(cons chain) === hash(list with same elements)', () => {
      // (cons 1 (cons 2 (cons 3 '()))) should equal '(1 2 3)
      const consChain = v.cons(n(1), v.cons(n(2), v.cons(n(3), v.list([]))))
      const lst = v.list([n(1), n(2), n(3)])
      expect(hashCljValue(consChain)).toBe(hashCljValue(lst))
    })

    it('hash(cons chain) === hash(vector with same elements)', () => {
      const consChain = v.cons(n(1), v.cons(n(2), v.cons(n(3), v.list([]))))
      const vec = v.vector([n(1), n(2), n(3)])
      expect(hashCljValue(consChain)).toBe(hashCljValue(vec))
    })

    it('hash(cons with list tail) === hash(flat list)', () => {
      // (cons 1 '(2 3)) === '(1 2 3)
      const consWithTail = v.cons(n(1), v.list([n(2), n(3)]))
      const lst = v.list([n(1), n(2), n(3)])
      expect(hashCljValue(consWithTail)).toBe(hashCljValue(lst))
    })

    it('hash(cons with vector tail) === hash(flat list)', () => {
      const consWithTail = v.cons(n(1), v.vector([n(2), n(3)]))
      const lst = v.list([n(1), n(2), n(3)])
      expect(hashCljValue(consWithTail)).toBe(hashCljValue(lst))
    })

    it('hash(lazy-seq realizing to a list) === hash(that list)', () => {
      const lazyList = v.lazySeq(() => v.list([n(1), n(2), n(3)]))
      const lst = v.list([n(1), n(2), n(3)])
      expect(hashCljValue(lazyList)).toBe(hashCljValue(lst))
    })

    it('hash(lazy-seq realizing to a vector) === hash(that vector)', () => {
      const lazyVec = v.lazySeq(() => v.vector([n(1), n(2)]))
      const vec = v.vector([n(1), n(2)])
      expect(hashCljValue(lazyVec)).toBe(hashCljValue(vec))
    })

    it('hash(lazy-seq of lazy-seq) resolves the chain', () => {
      const inner = v.lazySeq(() => v.list([n(1)]))
      const outer = v.lazySeq(() => inner)
      const lst = v.list([n(1)])
      expect(hashCljValue(outer)).toBe(hashCljValue(lst))
    })

    it('hash(empty lazy-seq) === hash(nil)', () => {
      // Unrealized thunk-less lazy-seq realizes to nil
      const emptyLazy = v.lazySeq(() => v.nil())
      expect(hashCljValue(emptyLazy)).toBe(hashCljValue(nil()))
    })

    it('[1 2 3] and \'(1 2 3) are structurally distinct but hash equally', () => {
      const vec = v.vector([n(1), n(2), n(3)])
      const lst = v.list([n(1), n(2), n(3)])
      // Verify the vectors are different JS objects
      expect(vec).not.toBe(lst)
      // But hash the same
      expect(hashCljValue(vec)).toBe(hashCljValue(lst))
    })
  })

  // ─── map order-independence ───────────────────────────────────────────────

  describe('map — order-independent hashing', () => {
    it('hash({:a 1, :b 2}) === hash({:b 2, :a 1})', () => {
      const map1 = v.map([[kw(':a'), n(1)], [kw(':b'), n(2)]])
      const map2 = v.map([[kw(':b'), n(2)], [kw(':a'), n(1)]])
      expect(hashCljValue(map1)).toBe(hashCljValue(map2))
    })

    it('hash({}) === hash({})', () => {
      expect(hashCljValue(v.map([]))).toBe(hashCljValue(v.map([])))
    })

    it('hash({:a 1}) === hash({:a 1})', () => {
      expect(hashCljValue(v.map([[kw(':a'), n(1)]]))).toBe(
        hashCljValue(v.map([[kw(':a'), n(1)]]))
      )
    })

    it('hash({:a 1, :b 2, :c 3}) === hash({:c 3, :a 1, :b 2}) — 3-entry permutation', () => {
      const map1 = v.map([[kw(':a'), n(1)], [kw(':b'), n(2)], [kw(':c'), n(3)]])
      const map2 = v.map([[kw(':c'), n(3)], [kw(':a'), n(1)], [kw(':b'), n(2)]])
      expect(hashCljValue(map1)).toBe(hashCljValue(map2))
    })

    it('hash({:a 1}) !== hash({:a 2}) — different values', () => {
      const map1 = v.map([[kw(':a'), n(1)]])
      const map2 = v.map([[kw(':a'), n(2)]])
      expect(hashCljValue(map1)).not.toBe(hashCljValue(map2))
    })

    it('hash({:a 1}) !== hash({:b 1}) — different keys', () => {
      const map1 = v.map([[kw(':a'), n(1)]])
      const map2 = v.map([[kw(':b'), n(1)]])
      expect(hashCljValue(map1)).not.toBe(hashCljValue(map2))
    })

    it('hash({:a 1}) !== hash({:a 1, :b 2}) — different entry count', () => {
      const map1 = v.map([[kw(':a'), n(1)]])
      const map2 = v.map([[kw(':a'), n(1)], [kw(':b'), n(2)]])
      expect(hashCljValue(map1)).not.toBe(hashCljValue(map2))
    })

    it('nil as map key: hash({nil :found}) is consistent', () => {
      const map = v.map([[nil(), kw(':found')]])
      expect(hashCljValue(map)).toBe(hashCljValue(v.map([[nil(), kw(':found')]])))
    })

    it('nil as map value: hash({:k nil}) is consistent', () => {
      const map = v.map([[kw(':k'), nil()]])
      expect(hashCljValue(map)).toBe(hashCljValue(v.map([[kw(':k'), nil()]])))
    })
  })

  // ─── set order-independence ───────────────────────────────────────────────

  describe('set — order-independent hashing', () => {
    it('hash(#{:a :b}) === hash(#{:b :a})', () => {
      const set1 = v.set([kw(':a'), kw(':b')])
      const set2 = v.set([kw(':b'), kw(':a')])
      expect(hashCljValue(set1)).toBe(hashCljValue(set2))
    })

    it('hash(#{}) === hash(#{})', () => {
      expect(hashCljValue(v.set([]))).toBe(hashCljValue(v.set([])))
    })

    it('hash(#{:a :b :c}) === hash(#{:c :b :a}) — 3-element permutation', () => {
      const set1 = v.set([kw(':a'), kw(':b'), kw(':c')])
      const set2 = v.set([kw(':c'), kw(':b'), kw(':a')])
      expect(hashCljValue(set1)).toBe(hashCljValue(set2))
    })

    it('hash(#{:a}) !== hash(#{:b})', () => {
      expect(hashCljValue(v.set([kw(':a')]))).not.toBe(
        hashCljValue(v.set([kw(':b')]))
      )
    })

    it('hash(#{:a}) !== hash(#{:a :b}) — different cardinality', () => {
      expect(hashCljValue(v.set([kw(':a')]))).not.toBe(
        hashCljValue(v.set([kw(':a'), kw(':b')]))
      )
    })
  })

  // ─── metadata is ignored ─────────────────────────────────────────────────

  describe('metadata is ignored for hashing', () => {
    it('vector with meta hashes same as vector without meta', () => {
      const meta = v.map([[kw(':x'), n(1)]]) as CljMap
      const withMeta = v.vector([n(1), n(2)])
      withMeta.meta = meta
      const withoutMeta = v.vector([n(1), n(2)])
      expect(hashCljValue(withMeta)).toBe(hashCljValue(withoutMeta))
    })

    it('list with meta hashes same as list without meta', () => {
      const meta = v.map([[kw(':doc'), s('hello')]]) as CljMap
      const withMeta = { kind: 'list' as const, value: [n(1), n(2)], meta }
      const withoutMeta = v.list([n(1), n(2)])
      expect(hashCljValue(withMeta)).toBe(hashCljValue(withoutMeta))
    })

    it('map with meta hashes same as map without meta', () => {
      const outerMeta = v.map([[kw(':source'), s('reader')]]) as CljMap
      const withMetaBase = v.map([[kw(':a'), n(1)]])
      withMetaBase.meta = outerMeta
      const withMeta = withMetaBase
      const withoutMeta = v.map([[kw(':a'), n(1)]])
      expect(hashCljValue(withMeta)).toBe(hashCljValue(withoutMeta))
    })

    it('symbol with meta hashes same as symbol without meta', () => {
      const meta = v.map([[kw(':private'), bool(true)]]) as CljMap
      const withMeta: CljSymbol = { kind: 'symbol', name: 'my-var', meta }
      const withoutMeta = v.symbol('my-var')
      expect(hashCljValue(withMeta)).toBe(hashCljValue(withoutMeta))
    })

    it('symbol metadata does not affect cross-symbol equality of names', () => {
      const meta1 = v.map([[kw(':line'), n(10)]]) as CljMap
      const meta2 = v.map([[kw(':line'), n(99)]]) as CljMap
      const sym1: CljSymbol = { kind: 'symbol', name: 'foo', meta: meta1 }
      const sym2: CljSymbol = { kind: 'symbol', name: 'foo', meta: meta2 }
      expect(hashCljValue(sym1)).toBe(hashCljValue(sym2))
    })
  })

  // ─── records ─────────────────────────────────────────────────────────────

  describe('records — type identity is included in hash', () => {
    it('hash(Circle{:r 5}) === hash(Circle{:r 5}) — same type, same fields', () => {
      const r1 = v.record('Circle', 'my.shapes', [[kw(':r'), n(5)]], [':r'])
      const r2 = v.record('Circle', 'my.shapes', [[kw(':r'), n(5)]], [':r'])
      expect(hashCljValue(r1)).toBe(hashCljValue(r2))
    })

    it('hash(Circle{:r 5}) !== hash({:r 5}) — record vs plain map', () => {
      const rec = v.record('Circle', 'my.shapes', [[kw(':r'), n(5)]], [':r'])
      const map = v.map([[kw(':r'), n(5)]])
      expect(hashCljValue(rec)).not.toBe(hashCljValue(map))
    })

    it('hash(Circle{:r 5}) !== hash(Square{:r 5}) — different types', () => {
      const circle = v.record('Circle', 'my.shapes', [[kw(':r'), n(5)]], [':r'])
      const square = v.record('Square', 'my.shapes', [[kw(':r'), n(5)]], [':r'])
      expect(hashCljValue(circle)).not.toBe(hashCljValue(square))
    })

    it('hash(Circle{:r 5}) !== hash(my.shapes/Circle{:r 5} in other-ns) — namespace matters', () => {
      const r1 = v.record('Circle', 'my.shapes', [[kw(':r'), n(5)]], [':r'])
      const r2 = v.record('Circle', 'other.ns', [[kw(':r'), n(5)]], [':r'])
      expect(hashCljValue(r1)).not.toBe(hashCljValue(r2))
    })

    it('hash(Circle{:r 5}) !== hash(Circle{:r 6}) — different field values', () => {
      const r1 = v.record('Circle', 'my.shapes', [[kw(':r'), n(5)]], [':r'])
      const r2 = v.record('Circle', 'my.shapes', [[kw(':r'), n(6)]], [':r'])
      expect(hashCljValue(r1)).not.toBe(hashCljValue(r2))
    })

    it('empty record fields: hash({} as record) is consistent', () => {
      const r1 = v.record('Empty', 'my.ns', [], [])
      const r2 = v.record('Empty', 'my.ns', [], [])
      expect(hashCljValue(r1)).toBe(hashCljValue(r2))
    })
  })

  // ─── reduced (structural wrapper) ────────────────────────────────────────

  describe('reduced — structural equality means structural hash', () => {
    it('hash(reduced(42)) === hash(reduced(42)) — same content, different objects', () => {
      expect(hashCljValue(v.reduced(n(42)))).toBe(hashCljValue(v.reduced(n(42))))
    })

    it('hash(reduced(42)) !== hash(number(42)) — reduced is not its content', () => {
      expect(hashCljValue(v.reduced(n(42)))).not.toBe(hashCljValue(n(42)))
    })

    it('hash(reduced(42)) !== hash(reduced(43))', () => {
      expect(hashCljValue(v.reduced(n(42)))).not.toBe(hashCljValue(v.reduced(n(43))))
    })

    it('hash(reduced(:foo)) === hash(reduced(:foo))', () => {
      expect(hashCljValue(v.reduced(kw(':foo')))).toBe(
        hashCljValue(v.reduced(kw(':foo')))
      )
    })

    it('hash(reduced([1 2])) === hash(reduced(\'(1 2))) — preserves cross-type sequential equality', () => {
      const withVec = v.reduced(v.vector([n(1), n(2)]))
      const withList = v.reduced(v.list([n(1), n(2)]))
      expect(hashCljValue(withVec)).toBe(hashCljValue(withList))
    })
  })

  // ─── reference / identity types ──────────────────────────────────────────

  describe('reference types — hash by object identity', () => {
    it('two different atom objects hash differently', () => {
      const a1 = v.atom(n(42))
      const a2 = v.atom(n(42))
      expect(a1).not.toBe(a2)
      expect(hashCljValue(a1)).not.toBe(hashCljValue(a2))
    })

    it('same atom object always hashes the same', () => {
      const atom = v.atom(n(42))
      expect(hashCljValue(atom)).toBe(hashCljValue(atom))
      expect(hashCljValue(atom)).toBe(hashCljValue(atom))
    })

    it('two different var objects hash differently', () => {
      const var1 = v.var('user', 'x', n(1))
      const var2 = v.var('user', 'x', n(1))
      expect(var1).not.toBe(var2)
      expect(hashCljValue(var1)).not.toBe(hashCljValue(var2))
    })

    it('same var object always hashes the same', () => {
      const theVar = v.var('user', 'my-fn', nil())
      expect(hashCljValue(theVar)).toBe(hashCljValue(theVar))
      expect(hashCljValue(theVar)).toBe(hashCljValue(theVar))
    })

    it('two different namespace objects hash differently', () => {
      const ns1 = v.namespace('user')
      const ns2 = v.namespace('user') // same name, different object
      expect(ns1).not.toBe(ns2)
      expect(hashCljValue(ns1)).not.toBe(hashCljValue(ns2))
    })

    it('same namespace object always hashes the same', () => {
      const ns = v.namespace('clojure.core')
      expect(hashCljValue(ns)).toBe(hashCljValue(ns))
    })

    it('two different delay objects hash differently', () => {
      const d1 = v.delay(() => n(1))
      const d2 = v.delay(() => n(1))
      expect(d1).not.toBe(d2)
      expect(hashCljValue(d1)).not.toBe(hashCljValue(d2))
    })

    it('two different regex objects hash differently — reference equality', () => {
      const r1 = v.regex('foo', '')
      const r2 = v.regex('foo', '') // same pattern, different object
      expect(r1).not.toBe(r2)
      expect(hashCljValue(r1)).not.toBe(hashCljValue(r2))
    })

    it('same regex object always hashes the same', () => {
      const re = v.regex('foo', 'g')
      expect(hashCljValue(re)).toBe(hashCljValue(re))
    })

    it('volatile: same object hashes consistently', () => {
      const vol = v.volatile(n(99))
      expect(hashCljValue(vol)).toBe(hashCljValue(vol))
    })

    it('two different volatile objects hash differently', () => {
      const v1 = v.volatile(n(99))
      const v2 = v.volatile(n(99))
      expect(v1).not.toBe(v2)
      expect(hashCljValue(v1)).not.toBe(hashCljValue(v2))
    })

    it('js-value wrapper: same wrapper object hashes consistently', () => {
      const jsv = v.jsValue({ x: 1 })
      expect(hashCljValue(jsv)).toBe(hashCljValue(jsv))
    })

    it('two different js-value wrappers hash differently (even for same JS value)', () => {
      const inner = { x: 1 }
      const jsv1 = v.jsValue(inner)
      const jsv2 = v.jsValue(inner) // same inner value, different CljJsValue wrapper
      expect(jsv1).not.toBe(jsv2)
      expect(hashCljValue(jsv1)).not.toBe(hashCljValue(jsv2))
    })

    it('js-value with primitive inner value: no crash', () => {
      const jsv = v.jsValue(42)
      expect(typeof hashCljValue(jsv)).toBe('number')
    })

    it('js-value with null inner value: no crash', () => {
      const jsv = v.jsValue(null)
      expect(typeof hashCljValue(jsv)).toBe('number')
    })
  })

  // ─── nested values ────────────────────────────────────────────────────────

  describe('nested values', () => {
    it('hash({:a {:b 1}}) === hash({:a {:b 1}})', () => {
      const nested = v.map([[kw(':a'), v.map([[kw(':b'), n(1)]])]])
      const nested2 = v.map([[kw(':a'), v.map([[kw(':b'), n(1)]])]])
      expect(hashCljValue(nested)).toBe(hashCljValue(nested2))
    })

    it('hash([[1 2] [3 4]]) === hash([[1 2] [3 4]])', () => {
      const mat1 = v.vector([v.vector([n(1), n(2)]), v.vector([n(3), n(4)])])
      const mat2 = v.vector([v.vector([n(1), n(2)]), v.vector([n(3), n(4)])])
      expect(hashCljValue(mat1)).toBe(hashCljValue(mat2))
    })

    it('hash([{:a 1} {:a 2}]) === hash(\'({:a 1} {:a 2})) — nested cross-type seq', () => {
      const vecOfMaps = v.vector([v.map([[kw(':a'), n(1)]]), v.map([[kw(':a'), n(2)]])])
      const listOfMaps = v.list([v.map([[kw(':a'), n(1)]]), v.map([[kw(':a'), n(2)]])])
      expect(hashCljValue(vecOfMaps)).toBe(hashCljValue(listOfMaps))
    })

    it('hash({:a 1, :b 2}) === hash({:b 2, :a 1}) works for nested maps too', () => {
      // Nested map with different insertion order in the inner map
      const outer1 = v.map([[kw(':x'), v.map([[kw(':a'), n(1)], [kw(':b'), n(2)]])]])
      const outer2 = v.map([[kw(':x'), v.map([[kw(':b'), n(2)], [kw(':a'), n(1)]])]])
      expect(hashCljValue(outer1)).toBe(hashCljValue(outer2))
    })

    it('hash(#{[1 2] [1 2]}) — set of vectors is consistent', () => {
      const set1 = v.set([v.vector([n(1), n(2)]), v.vector([n(3), n(4)])])
      const set2 = v.set([v.vector([n(3), n(4)]), v.vector([n(1), n(2)])])
      expect(hashCljValue(set1)).toBe(hashCljValue(set2))
    })
  })

  // ─── NaN ─────────────────────────────────────────────────────────────────

  describe('NaN', () => {
    it('hash(NaN) does not throw or return undefined', () => {
      const h = hashCljValue(n(NaN))
      expect(typeof h).toBe('number')
      expect(isNaN(h)).toBe(false) // the HASH itself should not be NaN
    })

    it('hash(NaN) is deterministic across calls', () => {
      const h1 = hashCljValue(n(NaN))
      const h2 = hashCljValue(n(NaN))
      expect(h1).toBe(h2)
    })
  })

  // ─── returns an integer ───────────────────────────────────────────────────

  describe('return value is always a 32-bit integer', () => {
    const cases: [string, CljValue][] = [
      ['nil', nil()],
      ['true', bool(true)],
      ['false', bool(false)],
      ['0', n(0)],
      ['42', n(42)],
      ['3.14', n(3.14)],
      ['"hello"', s('hello')],
      [':foo', kw(':foo')],
      ['sym(foo)', sym('foo')],
      ['char(a)', char('a')],
      ['[1 2]', v.vector([n(1), n(2)])],
      ["'(1 2)", v.list([n(1), n(2)])],
      ['{:a 1}', v.map([[kw(':a'), n(1)]])],
      ['#{:a}', v.set([kw(':a')])],
    ]

    for (const [label, value] of cases) {
      it(`hash(${label}) is a finite integer`, () => {
        const h = hashCljValue(value)
        expect(typeof h).toBe('number')
        expect(isFinite(h)).toBe(true)
        expect(Number.isInteger(h)).toBe(true)
      })
    }
  })

  // ─── isEqual consistency sweep ────────────────────────────────────────────
  //
  // These are the gold-standard tests. For every pair (a, b) where
  // isEqual(a, b) === true, hashCljValue(a) must === hashCljValue(b).

  describe('isEqual consistency sweep — hash(a) === hash(b) whenever isEqual(a, b)', () => {
    it('nil === nil', () => {
      assertHashConsistency(nil(), nil())
    })

    it('true === true', () => {
      assertHashConsistency(bool(true), bool(true))
    })

    it('false === false', () => {
      assertHashConsistency(bool(false), bool(false))
    })

    it('42 === 42', () => {
      assertHashConsistency(n(42), n(42))
    })

    it('1.5 === 1.5', () => {
      assertHashConsistency(n(1.5), n(1.5))
    })

    it('"foo" === "foo"', () => {
      assertHashConsistency(s('foo'), s('foo'))
    })

    it(':foo === :foo', () => {
      assertHashConsistency(kw(':foo'), kw(':foo'))
    })

    it('symbol(foo) === symbol(foo) — same name, different JS objects', () => {
      assertHashConsistency(sym('foo'), sym('foo'))
    })

    it('char(a) === char(a)', () => {
      assertHashConsistency(char('a'), char('a'))
    })

    it('[1 2 3] === [1 2 3]', () => {
      assertHashConsistency(v.vector([n(1), n(2), n(3)]), v.vector([n(1), n(2), n(3)]))
    })

    it("'(1 2 3) === '(1 2 3)", () => {
      assertHashConsistency(v.list([n(1), n(2), n(3)]), v.list([n(1), n(2), n(3)]))
    })

    it("[1 2 3] === '(1 2 3) — cross-type sequential (critical)", () => {
      assertHashConsistency(v.vector([n(1), n(2), n(3)]), v.list([n(1), n(2), n(3)]))
    })

    it("'(1 2 3) === [1 2 3] — reverse cross-type (critical)", () => {
      assertHashConsistency(v.list([n(1), n(2), n(3)]), v.vector([n(1), n(2), n(3)]))
    })

    it("[] === '() — empty cross-type sequential", () => {
      assertHashConsistency(v.vector([]), v.list([]))
    })

    it('cons chain equals list with same elements', () => {
      const consChain = v.cons(n(1), v.cons(n(2), v.cons(n(3), v.list([]))))
      const lst = v.list([n(1), n(2), n(3)])
      assertHashConsistency(consChain, lst)
    })

    it('cons chain equals vector with same elements', () => {
      const consChain = v.cons(n(1), v.cons(n(2), v.list([])))
      const vec = v.vector([n(1), n(2)])
      assertHashConsistency(consChain, vec)
    })

    it('{:a 1, :b 2} === {:b 2, :a 1} — map order-independence', () => {
      assertHashConsistency(
        v.map([[kw(':a'), n(1)], [kw(':b'), n(2)]]),
        v.map([[kw(':b'), n(2)], [kw(':a'), n(1)]])
      )
    })

    it('{} === {}', () => {
      assertHashConsistency(v.map([]), v.map([]))
    })

    it('#{:a :b} === #{:b :a} — set order-independence', () => {
      assertHashConsistency(v.set([kw(':a'), kw(':b')]), v.set([kw(':b'), kw(':a')]))
    })

    it('reduced(42) === reduced(42) — structural wrapper', () => {
      assertHashConsistency(v.reduced(n(42)), v.reduced(n(42)))
    })

    it('reduced([1 2]) === reduced(\'(1 2)) — reduced preserves cross-type seq equality', () => {
      assertHashConsistency(
        v.reduced(v.vector([n(1), n(2)])),
        v.reduced(v.list([n(1), n(2)]))
      )
    })

    it('{:a {:b 1}} === {:a {:b 1}} — nested map equality', () => {
      assertHashConsistency(
        v.map([[kw(':a'), v.map([[kw(':b'), n(1)]])]]),
        v.map([[kw(':a'), v.map([[kw(':b'), n(1)]])]])
      )
    })

    it('[[1 2] [3 4]] === [[1 2] [3 4]] — nested vector equality', () => {
      assertHashConsistency(
        v.vector([v.vector([n(1), n(2)]), v.vector([n(3), n(4)])]),
        v.vector([v.vector([n(1), n(2)]), v.vector([n(3), n(4)])])
      )
    })

    it('vector with meta === same vector without meta', () => {
      const meta = v.map([[kw(':x'), n(1)]]) as CljMap
      const withMeta = v.vector([n(1), n(2)])
      withMeta.meta = meta
      const withoutMeta = v.vector([n(1), n(2)])
      // isEqual ignores meta, so they're equal
      assertHashConsistency(withMeta, withoutMeta)
    })

    it('record Circle{:r 5} === record Circle{:r 5}', () => {
      assertHashConsistency(
        v.record('Circle', 'shapes', [[kw(':r'), n(5)]], [':r']),
        v.record('Circle', 'shapes', [[kw(':r'), n(5)]], [':r'])
      )
    })
  })
})
