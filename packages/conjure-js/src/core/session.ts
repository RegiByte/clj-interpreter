import { builtInNamespaceSources } from '../clojure/generated/builtin-namespace-registry'
import { CljThrownSignal, EvaluationError, ReaderError } from './errors'
import { createEvaluationContext, RecurSignal } from './evaluator'
import { internVar, makeEnv } from './env'
import { v } from './factories'
import { jsToClj } from './evaluator/js-interop'
import type { RuntimeModule } from './module'
import { cljToJs as _cljToJs } from './conversions'
import { formatErrorContext } from './positions'
import { printString } from './printer'
import { readForms } from './reader'
import type { Runtime, RuntimeSnapshot } from './runtime'
import {
  createRuntime,
  extractAliasMapFromTokens,
  extractNsNameFromTokens,
  restoreRuntime,
} from './runtime'
import { tokenize } from './tokenizer'
import type { CljNamespace, CljValue, Env } from './types'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

type SessionOptions = {
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
}

export type Session = {
  /** The underlying runtime — exposed for snapshot access and advanced embedding. */
  readonly runtime: Runtime
  /** Passthrough to runtime.registry. Used by nREPL and tooling for namespace lookup. */
  readonly registry: Runtime['registry']
  readonly currentNs: string
  setNs: (namespace: string) => void
  getNs: (namespace: string) => CljNamespace | null
  loadFile: (source: string, nsName?: string, filePath?: string) => string
  /** Async variant of loadFile — handles string requires ((:require ["pkg" :as X])). */
  loadFileAsync: (source: string, nsName?: string, filePath?: string) => Promise<string>
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
  ctx.io = {
    stdout: options?.output ?? ((text) => console.log(text)),
    stderr: options?.stderr ?? ((text) => console.error(text)),
  }
  ctx.importModule = options?.importModule
  ctx.setCurrentNs = (name: string) => {
    runtime.ensureNamespace(name)
    currentNs = name
    runtime.syncNsVar(name)
  }

  const session: Session = {
    get runtime() {
      return runtime
    },

    get registry() {
      return runtime.registry
    },

    get currentNs() {
      return currentNs
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

    async loadFileAsync(source: string, nsName?: string, filePath?: string): Promise<string> {
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
        if (
          (e instanceof EvaluationError || e instanceof ReaderError) &&
          e.pos
        ) {
          e.message += formatErrorContext(source, e.pos, {
            lineOffset: ctx.currentLineOffset,
            colOffset: ctx.currentColOffset,
          })
        }
        throw e
      } finally {
        ctx.currentSource = undefined
        ctx.currentFile = undefined
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
        if (
          (e instanceof EvaluationError || e instanceof ReaderError) &&
          e.pos
        ) {
          e.message += formatErrorContext(source, e.pos, {
            lineOffset: ctx.currentLineOffset,
            colOffset: ctx.currentColOffset,
          })
        }
        throw e
      } finally {
        ctx.currentSource = undefined
        ctx.currentFile = undefined
      }
    },

    applyFunction(fn: CljValue, args: CljValue[]): CljValue {
      return ctx.applyCallable(fn, args, makeEnv())
    },

    cljToJs(value: CljValue): unknown {
      return _cljToJs(value, { applyFunction: (fn, args) => ctx.applyCallable(fn, args, makeEnv()) })
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
  const runtime = createRuntime({
    sourceRoots: options?.sourceRoots,
    readFile: options?.readFile,
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
  }
}

/**
 * Create a new session from a previously captured snapshot.
 * Skips the core.clj bootstrap — the cloned registry already contains the
 * fully-expanded core environment. Re-wires all registry-dependent closures
 * (resolveNs, require, IO fns) to the new registry instance.
 */
export function createSessionFromSnapshot(
  snapshot: SessionSnapshot,
  options?: SessionOptions
): Session {
  const runtime = restoreRuntime(snapshot.runtimeSnapshot, {
    sourceRoots: options?.sourceRoots,
    readFile: options?.readFile,
  })
  const session = buildSessionFacade(runtime, snapshot.currentNs, options)
  for (const source of options?.entries ?? []) {
    session.loadFile(source)
  }
  return session
}
