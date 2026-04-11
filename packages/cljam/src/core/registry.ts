import { is } from './assertions'
import { makeEnv, makeNamespace } from './env'
import { EvaluationError } from './errors'
import type { CljValue, Env } from './types'

// ---------------------------------------------------------------------------
// allowedPackages helpers
// ---------------------------------------------------------------------------

const ALWAYS_ALLOWED = ['clojure', 'user']

/**
 * Returns true if nsName is permitted given the allowedPackages setting.
 * Always allows 'clojure.*', 'user', and anything whose root package matches
 * one of the specified prefixes.
 */
function isNamespaceAllowed(
  nsName: string,
  allowedPackages: string[] | 'all'
): boolean {
  if (allowedPackages === 'all') return true
  // Always-allowed: clojure.* and user
  const rootPackage = nsName.split('.')[0]
  if (ALWAYS_ALLOWED.includes(rootPackage)) return true
  // Prefix match: 'cljam-date' allows 'cljam-date', 'cljam-date.core', etc.
  return allowedPackages.some(
    (pkg) => nsName === pkg || nsName.startsWith(pkg + '.')
  )
}

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export type NamespaceRegistry = Map<string, Env>

// ---------------------------------------------------------------------------
// Clone helpers — used by snapshot / restoreRuntime
// ---------------------------------------------------------------------------

function cloneBindings(bindings: Map<string, CljValue>): Map<string, CljValue> {
  const out = new Map<string, CljValue>()
  for (const [k, v] of bindings) {
    out.set(k, v.kind === 'var' ? { ...v } : v)
  }
  return out
}

function cloneEnv(env: Env, memo: Map<Env, Env>): Env {
  if (memo.has(env)) return memo.get(env)!
  const cloned: Env = {
    bindings: cloneBindings(env.bindings),
    outer: null,
  }
  if (env.ns) {
    cloned.ns = {
      kind: 'namespace',
      name: env.ns.name,
      vars: new Map([...env.ns.vars].map(([k, v]) => [k, { ...v }])),
      aliases: new Map(), // wired in cloneRegistry pass 2
      readerAliases: new Map(env.ns.readerAliases),
    }
  }
  memo.set(env, cloned)
  if (env.outer) cloned.outer = cloneEnv(env.outer, memo)
  return cloned
}

export function cloneRegistry(registry: NamespaceRegistry): NamespaceRegistry {
  const memo = new Map<Env, Env>()
  const next = new Map<string, Env>()
  // Pass 1: clone all envs (ns.aliases left empty)
  for (const [name, env] of registry) {
    next.set(name, cloneEnv(env, memo))
  }
  // Pass 2: wire ns.aliases to the cloned CljNamespace objects
  for (const [name, env] of registry) {
    const clonedEnv = next.get(name)!
    if (env.ns && clonedEnv.ns) {
      for (const [alias, origNs] of env.ns.aliases) {
        const targetCloned = next.get(origNs.name)
        if (targetCloned?.ns) clonedEnv.ns.aliases.set(alias, targetCloned.ns)
      }
    }
  }
  return next
}

// ---------------------------------------------------------------------------
// ensureNamespaceInRegistry — creates namespace env if it doesn't exist yet
// ---------------------------------------------------------------------------

export function ensureNamespaceInRegistry(
  registry: NamespaceRegistry,
  coreEnv: Env,
  name: string
): Env {
  if (!registry.has(name)) {
    const nsEnv = makeEnv(coreEnv)
    nsEnv.ns = makeNamespace(name)
    registry.set(name, nsEnv)
  }
  return registry.get(name)!
}

// ---------------------------------------------------------------------------
// processRequireSpec — processes a single [ns.name :as alias :refer [...]] spec.
// resolveNs is called when the target namespace isn't yet loaded.
// ---------------------------------------------------------------------------

export function processRequireSpec(
  spec: CljValue,
  currentEnv: Env,
  registry: NamespaceRegistry,
  resolveNs?: (nsName: string) => boolean,
  allowedPackages?: string[] | 'all',
  isLibraryNamespace?: (nsName: string) => boolean
): void {
  if (!is.vector(spec)) {
    throw new EvaluationError(
      'require spec must be a vector, e.g. [my.ns :as alias]',
      { spec }
    )
  }

  const elements = spec.value
  if (elements.length === 0 || !is.symbol(elements[0])) {
    throw new EvaluationError(
      'First element of require spec must be a namespace symbol',
      { spec }
    )
  }

  const nsName = elements[0].name

  // allowedPackages check — only fires for library-registered namespaces.
  // Filesystem namespaces (user-controlled source via sourceRoots) are always
  // allowed — the user controls those files, not the allowedPackages gate.
  // Built-ins (clojure.*) are always allowed via ALWAYS_ALLOWED below.
  const isLibrary = isLibraryNamespace ? isLibraryNamespace(nsName) : true
  if (isLibrary && allowedPackages !== undefined && !isNamespaceAllowed(nsName, allowedPackages)) {
    const allowedList =
      allowedPackages === 'all' ? [] : allowedPackages
    const err = new EvaluationError(
      `Access denied: namespace '${nsName}' is not in the allowed packages for this session.\n` +
        `Allowed packages: ${JSON.stringify(allowedList)}\n` +
        `To allow all packages, use: allowedPackages: 'all'`,
      { nsName, allowedPackages }
    )
    err.code = 'namespace/access-denied'
    throw err
  }

  const hasAsAlias = elements.some(
    (el) => is.keyword(el) && el.name === ':as-alias'
  )
  if (hasAsAlias) {
    let i = 1
    while (i < elements.length) {
      const kw = elements[i]
      if (!is.keyword(kw)) {
        throw new EvaluationError(
          `Expected keyword in require spec, got ${kw.kind}`,
          { spec, position: i }
        )
      }
      if (kw.name === ':as-alias') {
        i++
        const alias = elements[i]
        if (!alias || !is.symbol(alias)) {
          throw new EvaluationError(':as-alias expects a symbol alias', {
            spec,
            position: i,
          })
        }
        currentEnv.ns!.readerAliases.set(alias.name, nsName)
        i++
      } else {
        throw new EvaluationError(
          `:as-alias specs only support :as-alias, got ${kw.name}`,
          { spec }
        )
      }
    }
    return
  }

  let targetEnv = registry.get(nsName)
  if (!targetEnv && resolveNs) {
    resolveNs(nsName)
    targetEnv = registry.get(nsName)
  }
  if (!targetEnv) {
    const err = new EvaluationError(
      `Namespace '${nsName}' not found. Only already-loaded namespaces can be required.`,
      { nsName }
    )
    err.code = 'namespace/not-found'
    throw err
  }

  let i = 1
  while (i < elements.length) {
    const kw = elements[i]
    if (!is.keyword(kw)) {
      throw new EvaluationError(
        `Expected keyword in require spec, got ${kw.kind}`,
        { spec, position: i }
      )
    }

    if (kw.name === ':as') {
      i++
      const alias = elements[i]
      if (!alias || !is.symbol(alias)) {
        throw new EvaluationError(':as expects a symbol alias', {
          spec,
          position: i,
        })
      }
      currentEnv.ns!.aliases.set(alias.name, targetEnv.ns!)
      i++
    } else if (kw.name === ':refer') {
      i++
      const symsVec = elements[i]
      if (!symsVec || !is.vector(symsVec)) {
        throw new EvaluationError(':refer expects a vector of symbols', {
          spec,
          position: i,
        })
      }
      for (const sym of symsVec.value) {
        if (!is.symbol(sym)) {
          throw new EvaluationError(':refer vector must contain only symbols', {
            spec,
            sym,
          })
        }
        const v = targetEnv.ns!.vars.get(sym.name)
        if (v === undefined) {
          throw new EvaluationError(
            `Symbol ${sym.name} not found in namespace ${nsName}`,
            { nsName, symbol: sym.name }
          )
        }
        currentEnv.ns!.vars.set(sym.name, v)
      }
      i++
    } else {
      throw new EvaluationError(
        `Unknown require option ${kw.name}. Supported: :as, :refer`,
        { spec, keyword: kw.name }
      )
    }
  }
}
