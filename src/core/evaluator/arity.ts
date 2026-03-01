import { isList, isSymbol, isVector } from '../assertions'
import { extend } from '../env'
import { EvaluationError } from '../errors'
import { cljList, cljNil } from '../factories'
import type { Arity, CljSymbol, CljValue, CljVector, Env } from '../types'

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

export function parseArities(forms: CljValue[], env: Env): Arity[] {
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
