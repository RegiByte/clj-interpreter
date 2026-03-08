import { EvaluationError } from './errors'
import type { CljNamespace, CljValue, CljVar, Env } from './types'

class EnvError extends Error {
  context: any
  constructor(message: string, context: any) {
    super(message)
    this.context = context
    this.name = 'EnvError'
  }
}

export function derefValue(val: CljValue): CljValue {
  return val.kind === 'var' ? val.value : val
}

export function makeNamespace(name: string): CljNamespace {
  return { name, vars: new Map(), aliases: new Map(), readerAliases: new Map() }
}

export function makeEnv(outer?: Env): Env {
  return {
    bindings: new Map(),
    outer: outer ?? null,
  }
}

export function lookup(name: string, env: Env): CljValue {
  let current: Env | null = env
  while (current) {
    const raw = current.bindings.get(name)
    if (raw !== undefined) return derefValue(raw)
    const v = current.ns?.vars.get(name)
    if (v !== undefined) return v.value
    current = current.outer
  }
  throw new EvaluationError(`Symbol ${name} not found`, { name })
}

export function tryLookup(name: string, env: Env): CljValue | undefined {
  let current: Env | null = env
  while (current) {
    const raw = current.bindings.get(name)
    if (raw !== undefined) return derefValue(raw)
    const v = current.ns?.vars.get(name)
    if (v !== undefined) return v.value
    current = current.outer
  }
  return undefined
}

export function lookupVar(name: string, env: Env): CljVar | undefined {
  let current: Env | null = env
  while (current) {
    const raw = current.bindings.get(name)
    if (raw !== undefined && raw.kind === 'var') return raw
    const v = current.ns?.vars.get(name)
    if (v !== undefined) return v
    current = current.outer
  }
  return undefined
}

export function define(name: string, value: CljValue, env: Env) {
  env.bindings.set(name, value)
}

export function extend(params: string[], args: CljValue[], outer: Env): Env {
  if (params.length !== args.length) {
    throw new EnvError('Number of parameters and arguments must match', {
      params,
      args,
      outer,
    })
  }
  const env = makeEnv(outer)
  for (let i = 0; i < params.length; i++) {
    define(params[i], args[i], env)
  }
  return env
}

export function getRootEnv(env: Env): Env {
  let current = env as Env | null
  while (current?.outer) {
    current = current.outer
  }
  return current!
}

export function getNamespaceEnv(env: Env): Env {
  let current: Env | null = env
  while (current) {
    if (current.ns) return current
    current = current.outer
  }
  return getRootEnv(env)
}
