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
import { define, extend, getNamespaceEnv, getRootEnv, lookup, lookupVar } from '../env'
import { CljThrownSignal, EvaluationError } from '../errors'
import {
  cljKeyword,
  cljMap,
  cljMultiArityFunction,
  cljMultiArityMacro,
  cljMultiMethod,
  cljNativeFunction,
  cljNil,
  cljString,
  cljVar,
} from '../factories'
import type {
  CljFunction,
  CljKeyword,
  CljList,
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
    const disc = ctx.evaluate(discriminator, env)
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

  const existing = cljNs.vars.get(name.name)
  if (existing) {
    existing.value = newValue
  } else {
    cljNs.vars.set(name.name, cljVar(cljNs.name, name.name, newValue))
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
  const arities = parseArities(list.value.slice(1), env)
  for (const arity of arities) {
    assertRecurInTailPosition(arity.body)
  }
  return cljMultiArityFunction(arities, env)
}

function evaluateDefmacro(
  list: CljList,
  env: Env,
  _ctx: EvaluationContext
): CljValue {
  const name = list.value[1]
  if (!isSymbol(name)) {
    throw new EvaluationError('First element of defmacro must be a symbol', {
      name,
      list,
      env,
    })
  }
  const arities = parseArities(list.value.slice(2), env)
  const macro = cljMultiArityMacro(arities, env)
  define(name.name, macro, getRootEnv(env))
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
  define(mmName.name, mm, getNamespaceEnv(env))
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
  define(mmName.name, updated, getNamespaceEnv(env))
  return cljNil()
}

function evaluateVar(
  list: CljList,
  env: Env,
  _ctx: EvaluationContext
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
    // Try alias lookup (CljNamespace) first
    const aliasCljNs = nsEnv.ns?.aliases.get(alias)
    if (aliasCljNs) {
      const v = aliasCljNs.vars.get(localName)
      if (!v) throw new EvaluationError(`Var ${sym.name} not found`, { sym })
      return v
    }
    // Fall back to full namespace Env chain (handles clojure.core/sym etc.)
    const targetEnv = getRootEnv(env).resolveNs?.(alias) ?? null
    if (!targetEnv) {
      throw new EvaluationError(`No such namespace: ${alias}`, { sym })
    }
    const v = lookupVar(localName, targetEnv)
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
