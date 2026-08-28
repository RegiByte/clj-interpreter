/**
 * Shared clojure.test → host-runner bridge.
 *
 * Three consumers need the exact same session wiring to run `deftest` forms and
 * collect their failures:
 *
 *   1. `generateTestModuleCode` (vite-plugin codegen) — emits this setup as a
 *      generated vitest/bun module for the `.clj` suite.
 *   2. `clj-test-bridge.spec.ts` — integration-tests the bridge itself.
 *   3. The Phase 2 differential harness — runs each `.clj` file through two
 *      backends (`off` vs `function-body`) and asserts identical results.
 *
 * Keeping the wiring in one place means a change to the failure-capture contract
 * (e.g. how `:fail`/`:error` are rendered) updates every consumer at once,
 * instead of drifting across three hand-mirrored copies.
 */

import type { Session } from '../index'

/**
 * Clojure expression that overrides `clojure.test/report :fail` to accumulate a
 * rendered failure string in the `__vt_failures` atom instead of printing.
 */
const FAIL_OVERRIDE = [
  '(defmethod clojure.test/report :fail [m]',
  '  (swap! __vt_failures conj',
  '    (str',
  '      (when (:message m) (str (:message m) "\\n"))',
  '      "expected: " (pr-str (:expected m)) "\\n"',
  '      "  actual: " (pr-str (:actual m)))))',
].join(' ')

/**
 * Clojure expression that overrides `clojure.test/report :error` to capture the
 * thrown value (exception or error map) in `__vt_failures`.
 */
const ERROR_OVERRIDE = [
  '(defmethod clojure.test/report :error [m]',
  '  (swap! __vt_failures conj (str "error: " (pr-str (:actual m)))))',
].join(' ')

/** Report methods that produce noise and are silenced — the host runner owns output. */
const SILENCED_REPORTS = [
  ':pass',
  ':begin-test-var',
  ':end-test-var',
  ':begin-test-ns',
  ':end-test-ns',
  ':summary',
]

/**
 * Install the failure bridge into a session that has already loaded its test
 * source. Requires `clojure.test`, defines the `__vt_failures` atom, and
 * overrides the `report` multimethod so `:fail`/`:error` accumulate strings and
 * everything else is silenced.
 *
 * Idempotent per session in practice — re-running simply re-installs the same
 * defmethods. Call once after `loadFile`/`loadFileAsync`.
 */
export function installTestBridge(session: Session): void {
  session.evaluate("(require '[clojure.test])")
  session.evaluate('(def __vt_failures (atom []))')
  session.evaluate(FAIL_OVERRIDE)
  session.evaluate(ERROR_OVERRIDE)
  for (const report of SILENCED_REPORTS) {
    session.evaluate(`(defmethod clojure.test/report ${report} [_] nil)`)
  }
}

/**
 * Compose the `:each` fixture chain for a namespace into `__vt_each_fixture`.
 *
 * `join-fixtures` of `[]` collapses to `default-fixture` (`(fn [f] (f))`), so a
 * file with no registered fixtures pays no overhead. `use-fixtures` calls run at
 * `loadFile` time, so the registry is already populated when this is called.
 */
export function composeEachFixture(session: Session, nsName: string): void {
  session.evaluate(
    `(def __vt_each_fixture (clojure.test/join-fixtures ` +
      `(get @clojure.test/fixture-registry [${JSON.stringify(nsName)} :each] [])))`
  )
}

/**
 * Run one `deftest` (by name) through the composed `:each` fixture chain and
 * return the collected failure strings. Empty array ⇒ the test passed.
 *
 * `evaluateAsync` awaits `CljPending` results (returned by `(async ...)` deftest
 * bodies) and is synchronous-cost for ordinary deftests. An uncaught throw in
 * the test body rejects the returned promise — callers that need to distinguish
 * "assertion failed" from "test errored out" should catch it.
 */
export async function runDeftest(
  session: Session,
  testName: string
): Promise<string[]> {
  session.evaluate('(reset! __vt_failures [])')
  await session.evaluateAsync(`(__vt_each_fixture (fn [] (${testName})))`)
  const failures = session.cljToJs(session.evaluate('@__vt_failures'))
  return Array.isArray(failures) ? (failures as string[]) : []
}
