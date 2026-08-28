// Throwaway architecture probe: can a synchronous createRequire-based
// importModule replace the async dynamic import() in the Node host?
//
// For each module kind we compare:
//   - sync  require(path)   -> works? what shape? what error if not?
//   - async import(path)    -> shape, as the baseline cljam uses today
//
// Run: node experiments/module-probe/probe.mjs
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
// A require anchored at the cljam package, to resolve real npm deps the way the
// Node host would for a consuming project.
const pkgReq = createRequire(resolve(__dirname, '../../packages/cljam/package.json'))

function describe(mod) {
  if (mod === null || mod === undefined) return String(mod)
  const keys = Object.keys(mod)
  const hasDefault = 'default' in mod
  const defaultType = hasDefault ? typeof mod.default : '—'
  const shown = keys.slice(0, 12).join(', ')
  const more = keys.length > 12 ? `, …(+${keys.length - 12})` : ''
  return `${keys.length} keys [${shown}${more}] hasDefault=${hasDefault} defaultType=${defaultType}`
}

function trySyncRequire(spec) {
  try {
    const m = req(spec)
    return { ok: true, shape: describe(m), raw: m }
  } catch (e) {
    return { ok: false, code: e.code ?? '(no code)', msg: e.message.split('\n')[0] }
  }
}

async function tryAsyncImport(spec) {
  try {
    const m = await import(spec)
    return { ok: true, shape: describe(m), raw: m }
  } catch (e) {
    return { ok: false, code: e.code ?? '(no code)', msg: e.message.split('\n')[0] }
  }
}

// Real packages resolved from the cljam context (resolve via pkgReq, then load).
function trySyncRequireReal(spec) {
  try {
    const resolved = pkgReq.resolve(spec)
    const m = req(resolved)
    return { ok: true, shape: describe(m), resolved }
  } catch (e) {
    return { ok: false, code: e.code ?? '(no code)', msg: e.message.split('\n')[0] }
  }
}
async function tryAsyncImportReal(spec) {
  try {
    const resolved = pkgReq.resolve(spec)
    const m = await import(pathToFileURL(resolved).href)
    return { ok: true, shape: describe(m), resolved }
  } catch (e) {
    return { ok: false, code: e.code ?? '(no code)', msg: e.message.split('\n')[0] }
  }
}

const fixtures = [
  ['CJS   (.cjs)', resolve(__dirname, 'fixtures/cjs-mod.cjs')],
  ['ESM   (.mjs, named)', resolve(__dirname, 'fixtures/esm-mod.mjs')],
  ['ESM   (.mjs, default+named)', resolve(__dirname, 'fixtures/esm-default.mjs')],
  ['TLA   (.mjs, top-level await)', resolve(__dirname, 'fixtures/tla-mod.mjs')],
]

const realPkgs = ['vite', 'typescript', 'picocolors', 'chalk', 'nanoid']

console.log(`\nNode ${process.version}\n${'='.repeat(72)}`)
console.log('LOCAL FIXTURES (deterministic per module kind)')
console.log('='.repeat(72))
for (const [label, path] of fixtures) {
  const s = trySyncRequire(path)
  const a = await tryAsyncImport(path)
  console.log(`\n• ${label}`)
  console.log(
    `    require(): ${s.ok ? 'OK  ' + s.shape : 'FAIL ' + s.code + ' — ' + s.msg}`
  )
  console.log(
    `    import() : ${a.ok ? 'OK  ' + a.shape : 'FAIL ' + a.code + ' — ' + a.msg}`
  )
  // Functional check: can we actually call into it?
  if (s.ok) {
    const g = s.raw.greet ?? s.raw.default?.greet
    if (typeof g === 'function') console.log(`    call via require(): ${g('world')}`)
  }
}

console.log(`\n${'='.repeat(72)}`)
console.log('REAL PACKAGES (resolved from cljam context)')
console.log('='.repeat(72))
for (const spec of realPkgs) {
  const s = trySyncRequireReal(spec)
  const a = await tryAsyncImportReal(spec)
  console.log(`\n• ${spec}`)
  console.log(
    `    require(): ${s.ok ? 'OK  ' + s.shape : 'FAIL ' + s.code + ' — ' + s.msg}`
  )
  console.log(
    `    import() : ${a.ok ? 'OK  ' + a.shape : 'FAIL ' + a.code + ' — ' + a.msg}`
  )
}
console.log()
