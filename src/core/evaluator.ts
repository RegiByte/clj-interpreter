import { define, extend, getRootEnv, lookup } from './env'
import { cljFunction, cljMap, cljNil, cljVector } from './factories'
import {
  type CljFunction,
  type CljList,
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
  isComment,
  isEqual,
  isFalsy,
  isKeyword,
  isList,
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
} as const

export class EvaluationError extends Error {
  context: any
  constructor(message: string, context: any) {
    super(message)
    this.name = 'EvaluationError'
    this.context = context
  }
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
    if (args.length !== fn.params.length) {
      throw new EvaluationError(
        `Arguments length mismatch: fn accepts ${fn.params.length} arguments, but ${args.length} were provided`,
        {
          fn,
          args,
          env,
        }
      )
    }

    const localEnv = extend(
      fn.params.map((p) => p.name),
      args,
      fn.env
    )
    return evaluateForms(fn.body, localEnv)
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

export function evaluateVector(vector: CljVector, env: Env): CljValue {
  return cljVector(
    vector.value.filter((v) => !isComment(v)).map((v) => evaluate(v, env))
  )
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

export function evaluateSpecialForm(
  symbol: string,
  list: CljList,
  env: Env
): CljValue {
  switch (symbol) {
    case 'quote':
      // (quote expr) -> expr (unevaluated)
      return list.value[1]
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
      define(name.name, evaluate(list.value[2], env), getRootEnv(env))
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
      // (fn [args] body) -> function
      const args = list.value[1]
      if (!isVector(args)) {
        throw new EvaluationError('Arguments must be a vector', { args, env })
      }
      const body = list.value.slice(2)
      if (args.value.some((arg) => !isSymbol(arg))) {
        throw new EvaluationError('Arguments must be symbols', { args, env })
      }
      return cljFunction(
        args.value.map((arg) => arg as CljSymbol),
        body,
        env
      )
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
    case valueKeywords.symbol:
      return lookup(expr.name, env)
    case valueKeywords.comment:
      // comments should be filtered out during evaluation, they should fall through here
      throw new EvaluationError('Comments are not evaluatable', { expr, env })
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
    if (isComment(form)) continue
    result = evaluate(form, env)
  }
  return result
}
