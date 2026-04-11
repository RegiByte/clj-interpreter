import { is } from '../assertions'
import {
  extend,
  getNamespaceEnv,
  internVar,
  lookupVar,
  makeEnv,
} from '../env'
import { CljThrownSignal, EvaluationError } from '../errors'
import { v } from '../factories'
// --- ASYNC (experimental) ---
import { createAsyncEvalCtx } from './async-evaluator'
// --- END ASYNC ---
import { specialFormKeywords } from '../keywords.ts'
import { framesToClj, getLineCol, getPos } from '../positions'
import type {
  CljList,
  CljMap,
  CljSymbol,
  CljValue,
  Env,
  EvaluationContext,
} from '../types'
import { parseArities, RecurSignal } from './arity'
import {
  matchesDiscriminator,
  parseTryStructure,
  validateBindingVector,
} from './form-parsers'
import { evaluateDot, evaluateNew } from './js-interop'

import { assertRecurInTailPosition } from './recur-check'

import { compile, compileFnBody } from '../compiler/index.ts'

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

function evaluateTry(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const { bodyForms, catchClauses, finallyForms } = parseTryStructure(list, env)

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
      const entries: [CljValue, CljValue][] = [
        [v.keyword(':type'), v.keyword(':error/runtime')],
        [v.keyword(':message'), v.string(e.message)],
      ]
      if (e.frames && e.frames.length > 0) {
        entries.push([v.keyword(':frames'), framesToClj(e.frames)])
      }
      thrownValue = v.map(entries)
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
    }, getPos(list))
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

function evaluateLetStar(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const bindings = list.value[1]
  validateBindingVector(bindings, 'let*', env)
  const body = list.value.slice(2)
  let localEnv = env
  for (let i = 0; i < bindings.value.length; i += 2) {
    const pattern = bindings.value[i]
    if (!is.symbol(pattern)) {
      throw new EvaluationError(
        'let* only supports simple symbol bindings; use let for destructuring',
        { pattern, env },
        getPos(pattern) ?? getPos(list)
      )
    }
    const value = ctx.evaluate(bindings.value[i + 1], localEnv)
    localEnv = extend([pattern.name], [value], localEnv)
  }
  return ctx.evaluateForms(body, localEnv)
}

function evaluateFnStar(
  list: CljList,
  env: Env,
  _ctx: EvaluationContext
): CljValue {
  const rest = list.value.slice(1)
  let fnName: string | undefined
  let arityForms = rest
  if (rest[0] && is.symbol(rest[0])) {
    fnName = rest[0].name
    arityForms = rest.slice(1)
  }
  const arities = parseArities(arityForms, env)
  for (const arity of arities) {
    for (const param of arity.params) {
      if (!is.symbol(param)) {
        throw new EvaluationError(
          'fn* only supports simple symbol params; use fn for destructuring',
          { param, env },
          getPos(param) ?? getPos(list)
        )
      }
    }
    if (arity.restParam !== null && !is.symbol(arity.restParam)) {
      throw new EvaluationError(
        'fn* only supports simple symbol rest param; use fn for destructuring',
        { restParam: arity.restParam, env },
        getPos(arity.restParam) ?? getPos(list)
      )
    }
    assertRecurInTailPosition(arity.body)
    // Phase 4b: params are all guaranteed simple symbols (validated above).
    // For no-rest-param arities, compile with param slots to eliminate
    // both bindParams env allocation and lookup chain walks for params.
    if (arity.restParam === null) {
      const result = compileFnBody(
        arity.params as CljSymbol[],
        arity.body,
        compile
      )
      if (result !== null) {
        arity.compiledBody = result.compiledBody
        arity.paramSlots = result.paramSlots
      }
    } else {
      const compiled = compile(
        v.list([v.symbol(specialFormKeywords.do), ...arity.body])
      )
      if (compiled !== null) {
        arity.compiledBody = compiled
      }
    }
  }
  const fn = v.multiArityFunction(arities, env)
  if (fnName) {
    fn.name = fnName
    const selfEnv = makeEnv(env)
    selfEnv.bindings.set(fnName, fn)
    fn.env = selfEnv
  }
  return fn
}

function evaluateLoopStar(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const loopBindings = list.value[1]
  validateBindingVector(loopBindings, 'loop*', env)
  const loopBody = list.value.slice(2)
  assertRecurInTailPosition(loopBody)

  const names: string[] = []
  const initValues: CljValue[] = []
  let initEnv = env
  for (let i = 0; i < loopBindings.value.length; i += 2) {
    const pattern = loopBindings.value[i]
    if (!is.symbol(pattern)) {
      throw new EvaluationError(
        'loop* only supports simple symbol bindings; use loop for destructuring',
        { pattern, env },
        getPos(pattern) ?? getPos(list)
      )
    }
    const value = ctx.evaluate(loopBindings.value[i + 1], initEnv)
    names.push(pattern.name)
    initValues.push(value)
    initEnv = extend([pattern.name], [value], initEnv)
  }

  let currentValues = initValues

  while (true) {
    const loopEnv = extend(names, currentValues, env)
    try {
      return ctx.evaluateForms(loopBody, loopEnv)
    } catch (e) {
      if (e instanceof RecurSignal) {
        if (e.args.length !== names.length) {
          throw new EvaluationError(
            `recur expects ${names.length} arguments but got ${e.args.length}`,
            { list, env },
            getPos(list)
          )
        }
        currentValues = e.args
        continue
      }
      throw e
    }
  }
}

function evaluateLetfnStar(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  // (letfn* [name1 fn-form1 name2 fn-form2 ...] body...)
  // Generated by the `letfn` macro in core.clj.
  const bindings = list.value[1]
  if (!is.vector(bindings)) {
    throw new EvaluationError('letfn* bindings must be a vector', {
      bindings,
      env,
    }, getPos(list))
  }
  if (bindings.value.length % 2 !== 0) {
    throw new EvaluationError(
      'letfn* bindings must have an even number of forms',
      { bindings, env },
      getPos(bindings) ?? getPos(list)
    )
  }
  const body = list.value.slice(2)

  // All fns share a single env frame so they can mutually reference each other.
  // Each fn* evaluated here closes over sharedEnv — by the time any fn is
  // called, all names will be in sharedEnv.bindings.
  const sharedEnv = makeEnv(env)

  for (let i = 0; i < bindings.value.length; i += 2) {
    const name = bindings.value[i]
    const fnForm = bindings.value[i + 1]
    if (!is.symbol(name)) {
      throw new EvaluationError('letfn* binding names must be symbols', {
        name,
        env,
      }, getPos(name) ?? getPos(list))
    }
    const fn = ctx.evaluate(fnForm, sharedEnv)
    if (!is.aFunction(fn)) {
      throw new EvaluationError('letfn* binding values must be functions', {
        fn,
        env,
      }, getPos(fnForm) ?? getPos(list))
    }
    if (is.function(fn)) fn.name = name.name
    sharedEnv.bindings.set(name.name, fn)
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
    }, getPos(list))
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

function evaluateRecur(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const args = list.value.slice(1).map((v) => ctx.evaluate(v, env))
  throw new RecurSignal(args)
}

function evaluateVar(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  const sym = list.value[1]
  if (!is.symbol(sym)) {
    throw new EvaluationError('var expects a symbol', { list }, getPos(list))
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
      throw new EvaluationError(`No such namespace: ${alias}`, { sym }, getPos(sym))
    }
    const v = targetNs.vars.get(localName)
    if (!v) throw new EvaluationError(`Var ${sym.name} not found`, { sym }, getPos(sym))
    return v
  }

  const v = lookupVar(sym.name, env)
  if (!v) {
    throw new EvaluationError(
      `Unable to resolve var: ${sym.name} in this context`,
      { sym },
      getPos(sym)
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
    }, getPos(list))
  }
  if (bindings.value.length % 2 !== 0) {
    throw new EvaluationError(
      'binding vector must have an even number of forms',
      { list, env },
      getPos(bindings) ?? getPos(list)
    )
  }
  const body = list.value.slice(2)
  const boundVars: import('../types').CljVar[] = []

  for (let i = 0; i < bindings.value.length; i += 2) {
    const sym = bindings.value[i]
    if (!is.symbol(sym)) {
      throw new EvaluationError('binding left-hand side must be a symbol', {
        sym,
      }, getPos(sym) ?? getPos(list))
    }
    const newVal = ctx.evaluate(bindings.value[i + 1], env)
    const v = lookupVar(sym.name, env)
    if (!v) {
      throw new EvaluationError(
        `No var found for symbol '${sym.name}' in binding form`,
        { sym },
        getPos(sym)
      )
    }
    if (!v.dynamic) {
      throw new EvaluationError(
        `Cannot use binding with non-dynamic var ${v.ns}/${v.name}. Mark it dynamic with (def ^:dynamic ${sym.name} ...)`,
        { sym },
        getPos(sym)
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
      { list, env },
      getPos(list)
    )
  }
  const symForm = list.value[1]
  if (!is.symbol(symForm)) {
    throw new EvaluationError(
      `set! first argument must be a symbol, got ${symForm.kind}`,
      { symForm, env },
      getPos(symForm) ?? getPos(list)
    )
  }
  const v = lookupVar(symForm.name, env)
  if (!v) {
    throw new EvaluationError(
      `Unable to resolve var: ${symForm.name} in this context`,
      { symForm, env },
      getPos(symForm)
    )
  }
  if (!v.dynamic) {
    throw new EvaluationError(
      `Cannot set! non-dynamic var ${v.ns}/${v.name}. Mark it with ^:dynamic.`,
      { symForm, env },
      getPos(symForm)
    )
  }
  if (!v.bindingStack || v.bindingStack.length === 0) {
    throw new EvaluationError(
      `Cannot set! ${v.ns}/${v.name} — no active binding. Use set! only inside a (binding [...] ...) form.`,
      { symForm, env },
      getPos(symForm)
    )
  }
  const newVal = ctx.evaluate(list.value[2], env)
  v.bindingStack[v.bindingStack.length - 1] = newVal
  return newVal
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
  def: evaluateDef,
  ns: evaluateNs,
  if: evaluateIf,
  do: evaluateDo,
  'let*': evaluateLetStar,
  'fn*': evaluateFnStar,
  defmacro: evaluateDefmacro,
  'loop*': evaluateLoopStar,
  recur: evaluateRecur,
  var: evaluateVar,
  binding: evaluateBinding,
  'set!': evaluateSet,
  'letfn*': evaluateLetfnStar,
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
  }, getPos(list))
}
