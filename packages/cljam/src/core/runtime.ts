import { builtInNamespaceSources } from '../clojure/generated/builtin-namespace-registry'
import { is } from './assertions'
import { wireIdeStubs, wireNsCore } from './bootstrap'
import { internVar, makeEnv, makeNamespace } from './env'
import { EvaluationError } from './errors'
import { v } from './factories'
import { parseDescriptor, type NsDescriptor } from './loader/ns-descriptor'
import {
  resolveModuleOrder,
  type ModuleContext,
  type RuntimeModule,
} from './module'
import { makeCoreModule } from './modules/core'
import { makeJsModule } from './modules/js'
import { makeVmModule } from './modules/vm'
import { extractRequireClauses } from './ns-forms'
import type { NamespaceRegistry } from './registry'
import {
  applyRequireLink,
  cloneRegistry,
  ensureNamespaceInRegistry,
  processRequireSpec,
} from './registry'
import type {
  CljNamespace,
  CljValue,
  Env,
  EvaluationContext,
  VmChunk,
} from './types'

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export type { NamespaceRegistry }

export type RuntimeSnapshot = {
  registry: NamespaceRegistry
  identity: RuntimeIdentityState
  sourceLoadedNs: string[]
}

export type RuntimeIdentityState = {
  nextEvalId: number
  nextFunctionId: number
  nextChunkId: number
  nextNamespaceId: number
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
  readonly identity: RuntimeIdentityState

  // Namespace management
  allocateEvalIdentity(nsName: string): { id: number; nsName: string }
  allocateFunctionIdentity(input: {
    nsName: string
    name?: string
    evalIdentity?: { id: number; nsName: string }
  }): { id: number; evalId?: number; displayName: string }
  allocateChunkIdentity(chunk: { id?: number }): number
  getCachedTopLevelVmChunk(key: string): VmChunk | undefined
  setCachedTopLevelVmChunk(key: string, chunk: VmChunk): void
  touchNamespace(ns: CljNamespace): void
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
  /**
   * Async graph-aware file loader (Phase 1.75, S3). Unlike sync loadFile, this
   * drives the transitive Clojure dependency closure through `await` and imports
   * host modules at the loader boundary — so a syntactically-sync require whose
   * closure hides a host import (`app -> root -> dep -> ["host"]`) loads
   * correctly. Reuses the load-state model (loaded/loadingPath) for idempotency,
   * cycle detection, and deterministic failure.
   */
  loadFileAsync(
    source: string,
    nsName: string | undefined,
    filePath: string | undefined,
    ctx: EvaluationContext
  ): Promise<string>
  /**
   * Load a namespace by name through the async loader: locate its source
   * (built-ins -> registered library sources -> filesystem) and load its
   * dependency closure. Idempotent against already-executed namespaces. Returns
   * false when no source can be located (same contract as resolveNamespace).
   */
  loadNamespaceAsync(nsName: string, ctx: EvaluationContext): Promise<boolean>

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
  identity: RuntimeIdentityState,
  options: RuntimeOptions | undefined,
  initialSourceLoadedNs?: Iterable<string>
): Runtime {
  const sourceRoots = new Set<string>(options?.sourceRoots ?? [])
  const topLevelVmCache = new Map<string, VmChunk>()

  // varOwners tracks which module installed each var, keyed by "ns/varName".
  // Prevents two modules from declaring the same var in the same namespace.
  const varOwners = new Map<string, string>()

  // currentNsRef mirrors the owning session's currentNs for require/resolve.
  // Updated via runtime.syncNsVar() which session.setNs calls.
  let currentNsRef = 'user'

  // Load-state model. Two DISTINCT
  // structures — conflating them is the cycle-detection bug:
  //   - loaded: terminal states per namespace. 'executed' = its .clj source ran
  //     to completion; 'failed' = its load threw. Replaces the old sourceLoadedNs
  //     Set (which only ever meant 'executed'). resolveNamespace is idempotent
  //     against 'executed'; a 'failed' entry is cleared so a retry re-runs.
  //   - loadingPath: the in-flight dependency stack. A namespace is `loading`
  //     iff it is on this stack. A require for a namespace already on the stack
  //     is a circular dependency (G11) — diagnosed by loadFile, not deadlocked.
  // A namespace absent from both is `unloaded`.
  const loaded = new Map<string, 'executed' | 'failed'>()
  for (const nsName of initialSourceLoadedNs ?? [])
    loaded.set(nsName, 'executed')
  const loadingPath: string[] = []

  // locateNamespaceSource: resolve a namespace name to its source text using the
  // fixed lookup priority (built-ins -> registered library sources -> filesystem
  // via sourceRoots). Shared by the SYNC resolveNamespace and the ASYNC
  // loadNamespaceAsync so the priority list has exactly one implementation.
  //
  // `nsHint` is the namespace name to pass through to the loader as a fallback.
  // For built-ins/registered sources it is the registry key (the source's own ns
  // form still wins if present). For filesystem sources it is undefined — the
  // file's authored ns form is authoritative there, matching the prior behavior.
  //
  // The try/catch scopes ONLY the readFile probe — "is this namespace's source
  // in this root?". A miss continues to the next root. The actual load runs at
  // the CALL SITE, outside this catch, so a real load error (e.g. a circular
  // dependency) propagates instead of being swallowed and mistaken for "not
  // found".
  function locateNamespaceSource(
    nsName: string
  ): { source: string; nsHint: string | undefined } | undefined {
    const builtInLoader = builtInNamespaceSources[nsName]
    if (builtInLoader) return { source: builtInLoader(), nsHint: nsName }

    const registeredSource = options?.registeredSources?.get(nsName)
    if (registeredSource !== undefined)
      return { source: registeredSource, nsHint: nsName }

    if (!options?.readFile || sourceRoots.size === 0) return undefined
    for (const root of sourceRoots) {
      const filePath = `${root.replace(/\/$/, '')}/${nsName.replace(/\./g, '/')}.clj`
      let source: string | undefined
      try {
        source = options.readFile(filePath)
      } catch {
        continue
      }
      if (source) return { source, nsHint: undefined }
    }
    return undefined
  }

  // graphNeedsAsync: pure pre-walk of the transitive dependency closure for a
  // descriptor. Returns true if any reachable, not-yet-executed namespace has
  // host (string) requires — meaning a sync load would need async host imports.
  // Skips already-executed namespaces (resolveNamespace would skip them too).
  // The visited set breaks cycles so the walk terminates on any graph shape.
  // Parse errors in dep sources are silently skipped: let the actual load fail.
  function graphNeedsAsync(
    descriptor: NsDescriptor,
    visited: Set<string>
  ): boolean {
    if (visited.has(descriptor.nsName)) return false
    visited.add(descriptor.nsName)

    if (descriptor.hostRequires.length > 0) return true

    for (const req of descriptor.cljRequires) {
      if (loaded.get(req.nsName) === 'executed') continue
      const located = locateNamespaceSource(req.nsName)
      if (!located) continue
      let dep: NsDescriptor
      try {
        dep = parseDescriptor(located.source, located.nsHint, undefined)
      } catch {
        continue
      }
      if (graphNeedsAsync(dep, visited)) return true
    }
    return false
  }

  // resolveNamespace: loads a namespace's .clj source if it hasn't been loaded
  // yet. Idempotent — returns true immediately if already source-loaded.
  // ctx is passed explicitly — this is the active EvaluationContext at the
  // call site. For loadFile calls, it's the file's ctx. For runtime require
  // native fn calls, it comes from the evaluator via cljNativeFunctionWithContext.
  function resolveNamespace(nsName: string, ctx: EvaluationContext): boolean {
    if (loaded.get(nsName) === 'executed') return true
    // A prior load failed: clear the terminal state so this attempt re-runs
    // deterministically rather than replaying a stale error.
    if (loaded.get(nsName) === 'failed') loaded.delete(nsName)
    const located = locateNamespaceSource(nsName)
    if (!located) return false
    runtime.loadFile(located.source, located.nsHint, undefined, ctx)
    return true
  }

  // loadNamespaceAsync: the ASYNC sibling of resolveNamespace. Locates a
  // namespace's source and loads its dependency closure through the async loader,
  // so transitive host imports are awaited at every level (G2). Idempotent
  // against already-executed namespaces; clears a prior `failed` so a retry
  // re-runs deterministically (G12).
  async function loadNamespaceAsyncImpl(
    nsName: string,
    ctx: EvaluationContext
  ): Promise<boolean> {
    if (loaded.get(nsName) === 'executed') return true
    if (loaded.get(nsName) === 'failed') loaded.delete(nsName)
    const located = locateNamespaceSource(nsName)
    if (!located) return false
    await loadFileAsyncImpl(located.source, located.nsHint, undefined, ctx)
    return true
  }

  // importAndBindHostRequire: import a host (JS/npm) module declared as a string
  // require spec (`["specifier" :as Alias]`) and bind it as a CljJsValue var in
  // fromEnv. Extracted verbatim from processNsRequiresAsync so the async file
  // loader and the REPL eval path share ONE implementation of the host-import
  // validation and binding (G8 — identical error messages, no drift).
  async function importAndBindHostRequire(
    spec: CljValue,
    fromEnv: Env,
    ctx: EvaluationContext
  ): Promise<void> {
    if (!is.vector(spec) || !is.string(spec.value[0])) return
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
    const existing = fromEnv.ns?.vars.get(aliasName)
    internVar(aliasName, v.jsValue(rawModule), fromEnv)
    if (fromEnv.ns && existing !== fromEnv.ns.vars.get(aliasName)) {
      runtime.touchNamespace(fromEnv.ns)
    } else if (fromEnv.ns && existing !== undefined) {
      runtime.touchNamespace(fromEnv.ns)
    }
  }

  // loadFileAsyncImpl: the async file loader. Parses the descriptor, then loads
  // the dependency closure in dependency order — clj requires first (recursively
  // async), then host imports — BEFORE wiring links (the S2 applyRequireLink
  // seam, which now assumes residency) and executing the body synchronously.
  // The body is descriptor.bodyForms: the `ns` form is excluded (its only
  // runtime effect, docstring capture, is replicated below), so it never reaches
  // the no-op evaluateNs.
  async function loadFileAsyncImpl(
    source: string,
    nsHint: string | undefined,
    filePath: string | undefined,
    ctx: EvaluationContext
  ): Promise<string> {
    const descriptor = parseDescriptor(source, nsHint, filePath)
    const targetNs = descriptor.nsName

    // G11: a require for a namespace already on the in-flight dependency stack is
    // a circular dependency. Diagnosed here, before touching load state, so it
    // surfaces with the full cycle path rooted at the entry namespace.
    if (loadingPath.includes(targetNs)) {
      const cyclePath = [...loadingPath, targetNs]
      const err = new EvaluationError(
        `Circular namespace dependency: ${cyclePath.join(' -> ')}`,
        { cyclePath }
      )
      err.code = 'namespace/circular-dependency'
      err.data = { cyclePath }
      throw err
    }

    const env = runtime.ensureNamespace(targetNs)

    // Save/restore the ctx source fields around the whole load: nested dep loads
    // set and restore these too, so after the require closure is loaded ctx is
    // back to THIS file's source for body-form error positions.
    const prevSource = ctx.currentSource
    const prevFile = ctx.currentFile
    const prevLineOffset = ctx.currentLineOffset
    const prevColOffset = ctx.currentColOffset

    loadingPath.push(targetNs)
    ctx.currentSource = source
    ctx.currentFile = filePath
    ctx.currentLineOffset = 0
    ctx.currentColOffset = 0
    try {
      for (const req of descriptor.cljRequires) {
        await loadNamespaceAsyncImpl(req.nsName, ctx)
      }
      for (const host of descriptor.hostRequires) {
        await importAndBindHostRequire(host.spec, env, ctx)
      }
      // Links are wired AFTER the closure is resident — applyRequireLink (S2) has
      // no load path; it asserts residency and throws namespace/not-found if a
      // dependency is missing.
      for (const req of descriptor.cljRequires) {
        const changed = applyRequireLink(
          req.spec,
          env,
          registry,
          ctx.allowedPackages,
          isLibraryNamespace
        )
        if (changed && env.ns) runtime.touchNamespace(env.ns)
      }
      // :as-alias reader aliases are recorded too (G4). They are not in
      // cljRequires (they never load), so install them from the descriptor.
      for (const readerAlias of descriptor.readerAliases) {
        if (
          env.ns &&
          env.ns.readerAliases.get(readerAlias.alias) !== readerAlias.nsName
        ) {
          env.ns.readerAliases.set(readerAlias.alias, readerAlias.nsName)
          runtime.touchNamespace(env.ns)
        }
      }
      // Docstring capture — the body excludes the ns form, so replicate the one
      // runtime effect evaluateNs had.
      if (descriptor.doc && env.ns) env.ns.doc = descriptor.doc

      for (const form of descriptor.bodyForms) {
        const evalIdentity = ctx.allocateEvalIdentity?.(targetNs)
        ctx.currentEvalIdentity = evalIdentity
        try {
          const expanded = ctx.expandAll(form, env)
          ctx.evaluate(expanded, env)
        } finally {
          ctx.currentEvalIdentity = undefined
        }
      }
      loaded.set(targetNs, 'executed')
    } catch (e) {
      loaded.set(targetNs, 'failed')
      throw e
    } finally {
      loadingPath.pop()
      ctx.currentSource = prevSource
      ctx.currentFile = prevFile
      ctx.currentLineOffset = prevLineOffset
      ctx.currentColOffset = prevColOffset
    }
    return targetNs
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

  function assignNamespaceIdentity(ns: CljNamespace): void {
    if (ns.id === undefined) ns.id = identity.nextNamespaceId++
    if (ns.version === undefined) ns.version = 0
  }

  for (const env of registry.values()) {
    if (env.ns) assignNamespaceIdentity(env.ns)
  }

  function ensureRuntimeNamespace(name: string): Env {
    const env = ensureNamespaceInRegistry(registry, coreEnv, name)
    if (env.ns) assignNamespaceIdentity(env.ns)
    return env
  }

  const runtime: Runtime = {
    get registry() {
      return registry
    },

    get identity() {
      return identity
    },

    allocateEvalIdentity(nsName: string) {
      return { id: identity.nextEvalId++, nsName }
    },

    allocateFunctionIdentity(input: {
      nsName: string
      name?: string
      evalIdentity?: { id: number; nsName: string }
    }) {
      const id = identity.nextFunctionId++
      const displayName =
        input.name !== undefined
          ? `${input.nsName}/${input.name}--${id}`
          : input.evalIdentity !== undefined
            ? `${input.nsName}/eval${input.evalIdentity.id}/fn--${id}`
            : `${input.nsName}/fn--${id}`
      return {
        id,
        ...(input.evalIdentity !== undefined
          ? { evalId: input.evalIdentity.id }
          : {}),
        displayName,
      }
    },

    allocateChunkIdentity(chunk: { id?: number }) {
      if (chunk.id === undefined) chunk.id = identity.nextChunkId++
      return chunk.id
    },

    getCachedTopLevelVmChunk(key: string): VmChunk | undefined {
      return topLevelVmCache.get(key)
    },

    setCachedTopLevelVmChunk(key: string, chunk: VmChunk): void {
      topLevelVmCache.set(key, chunk)
    },

    touchNamespace(ns: CljNamespace): void {
      ns.version += 1
    },

    ensureNamespace(name: string): Env {
      return ensureRuntimeNamespace(name)
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
      const changed = processRequireSpec(
        spec,
        fromEnv,
        registry,
        (nsName) => resolveNamespace(nsName, ctx),
        ctx.allowedPackages,
        isLibraryNamespace
      )
      if (changed && fromEnv.ns) runtime.touchNamespace(fromEnv.ns)
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
          const changed = processRequireSpec(
            spec,
            fromEnv,
            registry,
            (nsName) => resolveNamespace(nsName, ctx),
            ctx.allowedPackages,
            isLibraryNamespace
          )
          if (changed && fromEnv.ns) runtime.touchNamespace(fromEnv.ns)
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
            // String module require — import the host module and bind it as a var.
            // Shared with the async file loader (importAndBindHostRequire).
            await importAndBindHostRequire(spec, fromEnv, ctx)
          } else {
            // Symbol require spec: route loading through the async graph loader
            // so a transitive host dependency awaits instead of dropping to sync resolveNamespace.
            // loadFile -> graphNeedsAsync -> require-async. Mirrors loadFileAsyncImpl's
            // clj require handling: async-load the target, then link. An :as-alias spec
            // names a (possibly not-yet resident) ns purely as a reader alias. It must not be loaded.
            if (
              is.vector(spec) &&
              spec.value.length > 0 &&
              is.symbol(spec.value[0])
            ) {
              const hasAsAlias = spec.value.some(
                (val) => is.keyword(val) && val.name === ':as-alias'
              )
              if (!hasAsAlias) {
                await loadNamespaceAsyncImpl(spec.value[0].name, ctx)
              }
            }
            const changed = applyRequireLink(
              spec,
              fromEnv,
              registry,
              ctx.allowedPackages,
              isLibraryNamespace
            )
            if (changed && fromEnv.ns) runtime.touchNamespace(fromEnv.ns)
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
      // G1: reject more than one top-level ns form (namespace/multiple-ns-forms).
      // The check lives only in the descriptor parser — one implementation.
      const descriptor = parseDescriptor(source, nsName, filePath)
      const targetNs = descriptor.nsName

      // G2: fail-fast if the transitive dependency closure needs host imports.
      // Pre-walk runs before any state mutation (no loadingPath.push, no
      // ensureNamespace) so a rejected call leaves the registry untouched.
      if (graphNeedsAsync(descriptor, new Set())) {
        const err = new EvaluationError(
          'Namespace graph requires async loading; use loadFileAsync()',
          {}
        )
        err.code = 'namespace/requires-async'
        throw err
      }

      // G11: a require for a namespace already on the in-flight dependency stack
      // is a circular dependency. Diagnose it here, BEFORE touching load state,
      // so it surfaces as a clear cycle error instead of the old partial-load
      // "symbol not found" (which happened because the ns was marked loaded
      // before its requires were processed).
      if (loadingPath.includes(targetNs)) {
        const cyclePath = [...loadingPath, targetNs]
        const err = new EvaluationError(
          `Circular namespace dependency: ${cyclePath.join(' -> ')}`,
          { cyclePath }
        )
        err.code = 'namespace/circular-dependency'
        err.data = { cyclePath }
        throw err
      }

      const env = this.ensureNamespace(targetNs)
      const prevSource = ctx.currentSource
      const prevFile = ctx.currentFile
      const prevLineOffset = ctx.currentLineOffset
      const prevColOffset = ctx.currentColOffset

      // Mark `loading` (push the path) before processing requires so a back-edge
      // in the dependency graph is caught as a cycle. Mark `executed` only after
      // the body runs; on any failure mark `failed` so retries are deterministic
      // (resolveNamespace clears `failed` and re-runs).
      loadingPath.push(targetNs)

      ctx.currentSource = source
      ctx.currentFile = filePath
      ctx.currentLineOffset = 0
      ctx.currentColOffset = 0

      try {
        // Load the closure first (sync - graphNeedsAsync checks)
        for (const req of descriptor.cljRequires) {
          resolveNamespace(req.nsName, ctx)
        }
        for (const req of descriptor.cljRequires) {
          const changed = applyRequireLink(
            req.spec,
            env,
            registry,
            ctx.allowedPackages,
            isLibraryNamespace
          )
          if (changed && env.ns) runtime.touchNamespace(env.ns)
        }

        // :as-alias reader aliases are recorded too (G4). They are not in
        // cljRequires (they never load), so install them from the descriptor.
        for (const readerAlias of descriptor.readerAliases) {
          if (
            env.ns &&
            env.ns.readerAliases.get(readerAlias.alias) !== readerAlias.nsName
          ) {
            env.ns.readerAliases.set(readerAlias.alias, readerAlias.nsName)
            runtime.touchNamespace(env.ns)
          }
        }
        // Docstring capture - body excludes the ns form, so replicat evaluateNs's runtime effect.
        if (descriptor.doc && env.ns) env.ns.doc = descriptor.doc

        for (const form of descriptor.bodyForms) {
          const evalIdentity = ctx.allocateEvalIdentity?.(targetNs)
          ctx.currentEvalIdentity = evalIdentity
          try {
            const expanded = ctx.expandAll(form, env)
            ctx.evaluate(expanded, env)
          } finally {
            ctx.currentEvalIdentity = undefined
          }
        }
        loaded.set(targetNs, 'executed')
      } catch (e) {
        loaded.set(targetNs, 'failed')
        throw e
      } finally {
        loadingPath.pop()
        ctx.currentSource = prevSource
        ctx.currentFile = prevFile
        ctx.currentLineOffset = prevLineOffset
        ctx.currentColOffset = prevColOffset
      }
      return targetNs
    },

    loadFileAsync(
      source: string,
      nsName: string | undefined,
      filePath: string | undefined,
      ctx: EvaluationContext
    ): Promise<string> {
      return loadFileAsyncImpl(source, nsName, filePath, ctx)
    },

    loadNamespaceAsync(
      nsName: string,
      ctx: EvaluationContext
    ): Promise<boolean> {
      return loadNamespaceAsyncImpl(nsName, ctx)
    },

    installModules(modules: RuntimeModule[]): void {
      const ordered = resolveModuleOrder(modules, new Set(registry.keys()))

      for (const mod of ordered) {
        for (const decl of mod.declareNs) {
          const nsEnv = ensureRuntimeNamespace(decl.name)

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
      return {
        registry: cloneRegistry(registry),
        identity: { ...identity },
        // Snapshot seam: RuntimeSnapshot still carries the string[] of
        // source-loaded namespaces. Derive it from the terminal 'executed'
        // states — an in-flight `loading` ns is never serialized (loads do not
        // pause across snapshots), and a `failed` ns is not loaded.
        sourceLoadedNs: [...loaded]
          .filter(([, state]) => state === 'executed')
          .map(([nsName]) => nsName),
      }
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
  const identity: RuntimeIdentityState = {
    nextEvalId: 1,
    nextFunctionId: 1,
    nextChunkId: 1,
    nextNamespaceId: 1,
  }

  // Bootstrap: clojure.core env
  const coreEnv = makeEnv()
  coreEnv.ns = makeNamespace('clojure.core')
  registry.set('clojure.core', coreEnv)

  // Bootstrap: user env (outer = coreEnv for implicit core access)
  const userEnv = makeEnv(coreEnv)
  userEnv.ns = makeNamespace('user')
  registry.set('user', userEnv)

  const runtime = buildRuntime(registry, coreEnv, identity, options)
  runtime.installModules([makeCoreModule(), makeJsModule(), makeVmModule()])
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
  const runtime = buildRuntime(
    registry,
    coreEnv,
    { ...snapshot.identity },
    options,
    snapshot.sourceLoadedNs ?? []
  )
  // No module reinstallation needed — IO functions (println, print, etc.) read
  // ctx.io.stdout at call time, so the snapshot's native functions automatically
  // use the session's output channel without any rewiring.
  return runtime
}
