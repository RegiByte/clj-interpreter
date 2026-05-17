import { describe, expect, it } from 'vitest'
import { is } from '../assertions'
import { printString } from '../printer'
import {
  createSession,
  createSessionFromSnapshot,
  snapshotSession,
} from '../session'
import type { CljValue } from '../types'

function nsVersion(session: ReturnType<typeof createSession>, name = 'user') {
  const ns = session.getNs(name)
  if (!ns) throw new Error(`missing namespace ${name}`)
  return ns.version
}

function nsId(session: ReturnType<typeof createSession>, name = 'user') {
  const ns = session.getNs(name)
  if (!ns) throw new Error(`missing namespace ${name}`)
  return ns.id
}

function expectFunction(value: CljValue) {
  if (!is.function(value)) throw new Error(`expected function, got ${value.kind}`)
  return value
}

describe('runtime identity and namespace versions', () => {
  it('assigns ids and starts user namespaces at version zero', () => {
    const session = createSession()

    expect(nsId(session, 'user')).toEqual(expect.any(Number))
    expect(nsVersion(session, 'user')).toBe(0)

    session.setNs('identity.created')
    expect(nsId(session, 'identity.created')).toEqual(expect.any(Number))
    expect(nsVersion(session, 'identity.created')).toBe(0)
  })

  it('bumps namespace versions for def and redef while preserving Var identity', () => {
    const session = createSession()
    const before = nsVersion(session)

    const first = session.evaluate('(def answer 1)')
    const afterFirst = nsVersion(session)
    const second = session.evaluate('(def answer 2)')

    expect(afterFirst).toBe(before + 1)
    expect(nsVersion(session)).toBe(afterFirst + 1)
    expect(second).toBe(first)
  })

  it('does not bump namespace version for bare declaration def', () => {
    const session = createSession()
    const before = nsVersion(session)

    session.evaluate('(def declared-only)')

    expect(nsVersion(session)).toBe(before)
  })

  it('bumps for defmacro and alter-var-root but not binding', () => {
    const session = createSession()

    session.evaluate('(defmacro idm [x] x)')
    const afterMacro = nsVersion(session)
    expect(afterMacro).toBeGreaterThan(0)

    session.evaluate('(def root 1)')
    const afterDef = nsVersion(session)
    session.evaluate('(alter-var-root #\'root inc)')
    const afterAlter = nsVersion(session)
    expect(afterAlter).toBe(afterDef + 1)

    session.evaluate('(def ^:dynamic *dyn* :root)')
    const afterDynamicDef = nsVersion(session)
    session.evaluate('(binding [*dyn* :bound] *dyn*)')
    expect(nsVersion(session)).toBe(afterDynamicDef)
  })

  it('bumps for defmulti creation and defmethod, but not guarded defmulti re-eval', () => {
    const session = createSession()

    session.evaluate('(defmulti classify :kind)')
    const afterDefmulti = nsVersion(session)
    session.evaluate('(defmulti classify :kind)')
    expect(nsVersion(session)).toBe(afterDefmulti)

    session.evaluate('(defmethod classify :a [x] :a)')
    expect(nsVersion(session)).toBe(afterDefmulti + 1)
  })

  it('bumps the requiring namespace for aliases, reader aliases, and refers', () => {
    const session = createSession()

    session.evaluate('(ns identity.source) (defn helper [] :ok)')
    session.evaluate('(ns identity.consumer)')
    expect(nsVersion(session, 'identity.consumer')).toBe(0)

    session.evaluate("(require '[identity.source :as src])")
    const afterAs = nsVersion(session, 'identity.consumer')
    session.evaluate("(require '[identity.source :as-alias source])")
    const afterAsAlias = nsVersion(session, 'identity.consumer')
    session.evaluate("(require '[identity.source :refer [helper]])")

    expect(afterAs).toBe(1)
    expect(afterAsAlias).toBe(2)
    expect(nsVersion(session, 'identity.consumer')).toBe(3)
  })

  it('bumps the requiring namespace for async host module aliases', async () => {
    const session = createSession({
      importModule: () => ({ value: 42 }),
    })

    await session.evaluateAsync(`
      (ns identity.host
        (:require ["host/mod" :as host]))
      host
    `)

    expect(nsVersion(session, 'identity.host')).toBe(1)
  })

  it('preserves namespace identities and versions through snapshots', () => {
    const session = createSession()
    session.evaluate('(def snap-value 1)')
    const beforeId = nsId(session)
    const beforeVersion = nsVersion(session)

    const clone = createSessionFromSnapshot(snapshotSession(session))

    expect(nsId(clone)).toBe(beforeId)
    expect(nsVersion(clone)).toBe(beforeVersion)
    clone.evaluate('(def snap-value-2 2)')
    expect(nsVersion(clone)).toBe(beforeVersion + 1)
  })

  it('prints anonymous functions with eval/function identity that changes per eval', () => {
    const session = createSession()

    const first = printString(session.evaluate('(fn [x] x)'))
    const second = printString(session.evaluate('(fn [x] x)'))

    expect(first).toMatch(/^#function\[user\/eval\d+\/fn--\d+\]$/)
    expect(second).toMatch(/^#function\[user\/eval\d+\/fn--\d+\]$/)
    expect(second).not.toBe(first)
  })

  it('prints named vars with namespace-aware stable display names', () => {
    const session = createSession()

    session.evaluate('(defn named [x] x)')
    const printed = printString(session.evaluate('named'))

    expect(printed).toBe('#function[user/named]')
  })

  it('assigns ids to VM-created inline closures and chunks', () => {
    const events: Array<Record<string, unknown> | undefined> = []
    const session = createSession({
      instrumentation: {
        onEvent: (event) => events.push(event.details),
      },
    })

    const fn = expectFunction(session.evaluate('(let [x 1] (fn [] x))'))

    expect(fn.id).toEqual(expect.any(Number))
    expect(printString(fn)).toMatch(/^#function\[user\/eval\d+\/fn--\d+\]$/)
    expect(events.some((details) => typeof details?.chunkId === 'number')).toBe(
      true
    )
  })
})
