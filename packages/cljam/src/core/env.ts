import { EvaluationError } from './errors'
import type { CljNamespace, CljMap, CljValue, CljVar, Env } from './types'
import { v } from './factories'

class EnvError extends Error {
  context: any
  constructor(message: string, context: any) {
    super(message)
    this.context = context
    this.name = 'EnvError'
  }
}

export function derefValue(val: CljValue): CljValue {
  if (val.kind !== 'var') return val
  if (val.dynamic && val.bindingStack && val.bindingStack.length > 0) {
    return val.bindingStack[val.bindingStack.length - 1]
  }
  return val.value
}

export function makeNamespace(name: string): CljNamespace {
  return {
    kind: 'namespace',
    name,
    vars: new Map(),
    aliases: new Map(),
    readerAliases: new Map(),
  }
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
    // Local bindings are stored as plain values — do NOT auto-deref.
    // A var stored in a local binding (e.g. from `(var foo)`) is a first-class value.
    if (raw !== undefined) return raw
    const theVar = current.ns?.vars.get(name)
    // Namespace vars are always auto-deref'd: `foo` resolves to the var's current value.
    if (theVar !== undefined) return derefValue(theVar)
    current = current.outer
  }
  throw new EvaluationError(`Symbol ${name} not found`, { name })
}

export function tryLookup(name: string, env: Env): CljValue | undefined {
  let current: Env | null = env
  while (current) {
    const raw = current.bindings.get(name)
    if (raw !== undefined) return raw
    const theVar = current.ns?.vars.get(name)
    if (theVar !== undefined) return derefValue(theVar)
    current = current.outer
  }
  return undefined
}

/**
 * Interns a value as a Var in the namespace attached to `nsEnv`.
 * Re-def: mutates the existing var's value in place.
 * New def: creates a new CljVar and stores it in ns.vars.
 */
export function internVar(
  name: string,
  value: CljValue,
  nsEnv: Env,
  meta?: CljMap
) {
  const ns = nsEnv.ns!
  const existing = ns.vars.get(name)
  if (existing) {
    existing.value = value
    if (meta) existing.meta = meta
  } else {
    ns.vars.set(name, v.var(ns.name, name, value, meta))
  }
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
