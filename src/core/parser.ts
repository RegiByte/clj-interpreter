import { cljBoolean, cljNil, cljSymbol } from './factories'
import { getTokenValue } from './tokenizer'
import { valueKeywords, tokenKeywords, type Token } from './types'
import type { CljValue, TokenKinds } from './types'

export function makeScanner(input: Token[]) {
  let offset = 0

  const api = {
    peek: (ahead: number = 0) => {
      const idx = offset + ahead
      if (idx >= input.length) return null
      return input[idx]
    },
    advance: () => {
      if (offset >= input.length) return null
      const token = input[offset]
      offset++
      return token
    },
    isAtEnd: () => {
      return offset >= input.length
    },
    position: () => {
      return {
        offset,
      }
    },
    consumeWhile(predicate: (token: Token) => boolean) {
      const buffer: Token[] = []
      while (!api.isAtEnd() && predicate(api.peek()!)) {
        buffer.push(api.advance()!)
      }
      return buffer
    },
    consumeN(n: number) {
      for (let i = 0; i < n; i++) {
        api.advance()
      }
    },
  }

  return api
}

export type Scanner = ReturnType<typeof makeScanner>

export class ParserError extends Error {
  context: any
  constructor(message: string, context: any) {
    super(message)
    this.name = 'ParserError'
    this.context = context
  }
}

function parseAtom(scanner: Scanner): CljValue {
  const token = scanner.peek()
  if (!token) {
    throw new ParserError('Unexpected end of input', scanner.position())
  }
  switch (token.kind) {
    case tokenKeywords.Symbol:
      return parseSymbol(scanner)
    case tokenKeywords.String:
      scanner.advance() // consume the string token
      return { kind: 'string', value: token.value }
    case tokenKeywords.Number:
      scanner.advance() // consume the number token
      return { kind: 'number', value: token.value }
    case tokenKeywords.Keyword:
      scanner.advance() // consume the keyword token
      return { kind: 'keyword', name: token.value }
  }
  throw new ParserError(`Unexpected token: ${token.kind}`, token)
}

const parseQuote = (scanner: Scanner) => {
  const token = scanner.peek()
  if (!token) {
    throw new ParserError(
      'Unexpected end of input while parsing quote',
      scanner.position()
    )
  }
  scanner.advance() // consume the quote token
  // quote returns a list with the quote symbol and the quoted value, which is the next form
  const value = parseForm(scanner)
  if (!value) {
    throw new ParserError(`Unexpected token: ${getTokenValue(token)}`, token)
  }
  return { kind: valueKeywords.list, value: [cljSymbol('quote'), value] }
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

const parseCollection = (
  scanner: Scanner,
  valueType: 'list' | 'vector',
  closeToken: string
) => {
  const startToken = scanner.peek()
  if (!startToken) {
    throw new ParserError(
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
      throw new ParserError(
        `Expected '${closeToken}' to close ${valueType} started at line ${startToken.start.line} column ${startToken.start.col}, but got '${getTokenValue(token)}' at line ${token.start.line} column ${token.start.col}`,
        token
      )
    }
    if (token.kind === closeToken) {
      scanner.advance() // consume the closing token
      pairMatched = true
      break
    }
    const value = parseForm(scanner)
    values.push(value)
  }
  if (!pairMatched) {
    throw new ParserError(
      `Unmatched ${valueType} started at line ${startToken.start.line} column ${startToken.start.col}`,
      scanner.peek()
    )
  }
  return { kind: valueType, value: values }
}

const parseList = (scanner: Scanner) => {
  return parseCollection(scanner, valueKeywords.list, tokenKeywords.RParen)
}

const parseVector = (scanner: Scanner) => {
  return parseCollection(scanner, valueKeywords.vector, tokenKeywords.RBracket)
}

const parseSymbol = (scanner: Scanner) => {
  const token = scanner.peek()
  if (!token) {
    throw new ParserError('Unexpected end of input', scanner.position())
  }
  if (token.kind !== tokenKeywords.Symbol) {
    throw new ParserError(`Unexpected token: ${getTokenValue(token)}`, token)
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

const parseMap = (scanner: Scanner) => {
  const startToken = scanner.peek()
  if (!startToken) {
    throw new ParserError(
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
      throw new ParserError(
        `Expected '}' to close map started at line ${startToken.start.line} column ${startToken.start.col}, but got '${token.kind}' at line ${token.start.line} column ${token.start.col}`,
        token
      )
    }
    if (token.kind === tokenKeywords.Comment) {
      // This is an edge case, since comments are tokens, but not values, we need to ignore their existence in maps
      // to prevent them from being parsed as keys or values
      scanner.advance() // consume the comment token
      continue
    }
    if (token.kind === tokenKeywords.RBrace) {
      scanner.advance() // consume the closing brace
      pairMatched = true
      break
    }
    const key = parseForm(scanner)
    const nextToken = scanner.peek()
    if (!nextToken) {
      throw new ParserError(
        `Expected value in map started at line ${startToken.start.line} column ${startToken.start.col}, but got end of input`,
        scanner.position()
      )
    }
    if (nextToken.kind === tokenKeywords.RBrace) {
      throw new ParserError(
        `Map started at line ${startToken.start.line} column ${startToken.start.col} has key ${key.kind} but no value`,
        scanner.position()
      )
    }
    const value = parseForm(scanner)
    if (!value) {
      break
    }
    entries.push([key, value])
  }
  if (!pairMatched) {
    throw new ParserError(
      `Unmatched map started at line ${startToken.start.line} column ${startToken.start.col}`,
      scanner.peek()
    )
  }
  return { kind: valueKeywords.map, entries }
}

const parseComment = (scanner: Scanner) => {
  const token = scanner.peek()
  if (!token) {
    throw new ParserError('Unexpected end of input', scanner.position())
  }
  if (token.kind !== tokenKeywords.Comment) {
    throw new ParserError(`Unexpected token: ${getTokenValue(token)}`, token)
  }

  scanner.advance() // consume the comment token
  return { kind: valueKeywords.comment, value: token.value }
}

function parseForm(scanner: Scanner): CljValue {
  const token = scanner.peek()
  if (!token) {
    throw new ParserError('Unexpected end of input', scanner.position())
  }
  switch (token.kind) {
    case tokenKeywords.String:
    case tokenKeywords.Number:
    case tokenKeywords.Keyword:
    case tokenKeywords.Symbol:
      return parseAtom(scanner)
    case tokenKeywords.LParen:
      return parseList(scanner)
    case tokenKeywords.LBrace:
      return parseMap(scanner)
    case tokenKeywords.LBracket:
      return parseVector(scanner)
    case tokenKeywords.Quote:
      return parseQuote(scanner)
    case tokenKeywords.Comment:
      return parseComment(scanner)
    default:
      throw new ParserError(
        `Unexpected token: ${getTokenValue(token)} at line ${token.start.line} column ${token.start.col}`,
        token
      )
  }
}

// initializes the scanner and parses the forms, returning a tree of values
export function parseForms(input: Token[]): CljValue[] {
  const scanner = makeScanner(input)
  const values: CljValue[] = []
  while (!scanner.isAtEnd()) {
    values.push(parseForm(scanner))
  }
  return values
}
