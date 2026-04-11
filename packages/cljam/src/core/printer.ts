import { EvaluationError } from './errors'
import type { CljCons, CljLazySeq } from './types'
import {
  type CljMultiMethod,
  type CljValue,
  type EvaluationContext,
} from './types'
import { derefValue } from './env'
import { specialFormKeywords, valueKeywords } from './keywords.ts'
import { is } from './assertions.ts'
import { v } from './factories.ts'

const LAZY_PRINT_CAP = 100

/** Realize a lazy-seq (local copy to avoid circular dep with transformations). */
function realizeLazy(ls: CljLazySeq): CljValue {
  let current: CljValue = ls
  while (is.lazySeq(current)) {
    const lazy = current as CljLazySeq
    if (lazy.realized) {
      current = lazy.value!
      continue
    }
    if (lazy.thunk) {
      lazy.value = lazy.thunk()
      lazy.thunk = null
      lazy.realized = true
      current = lazy.value!
    } else {
      return v.nil()
    }
  }
  return current
}

/** Walk a lazy/cons chain collecting up to `limit` elements for printing. */
function collectSeqElements(
  value: CljValue,
  limit: number,
  depth: number
): { items: string[]; truncated: boolean } {
  const items: string[] = []
  let current = value
  while (items.length < limit) {
    if (is.nil(current)) break
    if (is.lazySeq(current)) {
      current = realizeLazy(current as CljLazySeq)
      continue
    }
    if (is.cons(current)) {
      const c = current as CljCons
      items.push(printString(c.head, depth + 1))
      current = c.tail
      continue
    }
    if (is.list(current)) {
      for (const v of current.value) {
        if (items.length >= limit) break
        items.push(printString(v, depth + 1))
      }
      break
    }
    if (is.vector(current)) {
      for (const v of current.value) {
        if (items.length >= limit) break
        items.push(printString(v, depth + 1))
      }
      break
    }
    // Unknown tail — just print it
    items.push(printString(current, depth + 1))
    break
  }
  return { items, truncated: items.length >= limit }
}

// --- Print context (*print-length* / *print-level*) ---
// Single-threaded JS: module-level state is safe.
export interface PrintContext {
  printLength: number | null
  printLevel: number | null
}

let _printCtx: PrintContext = { printLength: null, printLevel: null }

export function getPrintContext(): PrintContext {
  return _printCtx
}

export function withPrintContext<T>(ctx: PrintContext, fn: () => T): T {
  const prev = _printCtx
  _printCtx = ctx
  try {
    return fn()
  } finally {
    _printCtx = prev
  }
}

/**
 * Build a PrintContext by reading *print-length* and *print-level* from the
 * runtime registry via ctx.resolveNs. Use this (instead of tryLookup) so that
 * dynamic bindings from inside Clojure function bodies are visible even after
 * a snapshot restore (where closure envs are stale).
 */
export function buildPrintContext(ctx: EvaluationContext): PrintContext {
  const lenVar = ctx.resolveNs('clojure.core')?.vars.get('*print-length*')
  const lvlVar = ctx.resolveNs('clojure.core')?.vars.get('*print-level*')
  const len = lenVar ? derefValue(lenVar) : undefined
  const level = lvlVar ? derefValue(lvlVar) : undefined
  return {
    printLength: len && is.number(len) ? len.value : null,
    printLevel: level && is.number(level) ? level.value : null,
  }
}

export function printString(value: CljValue, _depth = 0): string {
  const { printLevel } = _printCtx
  if (printLevel !== null && _depth >= printLevel) {
    if (
      is.list(value) ||
      is.vector(value) ||
      is.map(value) ||
      is.set(value) ||
      is.cons(value) ||
      is.lazySeq(value)
    )
      return '#'
  }
  return printStringImpl(value, _depth)
}

function printStringImpl(value: CljValue, depth: number): string {
  switch (value.kind) {
    case valueKeywords.number:
      return value.value.toString()
    case valueKeywords.string:
      let escapedBuffer = ''
      for (const char of value.value) {
        switch (char) {
          case '"':
            escapedBuffer += '\\"'
            break
          case '\\':
            escapedBuffer += '\\\\'
            break
          case '\n':
            escapedBuffer += '\\n'
            break
          case '\r':
            escapedBuffer += '\\r'
            break
          case '\t':
            escapedBuffer += '\\t'
            break
          default:
            escapedBuffer += char
        }
      }
      return `"${escapedBuffer}"`
    case valueKeywords.boolean:
      return value.value ? 'true' : 'false'
    case valueKeywords.nil:
      return 'nil'
    case valueKeywords.keyword:
      return `${value.name}`
    case valueKeywords.symbol:
      return `${value.name}`
    case valueKeywords.list: {
      const { printLength } = _printCtx
      const items =
        printLength !== null ? value.value.slice(0, printLength) : value.value
      const suffix =
        printLength !== null && value.value.length > printLength ? ' ...' : ''
      return `(${items.map((v) => printString(v, depth + 1)).join(' ')}${suffix})`
    }
    case valueKeywords.vector: {
      const { printLength } = _printCtx
      const items =
        printLength !== null ? value.value.slice(0, printLength) : value.value
      const suffix =
        printLength !== null && value.value.length > printLength ? ' ...' : ''
      return `[${items.map((v) => printString(v, depth + 1)).join(' ')}${suffix}]`
    }
    case valueKeywords.map: {
      const { printLength } = _printCtx
      const entries =
        printLength !== null
          ? value.entries.slice(0, printLength)
          : value.entries
      const suffix =
        printLength !== null && value.entries.length > printLength ? ' ...' : ''
      return `{${entries.map(([key, v]) => `${printString(key, depth + 1)} ${printString(v, depth + 1)}`).join(' ')}${suffix}}`
    }
    case valueKeywords.function: {
      if (value.arities.length === 1) {
        const a = value.arities[0]
        const params = a.restParam
          ? [...a.params, v.symbol('&'), a.restParam]
          : a.params
        return `(fn [${params.map(printString).join(' ')}] ${a.body.map(printString).join(' ')})`
      }
      const clauses = value.arities.map((a) => {
        const params = a.restParam
          ? [...a.params, v.symbol('&'), a.restParam]
          : a.params
        return `([${params.map(printString).join(' ')}] ${a.body.map(printString).join(' ')})`
      })
      return `(fn ${clauses.join(' ')})`
    }
    case valueKeywords.nativeFunction:
      return `(native-fn ${value.name})`
    case valueKeywords.multiMethod:
      return `(multi-method ${(value as CljMultiMethod).name})`
    case valueKeywords.atom:
      return `#<Atom ${printString(value.value, depth + 1)}>`
    case valueKeywords.reduced:
      return `#<Reduced ${printString(value.value, depth + 1)}>`
    case valueKeywords.volatile:
      return `#<Volatile ${printString(value.value, depth + 1)}>`
    case valueKeywords.regex: {
      const escaped = value.pattern.replace(/"/g, '\\"')
      const prefix = value.flags ? `(?${value.flags})` : ''
      return `#"${prefix}${escaped}"`
    }
    case valueKeywords.var:
      return `#'${value.ns}/${value.name}`
    case valueKeywords.set: {
      const { printLength } = _printCtx
      const items =
        printLength !== null ? value.values.slice(0, printLength) : value.values
      const suffix =
        printLength !== null && value.values.length > printLength ? ' ...' : ''
      return `#{${items.map((v) => printString(v, depth + 1)).join(' ')}${suffix}}`
    }
    case valueKeywords.delay:
      if (value.realized)
        return `#<Delay @${printString(value.value!, depth + 1)}>`
      return '#<Delay pending>'
    case valueKeywords.lazySeq:
    case valueKeywords.cons: {
      const { printLength } = _printCtx
      const limit = printLength !== null ? printLength : LAZY_PRINT_CAP
      const { items, truncated } = collectSeqElements(value, limit, depth)
      const suffix = truncated ? ' ...' : ''
      return `(${items.join(' ')}${suffix})`
    }
    case valueKeywords.namespace:
      return `#namespace[${value.name}]`
    // --- ASYNC (experimental) ---
    case 'pending':
      if (value.resolved && value.resolvedValue !== undefined)
        return `#<Pending @${printString(value.resolvedValue, depth + 1)}>`
      return '#<Pending>'
    // --- END ASYNC ---
    case valueKeywords.jsValue: {
      const raw = value.value
      if (raw === null) return '#<js null>'
      if (raw === undefined) return '#<js undefined>'
      if (raw instanceof Date) return raw.toISOString()
      if (typeof raw === 'function') return '#<js Function>'
      if (Array.isArray(raw)) return '#<js Array>'
      if (raw instanceof Promise) return '#<js Promise>'
      const typeName =
        (raw as { constructor?: { name?: string } }).constructor?.name ??
        'Object'
      return `#<js ${typeName}>`
    }
    default:
      throw new EvaluationError(`unhandled value type: ${value.kind}`, {
        value,
      })
  }
}

export function joinLines(lines: string[]): string {
  return lines.join('\n')
}

// --- Pretty printer ---

// Known "body" forms: value is the number of "header" args kept on the first line.
// Remaining args are indented 2 spaces from the opening paren.
const BODY_FORM_HEADER_COUNT: Record<string, number> = {
  // 0-header: entire body is indented
  do: 0,
  try: 0,
  and: 0,
  or: 0,
  cond: 0,
  '->': 0,
  '->>': 0,
  'some->': 0,
  'some->>': 0,
  // 1-header: one leading arg kept on first line (condition / binding vec / value)
  when: 1,
  'when-not': 1,
  'when-let': 1,
  'when-some': 1,
  'when-first': 1,
  if: 1,
  'if-not': 1,
  'if-let': 1,
  'if-some': 1,
  while: 1,
  let: 1,
  loop: 1,
  binding: 1,
  'with-open': 1,
  'with-local-vars': 1,
  locking: 1,
  fn: 1,
  'fn*': 1,
  def: 1,
  defonce: 1,
  ns: 1,
  doseq: 1,
  dotimes: 1,
  for: 1,
  case: 1,
  'cond->': 1,
  'cond->>': 1,
  // 2-header: name + params/dispatch on first line
  defn: 2,
  'defn-': 2,
  defmacro: 2,
  defmethod: 2,
}

// Forms whose first header arg (binding vector) should be printed as pairs.
const BINDING_FORMS = new Set([
  'let',
  'loop',
  specialFormKeywords.binding,
  'with-open',
  'for',
  'doseq',
  'dotimes',
])

// Forms whose body args are pairs (test expr, test expr, ...).
const PAIR_BODY_FORMS = new Set(['cond', 'condp', 'case', 'cond->', 'cond->>'])

function sp(n: number): string {
  return n > 0 ? ' '.repeat(n) : ''
}

function lastLineLen(s: string): number {
  const nl = s.lastIndexOf('\n')
  return nl === -1 ? s.length : s.length - nl - 1
}

function pp(value: CljValue, col: number, maxWidth: number): string {
  const flat = printString(value)
  if (col + flat.length <= maxWidth) return flat

  switch (value.kind) {
    case valueKeywords.list:
      return ppList(value.value, col, maxWidth)
    case valueKeywords.vector:
      return ppVec(value.value, col, maxWidth, false)
    case valueKeywords.map:
      return ppMap(value.entries, col, maxWidth)
    case valueKeywords.set:
      return ppSet(value.values, col, maxWidth)
    case valueKeywords.lazySeq:
    case valueKeywords.cons:
      // Flat representation is already computed above; no deeper pretty-print needed
      return flat
    default:
      return flat
  }
}

function ppList(items: CljValue[], col: number, maxWidth: number): string {
  if (items.length === 0) return '()'

  const [head, ...args] = items
  const headStr = printString(head)
  const name = head.kind === valueKeywords.symbol ? head.name : null

  // --- Known body form ---
  if (name !== null && name in BODY_FORM_HEADER_COUNT) {
    const hCount = BODY_FORM_HEADER_COUNT[name]
    const headerArgs = args.slice(0, hCount)
    const bodyArgs = args.slice(hCount)
    const bodyIndent = col + 2

    // Build header line: "(name headerArg0 headerArg1 ...)"
    let result = '(' + headStr
    let curCol = col + 1 + headStr.length

    for (let i = 0; i < headerArgs.length; i++) {
      const arg = headerArgs[i]
      const argCol = curCol + 1
      const isPairVec =
        BINDING_FORMS.has(name) && i === 0 && arg.kind === valueKeywords.vector
      const argStr = isPairVec
        ? ppVec(
            (arg as Extract<CljValue, { kind: 'vector' }>).value,
            argCol,
            maxWidth,
            true
          )
        : pp(arg, argCol, maxWidth)
      result += ' ' + argStr
      curCol = argStr.includes('\n')
        ? lastLineLen(argStr)
        : argCol + argStr.length - 1
    }

    if (bodyArgs.length === 0) return result + ')'

    const bodyStr = PAIR_BODY_FORMS.has(name)
      ? ppPairs(bodyArgs, bodyIndent, maxWidth)
      : bodyArgs
          .map((a) => sp(bodyIndent) + pp(a, bodyIndent, maxWidth))
          .join('\n')

    return result + '\n' + bodyStr + ')'
  }

  // --- General case: flow or 2-space indent ---
  if (args.length === 0) return '(' + headStr + ')'

  const firstArgCol = col + 1 + headStr.length + 1

  if (args.length === 1) {
    return '(' + headStr + ' ' + pp(args[0], firstArgCol, maxWidth) + ')'
  }

  // For short head names: align subsequent args with the first arg.
  // For long head names: fall back to 2-space indent for all args.
  const argIndent = headStr.length <= 10 ? firstArgCol : col + 2
  const argStrs = args.map((a) => pp(a, argIndent, maxWidth))

  if (argIndent === firstArgCol) {
    return (
      '(' +
      headStr +
      ' ' +
      argStrs[0] +
      '\n' +
      argStrs
        .slice(1)
        .map((s) => sp(argIndent) + s)
        .join('\n') +
      ')'
    )
  }
  return (
    '(' +
    headStr +
    '\n' +
    argStrs.map((s) => sp(argIndent) + s).join('\n') +
    ')'
  )
}

function ppVec(
  items: CljValue[],
  col: number,
  maxWidth: number,
  pairMode: boolean
): string {
  if (items.length === 0) return '[]'

  const innerCol = col + 1

  if (pairMode) {
    const lines: string[] = []
    for (let i = 0; i < items.length; i += 2) {
      const prefix = i === 0 ? '' : sp(innerCol)
      const keyFlat = printString(items[i])
      if (i + 1 >= items.length) {
        lines.push(prefix + keyFlat)
        continue
      }
      const val = items[i + 1]
      const pairFlat = keyFlat + ' ' + printString(val)
      if (innerCol + pairFlat.length <= maxWidth) {
        lines.push(prefix + pairFlat)
      } else {
        const valStr = pp(val, innerCol + keyFlat.length + 1, maxWidth)
        lines.push(prefix + keyFlat + ' ' + valStr)
      }
    }
    return '[' + lines.join('\n') + ']'
  }

  const strs = items.map((item, i) => {
    const s = pp(item, innerCol, maxWidth)
    return (i === 0 ? '' : sp(innerCol)) + s
  })
  return '[' + strs.join('\n') + ']'
}

function ppMap(
  entries: [CljValue, CljValue][],
  col: number,
  maxWidth: number
): string {
  if (entries.length === 0) return '{}'
  const innerCol = col + 1
  const pairs = entries.map(([k, v], i) => {
    const kStr = printString(k)
    const vStr = pp(v, innerCol + kStr.length + 1, maxWidth)
    return (i === 0 ? '' : sp(innerCol)) + kStr + ' ' + vStr
  })
  return '{' + pairs.join('\n') + '}'
}

function ppSet(items: CljValue[], col: number, maxWidth: number): string {
  if (items.length === 0) return '#{}'
  const innerCol = col + 2 // '#{'
  const strs = items.map((item, i) => {
    const s = pp(item, innerCol, maxWidth)
    return (i === 0 ? '' : sp(innerCol)) + s
  })
  return '#{' + strs.join('\n') + '}'
}

function ppPairs(items: CljValue[], indent: number, maxWidth: number): string {
  const lines: string[] = []
  for (let i = 0; i < items.length; i += 2) {
    const testStr = pp(items[i], indent, maxWidth)
    if (i + 1 >= items.length) {
      lines.push(sp(indent) + testStr)
      continue
    }
    const exprFlat = printString(items[i + 1])
    const pairFlat = testStr + ' ' + exprFlat
    if (indent + pairFlat.length <= maxWidth) {
      lines.push(sp(indent) + pairFlat)
    } else {
      lines.push(
        sp(indent) +
          testStr +
          '\n' +
          sp(indent + 2) +
          pp(items[i + 1], indent + 2, maxWidth)
      )
    }
  }
  return lines.join('\n')
}

export function prettyPrintString(value: CljValue, maxWidth = 80): string {
  return pp(value, 0, maxWidth)
}
