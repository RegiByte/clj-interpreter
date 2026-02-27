import { describe, expect, it } from 'vitest'
import macrosSource from '../../clojure/macros.clj?raw'
import { cljNil, cljNumber, cljString } from '../factories'
import { createSession } from '../session'
import { EvaluationError } from '../evaluator'

function session() {
  return createSession({ entries: [macrosSource] })
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

    it('throws for unknown namespace alias', () => {
      const s = session()
      expectEvalError('unknown/foo', 'No such namespace alias: unknown', s)
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
        'Namespace nonexistent.ns not found',
        s
      )
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
        entries: [macrosSource],
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
        'Namespace nonexistent.ns not found',
        s
      )
    })

    it('does not use readFile when namespace is already loaded', () => {
      let readFileCalls = 0
      const s = createSession({
        entries: [macrosSource],
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
  })
})
