import { describe, expect, it } from 'vitest'
import { freshSession } from '../evaluator/__tests__/evaluator-test-utils'

function s() {
  const session = freshSession()
  session.evaluate('(ns user (:require [clojure.set :as set]))')
  return session
}

describe('clojure.set/union', () => {
  it('union of two sets', () => {
    const r = s().evaluate('(set/union #{1 2} #{2 3})')
    expect(r.kind).toBe('set')
    expect((r as any).values).toHaveLength(3)
  })

  it('union with empty set', () => {
    const r = s().evaluate('(set/union #{1 2} #{})')
    expect((r as any).values).toHaveLength(2)
  })

  it('0-arity returns empty set', () => {
    const r = s().evaluate('(set/union)')
    expect(r).toMatchObject({ kind: 'set' })
    expect((r as any).values).toHaveLength(0)
  })

  it('3-arity union', () => {
    const r = s().evaluate('(set/union #{1} #{2} #{3})')
    expect((r as any).values).toHaveLength(3)
  })
})

describe('clojure.set/intersection', () => {
  it('intersection of overlapping sets', () => {
    const r = s().evaluate('(set/intersection #{1 2 3} #{2 3 4})')
    expect((r as any).values).toHaveLength(2)
  })

  it('intersection of disjoint sets', () => {
    const r = s().evaluate('(set/intersection #{1 2} #{3 4})')
    expect((r as any).values).toHaveLength(0)
  })

  it('1-arity returns same set', () => {
    const r = s().evaluate('(set/intersection #{1 2 3})')
    expect((r as any).values).toHaveLength(3)
  })
})

describe('clojure.set/difference', () => {
  it('removes elements in second set', () => {
    const r = s().evaluate('(set/difference #{1 2 3} #{2})')
    expect((r as any).values).toHaveLength(2)
  })

  it('difference with empty set returns original', () => {
    const r = s().evaluate('(set/difference #{1 2 3} #{})')
    expect((r as any).values).toHaveLength(3)
  })

  it('1-arity returns same set', () => {
    const r = s().evaluate('(set/difference #{1 2})')
    expect((r as any).values).toHaveLength(2)
  })
})

describe('clojure.set/select', () => {
  it('filters elements by predicate', () => {
    const r = s().evaluate('(set/select even? #{1 2 3 4})')
    expect((r as any).values).toHaveLength(2)
  })

  it('returns empty set when no match', () => {
    const r = s().evaluate('(set/select neg? #{1 2 3})')
    expect((r as any).values).toHaveLength(0)
  })
})

describe('clojure.set/subset?', () => {
  it('true when s1 is subset of s2', () => {
    const r = s().evaluate('(set/subset? #{1 2} #{1 2 3})')
    expect(r).toMatchObject({ kind: 'boolean', value: true })
  })

  it('false when s1 is not a subset', () => {
    const r = s().evaluate('(set/subset? #{1 4} #{1 2 3})')
    expect(r).toMatchObject({ kind: 'boolean', value: false })
  })

  it('empty set is subset of everything', () => {
    const r = s().evaluate('(set/subset? #{} #{1 2})')
    expect(r).toMatchObject({ kind: 'boolean', value: true })
  })
})

describe('clojure.set/superset?', () => {
  it('true when s1 is superset of s2', () => {
    const r = s().evaluate('(set/superset? #{1 2 3} #{1 2})')
    expect(r).toMatchObject({ kind: 'boolean', value: true })
  })

  it('false when s1 is not a superset', () => {
    const r = s().evaluate('(set/superset? #{1 2} #{1 2 3})')
    expect(r).toMatchObject({ kind: 'boolean', value: false })
  })
})

describe('clojure.set/map-invert', () => {
  it('swaps keys and values', () => {
    const r = s().evaluate('(set/map-invert {:a 1 :b 2})')
    expect(r.kind).toBe('map')
    const m = r as any
    const entry1 = m.entries.find(([k]: any) => k.value === 1)
    expect(entry1?.[1]).toMatchObject({ kind: 'keyword', name: ':a' })
  })
})

describe('clojure.set/rename-keys', () => {
  it('renames specified keys', () => {
    const r = s().evaluate('(set/rename-keys {:a 1 :b 2} {:a :x})')
    expect(r.kind).toBe('map')
    const m = r as any
    const hasX = m.entries.some(([k]: any) => k.name === ':x')
    const hasA = m.entries.some(([k]: any) => k.name === ':a')
    expect(hasX).toBe(true)
    expect(hasA).toBe(false)
  })
})
