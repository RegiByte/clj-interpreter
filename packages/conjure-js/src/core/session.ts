import { isKeyword, isList, isSymbol, isVector } from './assertions'
import { loadCoreFunctions } from './core-env'
import { define, lookup, lookupVar, makeEnv, makeNamespace, tryLookup } from './env'
import { valueToString } from './transformations'
import { createEvaluationContext, RecurSignal } from './evaluator'
import { CljThrownSignal, EvaluationError, ReaderError } from './errors'
import { cljNativeFunction, cljNil } from './factories'
import { formatErrorContext } from './positions'
import { printString } from './printer'
import { readForms } from './reader'
import { tokenize } from './tokenizer'
import type { CljNamespace, CljValue, Env, Token, TokenSymbol } from './types'
import { builtInNamespaceSources } from '../clojure/generated/builtin-namespace-registry'

type NamespaceRegistry = Map<string, Env>

type SessionOptions = {
  output?: (text: string) => void
  entries?: string[]
  sourceRoots?: string[]
  readFile?: (filePath: string) => string
}

export type Session = {
  registry: NamespaceRegistry
  readonly currentNs: string
  setNs: (namespace: string) => void
  getNs: (namespace: string) => CljNamespace | null
  loadFile: (source: string, nsName?: string) => string
  evaluate: (source: string) => CljValue
  evaluateForms: (forms: CljValue[]) => CljValue
  addSourceRoot: (path: string) => void
  getCompletions: (prefix: string, nsName?: string) => string[]
}

// Lightweight token scan to extract the namespace name before full parsing.
// Looks for the pattern: LParen Symbol("ns") Symbol(name) at the top of the token stream.
function extractNsNameFromTokens(tokens: Token[]): string | null {
  const meaningful = tokens.filter((t) => t.kind !== 'Comment')
  if (meaningful.length < 3) return null
  if (meaningful[0].kind !== 'LParen') return null
  if (meaningful[1].kind !== 'Symbol' || meaningful[1].value !== 'ns')
    return null
  if (meaningful[2].kind !== 'Symbol') return null
  return meaningful[2].value
}

// Lightweight token scan to extract :as alias pairs from the ns form's :require clauses.
// Returns Map { 'alias' -> 'full.ns.name' } for all [some.ns :as alias] specs found.
// This runs before readForms so the reader can expand ::alias/foo at read time.
function extractAliasMapFromTokens(tokens: Token[]): Map<string, string> {
  const aliases = new Map<string, string>()
  const meaningful = tokens.filter(
    (t) => t.kind !== 'Comment' && t.kind !== 'Whitespace'
  )
  // Must start with (ns ...)
  if (meaningful.length < 3) return aliases
  if (meaningful[0].kind !== 'LParen') return aliases
  if (meaningful[1].kind !== 'Symbol' || meaningful[1].value !== 'ns')
    return aliases

  // Walk the top-level ns form tracking paren depth.
  // For each [ vector ] we encounter, check for ns-sym :as alias-sym.
  let i = 3 // skip ( ns <name>
  let depth = 1
  while (i < meaningful.length && depth > 0) {
    const tok = meaningful[i]
    if (tok.kind === 'LParen') {
      depth++
      i++
      continue
    }
    if (tok.kind === 'RParen') {
      depth--
      i++
      continue
    }
    if (tok.kind === 'LBracket') {
      // Scan through this vector for: first Symbol (ns name) + :as + Symbol (alias)
      let j = i + 1
      let nsSym: string | null = null
      while (j < meaningful.length && meaningful[j].kind !== 'RBracket') {
        const t = meaningful[j]
        if (t.kind === 'Symbol' && nsSym === null) {
          nsSym = t.value
        }
        if (
          t.kind === 'Keyword' &&
          (t.value === ':as' || t.value === ':as-alias')
        ) {
          j++
          if (
            j < meaningful.length &&
            meaningful[j].kind === 'Symbol' &&
            nsSym
          ) {
            aliases.set((meaningful[j] as TokenSymbol).value, nsSym)
          }
        }
        j++
      }
    }
    i++
  }
  return aliases
}

function findNsForm(forms: CljValue[]) {
  const nsForm = forms.find(
    (f) => isList(f) && isSymbol(f.value[0]) && f.value[0].name === 'ns'
  )
  if (!nsForm || !isList(nsForm)) return null
  return nsForm
}

function extractRequireClauses(forms: CljValue[]): CljValue[][] {
  const nsForm = findNsForm(forms)
  if (!nsForm) return []
  const clauses: CljValue[][] = []
  for (let i = 2; i < nsForm.value.length; i++) {
    const clause = nsForm.value[i]
    if (
      isList(clause) &&
      isKeyword(clause.value[0]) &&
      clause.value[0].name === ':require'
    ) {
      clauses.push(clause.value.slice(1))
    }
  }
  return clauses
}

function processRequireSpec(
  spec: CljValue,
  currentEnv: Env,
  registry: NamespaceRegistry,
  resolveNamespace?: (nsName: string) => boolean
): void {
  if (!isVector(spec)) {
    throw new EvaluationError(
      'require spec must be a vector, e.g. [my.ns :as alias]',
      { spec }
    )
  }

  const elements = spec.value
  if (elements.length === 0 || !isSymbol(elements[0])) {
    throw new EvaluationError(
      'First element of require spec must be a namespace symbol',
      { spec }
    )
  }

  const nsName = elements[0].name

  // :as-alias creates a reader alias without loading the namespace.
  // The namespace need not exist — the alias is only used for ::alias/foo expansion.
  const hasAsAlias = elements.some(
    (el) => isKeyword(el) && el.name === ':as-alias'
  )
  if (hasAsAlias) {
    let i = 1
    while (i < elements.length) {
      const kw = elements[i]
      if (!isKeyword(kw)) {
        throw new EvaluationError(
          `Expected keyword in require spec, got ${kw.kind}`,
          { spec, position: i }
        )
      }
      if (kw.name === ':as-alias') {
        i++
        const alias = elements[i]
        if (!alias || !isSymbol(alias)) {
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
  if (!targetEnv && resolveNamespace) {
    resolveNamespace(nsName)
    targetEnv = registry.get(nsName)
  }
  if (!targetEnv) {
    throw new EvaluationError(
      `Namespace ${nsName} not found. Only already-loaded namespaces can be required.`,
      { nsName }
    )
  }

  let i = 1
  while (i < elements.length) {
    const kw = elements[i]
    if (!isKeyword(kw)) {
      throw new EvaluationError(
        `Expected keyword in require spec, got ${kw.kind}`,
        { spec, position: i }
      )
    }

    if (kw.name === ':as') {
      i++
      const alias = elements[i]
      if (!alias || !isSymbol(alias)) {
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
      if (!symsVec || !isVector(symsVec)) {
        throw new EvaluationError(':refer expects a vector of symbols', {
          spec,
          position: i,
        })
      }
      for (const sym of symsVec.value) {
        if (!isSymbol(sym)) {
          throw new EvaluationError(':refer vector must contain only symbols', {
            spec,
            sym,
          })
        }
        const v = lookupVar(sym.name, targetEnv)
        if (v !== undefined) {
          currentEnv.ns!.vars.set(sym.name, v)
        } else {
          let value: CljValue
          try {
            value = lookup(sym.name, targetEnv)
          } catch {
            throw new EvaluationError(
              `Symbol ${sym.name} not found in namespace ${nsName}`,
              { nsName, symbol: sym.name }
            )
          }
          define(sym.name, value, currentEnv)
        }
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

// ---------------------------------------------------------------------------
// Clone helpers — used by snapshotSession / createSessionFromSnapshot
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

function cloneRegistry(registry: NamespaceRegistry): NamespaceRegistry {
  const memo = new Map<Env, Env>()
  const next = new Map<string, Env>()
  // Pass 1: clone all envs (ns.aliases left empty)
  for (const [name, env] of registry) next.set(name, cloneEnv(env, memo))
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
// SessionState — the minimal data a session operates on
// ---------------------------------------------------------------------------

type SessionState = {
  registry: NamespaceRegistry
  currentNs: string
}

// ---------------------------------------------------------------------------
// buildSessionApi — single source of truth for all session behavior.
// Accepts a pre-populated registry (fresh or cloned) and wires up all
// closures + the public API. Always re-wires resolveNs and require since
// both must close over the specific registry instance they receive.
// ---------------------------------------------------------------------------

function buildSessionApi(
  state: SessionState,
  options?: SessionOptions
): Session {
  const registry = state.registry
  let currentNs = state.currentNs

  const coreEnv = registry.get('clojure.core')!
  coreEnv.resolveNs = (name: string) => registry.get(name) ?? null

  // Always re-wire print/println so snapshot-derived sessions get the right
  // emit target. Falls back to console.log when no output callback is provided.
  const emitFn = options?.output ?? ((text: string) => console.log(text))
  define(
    'println',
    cljNativeFunction('println', (...args: CljValue[]) => {
      emitFn(args.map(valueToString).join(' '))
      return cljNil()
    }),
    coreEnv
  )
  define(
    'print',
    cljNativeFunction('print', (...args: CljValue[]) => {
      emitFn(args.map(valueToString).join(' '))
      return cljNil()
    }),
    coreEnv
  )

  // Mutable source roots — seeded from options, growable via addSourceRoot.
  const sourceRoots = new Set<string>(options?.sourceRoots ?? [])

  function addSourceRoot(path: string) {
    sourceRoots.add(path)
  }

  // One shared evaluation context for the lifetime of this session.
  const ctx = createEvaluationContext()

  function resolveNamespace(nsName: string): boolean {
    const builtInLoader = builtInNamespaceSources[nsName]
    if (builtInLoader) {
      loadFile(builtInLoader(), nsName)
      return true
    }
    if (!options?.readFile || sourceRoots.size === 0) {
      return false
    }
    for (const root of sourceRoots) {
      const filePath = `${root.replace(/\/$/, '')}/${nsName.replace(/\./g, '/')}.clj`
      try {
        const source = options.readFile(filePath)
        if (source) {
          loadFile(source)
          return true
        }
      } catch {
        continue
      }
    }
    return false
  }

  function ensureNs(name: string): Env {
    if (!registry.has(name)) {
      const nsEnv = makeEnv(coreEnv)
      nsEnv.ns = makeNamespace(name)
      registry.set(name, nsEnv)
    }
    return registry.get(name)!
  }

  function setNs(name: string) {
    ensureNs(name)
    currentNs = name
  }

  function getNs(name: string): CljNamespace | null {
    return registry.get(name)?.ns ?? null
  }

  // Internal: returns the full Env (with lexical chain) for a namespace name.
  function getNsEnv(name: string): Env | null {
    return registry.get(name) ?? null
  }

  define(
    'require',
    cljNativeFunction('require', (...args: CljValue[]) => {
      const currentEnv = registry.get(currentNs)!
      for (const arg of args) {
        processRequireSpec(arg, currentEnv, registry, resolveNamespace)
      }
      return cljNil()
    }),
    coreEnv
  )

  define(
    'resolve',
    cljNativeFunction('resolve', (sym: CljValue) => {
      if (!isSymbol(sym)) return cljNil()
      const slashIdx = sym.name.indexOf('/')
      if (slashIdx > 0) {
        const nsName = sym.name.slice(0, slashIdx)
        const symName = sym.name.slice(slashIdx + 1)
        const nsEnv = registry.get(nsName) ?? null
        if (!nsEnv) return cljNil()
        return tryLookup(symName, nsEnv) ?? cljNil()
      }
      const currentEnv = registry.get(currentNs)!
      return tryLookup(sym.name, currentEnv) ?? cljNil()
    }),
    coreEnv
  )

  function processNsRequires(forms: CljValue[], env: Env) {
    const requireClauses = extractRequireClauses(forms)
    for (const specs of requireClauses) {
      for (const spec of specs) {
        processRequireSpec(spec, env, registry, resolveNamespace)
      }
    }
  }

  function loadFile(source: string, nsName?: string): string {
    const tokens = tokenize(source)
    const targetNs = extractNsNameFromTokens(tokens) ?? nsName ?? 'user'
    const aliasMap = extractAliasMapFromTokens(tokens)
    const forms = readForms(tokens, targetNs, aliasMap)
    const env = ensureNs(targetNs)
    processNsRequires(forms, env)
    for (const form of forms) {
      const expanded = ctx.expandAll(form, env)
      ctx.evaluate(expanded, env)
    }
    return targetNs
  }

  const api: Session = {
    registry,
    get currentNs() {
      return currentNs
    },
    setNs,
    getNs,
    loadFile,
    addSourceRoot,
    evaluate(source: string) {
      try {
        const tokens = tokenize(source)
        // If source opens with an ns declaration, switch to that namespace
        // so requires resolve against the right env and currentNs is updated.
        // This mirrors what loadFile does, making eval and load-file consistent.
        const declaredNs = extractNsNameFromTokens(tokens)
        if (declaredNs) {
          ensureNs(declaredNs)
          currentNs = declaredNs
        }
        const env = getNsEnv(currentNs)!
        // Seed alias map from tokens (new aliases declared in this source) and
        // from ns.aliases/:as (prior require calls) and ns.readerAliases/:as-alias.
        const aliasMap = extractAliasMapFromTokens(tokens)
        env.ns?.aliases.forEach((ns, alias) => {
          aliasMap.set(alias, ns.name)
        })
        env.ns?.readerAliases.forEach((nsName, alias) => {
          aliasMap.set(alias, nsName)
        })
        const forms = readForms(tokens, currentNs, aliasMap)
        processNsRequires(forms, env)
        let result: CljValue = cljNil()
        for (const form of forms) {
          const expanded = ctx.expandAll(form, env)
          result = ctx.evaluate(expanded, env)
        }
        return result
      } catch (e) {
        if (e instanceof CljThrownSignal) {
          throw new EvaluationError(
            `Unhandled throw: ${printString(e.value)}`,
            { thrownValue: e.value }
          )
        }
        if (e instanceof RecurSignal) {
          throw new EvaluationError('recur called outside of loop or fn', {
            args: e.args,
          })
        }
        if (
          (e instanceof EvaluationError || e instanceof ReaderError) &&
          e.pos
        ) {
          e.message += formatErrorContext(source, e.pos)
        }
        throw e
      }
    },
    evaluateForms(forms: CljValue[]) {
      try {
        const env = getNsEnv(currentNs)!
        let result: CljValue = cljNil()
        for (const form of forms) {
          const expanded = ctx.expandAll(form, env)
          result = ctx.evaluate(expanded, env)
        }
        return result
      } catch (e) {
        if (e instanceof CljThrownSignal) {
          throw new EvaluationError(
            `Unhandled throw: ${printString(e.value)}`,
            { thrownValue: e.value }
          )
        }
        if (e instanceof RecurSignal) {
          throw new EvaluationError('recur called outside of loop or fn', {
            args: e.args,
          })
        }
        throw e
      }
    },
    getCompletions(prefix: string, nsName?: string): string[] {
      let env: Env | null = registry.get(nsName ?? currentNs) ?? null
      const seen = new Set<string>()
      while (env) {
        for (const key of env.bindings.keys()) seen.add(key)
        if (env.ns) for (const key of env.ns.vars.keys()) seen.add(key)
        env = env.outer
      }
      const candidates = [...seen]
      if (!prefix) return candidates.sort()
      return candidates.filter((k) => k.startsWith(prefix)).sort()
    },
  }
  return api
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createSession(options?: SessionOptions): Session {
  const registry: NamespaceRegistry = new Map()

  const coreEnv = makeEnv()
  coreEnv.ns = makeNamespace('clojure.core')
  loadCoreFunctions(coreEnv, options?.output)
  registry.set('clojure.core', coreEnv)

  const userEnv = makeEnv(coreEnv)
  userEnv.ns = makeNamespace('user')
  registry.set('user', userEnv)

  const session = buildSessionApi({ registry, currentNs: 'user' }, options)

  const coreLoader = builtInNamespaceSources['clojure.core']
  if (!coreLoader) {
    throw new Error('Missing built-in clojure.core source in registry')
  }
  session.loadFile(coreLoader(), 'clojure.core')

  for (const source of options?.entries ?? []) {
    session.loadFile(source)
  }

  return session
}

/**
 * A snapshot of a session's registry + current namespace.
 * Produced by snapshotSession; consumed by createSessionFromSnapshot.
 * CljValue objects are shared (they are immutable); only the Env containers
 * are deep-copied so each derived session gets independent namespace state.
 */
export type SessionSnapshot = {
  registry: NamespaceRegistry
  currentNs: string
}

/**
 * Capture a deep clone of the session's env state.
 * Typically called once after createSession() and before any user code is
 * evaluated, to produce a pristine snapshot that can be cloned cheaply per test.
 */
export function snapshotSession(session: Session): SessionSnapshot {
  return {
    registry: cloneRegistry(session.registry),
    currentNs: session.currentNs,
  }
}

/**
 * Create a new session from a previously captured snapshot.
 * Skips the core.clj bootstrap — the cloned registry already contains the
 * fully-expanded core environment. Re-wires all registry-dependent closures
 * (resolveNs, require) to the new registry instance.
 */
export function createSessionFromSnapshot(
  snapshot: SessionSnapshot,
  options?: SessionOptions
): Session {
  const registry = cloneRegistry(snapshot.registry)
  const session = buildSessionApi(
    { registry, currentNs: snapshot.currentNs },
    options
  )
  for (const source of options?.entries ?? []) {
    session.loadFile(source)
  }
  return session
}
