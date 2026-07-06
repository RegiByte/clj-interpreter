/**
 * Differential harness — AST walker (oracle) ⇄ VM (Phase 4 S2 contract).
 *
 * The AST walker is cljam's default engine and, since the S2 safety-net flip,
 * the REFERENCE implementation: the walker probe suites pin its behavior with
 * direct assertions, and this harness keeps the OTHER engine — the bytecode
 * VM — honest against it across the whole `.clj` suite. Any divergence trips
 * this gate immediately, naming the exact `deftest` that drifted.
 *
 * (Until S2 this file compared the form-walking interpreter (`off`) against
 * the VM; the walker earned the oracle seat by matching that interpreter
 * 288/288/0 in the retired `differential-ast.spec.ts` arm. Git history is the
 * archive.)
 *
 * **The two backends** (one flag, `vmExecutionMode`):
 *   - A = `ast`           — top-level *and* fn-bodies run on the AST walker.
 *   - B = `function-body` — compiled fn-bodies — which is where every
 *                           `deftest` assertion executes — run on the VM.
 *
 * `vm-required` is intentionally NOT used: it cannot even construct a session,
 * because clojure.core's bootstrap contains a top-level `ns` form the VM
 * rejects. `function-body` is the purest *runnable* walker-vs-VM pairing.
 *
 * **Coverage honesty.** Because B silently falls back for any fn-body that
 * fails to compile, a comparison could be vacuous (both backends ran the same
 * engine). We count executed `vm:function-body` events per test in B; a count
 * of zero means the VM never actually ran the test logic. That is reported,
 * not asserted — it is the coverage map, the honest substitute for
 * `vm-required`.
 */

import { fileURLToPath } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createSession } from '../../index'
import type { Session } from '../../index'
import type { VmExecutionMode } from '../../types'
import {
  installTestBridge,
  composeEachFixture,
  runDeftest,
} from '../../index'
import { readDeftestNames } from '../../../vite-plugin-cljam/static-analysis'

const SUITE_DIR = fileURLToPath(new URL('.', import.meta.url))

type SuiteFile = {
  name: string
  source: string
  deftests: string[]
}

function discoverSuiteFiles(): SuiteFile[] {
  return readdirSync(SUITE_DIR)
    .filter((f) => f.endsWith('_test.clj'))
    .sort()
    .map((name) => {
      const source = readFileSync(join(SUITE_DIR, name), 'utf8')
      return { name, source, deftests: readDeftestNames(source) }
    })
}

/** One backend's loaded session plus a live count of VM fn-body *executions*. */
type Backend = {
  session: Session
  /** Total `vm:function-body` execution events observed so far (compile events excluded). */
  vmExecCount: () => number
}

async function makeBackend(
  source: string,
  mode: VmExecutionMode
): Promise<Backend> {
  let vmExec = 0
  const session = createSession({
    vmExecutionMode: mode,
    output: () => {},
    instrumentation: {
      onEvent: (event) => {
        if (event.path === 'vm:function-body') vmExec += 1
      },
    },
  })
  const loadedNs = await session.loadFileAsync(source)
  session.setNs(loadedNs)
  installTestBridge(session)
  composeEachFixture(session, loadedNs)
  return { session, vmExecCount: () => vmExec }
}

/** Result of running one deftest: either captured failures, or an uncaught throw. */
type RunOutcome =
  | { kind: 'ran'; failures: string[] }
  | { kind: 'threw'; message: string }

async function runOnce(session: Session, testName: string): Promise<RunOutcome> {
  try {
    const failures = await runDeftest(session, testName)
    return { kind: 'ran', failures }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { kind: 'threw', message }
  }
}

/** A test whose VM backend never executed a compiled fn-body — comparison was vacuous. */
type VacuousCase = { file: string; test: string }
const vacuousCases: VacuousCase[] = []

const suiteFiles = discoverSuiteFiles()

describe('AST walker (oracle) ⇄ VM differential', () => {
  for (const file of suiteFiles) {
    describe(file.name, () => {
      let walker: Backend
      let vm: Backend

      beforeAll(async () => {
        walker = await makeBackend(file.source, 'ast')
        vm = await makeBackend(file.source, 'function-body')
      })

      if (file.deftests.length === 0) {
        it.skip('(no deftests)', () => {})
        return
      }

      for (const testName of file.deftests) {
        it(testName, async () => {
          const vmExecBefore = vm.vmExecCount()
          const a = await runOnce(walker.session, testName)
          const b = await runOnce(vm.session, testName)
          const vmExecDelta = vm.vmExecCount() - vmExecBefore

          if (vmExecDelta === 0) {
            vacuousCases.push({ file: file.name, test: testName })
          }

          // Both backends must agree on throw-vs-ran.
          expect(b.kind, `backend disagreement: walker=${a.kind}, vm=${b.kind}`).toBe(a.kind)

          if (a.kind === 'ran' && b.kind === 'ran') {
            // Identical assertion outcomes — same failures, same order.
            expect(b.failures).toEqual(a.failures)
          } else if (a.kind === 'threw' && b.kind === 'threw') {
            // Both threw uncaught — the surfaced message must match.
            expect(b.message).toBe(a.message)
          }
        })
      }
    })
  }
})

afterAll(() => {
  const totalTests = suiteFiles.reduce((n, f) => n + f.deftests.length, 0)
  const vacuous = vacuousCases.length
  const covered = totalTests - vacuous
  // Surfaced as the coverage map (the honest substitute for vm-required): how
  // many comparisons genuinely exercised the VM vs. ran the walker on both
  // sides. Reported, never asserted — a vacuous comparison is not a failure.
  // process.stdout.write (not console.log) so it survives vitest's console
  // interception and is always visible.
  process.stdout.write(
    `\n[differential] VM coverage: ${covered}/${totalTests} deftests executed a ` +
      `compiled fn-body on the VM backend` +
      (vacuous > 0
        ? `; ${vacuous} vacuous (both ran walker):\n` +
          vacuousCases.map((c) => `  - ${c.file} › ${c.test}`).join('\n')
        : '.') +
      '\n'
  )
})
