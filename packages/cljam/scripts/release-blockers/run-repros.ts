/**
 * Run release-blocker repro cases outside Vitest, one isolated process per case.
 *
 * Synchronous infinite loops cannot be interrupted in-process; each case runs
 * in a child worker that is killed after TIMEOUT_MS.
 *
 * Usage (from packages/cljam):
 *   bun run scripts/release-blockers/run-repros.ts
 *   bun run scripts/release-blockers/run-repros.ts RB-003
 */

import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BLOCKER_CASES } from './cases'

const TIMEOUT_MS = 3_000
const here = dirname(fileURLToPath(import.meta.url))
const workerPath = join(here, 'worker.ts')

type WorkerResult = {
  id: string
  outcome: 'ok' | 'error' | 'hang'
  value?: string
  message?: string
  verdict: string
  releaseBlocker: boolean
}

function runWorker(args: string[]): Promise<WorkerResult> {
  return new Promise((resolve) => {
    const child = spawn('bun', ['run', workerPath, ...args], {
      cwd: join(here, '../..'),
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      resolve({
        id: args[args.length - 1] ?? args[0] ?? '?',
        outcome: 'hang',
        verdict: `HANG (>${TIMEOUT_MS}ms, worker killed)`,
        releaseBlocker: true,
      })
    }, TIMEOUT_MS)

    child.on('close', (code) => {
      clearTimeout(timer)
      if (stdout.trim()) {
        try {
          resolve(JSON.parse(stdout.trim()) as WorkerResult)
          return
        } catch {
          /* fall through */
        }
      }
      resolve({
        id: args[args.length - 1] ?? '?',
        outcome: 'error',
        message: stderr || stdout || `exit ${code}`,
        verdict: `WORKER FAILED: ${(stderr || stdout || `exit ${code}`).split('\n')[0]}`,
        releaseBlocker: true,
      })
    })
  })
}

async function main() {
  const filter = new Set(process.argv.slice(2))
  const cases = filter.size
    ? BLOCKER_CASES.filter((c) => filter.has(c.id))
    : BLOCKER_CASES

  console.log('cljam release blocker repros (process-isolated)')
  console.log(`worker timeout: ${TIMEOUT_MS}ms`)
  console.log('—'.repeat(72))

  const blockers: string[] = []

  for (const block of cases) {
    const result = await runWorker([block.id])
    const flag = result.releaseBlocker
      ? 'BLOCKER'
      : block.id.includes('control')
        ? 'control'
        : 'ok'

    console.log(`\n[${block.id}] ${block.title}`)
    console.log(`  category: ${block.category}`)
    console.log(`  jvm expected: ${block.jvmExpected}`)
    console.log(`  ${flag}: ${result.verdict}`)
    if (result.value) console.log(`  value: ${result.value}`)
    if (result.message) console.log(`  message: ${result.message.split('\n').slice(0, 3).join(' ')}`)

    if (result.releaseBlocker) blockers.push(block.id)
  }

  console.log('\n' + '—'.repeat(72))
  console.log('File load probes')
  console.log('—'.repeat(72))

  for (const fileId of ['RB-006a', 'RB-006b']) {
    const result = await runWorker(['file-load', fileId])
    const title =
      fileId === 'RB-006a'
        ? 'loadFile: defrecord-only _test.clj (control)'
        : 'loadFile: defprotocol + defrecord _test.clj'
    const flag = result.releaseBlocker
      ? 'BLOCKER'
      : fileId.includes('control') || fileId.endsWith('a')
        ? 'control'
        : 'ok'

    console.log(`\n[${fileId}] ${title}`)
    console.log(`  ${flag}: ${result.verdict}`)
    if (result.value) console.log(`  value: ${result.value}`)
    if (result.message) console.log(`  message: ${result.message.split('\n').slice(0, 3).join(' ')}`)

    if (result.releaseBlocker) blockers.push(fileId)
  }

  console.log('\n' + '—'.repeat(72))
  if (blockers.length === 0) {
    console.log('No release blockers detected in this run.')
  } else {
    console.log(`Release blockers confirmed: ${[...new Set(blockers)].join(', ')}`)
  }

  process.exit(blockers.length > 0 ? 1 : 0)
}

main()
