// Native string helpers used by clojure.string.
// All public API lives in src/clojure/string.clj; these are private helpers.
import { isAFunction } from '../assertions'
import { EvaluationError } from '../errors'
import {
  cljBoolean,
  cljNativeFunction,
  cljNativeFunctionWithContext,
  cljNil,
  cljNumber,
  cljString,
  cljVector,
  withDoc,
} from '../factories'
import { printString } from '../printer'
import { valueToString } from '../transformations'
import type {
  CljFunction,
  CljNativeFunction,
  CljRegex,
  CljValue,
  Env,
  EvaluationContext,
} from '../types'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function assertStr(val: CljValue | undefined, fnName: string): string {
  if (val === undefined || val.kind !== 'string') {
    throw new EvaluationError(
      `${fnName} expects a string as first argument${val !== undefined ? `, got ${printString(val)}` : ''}`,
      { val }
    )
  }
  return val.value
}

function assertStrArg(val: CljValue | undefined, pos: string, fnName: string): string {
  if (val === undefined || val.kind !== 'string') {
    throw new EvaluationError(
      `${fnName} expects a string as ${pos} argument${val !== undefined ? `, got ${printString(val)}` : ''}`,
      { val }
    )
  }
  return val.value
}

// Escapes all regex special chars in a string so it can be used as a literal pattern.
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Escapes $ in replacement strings so they are treated as literals by JS .replace().
// Each $ becomes $$ which JS interprets as a literal $.
function escapeDollarInReplacement(s: string): string {
  return s.replace(/\$/g, '$$$$')
}

// Builds the Clojure match value from a JS replace callback invocation.
// JS signature: (whole, ...args) where args = [groups..., offset(number), originalString, [namedGroups]]
// We find the offset (last number in args) to locate the group boundary.
function buildMatchValue(whole: string, args: unknown[]): CljValue {
  let offsetIdx = -1
  for (let i = args.length - 1; i >= 0; i--) {
    if (typeof args[i] === 'number') {
      offsetIdx = i
      break
    }
  }
  const groups = offsetIdx > 0 ? args.slice(0, offsetIdx) : []
  if (groups.length === 0) return cljString(whole)
  return cljVector([
    cljString(whole),
    ...groups.map((g) => (g == null ? cljNil() : cljString(String(g)))),
  ])
}

// Shared implementation for replace/replace-first.
// When global=true all occurrences are replaced; when false, only the first.
function doReplace(
  ctx: EvaluationContext,
  callEnv: Env,
  fnName: string,
  sVal: CljValue,
  matchVal: CljValue,
  replVal: CljValue,
  global: boolean
): CljValue {
  const s = assertStr(sVal, fnName)

  if (matchVal === undefined || replVal === undefined) {
    throw new EvaluationError(`${fnName} expects 3 arguments`, {})
  }

  // --- string / string ---
  if (matchVal.kind === 'string') {
    if (replVal.kind !== 'string') {
      throw new EvaluationError(
        `${fnName}: when match is a string, replacement must also be a string, got ${printString(replVal)}`,
        { replVal }
      )
    }
    const re = new RegExp(escapeRegex(matchVal.value), global ? 'g' : '')
    return cljString(s.replace(re, escapeDollarInReplacement(replVal.value)))
  }

  // --- regex / * ---
  if (matchVal.kind === 'regex') {
    const re = matchVal as CljRegex
    const flags = global ? re.flags + 'g' : re.flags
    const jsRe = new RegExp(re.pattern, flags)

    // regex / string
    if (replVal.kind === 'string') {
      return cljString(s.replace(jsRe, replVal.value))
    }

    // regex / function
    if (isAFunction(replVal)) {
      const fn = replVal as CljFunction | CljNativeFunction
      const result = s.replace(jsRe, (whole: string, ...args: unknown[]) => {
        const matchClj = buildMatchValue(whole, args)
        const replResult = ctx.applyFunction(fn, [matchClj], callEnv)
        return valueToString(replResult)
      })
      return cljString(result)
    }

    throw new EvaluationError(
      `${fnName}: replacement must be a string or function, got ${printString(replVal)}`,
      { replVal }
    )
  }

  throw new EvaluationError(
    `${fnName}: match must be a string or regex, got ${printString(matchVal)}`,
    { matchVal }
  )
}

// ---------------------------------------------------------------------------
// Exported stdlib functions
// ---------------------------------------------------------------------------

export const stringFunctions: Record<string, CljValue> = {
  'str-upper-case*': withDoc(
    cljNativeFunction('str-upper-case*', (sVal: CljValue) => {
      return cljString(assertStr(sVal, 'str-upper-case*').toUpperCase())
    }),
    'Internal helper. Converts s to upper-case.',
    [['s']]
  ),

  'str-lower-case*': withDoc(
    cljNativeFunction('str-lower-case*', (sVal: CljValue) => {
      return cljString(assertStr(sVal, 'str-lower-case*').toLowerCase())
    }),
    'Internal helper. Converts s to lower-case.',
    [['s']]
  ),

  'str-trim*': withDoc(
    cljNativeFunction('str-trim*', (sVal: CljValue) => {
      return cljString(assertStr(sVal, 'str-trim*').trim())
    }),
    'Internal helper. Removes whitespace from both ends of s.',
    [['s']]
  ),

  'str-triml*': withDoc(
    cljNativeFunction('str-triml*', (sVal: CljValue) => {
      return cljString(assertStr(sVal, 'str-triml*').trimStart())
    }),
    'Internal helper. Removes whitespace from the left of s.',
    [['s']]
  ),

  'str-trimr*': withDoc(
    cljNativeFunction('str-trimr*', (sVal: CljValue) => {
      return cljString(assertStr(sVal, 'str-trimr*').trimEnd())
    }),
    'Internal helper. Removes whitespace from the right of s.',
    [['s']]
  ),

  'str-reverse*': withDoc(
    cljNativeFunction('str-reverse*', (sVal: CljValue) => {
      return cljString([...assertStr(sVal, 'str-reverse*')].reverse().join(''))
    }),
    'Internal helper. Returns s with its characters reversed (Unicode-safe).',
    [['s']]
  ),

  'str-starts-with*': withDoc(
    cljNativeFunction('str-starts-with*', (sVal: CljValue, substrVal: CljValue) => {
      const s = assertStr(sVal, 'str-starts-with*')
      const substr = assertStrArg(substrVal, 'second', 'str-starts-with*')
      return cljBoolean(s.startsWith(substr))
    }),
    'Internal helper. Returns true if s starts with substr.',
    [['s', 'substr']]
  ),

  'str-ends-with*': withDoc(
    cljNativeFunction('str-ends-with*', (sVal: CljValue, substrVal: CljValue) => {
      const s = assertStr(sVal, 'str-ends-with*')
      const substr = assertStrArg(substrVal, 'second', 'str-ends-with*')
      return cljBoolean(s.endsWith(substr))
    }),
    'Internal helper. Returns true if s ends with substr.',
    [['s', 'substr']]
  ),

  'str-includes*': withDoc(
    cljNativeFunction('str-includes*', (sVal: CljValue, substrVal: CljValue) => {
      const s = assertStr(sVal, 'str-includes*')
      const substr = assertStrArg(substrVal, 'second', 'str-includes*')
      return cljBoolean(s.includes(substr))
    }),
    'Internal helper. Returns true if s contains substr.',
    [['s', 'substr']]
  ),

  'str-index-of*': withDoc(
    cljNativeFunction('str-index-of*', (sVal: CljValue, valVal: CljValue, fromVal?: CljValue) => {
      const s = assertStr(sVal, 'str-index-of*')
      const needle = assertStrArg(valVal, 'second', 'str-index-of*')
      let idx: number
      if (fromVal !== undefined && fromVal.kind !== 'nil') {
        if (fromVal.kind !== 'number') {
          throw new EvaluationError(
            `str-index-of* expects a number as third argument, got ${printString(fromVal)}`,
            { fromVal }
          )
        }
        idx = s.indexOf(needle, fromVal.value)
      } else {
        idx = s.indexOf(needle)
      }
      return idx === -1 ? cljNil() : cljNumber(idx)
    }),
    'Internal helper. Returns index of value in s, or nil if not found.',
    [['s', 'value'], ['s', 'value', 'from-index']]
  ),

  'str-last-index-of*': withDoc(
    cljNativeFunction(
      'str-last-index-of*',
      (sVal: CljValue, valVal: CljValue, fromVal?: CljValue) => {
        const s = assertStr(sVal, 'str-last-index-of*')
        const needle = assertStrArg(valVal, 'second', 'str-last-index-of*')
        let idx: number
        if (fromVal !== undefined && fromVal.kind !== 'nil') {
          if (fromVal.kind !== 'number') {
            throw new EvaluationError(
              `str-last-index-of* expects a number as third argument, got ${printString(fromVal)}`,
              { fromVal }
            )
          }
          idx = s.lastIndexOf(needle, fromVal.value)
        } else {
          idx = s.lastIndexOf(needle)
        }
        return idx === -1 ? cljNil() : cljNumber(idx)
      }
    ),
    'Internal helper. Returns last index of value in s, or nil if not found.',
    [['s', 'value'], ['s', 'value', 'from-index']]
  ),

  'str-replace*': withDoc(
    cljNativeFunctionWithContext(
      'str-replace*',
      (
        ctx: EvaluationContext,
        callEnv: Env,
        sVal: CljValue,
        matchVal: CljValue,
        replVal: CljValue
      ) => doReplace(ctx, callEnv, 'str-replace*', sVal, matchVal, replVal, true)
    ),
    'Internal helper. Replaces all occurrences of match with replacement in s.',
    [['s', 'match', 'replacement']]
  ),

  'str-replace-first*': withDoc(
    cljNativeFunctionWithContext(
      'str-replace-first*',
      (
        ctx: EvaluationContext,
        callEnv: Env,
        sVal: CljValue,
        matchVal: CljValue,
        replVal: CljValue
      ) =>
        doReplace(
          ctx,
          callEnv,
          'str-replace-first*',
          sVal,
          matchVal,
          replVal,
          false
        )
    ),
    'Internal helper. Replaces the first occurrence of match with replacement in s.',
    [['s', 'match', 'replacement']]
  ),
}
