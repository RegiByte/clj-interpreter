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
import type { LocalBinding, NodeEnv, Upvalue } from './env'

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
  local: BindingNode | null
  methods: FnMethodNode[]
  variadic: boolean
  maxFixedArity: number
  /** cljam-specific: resolved upvalue descriptors captured by this fn. */
  captures: Upvalue[]
}

export interface FnMethodNode extends NodeBase {
  op: 'fn-method'
  params: BindingNode[]
  variadic: boolean
  fixedArity: number
  body: DoNode
}

export interface InvokeNode extends NodeBase {
  op: 'invoke'
  fn: AstNode
  args: AstNode[]
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
  /** The dynamic vars being rebound, in order. */
  bindingVars: VarNode[]
  /** Init expressions, parallel to bindingVars. */
  inits: AstNode[]
  body: DoNode
}

export interface SetBangNode extends NodeBase {
  op: 'set!'
  target: AstNode
  val: AstNode
}

/**
 * Escape hatch for forms Phase 0 does not yet model. Lets the coverage gate
 * traverse the whole suite without throwing, surfacing gaps as visible nodes
 * instead of crashes.
 */
export interface UnsupportedNode extends NodeBase {
  op: 'unsupported'
  reason: string
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
  | RecurNode
  | ThrowNode
  | TryNode
  | CatchNode
  | DefNode
  | BindingNode
  | DynamicNode
  | SetBangNode
  | UnsupportedNode
