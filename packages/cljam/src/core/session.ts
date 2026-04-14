import { builtInNamespaceSources } from '../clojure/generated/builtin-namespace-registry'
import { cljToJs as _cljToJs } from './conversions'
import { internVar, makeEnv } from './env'
import { CljThrownSignal, EvaluationError, ReaderError } from './errors'
import { createEvaluationContext, RecurSignal } from './evaluator'
import { jsToClj } from './evaluator/js-interop'
import { v } from './factories'
import type { CljamLibrary } from './library'
import type { RuntimeModule } from './module'
import { extractAliasMapFromTokens, extractNsNameFromTokens } from './ns-forms'
import { formatErrorContext } from './positions'
import { printString } from './printer'
import { readForms } from './reader'
import type { Runtime, RuntimeSnapshot } from './runtime'
import { createRuntime, restoreRuntime } from './runtime'
import { tokenize } from './tokenizer'
import type { CljNamespace, CljValue, Env } from './types'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SessionOptions = {
  /** Primary output channel — wired to ctx.io.stdout (println, print, pr, prn, pprint, newline). */
  output?: (text: string) => void
  /** Secondary error channel — wired to ctx.io.stderr. */
  stderr?: (text: string) => void
  entries?: string[]
  sourceRoots?: string[]
  readFile?: (filePath: string) => string
  modules?: RuntimeModule[]
  /**
   * Ambient JS globals injected into the `js` namespace as CljJsValue vars.
   * Each key becomes accessible as `js/<key>` in Clojure code without any require.
   * Example: `{ Math, console, fetch }` → `js/Math`, `js/console`, `js/fetch`.
   */
  hostBindings?: Record<string, unknown>
  /**
   * Called when (:require ["specifier" :as Alias]) is encountered.
   * Must return (or resolve to) the module object, which is boxed as CljJsValue
   * and bound to Alias in the current namespace.
   * Only usable via evaluateAsync() — string requires are inherently async.
   * Examples:
   *   Node/Bun:  importModule: (s) => import(s)
   *   Vite:      importModule: (s) => import(s)   // Vite resolves statically at build time
   *   Tests:     importModule: (s) => fakeModules[s]
   */
  importModule?: (specifier: string) => unknown | Promise<unknown>
  /**
   * Libraries to install into this session.
   * Each library's sources become resolvable via (:require [ns]).
   * Each library's module (if any) is installed via installModules().
   * Libraries are processed after modules.
   */
  libraries?: CljamLibrary[]
  /**
   * Controls which Clojure namespaces may be loaded via (:require [ns]).
   * Only applies to library-registered namespaces — filesystem namespaces (user code
   * loaded via sourceRoots + readFile) are always allowed.
   * - 'all' (default): any namespace may be loaded
   * - string[]: only library namespaces whose name matches one of these prefixes.
   *   'clojure.*' and 'user' are always allowed regardless.
   *   Example: ['cljam.date', 'cljam.schema'] allows those libraries but blocks others.
   */
  allowedPackages?: string[] | 'all'
  /**
   * Controls which JS host module specifiers may be imported via
   * (:require ["specifier" :as Alias]). Supports prefix matching:
   * - 'all' (default): any specifier is allowed
   * - string[]: only specifiers that exactly match or start with one of these.
   *   Example: ['node:'] allows all Node.js built-ins.
   *   Example: ['node:path', 'node:url'] allows only those two modules.
   */
  allowedHostModules?: string[] | 'all'
}

/**
 * Read-only view of what a session can do.
 * Primarily useful for LLM tool context — inject into system prompts so the
 * model knows what functions are available and what namespaces it can require.
 */
export type SessionCapabilities = {
  /** Which library package prefixes may be required. 'all' means unrestricted. */
  allowedPackages: string[] | 'all'
  /** Which JS host module specifiers may be imported. 'all' means unrestricted. */
  allowedHostModules: string[] | 'all'
  /** Names of host bindings available as js/<name>. */
  hostBindings: string[]
  /** Whether dynamic JS imports are enabled ((:require ["pkg" :as X])). */
  allowDynamicImport: boolean
  /** IDs of installed libraries. */
  libraries: string[]
}

export type Session = {
  /** The underlying runtime — exposed for snapshot access and advanced embedding. */
  readonly runtime: Runtime
  /** Read-only description of what this session can do. Useful for LLM tool context. */
  readonly capabilities: SessionCapabilities
  /** Passthrough to runtime.registry. Used by nREPL and tooling for namespace lookup. */
  readonly registry: Runtime['registry']
  readonly currentNs: string
  /** Libraries installed into this session. Preserved in snapshots so cloned sessions re-apply the same setup. */
  readonly libraries: CljamLibrary[]
  setNs: (namespace: string) => void
  getNs: (namespace: string) => CljNamespace | null
  loadFile: (source: string, nsName?: string, filePath?: string) => string
  /** Async variant of loadFile — handles string requires ((:require ["pkg" :as X])). */
  loadFileAsync: (
    source: string,
    nsName?: string,
    filePath?: string
  ) => Promise<string>
  evaluate: (
    source: string,
    opts?: { lineOffset?: number; colOffset?: number; file?: string }
  ) => CljValue
  evaluateAsync: (
    source: string,
    opts?: { lineOffset?: number; colOffset?: number; file?: string }
  ) => Promise<CljValue>
  evaluateForms: (forms: CljValue[]) => CljValue
  /**
   * Call a CljFunction or CljNativeFunction using this session's evaluation context.
   * Unlike the bare `applyFunction` export from `core/index`, this resolves namespaces
   * through the session's runtime registry — required for any CLJ code that references
   * qualified symbols like `js/Math` or `:require`-d aliases.
   */
  applyFunction: (fn: CljValue, args: CljValue[]) => CljValue
  /**
   * Convert a CljValue to a plain JS value using this session's evaluation context.
   * CLJ functions are wrapped as JS callbacks that invoke via session.applyFunction,
   * ensuring namespace resolution works for js/Math and other runtime namespaces.
   */
  cljToJs: (value: CljValue) => unknown
  addSourceRoot: (path: string) => void
  getCompletions: (prefix: string, nsName?: string) => string[]
}

export type SessionSnapshot = {
  runtimeSnapshot: RuntimeSnapshot
  currentNs: string
  /** Libraries to re-apply when restoring — ensures native modules + source registrations survive cloning. */
  libraries: CljamLibrary[]
}

// ---------------------------------------------------------------------------
// buildSessionFacade — thin evaluation facade over a Runtime.
// All namespace mechanics are delegated to the runtime.
// ---------------------------------------------------------------------------

function buildSessionFacade(
  runtime: Runtime,
  initialNs: string,
  options?: SessionOptions
): Session {
  let currentNs = initialNs

  // One shared evaluation context for the lifetime of this session.
  const ctx = createEvaluationContext()
  ctx.resolveNs = (name: string) => runtime.getNs(name)
  ctx.allNamespaces = () => {
    const namespaces: CljNamespace[] = []
    for (const env of runtime.registry.values()) {
      if (env.ns) namespaces.push(env.ns)
    }
    return namespaces
  }
  ctx.io = {
    stdout: options?.output ?? ((text) => console.log(text)),
    stderr: options?.stderr ?? ((text) => console.error(text)),
  }
  ctx.importModule = options?.importModule
  ctx.allowedPackages = options?.allowedPackages ?? 'all'
  ctx.allowedHostModules = options?.allowedHostModules ?? 'all'
  ctx.setCurrentNs = (name: string) => {
    runtime.ensureNamespace(name)
    currentNs = name
    runtime.syncNsVar(name)
  }

  const capabilities: SessionCapabilities = {
    allowedPackages: options?.allowedPackages ?? 'all',
    allowedHostModules: options?.allowedHostModules ?? 'all',
    hostBindings: Object.keys(options?.hostBindings ?? {}),
    allowDynamicImport: options?.importModule !== undefined,
    libraries: (options?.libraries ?? []).map((lib) => lib.id),
  }

  const session: Session = {
    get runtime() {
      return runtime
    },

    get capabilities() {
      return capabilities
    },

    get registry() {
      return runtime.registry
    },

    get currentNs() {
      return currentNs
    },

    get libraries() {
      return options?.libraries ?? []
    },

    setNs(name: string) {
      runtime.ensureNamespace(name)
      currentNs = name
      runtime.syncNsVar(name)
    },

    getNs(name: string): CljNamespace | null {
      return runtime.getNs(name)
    },

    loadFile(source: string, nsName?: string, filePath?: string): string {
      return runtime.loadFile(source, nsName, filePath, ctx)
    },

    async loadFileAsync(
      source: string,
      nsName?: string,
      filePath?: string
    ): Promise<string> {
      // If there is no ns declaration in the source, pre-set the namespace from
      // the hint so the forms evaluate in the right context.
      if (nsName) {
        const tokens = tokenize(source)
        if (!extractNsNameFromTokens(tokens)) {
          runtime.ensureNamespace(nsName)
          currentNs = nsName
          runtime.syncNsVar(nsName)
        }
      }
      await session.evaluateAsync(source, { file: filePath })
      return currentNs
    },

    addSourceRoot(path: string): void {
      runtime.addSourceRoot(path)
    },

    evaluate(
      source: string,
      opts?: { lineOffset?: number; colOffset?: number; file?: string }
    ): CljValue {
      ctx.currentSource = source
      ctx.currentFile = opts?.file
      ctx.currentLineOffset = opts?.lineOffset ?? 0
      ctx.currentColOffset = opts?.colOffset ?? 0
      try {
        const tokens = tokenize(source)
        // If source opens with an ns declaration, switch to that namespace
        // so requires resolve against the right env and currentNs is updated.
        const declaredNs = extractNsNameFromTokens(tokens)
        if (declaredNs) {
          runtime.ensureNamespace(declaredNs)
          currentNs = declaredNs
          runtime.syncNsVar(declaredNs)
        }
        const env = runtime.getNamespaceEnv(currentNs)!
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
        runtime.processNsRequires(forms, env, ctx)
        let result: CljValue = v.nil()
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
        if (e instanceof EvaluationError || e instanceof ReaderError) {
          const pos = e.pos ?? (e instanceof EvaluationError ? e.frames?.[0]?.pos : undefined)
          if (pos) {
            e.message += formatErrorContext(source, pos, {
              lineOffset: ctx.currentLineOffset,
              colOffset: ctx.currentColOffset,
            })
          }
        }
        throw e
      } finally {
        ctx.currentSource = undefined
        ctx.currentFile = undefined
        // Reset frameStack unconditionally. Under normal execution the push/pop
        // pairs in compileCall and evaluator/dispatch maintain balance, so this
        // is a no-op. But when a JS-native RangeError (stack overflow) escapes,
        // V8 may not execute all finally-pops before exhausting its own error
        // reserve, leaving ghost frames here. A stale frameStack compounds on
        // the next evaluation, making the effective recursion limit shrink with
        // each overflow. Resetting at the session boundary is the right fix:
        // it's unconditional, stack-free, and runs after every top-level eval.
        ctx.frameStack = []
      }
    },

    async evaluateAsync(
      source: string,
      opts?: { lineOffset?: number; colOffset?: number; file?: string }
    ): Promise<CljValue> {
      ctx.currentSource = source
      ctx.currentFile = opts?.file
      ctx.currentLineOffset = opts?.lineOffset ?? 0
      ctx.currentColOffset = opts?.colOffset ?? 0
      try {
        const tokens = tokenize(source)
        const declaredNs = extractNsNameFromTokens(tokens)
        if (declaredNs) {
          runtime.ensureNamespace(declaredNs)
          currentNs = declaredNs
          runtime.syncNsVar(declaredNs)
        }
        const env = runtime.getNamespaceEnv(currentNs)!
        const aliasMap = extractAliasMapFromTokens(tokens)
        env.ns?.aliases.forEach((ns, alias) => {
          aliasMap.set(alias, ns.name)
        })
        env.ns?.readerAliases.forEach((nsName, alias) => {
          aliasMap.set(alias, nsName)
        })
        const forms = readForms(tokens, currentNs, aliasMap)
        await runtime.processNsRequiresAsync(forms, env, ctx)
        let result: CljValue = v.nil()
        for (const form of forms) {
          const expanded = ctx.expandAll(form, env)
          result = ctx.evaluate(expanded, env)
        }
        if (result.kind !== 'pending') return result
        try {
          return await result.promise
        } catch (e) {
          if (e instanceof CljThrownSignal) {
            throw new EvaluationError(
              `Unhandled throw: ${printString(e.value)}`,
              { thrownValue: e.value }
            )
          }
          throw e
        }
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
        if (e instanceof EvaluationError || e instanceof ReaderError) {
          const pos = e.pos ?? (e instanceof EvaluationError ? e.frames?.[0]?.pos : undefined)
          if (pos) {
            e.message += formatErrorContext(source, pos, {
              lineOffset: ctx.currentLineOffset,
              colOffset: ctx.currentColOffset,
            })
          }
        }
        throw e
      } finally {
        ctx.currentSource = undefined
        ctx.currentFile = undefined
        ctx.frameStack = []
      }
    },

    applyFunction(fn: CljValue, args: CljValue[]): CljValue {
      return ctx.applyCallable(fn, args, makeEnv())
    },

    cljToJs(value: CljValue): unknown {
      return _cljToJs(value, {
        applyFunction: (fn, args) => ctx.applyCallable(fn, args, makeEnv()),
      })
    },

    evaluateForms(forms: CljValue[]): CljValue {
      try {
        const env = runtime.getNamespaceEnv(currentNs)!
        let result: CljValue = v.nil()
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
      let env: Env | null = runtime.registry.get(nsName ?? currentNs) ?? null
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

  return session
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createSession(options?: SessionOptions): Session {
  const modules = options?.modules ?? []
  const libraries = options?.libraries ?? []

  // Build the registered sources map from all library sources.
  // Deduplication guard: two libraries cannot register the same namespace.
  const registeredSources = new Map<string, string>()
  const sourceOwners = new Map<string, string>()
  for (const lib of libraries) {
    for (const [nsName, source] of Object.entries(lib.sources ?? {})) {
      const existing = sourceOwners.get(nsName)
      if (existing !== undefined) {
        throw new Error(
          `Library '${lib.id}' tried to register namespace '${nsName}', already registered by '${existing}'.`
        )
      }
      registeredSources.set(nsName, source)
      sourceOwners.set(nsName, lib.id)
    }
  }

  const runtime = createRuntime({
    sourceRoots: options?.sourceRoots,
    readFile: options?.readFile,
    registeredSources: registeredSources.size > 0 ? registeredSources : undefined,
  })

  const session = buildSessionFacade(runtime, 'user', options)

  // Bootstrap: load clojure.core source (uses session's ctx via session.loadFile)
  const coreLoader = builtInNamespaceSources['clojure.core']
  if (!coreLoader) {
    throw new Error('Missing built-in clojure.core source in registry')
  }
  session.loadFile(coreLoader(), 'clojure.core')

  if (modules.length > 0) {
    session.runtime.installModules(modules)
  }

  // Install library native modules (after user modules — libraries are additive)
  const libraryModules = libraries.flatMap((lib) => (lib.module ? [lib.module] : []))
  if (libraryModules.length > 0) {
    session.runtime.installModules(libraryModules)
  }

  // Intern host bindings into the js namespace as CljJsValue vars.
  // Guard: built-in utility names (js/get, js/set!, js/call, etc.) must not be
  // clobbered — they are already installed by makeJsModule() above.
  if (options?.hostBindings) {
    const jsEnv = runtime.getNamespaceEnv('js')
    if (jsEnv) {
      for (const [name, rawValue] of Object.entries(options.hostBindings)) {
        if (jsEnv.ns?.vars.has(name)) {
          throw new Error(
            `createSession: hostBindings key '${name}' conflicts with built-in js/${name} — choose a different key`
          )
        }
        internVar(name, jsToClj(rawValue), jsEnv)
      }
    }
  }

  for (const source of options?.entries ?? []) {
    session.loadFile(source)
  }

  return session
}

/**
 * A snapshot of a session's runtime state + current namespace.
 * Produced by snapshotSession; consumed by createSessionFromSnapshot.
 * CljValue objects are shared (they are immutable); only the Env containers
 * are deep-copied so each derived session gets independent namespace state.
 */
export function snapshotSession(session: Session): SessionSnapshot {
  return {
    runtimeSnapshot: session.runtime.snapshot(),
    currentNs: session.currentNs,
    libraries: session.libraries,
  }
}

/**
 * Create a new session from a previously captured snapshot.
 * Skips the core.clj bootstrap — the cloned registry already contains the
 * fully-expanded core environment. Re-wires all registry-dependent closures
 * (resolveNs, require, IO fns) to the new registry instance.
 *
 * Libraries from the snapshot are re-applied fresh (both registeredSources and
 * native installModules), exactly as createSession does — so cloned sessions get
 * the full library setup regardless of which options the caller passes.
 */
export function createSessionFromSnapshot(
  snapshot: SessionSnapshot,
  options?: SessionOptions
): Session {
  // Merge snapshot libraries with any caller-supplied libraries (caller wins on conflict)
  const libraries = [
    ...snapshot.libraries,
    ...(options?.libraries ?? []),
  ]

  // Re-build registeredSources from the library set
  const registeredSources = new Map<string, string>()
  for (const lib of libraries) {
    for (const [nsName, source] of Object.entries(lib.sources ?? {})) {
      registeredSources.set(nsName, source)
    }
  }

  const runtime = restoreRuntime(snapshot.runtimeSnapshot, {
    sourceRoots: options?.sourceRoots,
    readFile: options?.readFile,
    registeredSources: registeredSources.size > 0 ? registeredSources : undefined,
  })

  // Re-install native library modules into the restored runtime
  const libraryModules = libraries.flatMap((lib) => (lib.module ? [lib.module] : []))
  if (libraryModules.length > 0) {
    runtime.installModules(libraryModules)
  }

  const mergedOptions: SessionOptions = { ...options, libraries }
  const session = buildSessionFacade(runtime, snapshot.currentNs, mergedOptions)
  for (const source of options?.entries ?? []) {
    session.loadFile(source)
  }
  return session
}
