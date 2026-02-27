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
  macro: 'macro',
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
export type Env = {
  bindings: Map<string, CljValue>
  outer: Env | null
  namespace?: string // only present on namespace-root envs
  aliases?: Map<string, Env> // only present on namespace-root envs
}

export type Arity = {
  params: CljSymbol[]
  restParam: CljSymbol | null
  body: CljValue[]
}

export type CljFunction = {
  kind: 'function'
  arities: Arity[]
  env: Env
}

export type CljMacro = {
  kind: 'macro'
  arities: Arity[]
  env: Env
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
  | CljNativeFunction
  | CljMacro

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
  Quasiquote: 'Quasiquote',
  Unquote: 'Unquote',
  UnquoteSplicing: 'UnquoteSplicing',
  Comment: 'Comment',
  Whitespace: 'Whitespace',
  Symbol: 'Symbol',
} as const
export const tokenSymbols = {
  Quote: 'quote',
  Quasiquote: 'quasiquote',
  Unquote: 'unquote',
  UnquoteSplicing: 'unquote-splicing',
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
export type TokenQuasiquote = {
  kind: 'Quasiquote'
  value: 'quasiquote'
}
export type TokenUnquote = {
  kind: 'Unquote'
  value: 'unquote'
}
export type TokenUnquoteSplicing = {
  kind: 'UnquoteSplicing'
  value: 'unquote-splicing'
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
  | TokenQuasiquote
  | TokenUnquote
  | TokenUnquoteSplicing
) & { start: Cursor; end: Cursor }
