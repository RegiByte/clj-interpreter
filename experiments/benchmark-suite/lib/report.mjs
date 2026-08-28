import { summarize, geomean } from './stats.mjs'

function fmtMs(ms) {
  if (ms >= 100) return ms.toFixed(0)
  if (ms >= 1) return ms.toFixed(2)
  if (ms >= 0.001) return ms.toFixed(4)
  return ms.toExponential(2)
}

function fmtRatio(r) {
  if (!Number.isFinite(r)) return '—'
  return r >= 100 ? `${r.toFixed(0)}×` : `${r.toFixed(1)}×`
}

export function buildReport(results) {
  const { meta, pairs, engines, workloads } = results
  const lines = []

  const summaries = new Map()
  for (const pair of pairs) {
    if (pair.ok && pair.pass && pair.perCallMs) {
      summaries.set(`${pair.workload}|${pair.engine}`, summarize(pair.perCallMs))
    }
  }
  const medianOf = (workload, engine) => summaries.get(`${workload}|${engine}`)?.median

  lines.push('# Cross-Engine Benchmark Report')
  lines.push('')
  lines.push(`- **Date:** ${meta.date}`)
  lines.push(`- **Node:** ${meta.node} · **OS:** ${meta.platform} ${meta.arch} · **CPU:** ${meta.cpu}`)
  lines.push(`- **cljam git:** ${meta.gitSha}${meta.gitDirty ? ' (dirty working tree)' : ''} · **nbb:** ${meta.nbbVersion}`)
  lines.push(`- **Method:** ${meta.measure.samples} samples/pair, warmup ≥${meta.measure.warmupMinCalls} calls & ≥${meta.measure.warmupMinMs}ms, batch target ${meta.measure.targetBatchMs}ms, fresh process per engine×workload, GC between samples`)
  lines.push('')

  lines.push('## Headline — geometric mean of per-workload ratios')
  lines.push('')
  lines.push('| engine | vs js (slower by) | vs sci (slower by) | workloads |')
  lines.push('|---|---:|---:|---:|')
  for (const engine of engines) {
    const vsJs = []
    const vsSci = []
    let counted = 0
    for (const w of workloads) {
      const own = medianOf(w.name, engine)
      if (own === undefined) continue
      counted++
      const js = medianOf(w.name, 'js')
      const sci = medianOf(w.name, 'sci')
      if (js !== undefined) vsJs.push(own / js)
      if (sci !== undefined) vsSci.push(own / sci)
    }
    lines.push(
      `| ${engine} | ${fmtRatio(geomean(vsJs))} | ${engine === 'sci' ? '1.0×' : fmtRatio(geomean(vsSci))} | ${counted}/${workloads.length} |`
    )
  }
  lines.push('')
  lines.push('> Ratios > 1 mean the engine is that many times slower than the reference.')
  lines.push('')

  lines.push('## Per-workload results (per-call time)')
  for (const w of workloads) {
    lines.push('')
    lines.push(`### ${w.name} — ${w.subsystem} (${w.kind})`)
    lines.push('')
    lines.push('| engine | median ms | p25–p75 | min | max | vs js | vs sci | noise |')
    lines.push('|---|---:|---:|---:|---:|---:|---:|---|')
    const jsMedian = medianOf(w.name, 'js')
    const sciMedian = medianOf(w.name, 'sci')
    for (const engine of engines) {
      const pair = pairs.find((p) => p.workload === w.name && p.engine === engine)
      if (!pair) continue
      if (!pair.ok) {
        lines.push(`| ${engine} | ERROR | | | | | | ${pair.error?.slice(0, 80) ?? ''} |`)
        continue
      }
      if (!pair.pass) {
        lines.push(
          `| ${engine} | FAILED gate | | | | | | got \`${JSON.stringify(pair.checksum)}\`, expected \`${JSON.stringify(pair.expected)}\` |`
        )
        continue
      }
      const s = summaries.get(`${w.name}|${engine}`)
      const noisy = s.dispersion > 0.15 ? `⚠️ ${(s.dispersion * 100).toFixed(0)}%` : ''
      lines.push(
        `| ${engine} | ${fmtMs(s.median)} | ${fmtMs(s.p25)}–${fmtMs(s.p75)} | ${fmtMs(s.min)} | ${fmtMs(s.max)} | ${fmtRatio(s.median / jsMedian)} | ${fmtRatio(s.median / sciMedian)} | ${noisy} |`
      )
    }
  }
  lines.push('')

  lines.push('## Setup time (session create + workload defs, once per pair)')
  lines.push('')
  lines.push(`| engine | ${workloads.map((w) => w.name).join(' | ')} |`)
  lines.push(`|---|${workloads.map(() => '---:').join('|')}|`)
  for (const engine of engines) {
    const cells = workloads.map((w) => {
      const pair = pairs.find((p) => p.workload === w.name && p.engine === engine)
      return pair?.setupMs !== undefined ? fmtMs(pair.setupMs) : '—'
    })
    lines.push(`| ${engine} | ${cells.join(' | ')} |`)
  }
  lines.push('')

  lines.push('## Threats to validity')
  lines.push('')
  lines.push('- cljam/SCI samples include a small per-call eval/parse cost of the run form; the js engine calls a function directly. Work sizes amortize this.')
  lines.push('- nbb `loadString` is async; per-call promise overhead is noise at these sizes.')
  lines.push('- One process per pair; cross-process variance not sampled. One machine, relative numbers only.')
  lines.push('- The js reference is idiomatic mutable JS — a speed-of-light line, not a semantics-equivalent implementation.')
  lines.push('')

  return lines.join('\n')
}
