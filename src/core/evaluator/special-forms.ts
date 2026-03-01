import {
  isAFunction,
  isEqual,
  isFalsy,
  isKeyword,
  isMap,
  isMultiMethod,
  isSymbol,
  isVector,
} from '../assertions'
import { define, extend, getNamespaceEnv, getRootEnv, lookup } from '../env'
import { EvaluationError } from '../errors'
import {
  cljMultiArityFunction,
  cljMultiArityMacro,
  cljMultiMethod,
  cljNativeFunction,
  cljNil,
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
import { evaluateQuasiquote } from './quasiquote'

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

function keywordToDispatchFn(kw: CljKeyword): CljNativeFunction {
  return cljNativeFunction(`kw:${kw.name}`, (...args: CljValue[]) => {
    const target = args[0]
    if (!isMap(target)) return cljNil()
    const entry = target.entries.find(([k]) => isEqual(k, kw))
    return entry ? entry[1] : cljNil()
  })
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
