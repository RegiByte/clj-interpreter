import { describe, expect, it } from 'vitest'
import {
  createSession,
  createSessionFromSnapshot,
  snapshotSession,
  type SessionSnapshot,
} from '../../session'
import type { CljValue, EvalEvent, VmExecutionMode } from '../../types'
import { v } from '../../factories'

type RunOutcome =
  | { ok: true; value: CljValue; events: EvalEvent[] }
  | { ok: false; error: Error; events: EvalEvent[] }

const calls: unknown[] = []
const config = { db: { port: 5432 } }
const logger = { log: (...args: unknown[]) => calls.push(args) }
const subject = {
  name: 'alice',
  count: 42,
  active: true,
  explicit: null,
  inner: { x: 99 },
  arr: [1, 2, 3],
  multiplier: 3,
  multiply(x: number) {
    return x * this.multiplier
  },
  fold: (fn: (acc: number, x: number) => number, init: number) =>
    [1, 2, 3].reduce((acc, x) => fn(acc, x), init),
  sum: (arr: number[]) => arr.reduce((a, b) => a + b, 0),
  getA: (o: Record<string, number>) => o.a,
  parse: JSON.parse,
  nonCallable: 42,
}
const root = { deep: { value: 77 } }

const baseline = snapshotSession(
  createSession({
    hostBindings: {
      Math,
      Date,
      Map,
      config,
      logger,
      subject,
      root,
      nilObj: null,
      undefObj: undefined,
      notCtor: { x: 1 },
    },
  })
)

function prepareSnapshot(setup: string[] = []): SessionSnapshot {
  const session = createSessionFromSnapshot(baseline, {
    vmExecutionMode: 'off',
  })
  for (const source of setup) {
    session.evaluate(source)
  }
  return snapshotSession(session)
}

function run(
  code: string,
  mode: VmExecutionMode,
  setup: string[] = []
): RunOutcome {
  const events: EvalEvent[] = []
  const session = createSessionFromSnapshot(prepareSnapshot(setup), {
    vmExecutionMode: mode,
    instrumentation: { onEvent: (event) => events.push(event) },
  })

  try {
    return { ok: true, value: session.evaluate(code), events }
  } catch (error) {
    if (error instanceof Error) return { ok: false, error, events }
    throw error
  }
}

function expectVmRequiredValue(
  code: string,
  expected: CljValue,
  setup: string[] = []
): void {
  const required = run(code, 'vm-required', setup)

  expect(required.ok).toBe(true)
  if (!required.ok) return
  expect(required.value).toEqual(expected)
  expect(required.events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: 'vm:top-level', mode: 'vm-required' }),
    ])
  )
}

function expectVmRequiredRaw(
  code: string,
  assertRaw: (raw: unknown) => void,
  setup: string[] = []
): void {
  const required = run(code, 'vm-required', setup)

  expect(required.ok).toBe(true)
  if (!required.ok) return
  expect(required.value.kind).toBe('js-value')
  if (required.value.kind === 'js-value') assertRaw(required.value.value)
  expect(required.events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: 'vm:top-level', mode: 'vm-required' }),
    ])
  )
}

function expectVmRequiredError(code: string, message: string | RegExp): void {
  const required = run(code, 'vm-required')

  expect(required.ok).toBe(false)
  if (required.ok) return
  if (typeof message === 'string') {
    expect(required.error.message).toContain(message)
  } else {
    expect(required.error.message).toMatch(message)
  }
  expect(required.events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: 'vm:top-level', mode: 'vm-required' }),
    ])
  )
}

describe('VM JS interop', () => {
  describe('dot-chain qualified symbols', () => {
    it('reads js/Math.PI as a value', () => {
      expectVmRequiredValue('js/Math.PI', { kind: 'number', value: Math.PI })
    })

    it('reads deep properties from host bindings', () => {
      expectVmRequiredValue('js/config.db.port', {
        kind: 'number',
        value: 5432,
      })
    })

    it('returns a bound function reference for function properties', () => {
      expectVmRequiredRaw('js/logger.log', (raw) => {
        expect(typeof raw).toBe('function')
      })
    })

    it('supports dot-chain access for non-js qualified aliases', () => {
      expectVmRequiredValue('h/root.deep.value', { kind: 'number', value: 77 }, [
        '(ns host.core) (def root js/root)',
        '(ns user (:require [host.core :as h]))',
      ])
    })

    it('calls a dot-chain function in callee position', () => {
      expectVmRequiredValue('(js/Math.pow 2 10)', {
        kind: 'number',
        value: 1024,
      })
    })

    it('preserves this binding for dot-chain calls', () => {
      calls.length = 0
      expectVmRequiredValue('(js/logger.log "hello" "world")', {
        kind: 'number',
        value: 1,
      })
      expect(calls).toEqual([['hello', 'world']])
    })

    it('composes dot-chain calls in expressions and let bindings', () => {
      expectVmRequiredValue('(+ (js/Math.abs -5) 10)', {
        kind: 'number',
        value: 15,
      })
      expectVmRequiredValue('(let [x (js/Math.pow 3 2)] (* x 2))', {
        kind: 'number',
        value: 18,
      })
    })
  })

  describe('. property access', () => {
    it('reads primitive, null, undefined, object, array, and function properties', () => {
      expectVmRequiredValue(
        '[(. js/subject name) (. js/subject count) (. js/subject active)]',
        v.vector([
          { kind: 'string', value: 'alice' },
          { kind: 'number', value: 42 },
          { kind: 'boolean', value: true },
        ])
      )
      expectVmRequiredValue('(. js/subject explicit)', {
        kind: 'nil',
        value: null,
      })
      expectVmRequiredRaw('(. js/subject missing)', (raw) => {
        expect(raw).toBeUndefined()
      })
      expectVmRequiredRaw('(. js/subject inner)', (raw) => {
        expect(raw).toBe(subject.inner)
      })
      expectVmRequiredRaw('(. js/subject arr)', (raw) => {
        expect(raw).toBe(subject.arr)
      })
      expectVmRequiredRaw('(. js/subject multiply)', (raw) => {
        expect(typeof raw).toBe('function')
        expect((raw as (x: number) => number)(5)).toBe(15)
      })
    })

    it('auto-boxes primitive targets', () => {
      expectVmRequiredValue('(. "hello" length)', {
        kind: 'number',
        value: 5,
      })
      expectVmRequiredValue('(. 3.14159 toFixed 2)', {
        kind: 'string',
        value: '3.14',
      })
    })
  })

  describe('. method calls', () => {
    it('calls methods with one or more arguments and preserves this', () => {
      expectVmRequiredValue('(. js/Math abs -7)', {
        kind: 'number',
        value: 7,
      })
      expectVmRequiredValue('(. js/Math max 3 7 2)', {
        kind: 'number',
        value: 7,
      })
      expectVmRequiredValue('(. js/subject multiply 5)', {
        kind: 'number',
        value: 15,
      })
    })

    it('converts vector, list, map, and function arguments at the JS boundary', () => {
      expectVmRequiredValue('(. js/subject getA {:a 99})', {
        kind: 'number',
        value: 99,
      })
      expectVmRequiredValue('(. js/subject sum [1 2 3 4])', {
        kind: 'number',
        value: 10,
      })
      expectVmRequiredValue("(. js/subject sum '(1 2 3 4))", {
        kind: 'number',
        value: 10,
      })
      expectVmRequiredValue('(. js/subject fold #(+ %1 %2) 0)', {
        kind: 'number',
        value: 6,
      })
      expectVmRequiredRaw('(. js/subject parse "{}")', (raw) => {
        expect(typeof raw).toBe('object')
      })
    })
  })

  describe('js/new', () => {
    it('constructs JS values with zero and nonzero args', () => {
      expectVmRequiredRaw('(js/new js/Map)', (raw) => {
        expect(raw instanceof Map).toBe(true)
      })
      expectVmRequiredRaw('(js/new js/Date "2026-06-15")', (raw) => {
        expect(raw instanceof Date).toBe(true)
        expect((raw as Date).getUTCFullYear()).toBe(2026)
      })
    })

    it('uses constructed values immediately with .', () => {
      expectVmRequiredValue(
        '(let [m (js/new js/Map)] (. m set "key" 42) (. m get "key"))',
        { kind: 'number', value: 42 }
      )
    })
  })

  describe('errors', () => {
    it('throws through the VM for invalid runtime targets and methods', () => {
      expectVmRequiredError('(. nil foo)', 'cannot use . on nil')
      expectVmRequiredError('(. js/nilObj foo)', 'cannot use . on nil')
      expectVmRequiredError(
        '(. js/undefObj foo)',
        'cannot use . on undefined js value'
      )
      expectVmRequiredError('(. [1 2 3] length)', 'cannot use . on vector')
      expectVmRequiredError(
        '(. js/subject nonCallable 1)',
        "method 'nonCallable' is not callable"
      )
      expectVmRequiredError(
        '(js/new js/notCtor)',
        'js/new: expected js-value constructor'
      )
      expectVmRequiredError('js/nilObj.prop', /nil|null/)
    })

    it('VM refusal of structurally invalid dot forms lands on the walker, which raises the analyzer error (opportunistic mode)', () => {
      const result = run('(. js/subject "name")', 'opportunistic')

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error.message).toContain(
        '. member must be a symbol or method call'
      )
      expect(result.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'fallback',
            reason: expect.objectContaining({ category: 'compile-error' }),
          }),
        ])
      )
    })
  })
})
