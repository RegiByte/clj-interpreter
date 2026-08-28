import { createSession, cljToJs } from '../../../packages/cljam/dist/index.mjs'
import { getWorkload } from '../workloads/workloads.mjs'
import { measureWorkload } from '../lib/measure.mjs'

async function main() {
  const payload = JSON.parse(process.argv[2])
  const workload = getWorkload(payload.workload)

  const setupStart = performance.now()
  const session = createSession({ vmExecutionMode: payload.mode })
  for (const form of workload.clj.setup) session.evaluate(form)
  const setupMs = performance.now() - setupStart

  const checksum = cljToJs(session.evaluate(workload.clj.run))
  const pass = checksum === workload.expected
  if (!pass) {
    process.stdout.write(
      JSON.stringify({ ok: true, pass, checksum, expected: workload.expected, setupMs }) + '\n'
    )
    return
  }

  const runBatch = (k) => {
    for (let i = 0; i < k; i++) session.evaluate(workload.clj.run)
  }
  const measured = await measureWorkload(runBatch, payload.measure)

  process.stdout.write(
    JSON.stringify({ ok: true, pass, checksum, expected: workload.expected, setupMs, ...measured }) +
      '\n'
  )
}

main().catch((err) => {
  process.stdout.write(JSON.stringify({ ok: false, error: String(err?.message ?? err) }) + '\n')
  process.exit(1)
})
