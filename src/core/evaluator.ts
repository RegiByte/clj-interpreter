import { define, extend, getNamespaceEnv, getRootEnv, lookup } from './env'
import {
  cljList,
  cljMap,
  cljMultiArityFunction,
  cljMultiArityMacro,
  cljNil,
  cljVector,
} from './factories'
import {
  type Arity,
  type CljFunction,
  type CljList,
  type CljMacro,
  type CljMap,
  type CljNativeFunction,
  type CljSymbol,
  type CljValue,
  type CljVector,
  type Env,
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
  isSpecialForm,
  isSymbol,
  isVector,
} from './assertions.ts'

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
} as const

export class EvaluationError extends Error {
  context: any
  constructor(message: string, context: any) {
    super(message)
    this.name = 'EvaluationError'
    this.context = context
  }
}

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

export function applyFunction(
  fn: CljFunction | CljNativeFunction,
  args: CljValue[],
  env?: Env
): CljValue {
  if (fn.kind === 'native-function') {
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
        return evaluateForms(arity.body, localEnv)
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
      env,
    }
  )
}

export function applyMacro(macro: CljMacro, rawArgs: CljValue[]): CljValue {
  const arity = resolveArity(macro.arities, rawArgs.length)
  const localEnv = bindParams(arity.params, arity.restParam, rawArgs, macro.env)
  return evaluateForms(arity.body, localEnv)
}

export function evaluateVector(vector: CljVector, env: Env): CljValue {
  return cljVector(vector.value.map((v) => evaluate(v, env)))
}

export function evaluateMap(map: CljMap, env: Env): CljValue {
  let entries: [CljValue, CljValue][] = []
  for (const [key, value] of map.entries) {
    const evaluatedKey = evaluate(key, env)
    const evaluatedValue = evaluate(value, env)
    entries.push([evaluatedKey, evaluatedValue])
  }
  return cljMap(entries)
}

function evaluateQuasiquote(form: CljValue, env: Env): CljValue {
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
        return evaluate(form.value[1], env)
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
          const toSplice = evaluate(elem.value[1], env)
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
        elements.push(evaluateQuasiquote(elem, env))
      }
      return isAList ? cljList(elements) : cljVector(elements)
    }
    case valueKeywords.map: {
      // just recursve over each key-value pair with evaluateQuasiquote
      const entries: [CljValue, CljValue][] = []
      for (const [key, value] of form.entries) {
        const evaluatedKey = evaluateQuasiquote(key, env)
        const evaluatedValue = evaluateQuasiquote(value, env)
        entries.push([evaluatedKey, evaluatedValue])
      }
      return cljMap(entries)
    }
    case valueKeywords.number:
    case valueKeywords.string:
    case valueKeywords.boolean:
    case valueKeywords.keyword:
    case valueKeywords.nil:
    case valueKeywords.symbol:
      return form
    default:
      throw new EvaluationError(`Unexpected form: ${form.kind}`, { form, env })
  }
}

export function evaluateSpecialForm(
  symbol: string,
  list: CljList,
  env: Env
): CljValue {
  switch (symbol) {
    case 'quote':
      // (quote expr) -> expr (unevaluated)
      return list.value[1]
    case 'quasiquote':
      return evaluateQuasiquote(list.value[1], env)
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
      define(name.name, evaluate(list.value[2], env), getNamespaceEnv(env))
      return cljNil()
    case 'ns':
      return cljNil()
    case 'if':
      // (if condition then else) -> result
      const condition = evaluate(list.value[1], env)
      if (!isFalsy(condition)) {
        return evaluate(list.value[2], env)
      }
      if (!list.value[3]) {
        return cljNil() // no-else case, return nil
      }
      return evaluate(list.value[3], env)
    case 'do':
      // (do exprs) -> evals all, returns last expr
      return evaluateForms(list.value.slice(1), env)
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
        const value = evaluate(bindings.value[i + 1], localEnv)
        localEnv = extend([key.name], [value], localEnv)
      }

      return evaluateForms(body, localEnv)
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
      const args = list.value.slice(1).map((v) => evaluate(v, env))
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
        const value = evaluate(loopBindings.value[i + 1], initEnv)
        initEnv = extend([key.name], [value], initEnv)
      }

      let currentArgs = names.map((n) => lookup(n, initEnv))

      while (true) {
        const loopEnv = extend(names, currentArgs, env)
        try {
          return evaluateForms(loopBody, loopEnv)
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
    default:
      throw new EvaluationError(`Unknown special form: ${symbol}`, {
        symbol,
        list,
        env,
      })
  }
}

export function evaluateList(list: CljList, env: Env): CljValue {
  if (list.value.length === 0) {
    throw new EvaluationError('Unexpected empty list', { list, env })
  }
  const first = list.value[0]

  if (isSpecialForm(first)) {
    return evaluateSpecialForm(first.name, list, env)
  }

  const evaledFirst = evaluate(first, env)
  if (isMacro(evaledFirst)) {
    const rawArgs = list.value.slice(1)
    const expanded = applyMacro(evaledFirst, rawArgs)
    return evaluate(expanded, env)
  }
  if (isAFunction(evaledFirst)) {
    const args = list.value.slice(1).map((v) => evaluate(v, env))
    return applyFunction(evaledFirst, args, env)
  }
  if (isKeyword(evaledFirst)) {
    const next = evaluate(list.value[1], env)
    const defaultReturn =
      list.value.length > 2 ? evaluate(list.value[2], env) : cljNil()
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

  const args = list.value.slice(1).map((v) => evaluate(v, env))
  return applyFunction(fnSymbol, args, env)
}

export function evaluate(expr: CljValue, env: Env): CljValue {
  switch (expr.kind) {
    // self-evaluating forms
    case valueKeywords.number:
    case valueKeywords.string:
    case valueKeywords.keyword:
    case valueKeywords.nil:
    case valueKeywords.function:
    case valueKeywords.boolean:
      return expr
    case valueKeywords.symbol: {
      const slashIdx = expr.name.indexOf('/')
      if (slashIdx > 0 && slashIdx < expr.name.length - 1) {
        const alias = expr.name.slice(0, slashIdx)
        const sym = expr.name.slice(slashIdx + 1)
        const nsEnv = getNamespaceEnv(env)
        const targetEnv = nsEnv.aliases?.get(alias)
        if (!targetEnv) {
          throw new EvaluationError(`No such namespace alias: ${alias}`, {
            symbol: expr.name,
            env,
          })
        }
        return lookup(sym, targetEnv)
      }
      return lookup(expr.name, env)
    }
    case valueKeywords.vector:
      return evaluateVector(expr, env)
    case valueKeywords.map:
      return evaluateMap(expr, env)
    case valueKeywords.list:
      return evaluateList(expr, env)
    default:
      throw new EvaluationError('Unexpected value', { expr, env })
  }
}

export function evaluateForms(forms: CljValue[], env: Env): CljValue {
  let result: CljValue = cljNil()
  for (const form of forms) {
    result = evaluate(form, env)
  }
  return result
}
