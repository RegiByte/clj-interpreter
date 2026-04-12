/**
 * Keyword Hierarchy — make-hierarchy, derive, underive, isa?, parents,
 * ancestors, descendants, and multimethod dispatch integration.
 *
 * Coverage:
 *   - make-hierarchy (shape, empty maps)
 *   - derive pure 3-arg form (parents/ancestors/descendants correctly maintained)
 *   - derive transitivity (3-level chain: a→b→c)
 *   - derive multiple parents (diamond: cat→[animal, pet])
 *   - isa? pure 3-arg form (reflexive, direct, transitive, false cases)
 *   - parents / ancestors / descendants accessors (1 and 2-arity)
 *   - underive (removes edge, recomputes transitivity)
 *   - error cases (self-derive, cycle detection)
 *   - global *hierarchy* (2-arity mutating forms)
 *   - multimethod + hierarchy dispatch fallback
 *   - multimethod ambiguity detection
 */

import { describe, expect, it } from 'vitest'
import { freshSession } from '../evaluator/__tests__/evaluator-test-utils'
import { printString } from '../printer'
import type { CljValue } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function s() {
  return freshSession()
}

/** Extract all keyword name strings from a CljSet or CljVector value. */
function setNames(value: CljValue): string[] {
  if (value.kind === 'nil') return []
  if (value.kind === 'set') return value.values.map((v) => printString(v))
  if (value.kind === 'vector') return value.value.map((v) => printString(v))
  throw new Error(`setNames: expected set/vector/nil, got ${value.kind}`)
}

/** Evaluate and return keyword names from a set result. */
function evalSetNames(sess: ReturnType<typeof s>, expr: string): string[] {
  return setNames(sess.evaluate(expr))
}

// ---------------------------------------------------------------------------
// make-hierarchy
// ---------------------------------------------------------------------------

describe('make-hierarchy', () => {
  it('returns a map with :parents, :ancestors, :descendants keys', () => {
    const sess = s()
    const h = sess.evaluate('(make-hierarchy)')
    expect(h.kind).toBe('map')
    if (h.kind !== 'map') throw new Error('not a map')
    const keys = h.entries.map(([k]) => printString(k))
    expect(keys).toContain(':parents')
    expect(keys).toContain(':ancestors')
    expect(keys).toContain(':descendants')
  })

  it('all sub-maps are initially empty', () => {
    const sess = s()
    expect(sess.evaluate('(empty? (:parents (make-hierarchy)))')).toMatchObject(
      { kind: 'boolean', value: true }
    )
    expect(
      sess.evaluate('(empty? (:ancestors (make-hierarchy)))')
    ).toMatchObject({ kind: 'boolean', value: true })
    expect(
      sess.evaluate('(empty? (:descendants (make-hierarchy)))')
    ).toMatchObject({ kind: 'boolean', value: true })
  })
})

// ---------------------------------------------------------------------------
// derive — pure 3-arg form
// ---------------------------------------------------------------------------

describe('derive — pure 3-arg form', () => {
  it('adds parent to :parents map for child', () => {
    const sess = s()
    // (parents h :cat) returns the set of :cat's parents — which is #{:animal}
    const names = evalSetNames(
      sess,
      '(parents (derive (make-hierarchy) :cat :animal) :cat)'
    )
    expect(names).toContain(':animal')
    // also verify via raw map access
    const names2 = evalSetNames(
      sess,
      '(get (:parents (derive (make-hierarchy) :cat :animal)) :cat)'
    )
    expect(names2).toContain(':animal')
  })

  it('puts parent in ancestors of child', () => {
    const sess = s()
    const names = evalSetNames(
      sess,
      '(ancestors (derive (make-hierarchy) :cat :animal) :cat)'
    )
    expect(names).toContain(':animal')
  })

  it('puts child in descendants of parent', () => {
    const sess = s()
    const names = evalSetNames(
      sess,
      '(descendants (derive (make-hierarchy) :cat :animal) :animal)'
    )
    expect(names).toContain(':cat')
  })

  it('does not mutate the input hierarchy', () => {
    const sess = s()
    sess.evaluate('(def h (make-hierarchy))')
    sess.evaluate('(derive h :cat :animal)')
    // original h is unchanged
    expect(sess.evaluate('(nil? (ancestors h :cat))')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
  })

  it('supports adding multiple parents to one child', () => {
    const sess = s()
    sess.evaluate(
      '(def h (-> (make-hierarchy) (derive :cat :animal) (derive :cat :pet)))'
    )
    const parentNames = evalSetNames(sess, '(parents h :cat)')
    expect(parentNames).toContain(':animal')
    expect(parentNames).toContain(':pet')
    const ancNames = evalSetNames(sess, '(ancestors h :cat)')
    expect(ancNames).toContain(':animal')
    expect(ancNames).toContain(':pet')
  })
})

// ---------------------------------------------------------------------------
// derive — transitivity (3-level chain)
// ---------------------------------------------------------------------------

describe('derive — transitivity', () => {
  it('populates transitive ancestors: kitten→cat→animal', () => {
    const sess = s()
    sess.evaluate(
      '(def h (-> (make-hierarchy) (derive :kitten :cat) (derive :cat :animal)))'
    )
    const kAncs = evalSetNames(sess, '(ancestors h :kitten)')
    expect(kAncs).toContain(':cat')
    expect(kAncs).toContain(':animal')
    expect(kAncs).not.toContain(':kitten')
  })

  it('populates transitive descendants: animal has cat + kitten', () => {
    const sess = s()
    sess.evaluate(
      '(def h (-> (make-hierarchy) (derive :kitten :cat) (derive :cat :animal)))'
    )
    const aDescs = evalSetNames(sess, '(descendants h :animal)')
    expect(aDescs).toContain(':cat')
    expect(aDescs).toContain(':kitten')
  })

  it('works for a 4-level chain: a→b→c→d', () => {
    const sess = s()
    sess.evaluate(
      '(def h (-> (make-hierarchy) (derive :a :b) (derive :b :c) (derive :c :d)))'
    )
    const aAncs = evalSetNames(sess, '(ancestors h :a)')
    expect(aAncs).toContain(':b')
    expect(aAncs).toContain(':c')
    expect(aAncs).toContain(':d')
    const dDescs = evalSetNames(sess, '(descendants h :d)')
    expect(dDescs).toContain(':a')
    expect(dDescs).toContain(':b')
    expect(dDescs).toContain(':c')
  })

  it('propagates when new edge is added above existing chain', () => {
    // first :kitten→:cat, then later :cat→:animal
    // :kitten's ancestors must include :animal after the second derive
    const sess = s()
    sess.evaluate('(def h1 (derive (make-hierarchy) :kitten :cat))')
    sess.evaluate('(def h2 (derive h1 :cat :animal))')
    const kAncs = evalSetNames(sess, '(ancestors h2 :kitten)')
    expect(kAncs).toContain(':animal')
  })

  it('propagates when new edge is added below existing chain', () => {
    // first :cat→:animal, then :kitten→:cat added later
    // :kitten's ancestors must include :animal
    const sess = s()
    sess.evaluate('(def h1 (derive (make-hierarchy) :cat :animal))')
    sess.evaluate('(def h2 (derive h1 :kitten :cat))')
    const kAncs = evalSetNames(sess, '(ancestors h2 :kitten)')
    expect(kAncs).toContain(':animal')
    const aDescs = evalSetNames(sess, '(descendants h2 :animal)')
    expect(aDescs).toContain(':kitten')
  })
})

// ---------------------------------------------------------------------------
// isa? — pure 3-arg form
// ---------------------------------------------------------------------------

describe('isa? — pure 3-arg form', () => {
  it('is reflexive: (isa? h x x) is always true', () => {
    const sess = s()
    sess.evaluate('(def h (make-hierarchy))')
    expect(sess.evaluate('(isa? h :foo :foo)')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
    // Even for types not in the hierarchy at all
    expect(sess.evaluate('(isa? h :unknown :unknown)')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
  })

  it('returns true for a direct parent', () => {
    const sess = s()
    sess.evaluate('(def h (derive (make-hierarchy) :cat :animal))')
    expect(sess.evaluate('(isa? h :cat :animal)')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
  })

  it('returns true for a transitive ancestor', () => {
    const sess = s()
    sess.evaluate(
      '(def h (-> (make-hierarchy) (derive :kitten :cat) (derive :cat :animal)))'
    )
    expect(sess.evaluate('(isa? h :kitten :animal)')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
  })

  it('returns false upward: parent is NOT isa? child', () => {
    const sess = s()
    sess.evaluate('(def h (derive (make-hierarchy) :cat :animal))')
    expect(sess.evaluate('(isa? h :animal :cat)')).toMatchObject({
      kind: 'boolean',
      value: false,
    })
  })

  it('returns false for unrelated tags', () => {
    const sess = s()
    sess.evaluate(
      '(def h (-> (make-hierarchy) (derive :cat :animal) (derive :dog :animal)))'
    )
    expect(sess.evaluate('(isa? h :cat :dog)')).toMatchObject({
      kind: 'boolean',
      value: false,
    })
    expect(sess.evaluate('(isa? h :dog :cat)')).toMatchObject({
      kind: 'boolean',
      value: false,
    })
    
  })

  it('returns false for tags not in the hierarchy', () => {
    const sess = s()
    sess.evaluate('(def h (make-hierarchy))')
    expect(sess.evaluate('(isa? h :foo :bar)')).toMatchObject({
      kind: 'boolean',
      value: false,
    })
  })

  it('returns true via multiple parent paths (diamond)', () => {
    const sess = s()
    sess.evaluate(
      '(def h (-> (make-hierarchy) (derive :cat :animal) (derive :cat :pet)))'
    )
    expect(sess.evaluate('(isa? h :cat :animal)')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
    expect(sess.evaluate('(isa? h :cat :pet)')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
  })
})

// ---------------------------------------------------------------------------
// parents / ancestors / descendants accessors
// ---------------------------------------------------------------------------

describe('parents / ancestors / descendants accessors', () => {
  it('parents returns nil when tag has no parents', () => {
    const sess = s()
    sess.evaluate('(def h (make-hierarchy))')
    expect(sess.evaluate('(nil? (parents h :foo))')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
  })

  it('ancestors returns nil when tag has no ancestors', () => {
    const sess = s()
    sess.evaluate('(def h (make-hierarchy))')
    expect(sess.evaluate('(nil? (ancestors h :foo))')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
  })

  it('descendants returns nil when tag has no descendants', () => {
    const sess = s()
    sess.evaluate('(def h (make-hierarchy))')
    expect(sess.evaluate('(nil? (descendants h :foo))')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
  })

  it('parents returns only direct parents (not transitive)', () => {
    const sess = s()
    sess.evaluate(
      '(def h (-> (make-hierarchy) (derive :kitten :cat) (derive :cat :animal)))'
    )
    const pNames = evalSetNames(sess, '(parents h :kitten)')
    expect(pNames).toContain(':cat')
    expect(pNames).not.toContain(':animal')
  })

  it('ancestors returns all transitive ancestors', () => {
    const sess = s()
    sess.evaluate(
      '(def h (-> (make-hierarchy) (derive :kitten :cat) (derive :cat :animal)))'
    )
    const aNames = evalSetNames(sess, '(ancestors h :kitten)')
    expect(aNames).toContain(':cat')
    expect(aNames).toContain(':animal')
  })

  it('descendants returns all transitive descendants', () => {
    const sess = s()
    sess.evaluate(
      '(def h (-> (make-hierarchy) (derive :kitten :cat) (derive :cat :animal)))'
    )
    const dNames = evalSetNames(sess, '(descendants h :animal)')
    expect(dNames).toContain(':cat')
    expect(dNames).toContain(':kitten')
  })
})

// ---------------------------------------------------------------------------
// underive
// ---------------------------------------------------------------------------

describe('underive — pure 3-arg form', () => {
  it('removes direct parent relationship', () => {
    const sess = s()
    sess.evaluate('(def h1 (derive (make-hierarchy) :cat :animal))')
    sess.evaluate('(def h2 (underive h1 :cat :animal))')
    expect(sess.evaluate('(isa? h2 :cat :animal)')).toMatchObject({
      kind: 'boolean',
      value: false,
    })
  })

  it('recomputes transitive ancestors after removal', () => {
    const sess = s()
    sess.evaluate(
      '(def h1 (-> (make-hierarchy) (derive :kitten :cat) (derive :cat :animal)))'
    )
    sess.evaluate('(def h2 (underive h1 :kitten :cat))')
    // kitten no longer derives from cat or animal
    expect(sess.evaluate('(isa? h2 :kitten :cat)')).toMatchObject({
      kind: 'boolean',
      value: false,
    })
    expect(sess.evaluate('(isa? h2 :kitten :animal)')).toMatchObject({
      kind: 'boolean',
      value: false,
    })
    // but cat still derives from animal
    expect(sess.evaluate('(isa? h2 :cat :animal)')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
  })

  it('correctly handles underive in a diamond hierarchy', () => {
    const sess = s()
    sess.evaluate(
      '(def h1 (-> (make-hierarchy) (derive :cat :animal) (derive :cat :pet)))'
    )
    sess.evaluate('(def h2 (underive h1 :cat :animal))')
    expect(sess.evaluate('(isa? h2 :cat :animal)')).toMatchObject({
      kind: 'boolean',
      value: false,
    })
    expect(sess.evaluate('(isa? h2 :cat :pet)')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
  })

  it('underiving a non-existent edge is a no-op', () => {
    const sess = s()
    sess.evaluate('(def h1 (derive (make-hierarchy) :cat :animal))')
    sess.evaluate('(def h2 (underive h1 :dog :animal))')
    // cat→animal still exists
    expect(sess.evaluate('(isa? h2 :cat :animal)')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
  })
})

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

describe('derive — error cases', () => {
  it('throws when child and parent are the same', () => {
    const sess = s()
    expect(() => sess.evaluate('(derive (make-hierarchy) :cat :cat)')).toThrow(
      'self'
    )
  })

  it('throws on direct cycle: (derive h :a :b) then (derive h :b :a)', () => {
    const sess = s()
    sess.evaluate('(def h (derive (make-hierarchy) :a :b))')
    expect(() => sess.evaluate('(derive h :b :a)')).toThrow('cycle')
  })

  it('throws on indirect cycle: a→b→c, then c→a', () => {
    const sess = s()
    sess.evaluate('(def h (-> (make-hierarchy) (derive :a :b) (derive :b :c)))')
    expect(() => sess.evaluate('(derive h :c :a)')).toThrow('cycle')
  })
})

// ---------------------------------------------------------------------------
// Global *hierarchy* — 2-arity mutating forms
// ---------------------------------------------------------------------------

describe('global *hierarchy* — 2-arity mutating forms', () => {
  it('(derive child parent) mutates *hierarchy*', () => {
    const sess = s()
    sess.evaluate('(derive :x/dog :x/animal)')
    expect(sess.evaluate('(isa? :x/dog :x/animal)')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
  })

  it('(underive child parent) removes from *hierarchy*', () => {
    const sess = s()
    sess.evaluate('(derive :x/cat :x/animal)')
    expect(sess.evaluate('(isa? :x/cat :x/animal)')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
    sess.evaluate('(underive :x/cat :x/animal)')
    expect(sess.evaluate('(isa? :x/cat :x/animal)')).toMatchObject({
      kind: 'boolean',
      value: false,
    })
  })

  it('1-arity isa?/parents/ancestors/descendants read *hierarchy*', () => {
    const sess = s()
    sess.evaluate('(derive :x/kitten :x/cat)')
    sess.evaluate('(derive :x/cat :x/animal)')
    expect(sess.evaluate('(isa? :x/kitten :x/animal)')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
    const pNames = evalSetNames(sess, '(parents :x/kitten)')
    expect(pNames).toContain(':x/cat')
    const aNames = evalSetNames(sess, '(ancestors :x/kitten)')
    expect(aNames).toContain(':x/animal')
    const dNames = evalSetNames(sess, '(descendants :x/animal)')
    expect(dNames).toContain(':x/kitten')
  })

  it('each fresh session starts with an empty *hierarchy*', () => {
    // Verify test isolation — changes in one session don't bleed into another
    const sess1 = s()
    sess1.evaluate('(derive :isolation/a :isolation/b)')
    expect(sess1.evaluate('(isa? :isolation/a :isolation/b)')).toMatchObject({
      kind: 'boolean',
      value: true,
    })

    const sess2 = s()
    expect(sess2.evaluate('(isa? :isolation/a :isolation/b)')).toMatchObject({
      kind: 'boolean',
      value: false,
    })
  })
})

// ---------------------------------------------------------------------------
// Multimethod + hierarchy dispatch
// ---------------------------------------------------------------------------

describe('multimethod + hierarchy dispatch', () => {
  it('dispatches to parent method when no exact method exists for child', () => {
    const sess = s()
    sess.evaluate('(defmulti sound :type)')
    sess.evaluate('(defmethod sound :animal [x] "generic sound")')
    sess.evaluate('(derive :cat :animal)')
    expect(sess.evaluate('(sound {:type :cat})')).toMatchObject({
      kind: 'string',
      value: 'generic sound',
    })
  })

  it('exact method wins over hierarchy match', () => {
    const sess = s()
    sess.evaluate('(defmulti sound :type)')
    sess.evaluate('(defmethod sound :animal [x] "generic sound")')
    sess.evaluate('(defmethod sound :cat [x] "meow")')
    sess.evaluate('(derive :cat :animal)')
    // exact :cat method should fire
    expect(sess.evaluate('(sound {:type :cat})')).toMatchObject({
      kind: 'string',
      value: 'meow',
    })
  })

  it('dispatches transitively through the hierarchy', () => {
    const sess = s()
    sess.evaluate('(defmulti sound :type)')
    sess.evaluate('(defmethod sound :animal [x] "generic sound")')
    sess.evaluate('(derive :cat :animal)')
    sess.evaluate('(derive :kitten :cat)')
    // :kitten has no exact or direct parent method — falls through to :animal
    expect(sess.evaluate('(sound {:type :kitten})')).toMatchObject({
      kind: 'string',
      value: 'generic sound',
    })
  })

  it('hierarchy dispatch works with a fn dispatch-fn (not just keyword)', () => {
    const sess = s()
    sess.evaluate('(defmulti describe-shape (fn [x] (:shape-type x)))')
    sess.evaluate('(defmethod describe-shape :polygon [x] "a polygon")')
    sess.evaluate('(derive :triangle :polygon)')
    expect(
      sess.evaluate('(describe-shape {:shape-type :triangle})')
    ).toMatchObject({
      kind: 'string',
      value: 'a polygon',
    })
  })

  it(':default still fires when no exact or hierarchy match exists', () => {
    const sess = s()
    sess.evaluate('(defmulti sound :type)')
    sess.evaluate('(defmethod sound :animal [x] "generic sound")')
    sess.evaluate('(defmethod sound :default [x] "unknown")')
    sess.evaluate('(derive :cat :animal)')
    // :robot has no relation to :animal
    expect(sess.evaluate('(sound {:type :robot})')).toMatchObject({
      kind: 'string',
      value: 'unknown',
    })
  })

  it('throws ambiguity error when dispatch value isa? multiple registered keys', () => {
    const sess = s()
    sess.evaluate('(defmulti classify :type)')
    sess.evaluate('(defmethod classify :animal [x] "animal")')
    sess.evaluate('(defmethod classify :pet [x] "pet")')
    sess.evaluate('(derive :cat :animal)')
    sess.evaluate('(derive :cat :pet)')
    // :cat isa? :animal AND :cat isa? :pet — ambiguous
    expect(() => sess.evaluate('(classify {:type :cat})')).toThrow(
      'Multiple methods'
    )
  })

  it('hierarchy is checked at dispatch time — late binding of derive calls', () => {
    const sess = s()
    sess.evaluate('(defmulti greet :lang)')
    sess.evaluate('(defmethod greet :european [x] "bonjour")')
    // dispatch :french before derive
    expect(() => sess.evaluate('(greet {:lang :french})')).toThrow('No method')
    // now derive and dispatch again — should work
    sess.evaluate('(derive :french :european)')
    expect(sess.evaluate('(greet {:lang :french})')).toMatchObject({
      kind: 'string',
      value: 'bonjour',
    })
  })
})

// ---------------------------------------------------------------------------
// Composability with existing cljam features
// ---------------------------------------------------------------------------

describe('hierarchy composability', () => {
  it('isa? works with namespace-qualified keywords', () => {
    const sess = s()
    sess.evaluate('(derive ::cat ::animal)')
    expect(sess.evaluate('(isa? ::cat ::animal)')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
  })

  it('hierarchy can be passed through function arguments', () => {
    const sess = s()
    sess.evaluate('(def h (-> (make-hierarchy) (derive :a :b) (derive :b :c)))')
    sess.evaluate('(defn check [h x y] (isa? h x y))')
    expect(sess.evaluate('(check h :a :c)')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
  })

  it('pure hierarchy operations compose with ->', () => {
    const sess = s()
    sess.evaluate(`
      (def h
        (-> (make-hierarchy)
            (derive :kitten :cat)
            (derive :cat :feline)
            (derive :feline :animal)))
    `)
    expect(sess.evaluate('(isa? h :kitten :animal)')).toMatchObject({
      kind: 'boolean',
      value: true,
    })
    expect(sess.evaluate('(count (ancestors h :kitten))')).toMatchObject({
      kind: 'number',
      value: 3,
    })
  })
})
