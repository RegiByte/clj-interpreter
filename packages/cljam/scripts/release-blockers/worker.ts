/**
 * Worker: evaluate one release-blocker case in an isolated process.
 * Invoked by run-repros.ts — do not run directly unless debugging.
 *
 *   bun run scripts/release-blockers/worker.ts RB-003
 *   bun run scripts/release-blockers/worker.ts file-load RB-006b
 */

import { createSession } from '../../src/core/session'
import { nodePreset } from '../../src/presets'
import { printString } from '../../src/core/printer'
import {
  BLOCKER_CASES,
  DEFRECORD_ONLY_FILE_SOURCE,
  PROTOCOL_TEST_FILE_SOURCE,
  type BlockerCase,
} from './cases'

type WorkerResult = {
  id: string
  outcome: 'ok' | 'error' | 'hang'
  value?: string
  message?: string
  verdict: string
  releaseBlocker: boolean
}

function evaluateCase(block: BlockerCase): WorkerResult {
  const session = createSession({ ...nodePreset() })

  for (const setup of block.setup ?? []) {
    try {
      session.evaluate(setup)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      return {
        id: block.id,
        outcome: 'error',
        message: `setup: ${message}`,
        verdict: `SETUP ERROR: ${message}`,
        releaseBlocker: true,
      }
    }
  }

  try {
    const result = session.evaluate(block.form!)
    const printed = printString(result)

    if (block.expectError) {
      return {
        id: block.id,
        outcome: 'ok',
        value: printed,
        verdict: `UNEXPECTED SUCCESS: ${printed}`,
        releaseBlocker: true,
      }
    }

    if (block.expectNumber !== undefined) {
      const n = Number(printed)
      if (n === block.expectNumber) {
        return {
          id: block.id,
          outcome: 'ok',
          value: printed,
          verdict: `OK: ${printed}`,
          releaseBlocker: false,
        }
      }
      return {
        id: block.id,
        outcome: 'ok',
        value: printed,
        verdict: `WRONG VALUE: got ${printed}, expected ${block.expectNumber}`,
        releaseBlocker: block.id.startsWith('RB-00'),
      }
    }

    if (block.id.startsWith('RB-003')) {
      const ok = printed === '[0 3 6 9]'
      return {
        id: block.id,
        outcome: 'ok',
        value: printed,
        verdict: ok ? `OK: ${printed}` : `UNEXPECTED: ${printed}`,
        releaseBlocker: block.id === 'RB-003' && !ok,
      }
    }

    if (block.id.startsWith('RB-005')) {
      // Reaching here means the form evaluated (an escape lands in the catch
      // branch below). thrown? returns the caught value itself (JVM parity:
      // the exception object, truthy) — so catchable = any truthy result.
      const ok = printed !== 'nil' && printed !== 'false'
      return {
        id: block.id,
        outcome: 'ok',
        value: printed,
        verdict: ok ? `OK: ${printed}` : `FAIL: expected catchable error, got ${printed}`,
        releaseBlocker: block.id !== 'RB-005-control' && !ok,
      }
    }

    return {
      id: block.id,
      outcome: 'ok',
      value: printed,
      verdict: `OK: ${printed}`,
      releaseBlocker: false,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (block.expectError) {
      const ok = !block.errorContains || message.includes(block.errorContains)
      return {
        id: block.id,
        outcome: 'error',
        message,
        verdict: ok
          ? `ERROR (expected): ${message.split('\n')[0]}`
          : `ERROR (missing "${block.errorContains}"): ${message.split('\n')[0]}`,
        releaseBlocker: !ok,
      }
    }
    return {
      id: block.id,
      outcome: 'error',
      message,
      verdict: `ERROR (escaped evaluate boundary): ${message.split('\n')[0]}`,
      releaseBlocker: true,
    }
  }
}

function evaluateFileLoad(
  id: string,
  source: string,
  ns: string
): WorkerResult {
  const session = createSession({ ...nodePreset() })
  try {
    const loadedNs = session.loadFile(source, ns)
    session.setNs(loadedNs)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return {
      id,
      outcome: 'error',
      message,
      verdict: `LOAD ERROR: ${message.split('\n')[0]}`,
      releaseBlocker: id === 'RB-006b',
    }
  }

  try {
    if (id === 'RB-006b') {
      const area = session.evaluate('(area (->Circle 5))')
      const printed = printString(area)
      const ok = printed === '78.5'
      return {
        id,
        outcome: 'ok',
        value: printed,
        verdict: ok
          ? `File loaded; (area (->Circle 5)) => ${printed}`
          : `File loaded; unexpected area: ${printed}`,
        releaseBlocker: !ok,
      }
    }

    const point = session.evaluate('(:x (->Point 1 2))')
    const printed = printString(point)
    const ok = printed === '1'
    return {
      id,
      outcome: 'ok',
      value: printed,
      verdict: ok
        ? `File loaded; (:x (->Point 1 2)) => ${printed}`
        : `File loaded; unexpected :x: ${printed}`,
      releaseBlocker: !ok,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return {
      id,
      outcome: 'error',
      message,
      verdict: `run-tests ERROR: ${message.split('\n')[0]}`,
      releaseBlocker: id === 'RB-006b',
    }
  }
}

const arg = process.argv[2]
if (!arg) {
  console.error('usage: worker.ts <case-id> | file-load <RB-006a|RB-006b>')
  process.exit(2)
}

let result: WorkerResult

if (arg === 'file-load') {
  const fileId = process.argv[3]
  if (fileId === 'RB-006a') {
    result = evaluateFileLoad(
      'RB-006a',
      DEFRECORD_ONLY_FILE_SOURCE,
      'repro.defrecord-test'
    )
  } else if (fileId === 'RB-006b') {
    result = evaluateFileLoad(
      'RB-006b',
      PROTOCOL_TEST_FILE_SOURCE,
      'repro.protocol-test'
    )
  } else {
    console.error('unknown file-load id:', fileId)
    process.exit(2)
  }
} else {
  const block = BLOCKER_CASES.find((c) => c.id === arg)
  if (!block) {
    console.error('unknown case id:', arg)
    process.exit(2)
  }
  result = evaluateCase(block)
}

console.log(JSON.stringify(result))
