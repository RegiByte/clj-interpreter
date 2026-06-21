import { getWorkload } from '../workloads/workloads.mjs'
import { measureWorkload } from '../lib/measure.mjs'

async function main() {
  const payload = JSON.parse(process.argv[2])
  const workload = getWorkload(payload.workload)

  const setupStart = performance.now()
  const instance = workload.js()
  const setupMs = performance.now() - setupStart

  const checksum = instance.run()
  const pass = checksum === workload.expected
  if (!pass) {
    process.stdout.write(
      JSON.stringify({ ok: true, pass, checksum, expected: workload.expected, setupMs }) + '\n'
    )
    return
  }

  const runBatch = (k) => {
    for (let i = 0; i < k; i++) instance.run()
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
