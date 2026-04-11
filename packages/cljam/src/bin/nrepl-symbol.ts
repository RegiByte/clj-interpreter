/**
 * Shared symbol resolution and metadata extraction for nREPL ops.
 * Used by both the standalone nREPL server (nrepl.ts) and the browser relay
 * (nrepl-relay.ts) so info/eldoc/lookup work identically in both transports.
 */
import { tryLookup, lookupVar, getNamespaceEnv } from '../core/env'
import { printString } from '../core/printer'
import type { CljMap, CljValue, CljVar, Session } from '../core'

export type ResolvedSymbol = {
  value: CljValue
  resolvedNs: string
  localName: string
  /** The raw CljVar for this symbol, if one exists. Its meta holds :doc/:arglists/:line/:column/:file. */
  varObj?: CljVar
}

export type ExtractedMeta = {
  doc: string
  arglistsStr: string
  eldocArgs: string[][] | null
  type: string
}

/**
 * Resolve a symbol string in the context of a session.
 * Handles qualified symbols (ns/name, alias/name) and unqualified symbols.
 * Returns null if the symbol cannot be resolved.
 */
export function resolveSymbol(
  sym: string,
  session: Session,
  contextNs?: string
): ResolvedSymbol | null {
  const ns = contextNs ?? session.currentNs
  const slashIdx = sym.indexOf('/')

  if (slashIdx > 0) {
    const qualifier = sym.slice(0, slashIdx)
    const localName = sym.slice(slashIdx + 1)

    // 1. Try as full namespace name
    const nsEnvFull = session.registry.get(qualifier)
    if (nsEnvFull) {
      const value = tryLookup(localName, nsEnvFull)
      if (value !== undefined) {
        const varObj = lookupVar(localName, nsEnvFull)
        return { value, resolvedNs: qualifier, localName, varObj }
      }
    }

    // 2. Try as alias (:as str → clojure.string)
    const currentNsData = session.getNs(ns)
    const aliasedNs = currentNsData?.aliases.get(qualifier)
    if (aliasedNs) {
      const varObj = aliasedNs.vars.get(localName)
      if (varObj !== undefined)
        return { value: varObj.value, resolvedNs: aliasedNs.name, localName, varObj }
    }

    return null
  }

  // Unqualified symbol
  const localName = sym
  const nsEnvFull = session.registry.get(ns)
  if (!nsEnvFull) return null
  const value = tryLookup(sym, nsEnvFull)
  if (value === undefined) return null

  // Determine the namespace where this symbol is defined.
  const varObj = lookupVar(sym, nsEnvFull)
  let resolvedNs: string
  if (varObj) {
    resolvedNs = varObj.ns
  } else if (value.kind === 'function' || value.kind === 'macro') {
    resolvedNs = getNamespaceEnv(value.env).ns?.name ?? ns
  } else if (value.kind === 'native-function') {
    const i = value.name.indexOf('/')
    resolvedNs = i > 0 ? value.name.slice(0, i) : ns
  } else {
    resolvedNs = ns
  }

  return { value, resolvedNs, localName, varObj }
}

/**
 * Extract documentation, arglists, and eldoc args from a resolved CljValue.
 * Pass `varMeta` (from the CljVar that holds the value) to get :doc/:arglists
 * stored on the var rather than on the value itself.
 */
export function extractMeta(value: CljValue, varMeta?: CljMap): ExtractedMeta {
  const type =
    value.kind === 'macro'
      ? 'macro'
      : value.kind === 'function' || value.kind === 'native-function'
        ? 'function'
        : 'var'

  // Prefer var-level metadata (canonical location for :doc/:arglists after the
  // metadata-on-vars refactor). Fall back to value-level meta for backward compat.
  const meta: CljMap | undefined =
    varMeta ??
    (value.kind === 'function'
      ? value.meta
      : value.kind === 'native-function'
        ? value.meta
        : undefined)

  let doc = ''
  let arglistsStr = ''
  let eldocArgs: string[][] | null = null

  if (meta) {
    const docEntry = meta.entries.find(
      ([k]) => k.kind === 'keyword' && k.name === ':doc'
    )
    if (docEntry && docEntry[1].kind === 'string') doc = docEntry[1].value

    const argsEntry = meta.entries.find(
      ([k]) => k.kind === 'keyword' && k.name === ':arglists'
    )
    if (argsEntry && argsEntry[1].kind === 'vector') {
      const arglists = argsEntry[1]
      arglistsStr = '(' + arglists.value.map((al) => printString(al)).join(' ') + ')'
      eldocArgs = arglists.value.map((al) => {
        if (al.kind !== 'vector') return [printString(al)]
        return al.value.map((p) => (p.kind === 'symbol' ? p.name : printString(p)))
      })
    }
  }

  // Fallback: derive arglists from structural arities (fn/macro without meta)
  if (arglistsStr === '' && (value.kind === 'function' || value.kind === 'macro')) {
    const arityStrs = value.arities.map((arity) => {
      const params = arity.params.map((p) => printString(p))
      if (arity.restParam) params.push('&', printString(arity.restParam))
      return '[' + params.join(' ') + ']'
    })
    arglistsStr = '(' + arityStrs.join(' ') + ')'
    eldocArgs = value.arities.map((arity) => {
      const params = arity.params.map((p) => printString(p))
      if (arity.restParam) params.push('&', printString(arity.restParam))
      return params
    })
  }

  return { doc, arglistsStr, eldocArgs, type }
}
