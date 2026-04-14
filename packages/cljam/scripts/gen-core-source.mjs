#!/usr/bin/env node
/**
 * Generates modular built-in Clojure namespace sources:
 * - src/clojure/generated/*-source.ts (one file per namespace)
 * - src/clojure/generated/builtin-namespace-registry.ts
 *
 * Run manually:
 *   npm run gen:core-source
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cljDir = resolve(root, 'src/clojure')
const generatedDir = resolve(cljDir, 'generated')
const registryPath = resolve(generatedDir, 'builtin-namespace-registry.ts')

function collectCljFiles(dir) {
  const entries = readdirSync(dir)
  const files = []
  for (const entry of entries) {
    if (entry.startsWith('.') || entry === 'generated') continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      files.push(...collectCljFiles(full))
      continue
    }
    if (entry.endsWith('.clj')) {
      files.push(full)
    }
  }
  return files
}

function extractNsName(source) {
  const match = source.match(/\(ns\s+([^\s\)]+)/)
  return match ? match[1] : null
}

function escapeForTemplateLiteral(source) {
  return source
    .replaceAll('\\', '\\\\')
    .replaceAll('`', '\\`')
    .replaceAll('${', '\\${')
}

function toModuleSuffix(nsName) {
  return nsName.replaceAll('.', '-')
}

function toVarName(nsName) {
  return nsName.replaceAll(/[^a-zA-Z0-9]/g, '_') + 'Source'
}

function writeIfChanged(path, content) {
  let current = null
  try {
    current = readFileSync(path, 'utf-8')
  } catch {
    current = null
  }
  if (current === content) return false
  writeFileSync(path, content, 'utf-8')
  return true
}

mkdirSync(generatedDir, { recursive: true })

const namespaceEntries = []
let changedFiles = 0
for (const filePath of collectCljFiles(cljDir)) {
  const source = readFileSync(filePath, 'utf-8')
  const nsName = extractNsName(source)
  if (!nsName) continue
  if (!(nsName === 'clojure.core' || nsName.startsWith('clojure.') || nsName.startsWith('cljam.'))) continue

  const suffix = toModuleSuffix(nsName)
  const varName = toVarName(nsName)
  const modulePath = resolve(generatedDir, `${suffix}-source.ts`)
  const escaped = escapeForTemplateLiteral(source)

  const moduleOutput =
    [
      `// Auto-generated from ${filePath.replace(root + '/', '')} — do not edit directly.`,
      '// Re-generate with: npm run gen:core-source',
      `export const ${varName} = \`\\`,
      escaped + '`',
      '',
    ].join('\n')

  if (writeIfChanged(modulePath, moduleOutput)) changedFiles += 1
  namespaceEntries.push({ nsName, suffix, varName })
}

namespaceEntries.sort((a, b) => a.nsName.localeCompare(b.nsName))

const registryImports = namespaceEntries.map(
  ({ suffix, varName }) => `import { ${varName} } from './${suffix}-source'`
)
const registryMapEntries = namespaceEntries.map(
  ({ nsName, varName }) => `  '${nsName}': () => ${varName},`
)

const registryOutput =
  [
    '// Auto-generated — do not edit directly.',
    '// Re-generate with: npm run gen:core-source',
    ...registryImports,
    '',
    'export const builtInNamespaceSources: Record<string, () => string> = {',
    ...registryMapEntries,
    '}',
    '',
    'export function getBuiltInNamespaceSource(nsName: string): string | null {',
    '  const loader = builtInNamespaceSources[nsName]',
    '  return loader ? loader() : null',
    '}',
    '',
  ].join('\n')
if (writeIfChanged(registryPath, registryOutput)) changedFiles += 1

console.log(`Generated ${namespaceEntries.length} built-in namespace source module(s).`)
console.log(`Generated ${registryPath}`)
console.log(`Updated ${changedFiles} file(s).`)
