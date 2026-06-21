import { is } from './assertions'
import { makeEnv, makeNamespace } from './env'
import { EvaluationError } from './errors'
import type {
  Arity,
  CljAtom,
  CljFunction,
  CljLazySeq,
  CljMacro,
  CljMap,
  CljMultiMethod,
  CljNamespace,
  CljProtocol,
  CljValue,
  CljVar,
  Env,
  VmChunk,
  VmFunctionClosure,
  VmFunctionTemplate,
  VmUpvalue,
} from './types'
import { v } from './factories'
import { vectorToArray } from './persistent/vector-helpers'

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

type CloneContext = {
  envs: Map<Env, Env>
  namespaces: Map<CljNamespace, CljNamespace>
  vars: Map<CljVar, CljVar>
  values: Map<object, CljValue>
  chunks: Map<VmChunk, VmChunk>
  upvalues: Map<VmUpvalue, VmUpvalue>
}

function makeCloneContext(): CloneContext {
  return {
    envs: new Map(),
    namespaces: new Map(),
    vars: new Map(),
    values: new Map(),
    chunks: new Map(),
    upvalues: new Map(),
  }
}

function cloneEnv(env: Env, ctx: CloneContext): Env {
  if (ctx.envs.has(env)) return ctx.envs.get(env)!
  const cloned: Env = {
    bindings: new Map(),
    outer: null,
  }
  ctx.envs.set(env, cloned)
  if (env.outer) cloned.outer = cloneEnv(env.outer, ctx)
  if (env.ns) cloned.ns = cloneNamespace(env.ns, ctx)
  for (const [name, value] of env.bindings) {
    cloned.bindings.set(name, cloneValue(value, ctx))
  }
  return cloned
}

function cloneNamespace(ns: CljNamespace, ctx: CloneContext): CljNamespace {
  const existing = ctx.namespaces.get(ns)
  if (existing) return existing
  const cloned = v.namespace(ns.name)
  cloned.id = ns.id
  cloned.version = ns.version
  cloned.doc = ns.doc
  cloned.readerAliases = new Map(ns.readerAliases)
  cloned.aliases = new Map()
  cloned.vars = new Map()
  ctx.namespaces.set(ns, cloned)
  for (const [name, theVar] of ns.vars) {
    cloned.vars.set(name, cloneVar(theVar, ctx))
  }
  for (const [alias, target] of ns.aliases) {
    cloned.aliases.set(alias, cloneNamespace(target, ctx))
  }
  return cloned
}

function cloneVar(theVar: CljVar, ctx: CloneContext): CljVar {
  const existing = ctx.vars.get(theVar)
  if (existing) return existing
  const cloned: CljVar = {
    kind: 'var',
    ns: theVar.ns,
    name: theVar.name,
    value: v.nil(),
    dynamic: theVar.dynamic,
  }
  ctx.vars.set(theVar, cloned)
  cloned.value = cloneValue(theVar.value, ctx)
  if (theVar.bindingStack) {
    cloned.bindingStack = theVar.bindingStack.map((value) =>
      cloneValue(value, ctx)
    )
  }
  if (theVar.meta) cloned.meta = cloneValue(theVar.meta, ctx) as CljMap
  return cloned
}

function cloneArity(arity: Arity, ctx: CloneContext): Arity {
  return {
    params: arity.params.map((param) => cloneValue(param, ctx) as typeof param),
    restParam: arity.restParam
      ? (cloneValue(arity.restParam, ctx) as typeof arity.restParam)
      : null,
    body: arity.body.map((form) => cloneValue(form, ctx)),
    ...(arity.bytecodeBody
      ? { bytecodeBody: cloneVmChunk(arity.bytecodeBody, ctx) }
      : {}),
    ...(arity.vmClosure
      ? { vmClosure: cloneVmFunctionClosure(arity.vmClosure, ctx) }
      : {}),
  }
}

function cloneVmFunctionClosure(
  closure: VmFunctionClosure,
  ctx: CloneContext
): VmFunctionClosure {
  return {
    env: cloneEnv(closure.env, ctx),
    upvalues: closure.upvalues.map((upvalue) => cloneVmUpvalue(upvalue, ctx)),
    name: closure.name,
  }
}

function cloneVmUpvalue(upvalue: VmUpvalue, ctx: CloneContext): VmUpvalue {
  const existing = ctx.upvalues.get(upvalue)
  if (existing) return existing
  const cloned: VmUpvalue = { frame: null, slot: upvalue.slot, closedValue: null }
  ctx.upvalues.set(upvalue, cloned)
  const value =
    upvalue.frame !== null
      ? (upvalue.frame.locals[upvalue.slot] ?? v.nil())
      : (upvalue.closedValue ?? v.nil())
  cloned.closedValue = cloneValue(value, ctx)
  return cloned
}

function cloneVmFunctionTemplate(
  template: VmFunctionTemplate,
  ctx: CloneContext
): VmFunctionTemplate {
  return {
    arities: template.arities.map((arity) => ({
      params: arity.params.map((param) => cloneValue(param, ctx) as typeof param),
      restParam: arity.restParam
        ? (cloneValue(arity.restParam, ctx) as typeof arity.restParam)
        : null,
      body: arity.body.map((form) => cloneValue(form, ctx)),
      chunk: cloneVmChunk(arity.chunk, ctx),
    })),
    upvalueDescriptors: template.upvalueDescriptors.map((descriptor) => ({
      ...descriptor,
    })),
    name: template.name,
    ...(template.meta ? { meta: cloneValue(template.meta, ctx) as CljMap } : {}),
  }
}

function cloneVmChunk(chunk: VmChunk, ctx: CloneContext): VmChunk {
  const existing = ctx.chunks.get(chunk)
  if (existing) return existing
  const cloned: VmChunk = {
    id: chunk.id,
    code: [...chunk.code],
    constants: [],
    globalVarCache: [],
    positions: [...chunk.positions],
    callArgPositions: chunk.callArgPositions.map((positions) =>
      positions ? [...positions] : undefined
    ),
    name: chunk.name,
    maxStack: chunk.maxStack,
    localCount: chunk.localCount,
    innerFunctions: [],
    catchTables: [],
    lexicalVarLookups: [],
    selfSlot: chunk.selfSlot,
  }
  ctx.chunks.set(chunk, cloned)
  cloned.constants = chunk.constants.map((constant) => cloneValue(constant, ctx))
  cloned.globalVarCache = chunk.globalVarCache.map((entry) =>
    entry
      ? {
          ns: cloneNamespace(entry.ns, ctx),
          var: cloneVar(entry.var, ctx),
        }
      : undefined
  )
  cloned.innerFunctions = chunk.innerFunctions.map((template) =>
    cloneVmFunctionTemplate(template, ctx)
  )
  cloned.catchTables = chunk.catchTables.map((table) => ({
    clauses: table.clauses.map((clause) => ({
      ...clause,
      discriminator: cloneValue(clause.discriminator, ctx),
    })),
  }))
  cloned.lexicalVarLookups = chunk.lexicalVarLookups.map((lookup) => ({
    symbol: cloneValue(lookup.symbol, ctx) as typeof lookup.symbol,
    candidates: lookup.candidates.map((candidate) => ({ ...candidate })),
  }))
  return cloned
}

function cloneObjectValue<T extends CljValue>(
  value: T,
  ctx: CloneContext,
  clone: () => T
): T {
  const existing = ctx.values.get(value as object)
  if (existing) return existing as T
  const cloned = clone()
  ctx.values.set(value as object, cloned)
  return cloned
}

function cloneValue(value: CljValue, ctx: CloneContext): CljValue {
  if (!value || typeof value !== 'object') return value
  const existing = ctx.values.get(value as object)
  if (existing) return existing

  switch (value.kind) {
    case 'number':
    case 'string':
    case 'character':
    case 'boolean':
    case 'keyword':
    case 'nil':
    case 'regex':
    case 'native-function':
    case 'js-value':
    case 'pending':
      return value
    case 'symbol':
      return cloneObjectValue(value, ctx, () => ({
        ...value,
        ...(value.meta ? { meta: cloneValue(value.meta, ctx) as CljMap } : {}),
      }))
    case 'list':
      return cloneObjectValue(value, ctx, () => ({
        ...value,
        value: value.value.map((item) => cloneValue(item, ctx)),
        ...(value.meta ? { meta: cloneValue(value.meta, ctx) as CljMap } : {}),
      }))
    case 'vector': {
      // Rebuild via the factory (NOT object-spread) so the `value` prototype
      // getter survives — spreading would strip it. Mirrors the map case below.
      // Elements are deep-cloned for session-V1 isolation, so we materialize and
      // map rather than reference-sharing the (immutable) trie nodes.
      const cloned = v.vector(
        vectorToArray(value).map((item) => cloneValue(item, ctx))
      )
      if (value.meta) cloned.meta = cloneValue(value.meta, ctx) as CljMap
      if (value.__cljamMapEntry) cloned.__cljamMapEntry = true
      ctx.values.set(value, cloned)
      return cloned
    }
    case 'map': {
      const cloned = v.map(
        value.entries.map(([k, v]) => [cloneValue(k, ctx), cloneValue(v, ctx)])
      )
      if (value.meta) cloned.meta = cloneValue(value.meta, ctx) as CljMap
      ctx.values.set(value, cloned)
      return cloned
    }
    case 'set': {
      const cloned = v.set(value._map.entries.map(([item]) => cloneValue(item, ctx)))
      if (value.meta) cloned.meta = cloneValue(value.meta, ctx) as CljMap
      ctx.values.set(value, cloned)
      return cloned
    }
    case 'namespace':
      return cloneNamespace(value, ctx)
    case 'var':
      return cloneVar(value, ctx)
    case 'function': {
      const cloned: CljFunction = { ...value, arities: [], env: makeEnv() }
      ctx.values.set(value, cloned)
      cloned.env = cloneEnv(value.env, ctx)
      cloned.arities = value.arities.map((arity) => cloneArity(arity, ctx))
      if (value.meta) cloned.meta = cloneValue(value.meta, ctx) as CljMap
      return cloned
    }
    case 'macro': {
      const cloned: CljMacro = { ...value, arities: [], env: makeEnv() }
      ctx.values.set(value, cloned)
      cloned.env = cloneEnv(value.env, ctx)
      cloned.arities = value.arities.map((arity) => cloneArity(arity, ctx))
      if (value.meta) cloned.meta = cloneValue(value.meta, ctx) as CljMap
      return cloned
    }
    case 'atom': {
      const cloned: CljAtom = { kind: 'atom', value: v.nil() }
      ctx.values.set(value, cloned)
      cloned.value = cloneValue(value.value, ctx)
      if (value.meta) cloned.meta = cloneValue(value.meta, ctx) as CljMap
      if (value.validator) cloned.validator = cloneValue(value.validator, ctx)
      if (value.watches) {
        cloned.watches = new Map(
          [...value.watches].map(([k, watch]) => [
            k,
            {
              key: cloneValue(watch.key, ctx),
              fn: cloneValue(watch.fn, ctx),
              callEnv: cloneEnv(watch.callEnv, ctx),
            },
          ])
        )
      }
      return cloned
    }
    case 'volatile':
      return cloneObjectValue(value, ctx, () => ({
        kind: 'volatile',
        value: cloneValue(value.value, ctx),
      }))
    case 'reduced':
      return cloneObjectValue(value, ctx, () => ({
        kind: 'reduced',
        value: cloneValue(value.value, ctx),
      }))
    case 'delay': {
      const cloned = {
        kind: 'delay' as const,
        thunk: value.thunk,
        realized: value.realized,
        value: value.value ? cloneValue(value.value, ctx) : undefined,
        thunkFn: value.thunkFn ? cloneValue(value.thunkFn, ctx) : undefined,
        callEnv: value.callEnv ? cloneEnv(value.callEnv, ctx) : undefined,
      }
      ctx.values.set(value, cloned)
      return cloned
    }
    case 'lazy-seq': {
      const cloned: CljLazySeq = {
        kind: 'lazy-seq',
        thunk: value.thunk,
        realized: value.realized,
        value: value.value ? cloneValue(value.value, ctx) : undefined,
        thunkFn: value.thunkFn ? cloneValue(value.thunkFn, ctx) : undefined,
        callEnv: value.callEnv ? cloneEnv(value.callEnv, ctx) : undefined,
      }
      ctx.values.set(value, cloned)
      return cloned
    }
    case 'cons':
      return cloneObjectValue(value, ctx, () => ({
        ...value,
        head: cloneValue(value.head, ctx),
        tail: cloneValue(value.tail, ctx),
        ...(value.meta ? { meta: cloneValue(value.meta, ctx) as CljMap } : {}),
      }))
    case 'multi-method': {
      const cloned: CljMultiMethod = {
        kind: 'multi-method',
        name: value.name,
        dispatchFn: value.dispatchFn,
        methods: [],
      }
      ctx.values.set(value, cloned)
      cloned.dispatchFn = cloneValue(value.dispatchFn, ctx) as CljMultiMethod['dispatchFn']
      cloned.methods = value.methods.map((method) => ({
        dispatchVal: cloneValue(method.dispatchVal, ctx),
        fn: cloneValue(method.fn, ctx) as typeof method.fn,
      }))
      if (value.defaultMethod) {
        cloned.defaultMethod = cloneValue(value.defaultMethod, ctx) as typeof value.defaultMethod
      }
      if (value.defaultDispatchVal) {
        cloned.defaultDispatchVal = cloneValue(value.defaultDispatchVal, ctx)
      }
      return cloned
    }
    case 'protocol': {
      const cloned: CljProtocol = {
        kind: 'protocol',
        name: value.name,
        ns: value.ns,
        fns: value.fns.map((fn) => ({ ...fn, arglists: fn.arglists.map((a) => [...a]) })),
        doc: value.doc,
        impls: new Map(),
        ...(value.meta ? { meta: cloneValue(value.meta, ctx) as CljMap } : {}),
      }
      ctx.values.set(value, cloned)
      for (const [typeTag, impls] of value.impls) {
        const clonedImpls: Record<string, typeof impls[string]> = {}
        for (const [name, fn] of Object.entries(impls)) {
          clonedImpls[name] = cloneValue(fn, ctx) as typeof fn
        }
        cloned.impls.set(typeTag, clonedImpls)
      }
      return cloned
    }
    case 'record':
      return cloneObjectValue(value, ctx, () => ({
        ...value,
        fields: value.fields.map(([k, v]) => [cloneValue(k, ctx), cloneValue(v, ctx)]),
        ...(value.meta ? { meta: cloneValue(value.meta, ctx) as CljMap } : {}),
      }))
  }
}

export function cloneRegistry(registry: NamespaceRegistry): NamespaceRegistry {
  const ctx = makeCloneContext()
  const next = new Map<string, Env>()
  for (const [name, env] of registry) {
    next.set(name, cloneEnv(env, ctx))
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
// assertNamespaceAllowed — the allowedPackages gate. Extracted so both the load
// path (processRequireSpec, gating BEFORE a load runs code) and the link path
// (applyRequireLink) share ONE implementation of the access-denied message.
// ---------------------------------------------------------------------------

function assertNamespaceAllowed(
  nsName: string,
  allowedPackages?: string[] | 'all',
  isLibraryNamespace?: (nsName: string) => boolean
): void {
  // The gate only fires for library-registered namespaces. Filesystem
  // namespaces (user-controlled source via sourceRoots) are always allowed — the
  // user controls those files, not the allowedPackages gate. Built-ins
  // (clojure.*) are always allowed via ALWAYS_ALLOWED in isNamespaceAllowed.
  const isLibrary = isLibraryNamespace ? isLibraryNamespace(nsName) : true
  if (
    isLibrary &&
    allowedPackages !== undefined &&
    !isNamespaceAllowed(nsName, allowedPackages)
  ) {
    const allowedList = allowedPackages === 'all' ? [] : allowedPackages
    const err = new EvaluationError(
      `Access denied: namespace '${nsName}' is not in the allowed packages for this session.\n` +
        `Allowed packages: ${JSON.stringify(allowedList)}\n` +
        `To allow all packages, use: allowedPackages: 'all'`,
      { nsName, allowedPackages }
    )
    err.code = 'namespace/access-denied'
    throw err
  }
}

// ---------------------------------------------------------------------------
// applyRequireLink — LINK-ONLY application of a require spec. Installs :as
// aliases, :refer vars, and :as-alias reader aliases into currentEnv, ASSUMING
// the target namespace is already resident. It performs NO loading: no
// resolveNs, no recursive source read. If the target is absent it throws
// namespace/not-found.
//
// This is the S2 link/load split (see .regibyte/S2_LINK_LOAD_DESIGN.md). The
// async graph loader (S3) will load the whole dependency closure first, then
// call applyRequireLink to wire links without re-triggering a load. Every
// validation error is the SAME one the combined processRequireSpec threw (G8) —
// extracted verbatim, not reworded.
// ---------------------------------------------------------------------------

export function applyRequireLink(
  spec: CljValue,
  currentEnv: Env,
  registry: NamespaceRegistry,
  allowedPackages?: string[] | 'all',
  isLibraryNamespace?: (nsName: string) => boolean
): boolean {
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

  assertNamespaceAllowed(nsName, allowedPackages, isLibraryNamespace)

  let changed = false
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
        if (currentEnv.ns!.readerAliases.get(alias.name) !== nsName) {
          currentEnv.ns!.readerAliases.set(alias.name, nsName)
          changed = true
        }
        i++
      } else {
        throw new EvaluationError(
          `:as-alias specs only support :as-alias, got ${kw.name}`,
          { spec }
        )
      }
    }
    return changed
  }

  // Link-only: the target must already be resident. Loading is the caller's job
  // (processRequireSpec for REPL/eval, the async graph loader for S3).
  const targetEnv = registry.get(nsName)
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
      if (currentEnv.ns!.aliases.get(alias.name) !== targetEnv.ns!) {
        currentEnv.ns!.aliases.set(alias.name, targetEnv.ns!)
        changed = true
      }
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
        if (currentEnv.ns!.vars.get(sym.name) !== v) {
          currentEnv.ns!.vars.set(sym.name, v)
          changed = true
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
  return changed
}

// ---------------------------------------------------------------------------
// processRequireSpec — LOAD + LINK. Loads the target namespace if absent (via
// resolveNs), then applies links via applyRequireLink. This is the REPL/eval
// path that keeps today's load-then-link behavior; the signature is unchanged
// so existing callers (runtime require mechanics, bootstrap `require`) are
// unaffected.
// ---------------------------------------------------------------------------

export function processRequireSpec(
  spec: CljValue,
  currentEnv: Env,
  registry: NamespaceRegistry,
  resolveNs?: (nsName: string) => boolean,
  allowedPackages?: string[] | 'all',
  isLibraryNamespace?: (nsName: string) => boolean
): boolean {
  // Load phase: a well-formed, loadable spec (vector + symbol head, not
  // :as-alias) gets its namespace loaded BEFORE linking. The gate runs here too
  // so a denied namespace is never source-loaded (loading runs code). Malformed
  // specs and :as-alias fall through to applyRequireLink, the single authority
  // for validation messages and link application.
  if (
    resolveNs &&
    is.vector(spec) &&
    spec.value.length > 0 &&
    is.symbol(spec.value[0])
  ) {
    const hasAsAlias = spec.value.some(
      (el) => is.keyword(el) && el.name === ':as-alias'
    )
    if (!hasAsAlias) {
      const nsName = spec.value[0].name
      assertNamespaceAllowed(nsName, allowedPackages, isLibraryNamespace)
      resolveNs(nsName)
    }
  }
  return applyRequireLink(
    spec,
    currentEnv,
    registry,
    allowedPackages,
    isLibraryNamespace
  )
}
