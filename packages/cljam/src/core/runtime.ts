import { builtInNamespaceSources } from '../clojure/generated/builtin-namespace-registry'
import { is } from './assertions'
import { wireIdeStubs, wireNsCore } from './bootstrap'
import { internVar, makeEnv, makeNamespace } from './env'
import { EvaluationError } from './errors'
import { v } from './factories'
import {
  resolveModuleOrder,
  type ModuleContext,
  type RuntimeModule,
} from './module'
import { makeCoreModule } from './modules/core'
import { makeJsModule } from './modules/js'
import {
  extractAliasMapFromTokens,
  extractNsNameFromTokens,
  extractRequireClauses,
} from './ns-forms'
import { readForms } from './reader'
import type { NamespaceRegistry } from './registry'
import {
  cloneRegistry,
  ensureNamespaceInRegistry,
  processRequireSpec,
} from './registry'
import { tokenize } from './tokenizer'
import type { CljNamespace, CljValue, Env, EvaluationContext } from './types'

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export type { NamespaceRegistry }

export type RuntimeSnapshot = {
  registry: NamespaceRegistry
}

export type RuntimeOptions = {
  sourceRoots?: string[]
  readFile?: (filePath: string) => string
  /**
   * Namespace sources registered by CljamLibrary instances.
   * Built by createSession from all libraries[].sources entries.
   * Checked during require resolution: after builtins, before filesystem.
   */
  registeredSources?: Map<string, string>
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
// buildRuntime — shared factory used by createRuntime and restoreRuntime.
// Orchestrates registry wiring and native fn installation via bootstrap.ts.
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
    // Priority 1: built-in namespaces (clojure.core, clojure.string, etc.)
    const builtInLoader = builtInNamespaceSources[nsName]
    if (builtInLoader) {
      runtime.loadFile(builtInLoader(), nsName, undefined, ctx)
      return true
    }
    // Priority 2: library-registered sources (CljamLibrary.sources)
    const registeredSource = options?.registeredSources?.get(nsName)
    if (registeredSource !== undefined) {
      runtime.loadFile(registeredSource, nsName, undefined, ctx)
      return true
    }
    // Priority 3: filesystem via sourceRoots
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

  // isLibraryNamespace: true only for namespaces registered via CljamLibrary.
  // Used to scope the allowedPackages check — filesystem namespaces are always allowed.
  function isLibraryNamespace(nsName: string): boolean {
    return options?.registeredSources?.has(nsName) ?? false
  }

  // isHostModuleAllowed: checks a JS string specifier against ctx.allowedHostModules.
  // Supports prefix matching: 'node:' matches 'node:path', 'node:http', etc.
  function isHostModuleAllowed(
    specifier: string,
    allowedHostModules: string[] | 'all'
  ): boolean {
    if (allowedHostModules === 'all') return true
    return allowedHostModules.some(
      (allowed) => specifier === allowed || specifier.startsWith(allowed)
    )
  }

  wireNsCore(registry, coreEnv, () => currentNsRef, resolveNamespace)
  wireIdeStubs(registry, coreEnv)

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
        resolveNamespace(nsName, ctx), ctx.allowedPackages, isLibraryNamespace
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
            is.vector(spec) &&
            spec.value.length > 0 &&
            is.string(spec.value[0])
          ) {
            const specifier = spec.value[0].value
            throw new EvaluationError(
              `String module require ["${specifier}" :as ...] is async — use evaluateAsync() instead of evaluate()`,
              { specifier }
            )
          }
          processRequireSpec(spec, fromEnv, registry, (nsName) =>
            resolveNamespace(nsName, ctx), ctx.allowedPackages, isLibraryNamespace
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
            is.vector(spec) &&
            spec.value.length > 0 &&
            is.string(spec.value[0])
          ) {
            // String module require — calls importModule and interns result as a var
            const specifier = spec.value[0].value
            if (!ctx.importModule) {
              throw new EvaluationError(
                `importModule is not configured; cannot require "${specifier}". Pass importModule to createSession().`,
                { specifier }
              )
            }
            if (
              ctx.allowedHostModules !== undefined &&
              !isHostModuleAllowed(specifier, ctx.allowedHostModules)
            ) {
              const allowedList =
                ctx.allowedHostModules === 'all' ? [] : ctx.allowedHostModules
              const err = new EvaluationError(
                `Access denied: host module '${specifier}' is not in the allowed host modules for this session.\n` +
                  `Allowed host modules: ${JSON.stringify(allowedList)}\n` +
                  `To allow all host modules, use: allowedHostModules: 'all'`,
                { specifier, allowedHostModules: ctx.allowedHostModules }
              )
              err.code = 'namespace/access-denied'
              throw err
            }
            const elements = spec.value
            let aliasName: string | null = null
            for (let i = 1; i < elements.length; i++) {
              if (
                is.keyword(elements[i]) &&
                (elements[i] as { name: string }).name === ':as'
              ) {
                i++
                const aliasSym = elements[i]
                if (!aliasSym || !is.symbol(aliasSym)) {
                  throw new EvaluationError(':as expects a symbol alias', {
                    spec,
                  })
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
              resolveNamespace(nsName, ctx), ctx.allowedPackages, isLibraryNamespace
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
