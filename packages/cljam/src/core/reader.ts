import { ReaderError } from './errors'
import { v } from './factories'
import { is } from './assertions'
import { makeTokenScanner, type TokenScanner } from './scanners'
import { getTokenValue } from './tokenizer'
import { type Token } from './types'
import type { CljValue } from './types'
import { getPos, setPos } from './positions'
import {
  tokenKeywords,
  type TokenKinds,
  tokenSymbols,
  valueKeywords,
} from './keywords.ts'

// ---------------------------------------------------------------------------
// ReaderCtx — threading state through the recursive descent reader.
// ednMode:          when true, reject Clojure-specific reader macros.
// dataReaders:      tag name → handler; used by readTaggedLiteral.
// defaultDataReader: called when no named handler is found.
// ---------------------------------------------------------------------------
type ReaderCtx = {
  scanner: TokenScanner
  namespace: string
  aliases: Map<string, string>
  ednMode?: boolean
  dataReaders?: Map<string, (form: CljValue) => CljValue>
  defaultDataReader?: (tagName: string, form: CljValue) => CljValue
}

// ---------------------------------------------------------------------------
// skipDiscards — consume leading #_ discard tokens (and the forms they mark).
//
// Stacking semantics: #_#_ f1 f2 discards BOTH f1 and f2 (not just f1).
// Each #_ in a chain discards exactly one form. This mirrors Clojure's
// sentinel approach: the inner #_ consumes its form, then the outer #_
// independently consumes one more.
//
//   #_ f1 f2           → f1 discarded, [f2] returned
//   #_#_ f1 f2 f3      → f1 and f2 discarded, [f3] returned
//   #_#_#_ f1 f2 f3 f4 → f1, f2, f3 discarded, [f4] returned
// ---------------------------------------------------------------------------
function skipDiscards(ctx: ReaderCtx): void {
  const scanner = ctx.scanner
  while (scanner.peek()?.kind === tokenKeywords.Discard) {
    scanner.advance() // consume this Discard token

    // Recurse FIRST: inner #_ chains consume their own forms.
    // The outer #_ then still consumes one additional form independently.
    // This is what gives #_#_ f1 f2 the "discard both" behavior.
    skipDiscards(ctx)

    const next = scanner.peek()
    if (!next) {
      throw new ReaderError(
        'Expected a form after #_, got end of input',
        scanner.position()
      )
    }
    if (isClosingToken(next)) {
      throw new ReaderError(
        `Expected a form after #_, got '${getTokenValue(next) || next.kind}'`,
        next,
        { start: next.start.offset, end: next.end.offset }
      )
    }
    readForm(ctx) // consume the one form THIS #_ marks
  }
}

// ---------------------------------------------------------------------------
// readTaggedLiteral — handle #inst, #uuid, and user-defined reader tags.
// Only active when ctx.dataReaders is set (i.e. in EDN mode via readFormsEdn).
// ---------------------------------------------------------------------------
function readTaggedLiteral(ctx: ReaderCtx): CljValue {
  const scanner = ctx.scanner
  const tagToken = scanner.peek()!
  scanner.advance() // consume the ReaderTag token
  const tagName = tagToken.kind === tokenKeywords.ReaderTag
    ? (tagToken as Token & { kind: 'ReaderTag'; value: string }).value
    : ''

  skipDiscards(ctx)

  if (scanner.isAtEnd()) {
    throw new ReaderError(
      `Expected a form after reader tag #${tagName}, got end of input`,
      scanner.position()
    )
  }

  const value = readForm(ctx)

  if (ctx.dataReaders) {
    const handler = ctx.dataReaders.get(tagName)
    if (handler) {
      try {
        return handler(value)
      } catch (e) {
        if (e instanceof ReaderError) throw e
        throw new ReaderError(
          `Error in reader tag #${tagName}: ${(e as Error).message}`,
          tagToken,
          { start: tagToken.start.offset, end: tagToken.end.offset }
        )
      }
    }
    if (ctx.defaultDataReader) {
      return ctx.defaultDataReader(tagName, value)
    }
    throw new ReaderError(
      `No reader function for tag #${tagName}`,
      tagToken,
      { start: tagToken.start.offset, end: tagToken.end.offset }
    )
  }

  // Reader tags require EDN mode (ctx.dataReaders must be set).
  throw new ReaderError(
    `Reader tags (#${tagName}) are only supported in EDN mode. Use clojure.edn/read-string for tagged literals.`,
    tagToken,
    { start: tagToken.start.offset, end: tagToken.end.offset }
  )
}

function readAtom(ctx: ReaderCtx): CljValue {
  const scanner = ctx.scanner
  const token = scanner.peek()
  if (!token) {
    throw new ReaderError('Unexpected end of input', scanner.position())
  }
  switch (token.kind) {
    case tokenKeywords.Symbol:
      return readSymbol(scanner)
    case tokenKeywords.String: {
      scanner.advance()
      const val: CljValue = v.string(token.value)
      setPos(val, { start: token.start.offset, end: token.end.offset })
      return val
    }
    case tokenKeywords.Number: {
      scanner.advance()
      const val: CljValue = v.number(token.value)
      setPos(val, { start: token.start.offset, end: token.end.offset })
      return val
    }
    case tokenKeywords.Character: {
      scanner.advance()
      const val: CljValue = v.char(token.value)
      setPos(val, { start: token.start.offset, end: token.end.offset })
      return val
    }
    case tokenKeywords.Keyword: {
      scanner.advance()
      const kwName = token.value
      let val: CljValue
      if (kwName.startsWith('::')) {
        if (ctx.ednMode) {
          throw new ReaderError(
            `Auto-qualified keywords (::) are not valid in EDN`,
            token,
            { start: token.start.offset, end: token.end.offset }
          )
        }
        const rest = kwName.slice(2)
        if (rest.includes('/')) {
          const slashIdx = rest.indexOf('/')
          const alias = rest.slice(0, slashIdx)
          const localName = rest.slice(slashIdx + 1)
          const fullNs = ctx.aliases.get(alias)
          if (!fullNs) {
            throw new ReaderError(
              `No namespace alias '${alias}' found for ::${alias}/${localName}`,
              token,
              { start: token.start.offset, end: token.end.offset }
            )
          }
          val = v.keyword(`:${fullNs}/${localName}`)
        } else {
          val = v.keyword(`:${ctx.namespace}/${rest}`)
        }
      } else {
        val = v.keyword(kwName)
      }
      setPos(val, { start: token.start.offset, end: token.end.offset })
      return val
    }
  }
  throw new ReaderError(`Unexpected token: ${token.kind}`, token, {
    start: token.start.offset,
    end: token.end.offset,
  })
}

const readQuote = (ctx: ReaderCtx) => {
  const scanner = ctx.scanner
  const token = scanner.peek()
  if (!token) {
    throw new ReaderError(
      'Unexpected end of input while parsing quote',
      scanner.position()
    )
  }
  scanner.advance() // consume the quote token
  skipDiscards(ctx)
  const value = readForm(ctx)
  if (!value) {
    throw new ReaderError(`Unexpected token: ${getTokenValue(token)}`, token)
  }
  return v.list([v.symbol('quote'), value])
}

const readQuasiquote = (ctx: ReaderCtx) => {
  const scanner = ctx.scanner
  const token = scanner.peek()
  if (!token) {
    throw new ReaderError(
      'Unexpected end of input while parsing quasiquote',
      scanner.position()
    )
  }
  scanner.advance() // consume the quasiquote token
  skipDiscards(ctx)
  const value = readForm(ctx)
  if (!value) {
    throw new ReaderError(`Unexpected token: ${getTokenValue(token)}`, token)
  }
  return v.list([v.symbol('quasiquote'), value])
}

const readUnquote = (ctx: ReaderCtx) => {
  const scanner = ctx.scanner
  const token = scanner.peek()
  if (!token) {
    throw new ReaderError(
      'Unexpected end of input while parsing unquote',
      scanner.position()
    )
  }
  scanner.advance() // consume the unquote token
  skipDiscards(ctx)
  const value = readForm(ctx)
  if (!value) {
    throw new ReaderError(`Unexpected token: ${getTokenValue(token)}`, token)
  }
  return v.list([v.symbol('unquote'), value])
}

const readMeta = (ctx: ReaderCtx): CljValue => {
  const scanner = ctx.scanner
  const token = scanner.peek()
  if (!token) {
    throw new ReaderError(
      'Unexpected end of input while parsing metadata',
      scanner.position()
    )
  }
  scanner.advance() // consume Meta token

  skipDiscards(ctx)
  const metaForm = readForm(ctx)
  skipDiscards(ctx)
  const target = readForm(ctx)

  // Convert metaForm to a CljMap
  let metaEntries: [CljValue, CljValue][]
  if (is.keyword(metaForm)) {
    metaEntries = [[metaForm, v.boolean(true)]]
  } else if (is.map(metaForm)) {
    metaEntries = metaForm.entries
  } else if (is.symbol(metaForm)) {
    metaEntries = [[v.keyword(':tag'), metaForm]]
  } else {
    throw new ReaderError('Metadata must be a keyword, map, or symbol', token)
  }

  // Attach metadata to IMeta targets: symbols, lists, vectors, maps.
  if (
    is.symbol(target) ||
    is.list(target) ||
    is.vector(target) ||
    is.map(target)
  ) {
    const existingEntries = target.meta ? target.meta.entries : []
    const result = {
      ...target,
      meta: v.map([...existingEntries, ...metaEntries]),
    }
    // Spread drops non-enumerable properties like _pos — re-attach it.
    const pos = getPos(target)
    if (pos) setPos(result, pos)
    return result
  }
  return target
}

const readVarQuote = (ctx: ReaderCtx) => {
  const scanner = ctx.scanner
  const token = scanner.peek()
  if (!token) {
    throw new ReaderError(
      'Unexpected end of input while parsing var quote',
      scanner.position()
    )
  }
  scanner.advance() // consume VarQuote token
  skipDiscards(ctx)
  const value = readForm(ctx)
  return v.list([v.symbol('var'), value])
}

const readDeref = (ctx: ReaderCtx) => {
  const scanner = ctx.scanner
  const token = scanner.peek()
  if (!token) {
    throw new ReaderError(
      'Unexpected end of input while parsing deref',
      scanner.position()
    )
  }
  scanner.advance() // consume the Deref token
  skipDiscards(ctx)
  const value = readForm(ctx)
  if (!value) {
    throw new ReaderError(`Unexpected token: ${getTokenValue(token)}`, token)
  }
  return { kind: valueKeywords.list, value: [v.symbol('deref'), value] }
}

const readUnquoteSplicing = (ctx: ReaderCtx) => {
  const scanner = ctx.scanner
  const token = scanner.peek()
  if (!token) {
    throw new ReaderError(
      'Unexpected end of input while parsing unquote splicing',
      scanner.position()
    )
  }
  scanner.advance() // consume the unquote splicing token
  skipDiscards(ctx)
  const value = readForm(ctx)
  if (!value) {
    throw new ReaderError(`Unexpected token: ${getTokenValue(token)}`, token)
  }
  return v.list([v.symbol(tokenSymbols.UnquoteSplicing), value])
}

const isClosingToken = (token: Token) => {
  return (
    [
      tokenKeywords.RParen,
      tokenKeywords.RBracket,
      tokenKeywords.RBrace,
    ] as TokenKinds[]
  ).includes(token.kind)
}

const collectionReader = (valueType: 'list' | 'vector', closeToken: string) => {
  return function (ctx: ReaderCtx) {
    const scanner = ctx.scanner
    const startToken = scanner.peek()
    if (!startToken) {
      throw new ReaderError(
        'Unexpected end of input while parsing collection',
        scanner.position()
      )
    }
    scanner.advance() // consume the opening token
    const values: CljValue[] = []
    let pairMatched = false
    let closingEnd: number | undefined
    while (!scanner.isAtEnd()) {
      skipDiscards(ctx) // consume any #_ discard forms before the next element
      const token = scanner.peek()
      if (!token) {
        break
      }
      if (isClosingToken(token) && token.kind !== closeToken) {
        throw new ReaderError(
          `Expected '${closeToken}' to close ${valueType} started at line ${startToken.start.line} column ${startToken.start.col}, but got '${getTokenValue(token)}' at line ${token.start.line} column ${token.start.col}`,
          token,
          { start: token.start.offset, end: token.end.offset }
        )
      }
      if (token.kind === closeToken) {
        closingEnd = token.end.offset
        scanner.advance() // consume the closing token
        pairMatched = true
        break
      }
      const value = readForm(ctx)
      values.push(value)
    }
    if (!pairMatched) {
      throw new ReaderError(
        `Unmatched ${valueType} started at line ${startToken.start.line} column ${startToken.start.col}`,
        scanner.peek()
      )
    }
    const result: CljValue = { kind: valueType, value: values }
    if (closingEnd !== undefined) {
      setPos(result, { start: startToken.start.offset, end: closingEnd })
    }
    return result
  }
}

const readList = collectionReader('list', tokenKeywords.RParen)

const readVector = collectionReader('vector', tokenKeywords.RBracket)

const readSet = (ctx: ReaderCtx) => {
  const scanner = ctx.scanner
  const startToken = scanner.peek()
  if (!startToken) {
    throw new ReaderError(
      'Unexpected end of input while parsing set',
      scanner.position()
    )
  }
  scanner.advance() // consume the SetStart token

  const values: CljValue[] = []
  let pairMatched = false
  let closingEnd: number | undefined
  while (!scanner.isAtEnd()) {
    skipDiscards(ctx) // consume any #_ discard forms before the next element
    const token = scanner.peek()
    if (!token) break
    if (isClosingToken(token) && token.kind !== tokenKeywords.RBrace) {
      throw new ReaderError(
        `Expected '}' to close set started at line ${startToken.start.line} column ${startToken.start.col}, but got '${getTokenValue(token)}' at line ${token.start.line} column ${token.start.col}`,
        token,
        { start: token.start.offset, end: token.end.offset }
      )
    }
    if (token.kind === tokenKeywords.RBrace) {
      closingEnd = token.end.offset
      scanner.advance() // consume the closing brace
      pairMatched = true
      break
    }
    values.push(readForm(ctx))
  }
  if (!pairMatched) {
    throw new ReaderError(
      `Unmatched set started at line ${startToken.start.line} column ${startToken.start.col}`,
      scanner.peek()
    )
  }

  // Deduplicate using isEqual
  const deduped: CljValue[] = []
  for (const v of values) {
    if (!deduped.some((existing) => is.equal(existing, v))) {
      deduped.push(v)
    }
  }

  const result = v.set(deduped)
  if (closingEnd !== undefined) {
    setPos(result, { start: startToken.start.offset, end: closingEnd })
  }
  return result
}

const readSymbol = (scanner: TokenScanner) => {
  const token = scanner.peek()
  if (!token) {
    throw new ReaderError('Unexpected end of input', scanner.position())
  }
  if (token.kind !== tokenKeywords.Symbol) {
    throw new ReaderError(`Unexpected token: ${getTokenValue(token)}`, token, {
      start: token.start.offset,
      end: token.end.offset,
    })
  }
  scanner.advance()
  let val: CljValue
  switch (token.value) {
    case 'true':
    case 'false':
      val = v.boolean(token.value === 'true')
      break
    case 'nil':
      val = v.nil()
      break
    default:
      val = v.symbol(token.value)
  }
  setPos(val, { start: token.start.offset, end: token.end.offset })
  return val
}

const readMap = (ctx: ReaderCtx) => {
  const scanner = ctx.scanner
  const startToken = scanner.peek()
  if (!startToken) {
    throw new ReaderError(
      'Unexpected end of input while parsing map',
      scanner.position()
    )
  }
  let pairMatched = false
  let closingEnd: number | undefined
  scanner.advance() // consume the opening brace
  const entries: [CljValue, CljValue][] = []
  while (!scanner.isAtEnd()) {
    skipDiscards(ctx) // consume any #_ forms before reading the key
    const token = scanner.peek()
    if (!token) {
      break
    }
    if (isClosingToken(token) && token.kind !== tokenKeywords.RBrace) {
      throw new ReaderError(
        `Expected '}' to close map started at line ${startToken.start.line} column ${startToken.start.col}, but got '${token.kind}' at line ${token.start.line} column ${token.start.col}`,
        token,
        { start: token.start.offset, end: token.end.offset }
      )
    }
    if (token.kind === tokenKeywords.RBrace) {
      closingEnd = token.end.offset
      scanner.advance() // consume the closing brace
      pairMatched = true
      break
    }
    const key = readForm(ctx)
    skipDiscards(ctx) // consume any #_ forms before reading the value
    const nextToken = scanner.peek()
    if (!nextToken) {
      throw new ReaderError(
        `Expected value in map started at line ${startToken.start.line} column ${startToken.start.col}, but got end of input`,
        scanner.position()
      )
    }
    if (nextToken.kind === tokenKeywords.RBrace) {
      throw new ReaderError(
        `Map started at line ${startToken.start.line} column ${startToken.start.col} has key ${key.kind} but no value`,
        scanner.position()
      )
    }
    const value = readForm(ctx)
    if (!value) {
      break
    }
    entries.push([key, value])
  }
  if (!pairMatched) {
    throw new ReaderError(
      `Unmatched map started at line ${startToken.start.line} column ${startToken.start.col}`,
      scanner.peek()
    )
  }
  const result: CljValue = { kind: valueKeywords.map, entries }
  if (closingEnd !== undefined) {
    setPos(result, { start: startToken.start.offset, end: closingEnd })
  }
  return result
}

type AnonFnParams = { maxIndex: number; hasRest: boolean }

// Walks the AST and collects which % params are referenced.
function collectAnonFnParams(forms: CljValue[]): AnonFnParams {
  let maxIndex = 0
  let hasRest = false

  function walk(form: CljValue): void {
    switch (form.kind) {
      case 'symbol': {
        const name = form.name
        if (name === '%' || name === '%1') {
          maxIndex = Math.max(maxIndex, 1)
        } else if (/^%[2-9]$/.test(name)) {
          maxIndex = Math.max(maxIndex, parseInt(name[1]))
        } else if (name === '%&') {
          hasRest = true
        }
        break
      }
      case 'list':
      case 'vector':
        for (const child of form.value) walk(child)
        break
      case 'map':
        for (const [k, v] of form.entries) {
          walk(k)
          walk(v)
        }
        break
      default:
        break
    }
  }

  for (const form of forms) walk(form)
  return { maxIndex, hasRest }
}

// Recursively substitutes % param symbols with their generated names.
function substituteAnonFnParams(form: CljValue): CljValue {
  switch (form.kind) {
    case 'symbol': {
      const name = form.name
      if (name === '%' || name === '%1') return v.symbol('p1')
      if (/^%[2-9]$/.test(name)) return v.symbol(`p${name[1]}`)
      if (name === '%&') return v.symbol('rest')
      return form
    }
    case 'list':
      return { ...form, value: form.value.map(substituteAnonFnParams) }
    case 'vector':
      return { ...form, value: form.value.map(substituteAnonFnParams) }
    case 'map':
      return {
        ...form,
        entries: form.entries.map(
          ([k, v]) =>
            [substituteAnonFnParams(k), substituteAnonFnParams(v)] as [
              CljValue,
              CljValue,
            ]
        ),
      }
    default:
      return form
  }
}

const readAnonFn = (ctx: ReaderCtx) => {
  const scanner = ctx.scanner
  const startToken = scanner.peek()
  if (!startToken) {
    throw new ReaderError(
      'Unexpected end of input while parsing anonymous function',
      scanner.position()
    )
  }
  scanner.advance() // consume AnonFnStart

  const bodyForms: CljValue[] = []
  let pairMatched = false
  let closingEnd: number | undefined
  while (!scanner.isAtEnd()) {
    skipDiscards(ctx) // consume any #_ forms before the next body element
    const token = scanner.peek()
    if (!token) break
    if (isClosingToken(token) && token.kind !== tokenKeywords.RParen) {
      throw new ReaderError(
        `Expected ')' to close anonymous function started at line ${startToken.start.line} column ${startToken.start.col}, but got '${getTokenValue(token)}' at line ${token.start.line} column ${token.start.col}`,
        token,
        { start: token.start.offset, end: token.end.offset }
      )
    }
    if (token.kind === tokenKeywords.RParen) {
      closingEnd = token.end.offset
      scanner.advance() // consume closing ')'
      pairMatched = true
      break
    }
    if (token.kind === tokenKeywords.AnonFnStart) {
      throw new ReaderError(
        'Nested anonymous functions (#(...)) are not allowed',
        token,
        { start: token.start.offset, end: token.end.offset }
      )
    }
    bodyForms.push(readForm(ctx))
  }
  if (!pairMatched) {
    throw new ReaderError(
      `Unmatched anonymous function started at line ${startToken.start.line} column ${startToken.start.col}`,
      scanner.peek()
    )
  }

  // The entire body content is a single implicit list — #(* 2 %) ≡ (fn [p1] (* 2 p1))
  const bodyList: CljValue = v.list(bodyForms)

  const { maxIndex, hasRest } = collectAnonFnParams([bodyList])

  const paramSymbols: CljValue[] = []
  for (let i = 1; i <= maxIndex; i++) {
    paramSymbols.push(v.symbol(`p${i}`))
  }
  if (hasRest) {
    paramSymbols.push(v.symbol('&'))
    paramSymbols.push(v.symbol('rest'))
  }

  const substitutedBody = substituteAnonFnParams(bodyList)

  const result = v.list([
    v.symbol('fn'),
    v.vector(paramSymbols),
    substitutedBody,
  ])
  if (closingEnd !== undefined) {
    setPos(result, { start: startToken.start.offset, end: closingEnd })
  }
  return result
}

// Strips leading standalone inline-flag groups (?i), (?m), (?s) from the raw
// regex pattern and returns them as JS RegExp flags. (?x) is not supported in
// JS and will throw. (?:...) non-capturing groups are left alone.
function extractInlineFlags(raw: string): { pattern: string; flags: string } {
  let remaining = raw
  let flags = ''
  const flagGroupRe = /^\(\?([imsx]+)\)/
  let m: RegExpExecArray | null
  while ((m = flagGroupRe.exec(remaining)) !== null) {
    for (const f of m[1]) {
      if (f === 'x') {
        throw new ReaderError(
          'Regex flag (?x) (verbose mode) has no JavaScript equivalent and is not supported',
          null
        )
      }
      if (!flags.includes(f)) flags += f
    }
    remaining = remaining.slice(m[0].length)
  }
  return { pattern: remaining, flags }
}

const readRegex = (ctx: ReaderCtx): CljValue => {
  const scanner = ctx.scanner
  const token = scanner.peek()
  if (!token || token.kind !== tokenKeywords.Regex) {
    throw new ReaderError('Expected regex token', scanner.position())
  }
  scanner.advance()
  const { pattern, flags } = extractInlineFlags(token.value)
  const val = v.regex(pattern, flags)
  setPos(val, { start: token.start.offset, end: token.end.offset })
  return val
}

function readForm(ctx: ReaderCtx): CljValue {
  const scanner = ctx.scanner
  const token = scanner.peek()
  if (!token) {
    throw new ReaderError('Unexpected end of input', scanner.position())
  }

  // EDN mode: reject Clojure-specific reader macros
  if (ctx.ednMode) {
    switch (token.kind) {
      case tokenKeywords.Quote:
        throw new ReaderError(
          `Quote (') is not valid in EDN`,
          token, { start: token.start.offset, end: token.end.offset }
        )
      case tokenKeywords.Quasiquote:
        throw new ReaderError(
          'Syntax-quote (`) is not valid in EDN',
          token, { start: token.start.offset, end: token.end.offset }
        )
      case tokenKeywords.Unquote:
        throw new ReaderError(
          'Unquote (~) is not valid in EDN',
          token, { start: token.start.offset, end: token.end.offset }
        )
      case tokenKeywords.UnquoteSplicing:
        throw new ReaderError(
          'Unquote-splicing (~@) is not valid in EDN',
          token, { start: token.start.offset, end: token.end.offset }
        )
      case tokenKeywords.AnonFnStart:
        throw new ReaderError(
          'Anonymous function (#(...)) is not valid in EDN',
          token, { start: token.start.offset, end: token.end.offset }
        )
      case tokenKeywords.Regex:
        throw new ReaderError(
          'Regex literal (#"...") is not valid in EDN',
          token, { start: token.start.offset, end: token.end.offset }
        )
      case tokenKeywords.Deref:
        throw new ReaderError(
          'Deref (@) is not valid in EDN',
          token, { start: token.start.offset, end: token.end.offset }
        )
      case tokenKeywords.VarQuote:
        throw new ReaderError(
          "Var-quote (#') is not valid in EDN",
          token, { start: token.start.offset, end: token.end.offset }
        )
      case tokenKeywords.Meta:
        throw new ReaderError(
          'Metadata (^) is not valid in EDN',
          token, { start: token.start.offset, end: token.end.offset }
        )
      case tokenKeywords.NsMapPrefix:
        throw new ReaderError(
          'Namespaced map (#:ns{...}) is not valid in EDN',
          token, { start: token.start.offset, end: token.end.offset }
        )
    }
  }

  switch (token.kind) {
    case tokenKeywords.String:
    case tokenKeywords.Number:
    case tokenKeywords.Keyword:
    case tokenKeywords.Symbol:
    case tokenKeywords.Character:
      return readAtom(ctx)
    case tokenKeywords.LParen:
      return readList(ctx)
    case tokenKeywords.LBrace:
      return readMap(ctx)
    case tokenKeywords.LBracket:
      return readVector(ctx)
    case tokenKeywords.Quote:
      return readQuote(ctx)
    case tokenKeywords.Quasiquote:
      return readQuasiquote(ctx)
    case tokenKeywords.Unquote:
      return readUnquote(ctx)
    case tokenKeywords.UnquoteSplicing:
      return readUnquoteSplicing(ctx)
    case tokenKeywords.AnonFnStart:
      return readAnonFn(ctx)
    case tokenKeywords.SetStart:
      return readSet(ctx)
    case tokenKeywords.Deref:
      return readDeref(ctx)
    case tokenKeywords.VarQuote:
      return readVarQuote(ctx)
    case tokenKeywords.Meta:
      return readMeta(ctx)
    case tokenKeywords.Regex:
      return readRegex(ctx)
    case tokenKeywords.NsMapPrefix:
      return readNsMap(ctx)
    case tokenKeywords.ReaderTag:
      return readTaggedLiteral(ctx)
    case tokenKeywords.Discard:
      // Safety guard — skipDiscards should be called before readForm in all
      // loop contexts, so a bare Discard token here is unexpected.
      throw new ReaderError(
        `Unexpected #_ discard in this context`,
        token,
        { start: token.start.offset, end: token.end.offset }
      )
    default:
      throw new ReaderError(
        `Unexpected token: ${getTokenValue(token)} at line ${token.start.line} column ${token.start.col}`,
        token,
        { start: token.start.offset, end: token.end.offset }
      )
  }
}

// Resolves a #:ns{...} prefix string to its canonical namespace name.
// ':car'   → 'car'           (literal namespace name)
// '::car'  → aliases['car']  (same alias resolution as ::kw)
// '::'     → ctx.namespace   (current namespace)
function resolveNsMapNs(prefix: string, ctx: ReaderCtx, token: Token): string {
  if (prefix.startsWith('::')) {
    const alias = prefix.slice(2)
    if (!alias) return ctx.namespace
    const resolved = ctx.aliases.get(alias)
    if (!resolved) {
      throw new ReaderError(
        `No namespace alias '${alias}' found for #${prefix}{...}`,
        token,
        { start: token.start.offset, end: token.end.offset }
      )
    }
    return resolved
  }
  return prefix.slice(1) // strip leading ':'
}

const readNsMap = (ctx: ReaderCtx): CljValue => {
  const scanner = ctx.scanner
  const prefixToken = scanner.peek()
  if (!prefixToken || prefixToken.kind !== tokenKeywords.NsMapPrefix) {
    throw new ReaderError('Expected namespace map prefix', scanner.position())
  }
  scanner.advance() // consume NsMapPrefix token

  const ns = resolveNsMapNs(prefixToken.value, ctx, prefixToken)

  // Read the following form — must be a map literal {}.
  const mapForm = readForm(ctx)
  if (mapForm.kind !== 'map') {
    throw new ReaderError(
      `#:${ns}{...} requires a map literal, got ${mapForm.kind}`,
      prefixToken,
      { start: prefixToken.start.offset, end: prefixToken.end.offset }
    )
  }

  // Qualify all unqualified keyword keys with the resolved namespace.
  const qualifiedEntries: [CljValue, CljValue][] = mapForm.entries.map(
    ([key, val]) => {
      if (key.kind === 'keyword') {
        const localName = key.name.slice(1) // strip ':'
        if (!localName.includes('/')) {
          return [v.keyword(`:${ns}/${localName}`), val] as [CljValue, CljValue]
        }
      }
      return [key, val] as [CljValue, CljValue]
    }
  )

  return v.map(qualifiedEntries)
}

// initializes the scanner and parses the forms, returning a tree of values
export function readForms(
  input: Token[],
  currentNs: string = 'user',
  aliases: Map<string, string> = new Map()
): CljValue[] {
  const withoutComments = input.filter((t) => t.kind !== tokenKeywords.Comment)
  const scanner = makeTokenScanner(withoutComments)
  const ctx: ReaderCtx = {
    scanner,
    namespace: currentNs,
    aliases,
  }
  const values: CljValue[] = []
  while (!scanner.isAtEnd()) {
    skipDiscards(ctx)
    if (scanner.isAtEnd()) break
    values.push(readForm(ctx))
  }
  return values
}

// ---------------------------------------------------------------------------
// EDN read options — passed by edn-read-string* when calling readFormsEdn.
// ---------------------------------------------------------------------------
export type EdnReadOptions = {
  dataReaders?: Map<string, (form: CljValue) => CljValue>
  defaultDataReader?: (tagName: string, form: CljValue) => CljValue
}

// readFormsEdn — EDN-mode reader used by clojure.edn/read-string.
// Rejects Clojure-specific syntax and handles reader tags via dataReaders.
export function readFormsEdn(
  input: Token[],
  options?: EdnReadOptions
): CljValue[] {
  const withoutComments = input.filter((t) => t.kind !== tokenKeywords.Comment)
  const scanner = makeTokenScanner(withoutComments)
  const ctx: ReaderCtx = {
    scanner,
    namespace: 'user',
    aliases: new Map(),
    ednMode: true,
    dataReaders: options?.dataReaders,
    defaultDataReader: options?.defaultDataReader,
  }
  const values: CljValue[] = []
  while (!scanner.isAtEnd()) {
    skipDiscards(ctx)
    if (scanner.isAtEnd()) break
    values.push(readForm(ctx))
  }
  return values
}
