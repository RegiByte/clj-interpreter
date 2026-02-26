import type { CljValue, Env } from './types'

class EnvError extends Error {
  context: any
  constructor(message: string, context: any) {
    super(message)
    this.context = context
    this.name = 'EnvError'
  }
}

export function makeEnv(outer?: Env): Env {
  return {
    bindings: new Map(),
    outer: outer ?? null,
  }
}

export function lookup(name: string, env: Env): CljValue {
  let current = env as Env | null
  while (current) {
    if (current.bindings.has(name)) {
      return current.bindings.get(name)!
    }
    current = current.outer
  }
  throw new Error(`Symbol ${name} not found`)
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
    if (current.namespace) return current
    current = current.outer
  }
  // fallback for un-namespaced envs for backwards compact
  // eventually we'll remove this and require all envs to be namespaced
  return getRootEnv(env)
}
