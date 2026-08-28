import { loadString } from 'nbb'
import { getWorkload } from '../workloads/workloads.mjs'
import { measureWorkload } from '../lib/measure.mjs'

async function main() {
  const payload = JSON.parse(process.argv[2])
  const workload = getWorkload(payload.workload)

  const setupStart = performance.now()
  for (const form of workload.clj.setup) await loadString(form)
  const setupMs = performance.now() - setupStart

  const checksum = await loadString(workload.clj.run)
  const pass = checksum === workload.expected
  if (!pass) {
    process.stdout.write(
      JSON.stringify({ ok: true, pass, checksum, expected: workload.expected, setupMs }) + '\n'
    )
    return
  }

  const runBatch = async (k) => {
    for (let i = 0; i < k; i++) await loadString(workload.clj.run)
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
