/**
 * Phase 2 differential harness — the safety net for the interpreter-over-AST
 * migration.
 *
 * cljam is collapsing its two semantic surfaces (tree-walking interpreter +
 * bytecode VM) into one shared analyzer/IR. Before the interpreter is rebuilt to
 * consume the analyzed AST, we freeze the current invariant — *the two backends
 * agree on every test in the `.clj` suite* — into a green baseline. Any
 * divergence introduced while reworking the interpreter then trips this gate
 * immediately, naming the exact `deftest` that drifted.
 *
 * **The two backends** (one flag, `vmExecutionMode`):
 *   - A = `off`           — top-level *and* fn-bodies run on the interpreter.
 *   - B = `function-body` — top-level forms stay on the interpreter (so files
 *                           load: the VM does not support top-level mutation
 *                           forms like `ns`/`def`), while compiled fn-bodies —
 *                           which is where every `deftest` assertion executes —
 *                           run on the VM.
 *
 * `vm-required` is intentionally NOT used: it cannot even construct a session,
 * because clojure.core's bootstrap contains a top-level `ns` form the VM rejects.
 * `function-body` is the purest *runnable* interpreter-vs-VM pairing.
 *
 * **Coverage honesty.** Because B silently falls back to the interpreter for any
 * fn-body that fails to compile, a comparison could be vacuous (both backends ran
 * the interpreter). We count executed `vm:function-body` events per test in B; a
 * count of zero means the VM never actually ran the test logic. That is reported,
 * not asserted — it is the coverage map, the honest substitute for `vm-required`.
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

describe('interpreter ⇄ VM differential', () => {
  for (const file of suiteFiles) {
    describe(file.name, () => {
      let interp: Backend
      let vm: Backend

      beforeAll(async () => {
        interp = await makeBackend(file.source, 'off')
        vm = await makeBackend(file.source, 'function-body')
      })

      if (file.deftests.length === 0) {
        it.skip('(no deftests)', () => {})
        return
      }

      for (const testName of file.deftests) {
        it(testName, async () => {
          const vmExecBefore = vm.vmExecCount()
          const a = await runOnce(interp.session, testName)
          const b = await runOnce(vm.session, testName)
          const vmExecDelta = vm.vmExecCount() - vmExecBefore

          if (vmExecDelta === 0) {
            vacuousCases.push({ file: file.name, test: testName })
          }

          // Both backends must agree on throw-vs-ran.
          expect(b.kind, `backend disagreement: interpreter=${a.kind}, vm=${b.kind}`).toBe(a.kind)

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
  // many comparisons genuinely exercised the VM vs. ran the interpreter on both
  // sides. Reported, never asserted — a vacuous comparison is not a failure.
  // process.stdout.write (not console.log) so it survives vitest's console
  // interception and is always visible.
  process.stdout.write(
    `\n[differential] VM coverage: ${covered}/${totalTests} deftests executed a ` +
      `compiled fn-body on the VM backend` +
      (vacuous > 0
        ? `; ${vacuous} vacuous (both ran interpreter):\n` +
          vacuousCases.map((c) => `  - ${c.file} › ${c.test}`).join('\n')
        : '.') +
      '\n'
  )
})
