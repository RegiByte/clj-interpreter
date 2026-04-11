// native.ts — cljam.integrant.native RuntimeModule.
//
// Provides:
//   config->ordered-keys*   pure topo-sort of config keys (with optional subset)
//   build-async*            async init loop → CljPending<system-map>
//   run-async*              async lifecycle loop (halt/suspend) → CljPending<nil>
//   resume-async*           async resume loop → CljPending<system-map>
//
// The native layer owns:
//   - Dependency graph construction from config ref annotations
//   - Ref/refset substitution (postwalk over config values)
//   - Sequential async await of each lifecycle step
//
// The Clojure layer owns:
//   - Public API surface (ig/init, ig/halt!, etc.)
//   - Multimethod definitions (init-key, halt-key!, etc.)
//   - Error message construction for user-facing throws

import { v, EvaluationError, printString, isEqual } from '@regibyte/cljam'
import type {
  CljValue,
  CljMap,
  RuntimeModule,
  VarMap,
  EvaluationContext,
  Env,
} from '@regibyte/cljam'
import {
  emptyGraph,
  addNode,
  depend,
  topoSort,
  transitiveDepsOf,
} from './dep'
import type { DepGraph } from './dep'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REF_KEY_NAME = ':integrant.core/ref'
const REFSET_KEY_NAME = ':integrant.core/refset'
const ORIGIN_META_NAME = ':integrant.core/origin'
const BUILD_META_NAME = ':integrant.core/build'

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface SystemEntry {
  key: CljValue
  rawValue: CljValue // result of init-key — what halt/suspend/resume need
}

// ---------------------------------------------------------------------------
// Ref detection helpers
// ---------------------------------------------------------------------------

type RefKind = 'ref' | 'refset'

function getRefInfo(
  val: CljValue
): { kind: RefKind; refKey: CljValue } | null {
  if (val.kind !== 'map') return null
  for (const [k, mapVal] of val.entries) {
    if (k.kind === 'keyword') {
      if (k.name === REF_KEY_NAME) return { kind: 'ref', refKey: mapVal }
      if (k.name === REFSET_KEY_NAME) return { kind: 'refset', refKey: mapVal }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Dep graph construction from config
// ---------------------------------------------------------------------------

function buildDepGraph(configEntries: [CljValue, CljValue][]): DepGraph {
  let g = emptyGraph()

  for (const [configKey, configVal] of configEntries) {
    g = addNode(g, configKey)

    // Walk config value to find all ref/refset dependencies
    const refKeys = collectRefKeys(configVal)
    for (const refKey of refKeys) {
      // Only add the dependency if the ref key is actually in the config.
      // Missing refs are caught at resolve time (better error message).
      try {
        g = depend(g, configKey, refKey)
      } catch (e) {
        // Re-throw circular dependency errors as-is
        throw e
      }
    }
  }

  return g
}

function collectRefKeys(val: CljValue): CljValue[] {
  const result: CljValue[] = []
  collectRefKeysInto(val, result)
  return result
}

function collectRefKeysInto(val: CljValue, acc: CljValue[]): void {
  if (val.kind === 'map') {
    const ref = getRefInfo(val)
    if (ref !== null) {
      acc.push(ref.refKey)
      return // Don't recurse into the ref map itself
    }
    for (const [, v] of val.entries) {
      collectRefKeysInto(v, acc)
    }
  } else if (val.kind === 'vector' || val.kind === 'list') {
    for (const item of val.value) {
      collectRefKeysInto(item, acc)
    }
  }
}

// ---------------------------------------------------------------------------
// Ref resolution — postwalk substitution
// ---------------------------------------------------------------------------

function resolveRefs(
  val: CljValue,
  system: Map<string, SystemEntry>,
  resolveFn: CljValue,
  ctx: EvaluationContext,
  callEnv: Env
): CljValue {
  return resolveValue(val, system, resolveFn, ctx, callEnv)
}

function resolveValue(
  val: CljValue,
  system: Map<string, SystemEntry>,
  resolveFn: CljValue,
  ctx: EvaluationContext,
  callEnv: Env
): CljValue {
  if (val.kind === 'map') {
    const refInfo = getRefInfo(val)

    if (refInfo !== null && refInfo.kind === 'ref') {
      const refKeyStr = printString(refInfo.refKey)
      const entry = system.get(refKeyStr)
      if (entry === undefined) {
        const err = new EvaluationError(
          `integrant/missing-ref: no component found for ref ${printString(refInfo.refKey)}`,
          { key: refInfo.refKey }
        )
        err.code = 'integrant/missing-ref'
        throw err
      }
      // Apply resolve-fn to get the value refs should see
      const resolved = ctx.applyCallable(
        resolveFn,
        [entry.key, entry.rawValue],
        callEnv
      )
      if (resolved.kind === 'pending') {
        // resolve-key should be synchronous; if it returns pending, unwrap it
        // synchronously is impossible. Throw a clear error.
        throw new EvaluationError(
          'integrant: resolve-key returned a pending (async) value, which is not supported',
          { key: entry.key }
        )
      }
      return resolved
    }

    if (refInfo !== null && refInfo.kind === 'refset') {
      // Collect all system entries whose key equals the refset key
      const refKeyStr = printString(refInfo.refKey)
      const matching: CljValue[] = []
      for (const [ks, entry] of system) {
        if (ks === refKeyStr) {
          const resolved = ctx.applyCallable(
            resolveFn,
            [entry.key, entry.rawValue],
            callEnv
          )
          if (resolved.kind !== 'pending') {
            matching.push(resolved)
          }
        }
      }
      return v.vector(matching)
    }

    // Regular map — recurse into values
    const newEntries: [CljValue, CljValue][] = val.entries.map(([k, mapVal]) => [
      k,
      resolveValue(mapVal, system, resolveFn, ctx, callEnv),
    ])
    const result: CljMap = { kind: 'map', entries: newEntries }
    if (val.meta) result.meta = val.meta
    return result
  }

  if (val.kind === 'vector') {
    return v.vector(
      val.value.map((item) =>
        resolveValue(item, system, resolveFn, ctx, callEnv)
      )
    )
  }

  if (val.kind === 'list') {
    return v.list(
      val.value.map((item) =>
        resolveValue(item, system, resolveFn, ctx, callEnv)
      )
    )
  }

  return val
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find the value for a key in a CljMap using structural equality. */
function mapGet(map: CljMap, key: CljValue): CljValue | null {
  const ks = printString(key)
  for (const [k, mapVal] of map.entries) {
    if (printString(k) === ks) return mapVal
  }
  return null
}

/** Convert a CljValue collection to a JS array of CljValues. nil → []. */
function cljCollToArray(val: CljValue): CljValue[] {
  if (val.kind === 'nil') return []
  if (val.kind === 'vector' || val.kind === 'list') return val.value
  throw new EvaluationError(
    `expected a collection of keys, got ${val.kind}`,
    { val }
  )
}

/** Await a CljValue if it is pending; otherwise return it directly. */
async function awaitIfPending(val: CljValue): Promise<CljValue> {
  if (val.kind === 'pending') return await val.promise
  return val
}

/** Build the system map with origin and build metadata attached. */
function buildSystemMap(
  systemEntries: [CljValue, CljValue][],
  originConfig: CljMap,
  buildEntries: [CljValue, CljValue][]
): CljMap {
  const systemMap: CljMap = {
    kind: 'map',
    entries: systemEntries,
    meta: {
      kind: 'map',
      entries: [
        [{ kind: 'keyword', name: ORIGIN_META_NAME }, originConfig],
        [
          { kind: 'keyword', name: BUILD_META_NAME },
          { kind: 'map', entries: buildEntries },
        ],
      ],
    },
  }
  return systemMap
}

// ---------------------------------------------------------------------------
// Core async loops
// ---------------------------------------------------------------------------

async function buildAsync(
  config: CljMap,
  orderedKeys: CljValue[],
  initFn: CljValue,
  assertFn: CljValue,
  resolveFn: CljValue,
  ctx: EvaluationContext,
  callEnv: Env
): Promise<CljValue> {
  const systemLookup = new Map<string, SystemEntry>()
  const systemEntries: [CljValue, CljValue][] = []
  const buildEntries: [CljValue, CljValue][] = []

  for (const key of orderedKeys) {
    const configVal = mapGet(config, key)
    if (configVal === null) continue // key not in config (defensive)

    // 1. Resolve refs using the system built so far
    const resolvedVal = resolveRefs(configVal, systemLookup, resolveFn, ctx, callEnv)

    // 2. Assert — may be a no-op (default implementation)
    const assertResult = ctx.applyCallable(assertFn, [key, resolvedVal], callEnv)
    await awaitIfPending(assertResult)

    // 3. Init — may return a Promise; always await
    let rawValue: CljValue
    try {
      const initResult = ctx.applyCallable(initFn, [key, resolvedVal], callEnv)
      rawValue = await awaitIfPending(initResult)
    } catch (e) {
      const err = new EvaluationError(
        `integrant/build-failed: error initializing ${printString(key)}: ${e instanceof Error ? e.message : String(e)}`,
        { key, cause: e }
      )
      err.code = 'integrant/build-failed'
      throw err
    }

    // 4. Store in system
    systemLookup.set(printString(key), { key, rawValue })
    systemEntries.push([key, rawValue])
    buildEntries.push([key, resolvedVal])
  }

  return buildSystemMap(systemEntries, config, buildEntries)
}

async function runAsync(
  system: CljMap,
  orderedKeys: CljValue[],
  lifecycleFn: CljValue,
  ctx: EvaluationContext,
  callEnv: Env
): Promise<CljValue> {
  for (const key of orderedKeys) {
    const systemVal = mapGet(system, key)
    if (systemVal === null) continue // key not in system

    try {
      const result = ctx.applyCallable(lifecycleFn, [key, systemVal], callEnv)
      await awaitIfPending(result)
    } catch (e) {
      const err = new EvaluationError(
        `integrant/run-failed: error during lifecycle for ${printString(key)}: ${e instanceof Error ? e.message : String(e)}`,
        { key, cause: e }
      )
      err.code = 'integrant/run-failed'
      throw err
    }
  }

  return v.nil()
}

async function resumeAsync(
  config: CljMap,
  oldSystem: CljMap,
  orderedKeys: CljValue[],
  oldBuildMap: CljMap | null,
  initFn: CljValue,
  resumeFn: CljValue,
  assertFn: CljValue,
  resolveFn: CljValue,
  ctx: EvaluationContext,
  callEnv: Env
): Promise<CljValue> {
  const systemLookup = new Map<string, SystemEntry>()
  const systemEntries: [CljValue, CljValue][] = []
  const buildEntries: [CljValue, CljValue][] = []

  for (const key of orderedKeys) {
    const configVal = mapGet(config, key)
    if (configVal === null) continue

    const resolvedVal = resolveRefs(configVal, systemLookup, resolveFn, ctx, callEnv)

    // Assert
    const assertResult = ctx.applyCallable(assertFn, [key, resolvedVal], callEnv)
    await awaitIfPending(assertResult)

    // Check if we can resume (old value exists AND config unchanged)
    const oldRawValue = mapGet(oldSystem, key)
    const oldResolvedVal = oldBuildMap ? mapGet(oldBuildMap, key) : null
    const canResume =
      oldRawValue !== null &&
      oldResolvedVal !== null &&
      isEqual(resolvedVal, oldResolvedVal)

    let rawValue: CljValue
    try {
      if (canResume) {
        // resume-key(key, new-resolved-val, old-raw-value, old-raw-value)
        const resumeResult = ctx.applyCallable(
          resumeFn,
          [key, resolvedVal, oldRawValue!, oldRawValue!],
          callEnv
        )
        rawValue = await awaitIfPending(resumeResult)
      } else {
        const initResult = ctx.applyCallable(initFn, [key, resolvedVal], callEnv)
        rawValue = await awaitIfPending(initResult)
      }
    } catch (e) {
      const err = new EvaluationError(
        `integrant/build-failed: error resuming ${printString(key)}: ${e instanceof Error ? e.message : String(e)}`,
        { key, cause: e }
      )
      err.code = 'integrant/build-failed'
      throw err
    }

    systemLookup.set(printString(key), { key, rawValue })
    systemEntries.push([key, rawValue])
    buildEntries.push([key, resolvedVal])
  }

  return buildSystemMap(systemEntries, config, buildEntries)
}

// ---------------------------------------------------------------------------
// Native function definitions
// ---------------------------------------------------------------------------

const nativeFns: Record<string, CljValue> = {
  // (config->ordered-keys* config keys-or-nil) → vector
  //
  // Computes the topological init order for a config map.
  //   keys-or-nil = nil  → all keys in config, topo-sorted
  //   keys-or-nil = coll → only those keys + their transitive deps, topo-sorted
  'config->ordered-keys*': v.nativeFnCtx(
    'cljam.integrant.native/config->ordered-keys*',
    (_ctx, _callEnv, config: CljValue, keysOrNil: CljValue) => {
      if (config.kind !== 'map') {
        throw new EvaluationError(
          `config->ordered-keys*: expected a map, got ${config.kind}`,
          { config }
        )
      }

      const g = buildDepGraph(config.entries)
      const fullOrder = topoSort(g)

      if (keysOrNil.kind === 'nil') {
        return v.vector(fullOrder)
      }

      // Filter to requested keys + their transitive deps
      const requestedKeys = cljCollToArray(keysOrNil)
      const included = transitiveDepsOf(g, requestedKeys)
      const includedSet = new Set(included.map((k) => printString(k)))

      const filtered = fullOrder.filter((k) => includedSet.has(printString(k)))
      return v.vector(filtered)
    }
  ),

  // (build-async* config ordered-keys init-fn assert-fn resolve-fn) → pending<system-map>
  //
  // The async init loop. Resolves refs, asserts, inits each key in order.
  // Returns a CljPending that resolves to the system map with ::origin and ::build metadata.
  'build-async*': v.nativeFnCtx(
    'cljam.integrant.native/build-async*',
    (
      ctx: EvaluationContext,
      callEnv: Env,
      config: CljValue,
      orderedKeys: CljValue,
      initFn: CljValue,
      assertFn: CljValue,
      resolveFn: CljValue
    ) => {
      if (config.kind !== 'map') {
        throw new EvaluationError(
          `build-async*: expected a map for config, got ${config.kind}`,
          { config }
        )
      }
      if (orderedKeys.kind !== 'vector' && orderedKeys.kind !== 'list') {
        throw new EvaluationError(
          `build-async*: expected a vector of keys, got ${orderedKeys.kind}`,
          { orderedKeys }
        )
      }

      const promise = buildAsync(
        config,
        orderedKeys.value,
        initFn,
        assertFn,
        resolveFn,
        ctx,
        callEnv
      )
      return v.pending(promise)
    }
  ),

  // (run-async* system ordered-keys lifecycle-fn) → pending<nil>
  //
  // Runs lifecycle-fn(key, system[key]) for each key in order.
  // Used for halt! (reverse order) and suspend! (reverse order).
  'run-async*': v.nativeFnCtx(
    'cljam.integrant.native/run-async*',
    (
      ctx: EvaluationContext,
      callEnv: Env,
      system: CljValue,
      orderedKeys: CljValue,
      lifecycleFn: CljValue
    ) => {
      if (system.kind !== 'map') {
        throw new EvaluationError(
          `run-async*: expected a map for system, got ${system.kind}`,
          { system }
        )
      }
      if (orderedKeys.kind !== 'vector' && orderedKeys.kind !== 'list') {
        throw new EvaluationError(
          `run-async*: expected a vector of keys, got ${orderedKeys.kind}`,
          { orderedKeys }
        )
      }

      const promise = runAsync(system, orderedKeys.value, lifecycleFn, ctx, callEnv)
      return v.pending(promise)
    }
  ),

  // (resume-async* config old-system ordered-keys old-build-or-nil
  //                init-fn resume-fn assert-fn resolve-fn) → pending<system-map>
  //
  // Resumes a system. For each key: if config unchanged AND old value exists,
  // calls resume-fn; otherwise calls init-fn.
  'resume-async*': v.nativeFnCtx(
    'cljam.integrant.native/resume-async*',
    (
      ctx: EvaluationContext,
      callEnv: Env,
      config: CljValue,
      oldSystem: CljValue,
      orderedKeys: CljValue,
      oldBuildOrNil: CljValue,
      initFn: CljValue,
      resumeFn: CljValue,
      assertFn: CljValue,
      resolveFn: CljValue
    ) => {
      if (config.kind !== 'map') {
        throw new EvaluationError(
          `resume-async*: expected a map for config, got ${config.kind}`,
          { config }
        )
      }
      if (oldSystem.kind !== 'map') {
        throw new EvaluationError(
          `resume-async*: expected a map for old-system, got ${oldSystem.kind}`,
          { oldSystem }
        )
      }
      if (orderedKeys.kind !== 'vector' && orderedKeys.kind !== 'list') {
        throw new EvaluationError(
          `resume-async*: expected a vector of keys, got ${orderedKeys.kind}`,
          { orderedKeys }
        )
      }

      const oldBuildMap =
        oldBuildOrNil.kind === 'map' ? oldBuildOrNil : null

      const promise = resumeAsync(
        config,
        oldSystem,
        orderedKeys.value,
        oldBuildMap,
        initFn,
        resumeFn,
        assertFn,
        resolveFn,
        ctx,
        callEnv
      )
      return v.pending(promise)
    }
  ),
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export function makeIntegrantNativeModule(): RuntimeModule {
  return {
    id: 'cljam-integrant/native',
    declareNs: [
      {
        name: 'cljam.integrant.native',
        vars(_ctx): VarMap {
          const map = new Map()
          for (const [name, fn] of Object.entries(nativeFns)) {
            map.set(name, { value: fn })
          }
          return map
        },
      },
    ],
  }
}
