import { describe, expect, it } from 'vitest'
import { createSession, EvaluationError } from '@regibyte/cljam'
import { library as integrantLib } from '../../conjure'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession() {
  return createSession({
    libraries: [integrantLib],
    allowedPackages: ['cljam-integrant', 'cljam.integrant'],
  })
}

/** Evaluate a multi-line source in a fresh session and return the last result. */
function run(source: string) {
  return makeSession().evaluate(source)
}

/** Unwrap a CljPending to its resolved CljValue (for tests only). */
async function resolve(val: unknown): Promise<unknown> {
  if (
    val !== null &&
    typeof val === 'object' &&
    (val as { kind: string }).kind === 'pending'
  ) {
    return await (val as { promise: Promise<unknown> }).promise
  }
  return val
}

// ---------------------------------------------------------------------------
// 1. Session setup
// ---------------------------------------------------------------------------

describe('cljam-integrant — session setup', () => {
  it('installs without error', () => {
    expect(() => createSession({ libraries: [integrantLib] })).not.toThrow()
  })

  it('appears in session.capabilities.libraries', () => {
    const session = createSession({ libraries: [integrantLib] })
    expect(session.capabilities.libraries).toContain('cljam-integrant')
  })

  it('cljam.integrant.core namespace loads on :require', () => {
    const session = makeSession()
    expect(() =>
      session.evaluate('(ns t (:require [cljam.integrant.core :as ig]))')
    ).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// 2. ref / refset predicates
// ---------------------------------------------------------------------------

describe('cljam-integrant — ref/refset predicates', () => {
  it('(ref k) produces a tagged map', () => {
    const result = run(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (ig/ref :app/db)
    `)
    expect(result.kind).toBe('map')
    expect((result as any).entries[0][0].name).toBe(':integrant.core/ref')
    expect((result as any).entries[0][1].name).toBe(':app/db')
  })

  it('(ref? (ref k)) is true', () => {
    const result = run(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (ig/ref? (ig/ref :app/db))
    `)
    expect(result).toEqual({ kind: 'boolean', value: true })
  })

  it('(ref? {:foo :bar}) is false', () => {
    const result = run(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (ig/ref? {:foo :bar})
    `)
    expect(result).toEqual({ kind: 'boolean', value: false })
  })

  it('(refset k) produces a tagged map with :integrant.core/refset', () => {
    const result = run(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (ig/refset :app/db)
    `)
    expect(result.kind).toBe('map')
    expect((result as any).entries[0][0].name).toBe(':integrant.core/refset')
  })

  it('(reflike? (ref k)) is true', () => {
    const result = run(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (ig/reflike? (ig/ref :app/db))
    `)
    expect(result).toEqual({ kind: 'boolean', value: true })
  })

  it('(reflike? "foo") is false', () => {
    const result = run(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (ig/reflike? "foo")
    `)
    expect(result).toEqual({ kind: 'boolean', value: false })
  })
})

// ---------------------------------------------------------------------------
// 3. ig/init — simple 2-key config, ref resolved correctly
// ---------------------------------------------------------------------------

describe('cljam-integrant — ig/init basic', () => {
  it('inits a single-key config and returns a system map', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (defmethod ig/init-key :t/counter [_ {:keys [start]}]
        (atom start))
      (ig/init {:t/counter {:start 42}})
    `)
    const system = await resolve(pending)
    expect((system as any).kind).toBe('map')
    // system[:t/counter] should be a CljAtom
    const entry = (system as any).entries.find(
      ([k]: any[]) => k.name === ':t/counter'
    )
    expect(entry).toBeDefined()
    expect(entry[1].kind).toBe('atom')
  })

  it('resolves a ref — :app/server receives the :app/db value', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))

      (defmethod ig/init-key :t/db [_ _] :db-connection)
      (defmethod ig/init-key :t/server [_ {:keys [db]}]
        {:started true :db db})

      (ig/init {:t/db {}
                :t/server {:db (ig/ref :t/db)}})
    `)
    const system = await resolve(pending)
    const entry = (system as any).entries.find(
      ([k]: any[]) => k.name === ':t/server'
    )
    expect(entry).toBeDefined()
    // server value should have {:started true, :db :db-connection}
    const serverVal = entry[1]
    expect(serverVal.kind).toBe('map')
    const dbEntry = serverVal.entries.find(
      ([k]: any[]) => k.name === ':db'
    )
    expect(dbEntry[1]).toEqual({ kind: 'keyword', name: ':db-connection' })
  })

  it('system map has :integrant.core/origin metadata', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (defmethod ig/init-key :t/x [_ _] :started)
      (ig/init {:t/x {}})
    `)
    const system = await resolve(pending) as any
    expect(system.meta).toBeDefined()
    const originEntry = system.meta.entries.find(
      ([k]: any[]) => k.name === ':integrant.core/origin'
    )
    expect(originEntry).toBeDefined()
    expect(originEntry[1].kind).toBe('map')
  })
})

// ---------------------------------------------------------------------------
// 4. ig/init — async init-key (returns a pending)
// ---------------------------------------------------------------------------

describe('cljam-integrant — async init-key', () => {
  it('awaits a pending returned by init-key', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (defmethod ig/init-key :t/async-thing [_ {:keys [val]}]
        (promise-of val))
      (ig/init {:t/async-thing {:val :resolved}})
    `)
    const system = await resolve(pending) as any
    const entry = system.entries.find(([k]: any[]) => k.name === ':t/async-thing')
    expect(entry[1]).toEqual({ kind: 'keyword', name: ':resolved' })
  })
})

// ---------------------------------------------------------------------------
// 5. ig/init — dependency ordering (3-level chain)
// ---------------------------------------------------------------------------

describe('cljam-integrant — dependency ordering', () => {
  it('inits keys in correct dependency order', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (def *order (atom []))

      (defmethod ig/init-key :t/a [_ _]
        (swap! *order conj :a)
        :a-val)

      (defmethod ig/init-key :t/b [_ {:keys [a]}]
        (swap! *order conj :b)
        {:b true :a a})

      (defmethod ig/init-key :t/c [_ {:keys [b]}]
        (swap! *order conj :c)
        {:c true :b b})

      (-> (ig/init {:t/a {}
                    :t/b {:a (ig/ref :t/a)}
                    :t/c {:b (ig/ref :t/b)}})
          (then (fn [_] @*order)))
    `)
    const order = await resolve(pending) as any
    expect(order.kind).toBe('vector')
    const names = order.value.map((v: any) => v.name)
    // :a must come before :b, :b must come before :c
    expect(names.indexOf(':a')).toBeLessThan(names.indexOf(':b'))
    expect(names.indexOf(':b')).toBeLessThan(names.indexOf(':c'))
  })
})

// ---------------------------------------------------------------------------
// 6. ig/halt! — reverse dependency order
// ---------------------------------------------------------------------------

describe('cljam-integrant — ig/halt!', () => {
  it('halts a system and returns nil', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (defmethod ig/init-key  :t/x [_ _] :started)
      (defmethod ig/halt-key! :t/x [_ _] :stopped)
      (-> (ig/init {:t/x {}})
          (then ig/halt!))
    `)
    const result = await resolve(pending)
    expect((result as any)).toEqual({ kind: 'nil', value: null })
  })

  it('halts in reverse dependency order', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (def *halt-order (atom []))

      (defmethod ig/init-key  :t/a [_ _] :a)
      (defmethod ig/init-key  :t/b [_ _] :b)
      (defmethod ig/halt-key! :t/a [_ _] (swap! *halt-order conj :a))
      (defmethod ig/halt-key! :t/b [_ _] (swap! *halt-order conj :b))

      (-> (ig/init {:t/a {}
                    :t/b {:a (ig/ref :t/a)}})
          (then #(ig/halt! %))
          (then (fn [_] @*halt-order)))
    `)
    const order = await resolve(pending) as any
    expect(order.kind).toBe('vector')
    const names = order.value.map((v: any) => v.name)
    // :b (dependent) must be halted before :a (dependency)
    expect(names.indexOf(':b')).toBeLessThan(names.indexOf(':a'))
  })
})

// ---------------------------------------------------------------------------
// 7. ig/halt! — async halt-key!
// ---------------------------------------------------------------------------

describe('cljam-integrant — async halt-key!', () => {
  it('awaits a pending returned by halt-key!', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (def *halted (atom false))
      (defmethod ig/init-key  :t/async [_ _] :val)
      (defmethod ig/halt-key! :t/async [_ _]
        (then (promise-of :ignored)
              (fn [_] (reset! *halted true))))
      (-> (ig/init {:t/async {}})
          (then #(ig/halt! %))
          (then (fn [_] @*halted)))
    `)
    const halted = await resolve(pending)
    expect(halted).toEqual({ kind: 'boolean', value: true })
  })
})

// ---------------------------------------------------------------------------
// 8. assert-key — validation before init
// ---------------------------------------------------------------------------

describe('cljam-integrant — assert-key', () => {
  it('assert-key default is no-op (does not throw)', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (defmethod ig/init-key :t/validated [_ _] :ok)
      (ig/init {:t/validated {:port 3000}})
    `)
    const system = await resolve(pending)
    expect((system as any).kind).toBe('map')
  })

  it('throwing assert-key prevents init', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (defmethod ig/assert-key :t/strict [_ {:keys [port]}]
        (when-not (number? port)
          (throw (ex-info "port must be a number" {:port port}))))
      (defmethod ig/init-key :t/strict [_ _] :started)
      (ig/init {:t/strict {:port "not-a-number"}})
    `)
    await expect(resolve(pending)).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// 9. resolve-key — ref resolution projection
// ---------------------------------------------------------------------------

describe('cljam-integrant — resolve-key', () => {
  it('resolve-key default returns value as-is', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (defmethod ig/init-key :t/db [_ _] {:conn :db-connection :pool :pool-obj})
      (defmethod ig/init-key :t/server [_ {:keys [db]}]
        {:server true :db db})
      (ig/init {:t/db {}
                :t/server {:db (ig/ref :t/db)}})
    `)
    const system = await resolve(pending) as any
    const serverEntry = system.entries.find(([k]: any[]) => k.name === ':t/server')
    const dbInServer = serverEntry[1].entries.find(([k]: any[]) => k.name === ':db')
    // Default resolve-key returns the full value
    expect(dbInServer[1].kind).toBe('map')
  })

  it('custom resolve-key projects the value for refs', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (defmethod ig/init-key   :t/db [_ _] {:conn :db-conn :port 5432})
      ; resolve-key returns only the :conn part for refs
      (defmethod ig/resolve-key :t/db [_ v] (:conn v))
      (defmethod ig/init-key   :t/server [_ {:keys [db]}]
        {:started true :db db})
      (ig/init {:t/db {}
                :t/server {:db (ig/ref :t/db)}})
    `)
    const system = await resolve(pending) as any
    const serverEntry = system.entries.find(([k]: any[]) => k.name === ':t/server')
    const dbInServer = serverEntry[1].entries.find(([k]: any[]) => k.name === ':db')
    // resolve-key projected :conn value
    expect(dbInServer[1]).toEqual({ kind: 'keyword', name: ':db-conn' })
  })
})

// ---------------------------------------------------------------------------
// 10. ig/resume — reuses existing resource when config unchanged
// ---------------------------------------------------------------------------

describe('cljam-integrant — ig/resume', () => {
  it('resume-key default calls init-key again', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (def *init-count (atom 0))
      (defmethod ig/init-key :t/counter [_ _]
        (swap! *init-count inc))
      (-> (ig/init {:t/counter {}})
          (then (fn [sys]
                  (-> (ig/resume {:t/counter {}} sys)
                      (then (fn [_] @*init-count))))))
    `)
    const count = await resolve(pending)
    // Default resume-key calls init-key, so init count = 2
    expect(count).toEqual({ kind: 'number', value: 2 })
  })

  it('custom resume-key reuses old resource when config unchanged', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (def *resume-called (atom false))
      (defmethod ig/init-key   :t/res [_ _] {:resource :new})
      (defmethod ig/resume-key :t/res [_ _ old-val _]
        (reset! *resume-called true)
        old-val)
      (-> (ig/init {:t/res {}})
          (then (fn [sys]
                  (-> (ig/resume {:t/res {}} sys)
                      (then (fn [_] @*resume-called))))))
    `)
    const resumed = await resolve(pending)
    expect(resumed).toEqual({ kind: 'boolean', value: true })
  })
})

// ---------------------------------------------------------------------------
// 11. ig/suspend! — suspend parks, resume restores
// ---------------------------------------------------------------------------

describe('cljam-integrant — ig/suspend! + ig/resume', () => {
  it('suspend-key! default calls halt-key!', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (def *halted (atom false))
      (defmethod ig/init-key  :t/svc [_ _] :running)
      (defmethod ig/halt-key! :t/svc [_ _] (reset! *halted true))
      (-> (ig/init {:t/svc {}})
          (then (fn [sys]
                  (-> (ig/suspend! sys)
                      (then (fn [_] @*halted))))))
    `)
    const halted = await resolve(pending)
    expect(halted).toEqual({ kind: 'boolean', value: true })
  })

  it('custom suspend-key! parks the resource', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (def *suspended (atom false))
      (defmethod ig/init-key    :t/parkable [_ _] :running)
      (defmethod ig/suspend-key! :t/parkable [_ _] (reset! *suspended true))
      (-> (ig/init {:t/parkable {}})
          (then (fn [sys]
                  (-> (ig/suspend! sys)
                      (then (fn [_] @*suspended))))))
    `)
    const suspended = await resolve(pending)
    expect(suspended).toEqual({ kind: 'boolean', value: true })
  })
})

// ---------------------------------------------------------------------------
// 12. Error cases
// ---------------------------------------------------------------------------

describe('cljam-integrant — error cases', () => {
  it('circular dependency throws integrant/circular-dependency', () => {
    const session = makeSession()
    expect(() =>
      session.evaluate(`
        (ns t (:require [cljam.integrant.core :as ig]))
        (ig/init {:t/a {:b (ig/ref :t/b)}
                  :t/b {:a (ig/ref :t/a)}})
      `)
    ).toThrow()
  })

  it('missing ref throws during init', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (defmethod ig/init-key :t/server [_ _] :started)
      (ig/init {:t/server {:db (ig/ref :t/missing-db)}})
    `)
    await expect(resolve(pending)).rejects.toThrow()
  })

  it('init-key throwing wraps error as integrant/build-failed', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (defmethod ig/init-key :t/boom [_ _]
        (throw (ex-info "kaboom" {})))
      (ig/init {:t/boom {}})
    `)
    let caught: unknown
    try {
      await resolve(pending)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeDefined()
    expect((caught as EvaluationError).code).toBe('integrant/build-failed')
  })
})

// ---------------------------------------------------------------------------
// 13. Partial init/halt
// ---------------------------------------------------------------------------

describe('cljam-integrant — partial init/halt', () => {
  it('(ig/init config [:t/a]) only inits :t/a', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (defmethod ig/init-key :t/a [_ _] :a-started)
      (defmethod ig/init-key :t/b [_ _] :b-started)
      (ig/init {:t/a {} :t/b {}} [:t/a])
    `)
    const system = await resolve(pending) as any
    expect(system.kind).toBe('map')
    // Should contain :t/a but not :t/b
    const aEntry = system.entries.find(([k]: any[]) => k.name === ':t/a')
    const bEntry = system.entries.find(([k]: any[]) => k.name === ':t/b')
    expect(aEntry).toBeDefined()
    expect(bEntry).toBeUndefined()
  })

  it('partial init includes transitive deps', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (defmethod ig/init-key :t/a [_ _] :a)
      (defmethod ig/init-key :t/b [_ {:keys [a]}] {:b true :a a})
      (defmethod ig/init-key :t/c [_ _] :c)
      ; init only :t/b — :t/a should be included (dep), :t/c should not
      (ig/init {:t/a {} :t/b {:a (ig/ref :t/a)} :t/c {}} [:t/b])
    `)
    const system = await resolve(pending) as any
    const aEntry = system.entries.find(([k]: any[]) => k.name === ':t/a')
    const bEntry = system.entries.find(([k]: any[]) => k.name === ':t/b')
    const cEntry = system.entries.find(([k]: any[]) => k.name === ':t/c')
    expect(aEntry).toBeDefined()
    expect(bEntry).toBeDefined()
    expect(cEntry).toBeUndefined()
  })

  it('(ig/halt! system [:t/b]) only halts :t/b', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (def *halted (atom []))
      (defmethod ig/init-key  :t/a [_ _] :a)
      (defmethod ig/init-key  :t/b [_ _] :b)
      (defmethod ig/halt-key! :t/a [_ _] (swap! *halted conj :a))
      (defmethod ig/halt-key! :t/b [_ _] (swap! *halted conj :b))
      (-> (ig/init {:t/a {} :t/b {}})
          (then (fn [sys]
                  (-> (ig/halt! sys [:t/b])
                      (then (fn [_] @*halted))))))
    `)
    const halted = await resolve(pending) as any
    const names = halted.value.map((v: any) => v.name)
    expect(names).toContain(':b')
    expect(names).not.toContain(':a')
  })
})

// ---------------------------------------------------------------------------
// 14. refset — collects all matching values
// ---------------------------------------------------------------------------

describe('cljam-integrant — refset', () => {
  it('refset with exact key match returns a vector of one value', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (defmethod ig/init-key :t/store [_ _] :store-val)
      (defmethod ig/init-key :t/consumer [_ {:keys [stores]}]
        {:stores stores})
      (ig/init {:t/store {}
                :t/consumer {:stores (ig/refset :t/store)}})
    `)
    const system = await resolve(pending) as any
    const consumerEntry = system.entries.find(
      ([k]: any[]) => k.name === ':t/consumer'
    )
    const storesVal = consumerEntry[1].entries.find(
      ([k]: any[]) => k.name === ':stores'
    )
    // refset returns a vector
    expect(storesVal[1].kind).toBe('vector')
    expect(storesVal[1].value).toHaveLength(1)
    expect(storesVal[1].value[0]).toEqual({ kind: 'keyword', name: ':store-val' })
  })

  it('refset with no matching key returns empty vector', async () => {
    const session = makeSession()
    const pending = session.evaluate(`
      (ns t (:require [cljam.integrant.core :as ig]))
      (defmethod ig/init-key :t/consumer [_ {:keys [stores]}]
        {:stores stores})
      (ig/init {:t/consumer {:stores (ig/refset :t/no-store)}})
    `)
    const system = await resolve(pending) as any
    const consumerEntry = system.entries.find(
      ([k]: any[]) => k.name === ':t/consumer'
    )
    const storesVal = consumerEntry[1].entries.find(
      ([k]: any[]) => k.name === ':stores'
    )
    expect(storesVal[1].kind).toBe('vector')
    expect(storesVal[1].value).toHaveLength(0)
  })
})
