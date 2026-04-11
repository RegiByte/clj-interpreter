import { describe, expect, it } from 'vitest'
import { cljKeyword, cljNumber, cljString } from '../factories'
import { createSession, createSessionFromSnapshot, snapshotSession } from '../session'
import { EvaluationError } from '../errors'
import { ReaderError } from '../errors'

const _snapshot = snapshotSession(createSession())

function session() {
  return createSessionFromSnapshot(_snapshot)
}

function sessionWithNs(nsName: string, defs: string) {
  const s = session()
  s.loadFile(`(ns ${nsName})\n${defs}`)
  return s
}

function expectEvalError(code: string, expectedMessage: string, s = session()) {
  let error: EvaluationError | undefined
  expect(() => {
    try {
      s.evaluate(code)
    } catch (e) {
      if (e instanceof EvaluationError) error = e
      throw e
    }
  }).toThrow()
  expect(error).toBeDefined()
  expect(error!.message).toContain(expectedMessage)
}

describe('namespaces', () => {
  describe('qualified symbol resolution', () => {
    it('resolves alias/sym through namespace alias', () => {
      const s = sessionWithNs('my.utils', '(def helper 42)')
      s.evaluate("(require '[my.utils :as u])")
      expect(s.evaluate('u/helper')).toEqual(cljNumber(42))
    })

    it('throws for nonexistent symbol in aliased namespace', () => {
      const s = sessionWithNs('my.utils', '(def helper 42)')
      s.evaluate("(require '[my.utils :as u])")
      expect(() => s.evaluate('u/nonexistent')).toThrow('not found')
    })

    it('throws for unknown namespace or alias', () => {
      const s = session()
      expectEvalError('unknown/foo', 'No such namespace or alias: unknown', s)
    })

    it('aliases are live — sees defs added after require', () => {
      const s = sessionWithNs('my.utils', '(def helper 42)')
      s.evaluate("(require '[my.utils :as u])")
      expect(s.evaluate('u/helper')).toEqual(cljNumber(42))
      s.loadFile('(ns my.utils)\n(def added-later 99)')
      expect(s.evaluate('u/added-later')).toEqual(cljNumber(99))
    })
  })

  describe('require with :as', () => {
    it('creates alias and allows qualified access', () => {
      const s = sessionWithNs('math.ops', '(def double (fn [x] (* x 2)))')
      s.evaluate("(require '[math.ops :as m])")
      expect(s.evaluate('(m/double 5)')).toEqual(cljNumber(10))
    })

    it('supports multiple requires in the same namespace', () => {
      const s = session()
      s.loadFile('(ns ns.a)\n(def x 1)')
      s.loadFile('(ns ns.b)\n(def y 2)')
      s.evaluate("(require '[ns.a :as a])")
      s.evaluate("(require '[ns.b :as b])")
      expect(s.evaluate('(+ a/x b/y)')).toEqual(cljNumber(3))
    })

    it('throws when requiring a non-existent namespace', () => {
      const s = session()
      expectEvalError(
        "(require '[nonexistent.ns :as n])",
        "Namespace 'nonexistent.ns' not found",
        s
      )
    })

    it('lazily loads built-in namespaces from generated registry', () => {
      const s = session()
      expect(s.getNs('clojure.string')).toBeNull()
      s.evaluate("(require '[clojure.string :as str])")
      expect(s.getNs('clojure.string')).not.toBeNull()
      expect(s.evaluate('::str/sample')).toEqual(cljKeyword(':clojure.string/sample'))
    })
  })

  describe('require with :refer', () => {
    it('brings specific symbols into current namespace', () => {
      const s = sessionWithNs('my.utils', '(def helper 42)\n(def other 99)')
      s.evaluate("(require '[my.utils :refer [helper]])")
      expect(s.evaluate('helper')).toEqual(cljNumber(42))
    })

    it('does not bring unreferred symbols', () => {
      const s = sessionWithNs('my.utils', '(def helper 42)\n(def other 99)')
      s.evaluate("(require '[my.utils :refer [helper]])")
      expect(s.evaluate('helper')).toEqual(cljNumber(42))
      expect(() => s.evaluate('other')).toThrow('not found')
    })

    it('throws when referring a symbol that does not exist in target', () => {
      const s = sessionWithNs('my.utils', '(def helper 42)')
      expectEvalError(
        "(require '[my.utils :refer [nonexistent]])",
        'Symbol nonexistent not found in namespace my.utils',
        s
      )
    })

    it('referred functions are callable', () => {
      const s = sessionWithNs(
        'my.utils',
        '(defn greet [name] (str "hello " name))'
      )
      s.evaluate("(require '[my.utils :refer [greet]])")
      expect(s.evaluate('(greet "world")')).toEqual(cljString('hello world'))
    })
  })

  describe('require with :as and :refer combined', () => {
    it('both alias and direct bindings work simultaneously', () => {
      const s = sessionWithNs(
        'my.utils',
        '(def helper 42)\n(def other 99)'
      )
      s.evaluate("(require '[my.utils :as u :refer [helper]])")
      expect(s.evaluate('helper')).toEqual(cljNumber(42))
      expect(s.evaluate('u/other')).toEqual(cljNumber(99))
      expect(s.evaluate('u/helper')).toEqual(cljNumber(42))
    })
  })

  describe('ns form with :require clause', () => {
    it('sets up alias via ns :require', () => {
      const s = session()
      s.loadFile('(ns my.utils)\n(def helper 42)')
      s.loadFile(
        '(ns my.app (:require [my.utils :as u]))\n(def result u/helper)'
      )
      s.setNs('my.app')
      expect(s.evaluate('result')).toEqual(cljNumber(42))
    })

    it('supports multiple require specs in ns form', () => {
      const s = session()
      s.loadFile('(ns ns.a)\n(def x 1)')
      s.loadFile('(ns ns.b)\n(def y 2)')
      s.loadFile(
        '(ns my.app (:require [ns.a :as a] [ns.b :as b]))\n(def sum (+ a/x b/y))'
      )
      s.setNs('my.app')
      expect(s.evaluate('sum')).toEqual(cljNumber(3))
    })

    it('ns form with :refer brings symbols in', () => {
      const s = session()
      s.loadFile('(ns my.utils)\n(def helper 42)')
      s.loadFile(
        '(ns my.app (:require [my.utils :refer [helper]]))\n(def result helper)'
      )
      s.setNs('my.app')
      expect(s.evaluate('result')).toEqual(cljNumber(42))
    })

    it('ns form with both :as and :refer', () => {
      const s = session()
      s.loadFile('(ns my.utils)\n(def helper 42)\n(def other 99)')
      s.loadFile(
        '(ns my.app (:require [my.utils :as u :refer [helper]]))\n(def r1 helper)\n(def r2 u/other)'
      )
      s.setNs('my.app')
      expect(s.evaluate('r1')).toEqual(cljNumber(42))
      expect(s.evaluate('r2')).toEqual(cljNumber(99))
    })
  })

  describe('cross-namespace interaction', () => {
    it('namespace A uses functions from namespace B', () => {
      const s = session()
      s.loadFile('(ns math.core)\n(defn double [x] (* x 2))')
      s.loadFile(
        '(ns my.app (:require [math.core :as math]))\n(def result (math/double 21))'
      )
      s.setNs('my.app')
      expect(s.evaluate('result')).toEqual(cljNumber(42))
    })

    it('namespace defines functions that use required functions', () => {
      const s = session()
      s.loadFile('(ns math.core)\n(defn double [x] (* x 2))')
      s.loadFile(
        '(ns my.app (:require [math.core :as math]))\n(defn quadruple [x] (math/double (math/double x)))'
      )
      s.setNs('my.app')
      expect(s.evaluate('(quadruple 3)')).toEqual(cljNumber(12))
    })

    it('chained requires — A requires B which was loaded first', () => {
      const s = session()
      s.loadFile('(ns base)\n(def x 10)')
      s.loadFile('(ns middle (:require [base :as b]))\n(def y (+ b/x 5))')
      s.loadFile('(ns top (:require [middle :as m]))\n(def z m/y)')
      s.setNs('top')
      expect(s.evaluate('z')).toEqual(cljNumber(15))
    })
  })

  describe('require error handling', () => {
    it('require spec must be a vector', () => {
      const s = session()
      expectEvalError(
        "(require 'my.utils)",
        'require spec must be a vector',
        s
      )
    })

    it('first element must be a namespace symbol', () => {
      const s = session()
      expectEvalError(
        "(require '[:keyword :as k])",
        'First element of require spec must be a namespace symbol',
        s
      )
    })

    it(':as expects a symbol alias', () => {
      const s = session()
      s.loadFile('(ns my.utils)\n(def x 1)')
      expectEvalError(
        "(require '[my.utils :as])",
        ':as expects a symbol alias',
        s
      )
    })

    it(':refer expects a vector of symbols', () => {
      const s = session()
      s.loadFile('(ns my.utils)\n(def x 1)')
      expectEvalError(
        "(require '[my.utils :refer x])",
        ':refer expects a vector of symbols',
        s
      )
    })

    it('unknown require option throws', () => {
      const s = session()
      s.loadFile('(ns my.utils)\n(def x 1)')
      expectEvalError(
        "(require '[my.utils :only [x]])",
        'Unknown require option :only',
        s
      )
    })
  })

  describe('lazy file resolution via readFile', () => {
    const files: Record<string, string> = {
      'src/my/utils.clj': '(ns my.utils)\n(def helper 42)',
      'src/my/math.clj': '(ns my.math)\n(defn double [x] (* x 2))',
      'src/chain/base.clj': '(ns chain.base)\n(def x 10)',
      'src/chain/middle.clj':
        '(ns chain.middle (:require [chain.base :as b]))\n(def y (+ b/x 5))',
    }

    function sessionWithReadFile() {
      return createSession({
        sourceRoots: ['src'],
        readFile: (path: string) => {
          const content = files[path]
          if (!content) throw new Error(`File not found: ${path}`)
          return content
        },
      })
    }

    it('lazily loads a namespace when require encounters unknown ns', () => {
      const s = sessionWithReadFile()
      s.evaluate("(require '[my.utils :as u])")
      expect(s.evaluate('u/helper')).toEqual(cljNumber(42))
    })

    it('lazily loads and calls functions from resolved namespace', () => {
      const s = sessionWithReadFile()
      s.evaluate("(require '[my.math :as m])")
      expect(s.evaluate('(m/double 5)')).toEqual(cljNumber(10))
    })

    it('lazy resolution works with :refer', () => {
      const s = sessionWithReadFile()
      s.evaluate("(require '[my.utils :refer [helper]])")
      expect(s.evaluate('helper')).toEqual(cljNumber(42))
    })

    it('lazy resolution chains — loading a file that requires another', () => {
      const s = sessionWithReadFile()
      s.evaluate("(require '[chain.middle :as m])")
      expect(s.evaluate('m/y')).toEqual(cljNumber(15))
    })

    it('ns form :require clause triggers lazy resolution', () => {
      const s = sessionWithReadFile()
      s.loadFile(
        '(ns my.app (:require [my.utils :as u]))\n(def result u/helper)'
      )
      s.setNs('my.app')
      expect(s.evaluate('result')).toEqual(cljNumber(42))
    })

    it('throws when file is not found even with readFile', () => {
      const s = sessionWithReadFile()
      expectEvalError(
        "(require '[nonexistent.ns :as n])",
        "Namespace 'nonexistent.ns' not found",
        s
      )
    })

    it('does not use readFile when namespace is already loaded', () => {
      let readFileCalls = 0
      const s = createSession({
        sourceRoots: ['src'],
        readFile: (path: string) => {
          readFileCalls++
          const content = files[path]
          if (!content) throw new Error(`File not found: ${path}`)
          return content
        },
      })
      s.loadFile('(ns my.utils)\n(def helper 99)')
      s.evaluate("(require '[my.utils :as u])")
      expect(s.evaluate('u/helper')).toEqual(cljNumber(99))
      expect(readFileCalls).toBe(0)
    })

    it('does not use readFile for built-in namespaces resolved via generated registry', () => {
      let readFileCalls = 0
      const s = createSession({
        sourceRoots: ['src'],
        readFile: (_path: string) => {
          readFileCalls++
          throw new Error('Should not be called for built-in namespace')
        },
      })
      s.evaluate("(require '[clojure.string :as str])")
      expect(s.getNs('clojure.string')).not.toBeNull()
      expect(readFileCalls).toBe(0)
    })
  })

  describe('::alias/foo qualified keyword expansion', () => {
    it('expands ::alias/foo in file body via loadFile', () => {
      const s = session()
      s.loadFile('(ns my.schema)\n(def tag :my.schema/entity)')
      s.loadFile(
        '(ns my.app (:require [my.schema :as s]))\n(def kw ::s/entity)'
      )
      s.setNs('my.app')
      expect(s.evaluate('kw')).toEqual(cljKeyword(':my.schema/entity'))
    })

    it('expands multiple ::alias/foo keywords in the same file', () => {
      const s = session()
      s.loadFile('(ns ns.a)\n(def x 1)')
      s.loadFile('(ns ns.b)\n(def y 2)')
      s.loadFile(
        '(ns my.app (:require [ns.a :as a] [ns.b :as b]))\n' +
          '(def ka ::a/tag)\n' +
          '(def kb ::b/tag)'
      )
      s.setNs('my.app')
      expect(s.evaluate('ka')).toEqual(cljKeyword(':ns.a/tag'))
      expect(s.evaluate('kb')).toEqual(cljKeyword(':ns.b/tag'))
    })

    it('::alias/foo used as a multimethod dispatch value', () => {
      const s = session()
      s.loadFile('(ns my.types)')
      s.loadFile(
        '(ns my.app (:require [my.types :as t]))\n' +
          '(defmulti describe :type)\n' +
          '(defmethod describe ::t/user [x] "a user")\n' +
          '(defmethod describe :default [x] "unknown")'
      )
      s.setNs('my.app')
      expect(s.evaluate('(describe {:type :my.types/user})')).toEqual(
        cljString('a user')
      )
      expect(s.evaluate('(describe {:type :other})')).toEqual(
        cljString('unknown')
      )
    })

    it('REPL: ::alias/foo resolves when alias was set up by a prior require', () => {
      const s = session()
      s.loadFile('(ns my.utils)\n(def x 1)')
      s.evaluate("(require '[my.utils :as u])")
      expect(s.evaluate('::u/something')).toEqual(
        cljKeyword(':my.utils/something')
      )
    })

    it('throws ReaderError when ::alias/foo alias is not defined', () => {
      const s = session()
      expect(() => s.evaluate('::unknown/foo')).toThrow(ReaderError)
    })

    it('::alias/foo inside a ns form with :as and :refer combined', () => {
      const s = session()
      s.loadFile('(ns my.domain)\n(def status :active)')
      s.loadFile(
        '(ns my.app (:require [my.domain :as d :refer [status]]))\n' +
          '(def active-kw ::d/active)'
      )
      s.setNs('my.app')
      expect(s.evaluate('active-kw')).toEqual(cljKeyword(':my.domain/active'))
    })
  })

  describe(':as-alias qualified keyword expansion', () => {
    it('creates a reader alias without requiring the namespace to be loaded', () => {
      const s = session()
      s.evaluate("(require '[company.domain.user :as-alias user])")
      expect(s.evaluate('::user/id')).toEqual(cljKeyword(':company.domain.user/id'))
    })

    it('ns form with :as-alias in :require clause expands ::alias/foo in file body', () => {
      const s = session()
      s.loadFile(
        '(ns my.app (:require [my.domain.order :as-alias order]))\n' +
          '(def kw ::order/status)'
      )
      s.setNs('my.app')
      expect(s.evaluate('kw')).toEqual(cljKeyword(':my.domain.order/status'))
    })

    it('the aliased namespace does not need to exist as a loadable file', () => {
      const s = session()
      // my.imaginary.ns is never loaded — that is the whole point of :as-alias
      expect(() =>
        s.evaluate("(require '[my.imaginary.ns :as-alias img])")
      ).not.toThrow()
      expect(s.evaluate('::img/tag')).toEqual(cljKeyword(':my.imaginary.ns/tag'))
    })

    it('multiple :as-alias specs in the same require call all resolve', () => {
      const s = session()
      s.evaluate("(require '[domain.user :as-alias user])")
      s.evaluate("(require '[domain.order :as-alias order])")
      expect(s.evaluate('::user/id')).toEqual(cljKeyword(':domain.user/id'))
      expect(s.evaluate('::order/id')).toEqual(cljKeyword(':domain.order/id'))
    })

    it('multiple :as-alias in a single ns form', () => {
      const s = session()
      s.loadFile(
        '(ns my.app\n' +
          '  (:require [acme.billing :as-alias billing]\n' +
          '            [acme.shipping :as-alias shipping]))\n' +
          '(def b ::billing/invoice)\n' +
          '(def sh ::shipping/label)'
      )
      s.setNs('my.app')
      expect(s.evaluate('b')).toEqual(cljKeyword(':acme.billing/invoice'))
      expect(s.evaluate('sh')).toEqual(cljKeyword(':acme.shipping/label'))
    })

    it('REPL: ::alias/foo works in subsequent evaluations after :as-alias require', () => {
      const s = session()
      s.evaluate("(require '[event.sourcing :as-alias ev])")
      // Second evaluation — alias must be remembered across calls
      expect(s.evaluate('::ev/created')).toEqual(
        cljKeyword(':event.sourcing/created')
      )
    })

    it(':as-alias can coexist with a regular :as for the same namespace', () => {
      const s = session()
      s.loadFile('(ns my.utils)\n(def x 42)')
      s.evaluate("(require '[my.utils :as u])")
      s.evaluate("(require '[my.domain.util :as-alias du])")
      // :as alias → qualified symbol lookup
      expect(s.evaluate('u/x')).toEqual(cljNumber(42))
      // :as-alias → keyword expansion only
      expect(s.evaluate('::du/tag')).toEqual(cljKeyword(':my.domain.util/tag'))
    })

    it(':as-alias does not allow qualified symbol lookup (namespace not loaded)', () => {
      const s = session()
      s.evaluate("(require '[phantom.ns :as-alias p])")
      expect(() => s.evaluate('p/something')).toThrow()
    })

    it('throws EvaluationError when :as-alias spec is missing the alias symbol', () => {
      const s = session()
      expect(() =>
        s.evaluate("(require '[my.ns :as-alias])")
      ).toThrow(':as-alias expects a symbol alias')
    })

    it('throws EvaluationError when :as-alias spec is combined with :refer', () => {
      const s = session()
      expect(() =>
        s.evaluate("(require '[my.ns :as-alias a :refer [x]])")
      ).toThrow(':as-alias specs only support :as-alias')
    })

    it(':as-alias used as a multimethod dispatch value in a ns form file', () => {
      const s = session()
      s.loadFile(
        '(ns my.app (:require [domain.shapes :as-alias shape]))\n' +
          '(defmulti area :type)\n' +
          '(defmethod area ::shape/circle [s] (* 3 (:r s)))\n' +
          '(defmethod area :default [_] 0)'
      )
      s.setNs('my.app')
      expect(s.evaluate('(area {:type :domain.shapes/circle :r 2})')).toEqual(
        cljNumber(6)
      )
    })
  })
})

// ---------------------------------------------------------------------------
// Session resilience — frameStack recovery after stack overflow
// ---------------------------------------------------------------------------
//
// Regression test for: ghost frames left in ctx.frameStack after a
// RangeError (JS stack overflow). V8 may not execute all finally-pops when
// the stack is completely exhausted, causing ctx.frameStack to retain
// leftover frames. Each subsequent overflow compounds the leak — eventually
// even small recursion depths fail.
//
// The fix (session.ts evaluate/evaluateAsync finally blocks): reset
// ctx.frameStack = [] unconditionally at the session boundary.

describe('session — frameStack recovery after stack overflow', () => {
  it('small recursion still works after a stack-overflowing call', () => {
    const s = createSession()
    s.evaluate(`
      (ns test.deep)
      (defn deep [n]
        (if (zero? n) :done (deep (dec n))))
    `)

    // Trigger a stack overflow — use a value large enough to guarantee overflow
    // on any JS engine. Post-optimization the compiled limit is ~8k-11k frames,
    // so 20k reliably exhausts the native call stack.
    expect(() => s.evaluate('(deep 20000)')).toThrow()

    // Without the fix, ctx.frameStack retains ghost frames from the overflow,
    // and this smaller call would also fail. With the fix, the frameStack is
    // reset at the session boundary and the depth budget is fully restored.
    expect(() => s.evaluate('(deep 20000)')).toThrow()    // still throws (same limit)
    expect(s.evaluate('(deep 100)')).toEqual(cljKeyword(':done'))
    expect(s.evaluate('(deep 500)')).toEqual(cljKeyword(':done'))
    expect(s.evaluate('(deep 100)')).toEqual(cljKeyword(':done'))  // second time, no degradation
  })

  it('frameStack is empty after a normal evaluation', () => {
    // Indirect test: if frameStack leaked after a normal eval, deep recursion
    // would degrade. We run a medium-depth call twice; both should succeed.
    const s = createSession()
    s.evaluate(`
      (ns test.depth)
      (defn deep [n] (if (zero? n) :done (deep (dec n))))
    `)
    expect(s.evaluate('(deep 500)')).toEqual(cljKeyword(':done'))
    expect(s.evaluate('(deep 500)')).toEqual(cljKeyword(':done'))
  })

  it('no accumulation across many consecutive successful evals', () => {
    // Stress test: if each normal evaluation leaked even 1 ghost frame into
    // ctx.frameStack, the effective recursion budget would shrink by 1 per eval.
    // After 20 evals that each leave 1 ghost, the 21st (deep 500) would start
    // with frameStack pre-populated by 20 frames — equivalent to (deep 520).
    // After 50 evals it'd be (deep 550), etc. This test catches that leak by
    // running the same depth 30 times and asserting every run succeeds.
    //
    // This directly mirrors the nREPL scenario reported by Sir RegiByte:
    //   (deep 5500) works → (deep 5000) works → (deep 5500) fails
    // If that pattern reproduces here, there's a genuine engine-level leak.
    // If it doesn't, the nREPL issue is caused by silent prior overflow events
    // (the frameStack = [] fix in session.ts handles those at the boundary).
    const s = createSession()
    s.evaluate(`
      (ns test.accumulation)
      (defn deep [n] (if (zero? n) :done (deep (dec n))))
    `)
    for (let i = 0; i < 30; i++) {
      expect(s.evaluate('(deep 3000)')).toEqual(cljKeyword(':done'))
    }
  })
})
