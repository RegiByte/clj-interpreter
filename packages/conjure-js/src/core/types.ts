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
  multiMethod: 'multi-method',
  atom: 'atom',
  reduced: 'reduced',
  volatile: 'volatile',
  regex: 'regex',
  var: 'var',
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
export type CljNamespace = {
  name: string
  vars: Map<string, CljVar>            // user defs from (def ...)
  aliases: Map<string, CljNamespace>   // :as namespace aliases
  readerAliases: Map<string, string>   // :as-alias reader aliases
}

export type Env = {
  bindings: Map<string, CljValue>      // native fns, macros, multimethods, local values
  outer: Env | null
  ns?: CljNamespace                    // set on namespace-root envs only
  resolveNs?: (name: string) => Env | null // set on coreEnv only
}

export type DestructurePattern = CljSymbol | CljVector | CljMap

export type Arity = {
  params: DestructurePattern[]
  restParam: DestructurePattern | null
  body: CljValue[]
}

export type CljFunction = {
  kind: 'function'
  arities: Arity[]
  env: Env
  meta?: CljMap
}

export type CljMacro = {
  kind: 'macro'
  arities: Arity[]
  env: Env
}

export type CljAtom = { kind: 'atom'; value: CljValue }
export type CljReduced = { kind: 'reduced'; value: CljValue }
export type CljVolatile = { kind: 'volatile'; value: CljValue }
export type CljRegex = { kind: 'regex'; pattern: string; flags: string }

export type CljVar = {
  kind: 'var'
  ns: string
  name: string
  value: CljValue
  meta?: CljMap
}

export type CljMultiMethod = {
  kind: 'multi-method'
  name: string
  dispatchFn: CljFunction | CljNativeFunction
  methods: Array<{ dispatchVal: CljValue; fn: CljFunction | CljNativeFunction }>
  defaultMethod?: CljFunction | CljNativeFunction
}

export type EvaluationContext = {
  evaluate: (expr: CljValue, env: Env) => CljValue
  evaluateForms: (forms: CljValue[], env: Env) => CljValue
  applyFunction: (
    fn: CljFunction | CljNativeFunction,
    args: CljValue[],
    callEnv: Env
  ) => CljValue
  /** Invokes any IFn value: functions, native functions, keywords, and maps. */
  applyCallable: (fn: CljValue, args: CljValue[], callEnv: Env) => CljValue
  applyMacro: (macro: CljMacro, rawArgs: CljValue[]) => CljValue
  expandAll: (form: CljValue, env: Env) => CljValue
}

export type CljNativeFunction = {
  kind: 'native-function'
  name: string
  fn: (...args: CljValue[]) => CljValue
  // Only used in case the function needs to access the evaluation context
  fnWithContext?: (
    ctx: EvaluationContext,
    callEnv: Env,
    ...args: CljValue[]
  ) => CljValue
  meta?: CljMap
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
  | CljMultiMethod
  | CljAtom
  | CljReduced
  | CljVolatile
  | CljRegex
  | CljVar

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
  AnonFnStart: 'AnonFnStart',
  Deref: 'Deref',
  Regex: 'Regex',
  VarQuote: 'VarQuote',
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

export type Pos = { start: number; end: number } // absolute char offsets into the source string

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
export type TokenAnonFnStart = {
  kind: 'AnonFnStart'
}
export type TokenDeref = {
  kind: 'Deref'
}
export type TokenRegex = {
  kind: 'Regex'
  value: string
}
export type TokenVarQuote = {
  kind: 'VarQuote'
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
  | TokenAnonFnStart
  | TokenDeref
  | TokenRegex
  | TokenVarQuote
) & { start: Cursor; end: Cursor }
