import { define, extend, getNamespaceEnv, getRootEnv, lookup } from './env'
import { makeGensym } from './gensym'
import {
  cljList,
  cljMap,
  cljMultiArityFunction,
  cljMultiArityMacro,
  cljMultiMethod,
  cljNativeFunction,
  cljNil,
  cljVector,
} from './factories'
import {
  type Arity,
  type CljFunction,
  type CljKeyword,
  type CljList,
  type CljMacro,
  type CljMap,
  type CljMultiMethod,
  type CljNativeFunction,
  type CljSymbol,
  type CljValue,
  type CljVector,
  type Env,
  type EvaluationContext,
  valueKeywords,
} from './types'
import {
  isAFunction,
  isEqual,
  isFalsy,
  isKeyword,
  isList,
  isMacro,
  isMap,
  isMultiMethod,
  isSpecialForm,
  isSymbol,
  isVector,
} from './assertions.ts'
import { EvaluationError } from './errors.ts'

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
} as const

export class RecurSignal {
  args: CljValue[]
  constructor(args: CljValue[]) {
    this.args = args
  }
}

export function parseParamVector(
  args: CljVector,
  env: Env
): { params: CljSymbol[]; restParam: CljSymbol | null } {
  const ampIdx = args.value.findIndex((a) => isSymbol(a) && a.name === '&')
  let params: CljSymbol[] = []
  let restParam: CljSymbol | null = null
  if (ampIdx === -1) {
    params = args.value.map((a) => a as CljSymbol)
  } else {
    // validate: & must be second-to-last
    const ampsCount = args.value.filter(
      (a) => isSymbol(a) && a.name === '&'
    ).length
    if (ampsCount > 1) {
      throw new EvaluationError('& can only appear once', { args, env })
    }
    if (ampIdx !== args.value.length - 2) {
      throw new EvaluationError('& must be second-to-last argument', {
        args,
        env,
      })
    }
    params = args.value.slice(0, ampIdx).map((a) => a as CljSymbol)
    restParam = args.value[ampIdx + 1] as CljSymbol
  }
  return { params, restParam }
}

function parseArities(forms: CljValue[], env: Env): Arity[] {
  if (forms.length === 0) {
    throw new EvaluationError(
      'fn/defmacro requires at least a parameter vector',
      {
        forms,
        env,
      }
    )
  }

  if (isVector(forms[0])) {
    const paramVec = forms[0]
    if (paramVec.value.some((arg) => !isSymbol(arg))) {
      throw new EvaluationError('Parameters must be symbols', {
        paramVec,
        env,
      })
    }
    const { params, restParam } = parseParamVector(paramVec, env)
    return [{ params, restParam, body: forms.slice(1) }]
  }

  if (isList(forms[0])) {
    const arities: Arity[] = []
    for (const form of forms) {
      if (!isList(form) || form.value.length === 0) {
        throw new EvaluationError(
          'Multi-arity clause must be a list starting with a parameter vector',
          { form, env }
        )
      }
      const paramVec = form.value[0]
      if (!isVector(paramVec)) {
        throw new EvaluationError(
          'First element of arity clause must be a parameter vector',
          { paramVec, env }
        )
      }
      if (paramVec.value.some((arg) => !isSymbol(arg))) {
        throw new EvaluationError('Parameters must be symbols', {
          paramVec,
          env,
        })
      }
      const { params, restParam } = parseParamVector(paramVec, env)
      arities.push({ params, restParam, body: form.value.slice(1) })
    }

    const variadicCount = arities.filter((a) => a.restParam !== null).length
    if (variadicCount > 1) {
      throw new EvaluationError(
        'At most one variadic arity is allowed per function',
        { forms, env }
      )
    }

    return arities
  }

  throw new EvaluationError(
    'fn/defmacro expects a parameter vector or arity clauses',
    { forms, env }
  )
}

export function bindParams(
  params: CljSymbol[],
  restParam: CljSymbol | null,
  args: CljValue[],
  outerEnv: Env
): Env {
  const paramNames = params.map((p) => p.name)
  const paramValues = args.slice(0, paramNames.length)
  if (restParam === null) {
    // non variadic binding
    if (args.length !== params.length) {
      throw new EvaluationError(
        `Arguments length mismatch: fn accepts ${params.length} arguments, but ${args.length} were provided`,
        {
          params,
          args,
          outerEnv,
        }
      )
    }
  } else {
    // variadic binding
    if (args.length < params.length) {
      throw new EvaluationError(
        `Arguments length mismatch: fn expects at least ${params.length} arguments, but ${args.length} were provided`,
        {
          params,
          args,
          outerEnv,
        }
      )
    }

    const restArgs = args.slice(paramNames.length)
    const restValue = restArgs.length > 0 ? cljList(restArgs) : cljNil()
    paramNames.push(restParam.name)
    paramValues.push(restValue)
    return extend(paramNames, paramValues, outerEnv)
  }

  return extend(paramNames, paramValues, outerEnv)
}

export function resolveArity(arities: Arity[], argCount: number): Arity {
  const exactMatch = arities.find(
    (a) => a.restParam === null && a.params.length === argCount
  )
  if (exactMatch) return exactMatch

  const variadicMatch = arities.find(
    (a) => a.restParam !== null && argCount >= a.params.length
  )
  if (variadicMatch) return variadicMatch

  const counts = arities.map((a) =>
    a.restParam ? `${a.params.length}+` : `${a.params.length}`
  )
  throw new EvaluationError(
    `No matching arity for ${argCount} arguments. Available arities: ${counts.join(', ')}`,
    { arities, argCount }
  )
}

export function applyFunctionWithContext(
  fn: CljFunction | CljNativeFunction,
  args: CljValue[],
  ctx: EvaluationContext
): CljValue {
  if (fn.kind === 'native-function') {
    // New path, native fns receive evaluation context as first argument
    if (fn.fnWithContext) {
      return fn.fnWithContext(ctx, ...args)
    }
    return fn.fn(...args)
  }
  if (fn.kind === 'function') {
    const arity = resolveArity(fn.arities, args.length)
    let currentArgs = args
    while (true) {
      const localEnv = bindParams(
        arity.params,
        arity.restParam,
        currentArgs,
        fn.env
      )
      try {
        return ctx.evaluateForms(arity.body, localEnv)
      } catch (e) {
        if (e instanceof RecurSignal) {
          currentArgs = e.args
          continue
        }
        throw e
      }
    }
  }

  throw new EvaluationError(
    `${(fn as CljValue).kind} is not a callable function`,
    {
      fn,
      args,
    }
  )
}

export function applyMacroWithContext(
  macro: CljMacro,
  rawArgs: CljValue[],
  ctx: EvaluationContext
): CljValue {
  const arity = resolveArity(macro.arities, rawArgs.length)
  const localEnv = bindParams(arity.params, arity.restParam, rawArgs, macro.env)
  return ctx.evaluateForms(arity.body, localEnv)
}

export function evaluateVector(
  vector: CljVector,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  return cljVector(vector.value.map((v) => ctx.evaluate(v, env)))
}

export function evaluateMap(
  map: CljMap,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  let entries: [CljValue, CljValue][] = []
  for (const [key, value] of map.entries) {
    const evaluatedKey = ctx.evaluate(key, env)
    const evaluatedValue = ctx.evaluate(value, env)
    entries.push([evaluatedKey, evaluatedValue])
  }
  return cljMap(entries)
}

function evaluateQuasiquote(
  form: CljValue,
  env: Env,
  autoGensyms: Map<string, string> = new Map(),
  ctx: EvaluationContext
): CljValue {
  switch (form.kind) {
    case valueKeywords.vector:
    case valueKeywords.list: {
      // Handle unquote
      const isAList = isList(form)
      if (
        isAList &&
        form.value.length === 2 &&
        isSymbol(form.value[0]) &&
        form.value[0].name === 'unquote'
      ) {
        return ctx.evaluate(form.value[1], env)
      }

      // Build new collection
      const elements: CljValue[] = []
      for (const elem of form.value) {
        // Handle unquote splicing
        if (
          isList(elem) &&
          elem.value.length === 2 &&
          isSymbol(elem.value[0]) &&
          elem.value[0].name === 'unquote-splicing'
        ) {
          const toSplice = ctx.evaluate(elem.value[1], env)
          if (!isList(toSplice) && !isVector(toSplice)) {
            throw new EvaluationError(
              'Unquote-splicing must evaluate to a list or vector',
              { elem, env }
            )
          }
          elements.push(...toSplice.value)
          continue
        }
        // Otherwise, recursively evaluate the quasiquote
        elements.push(evaluateQuasiquote(elem, env, autoGensyms, ctx))
      }
      return isAList ? cljList(elements) : cljVector(elements)
    }
    case valueKeywords.map: {
      const entries: [CljValue, CljValue][] = []
      for (const [key, value] of form.entries) {
        const evaluatedKey = evaluateQuasiquote(key, env, autoGensyms, ctx)
        const evaluatedValue = evaluateQuasiquote(value, env, autoGensyms, ctx)
        entries.push([evaluatedKey, evaluatedValue])
      }
      return cljMap(entries)
    }
    case valueKeywords.number:
    case valueKeywords.string:
    case valueKeywords.boolean:
    case valueKeywords.keyword:
    case valueKeywords.nil:
      return form
    case valueKeywords.symbol: {
      // Auto-gensym: sym# inside a quasiquote expands to a unique symbol.
      // All occurrences of the same sym# within one quasiquote expand to
      // the same generated name (consistent within one template expansion).
      if (form.name.endsWith('#')) {
        if (!autoGensyms.has(form.name)) {
          autoGensyms.set(form.name, makeGensym(form.name.slice(0, -1)))
        }
        return { kind: 'symbol', name: autoGensyms.get(form.name)! }
      }
      return form
    }
    default:
      throw new EvaluationError(`Unexpected form: ${form.kind}`, { form, env })
  }
}

export function evaluateSpecialForm(
  symbol: string,
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  switch (symbol) {
    case 'quote':
      // (quote expr) -> expr (unevaluated)
      return list.value[1]
    case 'quasiquote':
      return evaluateQuasiquote(list.value[1], env, new Map(), ctx)
    case 'def':
      // (def name expr) -> nil
      // defines a global binding for the given name
      const name = list.value[1]
      if (name.kind !== 'symbol') {
        throw new EvaluationError('First element of list must be a symbol', {
          name,
          list,
          env,
        })
      }
      define(name.name, ctx.evaluate(list.value[2], env), getNamespaceEnv(env))
      return cljNil()
    case 'ns':
      return cljNil()
    case 'if':
      // (if condition then else) -> result
      const condition = ctx.evaluate(list.value[1], env)
      if (!isFalsy(condition)) {
        return ctx.evaluate(list.value[2], env)
      }
      if (!list.value[3]) {
        return cljNil() // no-else case, return nil
      }
      return ctx.evaluate(list.value[3], env)
    case 'do':
      // (do exprs) -> evals all, returns last expr
      return ctx.evaluateForms(list.value.slice(1), env)
    case 'let':
      // (let [bindings] body)
      // for let, each binding extends the outer environment, creating a new one
      // that's why earlier bindings can be used in the later bindings,
      // they are already resolved and part of the context
      // notice that bindings is specifically a vector, not a list
      // we also need to check if the bindings are valid, balanced pairs, keys are symbols, values are expressions
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
        const key = bindings.value[i]
        if (!isSymbol(key)) {
          throw new EvaluationError('Keys must be symbols', { key, env })
        }
        const value = ctx.evaluate(bindings.value[i + 1], localEnv)
        localEnv = extend([key.name], [value], localEnv)
      }

      return ctx.evaluateForms(body, localEnv)
    case 'fn': {
      const arities = parseArities(list.value.slice(1), env)
      return cljMultiArityFunction(arities, env)
    }
    case 'defmacro': {
      const name = list.value[1]
      if (!isSymbol(name)) {
        throw new EvaluationError(
          'First element of defmacro must be a symbol',
          {
            name,
            list,
            env,
          }
        )
      }
      const arities = parseArities(list.value.slice(2), env)
      const macro = cljMultiArityMacro(arities, env)
      define(name.name, macro, getRootEnv(env))
      return cljNil()
    }
    case 'recur': {
      const args = list.value.slice(1).map((v) => ctx.evaluate(v, env))
      throw new RecurSignal(args)
    }
    case 'loop': {
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

      const names: string[] = []
      let initEnv = env
      for (let i = 0; i < loopBindings.value.length; i += 2) {
        const key = loopBindings.value[i]
        if (!isSymbol(key)) {
          throw new EvaluationError('loop binding keys must be symbols', {
            key,
            env,
          })
        }
        names.push(key.name)
        const value = ctx.evaluate(loopBindings.value[i + 1], initEnv)
        initEnv = extend([key.name], [value], initEnv)
      }

      let currentArgs = names.map((n) => lookup(n, initEnv))

      while (true) {
        const loopEnv = extend(names, currentArgs, env)
        try {
          return ctx.evaluateForms(loopBody, loopEnv)
        } catch (e) {
          if (e instanceof RecurSignal) {
            if (e.args.length !== names.length) {
              throw new EvaluationError(
                `recur expects ${names.length} arguments but got ${e.args.length}`,
                { list, env }
              )
            }
            currentArgs = e.args
            continue
          }
          throw e
        }
      }
    }
    case 'defmulti': {
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
    case 'defmethod': {
      const mmName = list.value[1]
      if (!isSymbol(mmName)) {
        throw new EvaluationError(
          'defmethod: first argument must be a symbol',
          { list, env }
        )
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
      const isDefault =
        isKeyword(dispatchVal) && dispatchVal.name === ':default'
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
    default:
      throw new EvaluationError(`Unknown special form: ${symbol}`, {
        symbol,
        list,
        env,
      })
  }
}

function keywordToDispatchFn(kw: CljKeyword): CljNativeFunction {
  return cljNativeFunction(`kw:${kw.name}`, (...args: CljValue[]) => {
    const target = args[0]
    if (!isMap(target)) return cljNil()
    const entry = target.entries.find(([k]) => isEqual(k, kw))
    return entry ? entry[1] : cljNil()
  })
}

function dispatchMultiMethod(
  mm: CljMultiMethod,
  args: CljValue[],
  ctx: EvaluationContext
): CljValue {
  const dispatchVal = ctx.applyFunction(mm.dispatchFn, args)
  const method = mm.methods.find(({ dispatchVal: dv }) =>
    isEqual(dv, dispatchVal)
  )
  if (method) return ctx.applyFunction(method.fn, args)
  if (mm.defaultMethod) return ctx.applyFunction(mm.defaultMethod, args)
  // TODO: Clojure supports a custom default-dispatch-val per multimethod:
  //   (defmulti foo identity :default ::no-match)
  // This lets :default be a real dispatchable value while ::no-match is the
  // fallback sentinel. Currently :default is hardcoded as the only sentinel,
  // making it impossible to dispatch on the literal value :default while also
  // having a catch-all. Low priority — add CljMultiMethod.defaultDispatchVal
  // and thread it through defmulti, defmethod detection, and here.
  throw new EvaluationError(
    `No method in multimethod '${mm.name}' for dispatch value`,
    { mm, dispatchVal }
  )
}

export function evaluateList(
  list: CljList,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  if (list.value.length === 0) {
    throw new EvaluationError('Unexpected empty list', { list, env })
  }
  const first = list.value[0]

  if (isSpecialForm(first)) {
    return evaluateSpecialForm(first.name, list, env, ctx)
  }

  const evaledFirst = ctx.evaluate(first, env)
  if (isMacro(evaledFirst)) {
    const rawArgs = list.value.slice(1)
    const expanded = applyMacroWithContext(evaledFirst, rawArgs, ctx)
    return ctx.evaluate(expanded, env)
  }
  if (isAFunction(evaledFirst)) {
    const args = list.value.slice(1).map((v) => ctx.evaluate(v, env))
    return ctx.applyFunction(evaledFirst, args)
  }
  if (isKeyword(evaledFirst)) {
    const next = ctx.evaluate(list.value[1], env)
    const defaultReturn =
      list.value.length > 2 ? ctx.evaluate(list.value[2], env) : cljNil()
    if (isMap(next)) {
      const entry = next.entries.find(([key]) => {
        return isEqual(key, evaledFirst)
      })
      if (entry) {
        return entry[1]
      }
      return defaultReturn
    }
    return defaultReturn
  }
  if (isMultiMethod(evaledFirst)) {
    const args = list.value.slice(1).map((v) => ctx.evaluate(v, env))
    return dispatchMultiMethod(evaledFirst, args, ctx)
  }
  if (!isSymbol(first)) {
    throw new EvaluationError(
      'First element of list must be a function or special form',
      { list, env }
    )
  }
  const symbol = first.name

  const fnSymbol = lookup(symbol, env)
  if (!isAFunction(fnSymbol)) {
    throw new EvaluationError(`${symbol} is not a function`, { list, env })
  }

  const args = list.value.slice(1).map((v) => ctx.evaluate(v, env))
  return ctx.applyFunction(fnSymbol, args)
}

export function evaluateWithContext(
  expr: CljValue,
  env: Env,
  ctx: EvaluationContext
): CljValue {
  switch (expr.kind) {
    // self-evaluating forms
    case valueKeywords.number:
    case valueKeywords.string:
    case valueKeywords.keyword:
    case valueKeywords.nil:
    case valueKeywords.function:
    case valueKeywords.multiMethod:
    case valueKeywords.boolean:
      return expr
    case valueKeywords.symbol: {
      const slashIdx = expr.name.indexOf('/')
      if (slashIdx > 0 && slashIdx < expr.name.length - 1) {
        const alias = expr.name.slice(0, slashIdx)
        const sym = expr.name.slice(slashIdx + 1)
        const nsEnv = getNamespaceEnv(env)
        const targetEnv =
          nsEnv.aliases?.get(alias) ??
          getRootEnv(env).resolveNs?.(alias) ??
          null
        if (!targetEnv) {
          throw new EvaluationError(`No such namespace or alias: ${alias}`, {
            symbol: expr.name,
            env,
          })
        }
        return lookup(sym, targetEnv)
      }
      return lookup(expr.name, env)
    }
    case valueKeywords.vector:
      return evaluateVector(expr, env, ctx)
    case valueKeywords.map:
      return evaluateMap(expr, env, ctx)
    case valueKeywords.list:
      return evaluateList(expr, env, ctx)
    default:
      throw new EvaluationError('Unexpected value', { expr, env })
  }
}

export function evaluateFormsWithContext(
  forms: CljValue[],
  env: Env,
  ctx: EvaluationContext
): CljValue {
  let result: CljValue = cljNil()
  for (const form of forms) {
    result = ctx.evaluate(form, env)
  }
  return result
}

function createEvaluationContext(): EvaluationContext {
  const ctx = {
    evaluate: (expr: CljValue, env: Env) => evaluateWithContext(expr, env, ctx),
    evaluateForms: (forms: CljValue[], env: Env) =>
      evaluateFormsWithContext(forms, env, ctx),
    applyFunction: (fn: CljFunction | CljNativeFunction, args: CljValue[]) =>
      applyFunctionWithContext(fn, args, ctx),
    applyMacro: (macro: CljMacro, rawArgs: CljValue[]) =>
      applyMacroWithContext(macro, rawArgs, ctx),
  }
  return ctx
}

/** Public API, this is the only place where we create a new evaluation context
 * All inner evaluations will use the same context
 */
export function applyFunction(
  fn: CljFunction | CljNativeFunction,
  args: CljValue[]
): CljValue {
  return createEvaluationContext().applyFunction(fn, args)
}
export function applyMacro(macro: CljMacro, rawArgs: CljValue[]): CljValue {
  return createEvaluationContext().applyMacro(macro, rawArgs)
}
export function evaluate(expr: CljValue, env: Env): CljValue {
  return createEvaluationContext().evaluate(expr, env)
}
export function evaluateForms(forms: CljValue[], env: Env): CljValue {
  return createEvaluationContext().evaluateForms(forms, env)
}
