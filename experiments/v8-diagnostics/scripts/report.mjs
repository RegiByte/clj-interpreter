import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function fmtMs(ms) {
  if (!Number.isFinite(ms)) return 'n/a'
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  return `${ms.toFixed(2)}ms`
}

function table(headers, rows) {
  const align = headers.map((header) => (header.align ?? 'left'))
  const labels = headers.map((header) => header.label)
  const out = []
  out.push(`| ${labels.join(' | ')} |`)
  out.push(`| ${align.map((a) => (a === 'right' ? '---:' : '---')).join(' | ')} |`)
  for (const row of rows) {
    out.push(`| ${row.join(' | ')} |`)
  }
  return out.join('\n')
}

function topEntries(record, limit = 10) {
  return Object.entries(record ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
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

export function renderReports(runDir) {
  const resultsPath = join(runDir, 'results.json')
  const results = readJson(resultsPath)

  const timingRows = results.workloads.map((entry) => [
    entry.workload,
    entry.group,
    fmtMs(entry.timing?.avgMs),
    fmtMs(entry.timing?.medianMs),
    fmtMs(entry.timing?.p95Ms),
    fmtMs(entry.timing?.maxMs),
  ])

  const deoptRows = topEntries(results.summary.deoptReasons, 12).map(([reason, count]) => [reason, String(count)])
  const optRows = topEntries(results.summary.optimizedFunctions, 12).map(([fn, count]) => [fn, String(count)])
  const cpuRows = topEntries(results.summary.cpuSamplesByFunction, 12).map(([fn, count]) => [fn, String(count)])
  const perWorkloadRows = results.workloads.map((entry) => {
    const trace = entry.modes.trace?.trace ?? {}
    const traceGc = entry.modes.trace?.gc ?? { events: 0, pauseMs: 0 }
    const cpuSamples = entry.modes.cpu?.cpuSamples ?? {}
    const topDeopt = topEntries(trace.deoptReasons, 1)[0]
    const topCpu = topEntries(cpuSamples, 1)[0]
    return [
      entry.workload,
      String(trace.deoptCount ?? 0),
      topDeopt ? `${topDeopt[0]} (${topDeopt[1]})` : 'none',
      String(traceGc.events ?? 0),
      fmtMs(traceGc.pauseMs ?? 0),
      topCpu ? `${topCpu[0]} (${topCpu[1]})` : 'none',
    ]
  })

  const md = [
    `# cljam V8 diagnostics`,
    ``,
    `Run: \`${results.runId}\``,
    ``,
    `- Node: \`${results.meta.nodeVersion}\``,
    `- Platform: \`${results.meta.platform} ${results.meta.arch}\``,
    `- Git commit: \`${results.meta.gitCommit ?? 'unknown'}\``,
    `- Iterations: \`${results.config.iterations}\`, warmup: \`${results.config.warmup}\``,
    `- Modes: \`${results.config.modes.join(', ')}\``,
    ``,
    `## Timings`,
    ``,
    table(
      [
        { label: 'workload' },
        { label: 'group' },
        { label: 'avg', align: 'right' },
        { label: 'median', align: 'right' },
        { label: 'p95', align: 'right' },
        { label: 'max', align: 'right' },
      ],
      timingRows
    ),
    ``,
    `## V8 Optimization`,
    ``,
    `Optimized function completions observed: \`${results.summary.optimizedCount}\``,
    ``,
    optRows.length > 0
      ? table([{ label: 'function' }, { label: 'count', align: 'right' }], optRows)
      : '_No optimization lines captured._',
    ``,
    `## V8 Deoptimization`,
    ``,
    `Deoptimizations observed: \`${results.summary.deoptCount}\``,
    ``,
    deoptRows.length > 0
      ? table([{ label: 'reason' }, { label: 'count', align: 'right' }], deoptRows)
      : '_No deoptimization lines captured._',
    ``,
    `## GC`,
    ``,
    `GC events observed: \`${results.summary.gcEvents}\``,
    ``,
    `Total reported GC pause: \`${fmtMs(results.summary.gcPauseMs)}\``,
    ``,
    `## CPU Profile`,
    ``,
    cpuRows.length > 0
      ? table([{ label: 'function' }, { label: 'samples', align: 'right' }], cpuRows)
      : '_No CPU profile samples parsed._',
    ``,
    `## Per Workload Diagnostics`,
    ``,
    table(
      [
        { label: 'workload' },
        { label: 'deopts', align: 'right' },
        { label: 'top deopt reason' },
        { label: 'gc events', align: 'right' },
        { label: 'gc pause', align: 'right' },
        { label: 'top CPU sample' },
      ],
      perWorkloadRows
    ),
    ``,
    `## Artifacts`,
    ``,
    `Raw logs and profiles are stored beside this report under \`${runDir}\`.`,
    ``,
  ].join('\n')

  writeFileSync(join(runDir, 'summary.md'), md)

  const timingBars = results.workloads.map((entry) => [entry.workload, Number(entry.timing?.medianMs ?? 0)])
  const maxTiming = Math.max(0, ...timingBars.map(([, value]) => value))
  const maxDeopt = Math.max(0, ...topEntries(results.summary.deoptReasons, 12).map(([, value]) => value))
  const maxCpu = Math.max(0, ...topEntries(results.summary.cpuSamplesByFunction, 12).map(([, value]) => value))
  const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>cljam V8 diagnostics ${escapeHtml(results.runId)}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 32px; color: #1f2937; background: #f8fafc; }
  main { max-width: 1120px; margin: 0 auto; }
  h1, h2 { color: #111827; }
  section { margin: 24px 0; padding: 20px; background: white; border: 1px solid #d8dee8; border-radius: 8px; }
  .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
  .pill { background: #eef2f7; padding: 8px 10px; border-radius: 6px; font-size: 13px; }
  .bar-row { display: grid; grid-template-columns: minmax(180px, 280px) 1fr 72px; align-items: center; gap: 12px; margin: 8px 0; font-size: 13px; }
  .bar-row div { height: 16px; background: #edf2f7; border-radius: 4px; overflow: hidden; }
  .bar-row i { display: block; height: 100%; background: #2563eb; }
  .deopt i { background: #dc2626; }
  .cpu i { background: #059669; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { text-align: left; border-bottom: 1px solid #e5e7eb; padding: 8px; }
</style>
<main>
  <h1>cljam V8 diagnostics</h1>
  <section class="meta">
    <div class="pill">Run: <b>${escapeHtml(results.runId)}</b></div>
    <div class="pill">Node: <b>${escapeHtml(results.meta.nodeVersion)}</b></div>
    <div class="pill">Git: <b>${escapeHtml(results.meta.gitCommit ?? 'unknown')}</b></div>
    <div class="pill">Modes: <b>${escapeHtml(results.config.modes.join(', '))}</b></div>
  </section>
  <section>
    <h2>Median Timing</h2>
    ${barRows(timingBars, maxTiming, fmtMs)}
  </section>
  <section class="deopt">
    <h2>Deopt Reasons</h2>
    ${barRows(topEntries(results.summary.deoptReasons, 12), maxDeopt) || '<p>No deoptimizations captured.</p>'}
  </section>
  <section class="cpu">
    <h2>CPU Samples</h2>
    ${barRows(topEntries(results.summary.cpuSamplesByFunction, 12), maxCpu) || '<p>No CPU profile samples parsed.</p>'}
  </section>
  <section>
    <h2>Timing Table</h2>
    <table><thead><tr><th>Workload</th><th>Group</th><th>Avg</th><th>Median</th><th>P95</th></tr></thead><tbody>
      ${results.workloads.map((entry) => `<tr><td>${escapeHtml(entry.workload)}</td><td>${escapeHtml(entry.group)}</td><td>${fmtMs(entry.timing.avgMs)}</td><td>${fmtMs(entry.timing.medianMs)}</td><td>${fmtMs(entry.timing.p95Ms)}</td></tr>`).join('\n')}
    </tbody></table>
  </section>
</main>
</html>`

  writeFileSync(join(runDir, 'charts.html'), html)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const runDir = process.argv[2]
  if (!runDir) throw new Error('Usage: node scripts/report.mjs <run-dir>')
  renderReports(runDir)
}
