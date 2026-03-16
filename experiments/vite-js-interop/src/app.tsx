import { StrictMode, type CSSProperties } from 'react'
import { createRoot } from 'react-dom/client'

// Direct CLJ module imports — the Vite plugin compiles each .clj file to a JS
// module that exports each public var as a typed JS function. Top-level await in
// each generated module ensures the namespace is fully loaded before any import
// of it resolves, so all functions are synchronously callable at render time.
import {
  multiply,
  sum_of_squares,
  greet,
  log_text,
  math_abs,
  math_sqrt,
} from './clojure/demo/utils.clj'
import { format_iso, compare_dates } from './clojure/demo/format.clj'
import { process_numbers, pipeline_report } from './clojure/demo/pipeline.clj'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DemoResult {
  label: string
  category: string
  value?: string
  error?: string
}

// ── Demo runner ───────────────────────────────────────────────────────────────

function runSafely(
  label: string,
  category: string,
  fn: () => unknown
): DemoResult {
  try {
    const raw = fn()
    const value =
      raw === null || raw === undefined
        ? 'nil'
        : typeof raw === 'object'
          ? JSON.stringify(raw)
          : String(raw)
    return { label, category, value }
  } catch (e) {
    return { label, category, error: String(e) }
  }
}

// All CLJ functions are synchronous here — top-level await in each generated
// .clj module guarantees the namespace is ready before this module body runs.
const RESULTS: DemoResult[] = [
  runSafely('(multiply 6 7)', 'Pure Clojure (no JS deps)', () => multiply(6, 7)),
  runSafely(
    '(sum-of-squares [1 2 3 4 5])',
    'Pure Clojure (no JS deps)',
    () => sum_of_squares([1, 2, 3, 4, 5])
  ),
  runSafely('(greet "World")', 'Pure Clojure (no JS deps)', () => greet('World')),
  runSafely(
    '(math-abs -99)',
    'HostBindings (js/Math via conjure.ts)',
    () => math_abs(-99)
  ),
  runSafely(
    '(math-sqrt 144)',
    'HostBindings (js/Math via conjure.ts)',
    () => math_sqrt(144)
  ),
  runSafely(
    '(format-iso "2024-01-15" "yyyy-MM-dd")',
    'date-fns via static import table',
    () => format_iso('2024-01-15', 'yyyy-MM-dd')
  ),
  runSafely(
    '(compare-dates 1000 2000)',
    'date-fns via static import table',
    () => compare_dates(1000, 2000)
  ),
  runSafely(
    '(process-numbers [1 2 3 4 5])',
    'CLJ→CLJ chain (pipeline → utils + format)',
    () => process_numbers([1, 2, 3, 4, 5])
  ),
  runSafely(
    '(pipeline-report [3 4] "2025-06-01")',
    'CLJ→CLJ chain (pipeline → utils + format)',
    () => pipeline_report([3, 4], '2025-06-01')
  ),
  runSafely(
    '(log-text "hello") via host.ts',
    'Local TS import via string require',
    () => {
      log_text('hello from CLJ')
      return 'logged! (check console)'
    }
  ),
]

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  header: { marginBottom: '2rem' } as CSSProperties,
  title: {
    fontSize: '1.1rem',
    color: '#569cd6',
    fontWeight: 700,
    letterSpacing: '0.04em',
    marginBottom: '0.25rem',
  } as CSSProperties,
  subtitle: { fontSize: '0.78rem', color: '#858585' } as CSSProperties,
  section: { marginBottom: '1.5rem' } as CSSProperties,
  sectionTitle: {
    fontSize: '0.72rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: '#858585',
    marginBottom: '0.5rem',
    paddingBottom: '0.25rem',
    borderBottom: '1px solid #3e3e42',
  } as CSSProperties,
  row: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '1rem',
    padding: '0.45rem 0.75rem',
    background: '#252526',
    borderRadius: '4px',
    marginBottom: '0.3rem',
    fontSize: '0.83rem',
  } as CSSProperties,
  label: {
    color: '#dcdcaa',
    minWidth: '280px',
    flexShrink: 0,
    fontFamily: 'monospace',
  } as CSSProperties,
  value: { color: '#4ec9b0', flex: 1, wordBreak: 'break-all' as const } as CSSProperties,
  error: { color: '#f44747', flex: 1 } as CSSProperties,
  dot: (ok: boolean): CSSProperties => ({
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: '2px',
    background: ok ? '#4ec9b0' : '#f44747',
  }),
  footer: { marginTop: '2rem', fontSize: '0.72rem', color: '#858585' } as CSSProperties,
}

// ── Component ─────────────────────────────────────────────────────────────────

function App() {
  // Group results by category
  const grouped = RESULTS.reduce<Record<string, DemoResult[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = []
    acc[r.category].push(r)
    return acc
  }, {})

  const totalPassed = RESULTS.filter((r) => !r.error).length
  const totalFailed = RESULTS.filter((r) => r.error).length

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={s.header}>
        <div style={s.title}>conjure-js · vite-js-interop experiment</div>
        <div style={s.subtitle}>
          Direct CLJ imports · static import table · Mode 2 entrypoint · CLJ→CLJ
          chains · local TS string require
        </div>
      </div>

      {Object.entries(grouped).map(([category, rows]) => (
        <div key={category} style={s.section}>
          <div style={s.sectionTitle}>{category}</div>
          {rows.map((r) => (
            <div key={r.label} style={s.row}>
              <div style={s.dot(!r.error)} />
              <div style={s.label}>{r.label}</div>
              {r.value !== undefined && <div style={s.value}>{r.value}</div>}
              {r.error !== undefined && <div style={s.error}>{r.error}</div>}
            </div>
          ))}
        </div>
      ))}

      <div style={totalFailed === 0 ? s.footer : { ...s.footer, color: '#f44747' }}>
        {totalFailed === 0
          ? `✓ all ${totalPassed} demos passed`
          : `✗ ${totalFailed} failed · ${totalPassed} passed`}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
