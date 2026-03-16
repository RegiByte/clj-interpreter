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
  set: 'set',
  delay: 'delay',
  lazySeq: 'lazy-seq',
  cons: 'cons',
  namespace: 'namespace',
  jsValue: 'js-value',
} as const
export type ValueKeywords = (typeof valueKeywords)[keyof typeof valueKeywords]

export type CljNumber = { kind: 'number'; value: number }
export type CljString = { kind: 'string'; value: string }
export type CljBoolean = { kind: 'boolean'; value: boolean }
export type CljKeyword = { kind: 'keyword'; name: string }
export type CljNil = { kind: 'nil'; value: null }
export type CljSymbol = { kind: 'symbol'; name: string; meta?: CljMap }
export type CljList = { kind: 'list'; value: CljValue[]; meta?: CljMap }
export type CljVector = { kind: 'vector'; value: CljValue[]; meta?: CljMap }
export type CljMap = { kind: 'map'; entries: [CljValue, CljValue][]; meta?: CljMap }
export type CljNamespace = {
  kind: 'namespace'
  name: string
  vars: Map<string, CljVar>            // user defs from (def ...)
  aliases: Map<string, CljNamespace>   // :as namespace aliases
  readerAliases: Map<string, string>   // :as-alias reader aliases
}

export type Env = {
  bindings: Map<string, CljValue>      // native fns, macros, multimethods, local values
  outer: Env | null
  ns?: CljNamespace                    // set on namespace-root envs only
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
  name?: string   // set for named fn: (fn my-name [x] x)
  meta?: CljMap
}

export type CljMacro = {
  kind: 'macro'
  arities: Arity[]
  env: Env
  name?: string   // set for named defmacro
}

export type CljAtom = {
  kind: 'atom'
  value: CljValue
  meta?: CljMap
  watches?: Map<string, { key: CljValue; fn: CljValue; ctx: EvaluationContext; callEnv: Env }>
  validator?: CljValue
}
export type CljReduced = { kind: 'reduced'; value: CljValue }
export type CljVolatile = { kind: 'volatile'; value: CljValue }
export type CljRegex = { kind: 'regex'; pattern: string; flags: string }

export type CljSet = { kind: 'set'; values: CljValue[] }

export type CljDelay = {
  kind: 'delay'
  thunk: () => CljValue
  realized: boolean
  value?: CljValue
}

export type CljLazySeq = {
  kind: 'lazy-seq'
  thunk: (() => CljValue) | null
  realized: boolean
  value?: CljValue  // nil, list, cons, or another lazy-seq after realization
}

export type CljCons = {
  kind: 'cons'
  head: CljValue
  tail: CljValue  // can be list, vector, lazy-seq, cons, or nil
  meta?: CljMap
}

export type CljVar = {
  kind: 'var'
  ns: string
  name: string
  value: CljValue
  dynamic?: boolean          // set when def is annotated with ^:dynamic
  bindingStack?: CljValue[]  // active dynamic bindings (push/pop by `binding`)
  meta?: CljMap
}

export type CljMultiMethod = {
  kind: 'multi-method'
  name: string
  dispatchFn: CljFunction | CljNativeFunction
  methods: Array<{ dispatchVal: CljValue; fn: CljFunction | CljNativeFunction }>
  defaultMethod?: CljFunction | CljNativeFunction
}

/**
 * IO channels for a session. stdout is the primary output channel (println,
 * print, pr, prn, pprint, newline). stderr is available for error output.
 * Both are set by the session on context creation and read at call time by
 * IO native functions — no closure capture, no reinstallation on restore.
 */
export type IOContext = {
  stdout: (text: string) => void
  stderr: (text: string) => void
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
  /**
   * Resolves a namespace name (or alias) to its CljNamespace record.
   * Wired by the session/runtime after context creation; defaults to no-op null.
   */
  resolveNs: (name: string) => CljNamespace | null
  /**
   * IO channels — set by the session in buildSessionFacade.
   * IO native functions (println, print, pr, prn, pprint, newline) read
   * ctx.io.stdout at call time instead of closing over an emit callback.
   * This means snapshot clones automatically use the correct output without
   * any reinstallation of IO vars.
   */
  io: IOContext
  /**
   * Mutable per-call fields set by session.evaluate / loadFile before
   * executing forms. Used by evaluateDef to stamp :line/:column/:file onto
   * vars. This codebase is synchronous, so mutation is safe.
   */
  currentSource?: string
  currentFile?: string
  currentLineOffset?: number
  currentColOffset?: number
  /**
   * Optional module loader for string `:require` specs.
   * Called by processNsRequiresAsync when it encounters ["specifier" :as Alias].
   * Wired from SessionOptions.importModule in buildSessionFacade.
   */
  importModule?: (specifier: string) => unknown | Promise<unknown>
  /**
   * Switches the session's current namespace. Wired by buildSessionFacade.
   * Called by `in-ns` at runtime. Without this hook, `in-ns` is a no-op.
   */
  setCurrentNs?: (name: string) => void
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

export type CljJsValue = { kind: 'js-value'; value: unknown }

// --- ASYNC (experimental, see evaluator/async-evaluator.ts) ---
export type CljPending = {
  kind: 'pending'
  promise: Promise<CljValue>
  /** Set to true once the promise settles (fulfilled only). */
  resolved?: boolean
  resolvedValue?: CljValue
}
// --- END ASYNC ---

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
  | CljSet
  | CljDelay
  | CljLazySeq
  | CljCons
  | CljNamespace
  | CljPending
  | CljJsValue

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
  Meta: 'Meta',
  SetStart: 'SetStart',
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
export type TokenMeta = {
  kind: 'Meta'
}
export type TokenSetStart = {
  kind: 'SetStart'
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
  | TokenMeta
  | TokenSetStart
) & { start: Cursor; end: Cursor }
