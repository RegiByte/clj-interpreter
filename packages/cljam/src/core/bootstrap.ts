import { isNamespace, isSymbol } from './assertions'
import { internVar, makeNamespace, tryLookup } from './env'
import { EvaluationError } from './errors'
import { v } from './factories'
import type { CljNamespace, CljValue, Env, EvaluationContext } from './types'
import { ensureNamespaceInRegistry, processRequireSpec } from './registry'
import type { NamespaceRegistry } from './registry'
import { specialFormKeywords } from './keywords'

// ---------------------------------------------------------------------------
// wireNsCore — wires *ns*, namespace introspection fns, require, and resolve
// into coreEnv. Called from buildRuntime with explicit parameters instead of
// relying on shared closure state.
// ---------------------------------------------------------------------------

export function wireNsCore(
  registry: NamespaceRegistry,
  coreEnv: Env,
  getCurrentNs: () => string,
  resolveNamespace: (nsName: string, ctx: EvaluationContext) => boolean
): void {
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
        if (theVar.ns !== ns.name) return
        const isPrivate = (theVar.meta?.entries ?? []).some(
          ([k, val]) =>
            k.kind === 'keyword' &&
            k.name === ':private' &&
            val.kind === 'boolean' &&
            val.value === true
        )
        if (!isPrivate) entries.push([v.symbol(name), theVar])
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
        ...Object.values(specialFormKeywords),
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
      const currentEnv = registry.get(getCurrentNs())!
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
      const currentEnv = registry.get(getCurrentNs())!
      return tryLookup(sym.name, currentEnv) ?? v.nil()
    }),
    coreEnv
  )
}

// ---------------------------------------------------------------------------
// wireIdeStubs — wires clojure.reflect, cursive.repl.runtime, and Java class
// stubs into the registry. These are no-op shims for IDE compatibility.
// ---------------------------------------------------------------------------

export function wireIdeStubs(registry: NamespaceRegistry, coreEnv: Env): void {
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
  // other IDE integrations may probe the env to access the capabilities of the runtime
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
}
