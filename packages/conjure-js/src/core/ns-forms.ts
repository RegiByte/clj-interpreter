import { is } from './assertions'
import { tokenKeywords } from './keywords'
import type { CljValue, Token, TokenSymbol } from './types'

// ---------------------------------------------------------------------------
// Token scan helpers — lightweight pre-parse scans for ns form metadata.
// These are semantic (module declaration analysis), not syntactic (parsing).
// Exported so session.evaluate and runtime.loadFile can reuse them.
// ---------------------------------------------------------------------------

// Looks for the pattern: LParen Symbol("ns") Symbol(name) at the top of the
// token stream. Returns the namespace name or null.
export function extractNsNameFromTokens(tokens: Token[]): string | null {
  const meaningful = tokens.filter((t) => t.kind !== tokenKeywords.Comment)
  if (meaningful.length < 3) return null
  if (meaningful[0].kind !== 'LParen') return null
  if (meaningful[1].kind !== 'Symbol' || meaningful[1].value !== 'ns')
    return null
  if (meaningful[2].kind !== 'Symbol') return null
  return meaningful[2].value
}

// Returns Map { 'alias' -> 'full.ns.name' } for all [some.ns :as alias] and
// [some.ns :as-alias alias] specs found in the ns form's :require clauses.
// Runs before readForms so the reader can expand ::alias/foo at read time.
export function extractAliasMapFromTokens(
  tokens: Token[]
): Map<string, string> {
  const aliases = new Map<string, string>()
  const meaningful = tokens.filter(
    (t) =>
      t.kind !== tokenKeywords.Comment && t.kind !== tokenKeywords.Whitespace
  )
  if (meaningful.length < 3) return aliases
  if (meaningful[0].kind !== tokenKeywords.LParen) return aliases
  if (
    meaningful[1].kind !== tokenKeywords.Symbol ||
    meaningful[1].value !== 'ns'
  )
    return aliases

  let i = 3 // skip ( ns <name>
  let depth = 1
  while (i < meaningful.length && depth > 0) {
    const tok = meaningful[i]
    if (tok.kind === tokenKeywords.LParen) {
      depth++
      i++
      continue
    }
    if (tok.kind === tokenKeywords.RParen) {
      depth--
      i++
      continue
    }
    if (tok.kind === tokenKeywords.LBracket) {
      let j = i + 1
      let nsSym: string | null = null
      while (
        j < meaningful.length &&
        meaningful[j].kind !== tokenKeywords.RBracket
      ) {
        const t = meaningful[j]
        if (t.kind === tokenKeywords.Symbol && nsSym === null) {
          nsSym = t.value
        }
        if (
          t.kind === tokenKeywords.Keyword &&
          (t.value === ':as' || t.value === ':as-alias')
        ) {
          j++
          if (
            j < meaningful.length &&
            meaningful[j].kind === tokenKeywords.Symbol &&
            nsSym
          ) {
            aliases.set((meaningful[j] as TokenSymbol).value, nsSym)
          }
        }
        j++
      }
    }
    i++
  }
  return aliases
}

function findNsForm(forms: CljValue[]) {
  const nsForm = forms.find(
    (f) =>
      is.list(f) &&
      f.value.length > 0 &&
      is.symbol(f.value[0]) &&
      f.value[0].name === 'ns'
  )
  if (!nsForm || !is.list(nsForm)) return null
  return nsForm
}

export function extractRequireClauses(forms: CljValue[]): CljValue[][] {
  const nsForm = findNsForm(forms)
  if (!nsForm) return []
  const clauses: CljValue[][] = []
  for (let i = 2; i < nsForm.value.length; i++) {
    const clause = nsForm.value[i]
    if (
      is.list(clause) &&
      is.keyword(clause.value[0]) &&
      clause.value[0].name === ':require'
    ) {
      clauses.push(clause.value.slice(1))
    }
  }
  return clauses
}
