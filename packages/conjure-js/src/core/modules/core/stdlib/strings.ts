// Native string helpers used by clojure.string.
// All public API lives in src/clojure/string.clj; these are private helpers.
import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { v } from '../../../factories'
import { printString } from '../../../printer'
import { valueToString } from '../../../transformations'
import type {
  CljFunction,
  CljNativeFunction,
  CljRegex,
  CljValue,
  Env,
  EvaluationContext,
} from '../../../types'

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

function assertStrArg(
  val: CljValue | undefined,
  pos: string,
  fnName: string
): string {
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
  if (groups.length === 0) return v.string(whole)
  return v.vector([
    v.string(whole),
    ...groups.map(function mapGroupToClj(g) {
      return g == null ? v.nil() : v.string(String(g))
    }),
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
    return v.string(s.replace(re, escapeDollarInReplacement(replVal.value)))
  }

  // --- regex / * ---
  if (matchVal.kind === 'regex') {
    const re = matchVal as CljRegex
    const flags = global ? re.flags + 'g' : re.flags
    const jsRe = new RegExp(re.pattern, flags)

    // regex / string
    if (replVal.kind === 'string') {
      return v.string(s.replace(jsRe, replVal.value))
    }

    // regex / function
    if (is.aFunction(replVal)) {
      const fn = replVal as CljFunction | CljNativeFunction
      const result = s.replace(
        jsRe,
        function replaceCallback(whole: string, ...args: unknown[]) {
          const matchClj = buildMatchValue(whole, args)
          const replResult = ctx.applyFunction(fn, [matchClj], callEnv)
          return valueToString(replResult)
        }
      )
      return v.string(result)
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
  'str-upper-case*': v
    .nativeFn('str-upper-case*', function strUpperCaseImpl(sVal: CljValue) {
      return v.string(assertStr(sVal, 'str-upper-case*').toUpperCase())
    })
    .doc('Internal helper. Converts s to upper-case.', [['s']]),

  'str-lower-case*': v
    .nativeFn('str-lower-case*', function strLowerCaseImpl(sVal: CljValue) {
      return v.string(assertStr(sVal, 'str-lower-case*').toLowerCase())
    })
    .doc('Internal helper. Converts s to lower-case.', [['s']]),

  'str-trim*': v
    .nativeFn('str-trim*', function strTrimImpl(sVal: CljValue) {
      return v.string(assertStr(sVal, 'str-trim*').trim())
    })
    .doc('Internal helper. Removes whitespace from both ends of s.', [['s']]),

  'str-triml*': v
    .nativeFn('str-triml*', function strTrimlImpl(sVal: CljValue) {
      return v.string(assertStr(sVal, 'str-triml*').trimStart())
    })
    .doc('Internal helper. Removes whitespace from the left of s.', [['s']]),

  'str-trimr*': v
    .nativeFn('str-trimr*', function strTrimrImpl(sVal: CljValue) {
      return v.string(assertStr(sVal, 'str-trimr*').trimEnd())
    })
    .doc('Internal helper. Removes whitespace from the right of s.', [['s']]),

  'str-reverse*': v
    .nativeFn('str-reverse*', function strReverseImpl(sVal: CljValue) {
      return v.string([...assertStr(sVal, 'str-reverse*')].reverse().join(''))
    })
    .doc(
      'Internal helper. Returns s with its characters reversed (Unicode-safe).',
      [['s']]
    ),

  'str-starts-with*': v
    .nativeFn(
      'str-starts-with*',
      function strStartsWithImpl(sVal: CljValue, substrVal: CljValue) {
        const s = assertStr(sVal, 'str-starts-with*')
        const substr = assertStrArg(substrVal, 'second', 'str-starts-with*')
        return v.boolean(s.startsWith(substr))
      }
    )
    .doc('Internal helper. Returns true if s starts with substr.', [
      ['s', 'substr'],
    ]),

  'str-ends-with*': v
    .nativeFn(
      'str-ends-with*',
      function strEndsWithImpl(sVal: CljValue, substrVal: CljValue) {
        const s = assertStr(sVal, 'str-ends-with*')
        const substr = assertStrArg(substrVal, 'second', 'str-ends-with*')
        return v.boolean(s.endsWith(substr))
      }
    )
    .doc('Internal helper. Returns true if s ends with substr.', [
      ['s', 'substr'],
    ]),

  'str-includes*': v
    .nativeFn(
      'str-includes*',
      function strIncludesImpl(sVal: CljValue, substrVal: CljValue) {
        const s = assertStr(sVal, 'str-includes*')
        const substr = assertStrArg(substrVal, 'second', 'str-includes*')
        return v.boolean(s.includes(substr))
      }
    )
    .doc('Internal helper. Returns true if s contains substr.', [
      ['s', 'substr'],
    ]),

  'str-index-of*': v
    .nativeFn(
      'str-index-of*',
      function strIndexOfImpl(
        sVal: CljValue,
        valVal: CljValue,
        fromVal?: CljValue
      ) {
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
        return idx === -1 ? v.nil() : v.number(idx)
      }
    )
    .doc('Internal helper. Returns index of value in s, or nil if not found.', [
      ['s', 'value'],
      ['s', 'value', 'from-index'],
    ]),

  'str-last-index-of*': v
    .nativeFn(
      'str-last-index-of*',
      function strLastIndexOfImpl(
        sVal: CljValue,
        valVal: CljValue,
        fromVal?: CljValue
      ) {
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
        return idx === -1 ? v.nil() : v.number(idx)
      }
    )
    .doc(
      'Internal helper. Returns last index of value in s, or nil if not found.',
      [
        ['s', 'value'],
        ['s', 'value', 'from-index'],
      ]
    ),

  'str-replace*': v
    .nativeFnCtx(
      'str-replace*',
      function strReplaceImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        sVal: CljValue,
        matchVal: CljValue,
        replVal: CljValue
      ) {
        return doReplace(
          ctx,
          callEnv,
          'str-replace*',
          sVal,
          matchVal,
          replVal,
          true
        )
      }
    )
    .doc(
      'Internal helper. Replaces all occurrences of match with replacement in s.',
      [['s', 'match', 'replacement']]
    ),

  'str-replace-first*': v
    .nativeFnCtx(
      'str-replace-first*',
      function strReplaceFirstImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        sVal: CljValue,
        matchVal: CljValue,
        replVal: CljValue
      ) {
        return doReplace(
          ctx,
          callEnv,
          'str-replace-first*',
          sVal,
          matchVal,
          replVal,
          false
        )
      }
    )
    .doc(
      'Internal helper. Replaces the first occurrence of match with replacement in s.',
      [['s', 'match', 'replacement']]
    ),
}
