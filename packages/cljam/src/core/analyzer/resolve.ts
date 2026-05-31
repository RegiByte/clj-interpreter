/**
 * cljam analyzer — resolve pass.
 *
 * `analyze(form) -> AstNode`: macroexpands as it descends (recording the
 * `rawForms` chain), handles the post-expansion special-form seed set, resolves
 * symbols into `local` / `var` / `js-var` / host references, and computes
 * per-`fn` capture sets (the cljam-specific upvalue layer; see env.ts).
 *
 * Context (statement/expr/return) is intentionally NOT decided here — every node
 * is created with the threaded env's default context and a separate pass
 * (context.ts) refines it.
 *
 * Errors are accumulated into the shared `AnalyzeState.errors` sink rather than
 * thrown, so analysis never unwinds the JS stack for control flow and so
 * tooling (`analyze*`) can show partially-broken trees. A structurally broken
 * subform becomes an `:invalid` placeholder node paired with an `AnalysisError`.
 */

import { is } from '../assertions'
import { derefValue, getNamespaceEnv, lookupVar, tryLookup } from '../env'
import { parseArities } from '../evaluator/arity'
import { parseTryStructure } from '../evaluator/form-parsers'
import { v } from '../factories'
import { setValues } from '../persistent/map-helpers'
import { getPos } from '../positions'
import { toSeq } from '../transformations'
import type {
  Arity,
  CljList,
  CljMap,
  CljSet,
  CljSymbol,
  CljValue,
  CljVar,
  CljVector,
  Pos,
} from '../types'
import {
  type AnalysisErrorKind,
  type AnalyzeState,
  declareLocal,
  enterArity,
  enterFn,
  type LocalBinding,
  type NodeEnv,
  resolveLocal,
  resolveVarLexicalCandidates,
  withLocals,
  withRecur,
} from './env'
import type {
  AstNode,
  BindingNode,
  ConstNode,
  ConstType,
  DoNode,
  FnMethodNode,
  VarNode,
} from './nodes'

// ─── var / macro resolution ──────────────────────────────────────────────────

/**
 * Resolves a symbol name to its Var, handling qualified (`ns/name`,
 * alias-qualified) and unqualified names. One env-chain walk; the caller derives
 * both `resolved` and the Var's namespace from the result. Mirrors the qualified
 * resolution `lookupMacro` and the evaluator already use.
 */
function resolveVar(name: string, st: AnalyzeState): CljVar | undefined {
  const slashIdx = name.indexOf('/')
  if (slashIdx > 0 && slashIdx < name.length - 1) {
    const nsPrefix = name.slice(0, slashIdx)
    const localName = name.slice(slashIdx + 1)
    const nsEnv = getNamespaceEnv(st.cljEnv)
    const targetNs =
      nsEnv.ns?.aliases.get(nsPrefix) ?? st.ctx.resolveNs(nsPrefix) ?? null
    return targetNs?.vars.get(localName)
  }
  return lookupVar(name, st.cljEnv)
}

function lookupMacro(name: string, st: AnalyzeState): CljValue | undefined {
  const slashIdx = name.indexOf('/')
  if (slashIdx > 0 && slashIdx < name.length - 1) {
    const theVar = resolveVar(name, st)
    return theVar !== undefined ? derefValue(theVar) : undefined
  }
  // Unqualified: tryLookup also surfaces values stored directly in env bindings
  // (not only ns Vars), which is what macro detection needs.
  return tryLookup(name, st.cljEnv)
}

type Expansion = { expanded: CljValue; chain: CljValue[] | null }

/**
 * Macro output is often produced with `cons`/`list*`/syntax-quote, yielding a
 * `CljCons`/`CljLazySeq` rather than a `CljList`. In code position any ISeq is a
 * form, so materialize it as a list (mirrors `macroExpandAllWithContext`).
 */
function toListIfSeq(form: CljValue): CljValue {
  if (is.cons(form) || is.lazySeq(form)) return v.list(toSeq(form))
  return form
}

function expandHead(form: CljValue, st: AnalyzeState): Expansion {
  let current = toListIfSeq(form)
  const chain: CljValue[] = []
  // Bound the loop defensively; runaway macros would otherwise hang analysis.
  for (let guard = 0; guard < 1000; guard++) {
    current = toListIfSeq(current)
    if (!is.list(current) || current.value.length === 0) break
    const head = current.value[0]
    if (!is.symbol(head)) break
    const name = head.name
    if (name === 'quote') break
    try {
      if (name === 'quasiquote') {
        const ex = st.ctx.expandAll(current, st.cljEnv)
        if (ex === current) break
        chain.push(current)
        current = ex
        continue
      }
      const macro = lookupMacro(name, st)
      if (macro === undefined || !is.macro(macro)) break
      chain.push(current)
      current = st.ctx.applyMacro(macro, current.value.slice(1))
    } catch (e) {
      // A macro that throws (e.g. on malformed args) is a real user error:
      // record it and stop expanding so the partially-resolved tree is still
      // inspectable, rather than silently swallowing the failure.
      st.errors.push({
        message: `macro expansion of (${name} ...) failed: ${(e as Error).message}`,
        form: current,
        pos: getPos(current) ?? null,
        kind: 'malformed',
      })
      break
    }
  }
  current = toListIfSeq(current)
  return chain.length > 0
    ? { expanded: current, chain: [...chain, current] }
    : { expanded: current, chain: null }
}

// ─── small helpers ───────────────────────────────────────────────────────────

function posOf(orig: CljValue, expanded: CljValue): Pos | null {
  return getPos(orig) ?? getPos(expanded) ?? null
}

function constTypeOf(value: CljValue): ConstType {
  switch (value.kind) {
    case 'nil':
      return 'nil'
    case 'boolean':
      return 'bool'
    case 'number':
      return 'number'
    case 'string':
      return 'string'
    case 'character':
      return 'char'
    case 'keyword':
      return 'keyword'
    case 'symbol':
      return 'symbol'
    case 'regex':
      return 'regex'
    case 'list':
    case 'cons':
    case 'lazy-seq':
      return 'seq'
    case 'vector':
      return 'vector'
    case 'map':
      return 'map'
    case 'set':
      return 'set'
    default:
      return 'unknown'
  }
}

function constNode(val: CljValue, env: NodeEnv, pos: Pos | null): ConstNode {
  return {
    op: 'const',
    form: val,
    env,
    children: [],
    pos,
    tag: null,
    type: constTypeOf(val),
    val,
    literal: true,
  }
}

function nilConst(env: NodeEnv): ConstNode {
  const nilVal: CljValue = { kind: 'nil', value: null }
  return constNode(nilVal, env, null)
}

/**
 * Records an analysis error and returns an `:invalid` placeholder node so the
 * surrounding tree stays structurally complete and walkable. The boundary
 * (`analyzeForm`) decides policy: tooling renders the errors; a compiler treats
 * any error as fatal.
 */
function invalid(
  form: CljValue,
  env: NodeEnv,
  pos: Pos | null,
  message: string,
  kind: AnalysisErrorKind,
  st: AnalyzeState
): AstNode {
  st.errors.push({ message, form, pos, kind })
  return {
    op: 'invalid',
    form,
    env,
    children: [],
    pos,
    tag: null,
    message,
    kind,
  }
}

function bindingNode(
  sym: CljSymbol,
  binding: LocalBinding,
  init: AstNode | null,
  env: NodeEnv
): BindingNode {
  return {
    op: 'binding',
    form: sym,
    env,
    children: init !== null ? ['init'] : [],
    pos: getPos(sym) ?? null,
    tag: null,
    name: binding.name,
    localKind: binding.kind,
    slot: binding.slot,
    init,
    binding,
    argId: binding.argId,
    variadic: binding.variadic,
  }
}

// ─── body / do ────────────────────────────────────────────────────────────────

function analyzeBody(
  forms: CljValue[],
  env: NodeEnv,
  st: AnalyzeState,
  formForPos: CljValue
): DoNode {
  const analyzed = forms.map((f) => analyze(f, env, st))
  const statements = analyzed.slice(0, -1)
  const ret =
    analyzed.length > 0 ? analyzed[analyzed.length - 1] : nilConst(env)
  return {
    op: 'do',
    form: formForPos,
    env,
    children: ['statements', 'ret'],
    pos: getPos(formForPos) ?? null,
    tag: null,
    statements,
    ret,
    body: true,
  }
}

// ─── public entry ─────────────────────────────────────────────────────────────

export function analyze(
  form: CljValue,
  env: NodeEnv,
  st: AnalyzeState
): AstNode {
  const { expanded, chain } = expandHead(form, st)
  const node = analyzeExpanded(expanded, env, st, form)
  if (chain !== null) node.rawForms = chain
  return node
}

function analyzeExpanded(
  form: CljValue,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  if (is.symbol(form)) return analyzeSymbol(form, env, st, orig)
  if (is.vector(form)) return analyzeVector(form, env, st, orig)
  if (is.map(form)) return analyzeMap(form, env, st, orig)
  if (is.set(form)) return analyzeSet(form, env, st, orig)
  if (is.list(form)) return analyzeList(form, env, st, orig)
  // Everything else is a literal constant.
  return constNode(form, env, posOf(orig, form))
}

// ─── symbols ──────────────────────────────────────────────────────────────────

function analyzeSymbol(
  sym: CljSymbol,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  const name = sym.name
  const pos = posOf(orig, sym)

  // js/... host references (including dot chains like js/Math.PI)
  if (name.startsWith('js/')) {
    const rest = name.slice(3)
    const segments = rest.split('.')
    return {
      op: 'js-var',
      form: sym,
      env,
      children: [],
      pos,
      tag: null,
      name,
      segments,
    }
  }

  const local = resolveLocal(env, name)
  if (local !== undefined) {
    return {
      op: 'local',
      form: sym,
      env,
      children: [],
      pos,
      tag: null,
      name,
      localKind: local.binding.kind,
      slot: local.binding.slot,
      resolved: local.resolved,
      upvalueIndex:
        local.resolved === 'upvalue' ? local.upvalueIndex : undefined,
      argId: local.binding.argId,
      variadic: local.binding.variadic,
      binding: local.binding,
    }
  }

  // Var reference (qualified or resolved through the namespace). One lookup
  // yields both `resolved` and the Var's namespace.
  const slashIdx = name.indexOf('/')
  let ns: string | null = null
  let localName = name
  if (slashIdx > 0 && slashIdx < name.length - 1) {
    ns = name.slice(0, slashIdx)
    localName = name.slice(slashIdx + 1)
  }
  const theVar = resolveVar(name, st)
  return {
    op: 'var',
    form: sym,
    env,
    children: [],
    pos,
    tag: null,
    name: localName,
    ns: ns ?? theVar?.ns ?? null,
    resolved: theVar !== undefined,
  }
}

// ─── collection literals (code position) ────────────────────────────────────

function analyzeVector(
  vec: CljVector,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  return {
    op: 'vector',
    form: vec,
    env,
    children: ['items'],
    pos: posOf(orig, vec),
    tag: null,
    items: vec.value.map((x) => analyze(x, env, st)),
  }
}

function analyzeMap(
  map: CljMap,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  const keys: AstNode[] = []
  const vals: AstNode[] = []
  for (const [k, val] of map.entries) {
    keys.push(analyze(k, env, st))
    vals.push(analyze(val, env, st))
  }
  return {
    op: 'map',
    form: map,
    env,
    children: ['keys', 'vals'],
    pos: posOf(orig, map),
    tag: null,
    keys,
    vals,
  }
}

function analyzeSet(
  set: CljSet,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  return {
    op: 'set',
    form: set,
    env,
    children: ['items'],
    pos: posOf(orig, set),
    tag: null,
    items: setValues(set).map((x) => analyze(x, env, st)),
  }
}

// ─── lists: special forms + invoke ──────────────────────────────────────────

function analyzeList(
  list: CljList,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  if (list.value.length === 0) {
    return constNode(list, env, posOf(orig, list))
  }
  const head = list.value[0]
  if (is.symbol(head)) {
    switch (head.name) {
      case 'if':
        return analyzeIf(list, env, st, orig)
      case 'do':
        return analyzeDo(list, env, st, orig)
      case 'quote':
        return analyzeQuote(list, env, orig)
      case 'let*':
        return analyzeLet(list, env, st, orig, 'let')
      case 'loop*':
        return analyzeLoop(list, env, st, orig)
      case 'letfn*':
        return analyzeLetfn(list, env, st, orig)
      case 'fn*':
        return analyzeFn(list, env, st, orig)
      case 'def':
        return analyzeDef(list, env, st, orig)
      case 'defmacro':
        return analyzeDefmacro(list, env, st, orig)
      case 'recur':
        return analyzeRecur(list, env, st, orig)
      case 'throw':
        // Mirror legacy `canEmitDirectThrow`: `throw` is the special form only
        // as a 2-element `(throw x)` with `throw` not shadowed by a local.
        // A shadowed or wrong-arity `throw` is an ordinary call.
        if (list.value.length === 2 && resolveLocal(env, 'throw') === undefined) {
          return analyzeThrow(list, env, st, orig)
        }
        break
      case 'try':
        return analyzeTry(list, env, st, orig)
      case 'var':
        return analyzeTheVar(list, env, st, orig)
      case 'set!':
        return analyzeSetBang(list, env, st, orig)
      case 'binding':
        return analyzeDynamic(list, env, st, orig)
      case '.':
        return analyzeDot(list, env, st, orig)
      case 'js/new':
        return analyzeNew(list, env, st, orig)
      case 'quasiquote':
        // Could not be expanded (no ctx change); surface rather than crash.
        return invalid(
          list,
          env,
          posOf(orig, list),
          'unexpanded quasiquote',
          'malformed',
          st
        )
      default:
        break
    }
  }
  return analyzeInvoke(list, env, st, orig)
}

function analyzeIf(
  list: CljList,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  const [, test, then, els] = list.value
  return {
    op: 'if',
    form: list,
    env,
    children: ['test', 'then', 'else'],
    pos: posOf(orig, list),
    tag: null,
    test: analyze(test, env, st),
    then: analyze(then, env, st),
    else: els !== undefined ? analyze(els, env, st) : nilConst(env),
  }
}

function analyzeDo(
  list: CljList,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  const body = analyzeBody(list.value.slice(1), env, st, list)
  // A top-level do is not a synthetic body.
  return { ...body, form: list, body: false, pos: posOf(orig, list) }
}

function analyzeQuote(list: CljList, env: NodeEnv, orig: CljValue): AstNode {
  const datum = list.value[1] ?? v.nil()
  const pos = posOf(orig, list)
  return {
    op: 'quote',
    form: list,
    env,
    children: ['expr'],
    pos,
    tag: null,
    expr: constNode(datum, env, getPos(datum) ?? null),
    literal: true,
  }
}

function analyzeLet(
  list: CljList,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue,
  kind: 'let'
): AstNode {
  const bindingVec = list.value[1]
  const pairs = is.vector(bindingVec) ? bindingVec.value : ([] as CljValue[])
  const bindings: BindingNode[] = []
  let curEnv = env
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    const sym = pairs[i]
    const initForm = pairs[i + 1]
    if (!is.symbol(sym)) continue
    const initNode = analyze(initForm, curEnv, st)
    const binding = declareLocal(curEnv, sym.name, kind)
    bindings.push(bindingNode(sym, binding, initNode, curEnv))
    curEnv = withLocals(curEnv, [[sym.name, binding]])
  }
  const body = analyzeBody(list.value.slice(2), curEnv, st, list)
  return {
    op: 'let',
    form: list,
    env,
    children: ['bindings', 'body'],
    pos: posOf(orig, list),
    tag: null,
    bindings,
    body,
  }
}

function analyzeLoop(
  list: CljList,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  const bindingVec = list.value[1]
  const pairs = is.vector(bindingVec) ? bindingVec.value : ([] as CljValue[])
  const bindings: BindingNode[] = []
  let curEnv = env
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    const sym = pairs[i]
    const initForm = pairs[i + 1]
    if (!is.symbol(sym)) continue
    const initNode = analyze(initForm, curEnv, st)
    const binding = declareLocal(curEnv, sym.name, 'loop')
    bindings.push(bindingNode(sym, binding, initNode, curEnv))
    curEnv = withLocals(curEnv, [[sym.name, binding]])
  }
  const bodyEnv = withRecur(curEnv, {
    kind: 'loop',
    arity: bindings.length,
    variadic: false,
  })
  const body = analyzeBody(list.value.slice(2), bodyEnv, st, list)
  return {
    op: 'loop',
    form: list,
    env,
    children: ['bindings', 'body'],
    pos: posOf(orig, list),
    tag: null,
    bindings,
    body,
    loopArity: bindings.length,
  }
}

function analyzeLetfn(
  list: CljList,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  const bindingVec = list.value[1]
  const pairs = is.vector(bindingVec) ? bindingVec.value : ([] as CljValue[])
  // RB-007 fix: declare ALL letfn names before analyzing any init body, so
  // siblings (and self) are visible and capturable across fn/lazy-seq thunks.
  const names: Array<{
    sym: CljSymbol
    binding: LocalBinding
    init: CljValue
  }> = []
  let curEnv = env
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    const sym = pairs[i]
    if (!is.symbol(sym)) continue
    const binding = declareLocal(curEnv, sym.name, 'letfn')
    names.push({ sym, binding, init: pairs[i + 1] })
  }
  curEnv = withLocals(
    curEnv,
    names.map(
      ({ sym, binding }) => [sym.name, binding] as [string, LocalBinding]
    )
  )
  const bindings: BindingNode[] = names.map(({ sym, binding, init }) =>
    bindingNode(sym, binding, analyze(init, curEnv, st), curEnv)
  )
  const body = analyzeBody(list.value.slice(2), curEnv, st, list)
  return {
    op: 'letfn',
    form: list,
    env,
    children: ['bindings', 'body'],
    pos: posOf(orig, list),
    tag: null,
    bindings,
    body,
  }
}

function analyzeFn(
  list: CljList,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  let rest = list.value.slice(1)
  let nameSym: CljSymbol | null = null
  if (rest.length > 0 && is.symbol(rest[0])) {
    nameSym = rest[0]
    rest = rest.slice(1)
  }
  let arities: Arity[]
  try {
    arities = parseArities(rest, st.cljEnv)
  } catch (e) {
    return invalid(
      list,
      env,
      posOf(orig, list),
      `invalid fn*: ${(e as Error).message}`,
      'malformed',
      st
    )
  }

  const fnEnv = enterFn(env)
  const selfName = nameSym?.name ?? null

  const methods: FnMethodNode[] = arities.map((arity) =>
    analyzeFnMethod(arity, fnEnv, st, list, selfName)
  )

  const variadic = arities.some((a) => a.restParam !== null)
  const maxFixedArity = arities.reduce(
    (max, a) => Math.max(max, a.params.length),
    0
  )

  return {
    op: 'fn',
    form: list,
    env,
    children: ['methods'],
    pos: posOf(orig, list),
    tag: null,
    name: selfName,
    methods,
    variadic,
    maxFixedArity,
    // Shared upvalue table for the whole closure (matches the VM's per-closure
    // upvalueDescriptors). Captured names visible here pre-execution.
    captures: fnEnv.closure.upvalues,
  }
}

function analyzeFnMethod(
  arity: Arity,
  fnEnv: NodeEnv,
  st: AnalyzeState,
  formForPos: CljValue,
  selfName: string | null
): FnMethodNode {
  // Fresh slot space per arity: the runtime numbers each arity's frame from 0.
  const params: BindingNode[] = []
  let curEnv = enterArity(fnEnv)
  let argId = 0
  for (const p of arity.params) {
    const binding = declareLocal(curEnv, p.name, 'arg', { argId })
    params.push(bindingNode(p, binding, null, curEnv))
    curEnv = withLocals(curEnv, [[p.name, binding]])
    argId++
  }
  if (arity.restParam !== null) {
    const binding = declareLocal(curEnv, arity.restParam.name, 'arg', {
      argId,
      variadic: true,
    })
    params.push(bindingNode(arity.restParam, binding, null, curEnv))
    curEnv = withLocals(curEnv, [[arity.restParam.name, binding]])
  }

  // Self-name comes AFTER params (slot = paramSlotCount) and only if no param
  // of THIS arity already claimed the name — a param shadows the self-name. We
  // check this arity's params (not curEnv.locals, which also carries enclosing
  // bindings) to mirror the VM's per-frame `!compileEnv.locals.has(selfName)`:
  // an enclosing same-name binding (e.g. a letfn sibling) must NOT suppress it.
  let self: BindingNode | null = null
  const paramNames = new Set(params.map((p) => p.name))
  if (selfName !== null && !paramNames.has(selfName)) {
    const selfBinding = declareLocal(curEnv, selfName, 'fn')
    const selfSym: CljSymbol = { kind: 'symbol', name: selfName }
    self = bindingNode(selfSym, selfBinding, null, curEnv)
    curEnv = withLocals(curEnv, [[selfName, selfBinding]])
  }

  const recurEnv = withRecur(curEnv, {
    kind: 'fn',
    arity: arity.params.length,
    variadic: arity.restParam !== null,
  })
  const body = analyzeBody(arity.body, recurEnv, st, formForPos)

  return {
    op: 'fn-method',
    form: formForPos,
    env: fnEnv,
    children: self !== null ? ['params', 'self', 'body'] : ['params', 'body'],
    pos: getPos(formForPos) ?? null,
    tag: null,
    params,
    self,
    variadic: arity.restParam !== null,
    fixedArity: arity.params.length,
    body,
  }
}

function analyzeDef(
  list: CljList,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  const nameSym = list.value[1]
  const name = is.symbol(nameSym) ? nameSym.name : '<invalid>'
  const rest = list.value.slice(2)
  let doc: string | null = null
  let initForm: CljValue | undefined
  if (rest.length === 2 && is.string(rest[0])) {
    doc = rest[0].value
    initForm = rest[1]
  } else if (rest.length >= 1) {
    initForm = rest[rest.length - 1]
  }
  return {
    op: 'def',
    form: list,
    env,
    children: initForm !== undefined ? ['init'] : [],
    pos: posOf(orig, list),
    tag: null,
    name,
    ns: env.nsName,
    init: initForm !== undefined ? analyze(initForm, env, st) : null,
    doc,
    metaNode: null,
  }
}

function analyzeDefmacro(
  list: CljList,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  const nameSym = list.value[1]
  if (!is.symbol(nameSym)) {
    return invalid(
      list,
      env,
      posOf(orig, list),
      'defmacro: name must be a symbol',
      'malformed',
      st
    )
  }

  let rest = list.value.slice(2)
  let doc: string | null = null
  if (rest.length > 0 && is.string(rest[0])) {
    doc = rest[0].value
    rest = rest.slice(1)
  }

  // Synthesize anonymous (fn* <arityForms>) — no self-name, matching the VM's
  // emitDefMacro which builds the closure without a name binding.
  const fnStarForm: CljList = { kind: 'list', value: [v.symbol('fn*'), ...rest] }
  const init = analyze(fnStarForm, env, st)

  return {
    op: 'def',
    form: list,
    env,
    children: ['init'],
    pos: posOf(orig, list),
    tag: null,
    name: nameSym.name,
    ns: env.nsName,
    init,
    doc,
    metaNode: null,
    isMacro: true,
  }
}

function analyzeRecur(
  list: CljList,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  const exprs = list.value.slice(1).map((x) => analyze(x, env, st))
  return {
    op: 'recur',
    form: list,
    env,
    children: ['exprs'],
    pos: posOf(orig, list),
    tag: null,
    exprs,
    targetKind: env.recur?.kind ?? null,
    targetArity: env.recur?.arity ?? null,
  }
}

function analyzeThrow(
  list: CljList,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  const exprForm = list.value[1]
  return {
    op: 'throw',
    form: list,
    env,
    children: ['exception'],
    pos: posOf(orig, list),
    tag: null,
    exception:
      exprForm !== undefined ? analyze(exprForm, env, st) : nilConst(env),
  }
}

function analyzeTry(
  list: CljList,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  let parsed: ReturnType<typeof parseTryStructure>
  try {
    parsed = parseTryStructure(list, st.cljEnv)
  } catch (e) {
    return invalid(
      list,
      env,
      posOf(orig, list),
      `invalid try: ${(e as Error).message}`,
      'malformed',
      st
    )
  }
  const { bodyForms, catchClauses, finallyForms } = parsed
  const body = analyzeBody(bodyForms, env, st, list)
  const catches = catchClauses.map((clause) => {
    const discriminator = analyze(clause.discriminator, env, st)
    const binding = declareLocal(env, clause.binding, 'catch')
    const sym: CljSymbol = { kind: 'symbol', name: clause.binding }
    const catchEnv = withLocals(env, [[clause.binding, binding]])
    const catchBody = analyzeBody(clause.body, catchEnv, st, list)
    const local = bindingNode(sym, binding, null, catchEnv)
    return {
      op: 'catch' as const,
      form: list,
      env,
      children: ['discriminator', 'local', 'body'],
      pos: getPos(list) ?? null,
      tag: null,
      discriminator,
      local,
      body: catchBody,
    }
  })
  const finallyBody =
    finallyForms !== null ? analyzeBody(finallyForms, env, st, list) : null
  return {
    op: 'try',
    form: list,
    env,
    children:
      finallyForms !== null
        ? ['body', 'catches', 'finallyBody']
        : ['body', 'catches'],
    pos: posOf(orig, list),
    tag: null,
    body,
    catches,
    finallyBody,
  }
}

function analyzeTheVar(
  list: CljList,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  const sym = list.value[1]
  const name = is.symbol(sym) ? sym.name : '<invalid>'
  const slashIdx = name.indexOf('/')
  let ns: string | null = null
  let localName = name
  if (slashIdx > 0 && slashIdx < name.length - 1) {
    ns = name.slice(0, slashIdx)
    localName = name.slice(slashIdx + 1)
  }
  const theVar = is.symbol(sym) ? resolveVar(name, st) : undefined
  const isQualified = ns !== null
  const lexicalCandidates =
    is.symbol(sym) && !isQualified
      ? resolveVarLexicalCandidates(env, name)
      : []
  return {
    op: 'the-var',
    form: list,
    env,
    children: [],
    pos: posOf(orig, list),
    tag: null,
    name: localName,
    ns: ns ?? theVar?.ns ?? null,
    resolved: theVar !== undefined,
    lexicalCandidates,
  }
}

function analyzeSetBang(
  list: CljList,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  const target = list.value[1]
  const val = list.value[2]
  return {
    op: 'set!',
    form: list,
    env,
    children: ['target', 'val'],
    pos: posOf(orig, list),
    tag: null,
    target: target !== undefined ? analyze(target, env, st) : nilConst(env),
    val: val !== undefined ? analyze(val, env, st) : nilConst(env),
  }
}

function analyzeDynamic(
  list: CljList,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  const bindingVec = list.value[1]
  const pairs = is.vector(bindingVec) ? bindingVec.value : ([] as CljValue[])
  const bindingVars: VarNode[] = []
  const inits: AstNode[] = []
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    const sym = pairs[i]
    if (is.symbol(sym)) {
      const varRef = analyzeSymbol(sym, env, st, sym)
      if (varRef.op === 'var') bindingVars.push(varRef)
    }
    inits.push(analyze(pairs[i + 1], env, st))
  }
  const body = analyzeBody(list.value.slice(2), env, st, list)
  return {
    op: 'dynamic',
    form: list,
    env,
    children: ['bindingVars', 'inits', 'body'],
    pos: posOf(orig, list),
    tag: null,
    bindingVars,
    inits,
    body,
  }
}

function analyzeDot(
  list: CljList,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  const pos = posOf(orig, list)
  if (list.value.length < 3) {
    return invalid(
      list,
      env,
      pos,
      '. requires (. target member)',
      'malformed',
      st
    )
  }
  const target = analyze(list.value[1], env, st)
  const member = list.value[2]

  // (. target (method args...))
  if (
    is.list(member) &&
    member.value.length > 0 &&
    is.symbol(member.value[0])
  ) {
    return {
      op: 'host-call',
      form: list,
      env,
      children: ['target', 'args'],
      pos,
      tag: null,
      method: member.value[0].name,
      target,
      args: member.value.slice(1).map((a) => analyze(a, env, st)),
    }
  }

  if (is.symbol(member)) {
    // Property access: (. target prop) with zero extra args. cljam uses bare
    // property names (not the ClojureScript `-prop` convention).
    const args = list.value.slice(3)
    if (args.length === 0) {
      return {
        op: 'host-field',
        form: list,
        env,
        children: ['target'],
        pos,
        tag: null,
        field: member.name,
        target,
        assignable: true,
      }
    }
    return {
      op: 'host-call',
      form: list,
      env,
      children: ['target', 'args'],
      pos,
      tag: null,
      method: member.name,
      target,
      args: args.map((a) => analyze(a, env, st)),
    }
  }

  return invalid(
    list,
    env,
    pos,
    '. member must be a symbol or method call',
    'malformed',
    st
  )
}

function analyzeNew(
  list: CljList,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  const classForm = list.value[1]
  return {
    op: 'new',
    form: list,
    env,
    children: ['className', 'args'],
    pos: posOf(orig, list),
    tag: null,
    className:
      classForm !== undefined ? analyze(classForm, env, st) : nilConst(env),
    args: list.value.slice(2).map((a) => analyze(a, env, st)),
  }
}

function analyzeInvoke(
  list: CljList,
  env: NodeEnv,
  st: AnalyzeState,
  orig: CljValue
): AstNode {
  return {
    op: 'invoke',
    form: list,
    env,
    children: ['fn', 'args'],
    pos: posOf(orig, list),
    tag: null,
    fn: analyze(list.value[0], env, st),
    args: list.value.slice(1).map((a) => analyze(a, env, st)),
  }
}
