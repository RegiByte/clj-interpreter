import { is } from '../assertions'
import {
  define,
  extend,
  getNamespaceEnv,
  internVar,
  lookup,
  lookupVar,
  makeEnv,
} from '../env'
import { CljThrownSignal, EvaluationError } from '../errors'
import { v } from '../factories'
// --- ASYNC (experimental) ---
import { createAsyncEvalCtx } from './async-evaluator'
// --- END ASYNC ---
import { getLineCol, getPos } from '../positions'
import type {
  CljFunction,
  CljKeyword,
  CljList,
  CljMap,
  CljMultiMethod,
  CljNativeFunction,
  CljValue,
  Env,
  EvaluationContext,
} from '../types'
import { parseArities, RecurSignal } from './arity'
import { destructureBindings } from './destructure'
import { evaluateDot, evaluateNew } from './js-interop'
import { evaluateQuasiquote } from './quasiquote'
import { assertRecurInTailPosition } from './recur-check'
import {
  matchesDiscriminator,
  parseTryStructure,
  validateBindingVector,
} from './form-parsers'

function hasDynamicMeta(meta: CljMap | undefined): boolean {
  if (!meta) return false
  for (const [k, v] of meta.entries) {
    if (
      is.keyword(k) &&
      k.name === ':dynamic' &&
      is.boolean(v) &&
      v.value === true
    ) {
      return true
    }
  }
  return false
}

export const specialFormKeywords = {
  quote: 'quote',
  def: 'def',
  if: 'if',
  do: 'do',
  let: 'let',
  fn: 'fn',
  defmacro: 'defmacro',
  quasiquote: 'quasiquote',
  ns: 'ns',
  loop: 'loop',
  recur: 'recur',
  defmulti: 'defmulti',
  defmethod: 'defmethod',
  try: 'try',
  var: 'var',
  binding: 'binding',
  'set!': 'set!',
  letfn: 'letfn',
  delay: 'delay',
  'lazy-seq': 'lazy-seq',
  // --- ASYNC (experimental) ---
  async: 'async',
  // --- END ASYNC ---
  // --- JS INTEROP ---
  '.': '.',
  'js/new': 'js/new',
  // --- END JS INTEROP ---
} as const

function keywordToDispatchFn(kw: CljKeyword): CljNativeFunction {
  return v.nativeFn(`kw:${kw.name}`, (...args: CljValue[]) => {
    const target = args[0]
    if (!is.map(target)) return v.nil()
    const entry = target.entries.find(([k]) => is.equal(k, kw))
    return entry ? entry[1] : v.nil()
  })
}

function evaluateTry(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const { bodyForms, catchClauses, finallyForms } = parseTryStructure(
    list,
    env
  )

  let result: CljValue = v.nil()
  let pendingThrow: unknown = null

  try {
    result = ctx.evaluateForms(bodyForms, env)
  } catch (e) {
    if (e instanceof RecurSignal) throw e

    let thrownValue: CljValue
    if (e instanceof CljThrownSignal) {
      thrownValue = e.value
    } else if (e instanceof EvaluationError) {
      thrownValue = v.map([
        [v.keyword(':type'), v.keyword(':error/runtime')],
        [v.keyword(':message'), v.string(e.message)],
      ])
    } else {
      throw e
    }

    let handled = false
    for (const clause of catchClauses) {
      if (matchesDiscriminator(clause.discriminator, thrownValue, env, ctx)) {
        const catchEnv = extend([clause.binding], [thrownValue], env)
        result = ctx.evaluateForms(clause.body, catchEnv)
        handled = true
        break
      }
    }

    if (!handled) {
      pendingThrow = e
    }
  } finally {
    if (finallyForms) {
      ctx.evaluateForms(finallyForms, env)
    }
  }

  if (pendingThrow !== null) throw pendingThrow
  return result
}

function evaluateQuote(
  list: CljList,
  _env: Env,
  _ctx: EvaluationContext
): CljValue {
  return list.value[1]
}

function evalQuasiquote(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  return evaluateQuasiquote(list.value[1], env, new Map(), ctx)
}

/**
 * Merge reader-attached symbol metadata with source-position metadata
 * (:line, :column, :file) derived from the current evaluation context.
 * Returns undefined if there is nothing to attach.
 */
function buildVarMeta(
  symMeta: CljMap | undefined,
  ctx: EvaluationContext,
  nameVal?: CljValue
): CljMap | undefined {
  const pos = nameVal ? getPos(nameVal) : undefined
  const hasPosInfo = pos && ctx.currentSource

  if (!symMeta && !hasPosInfo) return undefined

  const posEntries: [CljValue, CljValue][] = []
  if (hasPosInfo) {
    const { line, col } = getLineCol(ctx.currentSource!, pos!.start)
    const lineOffset = ctx.currentLineOffset ?? 0
    const colOffset = ctx.currentColOffset ?? 0
    posEntries.push([v.keyword(':line'), v.number(line + lineOffset)])
    posEntries.push([
      v.keyword(':column'),
      v.number(line === 1 ? col + colOffset : col),
    ])
    if (ctx.currentFile) {
      posEntries.push([v.keyword(':file'), v.string(ctx.currentFile)])
    }
  }

  // Preserve all existing symMeta entries except the three we're stamping.
  const POS_KEYS = new Set([':line', ':column', ':file'])
  const baseEntries = (symMeta?.entries ?? []).filter(
    ([k]) => !(k.kind === 'keyword' && POS_KEYS.has(k.name))
  )

  const allEntries = [...baseEntries, ...posEntries]
  return allEntries.length > 0 ? v.map(allEntries) : undefined
}

function evaluateDef(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const name = list.value[1]
  if (name.kind !== 'symbol') {
    throw new EvaluationError('First element of list must be a symbol', {
      name,
      list,
      env,
    })
  }
  // (def name) with no value is a bare declaration — a no-op in the evaluator.
  // This lets .clj source files declare runtime-injected symbols so that
  // clojure-lsp can resolve them, without clobbering the native binding.
  if (list.value[2] === undefined) return v.nil()

  const nsEnv = getNamespaceEnv(env)
  const cljNs = nsEnv.ns!
  const newValue = ctx.evaluate(list.value[2], env)

  // Compute source position metadata (:line/:column/:file) if available.
  const varMeta = buildVarMeta(name.meta, ctx, name)

  const existing = cljNs.vars.get(name.name)
  if (existing) {
    existing.value = newValue
    if (varMeta) {
      existing.meta = varMeta
      if (hasDynamicMeta(varMeta)) existing.dynamic = true
    }
  } else {
    const newVar = v.var(cljNs.name, name.name, newValue, varMeta)
    if (hasDynamicMeta(varMeta)) newVar.dynamic = true
    cljNs.vars.set(name.name, newVar)
  }
  return v.nil()
}

const evaluateNs = (
  _list: CljList,
  _env: Env,
  _ctx: EvaluationContext
): CljValue => {
  return v.nil() // special form handled by the environment, no effects here
}

function evaluateIf(list: CljList, env: Env, ctx: EvaluationContext): CljValue {
  const condition = ctx.evaluate(list.value[1], env)
  if (!is.falsy(condition)) {
    return ctx.evaluate(list.value[2], env)
  }
  if (!list.value[3]) {
    return v.nil() // no-else case, return nil
  }
  return ctx.evaluate(list.value[3], env)
}

function evaluateDo(list: CljList, env: Env, ctx: EvaluationContext): CljValue {
  return ctx.evaluateForms(list.value.slice(1), env)
}

function evaluateLet(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const bindings = list.value[1]
  validateBindingVector(bindings, 'let', env)
  const body = list.value.slice(2)
  let localEnv = env
  for (let i = 0; i < bindings.value.length; i += 2) {
    const pattern = bindings.value[i]
    const value = ctx.evaluate(bindings.value[i + 1], localEnv)
    const pairs = destructureBindings(pattern, value, ctx, localEnv)
    localEnv = extend(
      pairs.map(([n]) => n),
      pairs.map(([, v]) => v),
      localEnv
    )
  }

  return ctx.evaluateForms(body, localEnv)
}

function evaluateFn(
  list: CljList,
  env: Env,
  _ctx: EvaluationContext
): CljValue {
  const rest = list.value.slice(1)
  // (fn name [...] ...) — optional name symbol before the param vector/arities
  let fnName: string | undefined
  let arityForms = rest
  if (rest[0]?.kind === 'symbol') {
    fnName = rest[0].name
    arityForms = rest.slice(1)
  }
  const arities = parseArities(arityForms, env)
  for (const arity of arities) {
    assertRecurInTailPosition(arity.body)
  }
  const fn = v.multiArityFunction(arities, env)
  if (fnName) {
    fn.name = fnName
    // Bind the name in the fn's closure env so the body can call itself by name.
    // We wrap the captured env in a new frame containing name → fn, then point
    // fn.env at that frame so the binding is visible during application.
    const selfEnv = makeEnv(env)
    selfEnv.bindings.set(fnName, fn)
    fn.env = selfEnv
  }
  return fn
}

function evaluateLetfn(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  // (letfn [(f1 [x] ...) (f2 [x] ...)] body...)
  const fnSpecs = list.value[1]
  if (!is.vector(fnSpecs)) {
    throw new EvaluationError('letfn binding specs must be a vector', {
      fnSpecs,
      env,
    })
  }
  const body = list.value.slice(2)

  // Create a shared env frame for all the fns to close over
  const sharedEnv = makeEnv(env)

  // First pass: create all fn objects in the shared env
  for (const spec of fnSpecs.value) {
    if (!is.list(spec) || spec.value.length < 2 || !is.symbol(spec.value[0])) {
      throw new EvaluationError(
        'letfn specs must be (name [params] body...) forms',
        { spec }
      )
    }
    const name = spec.value[0].name
    const arityForms = spec.value.slice(1)
    const arities = parseArities(arityForms, sharedEnv)
    for (const arity of arities) {
      assertRecurInTailPosition(arity.body)
    }
    const fn = v.multiArityFunction(arities, sharedEnv)
    fn.name = name
    sharedEnv.bindings.set(name, fn)
  }

  // Second pass: point all fn envs to the shared env so they can see each other
  for (const spec of fnSpecs.value) {
    const name = (spec as CljList).value[0] as { name: string }
    const fn = sharedEnv.bindings.get(name.name) as CljFunction
    fn.env = sharedEnv
  }

  return ctx.evaluateForms(body, sharedEnv)
}

function mergeDocIntoMeta(base: CljMap | undefined, docstring: string): CljMap {
  const docEntry: [CljValue, CljValue] = [
    v.keyword(':doc'),
    v.string(docstring),
  ]
  const existing = (base?.entries ?? []).filter(
    ([k]) => !(k.kind === 'keyword' && k.name === ':doc')
  )
  return { kind: 'map', entries: [...existing, docEntry] }
}

function evaluateDefmacro(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const name = list.value[1]
  if (!is.symbol(name)) {
    throw new EvaluationError('First element of defmacro must be a symbol', {
      name,
      list,
      env,
    })
  }
  const rest = list.value.slice(2)
  const docstring = rest[0]?.kind === 'string' ? rest[0].value : undefined
  const arityForms = docstring ? rest.slice(1) : rest
  const arities = parseArities(arityForms, env)
  const macro = v.multiArityMacro(arities, env)
  macro.name = name.name
  const varMeta = buildVarMeta(name.meta, ctx, name)
  const finalMeta = docstring ? mergeDocIntoMeta(varMeta, docstring) : varMeta
  internVar(name.name, macro, getNamespaceEnv(env), finalMeta)
  return v.nil()
}

function evaluateLoop(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const loopBindings = list.value[1]
  validateBindingVector(loopBindings, 'loop', env)
  const loopBody = list.value.slice(2)
  assertRecurInTailPosition(loopBody)

  // Collect top-level patterns and initial values.
  // recur rebinds at the top-level pattern granularity (not individual symbols).
  const patterns: CljValue[] = []
  const initValues: CljValue[] = []
  let initEnv = env
  for (let i = 0; i < loopBindings.value.length; i += 2) {
    const pattern = loopBindings.value[i]
    const value = ctx.evaluate(loopBindings.value[i + 1], initEnv)
    patterns.push(pattern)
    initValues.push(value)
    const pairs = destructureBindings(pattern, value, ctx, initEnv)
    initEnv = extend(
      pairs.map(([n]) => n),
      pairs.map(([, v]) => v),
      initEnv
    )
  }

  let currentValues = initValues

  while (true) {
    let loopEnv = env
    for (let i = 0; i < patterns.length; i++) {
      const pairs = destructureBindings(
        patterns[i],
        currentValues[i],
        ctx,
        loopEnv
      )
      loopEnv = extend(
        pairs.map(([n]) => n),
        pairs.map(([, v]) => v),
        loopEnv
      )
    }
    try {
      return ctx.evaluateForms(loopBody, loopEnv)
    } catch (e) {
      if (e instanceof RecurSignal) {
        if (e.args.length !== patterns.length) {
          throw new EvaluationError(
            `recur expects ${patterns.length} arguments but got ${e.args.length}`,
            { list, env }
          )
        }
        currentValues = e.args
        continue
      }
      throw e
    }
  }
}

function evaluateRecur(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const args = list.value.slice(1).map((v) => ctx.evaluate(v, env))
  throw new RecurSignal(args)
}

function evaluateDefmulti(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const mmName = list.value[1]
  if (!is.symbol(mmName)) {
    throw new EvaluationError('defmulti: first argument must be a symbol', {
      list,
      env,
    })
  }
  const dispatchFnExpr = list.value[2]
  let dispatchFn: CljFunction | CljNativeFunction
  if (is.keyword(dispatchFnExpr)) {
    dispatchFn = keywordToDispatchFn(dispatchFnExpr)
  } else {
    const evaluated = ctx.evaluate(dispatchFnExpr, env)
    if (!is.aFunction(evaluated)) {
      throw new EvaluationError(
        'defmulti: dispatch-fn must be a function or keyword',
        { list, env }
      )
    }
    dispatchFn = evaluated
  }
  const mm = v.multiMethod(mmName.name, dispatchFn, [])
  internVar(mmName.name, mm, getNamespaceEnv(env))
  return v.nil()
}

function evaluateDefmethod(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const mmName = list.value[1]
  if (!is.symbol(mmName)) {
    throw new EvaluationError('defmethod: first argument must be a symbol', {
      list,
      env,
    })
  }
  const dispatchVal = ctx.evaluate(list.value[2], env)
  const existing = lookup(mmName.name, env)
  if (!is.multiMethod(existing)) {
    throw new EvaluationError(
      `defmethod: ${mmName.name} is not a multimethod`,
      { list, env }
    )
  }
  const arities = parseArities([list.value[3], ...list.value.slice(4)], env)
  const methodFn = v.multiArityFunction(arities, env)
  const isDefault = is.keyword(dispatchVal) && dispatchVal.name === ':default'
  let updated: CljMultiMethod
  if (isDefault) {
    updated = v.multiMethod(
      existing.name,
      existing.dispatchFn,
      existing.methods,
      methodFn
    )
  } else {
    const filtered = existing.methods.filter(
      (m) => !is.equal(m.dispatchVal, dispatchVal)
    )
    updated = v.multiMethod(existing.name, existing.dispatchFn, [
      ...filtered,
      { dispatchVal, fn: methodFn },
    ])
  }
  // Update the var's value in place if possible, otherwise fall back to define
  const eVar = lookupVar(mmName.name, env)
  if (eVar) {
    eVar.value = updated
  } else {
    define(mmName.name, updated, getNamespaceEnv(env))
  }
  return v.nil()
}

function evaluateVar(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const sym = list.value[1]
  if (!is.symbol(sym)) {
    throw new EvaluationError('var expects a symbol', { list })
  }

  const slashIdx = sym.name.indexOf('/')
  if (slashIdx > 0 && slashIdx < sym.name.length - 1) {
    const alias = sym.name.slice(0, slashIdx)
    const localName = sym.name.slice(slashIdx + 1)
    const nsEnv = getNamespaceEnv(env)
    // Resolve alias: local :as alias first, then full namespace name
    const targetNs =
      nsEnv.ns?.aliases.get(alias) ?? ctx.resolveNs(alias) ?? null
    if (!targetNs) {
      throw new EvaluationError(`No such namespace: ${alias}`, { sym })
    }
    const v = targetNs.vars.get(localName)
    if (!v) throw new EvaluationError(`Var ${sym.name} not found`, { sym })
    return v
  }

  const v = lookupVar(sym.name, env)
  if (!v) {
    throw new EvaluationError(
      `Unable to resolve var: ${sym.name} in this context`,
      { sym }
    )
  }
  return v
}

function evaluateBinding(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const bindings = list.value[1]
  if (!is.vector(bindings)) {
    throw new EvaluationError('binding requires a vector of bindings', {
      list,
      env,
    })
  }
  if (bindings.value.length % 2 !== 0) {
    throw new EvaluationError(
      'binding vector must have an even number of forms',
      { list, env }
    )
  }
  const body = list.value.slice(2)
  const boundVars: import('../types').CljVar[] = []

  for (let i = 0; i < bindings.value.length; i += 2) {
    const sym = bindings.value[i]
    if (!is.symbol(sym)) {
      throw new EvaluationError('binding left-hand side must be a symbol', {
        sym,
      })
    }
    const newVal = ctx.evaluate(bindings.value[i + 1], env)
    const v = lookupVar(sym.name, env)
    if (!v) {
      throw new EvaluationError(
        `No var found for symbol '${sym.name}' in binding form`,
        { sym }
      )
    }
    if (!v.dynamic) {
      throw new EvaluationError(
        `Cannot use binding with non-dynamic var ${v.ns}/${v.name}. Mark it dynamic with (def ^:dynamic ${sym.name} ...)`,
        { sym }
      )
    }
    v.bindingStack ??= []
    v.bindingStack.push(newVal)
    boundVars.push(v)
  }

  try {
    return ctx.evaluateForms(body, env)
  } finally {
    for (const v of boundVars) {
      v.bindingStack!.pop()
    }
  }
}

function evaluateSet(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  if (list.value.length !== 3) {
    throw new EvaluationError(
      `set! requires exactly 2 arguments, got ${list.value.length - 1}`,
      { list, env }
    )
  }
  const symForm = list.value[1]
  if (!is.symbol(symForm)) {
    throw new EvaluationError(
      `set! first argument must be a symbol, got ${symForm.kind}`,
      { symForm, env }
    )
  }
  const v = lookupVar(symForm.name, env)
  if (!v) {
    throw new EvaluationError(
      `Unable to resolve var: ${symForm.name} in this context`,
      { symForm, env }
    )
  }
  if (!v.dynamic) {
    throw new EvaluationError(
      `Cannot set! non-dynamic var ${v.ns}/${v.name}. Mark it with ^:dynamic.`,
      { symForm, env }
    )
  }
  if (!v.bindingStack || v.bindingStack.length === 0) {
    throw new EvaluationError(
      `Cannot set! ${v.ns}/${v.name} — no active binding. Use set! only inside a (binding [...] ...) form.`,
      { symForm, env }
    )
  }
  const newVal = ctx.evaluate(list.value[2], env)
  v.bindingStack[v.bindingStack.length - 1] = newVal
  return newVal
}

function evaluateDelay(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const body = list.value.slice(1)
  return v.delay(() => ctx.evaluateForms(body, env))
}

function evaluateLazySeqForm(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const body = list.value.slice(1)
  return v.lazySeq(() => ctx.evaluateForms(body, env))
}

// --- ASYNC BLOCK HANDLER (experimental) ---
// Gateway into the async sub-evaluator. See async-evaluator.ts.
// To revert: remove this function, the `async` case below, and the import above.
function evaluateAsyncBlock(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const body = list.value.slice(1)
  if (body.length === 0) return v.pending(Promise.resolve(v.nil()))
  const asyncCtx = createAsyncEvalCtx(ctx)
  const promise = asyncCtx.evaluateForms(body, env)
  return v.pending(promise)
}
// --- END ASYNC BLOCK HANDLER ---

type SpecialFormEvaluatorFn = (
  list: CljList,
  env: Env,
  ctx: EvaluationContext
) => CljValue

const specialFormEvaluatorEntries = {
  try: evaluateTry,
  quote: evaluateQuote,
  quasiquote: evalQuasiquote,
  def: evaluateDef,
  ns: evaluateNs,
  if: evaluateIf,
  do: evaluateDo,
  let: evaluateLet,
  fn: evaluateFn,
  defmacro: evaluateDefmacro,
  loop: evaluateLoop,
  recur: evaluateRecur,
  defmulti: evaluateDefmulti,
  defmethod: evaluateDefmethod,
  var: evaluateVar,
  binding: evaluateBinding,
  'set!': evaluateSet,
  letfn: evaluateLetfn,
  delay: evaluateDelay,
  'lazy-seq': evaluateLazySeqForm,
  // --- ASYNC (experimental) ---
  async: evaluateAsyncBlock,
  // --- END ASYNC ---
  // --- JS INTEROP ---
  '.': evaluateDot,
  'js/new': evaluateNew,
  // --- END JS INTEROP ---
} as const satisfies Record<
  keyof typeof specialFormKeywords,
  SpecialFormEvaluatorFn
>

export function evaluateSpecialForm(
  symbol: string,
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const evalFn =
    specialFormEvaluatorEntries[
      symbol as keyof typeof specialFormEvaluatorEntries
    ]
  if (evalFn) {
    return evalFn(list, env, ctx)
  }
  throw new EvaluationError(`Unknown special form: ${symbol}`, {
    symbol,
    list,
    env,
  })
}
