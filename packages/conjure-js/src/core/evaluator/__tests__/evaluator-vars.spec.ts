import { describe, it, expect, beforeAll } from 'vitest'
import {
  createSession,
  snapshotSession,
  createSessionFromSnapshot,
} from '../../session'
import type { Session, SessionSnapshot } from '../../session'
import { printString } from '../../printer'
import { materialize } from './evaluator-test-utils'

let snapshot: SessionSnapshot

beforeAll(() => {
  snapshot = snapshotSession(createSession())
})

function mkSession(): Session {
  return createSessionFromSnapshot(snapshot)
}

describe('Var system', () => {
  it('def + lookup auto-deref', () => {
    const s = mkSession()
    s.evaluate('(def x 5)')
    expect(s.evaluate('x').kind).toBe('number')
    expect((s.evaluate('x') as any).value).toBe(5)
  })

  it('def re-def mutates Var in place', () => {
    const s = mkSession()
    s.evaluate('(def x 5)')
    s.evaluate('(def x 10)')
    expect((s.evaluate('x') as any).value).toBe(10)
  })

  it('var? on a Var returns true', () => {
    const s = mkSession()
    s.evaluate('(def x 5)')
    expect((s.evaluate("(var? #'x)") as any).value).toBe(true)
  })

  it('var? on non-Var returns false', () => {
    const s = mkSession()
    expect((s.evaluate('(var? 42)') as any).value).toBe(false)
  })

  it('var-get returns the current value', () => {
    const s = mkSession()
    s.evaluate('(def x 5)')
    expect((s.evaluate("(var-get #'x)") as any).value).toBe(5)
  })

  it('alter-var-root updates the value', () => {
    const s = mkSession()
    s.evaluate('(def x 5)')
    expect((s.evaluate("(alter-var-root #'x inc)") as any).value).toBe(6)
    expect((s.evaluate('x') as any).value).toBe(6)
  })

  it("printer formats Var as #'ns/name", () => {
    const s = mkSession()
    s.evaluate('(def x 5)')
    const v = s.evaluate("#'x")
    expect(printString(v)).toBe("#'user/x")
  })

  it("#'x returns a Var object", () => {
    const s = mkSession()
    s.evaluate('(def x 42)')
    const v = s.evaluate("#'x")
    expect(v.kind).toBe('var')
  })

  it(':refer aliasing — redef in source ns propagates', () => {
    const s = mkSession()
    // Load a source namespace
    s.loadFile('(ns mylib)\n(def x 1)')
    // Load a consumer that refers x
    s.loadFile('(ns consumer (:require [mylib :refer [x]]))')
    // Value via consumer ns
    s.setNs('consumer')
    expect((s.evaluate('x') as any).value).toBe(1)
    // Redefine in source ns
    s.loadFile('(ns mylib)\n(def x 99)')
    // Consumer should see new value via aliased Var
    s.setNs('consumer')
    expect((s.evaluate('x') as any).value).toBe(99)
  })

  it('sessions are isolated — def in one does not affect the other', () => {
    const s1 = mkSession()
    const s2 = mkSession()
    s1.evaluate('(def x 100)')
    // s2 should not have x (or should have its own)
    expect(() => s2.evaluate('(def y 200)')).not.toThrow()
    expect((s2.evaluate('y') as any).value).toBe(200)
    expect(() => s2.evaluate('x')).toThrow('Symbol x not found')
    // x in s1 is 100
    expect((s1.evaluate('x') as any).value).toBe(100)
    expect(() => s1.evaluate('y')).toThrow('Symbol y not found')
  })
})

describe('Dynamic vars and binding form', () => {
  it('^:dynamic reader syntax marks a var as dynamic', () => {
    const s = mkSession()
    s.evaluate('(def ^:dynamic *out* "default")')
    const v = s.evaluate("#'*out*")
    expect(v.kind).toBe('var')
    expect((v as any).dynamic).toBe(true)
  })

  it('^:dynamic meta is stored on the var', () => {
    const s = mkSession()
    s.evaluate('(def ^:dynamic *x* 1)')
    expect(s.evaluate("(:dynamic (meta #'*x*))").kind).toBe('boolean')
    expect((s.evaluate("(:dynamic (meta #'*x*))") as any).value).toBe(true)
  })

  it('binding temporarily rebinds a dynamic var', () => {
    const s = mkSession()
    s.evaluate('(def ^:dynamic *level* :global)')
    expect((s.evaluate('*level*') as any).name).toBe(':global')
    expect((s.evaluate('(binding [*level* :local] *level*)') as any).name).toBe(
      ':local'
    )
    // After binding, the original value is restored
    expect((s.evaluate('*level*') as any).name).toBe(':global')
  })

  it('binding restores value after the body, even on exception', () => {
    const s = mkSession()
    s.evaluate('(def ^:dynamic *n* 0)')
    try {
      s.evaluate('(binding [*n* 99] (throw {:type :error/test}))')
    } catch {}
    expect((s.evaluate('*n*') as any).value).toBe(0)
  })

  it('nested binding stacks correctly', () => {
    const s = mkSession()
    s.evaluate('(def ^:dynamic *v* 1)')
    const result = s.evaluate(`
      (binding [*v* 2]
        (binding [*v* 3]
          *v*))
    `)
    expect((result as any).value).toBe(3)
    // After both bindings are done, back to root value
    expect((s.evaluate('*v*') as any).value).toBe(1)
  })

  it('binding works inside a function body', () => {
    const s = mkSession()
    s.evaluate('(def ^:dynamic *env* :prod)')
    s.evaluate('(defn env-name [] *env*)')
    expect((s.evaluate('(env-name)') as any).name).toBe(':prod')
    expect((s.evaluate('(binding [*env* :test] (env-name))') as any).name).toBe(
      ':test'
    )
    // Restored after
    expect((s.evaluate('(env-name)') as any).name).toBe(':prod')
  })

  it('binding refuses non-dynamic vars', () => {
    const s = mkSession()
    s.evaluate('(def x 1)')
    expect(() => s.evaluate('(binding [x 2] x)')).toThrow(/non-dynamic/)
  })

  it('binding errors if var does not exist', () => {
    const s = mkSession()
    expect(() => s.evaluate('(binding [no-such-var 1] nil)')).toThrow()
  })
})

describe('defmacro and defmulti as Vars', () => {
  it('defmacro interns macro into ns.vars', () => {
    const s = mkSession()
    s.evaluate('(defmacro my-macro [x] `(inc ~x))')
    // The var is in user ns.vars
    const ns = s.getNs('user')
    expect(ns?.vars.get('my-macro')).toBeDefined()
    expect(ns?.vars.get('my-macro')?.value.kind).toBe('macro')
  })

  it("defmacro-defined macro is retrievable via #'", () => {
    const s = mkSession()
    s.evaluate('(defmacro add1 [x] `(+ ~x 1))')
    const v = s.evaluate("#'add1")
    expect(v.kind).toBe('var')
    expect((v as any).value.kind).toBe('macro')
  })

  it('defmulti interns multimethod into ns.vars', () => {
    const s = mkSession()
    s.evaluate('(defmulti shape-area :shape)')
    const ns = s.getNs('user')
    expect(ns?.vars.get('shape-area')).toBeDefined()
    expect(ns?.vars.get('shape-area')?.value.kind).toBe('multi-method')
  })

  it('defmethod updates the multimethod var in place', () => {
    const s = mkSession()
    s.evaluate('(defmulti size-of :kind)')
    s.evaluate('(defmethod size-of :small [_] 1)')
    s.evaluate('(defmethod size-of :large [_] 100)')
    expect((s.evaluate('(size-of {:kind :small})') as any).value).toBe(1)
    expect((s.evaluate('(size-of {:kind :large})') as any).value).toBe(100)
  })
})

describe('Native functions as Vars', () => {
  it("#'clojure.core/map returns a var", () => {
    const s = mkSession()
    const v = s.evaluate("#'clojure.core/map")
    expect(v.kind).toBe('var')
    expect((v as any).ns).toBe('clojure.core')
    expect((v as any).name).toBe('map')
  })

  it("#'clojure.core/+ returns a var wrapping the native function", () => {
    const s = mkSession()
    const v = s.evaluate("#'clojure.core/+")
    expect(v.kind).toBe('var')
    expect((v as any).value.kind).toBe('native-function')
  })

  it('native function lookup still works normally after internVar', () => {
    const s = mkSession()
    expect((materialize(s.evaluate('(map inc [1 2 3])')) as any).value).toEqual([
      { kind: 'number', value: 2 },
      { kind: 'number', value: 3 },
      { kind: 'number', value: 4 },
    ])
  })

  it('println is interned as a var in clojure.core', () => {
    const s = mkSession()
    const v = s.evaluate("#'clojure.core/println")
    expect(v.kind).toBe('var')
    expect((v as any).value.kind).toBe('native-function')
  })
})

describe('set!', () => {
  it('mutates the active binding slot', () => {
    const s = mkSession()
    s.evaluate('(def ^:dynamic *n* 0)')
    const result = s.evaluate('(binding [*n* 1] (set! *n* 42) *n*)')
    expect((result as any).value).toBe(42)
  })

  it('returns the new value', () => {
    const s = mkSession()
    s.evaluate('(def ^:dynamic *n* 0)')
    const result = s.evaluate('(binding [*n* 1] (set! *n* 99))')
    expect((result as any).value).toBe(99)
  })

  it('does not mutate the root value', () => {
    const s = mkSession()
    s.evaluate('(def ^:dynamic *n* 0)')
    s.evaluate('(binding [*n* 1] (set! *n* 42))')
    expect((s.evaluate('*n*') as any).value).toBe(0)
  })

  it('only affects the innermost binding frame', () => {
    const s = mkSession()
    s.evaluate('(def ^:dynamic *v* 1)')
    const result = s.evaluate(`
      (binding [*v* 2]
        (binding [*v* 3]
          (set! *v* 99))
        *v*)
    `)
    // outer frame still has 2 — set! only mutated innermost
    expect((result as any).value).toBe(2)
  })

  it('root is restored after binding exits following set!', () => {
    const s = mkSession()
    s.evaluate('(def ^:dynamic *n* 0)')
    s.evaluate('(binding [*n* 1] (set! *n* 42))')
    expect((s.evaluate('*n*') as any).value).toBe(0)
  })

  it('error: first arg not a symbol', () => {
    const s = mkSession()
    expect(() => s.evaluate('(set! 42 1)')).toThrow(/symbol/)
  })

  it('error: wrong arity — 0 args', () => {
    const s = mkSession()
    expect(() => s.evaluate('(set!)')).toThrow(/2 arguments/)
  })

  it('error: wrong arity — 1 arg', () => {
    const s = mkSession()
    expect(() => s.evaluate('(set! x)')).toThrow(/2 arguments/)
  })

  it('error: wrong arity — 3 args', () => {
    const s = mkSession()
    expect(() => s.evaluate('(set! x 1 2)')).toThrow(/2 arguments/)
  })

  it('error: var is not dynamic', () => {
    const s = mkSession()
    s.evaluate('(def x 1)')
    expect(() => s.evaluate('(binding [] (set! x 2))')).toThrow(/not dynamic|Cannot set!/)
  })

  it('error: no active binding', () => {
    const s = mkSession()
    s.evaluate('(def ^:dynamic *n* 0)')
    expect(() => s.evaluate('(set! *n* 1)')).toThrow(/no active binding/)
  })

  it('error: symbol does not resolve to a var', () => {
    const s = mkSession()
    expect(() => s.evaluate('(set! undefined-sym 1)')).toThrow()
  })
})
