import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { workloads } from './workloads.mjs'
import { renderReports } from './report.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const experimentRoot = resolve(here, '..')
const repoRoot = resolve(experimentRoot, '../..')
const workerPath = join(here, 'worker.mjs')
const distPath = join(repoRoot, 'packages/cljam/dist/index.mjs')

function readArgs(argv) {
  const args = {
    workloads: [],
    iterations: 20,
    warmup: 5,
    modes: ['timing', 'trace', 'cpu'],
    out: null,
    clean: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--workload') args.workloads.push(argv[++i])
    else if (arg === '--iterations') args.iterations = Number.parseInt(argv[++i], 10)
    else if (arg === '--warmup') args.warmup = Number.parseInt(argv[++i], 10)
    else if (arg === '--mode') args.modes = argv[++i].split(',').map((mode) => mode.trim()).filter(Boolean)
    else if (arg === '--out') args.out = argv[++i]
    else if (arg === '--clean') args.clean = true
    else if (arg === '--help') args.help = true
  }
  return args
}

function usage() {
  return `Usage: node experiments/v8-diagnostics/scripts/run.mjs [options]

Options:
  --workload <name>       Run one workload. Repeat for multiple. Defaults to all.
  --iterations <n>        Measured iterations per workload. Default: 20.
  --warmup <n>            Warmup iterations per workload. Default: 5.
  --mode <list>           Comma-separated: timing,trace,gc,cpu. Default: timing,trace,cpu.
  --out <dir>             Output directory. Default: experiments/v8-diagnostics/runs/<timestamp>.
  --clean                 Remove output directory before running.
`
}

function compactTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')
}

function gitCommit() {
  const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  return result.status === 0 ? result.stdout.trim() : null
}

function nodeVersion() {
  const result = spawnSync(process.execPath, ['--version'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  return result.status === 0 ? result.stdout.trim() : process.version
}

function ensureDist() {
  if (!existsSync(distPath)) {
    throw new Error(
      `Missing ${relative(repoRoot, distPath)}. Build it with: bun run --filter '@regibyte/cljam' build-npm-library`
    )
  }
}

function parseWorkerResult(text) {
  const line = text
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith('CLJAM_V8_RESULT_JSON:'))
  if (!line) return null
  return JSON.parse(line.slice('CLJAM_V8_RESULT_JSON:'.length))
}

function countRecord(record, key) {
  record[key] = (record[key] ?? 0) + 1
}

function parseTrace(text) {
  const summary = {
    optimizedCount: 0,
    optimizedFunctions: {},
    deoptCount: 0,
    deoptReasons: {},
  }

  for (const line of text.split(/\r?\n/)) {
    if (line.includes('completed optimizing')) {
      summary.optimizedCount++
      const fn = line.match(/<JSFunction(?: ([^(][^> ]*))? \(sfi/)?.[1] ?? '(anonymous)'
      countRecord(summary.optimizedFunctions, fn)
    }
    if (line.includes('bailout') && line.includes('reason:')) {
      summary.deoptCount++
      let reason = line.match(/reason: (.*?): begin/)?.[1] ?? 'unknown'
      if (reason.endsWith(')')) reason = reason.slice(0, -1)
      countRecord(summary.deoptReasons, reason)
    }
  }

  return summary
}

function parseGc(text) {
  let events = 0
  let pauseMs = 0
  const kinds = {}
  for (const line of text.split(/\r?\n/)) {
    if (!line.includes('gc=')) continue
    events++
    const pause = line.match(/\bpause=([0-9.]+)/)?.[1]
    if (pause) pauseMs += Number(pause)
    const kind = line.match(/\bgc=([a-zA-Z0-9_-]+)/)?.[1]
    if (kind) countRecord(kinds, kind)
  }
  return { events, pauseMs, kinds }
}

function parseCpuProfile(profilePath) {
  if (!existsSync(profilePath)) return {}
  const profile = JSON.parse(readFileSync(profilePath, 'utf8'))
  const nodesById = new Map((profile.nodes ?? []).map((node) => [node.id, node]))
  const samples = {}
  for (const sample of profile.samples ?? []) {
    const node = nodesById.get(sample)
    const name = node?.callFrame?.functionName || '(anonymous)'
    countRecord(samples, name)
  }
  return samples
}

function mergeCounts(target, source) {
  for (const [key, value] of Object.entries(source ?? {})) {
    target[key] = (target[key] ?? 0) + value
  }
}

function runNode({ mode, workload, runDir, config }) {
  const logPath = join(runDir, 'logs', `${workload.name}.${mode}.log`)
  const profilePath = join(runDir, 'profiles', `${workload.name}.cpuprofile`)
  const args = []

  if (mode === 'trace') {
    args.push('--trace-opt', '--trace-deopt', '--trace-gc-nvp')
  } else if (mode === 'gc') {
    args.push('--trace-gc-nvp')
  } else if (mode === 'cpu') {
    args.push('--cpu-prof', '--cpu-prof-dir', join(runDir, 'profiles'), '--cpu-prof-name', `${workload.name}.cpuprofile`)
  }

  args.push(workerPath, '--workload', workload.name, '--iterations', String(config.iterations), '--warmup', String(config.warmup))

  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  })

  const combined = `${result.stdout ?? ''}${result.stderr ?? ''}`
  writeFileSync(logPath, combined)

  if (result.status !== 0) {
    throw new Error(`Workload ${workload.name} mode ${mode} failed. See ${logPath}\n${combined.slice(-4000)}`)
  }

  return {
    logPath,
    profilePath,
    workerResult: parseWorkerResult(combined),
    trace: parseTrace(combined),
    gc: parseGc(combined),
    cpuSamples: mode === 'cpu' ? parseCpuProfile(profilePath) : {},
  }
}

const args = readArgs(process.argv.slice(2))
if (args.help) {
  console.log(usage())
  process.exit(0)
}

ensureDist()

const selectedNames = args.workloads.length > 0 ? new Set(args.workloads) : null
const selected = selectedNames
  ? workloads.filter((workload) => selectedNames.has(workload.name))
  : workloads

if (selected.length === 0) {
  throw new Error(`No workloads selected. Available: ${workloads.map((workload) => workload.name).join(', ')}`)
}

const missing = [...(selectedNames ?? [])].filter((name) => !workloads.some((workload) => workload.name === name))
if (missing.length > 0) {
  throw new Error(`Unknown workloads: ${missing.join(', ')}`)
}

const runId = compactTimestamp(new Date())
const runDir = resolve(repoRoot, args.out ?? join('experiments/v8-diagnostics/runs', runId))
if (args.clean && existsSync(runDir)) rmSync(runDir, { recursive: true, force: true })
mkdirSync(join(runDir, 'logs'), { recursive: true })
mkdirSync(join(runDir, 'profiles'), { recursive: true })

const config = {
  iterations: args.iterations,
  warmup: args.warmup,
  modes: args.modes,
}

const results = {
  runId,
  meta: {
    nodeVersion: nodeVersion(),
    processVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    gitCommit: gitCommit(),
    distPath: relative(repoRoot, distPath),
  },
  config,
  workloads: [],
  summary: {
    optimizedCount: 0,
    optimizedFunctions: {},
    deoptCount: 0,
    deoptReasons: {},
    gcEvents: 0,
    gcPauseMs: 0,
    gcKinds: {},
    cpuSamplesByFunction: {},
  },
}

for (const workload of selected) {
  console.log(`Running ${workload.name} (${args.modes.join(', ')})`)
  const entry = {
    workload: workload.name,
    group: workload.group,
    description: workload.description,
    modes: {},
  }

  for (const mode of args.modes) {
    const modeResult = runNode({ mode, workload, runDir, config })
    entry.modes[mode] = {
      logPath: relative(runDir, modeResult.logPath),
      profilePath: mode === 'cpu' && existsSync(modeResult.profilePath)
        ? relative(runDir, modeResult.profilePath)
        : null,
      timing: modeResult.workerResult?.timing ?? null,
      trace: modeResult.trace,
      gc: modeResult.gc,
      cpuSamples: modeResult.cpuSamples,
    }

    if (!entry.timing && modeResult.workerResult?.timing) {
      entry.timing = modeResult.workerResult.timing
    }

    results.summary.optimizedCount += modeResult.trace.optimizedCount
    mergeCounts(results.summary.optimizedFunctions, modeResult.trace.optimizedFunctions)
    results.summary.deoptCount += modeResult.trace.deoptCount
    mergeCounts(results.summary.deoptReasons, modeResult.trace.deoptReasons)
    results.summary.gcEvents += modeResult.gc.events
    results.summary.gcPauseMs += modeResult.gc.pauseMs
    mergeCounts(results.summary.gcKinds, modeResult.gc.kinds)
    mergeCounts(results.summary.cpuSamplesByFunction, modeResult.cpuSamples)
  }

  if (!entry.timing) {
    const timingMode = runNode({ mode: 'timing', workload, runDir, config })
    entry.timing = timingMode.workerResult?.timing ?? null
  }

  results.workloads.push(entry)
}

writeFileSync(join(runDir, 'results.json'), JSON.stringify(results, null, 2))
renderReports(runDir)

console.log()
console.log(`Wrote ${relative(repoRoot, runDir)}`)
console.log(`Summary: ${relative(repoRoot, join(runDir, 'summary.md'))}`)
console.log(`Charts: ${relative(repoRoot, join(runDir, 'charts.html'))}`)
