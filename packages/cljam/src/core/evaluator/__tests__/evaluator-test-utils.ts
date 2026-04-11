import { expect } from 'vitest'
import { isCljValue, isCons, isEqual, isLazySeq, isNil } from '../../assertions'
import {
  cljBoolean,
  cljList,
  cljMap,
  cljNil,
  cljNumber,
  cljString,
  cljVector,
} from '../../factories'
import { EvaluationError } from '../../errors'
import type { CljMap, CljValue } from '../../types'
import { createSession, createSessionFromSnapshot, snapshotSession } from '../../session'
import { toSeq } from '../../transformations'

/** Recursively convert lazy-seqs/cons to flat lists for test comparisons. */
export function materialize(value: CljValue): CljValue {
  if (isLazySeq(value) || isCons(value)) {
    const items = toSeq(value)
    return cljList(items.map(materialize))
  }
  if (value.kind === 'list') {
    return cljList(value.value.map(materialize))
  }
  if (value.kind === 'vector') {
    return cljVector(value.value.map(materialize))
  }
  return value
}

const _snapshot = snapshotSession(createSession())

export function freshSession() {
  return createSessionFromSnapshot(_snapshot)
}

export type ErrorShape = {
  message?: string | RegExp
  data?: unknown
  cause?: unknown
}

export function toCljValue(value: unknown): CljValue {
  if (isCljValue(value)) return value
  if (typeof value === 'number') return cljNumber(value)
  if (typeof value === 'string') return cljString(value)
  if (typeof value === 'boolean') return cljBoolean(value)
  if (value === null) return cljNil()
  if (Array.isArray(value)) return cljVector(value.map(toCljValue))
  if (typeof value === 'object') {
    return cljMap(
      Object.entries(value).map(([key, entryValue]) => [
        cljString(key),
        toCljValue(entryValue),
      ])
    )
  }
  throw new Error(`Unsupported expected value type: ${typeof value}`)
}

function getMapValue(map: CljMap, field: string): CljValue | undefined {
  const keyword = `:${field}`
  const keywordHit = map.entries.find(
    ([k]) => k.kind === 'keyword' && k.name === keyword
  )
  if (keywordHit) return keywordHit[1]

  const stringHit = map.entries.find(
    ([k]) => k.kind === 'string' && k.value === field
  )
  return stringHit?.[1]
}

function expectCljValueMatches(actual: CljValue, expected: unknown): void {
  if (expected instanceof RegExp) {
    expect(actual.kind).toBe('string')
    if (actual.kind === 'string') {
      expect(actual.value).toMatch(expected)
    }
    return
  }

  if (isCljValue(expected)) {
    expect(isEqual(actual, expected)).toBe(true)
    return
  }

  if (expected === null) {
    expect(actual.kind).toBe('nil')
    return
  }

  if (typeof expected === 'string') {
    expect(actual.kind).toBe('string')
    if (actual.kind === 'string') {
      expect(actual.value).toBe(expected)
    }
    return
  }

  if (typeof expected === 'number') {
    expect(actual.kind).toBe('number')
    if (actual.kind === 'number') {
      expect(actual.value).toBe(expected)
    }
    return
  }

  if (typeof expected === 'boolean') {
    expect(actual.kind).toBe('boolean')
    if (actual.kind === 'boolean') {
      expect(actual.value).toBe(expected)
    }
    return
  }

  if (Array.isArray(expected)) {
    expect(actual.kind === 'vector' || actual.kind === 'list').toBe(true)
    if (actual.kind === 'vector' || actual.kind === 'list') {
      expect(actual.value).toHaveLength(expected.length)
      expected.forEach((item, index) => {
        expectCljValueMatches(actual.value[index], item)
      })
    }
    return
  }

  if (typeof expected === 'object') {
    expect(actual.kind).toBe('map')
    if (actual.kind === 'map') {
      for (const [field, fieldExpected] of Object.entries(expected)) {
        const fieldValue = getMapValue(actual, field)
        expect(fieldValue).toBeDefined()
        if (fieldValue) {
          expectCljValueMatches(fieldValue, fieldExpected)
        }
      }
    }
    return
  }

  expectCljValueMatches(actual, toCljValue(expected))
}

export function expectError(
  code: string,
  expected: string | ErrorShape,
  session = freshSession()
) {
  if (typeof expected === 'string') {
    let error: EvaluationError | undefined
    expect(() => {
      try {
        session.evaluate(code)
      } catch (e) {
        if (e instanceof EvaluationError) error = e
        throw e
      }
    }).toThrow(EvaluationError)
    expect(error?.message).toContain(expected)
    return
  }

  const result = session.evaluate(`
    (try
      ${code}
      (catch :default e
        {:message (ex-message e)
         :data    (ex-data e)
         :cause   (ex-cause e)}))
  `)

  expectCljValueMatches(result, expected)
}
