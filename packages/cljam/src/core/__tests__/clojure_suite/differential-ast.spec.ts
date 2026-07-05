/**
 * Phase 2 differential harness — AST-walker arm (WIP until Phase 2 DoD).
 *
 * The third backend next to `differential.spec.ts`'s interpreter ⇄ VM pairing:
 *   - A = `off` — top-level and fn-bodies on the form-walking interpreter.
 *   - C = `ast` — top-level forms on the AST walker (allowlist-gated, whole-form
 *                 fallback), fn-bodies with an attached `astMethod` on the
 *                 walker. See `src/core/walker/`.
 *
 * Three severities (PHASE2_INTERPRETER_PLAN.md — the only red is a real bug):
 *   - covered + equal   → green (done)
 *   - covered + differ  → RED   (AST walker bug — stop and fix)
 *   - fully fell back   → SKIP  (not yet ported; the worklist)
 *
 * "Covered" is measured, not assumed: a deftest counts only when at least one
 * `ast:function-body` execution event fired while it ran — the walker analogue
 * of the VM arm's `vm:function-body` coverage honesty. The skip list printed in
 * `afterAll` is exactly what remains for the walker allowlist.
 *
 * Phase 2 DoD: zero skips, zero divergences — `ast` ≡ `off` across the suite.
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

/** One backend's loaded session plus a live count of walker fn-body executions. */
type Backend = {
  session: Session
  astExecCount: () => number
}

async function makeBackend(
  source: string,
  mode: VmExecutionMode
): Promise<Backend> {
  let astExec = 0
  const session = createSession({
    vmExecutionMode: mode,
    output: () => {},
    instrumentation: {
      onEvent: (event) => {
        if (event.path === 'ast:function-body') astExec += 1
      },
    },
  })
  const loadedNs = await session.loadFileAsync(source)
  session.setNs(loadedNs)
  installTestBridge(session)
  composeEachFixture(session, loadedNs)
  return { session, astExecCount: () => astExec }
}

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

/** A test whose AST backend never executed a walker fn-body — not yet ported. */
type SkippedCase = { file: string; test: string }
const skippedCases: SkippedCase[] = []
let comparedCount = 0

const suiteFiles = discoverSuiteFiles()

describe('interpreter ⇄ AST-walker differential', () => {
  for (const file of suiteFiles) {
    describe(file.name, () => {
      let interp: Backend
      let ast: Backend

      beforeAll(async () => {
        interp = await makeBackend(file.source, 'off')
        ast = await makeBackend(file.source, 'ast')
      })

      if (file.deftests.length === 0) {
        it.skip('(no deftests)', () => {})
        return
      }

      for (const testName of file.deftests) {
        it(testName, async (ctx) => {
          const astExecBefore = ast.astExecCount()
          const c = await runOnce(ast.session, testName)
          const astExecDelta = ast.astExecCount() - astExecBefore

          if (astExecDelta === 0) {
            // Fully fell back — "not built yet", not "built wrong".
            skippedCases.push({ file: file.name, test: testName })
            ctx.skip()
            return
          }

          comparedCount += 1
          const a = await runOnce(interp.session, testName)

          expect(
            c.kind,
            `backend disagreement: interpreter=${a.kind}, ast=${c.kind}`
          ).toBe(a.kind)

          if (a.kind === 'ran' && c.kind === 'ran') {
            expect(c.failures).toEqual(a.failures)
          } else if (a.kind === 'threw' && c.kind === 'threw') {
            expect(c.message).toBe(a.message)
          }
        })
      }
    })
  }
})

afterAll(() => {
  const totalTests = suiteFiles.reduce((n, f) => n + f.deftests.length, 0)
  const skipped = skippedCases.length
  // The migration scoreboard: covered tests MUST agree (asserted above); the
  // skip list is exactly what the walker allowlist still owes.
  process.stdout.write(
    `\n[differential-ast] walker coverage: ${comparedCount}/${totalTests} deftests ` +
      `executed a walker fn-body and were compared against the interpreter` +
      (skipped > 0
        ? `; ${skipped} skipped (fully fell back):\n` +
          skippedCases.map((c) => `  - ${c.file} › ${c.test}`).join('\n')
        : '.') +
      '\n'
  )
})
