import { CljThrownSignal, EvaluationError, ReaderError } from './errors'
import { createEvaluationContext, RecurSignal } from './evaluator'
import { printString } from './printer'
import { readForms } from './reader'
import { tokenize } from './tokenizer'
import {
  createRuntime,
  extractAliasMapFromTokens,
  extractNsNameFromTokens,
  restoreRuntime,
} from './runtime'
import type { Runtime, RuntimeSnapshot } from './runtime'
import { formatErrorContext } from './positions'
import { cljNil } from './factories'
import type { CljNamespace, CljValue, Env } from './types'
import { builtInNamespaceSources } from '../clojure/generated/builtin-namespace-registry'

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
  evaluate: (
    source: string,
    opts?: { lineOffset?: number; colOffset?: number; file?: string }
  ) => CljValue
  evaluateAsync: (
    source: string,
    opts?: { lineOffset?: number; colOffset?: number; file?: string }
  ) => Promise<CljValue>
  evaluateForms: (forms: CljValue[]) => CljValue
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
      const result = session.evaluate(source, opts)
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
    },

    evaluateForms(forms: CljValue[]): CljValue {
      try {
        const env = runtime.getNamespaceEnv(currentNs)!
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
