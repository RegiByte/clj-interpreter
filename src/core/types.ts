export const valueKeywords = {
  number: 'number',
  string: 'string',
  boolean: 'boolean',
  keyword: 'keyword',
  nil: 'nil',
  symbol: 'symbol',
  list: 'list',
  vector: 'vector',
  map: 'map',
  function: 'function',
  nativeFunction: 'native-function',
  comment: 'comment',
} as const
export type ValueKeywords = (typeof valueKeywords)[keyof typeof valueKeywords]

export type CljNumber = { kind: 'number'; value: number }
export type CljString = { kind: 'string'; value: string }
export type CljBoolean = { kind: 'boolean'; value: boolean }
export type CljKeyword = { kind: 'keyword'; name: string }
export type CljNil = { kind: 'nil'; value: null }
export type CljSymbol = { kind: 'symbol'; name: string }
export type CljList = { kind: 'list'; value: CljValue[] }
export type CljVector = { kind: 'vector'; value: CljValue[] }
export type CljMap = { kind: 'map'; entries: [CljValue, CljValue][] }
export type CljComment = { kind: 'comment'; value: string }
export type Env = {
  bindings: Map<string, CljValue>
  outer: Env | null
}

export type CljFunction = {
  kind: 'function'
  params: CljSymbol[]
  body: CljValue[]
  env: Env // captured environment at the time of fn creation
}

export type CljNativeFunction = {
  kind: 'native-function'
  name: string
  fn: (...args: CljValue[]) => CljValue
}

export type CljValue =
  | CljNumber
  | CljString
  | CljBoolean
  | CljKeyword
  | CljNil
  | CljSymbol
  | CljList
  | CljVector
  | CljMap
  | CljFunction
  | CljComment // stripped during evaluation, kept on parsed values for tooling support
  | CljNativeFunction

/** Tokens */
export const tokenKeywords = {
  LParen: 'LParen',
  RParen: 'RParen',
  LBracket: 'LBracket',
  RBracket: 'RBracket',
  LBrace: 'LBrace',
  RBrace: 'RBrace',
  String: 'String',
  Number: 'Number',
  Keyword: 'Keyword',
  Quote: 'Quote',
  Comment: 'Comment',
  Whitespace: 'Whitespace',
  Symbol: 'Symbol',
} as const
export const tokenSymbols = {
  Quote: 'quote',
  LParen: '(',
  RParen: ')',
  LBracket: '[',
  RBracket: ']',
  LBrace: '{',
  RBrace: '}',
} as const
export type TokenSymbols = (typeof tokenSymbols)[keyof typeof tokenSymbols]
export type TokenKinds = keyof typeof tokenKeywords

export type Cursor = {
  line: number
  col: number
  offset: number
}

export type TokenLParen = {
  kind: 'LParen'
  value: '('
}
export type TokenRParen = {
  kind: 'RParen'
  value: ')'
}
export type TokenLBracket = {
  kind: 'LBracket'
  value: '['
}
export type TokenRBracket = {
  kind: 'RBracket'
  value: ']'
}
export type TokenLBrace = {
  kind: 'LBrace'
  value: '{'
}
export type TokenRBrace = {
  kind: 'RBrace'
  value: '}'
}
export type TokenString = {
  kind: 'String'
  value: string
}
export type TokenNumber = {
  kind: 'Number'
  value: number
}
export type TokenKeyword = {
  kind: 'Keyword'
  value: string
}
export type TokenQuote = {
  kind: 'Quote'
  value: 'quote'
}
export type TokenComment = {
  kind: 'Comment'
  value: string
}
export type TokenWhitespace = {
  kind: 'Whitespace'
}
export type TokenSymbol = {
  kind: 'Symbol'
  value: string
}
export type Token = (
  | TokenLParen
  | TokenRParen
  | TokenLBracket
  | TokenRBracket
  | TokenLBrace
  | TokenRBrace
  | TokenString
  | TokenNumber
  | TokenKeyword
  | TokenQuote
  | TokenComment
  | TokenWhitespace
  | TokenSymbol
) & { start: Cursor; end: Cursor }
