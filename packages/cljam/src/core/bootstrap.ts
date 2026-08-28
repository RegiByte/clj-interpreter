import { is, isNamespace, isSymbol } from './assertions'
import { internVar, makeNamespace, tryLookup } from './env'
import { EvaluationError } from './errors'
import { DocGroups, docMeta, v } from './factories'
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
    v
      .nativeFn('ns-name', (x: CljValue) => {
        if (x === undefined) return v.nil()
        if (is.namespace(x)) return v.symbol(x.name)
        if (is.symbol(x)) return x
        if (is.string(x)) return v.symbol(x.value)
        return v.nil()
      })
      .withMeta([
        ...docMeta({
          doc: 'Returns the namespace name as a symbol for the given value.',
          arglists: [['x']],
          docGroup: DocGroups.introspection,
        }),
      ]),
    coreEnv
  )

  internVar(
    'all-ns',
    v
      .nativeFn('all-ns', () =>
        v.list([...registry.values()].map((env) => env.ns!).filter(Boolean))
      )
      .withMeta([
        ...docMeta({
          doc: 'Returns a list of all namespaces loaded in the session.',
          arglists: [[]],
          docGroup: DocGroups.introspection,
        }),
      ]),
    coreEnv
  )

  internVar(
    'find-ns',
    v
      .nativeFn('find-ns', (sym: CljValue) => {
        if (sym === undefined || !isSymbol(sym)) return v.nil()
        return registry.get(sym.name)?.ns ?? v.nil()
      })
      .withMeta([
        ...docMeta({
          doc: 'Returns the namespace as a value for the given symbol, or nil if the symbol is not a namespace or not loaded.',
          arglists: [['sym']],
          docGroup: DocGroups.introspection,
        }),
      ]),
    coreEnv
  )

  internVar(
    'in-ns',
    v
      .nativeFnCtx('in-ns', (ctx, _callEnv, sym: CljValue) => {
        if (!sym || !isSymbol(sym)) {
          throw new EvaluationError('in-ns expects a symbol', { sym })
        }
        if (ctx.setCurrentNs) ctx.setCurrentNs(sym.name)
        return registry.get(sym.name)?.ns ?? v.nil()
      })
      .withMeta([
        ...docMeta({
          doc: 'Sets the current namespace to the given symbol and returns the namespace as a value.',
          arglists: [['sym']],
          docGroup: DocGroups.introspection,
        }),
      ]),
    coreEnv
  )

  internVar(
    'ns-aliases',
    v
      .nativeFn('ns-aliases', (sym: CljValue) => {
        const ns = resolveNsSym(sym)
        if (!ns) return v.map([])
        const entries: [CljValue, CljValue][] = []
        ns.aliases.forEach((targetNs, alias) => {
          entries.push([v.symbol(alias), targetNs])
        })
        return v.map(entries)
      })
      .withMeta([
        ...docMeta({
          doc: 'Returns a map of the aliases for the given namespace.',
          arglists: [['sym']],
          docGroup: DocGroups.introspection,
        }),
      ]),
    coreEnv
  )

  internVar(
    'ns-interns',
    v
      .nativeFn('ns-interns', (sym: CljValue) => {
        const ns = resolveNsSym(sym)
        if (!ns) return v.map([])
        const entries: [CljValue, CljValue][] = []
        ns.vars.forEach((theVar, name) => {
          if (theVar.ns === ns.name) entries.push([v.symbol(name), theVar])
        })
        return v.map(entries)
      })
      .withMeta([
        ...docMeta({
          doc: 'Returns a map of the interned vars for the given namespace.',
          arglists: [['sym']],
          docGroup: DocGroups.introspection,
        }),
      ]),
    coreEnv
  )

  internVar(
    'ns-publics',
    v
      .nativeFn('ns-publics', (sym: CljValue) => {
        const ns = resolveNsSym(sym)
        if (!ns) return v.map([])
        const entries: [CljValue, CljValue][] = []
        ns.vars.forEach((theVar, name) => {
          if (theVar.ns !== ns.name) return
          const isPrivate = (theVar.meta?.entries ?? []).some(
            ([k, val]) =>
              is.keyword(k) &&
              k.name === ':private' &&
              is.boolean(val) &&
              val.value === true
          )
          if (!isPrivate) entries.push([v.symbol(name), theVar])
        })
        return v.map(entries)
      })
      .withMeta([
        ...docMeta({
          doc: 'Returns a map of the public vars for the given namespace.',
          arglists: [['sym']],
          docGroup: DocGroups.introspection,
        }),
      ]),
    coreEnv
  )

  internVar(
    'ns-refers',
    v
      .nativeFn('ns-refers', (sym: CljValue) => {
        const ns = resolveNsSym(sym)
        if (!ns) return v.map([])
        const entries: [CljValue, CljValue][] = []
        ns.vars.forEach((theVar, name) => {
          if (theVar.ns !== ns.name) entries.push([v.symbol(name), theVar])
        })
        return v.map(entries)
      })
      .withMeta([
        ...docMeta({
          doc: 'Returns a map of the refers for the given namespace.',
          arglists: [['sym']],
          docGroup: DocGroups.introspection,
        }),
      ]),
    coreEnv
  )

  internVar(
    'ns-map',
    v
      .nativeFn('ns-map', (sym: CljValue) => {
        const ns = resolveNsSym(sym)
        if (!ns) return v.map([])
        const entries: [CljValue, CljValue][] = []
        ns.vars.forEach((theVar, name) => {
          entries.push([v.symbol(name), theVar])
        })
        return v.map(entries)
      })
      .withMeta([
        ...docMeta({
          doc: 'Returns a map of the vars for the given namespace.',
          arglists: [['sym']],
          docGroup: DocGroups.introspection,
        }),
      ]),
    coreEnv
  )

  internVar(
    'ns-imports',
    v
      .nativeFn('ns-imports', (_sym: CljValue) => v.map([]))
      .withMeta([
        ...docMeta({
          doc: '',
          arglists: [['sym']],
          docGroup: DocGroups.introspection,
          extra: {
            'no-doc': true,
          },
        }),
      ]),
    coreEnv
  )

  internVar(
    'the-ns',
    v
      .nativeFn('the-ns', (sym: CljValue) => {
        if (sym === undefined) return v.nil()
        if (isNamespace(sym)) return sym
        if (!isSymbol(sym)) return v.nil()
        return registry.get(sym.name)?.ns ?? v.nil()
      })
      .withMeta([
        ...docMeta({
          doc: 'Returns the namespace as a value for the given symbol, or nil if the symbol is not a namespace or not loaded.',
          arglists: [['sym']],
          docGroup: DocGroups.introspection,
        }),
      ]),
    coreEnv
  )

  internVar(
    'instance?',
    v
      .nativeFn('instance?', (_cls: CljValue, _obj: CljValue) =>
        v.boolean(false)
      )
      .withMeta([
        ...docMeta({
          doc: '',
          arglists: [['cls', 'obj']],
          docGroup: DocGroups.introspection,
          extra: {
            'no-doc': true,
          },
        }),
      ]),
    coreEnv
  )

  internVar(
    'class',
    v
      .nativeFn('class', (x: CljValue) => {
        if (x === undefined) return v.nil()
        return v.string(`conjure.${x.kind}`)
      })
      .withMeta([
        ...docMeta({
          doc: '',
          arglists: [['x']],
          docGroup: DocGroups.introspection,
          extra: {
            'no-doc': true,
          },
        }),
      ]),
    coreEnv
  )

  internVar(
    'class?',
    v
      .nativeFn('class?', (_x: CljValue) => v.boolean(false))
      .withMeta([
        ...docMeta({
          doc: '',
          arglists: [['x']],
          docGroup: DocGroups.introspection,
          extra: {
            'no-doc': true,
          },
        }),
      ]),
    coreEnv
  )

  internVar(
    'special-symbol?',
    v
      .nativeFn('special-symbol?', (sym: CljValue) => {
        if (sym === undefined || !isSymbol(sym)) return v.boolean(false)
        const specials = new Set([
          ...Object.values(specialFormKeywords),
          'import',
        ])
        return v.boolean(specials.has(sym.name))
      })
      .withMeta([
        ...docMeta({
          doc: 'Returns true if the given symbol is a special symbol reserved by the language.',
          arglists: [['sym']],
          docGroup: DocGroups.introspection,
        }),
      ]),
    coreEnv
  )

  internVar(
    'loaded-libs',
    v
      .nativeFn('loaded-libs', () => v.set([...registry.keys()].map(v.symbol)))
      .withMeta([
        ...docMeta({
          doc: 'Returns a set of the loaded libraries.',
          arglists: [[]],
          docGroup: DocGroups.introspection,
        }),
      ]),
    coreEnv
  )

  // require — context-aware so it can thread ctx to resolveNamespace
  internVar(
    'require',
    v
      .nativeFnCtx('require', (ctx, _callEnv, ...args: CljValue[]) => {
        const currentEnv = registry.get(getCurrentNs())!
        for (const arg of args) {
          const changed = processRequireSpec(arg, currentEnv, registry, (nsName) =>
            resolveNamespace(nsName, ctx)
          )
          if (changed && currentEnv.ns) {
            ctx.touchNamespace?.(currentEnv.ns, 'require')
          }
        }
        return v.nil()
      })
      .withMeta([
        ...docMeta({
          doc: 'Parses the require spec and load the namespace(s) specified into the current namespace.',
          arglists: [['args']],
          docGroup: DocGroups.runtime,
        }),
      ]),
    coreEnv
  )

  internVar(
    'resolve',
    v
      .nativeFn('resolve', (sym: CljValue) => {
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
      })
      .withMeta([
        ...docMeta({
          doc: 'Resolves the given symbol to a value in the current namespace.',
          arglists: [['sym']],
          docGroup: DocGroups.introspection,
        }),
      ]),
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
    internVar(
      javaClass,
      v.keyword(`:java.lang/${javaClass}`),
      coreEnv,
      v.map([[v.keyword(':no-doc'), v.boolean(true)]])
    )
  }
}
