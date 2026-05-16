/**
 * Build + runtime validation for the vite-js-interop experiment.
 *
 * Validates:
 * 1. vite build completes without errors
 * 2. The built bundle does NOT contain dynamic import("date-fns") calls
 *    (proves the static import table approach is working)
 * 3. The built browser bundle contains the React demo surface and CLJ pipeline
 *    code that exercise direct .clj imports.
 */
import { execSync } from 'node:child_process'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, 'dist')

// ─── Step 1: Run vite build ──────────────────────────────────────────────────
console.log('⟳ Running vite build...')
try {
  execSync('bun run build', { cwd: __dirname, stdio: 'inherit' })
} catch {
  console.error('✗ vite build failed')
  process.exit(1)
}

if (!existsSync(distDir)) {
  console.error(`✗ Expected dist directory not found at ${distDir}`)
  process.exit(1)
}
console.log('✓ vite build succeeded')

const jsBundles = readdirSync(join(distDir, 'assets'))
  .filter((name) => name.endsWith('.js'))
  .map((name) => join(distDir, 'assets', name))

if (jsBundles.length === 0) {
  console.error(`✗ Expected a built JS bundle under ${join(distDir, 'assets')}`)
  process.exit(1)
}

const bundlePath = jsBundles[0]

// ─── Step 2: Inspect bundle — no dynamic import of date-fns ─────────────────
console.log('\n⟳ Inspecting bundle for dynamic imports...')
const bundle = readFileSync(bundlePath, 'utf-8')

// Dynamic import of date-fns would look like: import("date-fns") or import('date-fns')
const dynamicImportPattern = /import\s*\(\s*["']date-fns["']\s*\)/
if (dynamicImportPattern.test(bundle)) {
  console.error('✗ Bundle contains dynamic import("date-fns") — static import table not working!')
  process.exit(1)
}
console.log('✓ No dynamic import("date-fns") found — static import table is correct')

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`✗ FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`✓ ${message}`)
}

assert(bundle.includes('vite-js-interop experiment'), 'React demo surface is present in the browser bundle')
assert(bundle.includes('date-fns'), 'date-fns is bundled through the static import table')
assert(bundle.includes('pipeline-report'), 'CLJ pipeline demo code is present in the browser bundle')

console.log('\n✓✓✓ All assertions passed — vite-js-interop build smoke is working!')
