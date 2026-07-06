/**
 * AST-walker ASYNC probe harness (Phase 3).
 *
 * Comparative probes run the same forms under `vmExecutionMode: 'ast'` and
 * `'off'` (the form-twin oracle), AWAIT any pending result, and require
 * identical outcomes — the async analogue of walker-probe.spec.ts, with the
 * same execution-honesty rule: an 'ast' probe that silently fell back to the
 * form path cannot pass as covered (`ast:top-level` must have fired).
 *
 * Direct probes pin behavior that intentionally DIVERGES from the form twin
 * (F7 interop-arg awaiting, `:frames` on async errors) or that crosses the
 * host boundary (F5), where a comparison against 'off' is meaningless.
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

function makeOffBackend(): Session {
  return createSessionFromSnapshot(baseline, { vmExecutionMode: 'off' })
}

type Outcome =
  | { kind: 'value'; printed: string }
  | { kind: 'rejected'; printed: string }
  | { kind: 'threw'; message: string }

async function runAsync(session: Session, forms: string[]): Promise<Outcome> {
  let result: CljValue | undefined
  try {
    for (const form of forms) {
      result = session.evaluate(form)
    }
  } catch (e) {
    return {
      kind: 'threw',
      message: e instanceof Error ? e.message : String(e),
    }
  }
  if (result !== undefined && result.kind === 'pending') {
    try {
      const resolved = await (result as CljPending).promise
      return { kind: 'value', printed: printString(resolved) }
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
  return { kind: 'value', printed: printString(result!) }
}

type Probe = {
  name: string
  forms: string[]
}

const probes: Probe[] = [
  { name: 'plain value', forms: ['(async 42)'] },
  { name: 'empty body resolves nil', forms: ['(async)'] },
  { name: '@ awaits a pending', forms: ['(async (+ 1 @(promise-of 41)))'] },
  {
    name: 'let with sequential awaits',
    forms: ['(async (let [a @(promise-of 1) b @(promise-of (+ a 1))] (+ a b)))'],
  },
  {
    name: 'loop/recur with await per iteration',
    forms: [
      '(async (loop [i 0 acc 0] (if (< i 5) (recur (inc i) (+ acc @(promise-of i))) acc)))',
    ],
  },
  {
    name: 'if with awaited test',
    forms: ['(async (if @(promise-of false) :yes :no))'],
  },
  {
    name: 'collection literals with awaits',
    forms: ['(async [@(promise-of 1) {:k @(promise-of 2)} #{@(promise-of 3)}])'],
  },
  {
    name: 'try/catch of thrown value with awaited payload',
    forms: [
      '(async (try (throw {:type :x :v @(promise-of 9)}) (catch :x e (:v e))))',
    ],
  },
  {
    name: 'finally runs on the async path',
    forms: [
      '(def fin (atom 0))',
      '(async (try (throw {:type :x}) (catch :x e @fin) (finally (swap! fin inc))))',
    ],
  },
  {
    name: 'uncaught throw rejects with the thrown value',
    forms: ['(async (throw {:type :boom :n @(promise-of 3)}))'],
  },
  {
    name: 'binding with await in the body',
    forms: [
      '(def ^:dynamic *probe-x* 1)',
      '(async (binding [*probe-x* 5] (+ *probe-x* @(promise-of 1))))',
    ],
  },
  {
    name: 'binding restores across an await',
    forms: [
      '(def ^:dynamic *probe-y* 1)',
      '(do (async (binding [*probe-y* 5] @(promise-of nil))) nil)',
      '(async (do @(promise-of nil) *probe-y*))',
    ],
  },
  {
    name: 'set! inside binding inside async',
    forms: [
      '(def ^:dynamic *probe-z* 1)',
      '(async (binding [*probe-z* 2] (set! *probe-z* @(promise-of 7)) *probe-z*))',
    ],
  },
  {
    name: 'def with awaited init defines the var',
    forms: ['(async (def probe-av @(promise-of 7)))', '(async probe-av)'],
  },
  {
    name: 'fn called from async runs its body async (@ inside body)',
    forms: ['(defn probe-af [p] (+ 1 @p))', '(async (probe-af (promise-of 1)))'],
  },
  {
    name: 'fn recur inside async apply',
    forms: [
      '(defn probe-count [n acc] (if (zero? n) acc (recur (dec n) (+ acc @(promise-of 1)))))',
      '(async (probe-count 4 0))',
    ],
  },
  {
    name: 'multimethod dispatched from async',
    forms: [
      '(defmulti probe-mm :k)',
      '(defmethod probe-mm :a [m] (:val m))',
      '(async (probe-mm {:k :a :val @(promise-of 11)}))',
    ],
  },
  {
    name: 'nested async blocks compose',
    forms: ['(async (let [x @(async (+ 1 2))] (* x 10)))'],
  },
  {
    name: 'then chains onto an async block',
    forms: ['(then (async 20) (fn [x] (+ x 1)))'],
  },
  {
    name: 'JVM 3-arg deref: value wins',
    forms: ['(async (deref (promise-of 1) 5000 :fallback))'],
  },
  {
    name: 'JVM 3-arg deref: timeout wins, returns timeout-val',
    forms: ['(async (deref (make-promise (fn [res rej] nil)) 5 :timed-out))'],
  },
  {
    name: '@ on non-pending is identity (await-or-identity)',
    forms: ['(async [@(atom 5) @:kw])'],
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
  },
  {
    name: 'async block closes over let locals by value',
    forms: ['(let [a 10 p (async (* a 2))] (async (+ @p 1)))'],
  },
]

describe('walker async probes: ast ≡ off (awaited)', () => {
  for (const probe of probes) {
    it(probe.name, async () => {
      const ast = makeAstBackend()
      const off = makeOffBackend()

      const astOutcome = await runAsync(ast.session, probe.forms)
      const offOutcome = await runAsync(off, probe.forms)

      expect(astOutcome).toEqual(offOutcome)
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
