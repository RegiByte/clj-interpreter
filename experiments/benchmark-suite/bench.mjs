import { spawn, execSync } from 'node:child_process'
import { mkdirSync, writeFileSync, statSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import { WORKLOADS } from './workloads/workloads.mjs'
import { buildReport } from './lib/report.mjs'
import { summarize } from './lib/stats.mjs'

const SUITE_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(SUITE_DIR, '..', '..')

const ENGINES = {
  'cljam-interp': { runner: 'runners/run-cljam.mjs', extra: { mode: 'off' } },
  'cljam-vm': { runner: 'runners/run-cljam.mjs', extra: { mode: 'function-body' } },
  sci: { runner: 'runners/run-sci.mjs', extra: {} },
  js: { runner: 'runners/run-js.mjs', extra: {} },
}

function parseArgs(argv) {
  const args = {
    engines: Object.keys(ENGINES),
    workloads: WORKLOADS.map((w) => w.name),
    samples: 10,
    warmupMinCalls: 3,
    warmupMinMs: 300,
    targetBatchMs: 25,
    timeoutMs: 240000,
    out: null,
  }
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--quick') {
      args.samples = 5
      args.warmupMinMs = 100
      args.targetBatchMs = 15
    } else if (arg === '--engines') {
      args.engines = argv[++i].split(',')
    } else if (arg === '--workloads') {
      args.workloads = argv[++i].split(',')
    } else if (arg === '--samples') {
      args.samples = Number(argv[++i])
    } else if (arg === '--out') {
      args.out = argv[++i]
    } else {
      throw new Error(`unknown argument: ${arg} (have --quick --engines --workloads --samples --out)`)
    }
  }
  for (const engine of args.engines) {
    if (!ENGINES[engine]) throw new Error(`unknown engine '${engine}' (have: ${Object.keys(ENGINES).join(', ')})`)
  }
  return args
}

function newestMtime(dir) {
  let newest = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMtime(full))
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.clj')) {
      newest = Math.max(newest, statSync(full).mtimeMs)
    }
  }
  return newest
}

function checkDistFreshness() {
  const distPath = join(REPO_ROOT, 'packages/cljam/dist/index.mjs')
  const distMtime = statSync(distPath).mtimeMs
  const srcMtime = newestMtime(join(REPO_ROOT, 'packages/cljam/src'))
  if (srcMtime > distMtime) {
    console.warn('⚠️  packages/cljam/dist/index.mjs is OLDER than the newest source file.')
    console.warn("   Rebuild first: cd packages/cljam && bun run build-npm-library")
    console.warn('   Continuing anyway — results will reflect the stale dist.\n')
  }
}

function captureMeta(args) {
  const git = (cmd) => execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8' }).trim()
  const nbbPkg = JSON.parse(
    readFileSync(join(SUITE_DIR, 'node_modules/nbb/package.json'), 'utf8')
  )
  return {
    date: new Date().toISOString(),
    node: process.version,
    platform: `${os.platform()} ${os.release()}`,
    arch: os.arch(),
    cpu: os.cpus()[0].model,
    gitSha: git('git rev-parse --short HEAD'),
    gitDirty: git('git status --porcelain').length > 0,
    nbbVersion: nbbPkg.version,
    measure: {
      samples: args.samples,
      warmupMinCalls: args.warmupMinCalls,
      warmupMinMs: args.warmupMinMs,
      targetBatchMs: args.targetBatchMs,
    },
  }
}

function runPair(engine, workloadName, args) {
  const config = ENGINES[engine]
  const payload = JSON.stringify({
    workload: workloadName,
    measure: {
      samples: args.samples,
      warmupMinCalls: args.warmupMinCalls,
      warmupMinMs: args.warmupMinMs,
      targetBatchMs: args.targetBatchMs,
    },
    ...config.extra,
  })
  return new Promise((resolve) => {
    const child = spawn('node', ['--expose-gc', config.runner, payload], {
      cwd: SUITE_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      resolve({ ok: false, error: `timeout after ${args.timeoutMs}ms` })
    }, args.timeoutMs)
    child.stdout.on('data', (d) => (stdout += d))
    child.stderr.on('data', (d) => (stderr += d))
    child.on('close', () => {
      clearTimeout(timer)
      const jsonLine = stdout
        .trim()
        .split('\n')
        .reverse()
        .find((line) => line.startsWith('{'))
      if (!jsonLine) {
        resolve({ ok: false, error: `no JSON output. stderr: ${stderr.slice(0, 300)}` })
        return
      }
      try {
        resolve(JSON.parse(jsonLine))
      } catch {
        resolve({ ok: false, error: `unparseable output: ${jsonLine.slice(0, 200)}` })
      }
    })
  })
}

function pairLogLine(result) {
  if (!result.ok) return `ERROR: ${result.error}`
  if (!result.pass) return `GATE FAILED: got ${JSON.stringify(result.checksum)} expected ${JSON.stringify(result.expected)}`
  const stats = summarize(result.perCallMs)
  return `median ${stats.median >= 1 ? stats.median.toFixed(2) : stats.median.toFixed(4)}ms (batch=${result.batchSize}, ${result.perCallMs.length} samples)`
}

async function main() {
  const args = parseArgs(process.argv)
  checkDistFreshness()
  const meta = captureMeta(args)
  if (meta.gitDirty) {
    console.warn('ℹ️  working tree is dirty — recorded in results metadata\n')
  }

  const selectedWorkloads = WORKLOADS.filter((w) => args.workloads.includes(w.name))
  const totalPairs = args.engines.length * selectedWorkloads.length
  console.log(
    `Running ${selectedWorkloads.length} workloads × ${args.engines.length} engines = ${totalPairs} pairs (sequential, isolated processes)\n`
  )

  const pairs = []
  let done = 0
  for (const workload of selectedWorkloads) {
    for (const engine of args.engines) {
      done++
      process.stdout.write(`[${String(done).padStart(2)}/${totalPairs}] ${workload.name} × ${engine} ... `)
      const started = performance.now()
      const result = await runPair(engine, workload.name, args)
      const wallMs = performance.now() - started
      pairs.push({ workload: workload.name, engine, wallMs, ...result })
      console.log(pairLogLine(result))
    }
  }

  const results = {
    meta,
    engines: args.engines,
    workloads: selectedWorkloads.map((w) => ({
      name: w.name,
      kind: w.kind,
      subsystem: w.subsystem,
      expected: w.expected,
    })),
    pairs,
  }

  const stamp = meta.date.replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-')
  const outDir = args.out ?? join(SUITE_DIR, 'runs', stamp)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'results.json'), JSON.stringify(results, null, 2))
  const report = buildReport(results)
  writeFileSync(join(outDir, 'report.md'), report)

  console.log(`\nResults: ${join(outDir, 'results.json')}`)
  console.log(`Report:  ${join(outDir, 'report.md')}\n`)
  const headline = report.split('## Per-workload results')[0]
  console.log(headline)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
