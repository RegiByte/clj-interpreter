import { resolve, dirname } from 'node:path'
import { isKeyword, isList, isSymbol, isVector } from '../core/assertions'
import { readForms } from '../core/reader'
import { tokenize } from '../core/tokenizer'
import type { CljValue } from '../core/types'

/**
 * Convert a filesystem path to a Clojure namespace name.
 * Strips the matching source root prefix, replaces `/` with `.`, drops `.clj`.
 * Tries each source root in order; throws if none match.
 */
export function pathToNs(filePath: string, sourceRoots: string[]): string {
  const normalized = filePath.replace(/\\/g, '/')
  for (const root of sourceRoots) {
    const normalizedRoot = root.replace(/\\/g, '/').replace(/\/$/, '') + '/'
    if (normalized.startsWith(normalizedRoot)) {
      return normalized
        .slice(normalizedRoot.length)
        .replace(/\.clj$/, '')
        .replace(/\//g, '.')
    }
  }
  throw new Error(
    `File ${filePath} is not under any configured source root: ${sourceRoots.join(', ')}`
  )
}

/**
 * Convert a Clojure namespace name to a filesystem path under the given source root.
 * Replaces `.` with `/`, appends `.clj`, prepends the source root.
 */
export function nsToPath(nsName: string, sourceRoot: string): string {
  const root = sourceRoot.replace(/\/$/, '')
  return `${root}/${nsName.replace(/\./g, '/')}.clj`
}

/**
 * Parse Clojure source and extract all namespace names from (:require ...) clauses.
 * Returns an array of namespace name strings.
 */
export function extractNsRequires(source: string): string[] {
  const forms = readForms(tokenize(source))
  const nsForm = forms.find(
    (f) => isList(f) && isSymbol(f.value[0]) && f.value[0].name === 'ns'
  )
  if (!nsForm || !isList(nsForm)) return []

  const requires: string[] = []
  for (let i = 2; i < nsForm.value.length; i++) {
    const clause = nsForm.value[i]
    if (
      isList(clause) &&
      isKeyword(clause.value[0]) &&
      clause.value[0].name === ':require'
    ) {
      for (let j = 1; j < clause.value.length; j++) {
        const spec = clause.value[j]
        if (isVector(spec) && spec.value.length > 0 && isSymbol(spec.value[0])) {
          requires.push(spec.value[0].name)
        }
      }
    }
  }
  return requires
}

/**
 * Parse Clojure source and extract all string module specifiers from (:require ...) clauses.
 * These are the JS/npm imports written as string literals: (:require ["react" :as React]).
 * Returns an array of resolved specifier strings (deduplicated).
 *
 * If filePath is provided, relative specifiers (starting with ./ or ../) are resolved
 * to absolute paths using the file's directory. Package specifiers are returned as-is.
 */
export function extractStringRequires(source: string, filePath?: string): string[] {
  const forms = readForms(tokenize(source))
  const nsForm = forms.find(
    (f) => isList(f) && isSymbol(f.value[0]) && f.value[0].name === 'ns'
  )
  if (!nsForm || !isList(nsForm)) return []

  const specifiers: string[] = []
  for (let i = 2; i < nsForm.value.length; i++) {
    const clause = nsForm.value[i]
    if (
      isList(clause) &&
      isKeyword(clause.value[0]) &&
      clause.value[0].name === ':require'
    ) {
      for (let j = 1; j < clause.value.length; j++) {
        const spec = clause.value[j]
        const first = isVector(spec) && spec.value.length > 0 ? spec.value[0] : null
        if (!first || first.kind !== 'string') continue
        let specifier = first.value
        if (filePath && (specifier.startsWith('./') || specifier.startsWith('../'))) {
          specifier = resolve(dirname(filePath), specifier)
        }
        specifiers.push(specifier)
      }
    }
  }
  return [...new Set(specifiers)]
}

/**
 * Extract the namespace name from the (ns ...) form in a Clojure source string.
 * Returns null if no ns form is found.
 */
export function extractNsName(source: string): string | null {
  const forms = readForms(tokenize(source))
  const nsForm = forms.find(
    (f): f is Extract<CljValue, { kind: 'list' }> =>
      isList(f) && isSymbol(f.value[0]) && f.value[0].name === 'ns'
  )
  if (!nsForm) return null
  const nameSymbol = nsForm.value[1]
  return isSymbol(nameSymbol) ? nameSymbol.name : null
}
