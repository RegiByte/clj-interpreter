/**
 * cljam analyzer — AST node taxonomy (Phase 0, standalone).
 *
 * Design note
 * ===========
 * This is a JS-native AST (plain TS objects, not `CljValue`) produced by a pure
 * `analyze(form) -> AST` phase. Every lexical decision is made once and named
 * here: local vs upvalue vs var, capture sets, recur targets, and (in a second
 * pass) tail/statement/expr context. Both engines can later become dumb
 * consumers of this tree, which is why scope can no longer diverge between them.
 *
 * The shape deliberately mirrors the canonical `tools.analyzer` taxonomy (see
 * `.regibyte/references/tools-analyzer-js/spec/ast-ref.edn`) so the IR is
 * legible to anyone who knows Clojure tooling and so future passes/printers can
 * be generic. Conventions adopted from tools.analyzer:
 *
 *   - Every node carries `op`, `form` (original), `env`, `children`, `pos`,
 *     `tag` (reserved, always null for now), and optionally `rawForms`
 *     (the macroexpansion chain from original to fully expanded).
 *   - `children` is an ordered list of field names, in evaluation order. Each
 *     named field holds either a single child node or an array of child nodes.
 *     A generic walk (printer / future passes) is driven entirely by `children`.
 *   - Bindings are unified: one `binding` node for every definition site and one
 *     `local` node for every reference site, both tagged with a `localKind`.
 *   - Bodies are synthetic `do` nodes (`body: true`).
 *
 * cljam's ONE deliberate divergence from tools.analyzer: explicit `captures`
 * (upvalue descriptors) on `fn` nodes. tools.analyzer/CLJS let native JS
 * closures handle capture; cljam's VM needs explicit `VmUpvalueDescriptor`s, so
 * capture is computed here. This is where the RB-007 class of bugs becomes
 * visible before execution.
 */

import type { CljValue, Pos } from '../types'
import type {
  AnalysisErrorKind,
  LocalBinding,
  NodeEnv,
  Upvalue,
} from './env'

export type ConstType =
  | 'nil'
  | 'bool'
  | 'number'
  | 'string'
  | 'char'
  | 'keyword'
  | 'symbol'
  | 'regex'
  | 'seq'
  | 'vector'
  | 'map'
  | 'set'
  | 'unknown'

export type LocalKind = 'arg' | 'let' | 'letfn' | 'loop' | 'catch' | 'fn'

interface NodeBase {
  /** Original (pre-expansion when known) form this node came from. */
  form: CljValue
  /** Immutable-ish environment snapshot. See env.ts. */
  env: NodeEnv
  /** Ordered child field names, in evaluation order. Drives generic walking. */
  children: readonly string[]
  /** Source position copied once from the form; null for macro-synthesized forms. */
  pos: Pos | null
  /** Macroexpansion chain (original -> ... -> expanded), present only when expanded. */
  rawForms?: CljValue[]
  /** Reserved for future type inference. Always null in Phase 0. */
  tag: null
}

export interface ConstNode extends NodeBase {
  op: 'const'
  type: ConstType
  val: CljValue
  literal: true
}

export interface QuoteNode extends NodeBase {
  op: 'quote'
  expr: ConstNode
  literal: true
}

export interface VectorNode extends NodeBase {
  op: 'vector'
  items: AstNode[]
}

export interface MapNode extends NodeBase {
  op: 'map'
  keys: AstNode[]
  vals: AstNode[]
}

export interface SetNode extends NodeBase {
  op: 'set'
  items: AstNode[]
}

export interface LocalNode extends NodeBase {
  op: 'local'
  name: string
  localKind: LocalKind
  slot: number
  resolved: 'local' | 'upvalue'
  /** Set when `resolved === 'upvalue'`: index into the current fn's upvalue table. */
  upvalueIndex?: number
  argId?: number
  variadic?: boolean
  binding: LocalBinding
}

export interface VarNode extends NodeBase {
  op: 'var'
  name: string
  ns: string | null
  resolved: boolean
}

export interface TheVarNode extends NodeBase {
  op: 'the-var'
  name: string
  ns: string | null
  resolved: boolean
  /**
   * Lexical candidates for `(var x)` where `x` is an unqualified symbol in
   * scope. Innermost-first. Each entry mirrors `VmLexicalVarCandidate` and is
   * used by the bytecode emitter to emit `LoadLexicalVar` instead of `LoadVar`.
   * Empty when the symbol is qualified or has no in-scope lexical bindings.
   */
  lexicalCandidates: Array<{ kind: 'local' | 'upvalue'; slot: number }>
}

export interface NsNode extends NodeBase {
  op: 'ns'
  /**
   * The optional docstring at position 2. All real ns work (aliases, requires,
   * namespace switching) happens in the session/loader pre-pass BEFORE
   * evaluation — recording the docstring is the only runtime job left, so the
   * node carries nothing else and has no children.
   */
  docstring: string | null
}

export interface HostCallNode extends NodeBase {
  op: 'host-call'
  method: string
  target: AstNode
  args: AstNode[]
}

export interface HostFieldNode extends NodeBase {
  op: 'host-field'
  field: string
  target: AstNode
  assignable: true
}

export interface JsVarNode extends NodeBase {
  op: 'js-var'
  name: string
  /** Dot-chain segments after `js/`, e.g. `js/Math.PI` -> ['Math', 'PI']. */
  segments: string[]
}

export interface NewNode extends NodeBase {
  op: 'new'
  className: AstNode
  args: AstNode[]
}

export interface DoNode extends NodeBase {
  op: 'do'
  statements: AstNode[]
  ret: AstNode
  body: boolean
}

export interface IfNode extends NodeBase {
  op: 'if'
  test: AstNode
  then: AstNode
  else: AstNode
}

export interface LetNode extends NodeBase {
  op: 'let'
  bindings: BindingNode[]
  body: DoNode
}

export interface LoopNode extends NodeBase {
  op: 'loop'
  bindings: BindingNode[]
  body: DoNode
  loopArity: number
}

export interface LetfnNode extends NodeBase {
  op: 'letfn'
  bindings: BindingNode[]
  body: DoNode
}

export interface FnNode extends NodeBase {
  op: 'fn'
  name: string | null
  methods: FnMethodNode[]
  variadic: boolean
  maxFixedArity: number
  /** cljam-specific: resolved upvalue descriptors captured by this fn. */
  captures: Upvalue[]
}

export interface FnMethodNode extends NodeBase {
  op: 'fn-method'
  params: BindingNode[]
  /**
   * The self-name binding for a named fn, declared AFTER this method's params
   * (slot = paramSlotCount). Per-arity because each arity numbers its own frame
   * from 0, so the self slot differs per arity (matches the VM's `selfSlot`).
   * Null for anonymous fns and when a param shadows the self-name.
   */
  self: BindingNode | null
  variadic: boolean
  fixedArity: number
  body: DoNode
  /**
   * Total named slots this arity's frame needs (params + rest + self + every
   * let/loop/catch binding in the body). Captured from the per-arity slot
   * counter after body analysis. This is the analyzer's own well-defined
   * quantity — the VM's `localCount` is a superset (emit-time scratch slots)
   * and stays VM-computed.
   */
  namedSlotCount: number
  /**
   * The original (pre-analysis) body forms, exactly as the param vector was
   * followed in source. Retained because the runtime `Arity.body` — used by the
   * interpreter when `vmExecutionMode === 'off'` — needs un-analyzed forms, and
   * they cannot be recovered from `body` (the `DoNode`): an empty body
   * synthesizes a nil `ret` with no source form, and analysis macroexpands every
   * child. `params`/`restParam` are derivable from `params`/`fixedArity`/
   * `variadic`, so only the body forms are stored.
   */
  bodyForms: CljValue[]
}

export interface InvokeNode extends NodeBase {
  op: 'invoke'
  fn: AstNode
  args: AstNode[]
}

/**
 * `(async body…)` — the body analyzed as a ZERO-PARAM fn method (own slot
 * space, own capture set). The fn-method shape is deliberate, not incidental:
 * the sync walker mutates `let`/`loop` slots in place, so a suspended async
 * body sharing the enclosing frame would see its locals change under it. As a
 * closure, captures are copied at entry (the same allocate-then-fill machinery
 * as `fn`) and the body owns a fresh frame — suspension-safe by construction.
 * `enterFn` clears the recur target, so a stray `recur` inside `async` is
 * `malformed/recur-outside` rather than the form path's undefined behavior.
 */
export interface AsyncNode extends NodeBase {
  op: 'async'
  method: FnMethodNode
  /** cljam-specific: resolved upvalue descriptors captured by the async body. */
  captures: Upvalue[]
}

export interface RecurNode extends NodeBase {
  op: 'recur'
  exprs: AstNode[]
  targetKind: 'fn' | 'loop' | null
  targetArity: number | null
}

export interface ThrowNode extends NodeBase {
  op: 'throw'
  exception: AstNode
}

export interface TryNode extends NodeBase {
  op: 'try'
  body: DoNode
  catches: CatchNode[]
  finallyBody: DoNode | null
}

export interface CatchNode extends NodeBase {
  op: 'catch'
  discriminator: AstNode | null
  local: BindingNode
  body: DoNode
}

export interface DefNode extends NodeBase {
  op: 'def'
  name: string
  ns: string | null
  init: AstNode | null
  doc: string | null
  metaNode: AstNode | null
  /** True when produced by a `defmacro` form. The VM emitter uses this to emit DefMacro instead of Def. */
  isMacro?: boolean
}

export interface BindingNode extends NodeBase {
  op: 'binding'
  name: string
  localKind: LocalKind
  slot: number
  init: AstNode | null
  binding: LocalBinding
  argId?: number
  variadic?: boolean
}

export interface DynamicNode extends NodeBase {
  op: 'dynamic'
  /**
   * The dynamic vars being rebound, STRICTLY PARALLEL to `inits` — an entry
   * is null when the binding name is not a symbol that statically resolves
   * to a Var. The runtime (not the analyzer) is the authority for those
   * errors, so consumers that need resolved Vars (the VM) must refuse to
   * compile when any entry is null instead of skipping it.
   */
  bindingVars: (VarNode | null)[]
  /** Init expressions, parallel to bindingVars. */
  inits: AstNode[]
  /**
   * False when the binding form is structurally malformed (non-vector
   * bindings or an odd number of entries). The interpreter throws when such
   * a form EXECUTES; compilers must fall back rather than silently compile
   * a partial form.
   */
  wellFormed: boolean
  body: DoNode
}

export interface SetBangNode extends NodeBase {
  op: 'set!'
  target: AstNode
  val: AstNode
}

/**
 * Placeholder for a subform that could not be analyzed. Always paired with an
 * accumulated `AnalysisError` (see env.ts). `kind` distinguishes a real user
 * error (`malformed`) from a not-yet-modeled op (`unsupported`). Keeps the tree
 * structurally complete and walkable so tooling can render the problem in place.
 */
export interface InvalidNode extends NodeBase {
  op: 'invalid'
  message: string
  kind: AnalysisErrorKind
}

export type AstNode =
  | ConstNode
  | QuoteNode
  | VectorNode
  | MapNode
  | SetNode
  | LocalNode
  | VarNode
  | TheVarNode
  | NsNode
  | HostCallNode
  | HostFieldNode
  | JsVarNode
  | NewNode
  | DoNode
  | IfNode
  | LetNode
  | LoopNode
  | LetfnNode
  | FnNode
  | FnMethodNode
  | InvokeNode
  | AsyncNode
  | RecurNode
  | ThrowNode
  | TryNode
  | CatchNode
  | DefNode
  | BindingNode
  | DynamicNode
  | SetBangNode
  | InvalidNode
