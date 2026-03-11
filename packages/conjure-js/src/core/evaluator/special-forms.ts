import {
  isAFunction,
  isEqual,
  isFalsy,
  isKeyword,
  isList,
  isMap,
  isMultiMethod,
  isSymbol,
  isTruthy,
  isVector,
} from '../assertions'
import { define, extend, getNamespaceEnv, internVar, lookup, lookupVar, makeEnv } from '../env'
import { CljThrownSignal, EvaluationError } from '../errors'
import {
  cljDelay,
  cljKeyword,
  cljLazySeq,
  cljMap,
  cljMultiArityFunction,
  cljMultiArityMacro,
  cljMultiMethod,
  cljNativeFunction,
  cljNil,
  cljNumber,
  cljPending,
  cljString,
  cljVar,
} from '../factories'
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
import { evaluateQuasiquote } from './quasiquote'
import { assertRecurInTailPosition } from './recur-check'

function hasDynamicMeta(meta: CljMap | undefined): boolean {
  if (!meta) return false
  for (const [k, v] of meta.entries) {
    if (k.kind === 'keyword' && k.name === ':dynamic' && v.kind === 'boolean' && v.value === true) {
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
} as const

function keywordToDispatchFn(kw: CljKeyword): CljNativeFunction {
  return cljNativeFunction(`kw:${kw.name}`, (...args: CljValue[]) => {
    const target = args[0]
    if (!isMap(target)) return cljNil()
    const entry = target.entries.find(([k]) => isEqual(k, kw))
    return entry ? entry[1] : cljNil()
  })
}

function evaluateTry(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const forms = list.value.slice(1)
  const bodyForms: CljValue[] = []
  const catchClauses: Array<{
    discriminator: CljValue
    binding: string
    body: CljValue[]
  }> = []
  let finallyForms: CljValue[] | null = null

  for (let i = 0; i < forms.length; i++) {
    const form = forms[i]
    if (isList(form) && form.value.length > 0 && isSymbol(form.value[0])) {
      const head = form.value[0].name
      if (head === 'catch') {
        if (form.value.length < 3) {
          throw new EvaluationError(
            'catch requires a discriminator and a binding symbol',
            { form, env }
          )
        }
        const discriminator = form.value[1]
        const bindingSym = form.value[2]
        if (!isSymbol(bindingSym)) {
          throw new EvaluationError('catch binding must be a symbol', {
            form,
            env,
          })
        }
        catchClauses.push({
          discriminator,
          binding: bindingSym.name,
          body: form.value.slice(3),
        })
        continue
      }
      if (head === 'finally') {
        if (i !== forms.length - 1) {
          throw new EvaluationError(
            'finally clause must be the last in try expression',
            {
              form,
              env,
            }
          )
        }
        finallyForms = form.value.slice(1)
        continue
      }
    }
    bodyForms.push(form)
  }

  function matchesDiscriminator(
    discriminator: CljValue,
    thrown: CljValue
  ): boolean {
    let disc: CljValue
    try {
      disc = ctx.evaluate(discriminator, env)
    } catch {
      // Discriminator failed to evaluate (e.g. unresolvable Java class name like
      // java.lang.Throwable). Treat as catch-all — we're not on the JVM.
      return true
    }
    // A symbol that evaluated to itself (shouldn't happen, but guard anyway)
    if (disc.kind === 'symbol') return true
    if (isKeyword(disc)) {
      if (disc.name === ':default') return true
      if (!isMap(thrown)) return false
      const typeEntry = thrown.entries.find(
        ([k]) => isKeyword(k) && k.name === ':type'
      )
      if (!typeEntry) return false
      return isEqual(typeEntry[1], disc)
    }
    if (isAFunction(disc)) {
      const result = ctx.applyFunction(disc, [thrown], env)
      return isTruthy(result)
    }
    throw new EvaluationError(
      'catch discriminator must be a keyword or a predicate function',
      { discriminator: disc, env }
    )
  }

  let result: CljValue = cljNil()
  let pendingThrow: unknown = null

  try {
    result = ctx.evaluateForms(bodyForms, env)
  } catch (e) {
    if (e instanceof RecurSignal) throw e

    let thrownValue: CljValue
    if (e instanceof CljThrownSignal) {
      thrownValue = e.value
    } else if (e instanceof EvaluationError) {
      thrownValue = cljMap([
        [cljKeyword(':type'), cljKeyword(':error/runtime')],
        [cljKeyword(':message'), cljString(e.message)],
      ])
    } else {
      throw e
    }

    let handled = false
    for (const clause of catchClauses) {
      if (matchesDiscriminator(clause.discriminator, thrownValue)) {
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
    const colOffset  = ctx.currentColOffset  ?? 0
    posEntries.push([cljKeyword(':line'),   cljNumber(line + lineOffset)])
    posEntries.push([cljKeyword(':column'), cljNumber(line === 1 ? col + colOffset : col)])
    if (ctx.currentFile) {
      posEntries.push([cljKeyword(':file'), cljString(ctx.currentFile)])
    }
  }

  // Preserve all existing symMeta entries except the three we're stamping.
  const POS_KEYS = new Set([':line', ':column', ':file'])
  const baseEntries = (symMeta?.entries ?? []).filter(
    ([k]) => !(k.kind === 'keyword' && POS_KEYS.has(k.name))
  )

  const allEntries = [...baseEntries, ...posEntries]
  return allEntries.length > 0 ? cljMap(allEntries) : undefined
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
  if (list.value[2] === undefined) return cljNil()

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
    const v = cljVar(cljNs.name, name.name, newValue, varMeta)
    if (hasDynamicMeta(varMeta)) v.dynamic = true
    cljNs.vars.set(name.name, v)
  }
  return cljNil()
}

const evaluateNs = (
  _list: CljList,
  _env: Env,
  _ctx: EvaluationContext
): CljValue => {
  return cljNil() // special form handled by the environment, no effects here
}

function evaluateIf(list: CljList, env: Env, ctx: EvaluationContext): CljValue {
  const condition = ctx.evaluate(list.value[1], env)
  if (!isFalsy(condition)) {
    return ctx.evaluate(list.value[2], env)
  }
  if (!list.value[3]) {
    return cljNil() // no-else case, return nil
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
  if (!isVector(bindings)) {
    throw new EvaluationError('Bindings must be a vector', {
      bindings,
      env,
    })
  }
  if (bindings.value.length % 2 !== 0) {
    throw new EvaluationError(
      'Bindings must be a balanced pair of keys and values',
      { bindings, env }
    )
  }
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
  const fn = cljMultiArityFunction(arities, env)
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
  if (!isVector(fnSpecs)) {
    throw new EvaluationError('letfn binding specs must be a vector', { fnSpecs, env })
  }
  const body = list.value.slice(2)

  // Create a shared env frame for all the fns to close over
  const sharedEnv = makeEnv(env)

  // First pass: create all fn objects in the shared env
  for (const spec of fnSpecs.value) {
    if (!isList(spec) || spec.value.length < 2 || !isSymbol(spec.value[0])) {
      throw new EvaluationError('letfn specs must be (name [params] body...) forms', { spec })
    }
    const name = spec.value[0].name
    const arityForms = spec.value.slice(1)
    const arities = parseArities(arityForms, sharedEnv)
    for (const arity of arities) {
      assertRecurInTailPosition(arity.body)
    }
    const fn = cljMultiArityFunction(arities, sharedEnv)
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
  const docEntry: [CljValue, CljValue] = [cljKeyword(':doc'), cljString(docstring)]
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
  if (!isSymbol(name)) {
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
  const macro = cljMultiArityMacro(arities, env)
  macro.name = name.name
  const varMeta = buildVarMeta(name.meta, ctx, name)
  const finalMeta = docstring ? mergeDocIntoMeta(varMeta, docstring) : varMeta
  internVar(name.name, macro, getNamespaceEnv(env), finalMeta)
  return cljNil()
}

function evaluateLoop(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const loopBindings = list.value[1]
  if (!isVector(loopBindings)) {
    throw new EvaluationError('loop bindings must be a vector', {
      loopBindings,
      env,
    })
  }
  if (loopBindings.value.length % 2 !== 0) {
    throw new EvaluationError(
      'loop bindings must be a balanced pair of keys and values',
      { loopBindings, env }
    )
  }
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
  if (!isSymbol(mmName)) {
    throw new EvaluationError('defmulti: first argument must be a symbol', {
      list,
      env,
    })
  }
  const dispatchFnExpr = list.value[2]
  let dispatchFn: CljFunction | CljNativeFunction
  if (isKeyword(dispatchFnExpr)) {
    dispatchFn = keywordToDispatchFn(dispatchFnExpr)
  } else {
    const evaluated = ctx.evaluate(dispatchFnExpr, env)
    if (!isAFunction(evaluated)) {
      throw new EvaluationError(
        'defmulti: dispatch-fn must be a function or keyword',
        { list, env }
      )
    }
    dispatchFn = evaluated
  }
  const mm = cljMultiMethod(mmName.name, dispatchFn, [])
  internVar(mmName.name, mm, getNamespaceEnv(env))
  return cljNil()
}

function evaluateDefmethod(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const mmName = list.value[1]
  if (!isSymbol(mmName)) {
    throw new EvaluationError('defmethod: first argument must be a symbol', {
      list,
      env,
    })
  }
  const dispatchVal = ctx.evaluate(list.value[2], env)
  const existing = lookup(mmName.name, env)
  if (!isMultiMethod(existing)) {
    throw new EvaluationError(
      `defmethod: ${mmName.name} is not a multimethod`,
      { list, env }
    )
  }
  const arities = parseArities([list.value[3], ...list.value.slice(4)], env)
  const methodFn = cljMultiArityFunction(arities, env)
  const isDefault = isKeyword(dispatchVal) && dispatchVal.name === ':default'
  let updated: CljMultiMethod
  if (isDefault) {
    updated = cljMultiMethod(
      existing.name,
      existing.dispatchFn,
      existing.methods,
      methodFn
    )
  } else {
    const filtered = existing.methods.filter(
      (m) => !isEqual(m.dispatchVal, dispatchVal)
    )
    updated = cljMultiMethod(existing.name, existing.dispatchFn, [
      ...filtered,
      { dispatchVal, fn: methodFn },
    ])
  }
  // Update the var's value in place if possible, otherwise fall back to define
  const v = lookupVar(mmName.name, env)
  if (v) {
    v.value = updated
  } else {
    define(mmName.name, updated, getNamespaceEnv(env))
  }
  return cljNil()
}

function evaluateVar(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const sym = list.value[1]
  if (!isSymbol(sym)) {
    throw new EvaluationError('var expects a symbol', { list })
  }

  const slashIdx = sym.name.indexOf('/')
  if (slashIdx > 0 && slashIdx < sym.name.length - 1) {
    const alias = sym.name.slice(0, slashIdx)
    const localName = sym.name.slice(slashIdx + 1)
    const nsEnv = getNamespaceEnv(env)
    // Resolve alias: local :as alias first, then full namespace name
    const targetNs = nsEnv.ns?.aliases.get(alias) ?? ctx.resolveNs(alias) ?? null
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
  if (!isVector(bindings)) {
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
    if (!isSymbol(sym)) {
      throw new EvaluationError(
        'binding left-hand side must be a symbol',
        { sym }
      )
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

function evaluateSet(list: CljList, env: Env, ctx: EvaluationContext): CljValue {
  if (list.value.length !== 3) {
    throw new EvaluationError(
      `set! requires exactly 2 arguments, got ${list.value.length - 1}`,
      { list, env }
    )
  }
  const symForm = list.value[1]
  if (!isSymbol(symForm)) {
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
  return cljDelay(() => ctx.evaluateForms(body, env))
}

function evaluateLazySeqForm(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const body = list.value.slice(1)
  return cljLazySeq(() => ctx.evaluateForms(body, env))
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
  if (body.length === 0) return cljPending(Promise.resolve(cljNil()))
  const asyncCtx = createAsyncEvalCtx(ctx)
  const promise = asyncCtx.evaluateForms(body, env)
  return cljPending(promise)
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
