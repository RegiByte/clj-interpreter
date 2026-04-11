#!/usr/bin/env node
/**
 * gen-library-sources.mjs — generate a TypeScript sources map from a directory of .clj files.
 *
 * Callable as a module:
 *   import { genLibrarySources } from '@regibyte/cljam/scripts/gen-library-sources'
 *   await genLibrarySources('src/clojure', 'src/generated/sources.ts')
 *
 * Or invoked directly:
 *   node node_modules/@regibyte/cljam/scripts/gen-library-sources.mjs <sourceRoot> <outputFile>
 *   cljam gen-lib-source <sourceRoot> <outputFile>
 *
 * Each .clj file must begin with an (ns <namespace-name> ...) declaration.
 * The output is a TypeScript module exporting a `sources` Record<string, string>.
 *
 * The output file is checked in to source control — this script only rewrites
 * it when content changes, so git diffs stay clean.
 */

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function collectCljFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...collectCljFiles(full))
    } else if (entry.endsWith('.clj')) {
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

function writeIfChanged(path, content) {
  let current = null
  try {
    current = readFileSync(path, 'utf-8')
  } catch {
    // file doesn't exist yet
  }
  if (current === content) return false
  writeFileSync(path, content, 'utf-8')
  return true
}

/**
 * Generate a TypeScript sources map from a directory of .clj files.
 *
 * @param {string} sourceRootArg - Path to the directory containing .clj files (relative to cwd or absolute)
 * @param {string} outputFileArg - Path to the output .ts file (relative to cwd or absolute)
 */
export function genLibrarySources(sourceRootArg, outputFileArg) {
  const cwd = process.cwd()
  const sourceRoot = resolve(cwd, sourceRootArg)
  const outputFile = resolve(cwd, outputFileArg)

  const entries = []
  for (const filePath of collectCljFiles(sourceRoot)) {
    const source = readFileSync(filePath, 'utf-8')
    const nsName = extractNsName(source)
    if (!nsName) {
      console.warn(`Warning: no (ns ...) found in ${filePath}, skipping.`)
      continue
    }
    entries.push({ nsName, source })
  }

  entries.sort((a, b) => a.nsName.localeCompare(b.nsName))

  const mapEntries = entries.map(({ nsName, source }) => {
    const escaped = escapeForTemplateLiteral(source)
    return `  '${nsName}': \`${escaped}\`,`
  })

  const relativeSourceRoot = sourceRootArg.replace(/\\/g, '/')
  const output = [
    '// Auto-generated from ' + relativeSourceRoot + ' — do not edit directly.',
    '// Re-generate with: npm run gen:sources',
    '',
    'export const sources: Record<string, string> = {',
    ...mapEntries,
    '}',
    '',
  ].join('\n')

  mkdirSync(dirname(outputFile), { recursive: true })

  const changed = writeIfChanged(outputFile, output)
  if (changed) {
    console.log(`Generated ${outputFile} (${entries.length} namespace(s)).`)
  } else {
    console.log(`${outputFile} is up to date (${entries.length} namespace(s)).`)
  }
}

// Run directly when invoked as a script
const __filename = fileURLToPath(import.meta.url)
const isMain = process.argv[1] === __filename || process.argv[1]?.endsWith('gen-library-sources.mjs')

if (isMain) {
  const [, , sourceRootArg, outputFileArg] = process.argv
  if (!sourceRootArg || !outputFileArg) {
    console.error('Usage: gen-library-sources.mjs <sourceRoot> <outputFile>')
    process.exit(1)
  }
  genLibrarySources(sourceRootArg, outputFileArg)
}
