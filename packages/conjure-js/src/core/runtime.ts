import {
  isKeyword,
  isList,
  isNamespace,
  isString,
  isSymbol,
  isVector,
} from './assertions'
import {
  resolveModuleOrder,
  type RuntimeModule,
  type ModuleContext,
} from './module'
import { internVar, makeEnv, makeNamespace, tryLookup } from './env'
import { EvaluationError } from './errors'
import { v } from './factories'
import { readForms } from './reader'
import { tokenize } from './tokenizer'
import type {
  CljNamespace,
  CljValue,
  Env,
  EvaluationContext,
  Token,
  TokenSymbol,
} from './types'
import { builtInNamespaceSources } from '../clojure/generated/builtin-namespace-registry'
import { makeCoreModule } from './core-module'
import { makeJsModule } from './stdlib/js-namespace'

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export type NamespaceRegistry = Map<string, Env>

export type RuntimeSnapshot = {
  registry: NamespaceRegistry
}

export type RuntimeOptions = {
  sourceRoots?: string[]
  readFile?: (filePath: string) => string
}

export type Runtime = {
  readonly registry: NamespaceRegistry

  // Namespace management
  ensureNamespace(name: string): Env
  getNamespaceEnv(name: string): Env | null
  getNs(name: string): CljNamespace | null
  /** Updates the *ns* var root to reflect the named namespace. Called by session.setNs. */
  syncNsVar(name: string): void
  addSourceRoot(path: string): void

  // Require mechanics — ctx is threaded through so lazy namespace loading works
  processRequireSpec(spec: CljValue, fromEnv: Env, ctx: EvaluationContext): void
  processNsRequires(
    forms: CljValue[],
    fromEnv: Env,
    ctx: EvaluationContext
  ): void
  /**
   * Async variant of processNsRequires.
   * Handles both symbol specs (sync) and string specs (async via ctx.importModule).
   * Must be used when the ns form contains string (:require ["module" :as Alias]) entries.
   */
  processNsRequiresAsync(
    forms: CljValue[],
    fromEnv: Env,
    ctx: EvaluationContext
  ): Promise<void>

  // File loading — ctx comes from the owning session
  loadFile(
    source: string,
    nsName: string | undefined,
    filePath: string | undefined,
    ctx: EvaluationContext
  ): string

  // Snapshot
  snapshot(): RuntimeSnapshot

  // Module installation — declarative capability extension
  installModules(modules: RuntimeModule[]): void
}

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
// Token scan helpers — lightweight pre-parse scans for ns form metadata.
// Exported so session.evaluate can reuse them.
// ---------------------------------------------------------------------------

// Looks for the pattern: LParen Symbol("ns") Symbol(name) at the top of the
// token stream. Returns the namespace name or null.
export function extractNsNameFromTokens(tokens: Token[]): string | null {
  const meaningful = tokens.filter((t) => t.kind !== 'Comment')
  if (meaningful.length < 3) return null
  if (meaningful[0].kind !== 'LParen') return null
  if (meaningful[1].kind !== 'Symbol' || meaningful[1].value !== 'ns')
    return null
  if (meaningful[2].kind !== 'Symbol') return null
  return meaningful[2].value
}

// Returns Map { 'alias' -> 'full.ns.name' } for all [some.ns :as alias] and
// [some.ns :as-alias alias] specs found in the ns form's :require clauses.
// Runs before readForms so the reader can expand ::alias/foo at read time.
export function extractAliasMapFromTokens(
  tokens: Token[]
): Map<string, string> {
  const aliases = new Map<string, string>()
  const meaningful = tokens.filter(
    (t) => t.kind !== 'Comment' && t.kind !== 'Whitespace'
  )
  if (meaningful.length < 3) return aliases
  if (meaningful[0].kind !== 'LParen') return aliases
  if (meaningful[1].kind !== 'Symbol' || meaningful[1].value !== 'ns')
    return aliases

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
    (f) =>
      isList(f) &&
      f.value.length > 0 &&
      isSymbol(f.value[0]) &&
      f.value[0].name === 'ns'
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

// ---------------------------------------------------------------------------
// processRequireSpec — processes a single [ns.name :as alias :refer [...]] spec.
// resolveNs is called when the target namespace isn't yet loaded.
// ---------------------------------------------------------------------------

function processRequireSpec(
  spec: CljValue,
  currentEnv: Env,
  registry: NamespaceRegistry,
  resolveNs?: (nsName: string) => boolean
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
  if (!targetEnv && resolveNs) {
    resolveNs(nsName)
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

// ---------------------------------------------------------------------------
// ensureNamespaceInRegistry — creates namespace env if it doesn't exist yet
// ---------------------------------------------------------------------------

function ensureNamespaceInRegistry(
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
// buildRuntime — shared factory used by createRuntime and restoreRuntime.
// Wires all native fns, IO, introspection, require, and IDE stubs into coreEnv.
// Does NOT load clojure.core source — that's the session's bootstrap job.
// ---------------------------------------------------------------------------

function buildRuntime(
  registry: NamespaceRegistry,
  coreEnv: Env,
  options: RuntimeOptions | undefined
): Runtime {
  const sourceRoots = new Set<string>(options?.sourceRoots ?? [])

  // varOwners tracks which module installed each var, keyed by "ns/varName".
  // Prevents two modules from declaring the same var in the same namespace.
  const varOwners = new Map<string, string>()

  // currentNsRef mirrors the owning session's currentNs for require/resolve.
  // Updated via runtime.syncNsVar() which session.setNs calls.
  let currentNsRef = 'user'

  // resolveNamespace: loads a namespace by name if not already in the registry.
  // ctx is passed explicitly — this is the active EvaluationContext at the
  // call site. For loadFile calls, it's the file's ctx. For runtime require
  // native fn calls, it comes from the evaluator via cljNativeFunctionWithContext.
  function resolveNamespace(nsName: string, ctx: EvaluationContext): boolean {
    const builtInLoader = builtInNamespaceSources[nsName]
    if (builtInLoader) {
      runtime.loadFile(builtInLoader(), nsName, undefined, ctx)
      return true
    }
    if (!options?.readFile || sourceRoots.size === 0) return false
    for (const root of sourceRoots) {
      const filePath = `${root.replace(/\/$/, '')}/${nsName.replace(/\./g, '/')}.clj`
      try {
        const source = options.readFile(filePath)
        if (source) {
          runtime.loadFile(source, undefined, undefined, ctx)
          return true
        }
      } catch {
        continue
      }
    }
    return false
  }

  // *ns* var — holds the current namespace as a CljNamespace value
  const initialNsObj = registry.get('user')?.ns ?? makeNamespace('user')
  internVar('*ns*', initialNsObj, coreEnv)
  const nsVar = coreEnv.ns?.vars.get('*ns*')
  if (nsVar) nsVar.dynamic = true

  // Helper: resolve a namespace symbol (or namespace object) to its CljNamespace
  function resolveNsSym(sym: CljValue): CljNamespace | null {
    if (sym === undefined) return null
    if (isNamespace(sym)) return sym
    if (!isSymbol(sym)) return null
    return registry.get(sym.name)?.ns ?? null
  }

  // Namespace introspection
  internVar(
    'ns-name',
    v.nativeFn('ns-name', (x: CljValue) => {
      if (x === undefined) return v.nil()
      if (x.kind === 'namespace') return v.symbol(x.name)
      if (x.kind === 'symbol') return x
      if (x.kind === 'string') return v.symbol(x.value)
      return v.nil()
    }),
    coreEnv
  )

  internVar(
    'all-ns',
    v.nativeFn('all-ns', () =>
      v.list([...registry.values()].map((env) => env.ns!).filter(Boolean))
    ),
    coreEnv
  )

  internVar(
    'find-ns',
    v.nativeFn('find-ns', (sym: CljValue) => {
      if (sym === undefined || !isSymbol(sym)) return v.nil()
      return registry.get(sym.name)?.ns ?? v.nil()
    }),
    coreEnv
  )

  internVar(
    'in-ns',
    v.nativeFnCtx('in-ns', (ctx, _callEnv, sym: CljValue) => {
      if (!sym || !isSymbol(sym)) {
        throw new EvaluationError('in-ns expects a symbol', { sym })
      }
      if (ctx.setCurrentNs) ctx.setCurrentNs(sym.name)
      return registry.get(sym.name)?.ns ?? v.nil()
    }),
    coreEnv
  )

  internVar(
    'ns-aliases',
    v.nativeFn('ns-aliases', (sym: CljValue) => {
      const ns = resolveNsSym(sym)
      if (!ns) return v.map([])
      const entries: [CljValue, CljValue][] = []
      ns.aliases.forEach((targetNs, alias) => {
        entries.push([v.symbol(alias), targetNs])
      })
      return v.map(entries)
    }),
    coreEnv
  )

  internVar(
    'ns-interns',
    v.nativeFn('ns-interns', (sym: CljValue) => {
      const ns = resolveNsSym(sym)
      if (!ns) return v.map([])
      const entries: [CljValue, CljValue][] = []
      ns.vars.forEach((theVar, name) => {
        if (theVar.ns === ns.name) entries.push([v.symbol(name), theVar])
      })
      return v.map(entries)
    }),
    coreEnv
  )

  internVar(
    'ns-publics',
    v.nativeFn('ns-publics', (sym: CljValue) => {
      const ns = resolveNsSym(sym)
      if (!ns) return v.map([])
      const entries: [CljValue, CljValue][] = []
      ns.vars.forEach((theVar, name) => {
        if (theVar.ns === ns.name) entries.push([v.symbol(name), theVar])
      })
      return v.map(entries)
    }),
    coreEnv
  )

  internVar(
    'ns-refers',
    v.nativeFn('ns-refers', (sym: CljValue) => {
      const ns = resolveNsSym(sym)
      if (!ns) return v.map([])
      const entries: [CljValue, CljValue][] = []
      ns.vars.forEach((theVar, name) => {
        if (theVar.ns !== ns.name) entries.push([v.symbol(name), theVar])
      })
      return v.map(entries)
    }),
    coreEnv
  )

  internVar(
    'ns-map',
    v.nativeFn('ns-map', (sym: CljValue) => {
      const ns = resolveNsSym(sym)
      if (!ns) return v.map([])
      const entries: [CljValue, CljValue][] = []
      ns.vars.forEach((theVar, name) => {
        entries.push([v.symbol(name), theVar])
      })
      return v.map(entries)
    }),
    coreEnv
  )

  internVar(
    'ns-imports',
    v.nativeFn('ns-imports', (_sym: CljValue) => v.map([])),
    coreEnv
  )

  internVar(
    'the-ns',
    v.nativeFn('the-ns', (sym: CljValue) => {
      if (sym === undefined) return v.nil()
      if (isNamespace(sym)) return sym
      if (!isSymbol(sym)) return v.nil()
      return registry.get(sym.name)?.ns ?? v.nil()
    }),
    coreEnv
  )

  internVar(
    'instance?',
    v.nativeFn('instance?', (_cls: CljValue, _obj: CljValue) =>
      v.boolean(false)
    ),
    coreEnv
  )

  internVar(
    'class',
    v.nativeFn('class', (x: CljValue) => {
      if (x === undefined) return v.nil()
      return v.string(`conjure.${x.kind}`)
    }),
    coreEnv
  )

  internVar(
    'class?',
    v.nativeFn('class?', (_x: CljValue) => v.boolean(false)),
    coreEnv
  )

  internVar(
    'special-symbol?',
    v.nativeFn('special-symbol?', (sym: CljValue) => {
      if (sym === undefined || !isSymbol(sym)) return v.boolean(false)
      const specials = new Set([
        'def',
        'if',
        'do',
        'let',
        'quote',
        'var',
        'fn',
        'loop',
        'recur',
        'throw',
        'try',
        'catch',
        'finally',
        'ns',
        'defmacro',
        'binding',
        'monitor-enter',
        'monitor-exit',
        'new',
        'set!',
        '.',
        'import',
      ])
      return v.boolean(specials.has(sym.name))
    }),
    coreEnv
  )

  internVar(
    'loaded-libs',
    v.nativeFn('loaded-libs', () => v.set([...registry.keys()].map(v.symbol))),
    coreEnv
  )

  // require — context-aware so it can thread ctx to resolveNamespace
  internVar(
    'require',
    v.nativeFnCtx('require', (ctx, _callEnv, ...args: CljValue[]) => {
      const currentEnv = registry.get(currentNsRef)!
      for (const arg of args) {
        processRequireSpec(arg, currentEnv, registry, (nsName) =>
          resolveNamespace(nsName, ctx)
        )
      }
      return v.nil()
    }),
    coreEnv
  )

  internVar(
    'resolve',
    v.nativeFn('resolve', (sym: CljValue) => {
      if (!isSymbol(sym)) return v.nil()
      const slashIdx = sym.name.indexOf('/')
      if (slashIdx > 0) {
        const nsName = sym.name.slice(0, slashIdx)
        const symName = sym.name.slice(slashIdx + 1)
        const nsEnv = registry.get(nsName) ?? null
        if (!nsEnv) return v.nil()
        return tryLookup(symName, nsEnv) ?? v.nil()
      }
      const currentEnv = registry.get(currentNsRef)!
      return tryLookup(sym.name, currentEnv) ?? v.nil()
    }),
    coreEnv
  )

  // IDE stubs: clojure.reflect
  const reflectEnv = ensureNamespaceInRegistry(
    registry,
    coreEnv,
    'clojure.reflect'
  )
  internVar(
    'parse-flags',
    v.nativeFn('parse-flags', (_flags: CljValue, _kind: CljValue) => v.set([])),
    reflectEnv
  )
  internVar(
    'reflect',
    v.nativeFn('reflect', (_obj: CljValue) => v.map([])),
    reflectEnv
  )
  internVar(
    'type-reflect',
    v.nativeFn('type-reflect', (_typeobj: CljValue, ..._opts: CljValue[]) =>
      v.map([])
    ),
    reflectEnv
  )

  // IDE stubs: cursive.repl.runtime
  const cursiveEnv = ensureNamespaceInRegistry(
    registry,
    coreEnv,
    'cursive.repl.runtime'
  )
  internVar(
    'completions',
    v.nativeFn('completions', (..._args: CljValue[]) => v.nil()),
    cursiveEnv
  )

  // Java class stubs — Cursive references these as bare symbols for type checks
  for (const javaClass of [
    'Class',
    'Object',
    'String',
    'Number',
    'Boolean',
    'Integer',
    'Long',
    'Double',
    'Float',
    'Byte',
    'Short',
    'Character',
    'Void',
    'Math',
    'System',
    'Runtime',
    'Thread',
    'Throwable',
    'Exception',
    'Error',
    'Iterable',
    'Comparable',
    'Runnable',
    'Cloneable',
  ]) {
    internVar(javaClass, v.keyword(`:java.lang/${javaClass}`), coreEnv)
  }

  const runtime: Runtime = {
    get registry() {
      return registry
    },

    ensureNamespace(name: string): Env {
      return ensureNamespaceInRegistry(registry, coreEnv, name)
    },

    getNamespaceEnv(name: string): Env | null {
      return registry.get(name) ?? null
    },

    getNs(name: string): CljNamespace | null {
      return registry.get(name)?.ns ?? null
    },

    syncNsVar(name: string): void {
      currentNsRef = name
      const nsVarInner = coreEnv.ns?.vars.get('*ns*')
      if (nsVarInner) {
        const nsObj = registry.get(name)?.ns
        if (nsObj) nsVarInner.value = nsObj
      }
    },

    addSourceRoot(path: string): void {
      sourceRoots.add(path)
    },

    processRequireSpec(
      spec: CljValue,
      fromEnv: Env,
      ctx: EvaluationContext
    ): void {
      processRequireSpec(spec, fromEnv, registry, (nsName) =>
        resolveNamespace(nsName, ctx)
      )
    },

    processNsRequires(
      forms: CljValue[],
      fromEnv: Env,
      ctx: EvaluationContext
    ): void {
      const requireClauses = extractRequireClauses(forms)
      for (const specs of requireClauses) {
        for (const spec of specs) {
          if (
            isVector(spec) &&
            spec.value.length > 0 &&
            isString(spec.value[0])
          ) {
            const specifier = spec.value[0].value
            throw new EvaluationError(
              `String module require ["${specifier}" :as ...] is async — use evaluateAsync() instead of evaluate()`,
              { specifier }
            )
          }
          processRequireSpec(spec, fromEnv, registry, (nsName) =>
            resolveNamespace(nsName, ctx)
          )
        }
      }
    },

    async processNsRequiresAsync(
      forms: CljValue[],
      fromEnv: Env,
      ctx: EvaluationContext
    ): Promise<void> {
      const requireClauses = extractRequireClauses(forms)
      for (const specs of requireClauses) {
        for (const spec of specs) {
          if (
            isVector(spec) &&
            spec.value.length > 0 &&
            isString(spec.value[0])
          ) {
            // String module require — calls importModule and interns result as a var
            const specifier = spec.value[0].value
            if (!ctx.importModule) {
              throw new EvaluationError(
                `importModule is not configured; cannot require "${specifier}". Pass importModule to createSession().`,
                { specifier }
              )
            }
            const elements = spec.value
            let aliasName: string | null = null
            for (let i = 1; i < elements.length; i++) {
              if (isKeyword(elements[i]) && (elements[i] as { name: string }).name === ':as') {
                i++
                const aliasSym = elements[i]
                if (!aliasSym || !isSymbol(aliasSym)) {
                  throw new EvaluationError(':as expects a symbol alias', { spec })
                }
                aliasName = aliasSym.name
                break
              }
            }
            if (aliasName === null) {
              throw new EvaluationError(
                `String require spec must have an :as alias: ["${specifier}" :as Alias]`,
                { spec }
              )
            }
            const rawModule = await ctx.importModule(specifier)
            internVar(aliasName, v.jsValue(rawModule), fromEnv)
          } else {
            // Symbol require spec — sync path
            processRequireSpec(spec, fromEnv, registry, (nsName) =>
              resolveNamespace(nsName, ctx)
            )
          }
        }
      }
    },

    loadFile(
      source: string,
      nsName: string | undefined,
      filePath: string | undefined,
      ctx: EvaluationContext
    ): string {
      const tokens = tokenize(source)
      const targetNs = extractNsNameFromTokens(tokens) ?? nsName ?? 'user'
      const aliasMap = extractAliasMapFromTokens(tokens)
      const forms = readForms(tokens, targetNs, aliasMap)
      const env = this.ensureNamespace(targetNs)
      ctx.currentSource = source
      ctx.currentFile = filePath
      ctx.currentLineOffset = 0
      ctx.currentColOffset = 0
      this.processNsRequires(forms, env, ctx)
      try {
        for (const form of forms) {
          const expanded = ctx.expandAll(form, env)
          ctx.evaluate(expanded, env)
        }
      } finally {
        ctx.currentSource = undefined
        ctx.currentFile = undefined
      }
      return targetNs
    },

    installModules(modules: RuntimeModule[]): void {
      const ordered = resolveModuleOrder(modules, new Set(registry.keys()))

      for (const mod of ordered) {
        for (const decl of mod.declareNs) {
          const nsEnv = ensureNamespaceInRegistry(registry, coreEnv, decl.name)

          const ctx: ModuleContext = {
            getVar(ns, name) {
              const nsEnv = registry.get(ns)
              const v = nsEnv?.ns?.vars.get(name)
              return v ?? null
            },
            getNamespace(name) {
              return registry.get(name)?.ns ?? null
            },
          }

          const varMap = decl.vars(ctx)

          for (const [varName, decl] of varMap) {
            const key = `${nsEnv.ns!.name}/${varName}`
            const existing = varOwners.get(key)
            if (existing !== undefined) {
              throw new Error(
                `var '${varName}' in '${nsEnv.ns!.name}' already declared by module '${existing}'`
              )
            }
            internVar(varName, decl.value, nsEnv, decl.meta)
            if (decl.dynamic) {
              const v = nsEnv.ns!.vars.get(varName)!
              v.dynamic = true
            }
            varOwners.set(key, mod.id)
          }
        }
      }
    },

    snapshot(): RuntimeSnapshot {
      return { registry: cloneRegistry(registry) }
    },
  }

  return runtime
}

// ---------------------------------------------------------------------------
// createRuntime — builds a fresh runtime with bootstrapped core + user envs.
// Does NOT load clojure.core source — that's the session's bootstrap job.
// ---------------------------------------------------------------------------

export function createRuntime(options?: RuntimeOptions): Runtime {
  const registry: NamespaceRegistry = new Map()

  // Bootstrap: clojure.core env
  const coreEnv = makeEnv()
  coreEnv.ns = makeNamespace('clojure.core')
  registry.set('clojure.core', coreEnv)

  // Bootstrap: user env (outer = coreEnv for implicit core access)
  const userEnv = makeEnv(coreEnv)
  userEnv.ns = makeNamespace('user')
  registry.set('user', userEnv)

  const runtime = buildRuntime(registry, coreEnv, options)
  runtime.installModules([makeCoreModule(), makeJsModule()])
  return runtime
}

// ---------------------------------------------------------------------------
// restoreRuntime — re-wires a runtime from a snapshot.
// The cloned registry already contains fully-evaluated namespaces (including
// clojure.core), so no source bootstrap is needed. Only wiring is re-applied.
// ---------------------------------------------------------------------------

export function restoreRuntime(
  snapshot: RuntimeSnapshot,
  options?: RuntimeOptions
): Runtime {
  const registry = cloneRegistry(snapshot.registry)
  const coreEnv = registry.get('clojure.core')!
  const runtime = buildRuntime(registry, coreEnv, options)
  // No module reinstallation needed — IO functions (println, print, etc.) read
  // ctx.io.stdout at call time, so the snapshot's native functions automatically
  // use the session's output channel without any rewiring.
  return runtime
}
