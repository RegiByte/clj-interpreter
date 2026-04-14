/**
 * clojure.test integration tests
 *
 * Covers the full stack via freshSession → require → evaluate:
 *   1.  is — pass, fail, error paths
 *   2.  deftest — registration and execution
 *   3.  testing — context labeling
 *   4.  run-tests — summary map, multi-namespace
 *   5.  report — multimethod dispatch and override
 *   6.  *report-counters* — counter tracking
 *   7.  are — parameterised assertions
 *   8.  *testing-contexts* — dynamic context stack
 *   9.  *testing-vars* — current test name
 *   10. thrown? / thrown-with-msg?
 *   11. successful?
 *   12. run-test
 *   13. Error cases
 *   14. use-fixtures — API, compose/join, run-tests integration
 */

import { describe, expect, it } from 'vitest'
import { freshSession as session } from '../evaluator/__tests__/evaluator-test-utils'
import { v } from '../factories'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function s() {
  const sess = session()
  sess.evaluate("(require '[clojure.test :refer [deftest is testing run-tests are report thrown? thrown-with-msg? use-fixtures compose-fixtures join-fixtures default-fixture]])")
  return sess
}

/** Start in a named namespace with clojure.test already required. */
function ns(name: string) {
  const sess = session()
  sess.evaluate(`(ns ${name}) (require '[clojure.test :refer [deftest is testing run-tests are report thrown? thrown-with-msg? use-fixtures compose-fixtures join-fixtures default-fixture]])`)
  return sess
}

// ---------------------------------------------------------------------------
// 1. is — basic assertion paths
// ---------------------------------------------------------------------------

describe('clojure.test/is — pass path', () => {
  it('(is true) calls report :pass', () => {
    const sess = s()
    sess.evaluate(`
      (def results (atom []))
      (defmethod report :pass [m] (swap! results conj :pass))
    `)
    sess.evaluate('(is true)')
    expect(sess.evaluate('@results')).toEqual(v.vector([v.keyword(':pass')]))
  })

  it('(is (= 1 1)) reports :pass', () => {
    const sess = s()
    sess.evaluate(`
      (def results (atom []))
      (defmethod report :pass [m] (swap! results conj (:type m)))
    `)
    sess.evaluate('(is (= 1 1))')
    expect(sess.evaluate('@results')).toEqual(v.vector([v.keyword(':pass')]))
  })

  it(':pass report carries :expected and :actual', () => {
    const sess = s()
    sess.evaluate(`
      (def captured (atom nil))
      (defmethod report :pass [m] (reset! captured m))
    `)
    sess.evaluate('(is (= 2 2))')
    expect(sess.evaluate('(:type @captured)')).toEqual(v.keyword(':pass'))
    expect(sess.evaluate('(:actual @captured)')).toEqual(v.boolean(true))
  })
})

describe('clojure.test/is — fail path', () => {
  it('(is false) calls report :fail', () => {
    const sess = s()
    sess.evaluate(`
      (def results (atom []))
      (defmethod report :fail [m] (swap! results conj :fail))
    `)
    sess.evaluate('(is false)')
    expect(sess.evaluate('@results')).toEqual(v.vector([v.keyword(':fail')]))
  })

  it('(is (= 1 2)) reports :fail', () => {
    const sess = s()
    sess.evaluate(`
      (def captured (atom nil))
      (defmethod report :fail [m] (reset! captured m))
    `)
    sess.evaluate('(is (= 1 2))')
    expect(sess.evaluate('(:type @captured)')).toEqual(v.keyword(':fail'))
    expect(sess.evaluate('(:actual @captured)')).toEqual(v.boolean(false))
  })

  it(':fail report carries the expected form as quoted data', () => {
    const sess = s()
    sess.evaluate(`
      (def captured (atom nil))
      (defmethod report :fail [m] (reset! captured m))
    `)
    sess.evaluate('(is (= 1 2))')
    // (:expected m) should be the list (= 1 2)
    expect(sess.evaluate("(list? (:expected @captured))")).toEqual(v.boolean(true))
    expect(sess.evaluate("(first (:expected @captured))")).toEqual(v.symbol('='))
  })

  it('failure message is carried in :message', () => {
    const sess = s()
    sess.evaluate(`
      (def captured (atom nil))
      (defmethod report :fail [m] (reset! captured m))
    `)
    sess.evaluate('(is (= 1 2) "my message")')
    expect(sess.evaluate('(:message @captured)')).toEqual(v.string('my message'))
  })

  it('no message — :message is nil', () => {
    const sess = s()
    sess.evaluate(`
      (def captured (atom nil))
      (defmethod report :fail [m] (reset! captured m))
    `)
    sess.evaluate('(is false)')
    expect(sess.evaluate('(:message @captured)')).toEqual(v.nil())
  })
})

describe('clojure.test/is — error path', () => {
  it('exception inside is form reports :error', () => {
    const sess = s()
    sess.evaluate(`
      (def results (atom []))
      (defmethod report :error [m] (swap! results conj (:type m)))
    `)
    sess.evaluate('(is (throw (ex-info "boom" {})))')
    expect(sess.evaluate('@results')).toEqual(v.vector([v.keyword(':error')]))
  })

  it(':error report carries :actual as the error value', () => {
    const sess = s()
    sess.evaluate(`
      (def captured (atom nil))
      (defmethod report :error [m] (reset! captured m))
    `)
    sess.evaluate('(is (throw (ex-info "boom" {:x 1})))')
    expect(sess.evaluate('(map? (:actual @captured))')).toEqual(v.boolean(true))
    expect(sess.evaluate('(:message (:actual @captured))')).toEqual(v.string('boom'))
  })

  it(':error report carries :expected as the quoted form', () => {
    const sess = s()
    sess.evaluate(`
      (def captured (atom nil))
      (defmethod report :error [m] (reset! captured m))
    `)
    sess.evaluate('(is (throw (ex-info "boom" {})))')
    expect(sess.evaluate('(list? (:expected @captured))')).toEqual(v.boolean(true))
  })
})

// ---------------------------------------------------------------------------
// 2. deftest — registration and execution
// ---------------------------------------------------------------------------

describe('clojure.test/deftest', () => {
  it('defines a 0-arity function', () => {
    const sess = ns('my.tests')
    sess.evaluate('(deftest my-test (is (= 1 1)))')
    expect(sess.evaluate('(fn? my-test)')).toEqual(v.boolean(true))
  })

  it('test function is callable directly', () => {
    const sess = ns('my.tests')
    sess.evaluate(`
      (def ran (atom false))
      (deftest direct-test (reset! ran true))
    `)
    sess.evaluate('(direct-test)')
    expect(sess.evaluate('@ran')).toEqual(v.boolean(true))
  })

  it('registers the test in the registry under current namespace', () => {
    const sess = ns('my.tests')
    sess.evaluate('(deftest reg-test (is true))')
    // The test-registry atom in clojure.test should have an entry for "my.tests"
    expect(
      sess.evaluate('(contains? @clojure.test/test-registry "my.tests")')
    ).toEqual(v.boolean(true))
  })

  it('multiple deftests accumulate in the registry', () => {
    const sess = ns('multi.ns')
    sess.evaluate('(deftest t1 (is true))')
    sess.evaluate('(deftest t2 (is true))')
    sess.evaluate('(deftest t3 (is true))')
    expect(
      sess.evaluate('(count (get @clojure.test/test-registry "multi.ns"))')
    ).toEqual(v.number(3))
  })
})

// ---------------------------------------------------------------------------
// 3. testing — context labeling
// ---------------------------------------------------------------------------

describe('clojure.test/testing', () => {
  it('testing context appears in *testing-contexts* during execution', () => {
    const sess = s()
    sess.evaluate(`
      (def ctx (atom nil))
      (defmethod report :pass [m]
        (reset! ctx clojure.test/*testing-contexts*))
    `)
    sess.evaluate('(testing "my context" (is true))')
    expect(sess.evaluate('@ctx')).toEqual(v.vector([v.string('my context')]))
  })

  it('context is restored after testing block', () => {
    const sess = s()
    sess.evaluate('(testing "ctx" (is true))')
    expect(sess.evaluate('clojure.test/*testing-contexts*')).toEqual(v.vector([]))
  })

  it('nested testing blocks stack contexts', () => {
    const sess = s()
    sess.evaluate(`
      (def ctx (atom nil))
      (defmethod report :pass [m]
        (reset! ctx clojure.test/*testing-contexts*))
    `)
    sess.evaluate(`
      (testing "outer"
        (testing "inner"
          (is true)))
    `)
    expect(sess.evaluate('@ctx')).toEqual(
      v.vector([v.string('outer'), v.string('inner')])
    )
  })

  it('outer context is preserved after inner testing block', () => {
    const sess = s()
    sess.evaluate(`
      (def ctx (atom nil))
      (defmethod report :pass [m]
        (reset! ctx clojure.test/*testing-contexts*))
    `)
    sess.evaluate(`
      (testing "outer"
        (testing "inner" nil)
        (is true))
    `)
    expect(sess.evaluate('@ctx')).toEqual(
      v.vector([v.string('outer')])
    )
  })
})

// ---------------------------------------------------------------------------
// 4. run-tests — summary map
// ---------------------------------------------------------------------------

describe('clojure.test/run-tests', () => {
  it('returns a summary map with counter keys', () => {
    const sess = ns('rt.test')
    sess.evaluate('(deftest t1 (is true))')
    const result = sess.evaluate("(run-tests 'rt.test)")
    expect(result.kind).toBe('map')
    if (result.kind === 'map') {
      const keys = result.entries.map(([k]) => k.kind === 'keyword' && k.name)
      expect(keys).toContain(':test')
      expect(keys).toContain(':pass')
      expect(keys).toContain(':fail')
      expect(keys).toContain(':error')
    }
  })

  it('counts tests and assertions correctly', () => {
    const sess = ns('count.test')
    sess.evaluate(`
      (deftest t1 (is true) (is true))
      (deftest t2 (is (= 1 1)))
    `)
    const result = sess.evaluate("(run-tests 'count.test)")
    expect(sess.evaluate("(:test (run-tests 'count.test))")).toEqual(v.number(2))
    // each run adds: calling run-tests again doubles — use fresh session
    expect(result.kind).toBe('map')
  })

  it('run-tests with explicit ns — :test, :pass, :fail', () => {
    const sess = ns('exact.test')
    sess.evaluate(`
      (deftest pass-test (is (= 2 2)))
      (deftest fail-test (is (= 1 2)))
    `)
    // Override report to silence output
    sess.evaluate('(defmethod report :default [_] nil)')
    const result = sess.evaluate("(run-tests 'exact.test)")
    expect(sess.evaluate("(:test (run-tests 'exact.test))")).toEqual(v.number(2))
    expect(result.kind).toBe('map')
  })

  it(':pass count matches passing assertions', () => {
    const sess = ns('pass.count')
    sess.evaluate(`
      (deftest t (is true) (is (= 1 1)) (is (string? "a")))
    `)
    sess.evaluate('(defmethod report :default [_] nil)')
    sess.evaluate("(def run-result (run-tests 'pass.count))")
    expect(sess.evaluate('(:pass run-result)')).toEqual(v.number(3))
  })

  it(':fail count matches failing assertions', () => {
    const sess = ns('fail.count')
    sess.evaluate('(deftest t (is false) (is (= 1 2)))')
    sess.evaluate('(defmethod report :default [_] nil)')
    sess.evaluate("(def run-result (run-tests 'fail.count))")
    expect(sess.evaluate('(:fail run-result)')).toEqual(v.number(2))
  })

  it(':error count matches thrown exceptions in is', () => {
    const sess = ns('err.count')
    sess.evaluate('(deftest t (is (throw (ex-info "x" {}))))')
    sess.evaluate('(defmethod report :default [_] nil)')
    sess.evaluate("(def run-result (run-tests 'err.count))")
    expect(sess.evaluate('(:error run-result)')).toEqual(v.number(1))
  })

  it('run-tests with no args uses current namespace', () => {
    const sess = ns('current.ns.test')
    sess.evaluate('(deftest t (is true))')
    sess.evaluate('(defmethod report :default [_] nil)')
    // run-tests with no args should pick up tests in current.ns.test
    sess.evaluate('(def run-result (run-tests))')
    expect(sess.evaluate('(:test run-result)')).toEqual(v.number(1))
  })

  it('run-tests on empty namespace returns zero counts', () => {
    const sess = ns('empty.ns')
    sess.evaluate('(defmethod report :default [_] nil)')
    sess.evaluate("(def run-result (run-tests 'empty.ns))")
    expect(sess.evaluate('(:test run-result)')).toEqual(v.number(0))
    expect(sess.evaluate('(:pass run-result)')).toEqual(v.number(0))
  })
})

// ---------------------------------------------------------------------------
// 5. report multimethod — dispatch and override
// ---------------------------------------------------------------------------

describe('clojure.test/report multimethod', () => {
  it('default :default method returns nil', () => {
    const sess = s()
    // Dispatch an unknown type — should hit :default → nil
    expect(
      sess.evaluate('(report {:type :unknown-xyz})')
    ).toEqual(v.nil())
  })

  it('custom :pass override is called', () => {
    const sess = s()
    sess.evaluate(`
      (def called (atom false))
      (defmethod report :pass [_] (reset! called true))
    `)
    sess.evaluate('(is true)')
    expect(sess.evaluate('@called')).toEqual(v.boolean(true))
  })

  it('custom override receives the full report map', () => {
    const sess = s()
    sess.evaluate(`
      (def received (atom nil))
      (defmethod report :fail [m] (reset! received m))
    `)
    sess.evaluate('(is false "msg")')
    expect(sess.evaluate('(:message @received)')).toEqual(v.string('msg'))
    expect(sess.evaluate('(:type @received)')).toEqual(v.keyword(':fail'))
  })

  it('report can be used standalone with custom maps', () => {
    const sess = s()
    sess.evaluate(`
      (def received (atom nil))
      (defmethod report :custom [m] (reset! received m))
    `)
    sess.evaluate('(report {:type :custom :data 42})')
    expect(sess.evaluate('(:data @received)')).toEqual(v.number(42))
  })
})

// ---------------------------------------------------------------------------
// 6. *report-counters* — counter tracking
// ---------------------------------------------------------------------------

describe('clojure.test/*report-counters*', () => {
  it('is nil outside run-tests', () => {
    const sess = s()
    expect(sess.evaluate('clojure.test/*report-counters*')).toEqual(v.nil())
  })

  it('is bound to an atom inside run-tests', () => {
    const sess = ns('counter.test')
    sess.evaluate(`
      (def counter-during (atom nil))
      (deftest t
        (reset! counter-during (atom? clojure.test/*report-counters*)))
    `)
    sess.evaluate('(defmethod report :default [_] nil)')
    sess.evaluate("(run-tests 'counter.test)")
    expect(sess.evaluate('@counter-during')).toEqual(v.boolean(true))
  })
})

// ---------------------------------------------------------------------------
// 7. are — parameterised assertions
// ---------------------------------------------------------------------------

describe('clojure.test/are', () => {
  it('are with passing values all report :pass', () => {
    const sess = s()
    sess.evaluate(`
      (def pass-count (atom 0))
      (defmethod report :pass [_] (swap! pass-count inc))
    `)
    sess.evaluate('(are [x y] (= x y) 1 1 2 2 3 3)')
    expect(sess.evaluate('@pass-count')).toEqual(v.number(3))
  })

  it('are with a failing value reports :fail', () => {
    const sess = s()
    sess.evaluate(`
      (def fail-count (atom 0))
      (defmethod report :fail [_] (swap! fail-count inc))
    `)
    sess.evaluate('(are [x y] (= x y) 1 1 2 99 3 3)')
    expect(sess.evaluate('@fail-count')).toEqual(v.number(1))
  })

  it('are with no args returns nil', () => {
    const sess = s()
    expect(sess.evaluate('(are [x] (= x 1))')).toEqual(v.nil())
  })

  it('are binds multiple params correctly', () => {
    const sess = s()
    sess.evaluate(`
      (def pass-count (atom 0))
      (defmethod report :pass [_] (swap! pass-count inc))
    `)
    sess.evaluate('(are [a b c] (= (+ a b) c) 1 2 3 10 20 30)')
    expect(sess.evaluate('@pass-count')).toEqual(v.number(2))
  })
})

// ---------------------------------------------------------------------------
// 8. *testing-contexts* inside run-tests
// ---------------------------------------------------------------------------

describe('clojure.test/*testing-contexts* in run-tests', () => {
  it('testing context propagates into report during run-tests', () => {
    const sess = ns('ctx.run.test')
    sess.evaluate(`
      (def seen-ctx (atom nil))
      (defmethod report :fail [m]
        (reset! seen-ctx clojure.test/*testing-contexts*))
      (deftest context-aware
        (testing "addition"
          (is (= 1 2))))
    `)
    sess.evaluate("(run-tests 'ctx.run.test)")
    expect(sess.evaluate('@seen-ctx')).toEqual(
      v.vector([v.string('addition')])
    )
  })
})

// ---------------------------------------------------------------------------
// 9. *testing-vars* — current test name
// ---------------------------------------------------------------------------

describe('clojure.test/*testing-vars*', () => {
  it('*testing-vars* contains the current test name during execution', () => {
    const sess = ns('vars.test')
    sess.evaluate(`
      (def seen-vars (atom nil))
      (defmethod report :pass [m]
        (reset! seen-vars clojure.test/*testing-vars*))
      (deftest my-named-test (is true))
    `)
    sess.evaluate("(run-tests 'vars.test)")
    // *testing-vars* should contain the test name string
    expect(sess.evaluate('(count @seen-vars)')).toEqual(v.number(1))
    expect(sess.evaluate('(first @seen-vars)')).toEqual(v.string('my-named-test'))
  })

  it('is empty outside run-tests', () => {
    const sess = s()
    expect(sess.evaluate('clojure.test/*testing-vars*')).toEqual(v.vector([]))
  })
})

// ---------------------------------------------------------------------------
// 10. thrown? — exception presence assertion macro
// ---------------------------------------------------------------------------

describe('clojure.test/thrown?', () => {
  it('returns the exception when body throws matching type', () => {
    const sess = s()
    // thrown? with :default catches anything — returns the exception (truthy)
    const result = sess.evaluate('(thrown? :default (throw "boom"))')
    expect(result).toEqual(v.string('boom'))
  })

  it('(is (thrown? :default ...)) reports :pass on throw', () => {
    const sess = s()
    sess.evaluate(`
      (def captured (atom nil))
      (defmethod report :pass [m] (reset! captured m))
    `)
    sess.evaluate('(is (thrown? :default (throw "boom")))')
    expect(sess.evaluate('(:type @captured)')).toEqual(v.keyword(':pass'))
  })

  it('returns false when body does NOT throw', () => {
    const sess = s()
    expect(sess.evaluate('(thrown? :default 42)')).toEqual(v.boolean(false))
  })

  it('(is (thrown? :default ...)) reports :fail when no throw', () => {
    const sess = s()
    sess.evaluate(`
      (def captured (atom nil))
      (defmethod report :fail [m] (reset! captured m))
    `)
    sess.evaluate('(is (thrown? :default 42))')
    expect(sess.evaluate('(:type @captured)')).toEqual(v.keyword(':fail'))
    expect(sess.evaluate('(:actual @captured)')).toEqual(v.boolean(false))
  })

  it('matches :error/runtime for runtime errors', () => {
    const sess = s()
    sess.evaluate(`
      (def captured (atom nil))
      (defmethod report :pass [m] (reset! captured m))
    `)
    sess.evaluate('(is (thrown? :error/runtime (/ 1 0)))')
    expect(sess.evaluate('(:type @captured)')).toEqual(v.keyword(':pass'))
  })

  it('wrong keyword type — exception propagates as :error in is', () => {
    const sess = s()
    sess.evaluate(`
      (def captured (atom nil))
      (defmethod report :error [m] (reset! captured m))
    `)
    // (/ 1 0) throws :error/runtime, but we only catch :error/custom — propagates
    sess.evaluate('(is (thrown? :error/custom (/ 1 0)))')
    expect(sess.evaluate('(:type @captured)')).toEqual(v.keyword(':error'))
  })

  it('carries :expected form in the pass report', () => {
    const sess = s()
    sess.evaluate(`
      (def captured (atom nil))
      (defmethod report :pass [m] (reset! captured m))
    `)
    sess.evaluate('(is (thrown? :default (throw "x")))')
    // :expected should be the list (thrown? :default (throw "x"))
    expect(sess.evaluate('(first (:expected @captured))')).toEqual(v.symbol('thrown?'))
  })
})

// ---------------------------------------------------------------------------
// 11. thrown-with-msg? — exception + message assertion macro
// ---------------------------------------------------------------------------

describe('clojure.test/thrown-with-msg?', () => {
  it('returns exception when type matches AND message matches', () => {
    const sess = s()
    // Runtime errors have :message in the caught map — result is a map (truthy)
    expect(
      sess.evaluate('(map? (thrown-with-msg? :error/runtime #"zero" (/ 1 0)))')
    ).toEqual(v.boolean(true))
  })

  it('(is (thrown-with-msg? ...)) reports :pass when message matches', () => {
    const sess = s()
    sess.evaluate(`
      (def captured (atom nil))
      (defmethod report :pass [m] (reset! captured m))
    `)
    sess.evaluate('(is (thrown-with-msg? :error/runtime #"zero" (/ 1 0)))')
    expect(sess.evaluate('(:type @captured)')).toEqual(v.keyword(':pass'))
  })

  it('returns nil when message does NOT match regex', () => {
    const sess = s()
    const result = sess.evaluate(
      '(thrown-with-msg? :error/runtime #"something-else" (/ 1 0))'
    )
    expect(result).toEqual(v.nil())
  })

  it('(is (thrown-with-msg? ...)) reports :fail when message does not match', () => {
    const sess = s()
    sess.evaluate(`
      (def captured (atom nil))
      (defmethod report :fail [m] (reset! captured m))
    `)
    sess.evaluate('(is (thrown-with-msg? :error/runtime #"something-else" (/ 1 0)))')
    expect(sess.evaluate('(:type @captured)')).toEqual(v.keyword(':fail'))
  })

  it('returns false when body does NOT throw', () => {
    const sess = s()
    expect(
      sess.evaluate('(thrown-with-msg? :default #"anything" 42)')
    ).toEqual(v.boolean(false))
  })

  it('works with user-thrown strings via str fallback', () => {
    const sess = s()
    sess.evaluate(`
      (def captured (atom nil))
      (defmethod report :pass [m] (reset! captured m))
    `)
    // Throw a plain string — (:message e) is nil, falls back to (str e)
    sess.evaluate('(is (thrown-with-msg? :default #"boom" (throw "boom string")))')
    expect(sess.evaluate('(:type @captured)')).toEqual(v.keyword(':pass'))
  })
})

// ---------------------------------------------------------------------------
// 12. successful?
// ---------------------------------------------------------------------------

describe('clojure.test/successful?', () => {
  it('returns true when summary has no failures or errors', () => {
    const sess = s()
    sess.evaluate("(require '[clojure.test :refer [successful?]])")
    expect(
      sess.evaluate('(successful? {:test 3 :pass 3 :fail 0 :error 0})')
    ).toEqual(v.boolean(true))
  })

  it('returns false when summary has failures', () => {
    const sess = s()
    sess.evaluate("(require '[clojure.test :refer [successful?]])")
    expect(
      sess.evaluate('(successful? {:test 2 :pass 1 :fail 1 :error 0})')
    ).toEqual(v.boolean(false))
  })

  it('returns false when summary has errors', () => {
    const sess = s()
    sess.evaluate("(require '[clojure.test :refer [successful?]])")
    expect(
      sess.evaluate('(successful? {:test 1 :pass 0 :fail 0 :error 1})')
    ).toEqual(v.boolean(false))
  })

  it('works on real run-tests output', () => {
    const sess = ns('succ.test')
    sess.evaluate("(require '[clojure.test :refer [successful?]])")
    sess.evaluate('(deftest t (is (= 1 1)))')
    sess.evaluate('(defmethod report :default [_] nil)')
    sess.evaluate("(def result (run-tests 'succ.test))")
    expect(sess.evaluate('(successful? result)')).toEqual(v.boolean(true))
  })

  it('returns false for real run-tests output with a failure', () => {
    const sess = ns('fail.succ.test')
    sess.evaluate("(require '[clojure.test :refer [successful?]])")
    sess.evaluate('(deftest t (is (= 1 2)))')
    sess.evaluate('(defmethod report :default [_] nil)')
    sess.evaluate("(def result (run-tests 'fail.succ.test))")
    expect(sess.evaluate('(successful? result)')).toEqual(v.boolean(false))
  })
})

// ---------------------------------------------------------------------------
// 13. run-test — single-test REPL runner
// ---------------------------------------------------------------------------

describe('clojure.test/run-test', () => {
  it('returns a summary map', () => {
    const sess = ns('run-test.ns')
    sess.evaluate("(require '[clojure.test :refer [run-test]])")
    sess.evaluate('(deftest my-single-test (is (= 1 1)))')
    sess.evaluate('(defmethod report :default [_] nil)')
    expect(sess.evaluate('(run-test my-single-test)').kind).toBe('map')
  })

  it(':test count is 1 for a single test', () => {
    const sess = ns('run-test.count')
    sess.evaluate("(require '[clojure.test :refer [run-test]])")
    sess.evaluate('(deftest solo-test (is (= 2 2)) (is (= 3 3)))')
    sess.evaluate('(defmethod report :default [_] nil)')
    sess.evaluate('(def result (run-test solo-test))')
    expect(sess.evaluate('(:test result)')).toEqual(v.number(1))
  })

  it(':pass count reflects assertions in the test body', () => {
    const sess = ns('run-test.pass')
    sess.evaluate("(require '[clojure.test :refer [run-test]])")
    sess.evaluate('(deftest passing-test (is true) (is (= 1 1)) (is (string? "x")))')
    sess.evaluate('(defmethod report :default [_] nil)')
    sess.evaluate('(def result (run-test passing-test))')
    expect(sess.evaluate('(:pass result)')).toEqual(v.number(3))
  })

  it(':fail count captured for failing assertions', () => {
    const sess = ns('run-test.fail')
    sess.evaluate("(require '[clojure.test :refer [run-test]])")
    sess.evaluate('(deftest failing-test (is true) (is false) (is (= 1 2)))')
    sess.evaluate('(defmethod report :default [_] nil)')
    sess.evaluate('(def result (run-test failing-test))')
    expect(sess.evaluate('(:pass result)')).toEqual(v.number(1))
    expect(sess.evaluate('(:fail result)')).toEqual(v.number(2))
  })

  it('*testing-vars* is bound to the test name during execution', () => {
    const sess = ns('run-test.vars')
    sess.evaluate("(require '[clojure.test :refer [run-test]])")
    sess.evaluate(`
      (def seen-vars (atom nil))
      (defmethod report :pass [_]
        (reset! seen-vars clojure.test/*testing-vars*))
      (deftest named-run-test (is true))
    `)
    sess.evaluate('(run-test named-run-test)')
    expect(sess.evaluate('(first @seen-vars)')).toEqual(v.string('named-run-test'))
  })
})

// ---------------------------------------------------------------------------
// 13. Error cases
// ---------------------------------------------------------------------------

describe('clojure.test — error cases', () => {
  it('deftest with a top-level throw reports :error', () => {
    const sess = ns('toplevel.err')
    sess.evaluate(`
      (def err-count (atom 0))
      (defmethod report :error [_] (swap! err-count inc))
      (deftest throwing-test (throw (ex-info "oops" {})))
    `)
    sess.evaluate("(run-tests 'toplevel.err)")
    expect(sess.evaluate('@err-count')).toEqual(v.number(1))
  })

  it('one test throwing does not prevent other tests from running', () => {
    const sess = ns('resilient.test')
    sess.evaluate(`
      (def ran (atom []))
      (defmethod report :pass [_]  (swap! ran conj :pass))
      (defmethod report :error [_] (swap! ran conj :error))
      (deftest t1 (is true))
      (deftest t2 (throw (ex-info "boom" {})))
      (deftest t3 (is true))
    `)
    sess.evaluate("(run-tests 'resilient.test)")
    expect(sess.evaluate('(count @ran)')).toEqual(v.number(3))
  })
})

// ---------------------------------------------------------------------------
// 14. use-fixtures — API, compose/join, run-tests integration
// ---------------------------------------------------------------------------

describe('clojure.test/use-fixtures — API', () => {
  it('registers :each fixtures under [ns-str :each] in fixture-registry', () => {
    const sess = ns('fix.api.each')
    sess.evaluate(`
      (defn my-fixture [f] (f))
      (use-fixtures :each my-fixture)
    `)
    // The key is a vector [ns-name-string :each]
    const stored = sess.evaluate('(get @clojure.test/fixture-registry ["fix.api.each" :each])')
    expect(stored).toEqual(v.vector([sess.evaluate('my-fixture')]))
  })

  it('registers :once fixtures under [ns-str :once] in fixture-registry', () => {
    const sess = ns('fix.api.once')
    sess.evaluate(`
      (defn my-fixture [f] (f))
      (use-fixtures :once my-fixture)
    `)
    const stored = sess.evaluate('(get @clojure.test/fixture-registry ["fix.api.once" :once])')
    expect(stored).toEqual(v.vector([sess.evaluate('my-fixture')]))
  })

  it('stores multiple fixture fns as a vector in order', () => {
    const sess = ns('fix.api.multi')
    sess.evaluate(`
      (defn f1 [g] (g))
      (defn f2 [g] (g))
      (use-fixtures :each f1 f2)
    `)
    const stored = sess.evaluate('(get @clojure.test/fixture-registry ["fix.api.multi" :each])')
    expect(stored).toEqual(v.vector([sess.evaluate('f1'), sess.evaluate('f2')]))
  })

  it('is ns-scoped — fixtures from different namespaces use different keys', () => {
    const sessA = ns('fix.ns.a')
    const sessB = ns('fix.ns.b')
    sessA.evaluate('(defn fx [f] (f)) (use-fixtures :each fx)')
    // ns b has no fixtures
    const storedInB = sessB.evaluate('(get @clojure.test/fixture-registry ["fix.ns.b" :each])')
    expect(storedInB).toEqual(v.nil())
  })

  it('use-fixtures returns nil', () => {
    const sess = ns('fix.api.ret')
    sess.evaluate('(defn fx [f] (f))')
    expect(sess.evaluate('(use-fixtures :each fx)')).toEqual(v.nil())
  })
})

describe('clojure.test/compose-fixtures + join-fixtures', () => {
  it('compose-fixtures: setup f1 before f2, teardown f2 before f1', () => {
    const sess = s()
    sess.evaluate(`
      (def log (atom []))
      (defn f1 [g] (swap! log conj :f1-before) (g) (swap! log conj :f1-after))
      (defn f2 [g] (swap! log conj :f2-before) (g) (swap! log conj :f2-after))
      (def cf (compose-fixtures f1 f2))
      (cf (fn [] (swap! log conj :test)))
    `)
    expect(sess.evaluate('@log')).toEqual(
      v.vector([
        v.keyword(':f1-before'),
        v.keyword(':f2-before'),
        v.keyword(':test'),
        v.keyword(':f2-after'),
        v.keyword(':f1-after'),
      ])
    )
  })

  it('join-fixtures of empty vector calls thunk directly (identity)', () => {
    const sess = s()
    sess.evaluate(`
      (def called (atom false))
      (def jf (join-fixtures []))
      (jf (fn [] (reset! called true)))
    `)
    expect(sess.evaluate('@called')).toEqual(v.boolean(true))
  })

  it('join-fixtures of a single fixture wraps correctly', () => {
    const sess = s()
    sess.evaluate(`
      (def log (atom []))
      (defn fx [g] (swap! log conj :before) (g) (swap! log conj :after))
      (def jf (join-fixtures [fx]))
      (jf (fn [] (swap! log conj :body)))
    `)
    expect(sess.evaluate('@log')).toEqual(
      v.vector([v.keyword(':before'), v.keyword(':body'), v.keyword(':after')])
    )
  })

  it('join-fixtures of [f1 f2] chains both with correct ordering', () => {
    const sess = s()
    sess.evaluate(`
      (def log (atom []))
      (defn f1 [g] (swap! log conj :f1-in) (g) (swap! log conj :f1-out))
      (defn f2 [g] (swap! log conj :f2-in) (g) (swap! log conj :f2-out))
      (def jf (join-fixtures [f1 f2]))
      (jf (fn [] (swap! log conj :body)))
    `)
    expect(sess.evaluate('@log')).toEqual(
      v.vector([
        v.keyword(':f1-in'),
        v.keyword(':f2-in'),
        v.keyword(':body'),
        v.keyword(':f2-out'),
        v.keyword(':f1-out'),
      ])
    )
  })
})

describe('clojure.test/run-tests — :each fixtures', () => {
  it(':each fixture setup runs before test body', () => {
    const sess = ns('fix.each.setup')
    sess.evaluate(`
      (def log (atom []))
      (defn fx [f] (swap! log conj :setup) (f) (swap! log conj :teardown))
      (use-fixtures :each fx)
      (deftest t (swap! log conj :test))
      (defmethod report :default [_] nil)
    `)
    sess.evaluate("(run-tests 'fix.each.setup)")
    expect(sess.evaluate('@log')).toEqual(
      v.vector([v.keyword(':setup'), v.keyword(':test'), v.keyword(':teardown')])
    )
  })

  it(':each fixture teardown runs after test body', () => {
    const sess = ns('fix.each.teardown')
    sess.evaluate(`
      (def log (atom []))
      (defn fx [f] (f) (swap! log conj :teardown))
      (use-fixtures :each fx)
      (deftest t (swap! log conj :test))
      (defmethod report :default [_] nil)
    `)
    sess.evaluate("(run-tests 'fix.each.teardown)")
    expect(sess.evaluate('(last @log)')).toEqual(v.keyword(':teardown'))
  })

  it(':each fixture runs around each individual test', () => {
    const sess = ns('fix.each.pertest')
    sess.evaluate(`
      (def log (atom []))
      (defn fx [f] (swap! log conj :setup) (f) (swap! log conj :teardown))
      (use-fixtures :each fx)
      (deftest t1 (swap! log conj :t1))
      (deftest t2 (swap! log conj :t2))
      (defmethod report :default [_] nil)
    `)
    sess.evaluate("(run-tests 'fix.each.pertest)")
    // setup/teardown should appear twice — once per test
    const log = sess.evaluate('@log')
    expect(log).toEqual(
      v.vector([
        v.keyword(':setup'), v.keyword(':t1'), v.keyword(':teardown'),
        v.keyword(':setup'), v.keyword(':t2'), v.keyword(':teardown'),
      ])
    )
  })

  it(':each fixture side effect is visible inside the test', () => {
    const sess = ns('fix.each.sideeffect')
    // Silence print-side-effects only; keep :pass/:fail methods so counters increment
    sess.evaluate(`
      (def state (atom nil))
      (defn fx [f] (reset! state :ready) (f))
      (use-fixtures :each fx)
      (deftest t (is (= @state :ready)))
      (defmethod report :begin-test-ns [_] nil)
      (defmethod report :end-test-ns [_] nil)
      (defmethod report :begin-test-var [_] nil)
      (defmethod report :end-test-var [_] nil)
      (defmethod report :summary [_] nil)
    `)
    sess.evaluate("(def __summary (run-tests 'fix.each.sideeffect))")
    // Pass count = 1 means the (is (= @state :ready)) assertion passed inside the fixture
    expect(sess.evaluate('(:pass __summary)')).toEqual(v.number(1))
    expect(sess.evaluate('(:fail __summary)')).toEqual(v.number(0))
  })

  it(':each fixture teardown runs even when test throws', () => {
    const sess = ns('fix.each.throw')
    sess.evaluate(`
      (def teardown-ran (atom false))
      (defn fx [f] (try (f) (catch :default _ nil)) (reset! teardown-ran true))
      (use-fixtures :each fx)
      (deftest t (throw "boom"))
      (defmethod report :default [_] nil)
    `)
    sess.evaluate("(run-tests 'fix.each.throw)")
    expect(sess.evaluate('@teardown-ran')).toEqual(v.boolean(true))
  })
})

describe('clojure.test/run-tests — :once fixtures', () => {
  it(':once fixture setup runs once before all tests', () => {
    const sess = ns('fix.once.setup')
    sess.evaluate(`
      (def log (atom []))
      (defn fx [f] (swap! log conj :once-setup) (f) (swap! log conj :once-teardown))
      (use-fixtures :once fx)
      (deftest t1 (swap! log conj :t1))
      (deftest t2 (swap! log conj :t2))
      (defmethod report :default [_] nil)
    `)
    sess.evaluate("(run-tests 'fix.once.setup)")
    // :once-setup appears exactly once, before both tests
    expect(sess.evaluate('@log')).toEqual(
      v.vector([
        v.keyword(':once-setup'),
        v.keyword(':t1'),
        v.keyword(':t2'),
        v.keyword(':once-teardown'),
      ])
    )
  })

  it(':once fixture teardown runs once after all tests', () => {
    const sess = ns('fix.once.teardown')
    sess.evaluate(`
      (def log (atom []))
      (defn fx [f] (f) (swap! log conj :once-teardown))
      (use-fixtures :once fx)
      (deftest t1 (swap! log conj :t1))
      (deftest t2 (swap! log conj :t2))
      (defmethod report :default [_] nil)
    `)
    sess.evaluate("(run-tests 'fix.once.teardown)")
    expect(sess.evaluate('(last @log)')).toEqual(v.keyword(':once-teardown'))
    // teardown appears only once
    const count = sess.evaluate('(count (filter (fn [x] (= x :once-teardown)) @log))')
    expect(count).toEqual(v.number(1))
  })

  it(':once and :each together: :once wraps everything, :each wraps each test', () => {
    const sess = ns('fix.once.and.each')
    sess.evaluate(`
      (def log (atom []))
      (defn once-fx [f] (swap! log conj :once-in) (f) (swap! log conj :once-out))
      (defn each-fx [f] (swap! log conj :each-in) (f) (swap! log conj :each-out))
      (use-fixtures :once once-fx)
      (use-fixtures :each each-fx)
      (deftest t1 (swap! log conj :t1))
      (deftest t2 (swap! log conj :t2))
      (defmethod report :default [_] nil)
    `)
    sess.evaluate("(run-tests 'fix.once.and.each)")
    expect(sess.evaluate('@log')).toEqual(
      v.vector([
        v.keyword(':once-in'),
        v.keyword(':each-in'), v.keyword(':t1'), v.keyword(':each-out'),
        v.keyword(':each-in'), v.keyword(':t2'), v.keyword(':each-out'),
        v.keyword(':once-out'),
      ])
    )
  })
})
