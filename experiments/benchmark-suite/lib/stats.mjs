export function quantile(sorted, q) {
  if (sorted.length === 0) return NaN
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  if (base + 1 < sorted.length) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base])
  }
  return sorted[base]
}

export function summarize(times) {
  const sorted = [...times].sort((a, b) => a - b)
  const median = quantile(sorted, 0.5)
  const p25 = quantile(sorted, 0.25)
  const p75 = quantile(sorted, 0.75)
  return {
    median,
    p25,
    p75,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    dispersion: median > 0 ? (p75 - p25) / median : 0,
  }
}

export function geomean(values) {
  if (values.length === 0) return NaN
  const logSum = values.reduce((acc, v) => acc + Math.log(v), 0)
  return Math.exp(logSum / values.length)
}
