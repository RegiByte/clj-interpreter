import { tokenKeywords, tokenSymbols, type Token } from './types'

const createCursor = (line: number, col: number, offset: number) => ({
  line,
  col,
  offset,
})
type Cursor = ReturnType<typeof createCursor>

export class TokenizerError extends Error {
  context: any
  constructor(message: string, context: any) {
    super(message)
    this.name = 'TokenizerError'
    this.context = context
  }
}

export type TokensResult = {
  tokens: Token[]
  error?: TokenizerError
  scanner: Scanner
}

const isNewline = (char: string) => char === '\n'
const isWhitespace = (char: string) =>
  [' ', ',', '\n', '\r', '\t'].includes(char)
const isComment = (char: string) => char === ';'
const isLParen = (char: string) => char === '('
const isRParen = (char: string) => char === ')'
const isLBracket = (char: string) => char === '['
const isRBracket = (char: string) => char === ']'
const isLBrace = (char: string) => char === '{'
const isRBrace = (char: string) => char === '}'
const isDoubleQuote = (char: string) => char === '"'
const isSingleQuote = (char: string) => char === "'"
const isNumber = (char: string) => {
  const parsed = parseInt(char)
  if (isNaN(parsed)) {
    return false
  }
  return parsed >= 0 && parsed <= 9
}
const isDot = (char: string) => char === '.'
const isKeywordStart = (char: string) => char === ':'

const isDelimiter = (char: string) =>
  isLParen(char) ||
  isRParen(char) ||
  isLBracket(char) ||
  isRBracket(char) ||
  isLBrace(char) ||
  isRBrace(char)

const parseWhitespace = (scanner: Scanner): Token => {
  const start = scanner.position()
  scanner.consumeWhile(isWhitespace)
  return {
    kind: tokenKeywords.Whitespace,
    start,
    end: scanner.position(),
  }
}

const parseComment = (scanner: Scanner): Token => {
  const start = scanner.position()
  scanner.advance() // skip the `;`
  const value = scanner.consumeWhile((char) => !isNewline(char))
  if (!scanner.isAtEnd() && scanner.peek() === '\n') {
    scanner.advance() // consume the trailing newline
  }
  return {
    kind: tokenKeywords.Comment,
    value,
    start,
    end: scanner.position(),
  }
}

const parseString = (scanner: Scanner): Token => {
  const start = scanner.position()
  scanner.advance() // consume opening "
  const buffer: string[] = []
  let foundClosingQuote = false
  while (!scanner.isAtEnd()) {
    const ch = scanner.peek()!
    if (ch === '\\') {
      scanner.advance()! // consume the backslash
      const nextChar = scanner.peek()!
      switch (nextChar) {
        case '"':
          buffer.push('"')
          break
        case '\\':
          buffer.push('\\')
          break
        case 'n':
          buffer.push('\n')
          break
        case 'r':
          buffer.push('\r')
          break
        case 't':
          buffer.push('\t')
          break
        default:
          buffer.push(nextChar)
      }

      if (!scanner.isAtEnd()) {
        scanner.advance() // consume the escaped char
      }
      continue
    }
    if (ch === '"') {
      scanner.advance() // consume closing "
      foundClosingQuote = true
      break
    }
    buffer.push(scanner.advance()!)
  }
  if (!foundClosingQuote) {
    throw new TokenizerError(
      `Unterminated string detected at ${start.offset}`,
      scanner.position()
    )
  }
  return {
    kind: tokenKeywords.String,
    value: buffer.join(''),
    start,
    end: scanner.position(),
  }
}

const parseKeyword = (scanner: Scanner): Token => {
  const start = scanner.position()
  const value = scanner.consumeWhile(
    (char) =>
      isKeywordStart(char) ||
      (!isWhitespace(char) && !isDelimiter(char) && !isComment(char))
  )
  return {
    kind: tokenKeywords.Keyword,
    value,
    start,
    end: scanner.position(),
  }
}

const parseNumber = (scanner: Scanner): Token => {
  const start = scanner.position()
  let value = ''
  if (scanner.peek() === '-') {
    value += scanner.advance()
  }
  value += scanner.consumeWhile(isNumber)
  if (
    !scanner.isAtEnd() &&
    scanner.peek() === '.' &&
    scanner.peek(1) !== null &&
    isNumber(scanner.peek(1)!)
  ) {
    value += scanner.advance()! // consume '.'
    value += scanner.consumeWhile(isNumber)
  }
  if (!scanner.isAtEnd() && isDot(scanner.peek()!)) {
    throw new TokenizerError(
      `Invalid number format at line ${start.line} column ${start.col}: "${value}${scanner.consumeWhile((ch) => !isWhitespace(ch) && !isDelimiter(ch))}"`,
      { start, end: scanner.position() }
    )
  }
  return {
    kind: tokenKeywords.Number,
    value: Number(value),
    start,
    end: scanner.position(),
  }
}

const parseSymbol = (scanner: Scanner): Token => {
  const start = scanner.position()
  const value = scanner.consumeWhile(
    (char) => !isWhitespace(char) && !isDelimiter(char) && !isComment(char)
  )

  return {
    kind: tokenKeywords.Symbol,
    value,
    start,
    end: scanner.position(),
  }
}

function parseNextToken(scanner: Scanner): Token {
  const char = scanner.peek()!
  if (isWhitespace(scanner.peek()!)) {
    return parseWhitespace(scanner)
  }
  if (isComment(scanner.peek()!)) {
    return parseComment(scanner)
  }
  if (isLParen(char)) {
    const start = scanner.position()
    scanner.advance()

    return {
      kind: tokenKeywords.LParen,
      value: tokenSymbols.LParen,
      start,
      end: scanner.position(),
    }
  }
  if (isRParen(char)) {
    const start = scanner.position()
    scanner.advance()

    return {
      kind: tokenKeywords.RParen,
      value: tokenSymbols.RParen,
      start,
      end: scanner.position(),
    }
  }
  if (isLBracket(char)) {
    const start = scanner.position()
    scanner.advance()

    return {
      kind: tokenKeywords.LBracket,
      value: tokenSymbols.LBracket,
      start,
      end: scanner.position(),
    }
  }
  if (isRBracket(char)) {
    const start = scanner.position()
    scanner.advance()

    return {
      kind: tokenKeywords.RBracket,
      value: tokenSymbols.RBracket,
      start,
      end: scanner.position(),
    }
  }
  if (isLBrace(char)) {
    const start = scanner.position()
    scanner.advance()

    return {
      kind: tokenKeywords.LBrace,
      value: tokenSymbols.LBrace,
      start,
      end: scanner.position(),
    }
  }
  if (isRBrace(char)) {
    const start = scanner.position()
    scanner.advance()

    return {
      kind: tokenKeywords.RBrace,
      value: tokenSymbols.RBrace,
      start,
      end: scanner.position(),
    }
  }
  if (isDoubleQuote(char)) {
    return parseString(scanner)
  }
  if (isKeywordStart(char)) {
    return parseKeyword(scanner)
  }
  if (
    isNumber(char) ||
    (char === '-' && scanner.peek(1) !== null && isNumber(scanner.peek(1)!))
  ) {
    return parseNumber(scanner)
  }
  if (isSingleQuote(char)) {
    const start = scanner.position()
    scanner.advance()

    return {
      kind: tokenKeywords.Quote,
      value: tokenSymbols.Quote,
      start,
      end: scanner.position(),
    }
  }

  // catch-all symbol parsing
  return parseSymbol(scanner)
}

export function parseAllTokens(scanner: Scanner): TokensResult {
  const tokens: Token[] = []
  let error: TokenizerError | undefined = undefined

  try {
    while (!scanner.isAtEnd()) {
      const result = parseNextToken(scanner)

      if (!result) {
        break
      }

      // Ignore whitespace tokens
      if (result.kind === tokenKeywords.Whitespace) {
        continue
      }

      tokens.push(result)
    }
  } catch (e) {
    error = e as TokenizerError
  }

  const parsed: TokensResult = {
    tokens,
    scanner,
    error,
  }
  return parsed
}

export function makeScanner(input: string) {
  const cursor = createCursor(0, 0, 0)

  const api = {
    peek: (ahead: number = 0) => {
      const idx = cursor.offset + ahead
      if (idx >= input.length) return null
      return input[idx]
    },
    advance: () => {
      if (cursor.offset >= input.length) return null
      const ch = input[cursor.offset]
      cursor.offset++
      if (ch === '\n') {
        cursor.line++
        cursor.col = 0
      } else {
        cursor.col++
      }
      return ch
    },
    isAtEnd: () => {
      return cursor.offset >= input.length
    },
    position: (): Cursor => {
      return {
        line: cursor.line,
        col: cursor.col,
        offset: cursor.offset,
      }
    },
    consumeWhile(predicate: (char: string) => boolean) {
      const buffer: string[] = []
      while (!api.isAtEnd() && predicate(api.peek()!)) {
        buffer.push(api.advance()!)
      }
      return buffer.join('')
    },
  }

  return api
}

export type Scanner = ReturnType<typeof makeScanner>

export function tokenize(input: string): Token[] {
  const inputLength = input.length
  const scanner = makeScanner(input)
  const tokensResult = parseAllTokens(scanner)
  if (tokensResult.error) {
    throw tokensResult.error
  }
  if (tokensResult.scanner.position().offset !== inputLength) {
    throw new TokenizerError(
      `Unexpected end of input, expected ${inputLength} characters, got ${tokensResult.scanner.position().offset}`,
      tokensResult.scanner.position()
    )
  }
  return tokensResult.tokens
}

export function getTokenValue(token: Token): string | number {
  if ('value' in token) {
    return token.value
  }
  return ''
}
