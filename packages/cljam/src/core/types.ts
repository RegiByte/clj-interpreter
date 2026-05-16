export type CljNumber = { kind: 'number'; value: number }
export type CljString = { kind: 'string'; value: string }
export type CljChar = { kind: 'character'; value: string }
export type CljBoolean = { kind: 'boolean'; value: boolean }
export type CljKeyword = { kind: 'keyword'; name: string }
export type CljNil = { kind: 'nil'; value: null }
export type CljSymbol = { kind: 'symbol'; name: string; meta?: CljMap }
export type CljList = { kind: 'list'; value: CljValue[]; meta?: CljMap }
export type CljVector = { kind: 'vector'; value: CljValue[]; meta?: CljMap }
export type CljMap = {
  kind: 'map'
  entries: [CljValue, CljValue][]
  meta?: CljMap
}
export type CljNamespace = {
  kind: 'namespace'
  name: string
  vars: Map<string, CljVar> // user defs from (def ...)
  aliases: Map<string, CljNamespace> // :as namespace aliases
  readerAliases: Map<string, string> // :as-alias reader aliases
  doc?: string
}

export type Env = {
  bindings: Map<string, CljValue> // native fns, macros, multimethods, local values
  outer: Env | null
  ns?: CljNamespace // set on namespace-root envs only
}

export type Arity = {
  params: CljSymbol[]
  restParam: CljSymbol | null
  body: CljValue[]
  compiledBody?: CompiledExpr
  bytecodeBody?: VmChunk
  paramSlots?: SlotRef[] // Phase 4b: set when body compiled with param slots
  vmClosure?: VmFunctionClosure
}

export type CljFunction = {
  kind: 'function'
  arities: Arity[]
  env: Env
  name?: string // set for named fn: (fn my-name [x] x)
  meta?: CljMap
}

export type CljMacro = {
  kind: 'macro'
  arities: Arity[]
  env: Env
  name?: string // set for named defmacro
  meta?: CljMap
}

export type CljAtom = {
  kind: 'atom'
  value: CljValue
  meta?: CljMap
  watches?: Map<
    string,
    { key: CljValue; fn: CljValue; ctx: EvaluationContext; callEnv: Env }
  >
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
  value?: CljValue // nil, list, cons, or another lazy-seq after realization
}

export type CljCons = {
  kind: 'cons'
  head: CljValue
  tail: CljValue // can be list, vector, lazy-seq, cons, or nil
  meta?: CljMap
}

export type CljVar = {
  kind: 'var'
  ns: string
  name: string
  value: CljValue
  dynamic?: boolean // set when def is annotated with ^:dynamic
  bindingStack?: CljValue[] // active dynamic bindings (push/pop by `binding`)
  meta?: CljMap
}

export type CljMultiMethod = {
  kind: 'multi-method'
  name: string
  dispatchFn: CljFunction | CljNativeFunction
  methods: Array<{ dispatchVal: CljValue; fn: CljFunction | CljNativeFunction }>
  defaultMethod?: CljFunction | CljNativeFunction
  /** Custom sentinel for the "no method found" fallback. Defaults to :default. */
  defaultDispatchVal?: CljValue
}

export type CljProtocolMethod = {
  name: string
  arglists: string[][]
  doc?: string
}

export type CljProtocol = {
  kind: 'protocol'
  name: string
  ns: string
  fns: CljProtocolMethod[]
  doc?: string
  /** type-tag → { method-name → implementation } */
  impls: Map<string, Record<string, CljFunction | CljNativeFunction>>
  meta?: CljMap
}

export type CljRecord = {
  kind: 'record'
  recordType: string // unqualified: 'Circle'
  ns: string // defining namespace: 'my.shapes'
  fields: [CljValue, CljValue][] // same structure as CljMap.entries
  meta?: CljMap
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
  /** Invokes any IFn value: functions, native functions, keywords, collections, vars, and host callables. */
  applyCallable: (fn: CljValue, args: CljValue[], callEnv: Env) => CljValue
  applyMacro: (macro: CljMacro, rawArgs: CljValue[]) => CljValue
  expandAll: (form: CljValue, env: Env) => CljValue
  /**
   * Resolves a namespace name (or alias) to its CljNamespace record.
   * Wired by the session/runtime after context creation; defaults to no-op null.
   */
  resolveNs: (name: string) => CljNamespace | null
  /**
   * Returns all loaded namespaces across the session's registry.
   * Wired by buildSessionFacade. Use for cross-namespace scanning (e.g. protocol discovery).
   */
  allNamespaces: () => CljNamespace[]
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
  /**
   * The session's current working directory. Readable by `pwd`, mutable by `cd`.
   * Defaults to process.cwd() in Node/Bun; "/" in browser/embedded contexts.
   * Wired by buildSessionFacade.
   */
  currentDir?: string
  /**
   * Updates the session's current working directory. Wired by buildSessionFacade.
   * Called by `cd` at runtime.
   */
  setCurrentDir?: (dir: string) => void
  /**
   * Clojure-level call stack for stack traces. Pushed/popped at each function
   * call site. Snapshot (reversed, innermost-first) is stored on EvaluationError.frames.
   */
  frameStack: StackFrame[]
  /**
   * Namespace allowlist for this session. Controls which Clojure namespaces may
   * be loaded via (:require [ns]). Set by createSession from SessionOptions.allowedPackages.
   * Only applies to library-registered namespaces — filesystem namespaces are always allowed.
   *   'all' (default) — no restrictions
   *   string[]        — only namespaces whose root package prefix matches one of these
   */
  allowedPackages?: string[] | 'all'
  /**
   * Host module allowlist for this session. Controls which JS module specifiers may
   * be imported via (:require ["specifier" :as Alias]). Supports prefix matching:
   * 'node:' allows all Node.js built-ins, 'npm:react' allows only that package.
   *   'all' (default) — no restrictions
   *   string[]        — only specifiers that exactly match or start with one of these prefixes
   */
  allowedHostModules?: string[] | 'all'
  /**
   * Controls VM participation in sync evaluation.
   *
   * - function-body: current default; bytecode-backed function bodies may run.
   * - opportunistic: outer evaluation forms try top-level VM first, then fall back.
   * - vm-required: outer evaluation forms must compile to VM or throw.
   * - off: bypass VM execution where the current dispatch can do so.
   */
  vmExecutionMode?: VmExecutionMode
  /**
   * Optional execution decision sink. This is deliberately opt-in so normal
   * evaluation keeps the existing value-oriented API.
   */
  instrumentation?: {
    onEvent: (event: EvalEvent) => void
  }
  /**
   * Internal recursion guard used to keep first top-level VM integration at the
   * whole-form boundary instead of opportunistically compiling interpreter
   * subexpressions.
   */
  evaluationDepth?: number
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
  | CljChar
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
  | CljProtocol
  | CljRecord

export type Cursor = {
  line: number
  col: number
  offset: number
}

export type Pos = {
  start: number
  end: number
  source?: string
  lineOffset?: number
  colOffset?: number
} // absolute char offsets; source+lineOffset+colOffset enable file-relative display

export interface StackFrame {
  fnName: string | null // symbol name at the call site, null for non-symbol heads (anonymous calls)
  line: number | null // 1-indexed line of call site, null when source is unavailable
  col: number | null // 1-indexed col of call site, null when source is unavailable
  source: string | null // ctx.currentFile at push time
  pos: Pos | null // raw byte-offset position in ctx.currentSource; enables session-level display fallback
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
export type TokenNsMapPrefix = {
  kind: 'NsMapPrefix'
  value: string // raw prefix: ':car', '::car', or '::'
}
export type TokenDiscard = {
  kind: 'Discard'
}
export type TokenReaderTag = {
  kind: 'ReaderTag'
  value: string // the tag identifier, e.g. "inst", "uuid", "myapp/Foo"
}
export type TokenCharacter = {
  kind: 'Character'
  value: string // resolved JS character, e.g. ' ' for \space, '\n' for \newline
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
  | TokenNsMapPrefix
  | TokenDiscard
  | TokenReaderTag
  | TokenCharacter
) & { start: Cursor; end: Cursor }

/** Compiler */

/**
 * A compiled expression takes runtime env + ctx, returns a CljValue.
 * Signature includes ctx even though we don't use it yet
 * Phases 2+ (if, fn*, apply) will need it. We keep the shape fixed now.
 */
export type CompiledExpr = (env: Env, ctx: EvaluationContext) => CljValue

/**
 * A compile function takes a node and an optional compile-time env. It returns a compiled expression
 * when it can't compile a node, it returns null, falling back to the interpreter
 * we have this definition here so that recursive compiler functions such as compileIf,
 * and compileDo can reference the "root dispatcher" when compiling sub-forms.
 * It's a clean way to prevent cyclical dependencies. Only recursive compiler fns need this.
 */
export type CompileFn = (
  node: CljValue,
  env: CompileEnv | null
) => CompiledExpr | null

/**
 * A mutable box. Allocated at compile time.
 * Read by compiled symbols that reference the slot binding.
 */
export type SlotRef = { value: CljValue | null }

export type CompileEnv = {
  bindings: Map<string, SlotRef>
  outer: CompileEnv | null
  loop?: {
    slots: SlotRef[]
    recurTarget: { args: CljValue[] | null }
    fixedParamCount?: number
    hasRestParam?: boolean
  }
}

/**
 * VM Types
 */

export type OpCode = number

export type VmExecutionMode =
  | 'off'
  | 'function-body'
  | 'opportunistic'
  | 'vm-required'

export type VmFallbackReason =
  | { category: 'unsupported-special-form'; detail: string }
  | { category: 'unsupported-binding-form'; detail: string }
  | { category: 'unsupported-callee'; detail: string }
  | { category: 'unsupported-top-level-mutation'; detail: string }
  | { category: 'unexpanded-macro'; detail: string }
  | { category: 'unsupported-js-interop'; detail: string }
  | { category: 'compile-error'; detail: string }

export type VmCompileResult =
  | { ok: true; chunk: VmChunk }
  | { ok: false; reason: VmFallbackReason }

export type EvalEvent = {
  path:
    | 'interpreter'
    | 'closure-compiler'
    | 'vm:function-body-compiled'
    | 'vm:function-body'
    | 'vm:macro-body'
    | 'vm:top-level'
    | 'fallback'
  mode: VmExecutionMode
  reason?: VmFallbackReason
  formKind?: string
  ast?: CljValue
  details?: Record<string, unknown>
}

export type VmUpvalueDescriptor = {
  isLocal: boolean
  index: number
}

export type VmLexicalVarCandidate = {
  kind: 'local' | 'upvalue'
  slot: number
}

export type VmLexicalVarLookup = {
  symbol: CljSymbol
  candidates: VmLexicalVarCandidate[]
}

export type VmCallFrame = {
  chunk: VmChunk
  env: Env
  locals: CljValue[]
  ip: number
  stackBase: number
  fnName: string | null
  callPos: Pos | null
  closure: VmFunctionClosure | null
  unwindStack: VmUnwindRecord[]
}

export type VmAbrupt = {
  kind: 'throw'
  thrown: CljValue
  original: unknown
  catchable: boolean
}

export type VmTryRecord = {
  kind: 'try'
  stackDepth: number
  catchTableIndex: number
  finallyIp: number
  afterIp: number
}

export type VmFinallyContinuationRecord = {
  kind: 'finally-continuation'
  stackDepth: number
  afterIp: number
  pendingAbrupt: VmAbrupt | null
}

export type VmBindingFrameRecord = {
  kind: 'binding-frame'
  stackDepth: number
  boundVars: CljVar[]
}

export type VmUnwindRecord =
  | VmTryRecord
  | VmFinallyContinuationRecord
  | VmBindingFrameRecord

export type VmUpvalue = {
  frame: VmCallFrame | null
  slot: number
  closedValue: CljValue | null
}

export type VmFunctionClosure = {
  env: Env
  upvalues: VmUpvalue[]
  name?: string
}

export type VmArityTemplate = {
  params: CljSymbol[]
  restParam: CljSymbol | null
  body: CljValue[]
  chunk: VmChunk
}

export type VmFunctionTemplate = {
  arities: VmArityTemplate[]
  upvalueDescriptors: VmUpvalueDescriptor[]
  name?: string
  meta?: CljMap
}

export type VmCatchClause = {
  discriminator: CljValue
  // -1: evaluate discriminator AST at catch time
  // >= 0: local slot holds a pre-instantiated closure (inline fn that closes over VM locals)
  discriminatorSlot: number
  bindingSlot: number
  bodyIp: number
}

export type VmCatchTable = {
  clauses: VmCatchClause[]
}

export type VmChunk = {
  code: number[]
  constants: CljValue[]
  positions: Array<Pos | null>
  name?: string
  maxStack: number
  localCount: number
  innerFunctions: VmFunctionTemplate[]
  catchTables: VmCatchTable[]
  lexicalVarLookups: VmLexicalVarLookup[]
  selfSlot: number
}

export type VmExecuteInput = {
  chunk: VmChunk
  env: Env
  ctx: EvaluationContext
  locals?: CljValue[]
  rootFnName?: string | null
  closure?: VmFunctionClosure | null
}
