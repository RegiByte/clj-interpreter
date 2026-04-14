import { TokenizerError } from './errors'
import { makeCharScanner, type CharScanner } from './scanners'
import { tokenKeywords, tokenSymbols } from './keywords'
import type { Token } from './types'

export type TokensResult = {
  tokens: Token[]
  error?: TokenizerError
  scanner: CharScanner
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
const isBacktick = (char: string) => char === '`'
const isTilde = (char: string) => char === '~'
const isAt = (char: string) => char === '@'
const isNumber = (char: string) => {
  const parsed = parseInt(char)
  if (isNaN(parsed)) {
    return false
  }
  return parsed >= 0 && parsed <= 9
}
const isDot = (char: string) => char === '.'
const isKeywordStart = (char: string) => char === ':'
const isHash = (char: string) => char === '#'
const isCaret = (char: string) => char === '^'
const isBackslash = (char: string) => char === '\\'

const isDelimiter = (char: string) =>
  isLParen(char) ||
  isRParen(char) ||
  isLBracket(char) ||
  isRBracket(char) ||
  isLBrace(char) ||
  isRBrace(char) ||
  isBacktick(char) ||
  isSingleQuote(char) ||
  isAt(char) ||
  isCaret(char)

const parseWhitespace = (ctx: TokenizationContext): Token => {
  const scanner = ctx.scanner
  const start = scanner.position()
  scanner.consumeWhile(isWhitespace)
  return {
    kind: tokenKeywords.Whitespace,
    start,
    end: scanner.position(),
  }
}

const parseComment = (ctx: TokenizationContext): Token => {
  const scanner = ctx.scanner
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

const parseString = (ctx: TokenizationContext): Token => {
  const scanner = ctx.scanner
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

const parseKeyword = (ctx: TokenizationContext): Token => {
  const scanner = ctx.scanner
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

function isNumberToken(char: string, ctx: TokenizationContext) {
  const scanner = ctx.scanner
  const next = scanner.peek(1)
  return isNumber(char) || (char === '-' && next !== null && isNumber(next))
}
const parseNumber = (ctx: TokenizationContext): Token => {
  const scanner = ctx.scanner
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
  if (
    !scanner.isAtEnd() &&
    (scanner.peek() === 'e' || scanner.peek() === 'E')
  ) {
    value += scanner.advance()! // consume 'e' or 'E'
    if (
      !scanner.isAtEnd() &&
      (scanner.peek() === '+' || scanner.peek() === '-')
    ) {
      value += scanner.advance()! // consume optional sign
    }
    const exponentDigits = scanner.consumeWhile(isNumber)
    if (exponentDigits.length === 0) {
      throw new TokenizerError(
        `Invalid number format at line ${start.line} column ${start.col}: "${value}"`,
        { start, end: scanner.position() }
      )
    }
    value += exponentDigits
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

const parseSymbol = (ctx: TokenizationContext): Token => {
  const scanner = ctx.scanner
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

const parseDerefToken = (ctx: TokenizationContext): Token => {
  const scanner = ctx.scanner
  const start = scanner.position()
  scanner.advance() // consume '@'
  return { kind: 'Deref', start, end: scanner.position() }
}

const parseMetaToken = (ctx: TokenizationContext): Token => {
  const scanner = ctx.scanner
  const start = scanner.position()
  scanner.advance() // consume '^'
  return { kind: 'Meta', start, end: scanner.position() }
}

const parseRegexLiteral = (
  ctx: TokenizationContext,
  start: ReturnType<typeof ctx.scanner.position>
): Token => {
  const scanner = ctx.scanner
  scanner.advance() // consume opening '"'
  const buffer: string[] = []
  let foundClosingQuote = false
  while (!scanner.isAtEnd()) {
    const ch = scanner.peek()!
    if (ch === '\\') {
      scanner.advance() // consume backslash
      const next = scanner.peek()
      if (next === null) {
        throw new TokenizerError(
          `Unterminated regex literal at ${start.offset}`,
          scanner.position()
        )
      }
      if (next === '"') {
        // \" → " (only escape that terminates the literal meaning)
        buffer.push('"')
      } else {
        // All other \X sequences (\\, \d, \s, \n, etc.) are passed through as-is
        // for the regex engine to interpret
        buffer.push('\\')
        buffer.push(next)
      }
      scanner.advance() // consume the char after backslash
      continue
    }
    if (ch === '"') {
      scanner.advance() // consume closing '"'
      foundClosingQuote = true
      break
    }
    buffer.push(scanner.advance()!)
  }
  if (!foundClosingQuote) {
    throw new TokenizerError(
      `Unterminated regex literal at ${start.offset}`,
      scanner.position()
    )
  }
  return {
    kind: tokenKeywords.Regex,
    value: buffer.join(''),
    start,
    end: scanner.position(),
  }
}

// Named character literals: \space \newline \tab \return \backspace \formfeed
const NAMED_CHARS: Record<string, string> = {
  space: ' ',
  newline: '\n',
  tab: '\t',
  return: '\r',
  backspace: '\b',
  formfeed: '\f',
}

// Parses Clojure character literals: \a  \space  \newline  \uXXXX
//
// Algorithm:
//   1. Consume the backslash.
//   2. Read exactly one character (required).
//   3. If that character is a letter, keep reading letters/digits until a
//      delimiter — this allows \space, \newline, \uD0B5, etc.
//   4. If the result is a single character → literal of that character.
//   5. If it matches a named char → that character.
//   6. If it matches uXXXX (4 hex digits) → unicode code point.
//   7. Otherwise → TokenizerError.
const parseCharacterLiteral = (ctx: TokenizationContext): Token => {
  const scanner = ctx.scanner
  const start = scanner.position()
  scanner.advance() // consume '\'

  if (scanner.isAtEnd()) {
    throw new TokenizerError(
      'Unexpected end of input after \\',
      scanner.position()
    )
  }

  // Read the first character (required)
  const firstChar = scanner.advance()!

  // If the first char is a letter, keep reading to capture named chars / unicode escapes
  let name = firstChar
  if (/[a-zA-Z]/.test(firstChar)) {
    name += scanner.consumeWhile(
      (c) => !isWhitespace(c) && !isDelimiter(c) && !isComment(c) && c !== '"'
    )
  }

  // Single character (includes \\ \( \) \space-via-literal, etc.)
  if (name.length === 1) {
    return {
      kind: tokenKeywords.Character,
      value: name,
      start,
      end: scanner.position(),
    }
  }

  // Named character: \space \newline \tab \return \backspace \formfeed
  const namedChar = NAMED_CHARS[name]
  if (namedChar !== undefined) {
    return {
      kind: tokenKeywords.Character,
      value: namedChar,
      start,
      end: scanner.position(),
    }
  }

  // Unicode escape: \uXXXX (exactly 4 hex digits)
  if (/^u[0-9a-fA-F]{4}$/.test(name)) {
    const codePoint = parseInt(name.slice(1), 16)
    return {
      kind: tokenKeywords.Character,
      value: String.fromCodePoint(codePoint),
      start,
      end: scanner.position(),
    }
  }

  throw new TokenizerError(
    `Unknown character literal: \\${name} at line ${start.line} column ${start.col}`,
    start
  )
}

// Single routing point for all # dispatch characters.
// Add new dispatch forms here as they are supported.
function parseDispatch(ctx: TokenizationContext): Token {
  const scanner = ctx.scanner
  const start = scanner.position()
  scanner.advance() // consume '#'
  const next = scanner.peek()
  if (next === '(') {
    scanner.advance() // consume '('
    return { kind: tokenKeywords.AnonFnStart, start, end: scanner.position() }
  }
  if (next === '"') {
    return parseRegexLiteral(ctx, start)
  }
  if (next === "'") {
    scanner.advance() // consume "'"
    return { kind: tokenKeywords.VarQuote, start, end: scanner.position() }
  }
  if (next === '{') {
    scanner.advance() // consume '{'
    return { kind: tokenKeywords.SetStart, start, end: scanner.position() }
  }
  if (next === ':') {
    // #:ns{...} or #::alias{...} or #::{...} — namespaced map literal.
    // Consume the prefix (everything from ':' up to but not including '{').
    const prefix = scanner.consumeWhile((c) => c !== '{' && c !== ' ' && c !== '\n' && c !== '\t' && c !== ',')
    return { kind: tokenKeywords.NsMapPrefix, value: prefix, start, end: scanner.position() }
  }
  if (next === '_') {
    // #_ — discard the following form (works in both Clojure and EDN)
    scanner.advance() // consume '_'
    return { kind: tokenKeywords.Discard, start, end: scanner.position() }
  }
  if (next !== null && /[a-zA-Z]/.test(next)) {
    // #tag — reader tag literal, e.g. #inst, #uuid, #myapp/Foo
    // Consume until whitespace, delimiter, comment char, or string delimiter.
    const tagName = scanner.consumeWhile(
      (c) => !isWhitespace(c) && !isDelimiter(c) && !isComment(c) && c !== '"'
    )
    return { kind: tokenKeywords.ReaderTag, value: tagName, start, end: scanner.position() }
  }
  throw new TokenizerError(
    `Unknown dispatch character: #${next ?? 'EOF'}`,
    start
  )
}

function parseCharToken<K extends Token['kind']>(kind: K, value: string) {
  return (ctx: TokenizationContext) => {
    const scanner = ctx.scanner
    const start = scanner.position()
    scanner.advance()

    return {
      kind,
      value,
      start,
      end: scanner.position(),
    } as Token & { kind: K }
  }
}

function parseTilde(ctx: TokenizationContext): Token {
  const scanner = ctx.scanner
  const start = scanner.position()
  // consume the tilde
  scanner.advance()
  // check if the next character is an @
  const nextChar = scanner.peek()
  if (!nextChar) {
    throw new TokenizerError(
      `Unexpected end of input while parsing unquote at ${start.offset}`,
      start
    )
  }
  if (isAt(nextChar)) {
    // consume the @
    scanner.advance()
    return {
      kind: tokenKeywords.UnquoteSplicing,
      value: tokenSymbols.UnquoteSplicing,
      start,
      end: scanner.position(),
    }
  }

  return {
    kind: tokenKeywords.Unquote,
    value: tokenSymbols.Unquote,
    start,
    end: scanner.position(),
  }
}

type TokenParseCheck = (char: string, ctx: TokenizationContext) => boolean
type TokenParseFn = (ctx: TokenizationContext) => Token
type TokenParseEntry = [TokenParseCheck, TokenParseFn]

const tokenParseEntries: TokenParseEntry[] = [
  [isWhitespace, parseWhitespace],
  [isComment, parseComment],
  [isLParen, parseCharToken(tokenKeywords.LParen, tokenSymbols.LParen)],
  [isRParen, parseCharToken(tokenKeywords.RParen, tokenSymbols.RParen)],
  [isLBracket, parseCharToken(tokenKeywords.LBracket, tokenSymbols.LBracket)],
  [isRBracket, parseCharToken(tokenKeywords.RBracket, tokenSymbols.RBracket)],
  [isLBrace, parseCharToken(tokenKeywords.LBrace, tokenSymbols.LBrace)],
  [isRBrace, parseCharToken(tokenKeywords.RBrace, tokenSymbols.RBrace)],
  [isDoubleQuote, parseString],
  [isKeywordStart, parseKeyword],
  [isNumberToken, parseNumber],
  [isSingleQuote, parseCharToken(tokenKeywords.Quote, tokenSymbols.Quote)],
  [
    isBacktick,
    parseCharToken(tokenKeywords.Quasiquote, tokenSymbols.Quasiquote),
  ],
  [isTilde, parseTilde],
  [isAt, parseDerefToken],
  [isCaret, parseMetaToken],
  [isHash, parseDispatch],
  [isBackslash, parseCharacterLiteral],
]

function parseNextToken(ctx: TokenizationContext): Token {
  const scanner = ctx.scanner
  const char = scanner.peek()!
  const entry = tokenParseEntries.find(([check]) => check(char, ctx))
  if (entry) {
    const [, parse] = entry
    return parse(ctx)
  }
  // catch-all symbol parsing
  return parseSymbol(ctx)
}

export function parseAllTokens(ctx: TokenizationContext): TokensResult {
  const tokens: Token[] = []
  let error: TokenizerError | undefined = undefined

  try {
    while (!ctx.scanner.isAtEnd()) {
      const result = parseNextToken(ctx)

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
    scanner: ctx.scanner,
    error,
  }
  return parsed
}

export function getTokenValue(token: Token): string | number {
  if ('value' in token) {
    return token.value
  }
  return ''
}

type TokenizationContext = {
  scanner: CharScanner
}

export function tokenize(input: string): Token[] {
  const inputLength = input.length
  const scanner = makeCharScanner(input)
  const tokenizationContext = {
    scanner,
  }
  const tokensResult = parseAllTokens(tokenizationContext)
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
