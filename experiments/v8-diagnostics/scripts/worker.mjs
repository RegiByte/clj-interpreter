import { performance } from 'node:perf_hooks'
import { findWorkload, workloads } from './workloads.mjs'

function readArgs(argv) {
  const args = {
    workload: null,
    iterations: 20,
    warmup: 5,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--workload') args.workload = argv[++i]
    else if (arg === '--iterations') args.iterations = Number.parseInt(argv[++i], 10)
    else if (arg === '--warmup') args.warmup = Number.parseInt(argv[++i], 10)
    else if (arg === '--list') args.list = true
  }
  return args
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]
}

function summarize(times) {
  const sorted = [...times].sort((a, b) => a - b)
  const total = times.reduce((sum, time) => sum + time, 0)
  return {
    count: times.length,
    totalMs: total,
    avgMs: total / times.length,
    minMs: sorted[0] ?? 0,
    medianMs: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    maxMs: sorted[sorted.length - 1] ?? 0,
    timesMs: times,
  }
}

const args = readArgs(process.argv.slice(2))

if (args.list) {
  console.log(JSON.stringify(workloads.map(({ name, group, description }) => ({ name, group, description })), null, 2))
  process.exit(0)
}

if (!args.workload) {
  throw new Error('Missing --workload')
}

const workload = findWorkload(args.workload)
if (!workload) {
  throw new Error(`Unknown workload: ${args.workload}`)
}

const state = workload.setup()

for (let i = 0; i < args.warmup; i++) {
  workload.run(state)
}

const times = []
for (let i = 0; i < args.iterations; i++) {
  const start = performance.now()
  workload.run(state)
  times.push(performance.now() - start)
}

const result = {
  workload: workload.name,
  group: workload.group,
  description: workload.description,
  warmup: args.warmup,
  iterations: args.iterations,
  timing: summarize(times),
}

console.log(`CLJAM_V8_RESULT_JSON:${JSON.stringify(result)}`)
