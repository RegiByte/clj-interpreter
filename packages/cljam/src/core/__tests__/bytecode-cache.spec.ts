import { describe, expect, it } from 'vitest'
import { is } from '../assertions'
import { v } from '../factories'
import { createSession, createSessionFromSnapshot, snapshotSession } from '../session'
import type { CljMap, CljValue, CljVector, EvalEvent } from '../types'

function eventDetails(events: EvalEvent[]): Array<Record<string, unknown> | undefined> {
  return events
    .filter((event) => event.path === 'vm:top-level')
    .map((event) => event.details)
}

function eventsForForm(events: EvalEvent[], formKind: string): EvalEvent[] {
  return events.filter(
    (event) => event.path === 'vm:top-level' && event.formKind === formKind
  )
}

function cacheStates(events: EvalEvent[]): unknown[] {
  return eventDetails(events).map((details) => details?.cache)
}

function topLevelChunkIds(events: EvalEvent[]): unknown[] {
  return eventDetails(events).map((details) => details?.chunkId)
}

function expectMap(value: CljValue): CljMap {
  if (!is.map(value)) throw new Error(`expected map, got ${value.kind}`)
  return value
}

function entry(map: CljMap, keyName: string): CljValue {
  const found = map.entries.find(
    ([key]) => is.keyword(key) && key.name === keyName
  )
  if (!found) throw new Error(`missing map key ${keyName}`)
  return found[1]
}

function expectVector(value: CljValue): CljVector {
  if (!is.vector(value)) throw new Error(`expected vector, got ${value.kind}`)
  return value
}

function expectKeywordName(value: CljValue): string {
  if (!is.keyword(value)) throw new Error(`expected keyword, got ${value.kind}`)
  return value.name
}

function stageNames(result: CljMap): string[] {
  return expectVector(entry(result, ':stages')).value.map((stage) =>
    expectKeywordName(entry(expectMap(stage), ':stage'))
  )
}

describe('top-level VM bytecode cache', () => {
  it('reuses cached chunks for identical VM-ready top-level forms', () => {
    const events: EvalEvent[] = []
    const session = createSession({
      instrumentation: { onEvent: (event) => events.push(event) },
    })

    events.length = 0
    expect(session.evaluate('(+ 1 2)')).toEqual(v.number(3))
    expect(session.evaluate('(+ 1 2)')).toEqual(v.number(3))

    expect(cacheStates(events)).toEqual(['miss', 'hit'])
    expect(topLevelChunkIds(events)[1]).toBe(topLevelChunkIds(events)[0])
  })

  it('misses after semantic namespace mutation changes the namespace version', () => {
    const events: EvalEvent[] = []
    const session = createSession({
      instrumentation: { onEvent: (event) => events.push(event) },
    })

    events.length = 0
    session.evaluate('(+ 1 2)')
    session.evaluate('(def cache-buster 1)')
    session.evaluate('(+ 1 2)')

    expect(cacheStates(eventsForForm(events, 'list:+'))).toEqual([
      'miss',
      'miss',
    ])
  })

  it('keeps distinct source positions from sharing cached chunks', () => {
    const events: EvalEvent[] = []
    const session = createSession({
      instrumentation: { onEvent: (event) => events.push(event) },
    })

    events.length = 0
    session.evaluate('(+ 1 2)')
    session.evaluate('\n(+ 1 2)')
    session.evaluate('\n(+ 1 2)')

    expect(cacheStates(events)).toEqual(['miss', 'miss', 'hit'])
    expect(topLevelChunkIds(events)[1]).not.toBe(topLevelChunkIds(events)[0])
    expect(topLevelChunkIds(events)[2]).toBe(topLevelChunkIds(events)[1])
  })

  it('keeps unsupported forms on existing fallback and vm-required paths', () => {
    const events: EvalEvent[] = []
    const opportunistic = createSession({
      instrumentation: { onEvent: (event) => events.push(event) },
    })

    events.length = 0
    expect(is.pending(opportunistic.evaluate('(async 42)'))).toBe(true)
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'fallback',
          reason: expect.objectContaining({
            category: 'unsupported-special-form',
          }),
        }),
      ])
    )

    const required = createSessionFromSnapshot(snapshotSession(createSession()), {
      vmExecutionMode: 'vm-required',
    })
    expect(() => required.evaluate('(async 42)')).toThrow(
      'VM required but cannot compile'
    )
  })

  it('preserves source-position diagnostics from cached chunks', () => {
    const session = createSession()
    const source = '\n\n(/ 1 0)'

    expect(() => session.evaluate(source)).toThrow('line 3, col 1')
    expect(() => session.evaluate(source)).toThrow('line 3, col 1')
  })

  it('reports cache hits through measurement while still executing bytecode', () => {
    const session = createSession()

    session.evaluate('(measure* (+ 1 2))')
    const measured = expectMap(session.evaluate('(measure* (+ 1 2))'))

    expect(stageNames(measured)).toEqual(
      expect.arrayContaining([':vm/cache-hit', ':vm/execute'])
    )
    expect(entry(measured, ':value')).toEqual(v.number(3))
  })

  it('does not preserve cache entries across snapshots', () => {
    const events: EvalEvent[] = []
    const session = createSession({
      instrumentation: { onEvent: (event) => events.push(event) },
    })

    events.length = 0
    session.evaluate('(+ 1 2)')
    session.evaluate('(+ 1 2)')
    expect(cacheStates(events)).toEqual(['miss', 'hit'])

    const cloneEvents: EvalEvent[] = []
    const clone = createSessionFromSnapshot(snapshotSession(session), {
      instrumentation: { onEvent: (event) => cloneEvents.push(event) },
    })

    clone.evaluate('(+ 1 2)')
    expect(cacheStates(cloneEvents)).toEqual(['miss'])
  })
})
