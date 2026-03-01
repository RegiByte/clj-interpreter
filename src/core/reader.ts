import { ReaderError } from './errors'
import { cljBoolean, cljList, cljNil, cljSymbol, cljVector } from './factories'
import { makeTokenScanner, type TokenScanner } from './scanners'
import { getTokenValue } from './tokenizer'
import { valueKeywords, tokenKeywords, type Token } from './types'
import type { CljValue, TokenKinds } from './types'

function readAtom(ctx: ReaderCtx): CljValue {
  const scanner = ctx.scanner
  const token = scanner.peek()
  if (!token) {
    throw new ReaderError('Unexpected end of input', scanner.position())
  }
  switch (token.kind) {
    case tokenKeywords.Symbol:
      return readSymbol(scanner)
    case tokenKeywords.String:
      scanner.advance() // consume the string token
      return { kind: 'string', value: token.value }
    case tokenKeywords.Number:
      scanner.advance() // consume the number token
      return { kind: 'number', value: token.value }
    case tokenKeywords.Keyword: {
      scanner.advance() // consume the keyword token
      const kwName = token.value
      if (kwName.startsWith('::')) {
        const rest = kwName.slice(2)
        if (rest.includes('/')) {
          throw new ReaderError(
            '::alias/keyword syntax is not yet supported',
            token
          )
        }
        return { kind: 'keyword', name: `:${ctx.namespace}/${rest}` }
      }
      return { kind: 'keyword', name: kwName }
    }
  }
  throw new ReaderError(`Unexpected token: ${token.kind}`, token)
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
  // quote returns a list with the quote symbol and the quoted value, which is the next form
  const value = readForm(ctx)
  if (!value) {
    throw new ReaderError(`Unexpected token: ${getTokenValue(token)}`, token)
  }
  return { kind: valueKeywords.list, value: [cljSymbol('quote'), value] }
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
  const value = readForm(ctx)
  if (!value) {
    throw new ReaderError(`Unexpected token: ${getTokenValue(token)}`, token)
  }
  return { kind: valueKeywords.list, value: [cljSymbol('quasiquote'), value] }
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
  const value = readForm(ctx)
  if (!value) {
    throw new ReaderError(`Unexpected token: ${getTokenValue(token)}`, token)
  }
  return { kind: valueKeywords.list, value: [cljSymbol('unquote'), value] }
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
  const value = readForm(ctx)
  if (!value) {
    throw new ReaderError(`Unexpected token: ${getTokenValue(token)}`, token)
  }
  return {
    kind: valueKeywords.list,
    value: [cljSymbol('unquote-splicing'), value],
  }
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
    while (!scanner.isAtEnd()) {
      const token = scanner.peek()
      if (!token) {
        break
      }
      if (isClosingToken(token) && token.kind !== closeToken) {
        throw new ReaderError(
          `Expected '${closeToken}' to close ${valueType} started at line ${startToken.start.line} column ${startToken.start.col}, but got '${getTokenValue(token)}' at line ${token.start.line} column ${token.start.col}`,
          token
        )
      }
      if (token.kind === closeToken) {
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
    return { kind: valueType, value: values }
  }
}

const readList = collectionReader('list', tokenKeywords.RParen)

const readVector = collectionReader('vector', tokenKeywords.RBracket)

const readSymbol = (scanner: TokenScanner) => {
  const token = scanner.peek()
  if (!token) {
    throw new ReaderError('Unexpected end of input', scanner.position())
  }
  if (token.kind !== tokenKeywords.Symbol) {
    throw new ReaderError(`Unexpected token: ${getTokenValue(token)}`, token)
  }
  scanner.advance()
  switch (token.value) {
    case 'true':
    case 'false':
      return cljBoolean(token.value === 'true')
    case 'nil':
      return cljNil()
    default:
      return cljSymbol(token.value)
  }
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
  scanner.advance() // consume the opening brace
  const entries: [CljValue, CljValue][] = []
  while (!scanner.isAtEnd()) {
    const token = scanner.peek()
    if (!token) {
      break
    }
    if (isClosingToken(token) && token.kind !== tokenKeywords.RBrace) {
      throw new ReaderError(
        `Expected '}' to close map started at line ${startToken.start.line} column ${startToken.start.col}, but got '${token.kind}' at line ${token.start.line} column ${token.start.col}`,
        token
      )
    }
    if (token.kind === tokenKeywords.RBrace) {
      scanner.advance() // consume the closing brace
      pairMatched = true
      break
    }
    const key = readForm(ctx)
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
  return { kind: valueKeywords.map, entries }
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
      if (name === '%' || name === '%1') return cljSymbol('p1')
      if (/^%[2-9]$/.test(name)) return cljSymbol(`p${name[1]}`)
      if (name === '%&') return cljSymbol('rest')
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
  while (!scanner.isAtEnd()) {
    const token = scanner.peek()
    if (!token) break
    if (isClosingToken(token) && token.kind !== tokenKeywords.RParen) {
      throw new ReaderError(
        `Expected ')' to close anonymous function started at line ${startToken.start.line} column ${startToken.start.col}, but got '${getTokenValue(token)}' at line ${token.start.line} column ${token.start.col}`,
        token
      )
    }
    if (token.kind === tokenKeywords.RParen) {
      scanner.advance() // consume closing ')'
      pairMatched = true
      break
    }
    if (token.kind === tokenKeywords.AnonFnStart) {
      throw new ReaderError(
        'Nested anonymous functions (#(...)) are not allowed',
        token
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
  const bodyList: CljValue = { kind: 'list', value: bodyForms }

  const { maxIndex, hasRest } = collectAnonFnParams([bodyList])

  const paramSymbols: CljValue[] = []
  for (let i = 1; i <= maxIndex; i++) {
    paramSymbols.push(cljSymbol(`p${i}`))
  }
  if (hasRest) {
    paramSymbols.push(cljSymbol('&'))
    paramSymbols.push(cljSymbol('rest'))
  }

  const substitutedBody = substituteAnonFnParams(bodyList)

  return cljList([cljSymbol('fn'), cljVector(paramSymbols), substitutedBody])
}

function readForm(ctx: ReaderCtx): CljValue {
  const scanner = ctx.scanner
  const token = scanner.peek()
  if (!token) {
    throw new ReaderError('Unexpected end of input', scanner.position())
  }
  switch (token.kind) {
    case tokenKeywords.String:
    case tokenKeywords.Number:
    case tokenKeywords.Keyword:
    case tokenKeywords.Symbol:
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
    default:
      throw new ReaderError(
        `Unexpected token: ${getTokenValue(token)} at line ${token.start.line} column ${token.start.col}`,
        token
      )
  }
}

type ReaderCtx = {
  scanner: TokenScanner
  namespace: string
}

// initializes the scanner and parses the forms, returning a tree of values
export function readForms(
  input: Token[],
  currentNs: string = 'user'
): CljValue[] {
  const withoutComments = input.filter((t) => t.kind !== tokenKeywords.Comment)
  const scanner = makeTokenScanner(withoutComments)
  const ctx = {
    scanner,
    namespace: currentNs,
  }
  const values: CljValue[] = []
  while (!scanner.isAtEnd()) {
    values.push(readForm(ctx))
  }
  return values
}
