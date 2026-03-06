// Regex stdlib: regexp?, re-pattern, re-find, re-matches, re-seq
// Also exports str-split* used internally by clojure.string/split.
import { isRegex } from '../assertions'
import { EvaluationError } from '../errors'
import {
  cljBoolean,
  cljNativeFunction,
  cljNil,
  cljRegex,
  cljString,
  cljVector,
  withDoc,
} from '../factories'
import { printString } from '../printer'
import type { CljRegex, CljValue } from '../types'

// ---------------------------------------------------------------------------
// Inline-flag extraction
// Mirrors the logic in reader.ts so that re-pattern can also process flags.
// Only leading standalone (?flags) groups are stripped. (?:...) is untouched.
// ---------------------------------------------------------------------------
export function extractInlineFlags(raw: string): { pattern: string; flags: string } {
  let remaining = raw
  let flags = ''
  const flagGroupRe = /^\(\?([imsx]+)\)/
  let m: RegExpExecArray | null
  while ((m = flagGroupRe.exec(remaining)) !== null) {
    for (const f of m[1]) {
      if (f === 'x') {
        throw new EvaluationError(
          'Regex flag (?x) (verbose mode) has no JavaScript equivalent and is not supported',
          {}
        )
      }
      if (!flags.includes(f)) flags += f
    }
    remaining = remaining.slice(m[0].length)
  }
  return { pattern: remaining, flags }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function assertRegex(val: CljValue, fnName: string): CljRegex {
  if (!isRegex(val)) {
    throw new EvaluationError(
      `${fnName} expects a regex as first argument, got ${printString(val)}`,
      { val }
    )
  }
  return val
}

function assertStringArg(val: CljValue, fnName: string): string {
  if (val.kind !== 'string') {
    throw new EvaluationError(
      `${fnName} expects a string as second argument, got ${printString(val)}`,
      { val }
    )
  }
  return val.value
}

// Converts a JS RegExpExecArray into the Clojure return shape:
// - no capturing groups → CljString
// - with capturing groups → CljVector of [whole, g1, g2, ...] with nil for unmatched groups
function matchToClj(match: RegExpExecArray): CljValue {
  if (match.length === 1) return cljString(match[0])
  return cljVector(
    match.map((m) => (m == null ? cljNil() : cljString(m)))
  )
}

// ---------------------------------------------------------------------------
// Exported stdlib functions
// ---------------------------------------------------------------------------

export const regexFunctions: Record<string, CljValue> = {
  'regexp?': withDoc(
    cljNativeFunction('regexp?', (x: CljValue) =>
      cljBoolean(x !== undefined && isRegex(x))
    ),
    'Returns true if x is a regular expression pattern.',
    [['x']]
  ),

  're-pattern': withDoc(
    cljNativeFunction('re-pattern', (s: CljValue) => {
      if (s === undefined || s.kind !== 'string') {
        throw new EvaluationError(
          `re-pattern expects a string argument${s !== undefined ? `, got ${printString(s)}` : ''}`,
          { s }
        )
      }
      const { pattern, flags } = extractInlineFlags(s.value)
      return cljRegex(pattern, flags)
    }),
    'Returns an instance of java.util.regex.Pattern, for use, e.g. in re-matcher.\n  (re-pattern "\\\\d+") produces the same pattern as #"\\d+".',
    [['s']]
  ),

  're-find': withDoc(
    cljNativeFunction('re-find', (reVal: CljValue, sVal: CljValue) => {
      const re = assertRegex(reVal, 're-find')
      const s = assertStringArg(sVal, 're-find')
      const jsRe = new RegExp(re.pattern, re.flags)
      const match = jsRe.exec(s)
      if (!match) return cljNil()
      return matchToClj(match)
    }),
    'Returns the next regex match, if any, of string to pattern, using\n  java.util.regex.Matcher.find(). Returns the match or nil. When there\n  are groups, returns a vector of the whole match and groups (nil for\n  unmatched optional groups).',
    [['re', 's']]
  ),

  're-matches': withDoc(
    cljNativeFunction('re-matches', (reVal: CljValue, sVal: CljValue) => {
      const re = assertRegex(reVal, 're-matches')
      const s = assertStringArg(sVal, 're-matches')
      const jsRe = new RegExp(re.pattern, re.flags)
      const match = jsRe.exec(s)
      if (!match || match.index !== 0 || match[0].length !== s.length) {
        return cljNil()
      }
      return matchToClj(match)
    }),
    'Returns the match, if any, of string to pattern, using\n  java.util.regex.Matcher.matches(). The entire string must match.\n  Returns the match or nil. When there are groups, returns a vector\n  of the whole match and groups (nil for unmatched optional groups).',
    [['re', 's']]
  ),

  're-seq': withDoc(
    cljNativeFunction('re-seq', (reVal: CljValue, sVal: CljValue) => {
      const re = assertRegex(reVal, 're-seq')
      const s = assertStringArg(sVal, 're-seq')
      // Always create a fresh regex with the g flag for exec looping
      const jsRe = new RegExp(re.pattern, re.flags + 'g')
      const results: CljValue[] = []
      let match: RegExpExecArray | null
      while ((match = jsRe.exec(s)) !== null) {
        // Guard against zero-length match infinite loops
        if (match[0].length === 0) {
          jsRe.lastIndex++
          continue
        }
        results.push(matchToClj(match))
      }
      if (results.length === 0) return cljNil()
      return { kind: 'list' as const, value: results }
    }),
    'Returns a lazy sequence of successive matches of pattern in string,\n  using java.util.regex.Matcher.find(), each such match processed with\n  re-groups.',
    [['re', 's']]
  ),

  // Internal helper used by clojure.string/split.
  // Accepts a CljRegex or CljString as separator.
  // When no limit is given, trailing empty strings are dropped (Clojure default).
  // When a limit is given, all parts including trailing empties are kept.
  'str-split*': withDoc(
    cljNativeFunction('str-split*', (sVal: CljValue, sepVal: CljValue, limitVal?: CljValue) => {
      if (sVal === undefined || sVal.kind !== 'string') {
        throw new EvaluationError(
          `str-split* expects a string as first argument${sVal !== undefined ? `, got ${printString(sVal)}` : ''}`,
          { sVal }
        )
      }
      const s = sVal.value
      const hasLimit = limitVal !== undefined && limitVal.kind !== 'nil'
      const limit: number | undefined =
        hasLimit && limitVal!.kind === 'number' ? limitVal!.value : undefined

      let jsPattern: string
      let jsFlags: string

      if (sepVal.kind !== 'regex') {
        throw new EvaluationError(
          `str-split* expects a regex pattern as second argument, got ${printString(sepVal)}`,
          { sepVal }
        )
      }

      // Empty pattern (#"") splits into individual characters — matching
      // Clojure/Java split("") semantics. Unicode-safe via [...s].
      if (sepVal.pattern === '') {
        const chars = [...s]
        if (limit === undefined || limit >= chars.length) {
          return cljVector(chars.map(cljString))
        }
        // limit < chars.length: first (limit-1) chars + rest of string as final part
        const parts = [...chars.slice(0, limit - 1), chars.slice(limit - 1).join('')]
        return cljVector(parts.map(cljString))
      }

      jsPattern = sepVal.pattern
      jsFlags = sepVal.flags

      const re = new RegExp(jsPattern, jsFlags + 'g')
      const rawParts = splitWithRegex(s, re, limit)

      return cljVector(rawParts.map((p) => cljString(p)))
    }),
    'Internal helper for clojure.string/split. Splits string s by a regex or\n  string separator. Optional limit keeps all parts when provided.',
    [['s', 'sep'], ['s', 'sep', 'limit']]
  ),
}

// Performs the actual split, applying limit and trailing-empty-drop semantics.
function splitWithRegex(s: string, re: RegExp, limit: number | undefined): string[] {
  const parts: string[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let count = 0

  while ((match = re.exec(s)) !== null) {
    // Guard zero-length matches
    if (match[0].length === 0) {
      re.lastIndex++
      continue
    }

    if (limit !== undefined && count >= limit - 1) break

    parts.push(s.slice(lastIndex, match.index))
    lastIndex = match.index + match[0].length
    count++
  }

  parts.push(s.slice(lastIndex))

  if (limit === undefined) {
    // Drop trailing empty strings (Clojure default behavior)
    while (parts.length > 0 && parts[parts.length - 1] === '') {
      parts.pop()
    }
  }

  return parts
}
