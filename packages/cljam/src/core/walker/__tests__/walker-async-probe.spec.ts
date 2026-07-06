/**
 * AST-walker ASYNC probe harness — direct assertions (Phase 4 S2).
 *
 * Each probe pins an absolute awaited outcome. Until S2 these compared
 * `'ast'` against `'off'` (the form-twin oracle); the expected values below
 * were recorded THROUGH that still-green comparative net (session 349), so
 * every pin is certified equal to the retired oracle at conversion time.
 * Execution honesty is unchanged: a probe that silently fell back to the
 * form path cannot pass as covered (`ast:top-level` must have fired).
 *
 * ⚠️ These probes pin CURRENT (pre-F8) async semantics — including dynamic
 * async propagation into applied fn bodies ('fn called from async runs its
 * body async'). Phase 4 S3 replaces that with the lexical-boundary model and
 * updates the affected pins DELIBERATELY, in the same slice. See
 * `references/async-design-scrutiny-2026-07-05.md` F8 ADDENDUM.
 *
 * Direct probes pin behavior that intentionally diverged from the form twin
 * (F7 interop-arg awaiting, `:frames` on async errors) or that crosses the
 * host boundary (F5).
 */

import { describe, expect, it, test } from 'vitest'
import { cljJsValue, cljVar } from '../../factories'
import { CljThrownSignal } from '../../errors'
import { printString } from '../../printer'
import {
  createSession,
  createSessionFromSnapshot,
  snapshotSession,
  type Session,
} from '../../session'
import type { CljPending, CljValue } from '../../types'

const baseline = snapshotSession(createSession())

function makeAstBackend() {
  let topLevel = 0
  const session = createSessionFromSnapshot(baseline, {
    vmExecutionMode: 'ast',
    instrumentation: {
      onEvent: (event) => {
        if (event.path === 'ast:top-level') topLevel += 1
      },
    },
  })
  return { session, astTopLevel: () => topLevel }
}

type Outcome =
  | { kind: 'value'; printed: string }
  | { kind: 'rejected'; printed: string }
  | { kind: 'threw'; message: string }

const value = (printed: string): Outcome => ({ kind: 'value', printed })
const rejected = (printed: string): Outcome => ({ kind: 'rejected', printed })

/**
 * Evaluates each form and AWAITS its pending before moving on — the REPL
 * client's experience (one form per evaluate, each result awaited). Without
 * the per-form await, multi-form probes pin microtask-race artifacts instead
 * of semantics: a suspended `(async (def x @p))` loses the race against the
 * next form's read of `x`.
 */
async function runAsync(session: Session, forms: string[]): Promise<Outcome> {
  let result: CljValue | undefined
  for (const form of forms) {
    try {
      result = session.evaluate(form)
    } catch (e) {
      return {
        kind: 'threw',
        message: e instanceof Error ? e.message : String(e),
      }
    }
    if (result !== undefined && result.kind === 'pending') {
      try {
        result = await (result as CljPending).promise
      } catch (e) {
        if (e instanceof CljThrownSignal) {
          return { kind: 'rejected', printed: printString(e.value) }
        }
        return {
          kind: 'rejected',
          printed: e instanceof Error ? e.message : String(e),
        }
      }
    }
  }
  return { kind: 'value', printed: printString(result!) }
}

type Probe = {
  name: string
  forms: string[]
  expected: Outcome
}

const probes: Probe[] = [
  { name: 'plain value', forms: ['(async 42)'], expected: value('42') },
  { name: 'empty body resolves nil', forms: ['(async)'], expected: value('nil') },
  { name: '@ awaits a pending', forms: ['(async (+ 1 @(promise-of 41)))'], expected: value('42') },
  {
    name: 'let with sequential awaits',
    forms: ['(async (let [a @(promise-of 1) b @(promise-of (+ a 1))] (+ a b)))'],
    expected: value('3'),
  },
  {
    name: 'loop/recur with await per iteration',
    forms: [
      '(async (loop [i 0 acc 0] (if (< i 5) (recur (inc i) (+ acc @(promise-of i))) acc)))',
    ],
    expected: value('10'),
  },
  {
    name: 'if with awaited test',
    forms: ['(async (if @(promise-of false) :yes :no))'],
    expected: value(':no'),
  },
  {
    name: 'collection literals with awaits',
    forms: ['(async [@(promise-of 1) {:k @(promise-of 2)} #{@(promise-of 3)}])'],
    expected: value('[1 {:k 2} #{3}]'),
  },
  {
    name: 'try/catch of thrown value with awaited payload',
    forms: [
      '(async (try (throw {:type :x :v @(promise-of 9)}) (catch :x e (:v e))))',
    ],
    expected: value('9'),
  },
  {
    // The catch clause reads the atom BEFORE finally increments it — catch
    // runs first, finally cannot change the result. 0 is correct Clojure.
    name: 'finally runs on the async path',
    forms: [
      '(def fin (atom 0))',
      '(async (try (throw {:type :x}) (catch :x e @fin) (finally (swap! fin inc))))',
    ],
    expected: value('0'),
  },
  {
    name: 'uncaught throw rejects with the thrown value',
    forms: ['(async (throw {:type :boom :n @(promise-of 3)}))'],
    expected: rejected('{:type :boom :n 3}'),
  },
  {
    name: 'binding with await in the body',
    forms: [
      '(def ^:dynamic *probe-x* 1)',
      '(async (binding [*probe-x* 5] (+ *probe-x* @(promise-of 1))))',
    ],
    expected: value('6'),
  },
  {
    // Form 2 deliberately discards its pending via (do … nil), so its
    // binding frame is still active when form 3's async is CREATED. Form 3
    // captures that context and restores it after its own await — the read
    // sees the conveyed 5, not the root 1. This pins binding conveyance
    // across suspension.
    name: 'binding restores across an await',
    forms: [
      '(def ^:dynamic *probe-y* 1)',
      '(do (async (binding [*probe-y* 5] @(promise-of nil))) nil)',
      '(async (do @(promise-of nil) *probe-y*))',
    ],
    expected: value('5'),
  },
  {
    name: 'set! inside binding inside async',
    forms: [
      '(def ^:dynamic *probe-z* 1)',
      '(async (binding [*probe-z* 2] (set! *probe-z* @(promise-of 7)) *probe-z*))',
    ],
    expected: value('7'),
  },
  {
    name: 'def with awaited init defines the var',
    forms: ['(async (def probe-av @(promise-of 7)))', '(async probe-av)'],
    expected: value('7'),
  },
  {
    name: 'fn called from async runs its body async (@ inside body)',
    forms: ['(defn probe-af [p] (+ 1 @p))', '(async (probe-af (promise-of 1)))'],
    expected: value('2'),
  },
  {
    name: 'fn recur inside async apply',
    forms: [
      '(defn probe-count [n acc] (if (zero? n) acc (recur (dec n) (+ acc @(promise-of 1)))))',
      '(async (probe-count 4 0))',
    ],
    expected: value('4'),
  },
  {
    name: 'multimethod dispatched from async',
    forms: [
      '(defmulti probe-mm :k)',
      '(defmethod probe-mm :a [m] (:val m))',
      '(async (probe-mm {:k :a :val @(promise-of 11)}))',
    ],
    expected: value('11'),
  },
  {
    name: 'nested async blocks compose',
    forms: ['(async (let [x @(async (+ 1 2))] (* x 10)))'],
    expected: value('30'),
  },
  {
    name: 'then chains onto an async block',
    forms: ['(then (async 20) (fn [x] (+ x 1)))'],
    expected: value('21'),
  },
  {
    name: 'JVM 3-arg deref: value wins',
    forms: ['(async (deref (promise-of 1) 5000 :fallback))'],
    expected: value('1'),
  },
  {
    name: 'JVM 3-arg deref: timeout wins, returns timeout-val',
    forms: ['(async (deref (make-promise (fn [res rej] nil)) 5 :timed-out))'],
    expected: value(':timed-out'),
  },
  {
    name: '@ on non-pending is identity (await-or-identity)',
    forms: ['(async [@(atom 5) @:kw])'],
    expected: value('[5 :kw]'),
  },
  {
    name: 'SUSPENSION SAFETY: async blocks in a loop capture their own i',
    forms: [
      `(async
         (let [ps (loop [i 0 acc []]
                    (if (< i 3)
                      (recur (inc i) (conj acc (async i)))
                      acc))]
           [@(nth ps 0) @(nth ps 1) @(nth ps 2)]))`,
    ],
    expected: value('[0 1 2]'),
  },
  {
    name: 'async block closes over let locals by value',
    forms: ['(let [a 10 p (async (* a 2))] (async (+ @p 1)))'],
    expected: value('21'),
  },
]

describe('walker async probes (direct assertions, awaited)', () => {
  for (const probe of probes) {
    it(probe.name, async () => {
      const ast = makeAstBackend()

      expect(await runAsync(ast.session, probe.forms)).toEqual(probe.expected)
      // Execution honesty: the probe must actually have walked.
      expect(ast.astTopLevel()).toBeGreaterThan(0)
    })
  }
})

describe('walker async probes: intended improvements over the form twin', () => {
  function sessionWithHost(host: Record<string, unknown>) {
    const { session, astTopLevel } = makeAstBackend()
    const ns = session.getNs('user')!
    ns.vars.set('host', cljVar('user', 'host', cljJsValue(host)))
    return { session, astTopLevel }
  }

  test('F7: interop args are awaited — (. obj m @p) works', async () => {
    const { session, astTopLevel } = sessionWithHost({
      add: (a: number, b: number) => a + b,
    })
    const result = session.evaluate(
      '(async (. host add @(promise-of 2) 3))'
    ) as CljPending
    expect(result.kind).toBe('pending')
    expect(printString(await result.promise)).toBe('5')
    expect(astTopLevel()).toBeGreaterThan(0)
  })

  test('F7: js/new args are awaited', async () => {
    const { session } = sessionWithHost({ Box: class { v: unknown; constructor(v: unknown) { this.v = v } } })
    const result = session.evaluate(`
      (async (let [b (js/new (. host Box) @(promise-of 9))] (. b v)))
    `) as CljPending
    expect(printString(await result.promise)).toBe('9')
  })

  test('async errors carry :frames on the walker path', async () => {
    const { session } = makeAstBackend()
    session.evaluate('(defn probe-boom [x] (x 1))')
    const result = session.evaluate(`
      (async (try (probe-boom @(promise-of 5))
                  (catch :default e (contains? e :frames))))
    `) as CljPending
    expect(printString(await result.promise)).toBe('true')
  })
})

describe('walker async probes: F5 host boundary (cljToJs)', () => {
  function sessionCapturingHostArg() {
    const { session } = makeAstBackend()
    const captured: { value?: unknown } = {}
    const ns = session.getNs('user')!
    ns.vars.set(
      'host',
      cljVar(
        'user',
        'host',
        cljJsValue({
          take: (p: unknown) => {
            captured.value = p
            return 'ok'
          },
        })
      )
    )
    return { session, captured }
  }

  test('a pending crossing to the host becomes a real Promise of the JS value', async () => {
    const { session, captured } = sessionCapturingHostArg()
    session.evaluate('(. host take (async 42))')
    expect(captured.value).toBeInstanceOf(Promise)
    expect(await captured.value).toBe(42)
  })

  test('a Clojure throw crossing to the host becomes a host-friendly Error', async () => {
    const { session, captured } = sessionCapturingHostArg()
    session.evaluate('(. host take (async (throw {:type :boom})))')
    expect(captured.value).toBeInstanceOf(Promise)
    await expect(captured.value as Promise<unknown>).rejects.toThrow(':boom')
    await expect(captured.value as Promise<unknown>).rejects.not.toBeInstanceOf(
      CljThrownSignal
    )
  })
})

describe('session.evaluateAsync routing (Phase 4 S1)', () => {
  it('routes a top-level (async …) through ast:top-level with zero fallbacks', async () => {
    // Pins the session-347 audit finding: evaluateAsync evaluates each form
    // through the sync ctx.evaluate (under 'ast' that is the walker) and only
    // AWAITS a trailing pending — it never enters the legacy async form twin
    // at top level. Counting fallback events (not just ast:top-level, which
    // REPL plumbing also bumps) is what makes a silent legacy detour fail.
    const fallbacks: unknown[] = []
    let topLevel = 0
    const session = createSessionFromSnapshot(baseline, {
      vmExecutionMode: 'ast',
      instrumentation: {
        onEvent: (event) => {
          if (event.path === 'fallback') fallbacks.push(event)
          if (event.path === 'ast:top-level') topLevel += 1
        },
      },
    })
    const result = await session.evaluateAsync('(async (+ 1 @(promise-of 41)))')
    expect(printString(result)).toBe('42')
    expect(fallbacks).toEqual([])
    expect(topLevel).toBeGreaterThan(0)
  })
})
