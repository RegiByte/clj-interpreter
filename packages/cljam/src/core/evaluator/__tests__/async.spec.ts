/**
 * Tests for async evaluation: (async ...), CljPending, then, catch*, pending?, promise-of
 * EXPERIMENTAL — part of Session 87 async foundation.
 */

import { describe, expect, test } from 'vitest'
import { v } from '../../factories'
import type { CljKeyword, CljMap, CljPending } from '../../types'
import { EvaluationError } from '../../errors'
import { freshSession } from './evaluator-test-utils'

// Helper: evaluate and assert we got a CljPending back
function evalPending(code: string) {
  const session = freshSession()
  const result = session.evaluate(code)
  expect(result.kind).toBe('pending')
  return result as CljPending
}

describe('(async ...) basic', () => {
  test('returns CljPending immediately', () => {
    const result = freshSession().evaluate('(async 42)')
    expect(result.kind).toBe('pending')
  })

  test('promise resolves to the last form', async () => {
    const result = evalPending('(async 42)')
    expect(await result.promise).toEqual(v.number(42))
  })

  test('empty async block resolves to nil', async () => {
    const result = evalPending('(async)')
    const resolved = await result.promise
    expect(resolved.kind).toBe('nil')
  })

  test('evaluates multiple forms, returns last', async () => {
    const result = evalPending('(async 1 2 3)')
    expect(await result.promise).toEqual(v.number(3))
  })
})

describe('(async ...) with @ (deref)', () => {
  test('@ awaits a pending value inside async', async () => {
    const result = evalPending('(async @(promise-of 10))')
    expect(await result.promise).toEqual(v.number(10))
  })

  test('@ + arithmetic inside async', async () => {
    const result = evalPending('(async (+ @(promise-of 10) 1))')
    expect(await result.promise).toEqual(v.number(11))
  })

  test('throws on pending aritmetic arg', () => {
    const session = freshSession()
    expect(() => session.evaluate('(+ 1 2 (promise-of 42))')).toThrow(
      /expects all arguments to be numbers/
    )
  })

  test('two sequential awaits in let', async () => {
    const session = freshSession()
    session.evaluate('(def p1 (promise-of 10))')
    session.evaluate('(def p2 (promise-of 20))')
    const result = session.evaluate(
      '(async (let [a @p1 b @p2] (+ a b)))'
    ) as CljPending
    expect(result.kind).toBe('pending')
    expect(await result.promise).toEqual(v.number(30))
  })

  test('nested async blocks compose', async () => {
    const result = evalPending('(async (let [x @(async (+ 1 2))] (* x 10)))')
    expect(await result.promise).toEqual(v.number(30))
  })
})

describe('@ outside async context', () => {
  test('throws helpful error on pending value', () => {
    const session = freshSession()
    session.evaluate('(def p (promise-of 42))')
    expect(() => session.evaluate('@p')).toThrow(/pending.*async/i)
  })
})

describe('pending?', () => {
  test('returns true for pending values', () => {
    expect(freshSession().evaluate('(pending? (promise-of 1))')).toEqual(
      v.boolean(true)
    )
  })

  test('returns false for non-pending values', () => {
    expect(freshSession().evaluate('(pending? 42)')).toEqual(v.boolean(false))
    expect(freshSession().evaluate('(pending? nil)')).toEqual(v.boolean(false))
    expect(freshSession().evaluate('(pending? :kw)')).toEqual(v.boolean(false))
  })
})

describe('then', () => {
  test('applies f to resolved value', async () => {
    const result = evalPending('(then (promise-of 5) (fn [x] (* x 2)))')
    expect(await result.promise).toEqual(v.number(10))
  })

  test('applies f immediately if val is not pending', () => {
    const result = freshSession().evaluate('(then 5 (fn [x] (* x 2)))')
    expect(result).toEqual(v.number(10))
  })

  test('chains multiple then steps', async () => {
    const result = evalPending(`
      (-> (promise-of 3)
          (then (fn [x] (* x 2)))
          (then (fn [x] (+ x 1))))
    `)
    expect(await result.promise).toEqual(v.number(7))
  })

  test('then with anonymous fn shorthand', async () => {
    const result = evalPending('(then (promise-of 5) #(* % 3))')
    expect(await result.promise).toEqual(v.number(15))
  })
})

describe('catch*', () => {
  test('pass-through when not pending', () => {
    const result = freshSession().evaluate('(catch* 42 (fn [e] -1))')
    expect(result).toEqual(v.number(42))
  })

  test('handles rejected promise', async () => {
    const session = freshSession()
    // Use async block that throws
    const pending = session.evaluate(`
      (catch*
        (async (throw {:type :error/test :message "oops"}))
        (fn [e] (:type e)))
    `) as CljPending
    expect(pending.kind).toBe('pending')
    const resolved = await pending.promise
    expect(resolved.kind).not.toBe('nil')
    expect(resolved).toEqual(v.keyword(':error/test'))
    expect(resolved.kind).toEqual('keyword')
    expect((resolved as CljKeyword).name).toEqual(':error/test')
  })

  test('rejected promise from native that returns pending', async () => {
    // Can't easily create a rejected pending from Clojure in V1 without JS interop.
    // Test via promise-of which always resolves. catch* is pass-through.
    const result = evalPending('(catch* (promise-of 42) (fn [e] -1))')
    expect(await result.promise).toEqual(v.number(42))
  })
})

describe('sync code unaffected', () => {
  test('sync evaluation has no overhead from async machinery', () => {
    const result = freshSession().evaluate('(reduce + 0 (range 100))')
    expect(result).toEqual(v.number(4950))
    expect(result.kind).not.toBe('pending')
  })

  test('existing special forms still work', () => {
    const session = freshSession()
    expect(session.evaluate('(let [x 5] (* x 2))')).toEqual(v.number(10))
    expect(
      session.evaluate(
        '(loop [i 0 acc 0] (if (= i 5) acc (recur (inc i) (+ acc i))))'
      )
    ).toEqual(v.number(10))
  })
})

describe('async with collections', () => {
  test('vector literals in async resolve elements', async () => {
    const result = evalPending('(async [1 2 3])')
    const resolved = await result.promise
    expect(resolved).toEqual(v.vector([v.number(1), v.number(2), v.number(3)]))
  })

  test('map literals in async resolve entries', async () => {
    const result = evalPending('(async {:a 1 :b 2})')
    const resolved = await result.promise
    expect(resolved).toEqual(
      v.map([
        [v.keyword(':a'), v.number(1)],
        [v.keyword(':b'), v.number(2)],
      ])
    )
  })
})

describe('async with if', () => {
  test('if with pending condition — awaits condition', async () => {
    const result = evalPending('(async (if @(promise-of true) :yes :no))')
    expect(await result.promise).toEqual(v.keyword(':yes'))
  })

  test('if false branch', async () => {
    const result = evalPending('(async (if @(promise-of false) :yes :no))')
    expect(await result.promise).toEqual(v.keyword(':no'))
  })

  test('if on pending returns true', async () => {
    const result = evalPending('(async (if (promise-of false) :yes :no))')
    expect(await result.promise).toEqual(v.keyword(':yes'))
  })

  test('if on pending nil returns false', async () => {
    const result = evalPending('(async (if @(promise-of nil) :yes :no))')
    expect(await result.promise).toEqual(v.keyword(':no'))
  })
})

describe('async with do', () => {
  test('do evaluates sequentially', async () => {
    const session = freshSession()
    session.evaluate('(def counter (atom 0))')
    const result = session.evaluate(
      '(async (do (swap! counter inc) (swap! counter inc) @counter))'
    ) as CljPending
    const resolved = await result.promise
    expect(resolved).toEqual(v.number(2))
  })
})

describe('async with loop/recur', () => {
  test('loop recur inside async', async () => {
    const result = evalPending(`
      (async
        (loop [i 0 acc 0]
          (if (= i 5)
            acc
            (recur (inc i) (+ acc i)))))
    `)
    expect(await result.promise).toEqual(v.number(10))
  })

  test('loop recur inside async with deref', async () => {
    const result = evalPending(`
      (async
        (loop [i 0 acc 0]
          (let [x @(promise-of 10)]
            (if (= i 5)
              acc
              (recur (inc i) (+ acc x))))))
    `)
    expect(await result.promise).toEqual(v.number(50))
  })

  test('loop recur inside async with deref on recur body', async () => {
    const result = evalPending(`
      (async
        (loop [i 0 acc 0]
          (let [x (promise-of 10)]
            (if (= i 5)
              acc
              (recur (inc i) (+ acc @x))))))
    `)
    expect(await result.promise).toEqual(v.number(50))
  })
})

describe('promise-of', () => {
  test('wraps any value in a pending', async () => {
    const p = evalPending('(promise-of {:x 1})')
    const resolved = await p.promise
    expect(resolved).toEqual(v.map([[v.keyword(':x'), v.number(1)]]))
  })

  test('promise-of nil', async () => {
    const p = evalPending('(promise-of nil)')
    expect((await p.promise).kind).toBe('nil')
  })
})

describe('fn called from async', () => {
  test('user-defined function called inside async', async () => {
    const session = freshSession()
    session.evaluate('(defn double [x] (* x 2))')
    const result = session.evaluate(
      '(async (double @(promise-of 7)))'
    ) as CljPending
    expect(await result.promise).toEqual(v.number(14))
  })

  test('async in fn body works', async () => {
    const session = freshSession()
    session.evaluate('(defn fetch-double [x] (async (* @(promise-of x) 2)))')
    const result = session.evaluate('(fetch-double 6)') as CljPending
    expect(result.kind).toBe('pending')
    expect(await result.promise).toEqual(v.number(12))
  })
})

// ---------------------------------------------------------------------------
// Error propagation in async chains
//
// These tests map the actual behaviour of the current implementation.
// Some are expected to fail — they document gaps to fix in a future session.
// Each test is annotated with [PASS] or [GAP] based on observed behaviour.
// ---------------------------------------------------------------------------

describe('error propagation — error at start of chain', () => {
  // [PASS] The simplest case: async block throws, catch* handles it.
  test('catch* at end catches throw at start', async () => {
    const session = freshSession()
    const result = session.evaluate(`
      (catch*
        (async (throw {:type :start-error :value 1}))
        (fn [e] {:caught true :type (:type e)}))
    `) as CljPending
    const resolved = await result.promise
    expect(resolved).toEqual(
      v.map([
        [v.keyword(':caught'), v.boolean(true)],
        [v.keyword(':type'), v.keyword(':start-error')],
      ])
    )
  })

  // [GAP] throw at start propagates through then — then should be skipped.
  // ACTUAL: `then` calls ctx.applyCallable(f, [resolved], callEnv) synchronously
  // inside the .then callback. When the upstream promise rejects, the .then callback
  // is NOT called — that's correct JS behaviour. However the CljThrownSignal escapes
  // the .catch chain and surfaces as an unhandled error rather than a CljPending
  // rejection. Root cause: `then` doesn't re-wrap CljThrownSignal in the promise
  // rejection chain. Need: catch CljThrownSignal inside the .then/.catch callbacks
  // and convert it to a promise rejection.
  test('then after throwing async is skipped', async () => {
    const session = freshSession()
    // Rejection propagates through then (callback is never called), caught by catch*.
    const caught = session.evaluate(`
      (catch*
        (then
          (async (throw {:type :start-error}))
          (fn [x] (+ x 1)))
        identity)
    `) as CljPending
    const resolved = await caught.promise
    expect(resolved).toEqual(
      v.map([[v.keyword(':type'), v.keyword(':start-error')]])
    )
  })

  // [PASS] Error at start + multiple then steps all skipped + catch* at end.
  test('multiple then steps all skipped when chain starts with rejection', async () => {
    const session = freshSession()
    const result = session.evaluate(`
      (catch*
        (-> (async (throw {:type :start-error}))
            (then (fn [x] (* x 2)))
            (then (fn [x] (+ x 1))))
        (fn [e] [:caught (:type e)]))
    `) as CljPending
    const resolved = await result.promise
    expect(resolved).toEqual(
      v.vector([v.keyword(':caught'), v.keyword(':start-error')])
    )
  })
})

describe('error propagation — error in the middle of a chain', () => {
  // [PASS] then handler that throws — rejection propagates correctly.
  test('throw inside then handler rejects the chain', async () => {
    const session = freshSession()
    const result = session.evaluate(`
      (catch*
        (-> (promise-of 5)
            (then (fn [x] (throw {:type :mid-error :input x})))
            (then (fn [x] (* x 2))))
        (fn [e] {:caught true :type (:type e) :input (:input e)}))
    `) as CljPending
    const resolved = await result.promise
    // Expected: the second then is skipped, catch* gets {:type :mid-error :input 5}
    expect(resolved).toEqual(
      v.map([
        [v.keyword(':caught'), v.boolean(true)],
        [v.keyword(':type'), v.keyword(':mid-error')],
        [v.keyword(':input'), v.number(5)],
      ])
    )
  })

  // [PASS] EvaluationError (not CljThrownSignal) in then handler — propagates correctly.
  test('runtime error in then handler rejects the chain', async () => {
    const session = freshSession()
    // Divide by zero causes an EvaluationError
    const result = session.evaluate(`
      (catch*
        (-> (promise-of 5)
            (then (fn [x] (/ x 0)))
            (then (fn [x] (* x 2))))
        (fn [e] {:caught true :type (:type e)}))
    `) as CljPending
    const resolved = await result.promise
    // Expected: catch* receives an error map
    expect(resolved.kind).toBe('map')
    const m = resolved as CljMap
    const caught = m.entries.find(
      ([k]) => k.kind === 'keyword' && k.name === ':caught'
    )
    expect(caught?.[1]).toEqual(v.boolean(true))
  })

  // [PASS] Type error (calling non-fn) in then handler — rejection propagates correctly.
  test('calling non-fn in then handler rejects the chain', async () => {
    const session = freshSession()
    const result = session.evaluate(`
      (catch*
        (-> (promise-of 5)
            (then (fn [x] (x 1)))
            (then (fn [x] (* x 2))))
        (fn [e] :recovered))
    `) as CljPending
    const resolved = await result.promise
    expect(resolved).toEqual(v.keyword(':recovered'))
  })
})

describe('error propagation — recovery mid-chain', () => {
  // [PASS] catch* that recovers allows the chain to continue with then.
  test('catch* recovery value flows into subsequent then', async () => {
    const session = freshSession()
    const result = session.evaluate(`
      (-> (async (throw {:type :oops}))
          (catch* (fn [e] 99))
          (then (fn [x] (* x 2))))
    `) as CljPending
    // Expected: catch* recovers with 99, then sees 99, produces 198
    const resolved = await result.promise
    expect(resolved).toEqual(v.number(198))
  })

  // [PASS] catch* in the middle of a long chain — recovery works, rest of chain runs.
  test('catch* mid-chain recovers and rest of chain runs', async () => {
    const session = freshSession()
    const result = session.evaluate(`
      (-> (promise-of 10)
          (then (fn [x] (throw {:type :mid-error})))
          (catch* (fn [e] 0))
          (then (fn [x] (+ x 5))))
    `) as CljPending
    // Expected: error thrown, caught with 0, then adds 5 → 5
    const resolved = await result.promise
    expect(resolved).toEqual(v.number(5))
  })

  // [PASS] catch* that re-throws — chain remains rejected.
  test('catch* that re-throws keeps chain rejected', async () => {
    const session = freshSession()
    const result = session.evaluate(`
      (catch*
        (-> (async (throw {:type :original}))
            (catch* (fn [e] (throw {:type :rethrown :original (:type e)}))))
        (fn [e] {:final (:type e)}))
    `) as CljPending
    const resolved = await result.promise
    // Expected: final handler sees {:type :rethrown}
    expect(resolved).toEqual(
      v.map([[v.keyword(':final'), v.keyword(':rethrown')]])
    )
  })
})

describe('error propagation — error inside async @', () => {
  // [PASS] awaiting a pending that rejects inside async block propagates correctly.
  test('@ on a rejecting pending propagates to async block rejection', async () => {
    const session = freshSession()
    // Create a pending that will reject
    session.evaluate('(def bad (async (throw {:type :deref-error})))')
    const result = session.evaluate(`
      (catch*
        (async
          (let [x @bad]
            (* x 2)))
        (fn [e] [:caught (:type e)]))
    `) as CljPending
    const resolved = await result.promise
    // Expected: the @ on a rejected pending causes the async block to reject,
    // which catch* handles
    expect(resolved).toEqual(
      v.vector([v.keyword(':caught'), v.keyword(':deref-error')])
    )
  })

  // [PASS] try/catch inside async block catches rejection from @.
  test('try/catch inside async wraps @ rejection', async () => {
    const session = freshSession()
    session.evaluate('(def bad (async (throw {:type :deref-error})))')
    const result = session.evaluate(`
      (async
        (try
          (let [x @bad] x)
          (catch :default e
            [:caught-inside (:type e)])))
    `) as CljPending
    const resolved = await result.promise
    // Expected: async try/catch inside catches the error
    expect(resolved).toEqual(
      v.vector([v.keyword(':caught-inside'), v.keyword(':deref-error')])
    )
  })
})

describe('error propagation — unhandled rejections', () => {
  test('unhandled rejection causes promise to reject', async () => {
    const pending = evalPending('(async (throw {:type :unhandled}))')
    await expect(pending.promise).rejects.toBeDefined()
  })

  test('then with non-function second arg throws synchronously', () => {
    const session = freshSession()
    expect(() => session.evaluate('(then (promise-of 1) 42)')).toThrow()
  })

  test('catch* with non-function second arg throws synchronously', () => {
    const session = freshSession()
    expect(() => session.evaluate('(catch* (promise-of 1) 42)')).toThrow()
  })
})

// ---------------------------------------------------------------------------
// Nested error handling — async inside then/catch* callbacks
// ---------------------------------------------------------------------------

describe('nested error handling — async inside then/catch*', () => {
  test('then callback returns an async block — result is unwrapped transparently', async () => {
    const result = evalPending(`
      (-> (promise-of 5)
          (then (fn [x] (async (* x @(promise-of 2)))))
          (then (fn [x] (+ x 1))))
    `)
    // inner async resolves to 10, outer then adds 1 → 11
    expect(await result.promise).toEqual(v.number(11))
  })

  test('then callback returns a throwing async block — rejects the chain', async () => {
    const session = freshSession()
    const result = session.evaluate(`
      (catch*
        (-> (promise-of 5)
            (then (fn [x] (async (throw {:type :nested-throw :val x}))))
            (then (fn [x] (* x 2))))
        (fn [e] {:caught true :type (:type e) :val (:val e)}))
    `) as CljPending
    expect(await result.promise).toEqual(
      v.map([
        [v.keyword(':caught'), v.boolean(true)],
        [v.keyword(':type'), v.keyword(':nested-throw')],
        [v.keyword(':val'), v.number(5)],
      ])
    )
  })

  test('catch* handler returns an async block — recovery value continues the chain', async () => {
    const result = evalPending(`
      (-> (async (throw {:type :oops}))
          (catch* (fn [e] (async (* 3 @(promise-of 10)))))
          (then   (fn [x] (+ x 1))))
    `)
    // catch* resolves via async to 30, then adds 1 → 31
    expect(await result.promise).toEqual(v.number(31))
  })

  test('catch* handler that throws — new rejection caught by outer catch*', async () => {
    const session = freshSession()
    const result = session.evaluate(`
      (catch*
        (-> (async (throw {:type :original}))
            (catch* (fn [e] (throw {:type :from-handler}))))
        (fn [e] (:type e)))
    `) as CljPending
    expect(await result.promise).toEqual(v.keyword(':from-handler'))
  })

  test('catch* handler returns async that throws — outer catch* sees new error', async () => {
    const session = freshSession()
    const result = session.evaluate(`
      (catch*
        (-> (async (throw {:type :original}))
            (catch* (fn [e] (async (throw {:type :async-from-handler})))))
        (fn [e] (:type e)))
    `) as CljPending
    expect(await result.promise).toEqual(v.keyword(':async-from-handler'))
  })
})

// ---------------------------------------------------------------------------
// Nested error handling — multiple subscribers on the same pending (fan-out)
// ---------------------------------------------------------------------------

describe('nested error handling — multiple subscribers (fan-out)', () => {
  test('two independent then chains on the same resolved pending', async () => {
    const session = freshSession()
    session.evaluate('(def base (promise-of 10))')
    const s1 = session.evaluate('(then base (fn [x] (* x 2)))') as CljPending
    const s2 = session.evaluate('(then base (fn [x] (+ x 100)))') as CljPending
    expect(await s1.promise).toEqual(v.number(20))
    expect(await s2.promise).toEqual(v.number(110))
  })

  test('two independent catch* handlers on the same rejected pending', async () => {
    const session = freshSession()
    session.evaluate('(def bad (async (throw {:type :shared-error})))')
    const h1 = session.evaluate(
      '(catch* bad (fn [e] [:h1 (:type e)]))'
    ) as CljPending
    const h2 = session.evaluate(
      '(catch* bad (fn [e] [:h2 (:type e)]))'
    ) as CljPending
    expect(await h1.promise).toEqual(
      v.vector([v.keyword(':h1'), v.keyword(':shared-error')])
    )
    expect(await h2.promise).toEqual(
      v.vector([v.keyword(':h2'), v.keyword(':shared-error')])
    )
  })

  test('one subscriber catches, another maps the rejection value — both independent', async () => {
    const session = freshSession()
    session.evaluate('(def bad (async (throw {:type :base})))')
    const recovered = session.evaluate(
      '(catch* bad (fn [e] :recovered))'
    ) as CljPending
    const typed = session.evaluate(
      '(catch* bad (fn [e] (:type e)))'
    ) as CljPending
    expect(await recovered.promise).toEqual(v.keyword(':recovered'))
    expect(await typed.promise).toEqual(v.keyword(':base'))
  })

  test('fan-out then chain extending from a shared intermediate pending', async () => {
    // Two chains share `doubled` — both should see 20 independently.
    const session = freshSession()
    session.evaluate('(def base (promise-of 10))')
    session.evaluate('(def doubled (then base (fn [x] (* x 2))))')
    const p1 = session.evaluate('(then doubled (fn [x] (+ x 1)))') as CljPending
    const p2 = session.evaluate('(then doubled (fn [x] (- x 1)))') as CljPending
    expect(await p1.promise).toEqual(v.number(21))
    expect(await p2.promise).toEqual(v.number(19))
  })
})

// ---------------------------------------------------------------------------
// Nested error handling — deep nesting inside async blocks
// ---------------------------------------------------------------------------

describe('nested error handling — deep nesting inside async', () => {
  test('try/catch wrapping a deref of a rejecting nested async', async () => {
    const result = evalPending(`
      (async
        (try
          @(async (throw {:type :deep}))
          (catch :default e [:outer-caught (:type e)])))
    `)
    expect(await result.promise).toEqual(
      v.vector([v.keyword(':outer-caught'), v.keyword(':deep')])
    )
  })

  test('inner try/catch recovers — outer async sees clean value', async () => {
    const result = evalPending(`
      (async
        (let [inner-result
              (try
                @(async (throw {:type :inner}))
                (catch :default e [:inner-caught (:type e)]))]
          {:result inner-result}))
    `)
    expect(await result.promise).toEqual(
      v.map([
        [
          v.keyword(':result'),
          v.vector([v.keyword(':inner-caught'), v.keyword(':inner')]),
        ],
      ])
    )
  })

  test('two sequential try/catch blocks inside async — each catches its own error', async () => {
    const result = evalPending(`
      (async
        (let [a (try @(async (throw {:type :err-a}))
                     (catch :default e (:type e)))
              b (try @(async (throw {:type :err-b}))
                     (catch :default e (:type e)))]
          [a b]))
    `)
    expect(await result.promise).toEqual(
      v.vector([v.keyword(':err-a'), v.keyword(':err-b')])
    )
  })

  test('inner try/catch re-throws — outer try/catch catches the re-throw', async () => {
    const result = evalPending(`
      (async
        (try
          (try
            @(async (throw {:type :original}))
            (catch :default e (throw {:type :rethrown})))
          (catch :default e2 (:type e2))))
    `)
    expect(await result.promise).toEqual(v.keyword(':rethrown'))
  })
})

// ---------------------------------------------------------------------------
// Nested error handling — long alternating pipelines
// ---------------------------------------------------------------------------

describe('nested error handling — long alternating pipelines', () => {
  test('alternating then/catch* with two recovery points', async () => {
    const result = evalPending(`
      (-> (promise-of 1)
          (then   (fn [x] (+ x 1)))                      ;; → 2
          (then   (fn [x] (throw {:type :first-error})))  ;; rejects
          (catch* (fn [e] 10))                             ;; recovers → 10
          (then   (fn [x] (* x 3)))                        ;; → 30
          (then   (fn [x] (throw {:type :second-error})))  ;; rejects
          (catch* (fn [e] 99))                             ;; recovers → 99
          (then   (fn [x] (+ x 1))))                       ;; → 100
    `)
    expect(await result.promise).toEqual(v.number(100))
  })

  test('rejection skips multiple then steps and lands on catch* further down', async () => {
    const result = evalPending(`
      (-> (promise-of 5)
          (then (fn [x] (* x 10)))
          (then (fn [x] (throw {:type :skip-me})))
          (then (fn [x] (+ x 999)))
          (catch* (fn [e] [:finally (:type e)])))
    `)
    expect(await result.promise).toEqual(
      v.vector([v.keyword(':finally'), v.keyword(':skip-me')])
    )
  })

  test('happy path through a pipeline that has catch* branches (no errors)', async () => {
    // No errors thrown — catch* callbacks should never run
    const result = evalPending(`
      (-> (promise-of 1)
          (then   (fn [x] (* x 2)))     ;; → 2
          (catch* (fn [e] -999))         ;; skipped
          (then   (fn [x] (+ x 8)))     ;; → 10
          (catch* (fn [e] -999))         ;; skipped
          (then   (fn [x] (* x x))))    ;; → 100
    `)
    expect(await result.promise).toEqual(v.number(100))
  })

  test('error passes through a catch* that re-throws into a final catch*', async () => {
    const session = freshSession()
    const result = session.evaluate(`
      (catch*
        (-> (async (throw {:type :start}))
            (catch* (fn [e] (throw {:type :relay :original (:type e)})))
            (then   (fn [x] (* x 2))))
        (fn [e] {:final (:type e) :orig (:original e)}))
    `) as CljPending
    expect(await result.promise).toEqual(
      v.map([
        [v.keyword(':final'), v.keyword(':relay')],
        [v.keyword(':orig'), v.keyword(':start')],
      ])
    )
  })
})

// ---------------------------------------------------------------------------
// evaluateAsync — session boundary auto-unwrapping
// ---------------------------------------------------------------------------

describe('evaluateAsync — session boundary', () => {
  test('resolves the value of an async block', async () => {
    const session = freshSession()
    const result = await session.evaluateAsync('(async 42)')
    expect(result).toEqual(v.number(42))
  })

  test('passthrough — non-pending value returned as-is', async () => {
    const session = freshSession()
    const result = await session.evaluateAsync('(+ 1 2)')
    expect(result).toEqual(v.number(3))
  })

  test('resolves the last form in a multi-form async block', async () => {
    const session = freshSession()
    const result = await session.evaluateAsync('(async 1 2 3)')
    expect(result).toEqual(v.number(3))
  })

  test('awaits @ inside async transparently', async () => {
    const session = freshSession()
    const result = await session.evaluateAsync('(async (+ @(promise-of 10) 5))')
    expect(result).toEqual(v.number(15))
  })

  test('unwraps a then pipeline', async () => {
    const session = freshSession()
    const result = await session.evaluateAsync(
      '(then (promise-of 7) (fn [x] (* x 3)))'
    )
    expect(result).toEqual(v.number(21))
  })

  test('rejected async block — throw becomes EvaluationError', async () => {
    const session = freshSession()
    await expect(
      session.evaluateAsync('(async (throw {:type :oops}))')
    ).rejects.toThrow(EvaluationError)
  })

  test('rejected async block — error message includes thrown value', async () => {
    const session = freshSession()
    await expect(
      session.evaluateAsync('(async (throw {:type :oops}))')
    ).rejects.toThrow('Unhandled throw')
  })

  test('rejected async block — thrownValue is set on EvaluationError', async () => {
    const session = freshSession()
    try {
      await session.evaluateAsync('(async (throw {:type :payload}))')
      expect.fail('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(EvaluationError)
      const ctx = (e as EvaluationError).context as { thrownValue: unknown }
      expect(ctx.thrownValue).toEqual(
        v.map([[v.keyword(':type'), v.keyword(':payload')]])
      )
    }
  })

  test('rejected catch* pipeline becomes EvaluationError', async () => {
    const session = freshSession()
    await expect(
      session.evaluateAsync(
        '(async @(then (promise-of 1) (fn [_] (throw {:type :chain-err}))))'
      )
    ).rejects.toThrow(EvaluationError)
  })

  test('sync error during evaluate propagates normally (not wrapped again)', async () => {
    const session = freshSession()
    await expect(session.evaluateAsync('(/ 1 0)')).rejects.toThrow(
      EvaluationError
    )
  })

  test('nil passthrough — empty async resolves to nil', async () => {
    const session = freshSession()
    const result = await session.evaluateAsync('(async)')
    expect(result.kind).toBe('nil')
  })
})

describe('(all ...) — fan-out async combinator', () => {
  test('resolves with vector of all results', async () => {
    const session = freshSession()
    const result = await session.evaluateAsync(
      '(async @(all [(promise-of 1) (promise-of 2) (promise-of 3)]))'
    )
    expect(result).toEqual(v.vector([v.number(1), v.number(2), v.number(3)]))
  })

  test('empty vector resolves to empty vector', async () => {
    const session = freshSession()
    const result = await session.evaluateAsync('(async @(all []))')
    expect(result).toEqual(v.vector([]))
  })

  test('nil input resolves to empty vector', async () => {
    const session = freshSession()
    const result = await session.evaluateAsync('(async @(all nil))')
    expect(result).toEqual(v.vector([]))
  })

  test('non-pending items treated as already resolved', async () => {
    const session = freshSession()
    const result = await session.evaluateAsync(
      '(async @(all [1 2 (promise-of 3)]))'
    )
    expect(result).toEqual(v.vector([v.number(1), v.number(2), v.number(3)]))
  })

  test('one rejection causes the whole result to reject', async () => {
    const session = freshSession()
    await expect(
      session.evaluateAsync(
        '(async @(all [(promise-of 1) (then (promise-of 2) (fn [_] (throw :boom)))]))'
      )
    ).rejects.toThrow()
  })

  test('fan-out: map + all pattern', async () => {
    const session = freshSession()
    const result = await session.evaluateAsync(
      '(async @(all (map (fn [n] (promise-of (* n n))) [1 2 3 4])))'
    )
    expect(result).toEqual(
      v.vector([v.number(1), v.number(4), v.number(9), v.number(16)])
    )
  })
})
