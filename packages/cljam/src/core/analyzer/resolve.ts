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
  CljVector,
  Env,
  EvaluationContext,
  Pos,
} from '../types'
import {
  declareLocal,
  enterFn,
  type LocalBinding,
  type NodeEnv,
  resolveLocal,
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

// ─── macro lookup + expand-as-descend ───────────────────────────────────────

function lookupMacro(
  name: string,
  cljEnv: Env,
  ctx: EvaluationContext
): CljValue | undefined {
  const slashIdx = name.indexOf('/')
  if (slashIdx > 0 && slashIdx < name.length - 1) {
    const nsPrefix = name.slice(0, slashIdx)
    const localName = name.slice(slashIdx + 1)
    const nsEnv = getNamespaceEnv(cljEnv)
    const targetNs =
      nsEnv.ns?.aliases.get(nsPrefix) ?? ctx.resolveNs(nsPrefix) ?? null
    if (!targetNs) return undefined
    const varEntry = targetNs.vars.get(localName)
    return varEntry !== undefined ? derefValue(varEntry) : undefined
  }
  return tryLookup(name, cljEnv)
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

function expandHead(
  form: CljValue,
  cljEnv: Env,
  ctx: EvaluationContext
): Expansion {
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
        const ex = ctx.expandAll(current, cljEnv)
        if (ex === current) break
        chain.push(current)
        current = ex
        continue
      }
      const macro = lookupMacro(name, cljEnv, ctx)
      if (macro === undefined || !is.macro(macro)) break
      chain.push(current)
      current = ctx.applyMacro(macro, current.value.slice(1))
    } catch {
      // A macro that throws on (deliberately) malformed args must not abort
      // analysis — stop expanding and analyze what we have. Maybe capture the error and report it on a later design pass.
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
  cljEnv: Env,
  ctx: EvaluationContext,
  formForPos: CljValue
): DoNode {
  const analyzed = forms.map((f) => analyze(f, env, cljEnv, ctx))
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
  cljEnv: Env,
  ctx: EvaluationContext
): AstNode {
  const { expanded, chain } = expandHead(form, cljEnv, ctx)
  const node = analyzeExpanded(expanded, env, cljEnv, ctx, form)
  if (chain !== null) node.rawForms = chain
  return node
}

function analyzeExpanded(
  form: CljValue,
  env: NodeEnv,
  cljEnv: Env,
  ctx: EvaluationContext,
  orig: CljValue
): AstNode {
  if (is.symbol(form)) return analyzeSymbol(form, env, cljEnv, orig)
  if (is.vector(form)) return analyzeVector(form, env, cljEnv, ctx, orig)
  if (is.map(form)) return analyzeMap(form, env, cljEnv, ctx, orig)
  if (is.set(form)) return analyzeSet(form, env, cljEnv, ctx, orig)
  if (is.list(form)) return analyzeList(form, env, cljEnv, ctx, orig)
  // Everything else is a literal constant.
  return constNode(form, env, posOf(orig, form))
}

// ─── symbols ──────────────────────────────────────────────────────────────────

function analyzeSymbol(
  sym: CljSymbol,
  env: NodeEnv,
  cljEnv: Env,
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

  // Var reference (qualified or resolved through the namespace).
  const slashIdx = name.indexOf('/')
  let ns: string | null = null
  let localName = name
  if (slashIdx > 0 && slashIdx < name.length - 1) {
    ns = name.slice(0, slashIdx)
    localName = name.slice(slashIdx + 1)
  }
  const resolved = tryLookup(name, cljEnv) !== undefined
  const theVar = lookupVar(name, cljEnv)
  return {
    op: 'var',
    form: sym,
    env,
    children: [],
    pos,
    tag: null,
    name: localName,
    ns:
      ns ?? (theVar ? ((theVar as { nsName?: string }).nsName ?? null) : null),
    resolved,
  }
}

// ─── collection literals (code position) ────────────────────────────────────

function analyzeVector(
  vec: CljVector,
  env: NodeEnv,
  cljEnv: Env,
  ctx: EvaluationContext,
  orig: CljValue
): AstNode {
  return {
    op: 'vector',
    form: vec,
    env,
    children: ['items'],
    pos: posOf(orig, vec),
    tag: null,
    items: vec.value.map((x) => analyze(x, env, cljEnv, ctx)),
  }
}

function analyzeMap(
  map: CljMap,
  env: NodeEnv,
  cljEnv: Env,
  ctx: EvaluationContext,
  orig: CljValue
): AstNode {
  const keys: AstNode[] = []
  const vals: AstNode[] = []
  for (const [k, val] of map.entries) {
    keys.push(analyze(k, env, cljEnv, ctx))
    vals.push(analyze(val, env, cljEnv, ctx))
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
  cljEnv: Env,
  ctx: EvaluationContext,
  orig: CljValue
): AstNode {
  return {
    op: 'set',
    form: set,
    env,
    children: ['items'],
    pos: posOf(orig, set),
    tag: null,
    items: setValues(set).map((x) => analyze(x, env, cljEnv, ctx)),
  }
}

// ─── lists: special forms + invoke ──────────────────────────────────────────

function analyzeList(
  list: CljList,
  env: NodeEnv,
  cljEnv: Env,
  ctx: EvaluationContext,
  orig: CljValue
): AstNode {
  if (list.value.length === 0) {
    return constNode(list, env, posOf(orig, list))
  }
  const head = list.value[0]
  if (is.symbol(head)) {
    switch (head.name) {
      case 'if':
        return analyzeIf(list, env, cljEnv, ctx, orig)
      case 'do':
        return analyzeDo(list, env, cljEnv, ctx, orig)
      case 'quote':
        return analyzeQuote(list, env, orig)
      case 'let*':
        return analyzeLet(list, env, cljEnv, ctx, orig, 'let')
      case 'loop*':
        return analyzeLoop(list, env, cljEnv, ctx, orig)
      case 'letfn*':
        return analyzeLetfn(list, env, cljEnv, ctx, orig)
      case 'fn*':
        return analyzeFn(list, env, cljEnv, ctx, orig)
      case 'def':
        return analyzeDef(list, env, cljEnv, ctx, orig)
      case 'recur':
        return analyzeRecur(list, env, cljEnv, ctx, orig)
      case 'throw':
        return analyzeThrow(list, env, cljEnv, ctx, orig)
      case 'try':
        return analyzeTry(list, env, cljEnv, ctx, orig)
      case 'var':
        return analyzeTheVar(list, env, cljEnv, orig)
      case 'set!':
        return analyzeSetBang(list, env, cljEnv, ctx, orig)
      case 'binding':
        return analyzeDynamic(list, env, cljEnv, ctx, orig)
      case '.':
        return analyzeDot(list, env, cljEnv, ctx, orig)
      case 'js/new':
        return analyzeNew(list, env, cljEnv, ctx, orig)
      case 'quasiquote':
        // Could not be expanded (no ctx change); surface rather than crash.
        return unsupported(
          list,
          env,
          posOf(orig, list),
          'unexpanded quasiquote'
        )
      default:
        break
    }
  }
  return analyzeInvoke(list, env, cljEnv, ctx, orig)
}

function unsupported(
  form: CljValue,
  env: NodeEnv,
  pos: Pos | null,
  reason: string
): AstNode {
  return {
    op: 'unsupported',
    form,
    env,
    children: [],
    pos,
    tag: null,
    reason,
  }
}

function analyzeIf(
  list: CljList,
  env: NodeEnv,
  cljEnv: Env,
  ctx: EvaluationContext,
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
    test: analyze(test, env, cljEnv, ctx),
    then: analyze(then, env, cljEnv, ctx),
    else: els !== undefined ? analyze(els, env, cljEnv, ctx) : nilConst(env),
  }
}

function analyzeDo(
  list: CljList,
  env: NodeEnv,
  cljEnv: Env,
  ctx: EvaluationContext,
  orig: CljValue
): AstNode {
  const body = analyzeBody(list.value.slice(1), env, cljEnv, ctx, list)
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
  cljEnv: Env,
  ctx: EvaluationContext,
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
    const initNode = analyze(initForm, curEnv, cljEnv, ctx)
    const binding = declareLocal(curEnv, sym.name, kind)
    bindings.push(bindingNode(sym, binding, initNode, curEnv))
    curEnv = withLocals(curEnv, [[sym.name, binding]])
  }
  const body = analyzeBody(list.value.slice(2), curEnv, cljEnv, ctx, list)
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
  cljEnv: Env,
  ctx: EvaluationContext,
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
    const initNode = analyze(initForm, curEnv, cljEnv, ctx)
    const binding = declareLocal(curEnv, sym.name, 'loop')
    bindings.push(bindingNode(sym, binding, initNode, curEnv))
    curEnv = withLocals(curEnv, [[sym.name, binding]])
  }
  const bodyEnv = withRecur(curEnv, {
    kind: 'loop',
    arity: bindings.length,
    variadic: false,
  })
  const body = analyzeBody(list.value.slice(2), bodyEnv, cljEnv, ctx, list)
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
  cljEnv: Env,
  ctx: EvaluationContext,
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
    bindingNode(sym, binding, analyze(init, curEnv, cljEnv, ctx), curEnv)
  )
  const body = analyzeBody(list.value.slice(2), curEnv, cljEnv, ctx, list)
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
  cljEnv: Env,
  ctx: EvaluationContext,
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
    arities = parseArities(rest, cljEnv)
  } catch (e) {
    return unsupported(
      list,
      env,
      posOf(orig, list),
      `invalid fn*: ${(e as Error).message}`
    )
  }

  const fnEnv = enterFn(env)
  let selfBinding: BindingNode | null = null
  let methodBaseEnv = fnEnv
  if (nameSym !== null) {
    const b = declareLocal(fnEnv, nameSym.name, 'fn')
    selfBinding = bindingNode(nameSym, b, null, fnEnv)
    methodBaseEnv = withLocals(fnEnv, [[nameSym.name, b]])
  }

  const methods: FnMethodNode[] = arities.map((arity) =>
    analyzeFnMethod(arity, methodBaseEnv, cljEnv, ctx, list)
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
    children: selfBinding !== null ? ['local', 'methods'] : ['methods'],
    pos: posOf(orig, list),
    tag: null,
    name: nameSym?.name ?? null,
    local: selfBinding,
    methods,
    variadic,
    maxFixedArity,
    // Shared upvalue table for the whole closure (matches the VM's per-closure
    // upvalueDescriptors). Captured names visible here pre-execution.
    captures: fnEnv.fnScope.upvalues,
  }
}

function analyzeFnMethod(
  arity: Arity,
  fnEnv: NodeEnv,
  cljEnv: Env,
  ctx: EvaluationContext,
  formForPos: CljValue
): FnMethodNode {
  const params: BindingNode[] = []
  let curEnv = fnEnv
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

  const recurEnv = withRecur(curEnv, {
    kind: 'fn',
    arity: arity.params.length,
    variadic: arity.restParam !== null,
  })
  const body = analyzeBody(arity.body, recurEnv, cljEnv, ctx, formForPos)

  return {
    op: 'fn-method',
    form: formForPos,
    env: fnEnv,
    children: ['params', 'body'],
    pos: getPos(formForPos) ?? null,
    tag: null,
    params,
    variadic: arity.restParam !== null,
    fixedArity: arity.params.length,
    body,
  }
}

function analyzeDef(
  list: CljList,
  env: NodeEnv,
  cljEnv: Env,
  ctx: EvaluationContext,
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
    init: initForm !== undefined ? analyze(initForm, env, cljEnv, ctx) : null,
    doc,
    metaNode: null,
  }
}

function analyzeRecur(
  list: CljList,
  env: NodeEnv,
  cljEnv: Env,
  ctx: EvaluationContext,
  orig: CljValue
): AstNode {
  const exprs = list.value.slice(1).map((x) => analyze(x, env, cljEnv, ctx))
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
  cljEnv: Env,
  ctx: EvaluationContext,
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
      exprForm !== undefined
        ? analyze(exprForm, env, cljEnv, ctx)
        : nilConst(env),
  }
}

function analyzeTry(
  list: CljList,
  env: NodeEnv,
  cljEnv: Env,
  ctx: EvaluationContext,
  orig: CljValue
): AstNode {
  let parsed: ReturnType<typeof parseTryStructure>
  try {
    parsed = parseTryStructure(list, cljEnv)
  } catch (e) {
    return unsupported(
      list,
      env,
      posOf(orig, list),
      `invalid try: ${(e as Error).message}`
    )
  }
  const { bodyForms, catchClauses, finallyForms } = parsed
  const body = analyzeBody(bodyForms, env, cljEnv, ctx, list)
  const catches = catchClauses.map((clause) => {
    const discriminator = analyze(clause.discriminator, env, cljEnv, ctx)
    const binding = declareLocal(env, clause.binding, 'catch')
    const sym: CljSymbol = { kind: 'symbol', name: clause.binding }
    const catchEnv = withLocals(env, [[clause.binding, binding]])
    const catchBody = analyzeBody(clause.body, catchEnv, cljEnv, ctx, list)
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
    finallyForms !== null
      ? analyzeBody(finallyForms, env, cljEnv, ctx, list)
      : null
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
  cljEnv: Env,
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
  return {
    op: 'the-var',
    form: list,
    env,
    children: [],
    pos: posOf(orig, list),
    tag: null,
    name: localName,
    ns,
    resolved: is.symbol(sym) && tryLookup(name, cljEnv) !== undefined,
  }
}

function analyzeSetBang(
  list: CljList,
  env: NodeEnv,
  cljEnv: Env,
  ctx: EvaluationContext,
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
    target:
      target !== undefined ? analyze(target, env, cljEnv, ctx) : nilConst(env),
    val: val !== undefined ? analyze(val, env, cljEnv, ctx) : nilConst(env),
  }
}

function analyzeDynamic(
  list: CljList,
  env: NodeEnv,
  cljEnv: Env,
  ctx: EvaluationContext,
  orig: CljValue
): AstNode {
  const bindingVec = list.value[1]
  const pairs = is.vector(bindingVec) ? bindingVec.value : ([] as CljValue[])
  const bindingVars: VarNode[] = []
  const inits: AstNode[] = []
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    const sym = pairs[i]
    if (is.symbol(sym)) {
      const varRef = analyzeSymbol(sym, env, cljEnv, sym)
      if (varRef.op === 'var') bindingVars.push(varRef)
    }
    inits.push(analyze(pairs[i + 1], env, cljEnv, ctx))
  }
  const body = analyzeBody(list.value.slice(2), env, cljEnv, ctx, list)
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
  cljEnv: Env,
  ctx: EvaluationContext,
  orig: CljValue
): AstNode {
  const pos = posOf(orig, list)
  if (list.value.length < 3) {
    return unsupported(list, env, pos, '. requires (. target member)')
  }
  const target = analyze(list.value[1], env, cljEnv, ctx)
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
      args: member.value.slice(1).map((a) => analyze(a, env, cljEnv, ctx)),
    }
  }

  if (is.symbol(member)) {
    // (. target -field) -> field access
    if (member.name.startsWith('-')) {
      return {
        op: 'host-field',
        form: list,
        env,
        children: ['target'],
        pos,
        tag: null,
        field: member.name.slice(1),
        target,
        assignable: true,
      }
    }
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
      args: args.map((a) => analyze(a, env, cljEnv, ctx)),
    }
  }

  return unsupported(list, env, pos, '. member must be a symbol or method call')
}

function analyzeNew(
  list: CljList,
  env: NodeEnv,
  cljEnv: Env,
  ctx: EvaluationContext,
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
      classForm !== undefined
        ? analyze(classForm, env, cljEnv, ctx)
        : nilConst(env),
    args: list.value.slice(2).map((a) => analyze(a, env, cljEnv, ctx)),
  }
}

function analyzeInvoke(
  list: CljList,
  env: NodeEnv,
  cljEnv: Env,
  ctx: EvaluationContext,
  orig: CljValue
): AstNode {
  return {
    op: 'invoke',
    form: list,
    env,
    children: ['fn', 'args'],
    pos: posOf(orig, list),
    tag: null,
    fn: analyze(list.value[0], env, cljEnv, ctx),
    args: list.value.slice(1).map((a) => analyze(a, env, cljEnv, ctx)),
  }
}
