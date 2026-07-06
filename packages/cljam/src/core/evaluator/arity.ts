import { is } from '../assertions'
import { EvaluationError } from '../errors'
import { v } from '../factories'
import { getPos } from '../positions'
import type { Arity, CljSymbol, CljValue, CljVector, Env } from '../types'

const REST_SYMBOL = '&'

export class RecurSignal {
  args: CljValue[]
  pos?: import('../types').Pos
  constructor(args: CljValue[], pos?: import('../types').Pos) {
    this.args = args
    this.pos = pos
  }
}

export function parseParamVector(
  args: CljVector,
  env: Env
): { params: CljSymbol[]; restParam: CljSymbol | null } {
  const ampIdx = args.value.findIndex(
    (a) => is.symbol(a) && a.name === REST_SYMBOL
  )
  let rawParams: CljValue[] = []
  let rawRestParam: CljValue | null = null
  if (ampIdx === -1) {
    rawParams = args.value
  } else {
    const ampsCount = args.value.filter(
      (a) => is.symbol(a) && a.name === REST_SYMBOL
    ).length
    if (ampsCount > 1) {
      throw new EvaluationError(`${REST_SYMBOL} can only appear once`, {
        args,
        env,
      }, getPos(args))
    }
    if (ampIdx !== args.value.length - 2) {
      throw new EvaluationError(
        `${REST_SYMBOL} must be second-to-last argument`,
        {
          args,
          env,
        },
        getPos(args)
      )
    }
    rawParams = args.value.slice(0, ampIdx)
    rawRestParam = args.value[ampIdx + 1]
  }

  const params = rawParams.map((param) => {
    if (!is.symbol(param)) {
      throw new EvaluationError(
        'fn* only supports simple symbol params; use fn for destructuring',
        { param, env },
        getPos(param) ?? getPos(args)
      )
    }
    return param
  })

  let restParam: CljSymbol | null = null
  if (rawRestParam !== null) {
    if (!is.symbol(rawRestParam)) {
      throw new EvaluationError(
        'fn* only supports simple symbol rest param; use fn for destructuring',
        { restParam: rawRestParam, env },
        getPos(rawRestParam) ?? getPos(args)
      )
    }
    restParam = rawRestParam
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

  if (is.vector(forms[0])) {
    const paramVec = forms[0]
    const { params, restParam } = parseParamVector(paramVec, env)
    return [{ params, restParam, body: forms.slice(1) }]
  }

  if (is.list(forms[0])) {
    const arities: Arity[] = []
    for (const form of forms) {
      if (!is.list(form) || form.value.length === 0) {
        throw new EvaluationError(
          'Multi-arity clause must be a list starting with a parameter vector',
          { form, env },
          getPos(form)
        )
      }
      const paramVec = form.value[0]
      if (!is.vector(paramVec)) {
        throw new EvaluationError(
          'First element of arity clause must be a parameter vector',
          { paramVec, env },
          getPos(paramVec) ?? getPos(form)
        )
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
    { forms, env },
    getPos(forms[0])
  )
}

export function slotValuesForArity(
  arity: Arity,
  args: CljValue[]
): CljValue[] {
  if (arity.restParam === null) return args
  const fixedValues = args.slice(0, arity.params.length)
  const restArgs = args.slice(arity.params.length)
  const restValue = restArgs.length > 0 ? v.list(restArgs) : v.nil()
  return [...fixedValues, restValue]
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
