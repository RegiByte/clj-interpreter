import { describe, expect, it } from 'vitest'
import {
  createSession,
  createSessionFromSnapshot,
  snapshotSession,
  cljToJs,
} from '../index'
import type { Session } from '../session'

function clone(session: Session): Session {
  return createSessionFromSnapshot(snapshotSession(session), {
    output: () => {},
    stderr: () => {},
  })
}

function js(value: unknown, session: Session): unknown {
  return cljToJs(value as never, session)
}

describe('session snapshots isolate cloned runtime state', () => {
  it('cloned functions resolve and mutate cloned top-level vars', () => {
    const base = createSession({ output: () => {} })
    base.evaluate(`
      (ns snap.fn)
      (def log (atom []))
      (defn touch [x] (swap! log conj x))
    `)

    const cloned = clone(base)
    cloned.setNs('snap.fn')
    cloned.evaluate('(touch :clone)')

    base.setNs('snap.fn')
    expect(js(cloned.evaluate('@log'), cloned)).toEqual(['clone'])
    expect(js(base.evaluate('@log'), base)).toEqual([])
  })

  it('cloned deftests report into cloned clojure.test bridge state', async () => {
    const base = createSession({ output: () => {} })
    base.evaluate(`
      (ns snap.test-bridge
        (:require [clojure.test :refer [deftest is]]))
      (def __vt_failures (atom []))
      (defmethod clojure.test/report :fail [_]
        (swap! __vt_failures conj :fail))
      (defmethod clojure.test/report :pass [_] nil)
      (deftest t (is false))
    `)

    const cloned = clone(base)
    cloned.setNs('snap.test-bridge')
    await cloned.evaluateAsync('(t)')

    base.setNs('snap.test-bridge')
    expect(js(cloned.evaluate('@__vt_failures'), cloned)).toEqual(['fail'])
    expect(js(base.evaluate('@__vt_failures'), base)).toEqual([])
  })

  it('cloned fixtures mutate cloned namespace state only', async () => {
    const base = createSession({ output: () => {} })
    base.evaluate(`
      (ns snap.fixtures
        (:require [clojure.test :refer [deftest use-fixtures]]))
      (def log (atom []))
      (defn fx [f]
        (swap! log conj :setup)
        (f)
        (swap! log conj :teardown))
      (use-fixtures :each fx)
      (deftest t (swap! log conj :test))
      (def __vt_each_fixture
        (clojure.test/join-fixtures
          (get @clojure.test/fixture-registry ["snap.fixtures" :each] [])))
    `)

    const cloned = clone(base)
    cloned.setNs('snap.fixtures')
    await cloned.evaluateAsync('(__vt_each_fixture (fn [] (t)))')

    base.setNs('snap.fixtures')
    expect(js(cloned.evaluate('@log'), cloned)).toEqual([
      'setup',
      'test',
      'teardown',
    ])
    expect(js(base.evaluate('@log'), base)).toEqual([])
  })

  it('cloned multimethod extensions do not mutate base methods', () => {
    const base = createSession({ output: () => {} })
    base.evaluate(`
      (ns snap.multimethods)
      (defmulti classify :kind)
      (defmethod classify :a [_] :A)
    `)

    const cloned = clone(base)
    cloned.setNs('snap.multimethods')
    cloned.evaluate('(defmethod classify :b [_] :B)')

    base.setNs('snap.multimethods')
    expect(cloned.evaluate('(classify {:kind :b})')).toMatchObject({
      kind: 'keyword',
      name: ':B',
    })
    expect(() => base.evaluate('(classify {:kind :b})')).toThrow(
      'No method in multimethod'
    )
  })

  it('cloned protocol extensions do not mutate base protocol impl maps', () => {
    const base = createSession({ output: () => {} })
    base.evaluate(`
      (ns snap.protocols)
      (defprotocol IDescribe (describe-val [this]))
    `)

    const cloned = clone(base)
    cloned.setNs('snap.protocols')
    cloned.evaluate(`
      (extend-protocol IDescribe
        :string (describe-val [s] (str "clone:" s)))
    `)

    base.setNs('snap.protocols')
    expect(cloned.evaluate('(describe-val "x")')).toMatchObject({
      kind: 'string',
      value: 'clone:x',
    })
    expect(() => base.evaluate('(describe-val "x")')).toThrow(
      'No implementation of protocol method'
    )
  })

  it('dynamic var binding inside cloned functions uses cloned vars', () => {
    const base = createSession({ output: () => {} })
    base.evaluate(`
      (ns snap.dynamic)
      (def ^:dynamic *x* :base)
      (def seen (atom []))
      (defn capture []
        (binding [*x* :clone]
          (swap! seen conj *x*))
        (swap! seen conj *x*))
    `)

    const cloned = clone(base)
    cloned.setNs('snap.dynamic')
    cloned.evaluate('(capture)')

    base.setNs('snap.dynamic')
    expect(js(cloned.evaluate('@seen'), cloned)).toEqual(['clone', 'base'])
    expect(js(base.evaluate('@seen'), base)).toEqual([])
    expect(base.evaluate('*x*')).toMatchObject({ kind: 'keyword', name: ':base' })
  })

  it('unrealized delays and lazy seqs realize independently in clones', () => {
    const base = createSession({ output: () => {} })
    base.evaluate(`
      (ns snap.lazy)
      (def hits (atom []))
      (def d (delay (swap! hits conj :delay)))
      (def xs (lazy-seq (swap! hits conj :lazy) [1 2]))
    `)

    const cloned = clone(base)
    cloned.setNs('snap.lazy')
    cloned.evaluate('@d')
    cloned.evaluate('(first xs)')

    base.setNs('snap.lazy')
    expect(js(cloned.evaluate('@hits'), cloned)).toEqual(['delay', 'lazy'])
    expect(js(base.evaluate('@hits'), base)).toEqual([])

    base.evaluate('@d')
    base.evaluate('(first xs)')
    expect(js(base.evaluate('@hits'), base)).toEqual(['delay', 'lazy'])
  })
})

describe('session snapshot v1 clone policies', () => {
  it('native functions remain callable after restore', () => {
    const base = createSession({ output: () => {} })
    const cloned = clone(base)

    expect(cloned.evaluate('(+ 1 2)')).toMatchObject({ kind: 'number', value: 3 })
  })

  it('JS host values are preserved by reference in clone-only snapshots', () => {
    const host = { label: 'shared-host-object' }
    const base = createSession({ output: () => {}, hostBindings: { host } })
    const cloned = clone(base)

    const clonedHost = cloned.getNs('js')?.vars.get('host')?.value
    expect(clonedHost).toMatchObject({ kind: 'js-value' })
    expect((clonedHost as { value: unknown }).value).toBe(host)
  })

  it('pending values are preserved by reference in clone-only snapshots', () => {
    const base = createSession({ output: () => {} })
    base.evaluate('(def p (promise-of 1))')
    const basePending = base.getNs('user')?.vars.get('p')?.value

    const cloned = clone(base)
    const clonedPending = cloned.getNs('user')?.vars.get('p')?.value

    expect(clonedPending).toBe(basePending)
  })
})
