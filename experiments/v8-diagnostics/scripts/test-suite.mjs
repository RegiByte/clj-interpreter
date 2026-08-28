import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const experimentRoot = resolve(here, '..')
const repoRoot = resolve(experimentRoot, '../..')

const targets = {
  cljam: {
    cwd: resolve(repoRoot, 'packages/cljam'),
    vitest: resolve(repoRoot, 'packages/cljam/node_modules/vitest/vitest.mjs'),
    defaultArgs: ['run'],
  },
}

function readArgs(argv) {
  const args = {
    target: 'cljam',
    patterns: [],
    modes: ['cpu'],
    out: null,
    clean: false,
    maxWorkers: null,
    vitestArgs: [],
    help: false,
  }

  let passthrough = false
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (passthrough) {
      args.vitestArgs.push(arg)
    } else if (arg === '--') {
      passthrough = true
    } else if (arg === '--target') {
      args.target = argv[++i]
    } else if (arg === '--pattern') {
      args.patterns.push(argv[++i])
    } else if (arg === '--mode') {
      args.modes = argv[++i].split(',').map((mode) => mode.trim()).filter(Boolean)
    } else if (arg === '--out') {
      args.out = argv[++i]
    } else if (arg === '--clean') {
      args.clean = true
    } else if (arg === '--maxWorkers') {
      args.maxWorkers = argv[++i]
    } else if (arg === '--help') {
      args.help = true
    }
  }

  return args
}

function usage() {
  return `Usage: node experiments/v8-diagnostics/scripts/test-suite.mjs [options] [-- <vitest args>]

Profiles a real Vitest run under Node/V8 and writes parsed reports.

Options:
  --target <name>         Test target. Default: cljam.
  --pattern <path>        Vitest file/pattern. Repeat for multiple. Defaults to full target suite.
  --mode <list>           Comma-separated: timing,cpu,trace,gc. Default: cpu.
  --maxWorkers <n>        Pass through to Vitest, useful for stable profiling.
  --out <dir>             Output directory. Default: experiments/v8-diagnostics/runs/<timestamp>-test-suite.
  --clean                 Remove output directory before running.

Examples:
  node experiments/v8-diagnostics/scripts/test-suite.mjs --maxWorkers 1
  node experiments/v8-diagnostics/scripts/test-suite.mjs --pattern src/core/vm --mode cpu,trace --maxWorkers 1
  node experiments/v8-diagnostics/scripts/test-suite.mjs -- --reporter=verbose
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

function countRecord(record, key, by = 1) {
  record[key] = (record[key] ?? 0) + by
}

function topEntries(record, limit = 15) {
  return Object.entries(record ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
}

function stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, '')
}

function parseTrace(text) {
  const summary = {
    optimizedCount: 0,
    optimizedFunctions: {},
    deoptCount: 0,
    deoptReasons: {},
    deoptFunctions: {},
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

      const fn =
        line.match(/<JSFunction(?: ([^(][^> ]*))? \(sfi/)?.[1] ??
        line.match(/deoptimizing [^<]*<([^>]+)>/)?.[1] ??
        '(unknown)'
      countRecord(summary.deoptFunctions, fn)
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

function parseCpuProfiles(profilePaths) {
  const samples = {}
  for (const profilePath of profilePaths) {
    mergeCounts(samples, parseCpuProfile(profilePath))
  }
  return samples
}

function parseVitestOutput(rawText) {
  const text = stripAnsi(rawText)
  const fileDurations = new Map()
  const tests = []

  for (const line of text.split(/\r?\n/)) {
    const fileMatch = line.match(
      /^\s*(?:✓|❯)\s+(.+?)\s+\((\d+)\s+tests?(?:\s+\|\s+\d+\s+failed)?\)\s+([0-9.]+)(ms|s)\s*$/
    )
    if (fileMatch) {
      const path = fileMatch[1].trim()
      const durationMs =
        fileMatch[4] === 's'
          ? Number(fileMatch[3]) * 1000
          : Number(fileMatch[3])
      fileDurations.set(path, {
        path,
        tests: Number(fileMatch[2]),
        durationMs,
      })
      continue
    }

    const testMatch = line.match(
      /^\s*✓\s+(.+?)\s+>\s+(.+?)\s+([0-9.]+)(ms|s)\s*$/
    )
    if (testMatch) {
      const path = testMatch[1].trim()
      const durationMs =
        testMatch[4] === 's'
          ? Number(testMatch[3]) * 1000
          : Number(testMatch[3])
      tests.push({
        path,
        name: testMatch[2].trim(),
        durationMs,
      })
      const file = fileDurations.get(path) ?? {
        path,
        tests: 0,
        durationMs: 0,
      }
      file.tests++
      file.durationMs += durationMs
      fileDurations.set(path, file)
    }
  }

  const durationMatch = text.match(/\bDuration\s+([0-9.]+)(ms|s)/)
  const testFilesMatch = text.match(/Test Files\s+(.+)/)
  const testsMatch = text.match(/Tests\s+(.+)/)

  return {
    statusLines: {
      testFiles: testFilesMatch?.[1]?.trim() ?? null,
      tests: testsMatch?.[1]?.trim() ?? null,
    },
    durationMs: durationMatch
      ? durationMatch[2] === 's'
        ? Number(durationMatch[1]) * 1000
        : Number(durationMatch[1])
      : null,
    files: [...fileDurations.values()].sort((a, b) => b.durationMs - a.durationMs),
    tests: tests.sort((a, b) => b.durationMs - a.durationMs),
  }
}

function fmtMs(ms) {
  if (!Number.isFinite(ms)) return 'n/a'
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${ms.toFixed(2)}ms`
}

function table(headers, rows) {
  const align = headers.map((header) => header.align ?? 'left')
  const labels = headers.map((header) => header.label)
  const out = []
  out.push(`| ${labels.join(' | ')} |`)
  out.push(`| ${align.map((a) => (a === 'right' ? '---:' : '---')).join(' | ')} |`)
  for (const row of rows) out.push(`| ${row.join(' | ')} |`)
  return out.join('\n')
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function barRows(items, maxValue, formatValue = (value) => value) {
  return items
    .map(([label, value]) => {
      const width = maxValue > 0 ? Math.max(2, (value / maxValue) * 100) : 0
      return `<div class="bar-row"><span>${escapeHtml(label)}</span><div><i style="width:${width}%"></i></div><b>${escapeHtml(formatValue(value))}</b></div>`
    })
    .join('\n')
}

function renderReports(runDir, results) {
  const slowFileRows = results.vitest.files.slice(0, 20).map((file) => [
    file.path,
    String(file.tests),
    fmtMs(file.durationMs),
  ])
  const slowTestRows = results.vitest.tests.slice(0, 20).map((test) => [
    test.path,
    test.name,
    fmtMs(test.durationMs),
  ])
  const cpuRows = topEntries(results.cpuSamplesByFunction, 20).map(([fn, count]) => [fn, String(count)])
  const deoptRows = topEntries(results.trace.deoptReasons, 20).map(([reason, count]) => [reason, String(count)])
  const deoptFnRows = topEntries(results.trace.deoptFunctions, 20).map(([fn, count]) => [fn, String(count)])
  const optRows = topEntries(results.trace.optimizedFunctions, 15).map(([fn, count]) => [fn, String(count)])

  const md = [
    `# cljam Vitest V8 diagnostics`,
    ``,
    `Run: \`${results.runId}\``,
    ``,
    `- Target: \`${results.target}\``,
    `- Node: \`${results.meta.nodeVersion}\``,
    `- Platform: \`${results.meta.platform} ${results.meta.arch}\``,
    `- Git commit: \`${results.meta.gitCommit ?? 'unknown'}\``,
    `- Modes: \`${results.config.modes.join(', ')}\``,
    `- Vitest args: \`${results.config.vitestArgs.join(' ')}\``,
    `- Exit status: \`${results.exitStatus}\``,
    `- Wall time: \`${fmtMs(results.wallMs)}\``,
    `- Vitest duration: \`${fmtMs(results.vitest.durationMs)}\``,
    `- Test files: \`${results.vitest.statusLines.testFiles ?? 'unknown'}\``,
    `- Tests: \`${results.vitest.statusLines.tests ?? 'unknown'}\``,
    ``,
    `## Slowest Test Files`,
    ``,
    slowFileRows.length > 0
      ? table(
          [
            { label: 'file' },
            { label: 'tests', align: 'right' },
            { label: 'duration', align: 'right' },
          ],
          slowFileRows
        )
      : '_No per-file timing lines parsed. Try passing `-- --reporter=verbose` for richer output._',
    ``,
    `## Slowest Tests`,
    ``,
    slowTestRows.length > 0
      ? table(
          [
            { label: 'file' },
            { label: 'test' },
            { label: 'duration', align: 'right' },
          ],
          slowTestRows
        )
      : '_No per-test timing lines parsed. Pass `-- --reporter=verbose` to capture them._',
    ``,
    `## CPU Profile`,
    ``,
    cpuRows.length > 0
      ? table([{ label: 'function' }, { label: 'samples', align: 'right' }], cpuRows)
      : '_No CPU profile samples parsed._',
    ``,
    `## V8 Deoptimization`,
    ``,
    `Deoptimizations observed: \`${results.trace.deoptCount}\``,
    ``,
    deoptRows.length > 0
      ? table([{ label: 'reason' }, { label: 'count', align: 'right' }], deoptRows)
      : '_No deoptimization lines captured._',
    ``,
    `## Deoptimized Functions`,
    ``,
    deoptFnRows.length > 0
      ? table([{ label: 'function' }, { label: 'count', align: 'right' }], deoptFnRows)
      : '_No deoptimized function names captured._',
    ``,
    `## V8 Optimization`,
    ``,
    `Optimized function completions observed: \`${results.trace.optimizedCount}\``,
    ``,
    optRows.length > 0
      ? table([{ label: 'function' }, { label: 'count', align: 'right' }], optRows)
      : '_No optimization lines captured._',
    ``,
    `## GC`,
    ``,
    `GC events observed: \`${results.gc.events}\``,
    ``,
    `Total reported GC pause: \`${fmtMs(results.gc.pauseMs)}\``,
    ``,
    `## Artifacts`,
    ``,
    `Raw Vitest/V8 output: \`logs/vitest.log\``,
    ``,
    results.profilePaths.length > 0
      ? `CPU profiles: \`${results.profilePaths.length}\` files under \`profiles/\``
      : `CPU profiles: _not captured_`,
    ``,
  ].join('\n')

  writeFileSync(join(runDir, 'summary.md'), md)

  const timingBars = results.vitest.files.slice(0, 20).map((file) => [file.path, file.durationMs])
  const maxTiming = Math.max(0, ...timingBars.map(([, value]) => value))
  const cpuEntries = topEntries(results.cpuSamplesByFunction, 20)
  const deoptEntries = topEntries(results.trace.deoptReasons, 20)
  const maxCpu = Math.max(0, ...cpuEntries.map(([, value]) => value))
  const maxDeopt = Math.max(0, ...deoptEntries.map(([, value]) => value))

  const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>cljam Vitest V8 diagnostics ${escapeHtml(results.runId)}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 32px; color: #1f2937; background: #f8fafc; }
  main { max-width: 1180px; margin: 0 auto; }
  h1, h2 { color: #111827; }
  section { margin: 24px 0; padding: 20px; background: white; border: 1px solid #d8dee8; border-radius: 8px; }
  .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; }
  .pill { background: #eef2f7; padding: 8px 10px; border-radius: 6px; font-size: 13px; }
  .bar-row { display: grid; grid-template-columns: minmax(240px, 420px) 1fr 80px; align-items: center; gap: 12px; margin: 8px 0; font-size: 13px; }
  .bar-row div { height: 16px; background: #edf2f7; border-radius: 4px; overflow: hidden; }
  .bar-row i { display: block; height: 100%; background: #2563eb; }
  .cpu i { background: #059669; }
  .deopt i { background: #dc2626; }
</style>
<main>
  <h1>cljam Vitest V8 diagnostics</h1>
  <section class="meta">
    <div class="pill">Run: <b>${escapeHtml(results.runId)}</b></div>
    <div class="pill">Target: <b>${escapeHtml(results.target)}</b></div>
    <div class="pill">Node: <b>${escapeHtml(results.meta.nodeVersion)}</b></div>
    <div class="pill">Wall: <b>${escapeHtml(fmtMs(results.wallMs))}</b></div>
    <div class="pill">Status: <b>${escapeHtml(results.exitStatus)}</b></div>
  </section>
  <section>
    <h2>Slowest Test Files</h2>
    ${barRows(timingBars, maxTiming, fmtMs) || '<p>No per-file timing lines parsed.</p>'}
  </section>
  <section class="cpu">
    <h2>CPU Samples</h2>
    ${barRows(cpuEntries, maxCpu) || '<p>No CPU profile samples parsed.</p>'}
  </section>
  <section class="deopt">
    <h2>Deopt Reasons</h2>
    ${barRows(deoptEntries, maxDeopt) || '<p>No deoptimization lines captured.</p>'}
  </section>
</main>
</html>`

  writeFileSync(join(runDir, 'charts.html'), html)
}

function findCpuProfile(runDir) {
  const profilesDir = join(runDir, 'profiles')
  if (!existsSync(profilesDir)) return []
  return readdirSync(profilesDir)
    .filter((name) => name.endsWith('.cpuprofile'))
    .sort()
    .map((name) => join(profilesDir, name))
}

const args = readArgs(process.argv.slice(2))
if (args.help) {
  console.log(usage())
  process.exit(0)
}

const target = targets[args.target]
if (!target) {
  throw new Error(`Unknown target ${args.target}. Available: ${Object.keys(targets).join(', ')}`)
}
if (!existsSync(target.vitest)) {
  throw new Error(`Missing Vitest executable: ${target.vitest}`)
}

const runId = `${compactTimestamp(new Date())}-test-suite`
const runDir = resolve(repoRoot, args.out ?? join('experiments/v8-diagnostics/runs', runId))
if (args.clean && existsSync(runDir)) rmSync(runDir, { recursive: true, force: true })
mkdirSync(join(runDir, 'logs'), { recursive: true })
mkdirSync(join(runDir, 'profiles'), { recursive: true })

const nodeArgs = []
if (args.modes.includes('trace')) nodeArgs.push('--trace-opt', '--trace-deopt')
if (args.modes.includes('gc') || args.modes.includes('trace')) nodeArgs.push('--trace-gc-nvp')
if (args.modes.includes('cpu')) {
  nodeArgs.push(
    '--cpu-prof',
    `--cpu-prof-dir=${join(runDir, 'profiles')}`
  )
}

const vitestArgs = [...target.defaultArgs, ...args.patterns]
if (args.maxWorkers !== null) vitestArgs.push(`--maxWorkers=${args.maxWorkers}`)
vitestArgs.push(...args.vitestArgs)

console.log(`Profiling ${args.target} tests (${args.modes.join(', ')})`)
console.log(`Vitest args: ${vitestArgs.join(' ')}`)

const started = performance.now()
const result = spawnSync(process.execPath, [...nodeArgs, target.vitest, ...vitestArgs], {
  cwd: target.cwd,
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 128,
})
const wallMs = performance.now() - started

const combined = `${result.stdout ?? ''}${result.stderr ?? ''}`
const logPath = join(runDir, 'logs', 'vitest.log')
writeFileSync(logPath, combined)

const profilePaths = findCpuProfile(runDir)
const results = {
  runId,
  target: args.target,
  exitStatus: result.status,
  wallMs,
  meta: {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    gitCommit: gitCommit(),
  },
  config: {
    modes: args.modes,
    patterns: args.patterns,
    maxWorkers: args.maxWorkers,
    vitestArgs,
  },
  vitest: parseVitestOutput(combined),
  trace: parseTrace(combined),
  gc: parseGc(combined),
  cpuSamplesByFunction: parseCpuProfiles(profilePaths),
  profilePaths: profilePaths.map((profilePath) => relative(runDir, profilePath)),
  profilePath: profilePaths.length === 1 ? relative(runDir, profilePaths[0]) : null,
}

writeFileSync(join(runDir, 'results.json'), JSON.stringify(results, null, 2))
renderReports(runDir, results)

console.log()
console.log(`Wrote ${relative(repoRoot, runDir)}`)
console.log(`Summary: ${relative(repoRoot, join(runDir, 'summary.md'))}`)
console.log(`Charts: ${relative(repoRoot, join(runDir, 'charts.html'))}`)
if (result.status !== 0) {
  console.error(`Vitest exited with status ${result.status}. See ${relative(repoRoot, logPath)}`)
  process.exit(result.status ?? 1)
}
