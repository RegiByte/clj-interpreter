import { describe, expect, it } from 'vitest'
import { freshSession, materialize } from './evaluator-test-utils'

describe('as->', () => {
  it('threads through multiple forms using named binding', () => {
    const s = freshSession()
    const r = s.evaluate('(as-> 1 x (+ x 1) (* x 2))')
    expect(r).toMatchObject({ kind: 'number', value: 4 })
  })

  it('returns expr unchanged with no forms', () => {
    const s = freshSession()
    const r = s.evaluate('(as-> 42 x)')
    expect(r).toMatchObject({ kind: 'number', value: 42 })
  })

  it('binding name can appear anywhere in the form', () => {
    const s = freshSession()
    const r = s.evaluate('(as-> [1 2 3] v (conj v 4) (count v))')
    expect(r).toMatchObject({ kind: 'number', value: 4 })
  })

  it('single form', () => {
    const s = freshSession()
    const r = s.evaluate('(as-> 5 n (* n n))')
    expect(r).toMatchObject({ kind: 'number', value: 25 })
  })
})

describe('cond->', () => {
  it('threads when test is true', () => {
    const s = freshSession()
    const r = s.evaluate('(cond-> 1 true inc)')
    expect(r).toMatchObject({ kind: 'number', value: 2 })
  })

  it('skips step when test is false', () => {
    const s = freshSession()
    const r = s.evaluate('(cond-> 1 false inc)')
    expect(r).toMatchObject({ kind: 'number', value: 1 })
  })

  it('multiple steps, mixed conditions', () => {
    const s = freshSession()
    const r = s.evaluate('(cond-> 0 true inc true inc false inc)')
    expect(r).toMatchObject({ kind: 'number', value: 2 })
  })

  it('no clauses returns expr', () => {
    const s = freshSession()
    const r = s.evaluate('(cond-> 42)')
    expect(r).toMatchObject({ kind: 'number', value: 42 })
  })

  it('works with list form (threads as first arg)', () => {
    const s = freshSession()
    const r = s.evaluate('(cond-> 10 true (+ 5))')
    expect(r).toMatchObject({ kind: 'number', value: 15 })
  })
})

describe('cond->>', () => {
  it('threads as last arg when test is true', () => {
    const s = freshSession()
    const r = materialize(s.evaluate('(cond->> [1 2 3] true (map inc))'))
    expect(r.kind).toBe('list')
    expect((r as any).value.map((v: any) => v.value)).toEqual([2, 3, 4])
  })

  it('skips step when test is false', () => {
    const s = freshSession()
    const r = s.evaluate('(cond->> [1 2 3] false (map inc))')
    expect(r.kind).toBe('vector')
  })

  it('no clauses returns expr', () => {
    const s = freshSession()
    const r = s.evaluate('(cond->> 99)')
    expect(r).toMatchObject({ kind: 'number', value: 99 })
  })
})

describe('some->', () => {
  it('threads when all values are non-nil', () => {
    const s = freshSession()
    const r = s.evaluate('(some-> 1 inc inc)')
    expect(r).toMatchObject({ kind: 'number', value: 3 })
  })

  it('short-circuits on nil', () => {
    const s = freshSession()
    const r = s.evaluate('(some-> nil inc)')
    expect(r.kind).toBe('nil')
  })

  it('short-circuits when intermediate result is nil', () => {
    const s = freshSession()
    s.evaluate('(defn safe-first [coll] (first coll))')
    const r = s.evaluate('(some-> [] safe-first inc)')
    expect(r.kind).toBe('nil')
  })

  it('no forms returns expr', () => {
    const s = freshSession()
    const r = s.evaluate('(some-> 5)')
    expect(r).toMatchObject({ kind: 'number', value: 5 })
  })
})

describe('some->>', () => {
  it('threads as last arg when non-nil', () => {
    const s = freshSession()
    // [1 2 3] → map inc → [2 3 4] → filter even? → [2 4]
    const r = materialize(s.evaluate('(some->> [1 2 3] (map inc) (filter even?))'))
    expect(r.kind).toBe('list')
    expect((r as any).value).toHaveLength(2)
  })

  it('short-circuits on nil', () => {
    const s = freshSession()
    const r = s.evaluate('(some->> nil (map inc))')
    expect(r.kind).toBe('nil')
  })

  it('no forms returns expr', () => {
    const s = freshSession()
    const r = s.evaluate('(some->> 42)')
    expect(r).toMatchObject({ kind: 'number', value: 42 })
  })
})
