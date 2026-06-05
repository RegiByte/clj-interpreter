import { is } from '../assertions'
import { EvaluationError } from '../errors'
import { extractAliasMapFromTokens, extractNsNameFromTokens } from '../ns-forms'
import { readForms } from '../reader'
import { tokenize } from '../tokenizer'
import type { CljValue } from '../types'

// ---------------------------------------------------------------------------
// ns-descriptor — the PURE namespace-declaration parser for the loader/linker
// (Phase 1.75, see .regibyte/NAMESPACE_LOADER_PLAN.md §6).
//
// A descriptor is load metadata extracted from one source's authored `ns` form.
// It is NOT macroexpansion and NOT evaluation: parsing performs no eval, no
// macroexpand, no host import, and no registry mutation. Given the same source
// it always produces the same descriptor.
//
// Slice boundary (S1, path A — confirmed with Sir RegiByte):
//   This parser CLASSIFIES requires (clj vs host vs reader-alias) and extracts
//   only what the dependency graph needs (clj nsName; host specifier+alias). It
//   does NOT re-implement require *shape* validation — `processRequireSpec`
//   (registry.ts) remains the single validation authority (G8). Each classified
//   require RETAINS its raw `CljValue` spec on purpose: that raw spec is the
//   migration seam for S2, where `processRequireSpec` will be refactored to
//   consume these descriptors instead of re-reading the ns form. The long-term
//   goal is ONE parse + ONE validator — do not grow a second parser here.
// ---------------------------------------------------------------------------

/**
 * A Clojure namespace require, e.g. `[some.ns :as a :refer [x]]`.
 * `nsName` is the required namespace; `spec` is the raw form (S2 link seam).
 */
export type CljRequireSpec = {
  nsName: string
  spec: CljValue
}

/**
 * A host (JS/npm) module require written as a string spec, e.g.
 * `["react" :as React]`. `specifier` is the raw module string (unresolved —
 * relative-path resolution is a loader/bundler concern, not parsing).
 */
export type HostRequireSpec = {
  specifier: string
  alias: string | null
  spec: CljValue
}

/**
 * An `:as-alias` reader alias, e.g. `[some.ns :as-alias a]`. Unlike `:as`, this
 * does NOT trigger loading the namespace — it only records a read-time alias so
 * `::a/foo` resolves. Kept separate from `cljRequires` for exactly that reason.
 */
export type ReaderAliasSpec = {
  alias: string
  nsName: string
}

export type NsDescriptor = {
  nsName: string
  doc?: string
  filePath?: string
  /** Every top-level form read from the source, in order. */
  forms: CljValue[]
  /** The single `ns` form, or null when the source declares none. */
  nsForm: CljValue | null
  /** All forms except the `ns` form — the body the executor will run. */
  bodyForms: CljValue[]
  cljRequires: CljRequireSpec[]
  hostRequires: HostRequireSpec[]
  readerAliases: ReaderAliasSpec[]
  /**
   * Read-time alias map (`alias -> namespace`) for `:as` and `:as-alias`. Host
   * module aliases are intentionally excluded — they are not Clojure namespaces.
   * Derived from the read `ns` form (the same single parse as cljRequires).
   */
  aliasMap: Map<string, string>
}

function isNsForm(form: CljValue): boolean {
  return (
    is.list(form) &&
    form.value.length > 0 &&
    is.symbol(form.value[0]) &&
    form.value[0].name === 'ns'
  )
}

/** Collect every spec across all `(:require ...)` clauses in the ns form. */
function requireSpecsOf(nsForm: CljValue): CljValue[] {
  if (!is.list(nsForm)) return []
  const specs: CljValue[] = []
  for (let i = 2; i < nsForm.value.length; i++) {
    const clause = nsForm.value[i]
    if (
      is.list(clause) &&
      clause.value.length > 0 &&
      is.keyword(clause.value[0]) &&
      clause.value[0].name === ':require'
    ) {
      for (let j = 1; j < clause.value.length; j++) specs.push(clause.value[j])
    }
  }
  return specs
}

/** First `:as`/`:as-alias` symbol alias following the given keyword name. */
function aliasAfter(spec: CljValue, keywordName: string): string | null {
  if (!is.vector(spec)) return null
  const els = spec.value
  for (let i = 1; i < els.length; i++) {
    const kw = els[i]
    if (is.keyword(kw) && kw.name === keywordName) {
      const next = els[i + 1]
      return next && is.symbol(next) ? next.name : null
    }
  }
  return null
}

function hasKeyword(spec: CljValue, keywordName: string): boolean {
  if (!is.vector(spec)) return false
  return spec.value.some((el) => is.keyword(el) && el.name === keywordName)
}

/**
 * Parse one source's namespace declaration into a pure `NsDescriptor`.
 *
 * Ordering note (the reader-alias bootstrap): the body cannot be read until the
 * reader knows the file's aliases (so `::a/foo` resolves), but those aliases
 * live inside the `ns` form. We break the cycle exactly as the legacy loader
 * does — a cheap token scan (`extractAliasMapFromTokens`) seeds `readForms`.
 * That token map is an INTERNAL bootstrap detail; the descriptor's exposed
 * `aliasMap`/`readerAliases` are derived from the read `ns` form so the public
 * surface has a single source of truth.
 */
export function parseDescriptor(
  source: string,
  nsHint?: string,
  filePath?: string
): NsDescriptor {
  const tokens = tokenize(source)
  const seedAliases = extractAliasMapFromTokens(tokens)
  // Read in the file's own namespace so current-ns autoresolved keywords
  // (`::foo`) resolve correctly in the body — mirrors runtime.loadFile.
  const readNs = extractNsNameFromTokens(tokens) ?? nsHint ?? 'user'
  const forms = readForms(tokens, readNs, seedAliases, source)

  const nsForms = forms.filter(isNsForm)
  if (nsForms.length > 1) {
    const err = new EvaluationError(
      `A file may declare at most one namespace, but found ${nsForms.length} ns forms. ` +
        `Split the file, or use (in-ns 'name) for REPL namespace switching.`,
      { count: nsForms.length, filePath }
    )
    err.code = 'namespace/multiple-ns-forms'
    throw err
  }

  const nsForm = nsForms[0] ?? null
  const nameSym = nsForm && is.list(nsForm) ? nsForm.value[1] : undefined
  const nsName =
    nameSym && is.symbol(nameSym) ? nameSym.name : (nsHint ?? 'user')

  const docForm = nsForm && is.list(nsForm) ? nsForm.value[2] : undefined
  const doc = docForm && is.string(docForm) ? docForm.value : undefined

  const bodyForms = forms.filter((f) => f !== nsForm)

  const cljRequires: CljRequireSpec[] = []
  const hostRequires: HostRequireSpec[] = []
  const readerAliases: ReaderAliasSpec[] = []
  const aliasMap = new Map<string, string>()

  if (nsForm) {
    for (const spec of requireSpecsOf(nsForm)) {
      if (!is.vector(spec) || spec.value.length === 0) continue
      const head = spec.value[0]

      if (is.string(head)) {
        const alias = aliasAfter(spec, ':as')
        hostRequires.push({ specifier: head.value, alias, spec })
        continue
      }

      if (!is.symbol(head)) continue
      const specNs = head.name

      // :as-alias does NOT load the namespace — record the reader alias only.
      if (hasKeyword(spec, ':as-alias')) {
        const alias = aliasAfter(spec, ':as-alias')
        if (alias) {
          readerAliases.push({ alias, nsName: specNs })
          aliasMap.set(alias, specNs)
        }
        continue
      }

      cljRequires.push({ nsName: specNs, spec })
      const asAlias = aliasAfter(spec, ':as')
      if (asAlias) aliasMap.set(asAlias, specNs)
    }
  }

  return {
    nsName,
    doc,
    filePath,
    forms,
    nsForm,
    bodyForms,
    cljRequires,
    hostRequires,
    readerAliases,
    aliasMap,
  }
}
