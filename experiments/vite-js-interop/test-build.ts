/**
 * Build + runtime validation for the vite-js-interop experiment.
 *
 * Validates:
 * 1. vite build completes without errors
 * 2. The built bundle does NOT contain dynamic import("date-fns") calls
 *    (proves the static import table approach is working)
 * 3. Running the built artifact produces correct outputs
 *    (proves the full JS/CLJ chain works end-to-end after build)
 */
import { execFileSync, execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distMain = resolve(__dirname, 'dist/main.js')

// ─── Step 1: Run vite build ──────────────────────────────────────────────────
console.log('⟳ Running vite build...')
try {
  execSync('bun run build', { cwd: __dirname, stdio: 'inherit' })
} catch {
  console.error('✗ vite build failed')
  process.exit(1)
}

if (!existsSync(distMain)) {
  console.error(`✗ Expected dist/main.js not found at ${distMain}`)
  process.exit(1)
}
console.log('✓ vite build succeeded')

// ─── Step 2: Inspect bundle — no dynamic import of date-fns ─────────────────
console.log('\n⟳ Inspecting bundle for dynamic imports...')
const bundle = readFileSync(distMain, 'utf-8')

// Dynamic import of date-fns would look like: import("date-fns") or import('date-fns')
const dynamicImportPattern = /import\s*\(\s*["']date-fns["']\s*\)/
if (dynamicImportPattern.test(bundle)) {
  console.error('✗ Bundle contains dynamic import("date-fns") — static import table not working!')
  process.exit(1)
}
console.log('✓ No dynamic import("date-fns") found — static import table is correct')

// ─── Step 3: Run the built artifact and validate output ──────────────────────
console.log('\n⟳ Running built artifact with Bun...')
let output: string
try {
  output = execFileSync('bun', [distMain], {
    encoding: 'utf-8',
    env: { ...process.env, NODE_ENV: 'production' },
  })
} catch (err) {
  console.error('✗ Running dist/main.js failed:')
  console.error(err)
  process.exit(1)
}

console.log('\n── Output ──────────────────────────────────────────────────────')
console.log(output)
console.log('────────────────────────────────────────────────────────────────\n')

// Validate individual outputs
function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`✗ FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`✓ ${message}`)
}

assert(output.includes('multiply 6×7 = 42'), 'Demo 1: pure Clojure multiply works')
assert(output.includes('Math.abs(-99) = 99'), 'Demo 2: Mode 2 hostBindings — (. js/Math abs -99) = 99')
assert(output.includes('format-iso = "2024-01-15"'), 'Demo 3: date-fns string require resolves via import map')
assert(output.includes('compareAsc(1000, 2000) = -1'), 'Demo 4: compareAsc returns correct result')
assert(output.includes(':sum-of-squares 55'), 'Demo 5: pipeline sum-of-squares is correct')
assert(output.includes(':multiplied [10 20 30 40 50]'), 'Demo 5: pipeline multiplied values are correct')
assert(output.includes('date=2025-06-01'), 'Demo 6: pipeline-report date format is correct')
assert(output.includes('sum-sq=25'), 'Demo 6: pipeline-report sum-of-squares of [3 4] = 9+16 = 25')
assert(output.includes('✓ All demos complete'), 'All demos ran to completion')

console.log('\n✓✓✓ All assertions passed — vite-js-interop experiment is working end-to-end!')
