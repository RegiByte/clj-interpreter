import { tokenize } from '../core/tokenizer'

export type FormRange = {
  /** Inclusive start offset in the source string */
  start: number
  /** Exclusive end offset in the source string */
  end: number
}

const OPEN = new Set(['LParen', 'LBracket', 'LBrace'])
const CLOSE = new Set(['RParen', 'RBracket', 'RBrace'])
const PREFIX = new Set(['Quote', 'Quasiquote', 'Unquote', 'UnquoteSplicing'])
const SKIP = new Set(['Whitespace', 'Comment'])

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Calva-style "form before cursor" heuristic.
 *
 * Scans backwards from the cursor offset to find the last **complete** form:
 *
 *   - If the last token before the cursor is a close bracket `)` `]` `}` →
 *     walk backwards to find its matching open bracket. The whole balanced
 *     expression is the form.
 *   - If the last token is an atom (symbol, number, keyword, string, …) →
 *     that atom is the form.
 *   - Reader-macro prefixes (`'` `` ` `` `~` `~@`) immediately before the form
 *     are included in the returned range.
 *
 * Returns null when the cursor is after an unmatched open bracket, in
 * whitespace/comments with nothing before it, or if tokenization fails.
 */
export function findFormBeforeCursor(
  source: string,
  cursorOffset: number,
): FormRange | null {
  let tokens
  try {
    tokens = tokenize(source)
  } catch {
    return null
  }

  // Relevant tokens: non-whitespace, non-comment, ending at or before cursor
  const relevant = tokens.filter(
    (t) => !SKIP.has(t.kind) && t.end.offset <= cursorOffset,
  )

  if (relevant.length === 0) return null

  const lastIdx = relevant.length - 1
  const last = relevant[lastIdx]

  let range: FormRange

  if (CLOSE.has(last.kind)) {
    // Closing bracket — find its matching open
    const openIdx = findMatchingOpen(relevant, lastIdx)
    if (openIdx === -1) return null
    range = {
      start: relevant[openIdx].start.offset,
      end: last.end.offset,
    }
    return extendWithPrefix(relevant, openIdx, range)
  }

  if (OPEN.has(last.kind)) {
    // Cursor is right after an open bracket with no matching close before it.
    // Return just the bracket itself so the evaluator reports an "unmatched
    // bracket" error — correct and honest, no fallback to whole-buffer eval.
    return { start: last.start.offset, end: last.end.offset }
  }

  if (!PREFIX.has(last.kind)) {
    // Atom (symbol, number, keyword, string, nil, …)
    range = { start: last.start.offset, end: last.end.offset }
    return extendWithPrefix(relevant, lastIdx, range)
  }

  // Bare reader-macro prefix with nothing after it — nothing to eval.
  return null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type Token = ReturnType<typeof tokenize>[number]

/** Scan backwards from closeIdx to find the index of the matching open bracket. */
function findMatchingOpen(relevant: Token[], closeIdx: number): number {
  const closeKind = relevant[closeIdx].kind
  const openKind =
    closeKind === 'RParen'
      ? 'LParen'
      : closeKind === 'RBracket'
        ? 'LBracket'
        : 'LBrace'

  let depth = 1
  for (let i = closeIdx - 1; i >= 0; i--) {
    const k = relevant[i].kind
    if (k === closeKind) depth++
    else if (k === openKind) {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/**
 * If the token immediately before formStartIdx is a reader-macro prefix
 * (`'`, `` ` ``, `~`, `~@`), extend the range to include it.
 */
function extendWithPrefix(
  relevant: Token[],
  formStartIdx: number,
  range: FormRange,
): FormRange {
  if (formStartIdx > 0) {
    const prev = relevant[formStartIdx - 1]
    if (PREFIX.has(prev.kind)) {
      return { start: prev.start.offset, end: range.end }
    }
  }
  return range
}
