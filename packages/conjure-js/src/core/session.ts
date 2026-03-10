import { isKeyword, isList, isNamespace, isSymbol, isVector } from './assertions'
import { loadCoreFunctions } from './core-env'
import {
  define,
  internVar,
  lookup,
  lookupVar,
  makeEnv,
  makeNamespace,
  tryLookup,
} from './env'
import { valueToString } from './transformations'
import { createEvaluationContext, RecurSignal } from './evaluator'
import { CljThrownSignal, EvaluationError, ReaderError } from './errors'
import {
  cljBoolean,
  cljKeyword,
  cljList,
  cljMap,
  cljNativeFunction,
  cljNativeFunctionWithContext,
  cljNil,
  cljSet,
  cljString,
  cljSymbol,
} from './factories'
import { formatErrorContext } from './positions'
import { prettyPrintString, printString, withPrintContext } from './printer'
import { readForms } from './reader'
import { tokenize } from './tokenizer'
import type { CljNamespace, CljValue, Env, Token, TokenSymbol } from './types'
import { builtInNamespaceSources } from '../clojure/generated/builtin-namespace-registry'

type NamespaceRegistry = Map<string, Env>

type SessionOptions = {
  output?: (text: string) => void
  entries?: string[]
  sourceRoots?: string[]
  readFile?: (filePath: string) => string
}

export type Session = {
  registry: NamespaceRegistry
  readonly currentNs: string
  setNs: (namespace: string) => void
  getNs: (namespace: string) => CljNamespace | null
  loadFile: (source: string, nsName?: string, filePath?: string) => string
  evaluate: (
    source: string,
    opts?: { lineOffset?: number; colOffset?: number; file?: string }
  ) => CljValue
  evaluateForms: (forms: CljValue[]) => CljValue
  addSourceRoot: (path: string) => void
  getCompletions: (prefix: string, nsName?: string) => string[]
}

// Lightweight token scan to extract the namespace name before full parsing.
// Looks for the pattern: LParen Symbol("ns") Symbol(name) at the top of the token stream.
function extractNsNameFromTokens(tokens: Token[]): string | null {
  const meaningful = tokens.filter((t) => t.kind !== 'Comment')
  if (meaningful.length < 3) return null
  if (meaningful[0].kind !== 'LParen') return null
  if (meaningful[1].kind !== 'Symbol' || meaningful[1].value !== 'ns')
    return null
  if (meaningful[2].kind !== 'Symbol') return null
  return meaningful[2].value
}

// Lightweight token scan to extract :as alias pairs from the ns form's :require clauses.
// Returns Map { 'alias' -> 'full.ns.name' } for all [some.ns :as alias] specs found.
// This runs before readForms so the reader can expand ::alias/foo at read time.
function extractAliasMapFromTokens(tokens: Token[]): Map<string, string> {
  const aliases = new Map<string, string>()
  const meaningful = tokens.filter(
    (t) => t.kind !== 'Comment' && t.kind !== 'Whitespace'
  )
  // Must start with (ns ...)
  if (meaningful.length < 3) return aliases
  if (meaningful[0].kind !== 'LParen') return aliases
  if (meaningful[1].kind !== 'Symbol' || meaningful[1].value !== 'ns')
    return aliases

  // Walk the top-level ns form tracking paren depth.
  // For each [ vector ] we encounter, check for ns-sym :as alias-sym.
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
      // Scan through this vector for: first Symbol (ns name) + :as + Symbol (alias)
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

function processRequireSpec(
  spec: CljValue,
  currentEnv: Env,
  registry: NamespaceRegistry,
  resolveNamespace?: (nsName: string) => boolean
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

  // :as-alias creates a reader alias without loading the namespace.
  // The namespace need not exist — the alias is only used for ::alias/foo expansion.
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
  if (!targetEnv && resolveNamespace) {
    resolveNamespace(nsName)
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
        const v = lookupVar(sym.name, targetEnv)
        if (v !== undefined) {
          currentEnv.ns!.vars.set(sym.name, v)
        } else {
          let value: CljValue
          try {
            value = lookup(sym.name, targetEnv)
          } catch {
            throw new EvaluationError(
              `Symbol ${sym.name} not found in namespace ${nsName}`,
              { nsName, symbol: sym.name }
            )
          }
          define(sym.name, value, currentEnv)
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
}

// ---------------------------------------------------------------------------
// Clone helpers — used by snapshotSession / createSessionFromSnapshot
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

function cloneRegistry(registry: NamespaceRegistry): NamespaceRegistry {
  const memo = new Map<Env, Env>()
  const next = new Map<string, Env>()
  // Pass 1: clone all envs (ns.aliases left empty)
  for (const [name, env] of registry) next.set(name, cloneEnv(env, memo))
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
// SessionState — the minimal data a session operates on
// ---------------------------------------------------------------------------

type SessionState = {
  registry: NamespaceRegistry
  currentNs: string
}

// ---------------------------------------------------------------------------
// buildSessionApi — single source of truth for all session behavior.
// Accepts a pre-populated registry (fresh or cloned) and wires up all
// closures + the public API. Always re-wires resolveNs and require since
// both must close over the specific registry instance they receive.
// ---------------------------------------------------------------------------

function buildSessionApi(
  state: SessionState,
  options?: SessionOptions
): Session {
  const registry = state.registry
  let currentNs = state.currentNs

  const coreEnv = registry.get('clojure.core')!
  coreEnv.resolveNs = (name: string) => registry.get(name) ?? null

  // Always re-wire print/println so snapshot-derived sessions get the right
  // emit target. Falls back to console.log when no output callback is provided.
  const emitFn = options?.output ?? ((text: string) => console.log(text))

  function readPrintCtx(callEnv: Env) {
    const len = tryLookup('*print-length*', callEnv)
    const level = tryLookup('*print-level*', callEnv)
    return {
      printLength: len?.kind === 'number' ? len.value : null,
      printLevel: level?.kind === 'number' ? level.value : null,
    }
  }

  internVar(
    'println',
    cljNativeFunctionWithContext(
      'println',
      (_ctx, callEnv, ...args: CljValue[]) => {
        withPrintContext(readPrintCtx(callEnv), () => {
          emitFn(args.map(valueToString).join(' ') + '\n')
        })
        return cljNil()
      }
    ),
    coreEnv
  )
  internVar(
    'print',
    cljNativeFunctionWithContext(
      'print',
      (_ctx, callEnv, ...args: CljValue[]) => {
        withPrintContext(readPrintCtx(callEnv), () => {
          emitFn(args.map(valueToString).join(' '))
        })
        return cljNil()
      }
    ),
    coreEnv
  )
  internVar(
    'newline',
    cljNativeFunction('newline', () => {
      emitFn('\n')
      return cljNil()
    }),
    coreEnv
  )
  internVar(
    'pprint',
    cljNativeFunctionWithContext(
      'pprint',
      (_ctx, callEnv, form: CljValue, widthArg?: CljValue) => {
        if (form === undefined) return cljNil()
        const maxWidth =
          widthArg !== undefined && widthArg.kind === 'number'
            ? widthArg.value
            : 80
        withPrintContext(readPrintCtx(callEnv), () => {
          emitFn(prettyPrintString(form, maxWidth) + '\n')
        })
        return cljNil()
      }
    ),
    coreEnv
  )

  // Ensure *print-length* and *print-level* are dynamic in cloned sessions
  const plVar = coreEnv.ns?.vars.get('*print-length*')
  if (plVar) plVar.dynamic = true
  const pvVar = coreEnv.ns?.vars.get('*print-level*')
  if (pvVar) pvVar.dynamic = true

  // clojure.reflect stubs — Cursive requires this namespace for class completion
  // and calls parse-flags to decode Java modifier bitmasks. No Java reflection
  // in this runtime; stubs return safe empty values so Cursive degrades cleanly.
  const reflectEnv = ensureNs('clojure.reflect')
  internVar(
    'parse-flags',
    cljNativeFunction('parse-flags', (_flags: CljValue, _kind: CljValue) =>
      cljSet([])
    ),
    reflectEnv
  )
  internVar(
    'reflect',
    cljNativeFunction('reflect', (_obj: CljValue) => cljMap([])),
    reflectEnv
  )
  internVar(
    'type-reflect',
    cljNativeFunction(
      'type-reflect',
      (_typeobj: CljValue, ..._opts: CljValue[]) => cljMap([])
    ),
    reflectEnv
  )

  // Stub for cursive.repl.runtime — prevents "namespace not found" errors
  // when Cursive IDE sends completion probes to our nREPL server.
  const cursiveEnv = ensureNs('cursive.repl.runtime')
  internVar(
    'completions',
    cljNativeFunction('completions', (..._args: CljValue[]) => cljNil()),
    cursiveEnv
  )
  internVar('*compiler-options*', cljMap([]), coreEnv)

  // *ns* holds the current namespace as a first-class CljNamespace value.
  const initialNsObj = registry.get(currentNs)?.ns ?? makeNamespace(currentNs)
  internVar('*ns*', initialNsObj, coreEnv)
  const nsVar = coreEnv.ns?.vars.get('*ns*')
  if (nsVar) nsVar.dynamic = true

  function syncNsVar(name: string) {
    const nsVarInner = coreEnv.ns?.vars.get('*ns*')
    if (nsVarInner) {
      const nsObj = registry.get(name)?.ns
      if (nsObj) nsVarInner.value = nsObj
    }
  }

  internVar(
    'ns-name',
    cljNativeFunction('ns-name', (x: CljValue) => {
      if (x === undefined) return cljNil()
      if (x.kind === 'namespace') return cljSymbol(x.name)
      if (x.kind === 'symbol') return x
      if (x.kind === 'string') return cljSymbol(x.value)
      return cljNil()
    }),
    coreEnv
  )

  internVar(
    'all-ns',
    cljNativeFunction('all-ns', () =>
      cljList([...registry.values()].map(env => env.ns!).filter(Boolean))
    ),
    coreEnv
  )

  internVar(
    'find-ns',
    cljNativeFunction('find-ns', (sym: CljValue) => {
      if (sym === undefined || !isSymbol(sym)) return cljNil()
      return registry.get(sym.name)?.ns ?? cljNil()
    }),
    coreEnv
  )

  // Helper: resolve a namespace symbol (or namespace object) to its CljNamespace, or null.
  function resolveNsSym(sym: CljValue): CljNamespace | null {
    if (sym === undefined) return null
    if (isNamespace(sym)) return sym
    if (!isSymbol(sym)) return null
    return registry.get(sym.name)?.ns ?? null
  }

  // ns-aliases: (ns-aliases ns-sym) → map of {alias-sym → namespace}
  internVar(
    'ns-aliases',
    cljNativeFunction('ns-aliases', (sym: CljValue) => {
      const ns = resolveNsSym(sym)
      if (!ns) return cljMap([])
      const entries: [CljValue, CljValue][] = []
      ns.aliases.forEach((targetNs, alias) => {
        entries.push([cljSymbol(alias), targetNs])
      })
      return cljMap(entries)
    }),
    coreEnv
  )

  // ns-interns: (ns-interns ns-sym) → map of {sym → var} for vars defined in ns (not referred)
  internVar(
    'ns-interns',
    cljNativeFunction('ns-interns', (sym: CljValue) => {
      const ns = resolveNsSym(sym)
      if (!ns) return cljMap([])
      const entries: [CljValue, CljValue][] = []
      ns.vars.forEach((v, name) => {
        if (v.ns === ns.name) entries.push([cljSymbol(name), v])
      })
      return cljMap(entries)
    }),
    coreEnv
  )

  // ns-publics: (ns-publics ns-sym) → map of {sym → var} for non-private interns.
  internVar(
    'ns-publics',
    cljNativeFunction('ns-publics', (sym: CljValue) => {
      const ns = resolveNsSym(sym)
      if (!ns) return cljMap([])
      const entries: [CljValue, CljValue][] = []
      ns.vars.forEach((v, name) => {
        if (v.ns === ns.name) entries.push([cljSymbol(name), v])
      })
      return cljMap(entries)
    }),
    coreEnv
  )

  // ns-refers: (ns-refers ns-sym) → map of {sym → var} for vars referred from other namespaces.
  internVar(
    'ns-refers',
    cljNativeFunction('ns-refers', (sym: CljValue) => {
      const ns = resolveNsSym(sym)
      if (!ns) return cljMap([])
      const entries: [CljValue, CljValue][] = []
      ns.vars.forEach((v, name) => {
        if (v.ns !== ns.name) entries.push([cljSymbol(name), v])
      })
      return cljMap(entries)
    }),
    coreEnv
  )

  // ns-map: (ns-map ns-sym) → union of ns-interns + ns-refers.
  // Delegates to ns-interns since ns-refers is empty.
  internVar(
    'ns-map',
    cljNativeFunction('ns-map', (sym: CljValue) => {
      const ns = resolveNsSym(sym)
      if (!ns) return cljMap([])
      const entries: [CljValue, CljValue][] = []
      ns.vars.forEach((v, name) => {
        entries.push([cljSymbol(name), v])
      })
      return cljMap(entries)
    }),
    coreEnv
  )

  // ns-imports: (ns-imports ns-sym) → map of {ClassName → Class}.
  // No Java interop — always returns an empty map.
  internVar(
    'ns-imports',
    cljNativeFunction('ns-imports', (_sym: CljValue) => cljMap([])),
    coreEnv
  )

  // the-ns: (the-ns sym) → coerce to namespace object.
  // Returns a CljNamespace for known namespaces, nil otherwise.
  internVar(
    'the-ns',
    cljNativeFunction('the-ns', (sym: CljValue) => {
      if (sym === undefined) return cljNil()
      if (isNamespace(sym)) return sym
      if (!isSymbol(sym)) return cljNil()
      return registry.get(sym.name)?.ns ?? cljNil()
    }),
    coreEnv
  )

  // instance?: (instance? Class obj) → boolean.
  // No Java class hierarchy — always returns false. Cursive uses this to check
  // e.g. (instance? clojure.lang.Var x); our var? predicate is the correct test.
  internVar(
    'instance?',
    cljNativeFunction('instance?', (_cls: CljValue, _obj: CljValue) =>
      cljBoolean(false)
    ),
    coreEnv
  )

  // class: (class x) → returns the class of x.
  // No Java classes — returns a keyword describing the value kind instead.
  internVar(
    'class',
    cljNativeFunction('class', (x: CljValue) => {
      if (x === undefined) return cljNil()
      return cljString(`conjure.${x.kind}`)
    }),
    coreEnv
  )

  // class?: (class? x) → false — no Java Class objects in this runtime.
  internVar(
    'class?',
    cljNativeFunction('class?', (_x: CljValue) => cljBoolean(false)),
    coreEnv
  )

  // special-symbol?: (special-symbol? sym) → true for Clojure special forms.
  internVar(
    'special-symbol?',
    cljNativeFunction('special-symbol?', (sym: CljValue) => {
      if (sym === undefined || !isSymbol(sym)) return cljBoolean(false)
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
      return cljBoolean(specials.has(sym.name))
    }),
    coreEnv
  )

  // loaded-libs: returns a set of symbols for all loaded namespace names.
  internVar(
    'loaded-libs',
    cljNativeFunction('loaded-libs', () =>
      cljSet([...registry.keys()].map(cljSymbol))
    ),
    coreEnv
  )

  // Java class stubs — Clojure auto-imports java.lang.* into every namespace.
  // Cursive's completions function references these as bare symbols (e.g. Class,
  // Var, Namespace) for type discrimination via instance?. We intern them as
  // keyword sentinels so they resolve without error; instance? always returns
  // false, so no branch that checks (instance? Class x) will fire.
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
    internVar(javaClass, cljKeyword(`:java.lang/${javaClass}`), coreEnv)
  }

  // Mutable source roots — seeded from options, growable via addSourceRoot.
  const sourceRoots = new Set<string>(options?.sourceRoots ?? [])

  function addSourceRoot(path: string) {
    sourceRoots.add(path)
  }

  // One shared evaluation context for the lifetime of this session.
  const ctx = createEvaluationContext()

  function resolveNamespace(nsName: string): boolean {
    const builtInLoader = builtInNamespaceSources[nsName]
    if (builtInLoader) {
      loadFile(builtInLoader(), nsName)
      return true
    }
    if (!options?.readFile || sourceRoots.size === 0) {
      return false
    }
    for (const root of sourceRoots) {
      const filePath = `${root.replace(/\/$/, '')}/${nsName.replace(/\./g, '/')}.clj`
      try {
        const source = options.readFile(filePath)
        if (source) {
          loadFile(source)
          return true
        }
      } catch {
        continue
      }
    }
    return false
  }

  function ensureNs(name: string): Env {
    if (!registry.has(name)) {
      const nsEnv = makeEnv(coreEnv)
      nsEnv.ns = makeNamespace(name)
      registry.set(name, nsEnv)
    }
    return registry.get(name)!
  }

  function setNs(name: string) {
    ensureNs(name)
    currentNs = name
    syncNsVar(name)
  }

  function getNs(name: string): CljNamespace | null {
    return registry.get(name)?.ns ?? null
  }

  // Internal: returns the full Env (with lexical chain) for a namespace name.
  function getNsEnv(name: string): Env | null {
    return registry.get(name) ?? null
  }

  internVar(
    'require',
    cljNativeFunction('require', (...args: CljValue[]) => {
      const currentEnv = registry.get(currentNs)!
      for (const arg of args) {
        processRequireSpec(arg, currentEnv, registry, resolveNamespace)
      }
      return cljNil()
    }),
    coreEnv
  )

  internVar(
    'resolve',
    cljNativeFunction('resolve', (sym: CljValue) => {
      if (!isSymbol(sym)) return cljNil()
      const slashIdx = sym.name.indexOf('/')
      if (slashIdx > 0) {
        const nsName = sym.name.slice(0, slashIdx)
        const symName = sym.name.slice(slashIdx + 1)
        const nsEnv = registry.get(nsName) ?? null
        if (!nsEnv) return cljNil()
        return tryLookup(symName, nsEnv) ?? cljNil()
      }
      const currentEnv = registry.get(currentNs)!
      return tryLookup(sym.name, currentEnv) ?? cljNil()
    }),
    coreEnv
  )

  function processNsRequires(forms: CljValue[], env: Env) {
    const requireClauses = extractRequireClauses(forms)
    for (const specs of requireClauses) {
      for (const spec of specs) {
        processRequireSpec(spec, env, registry, resolveNamespace)
      }
    }
  }

  function loadFile(
    source: string,
    nsName?: string,
    filePath?: string
  ): string {
    const tokens = tokenize(source)
    const targetNs = extractNsNameFromTokens(tokens) ?? nsName ?? 'user'
    const aliasMap = extractAliasMapFromTokens(tokens)
    const forms = readForms(tokens, targetNs, aliasMap)
    const env = ensureNs(targetNs)
    ctx.currentSource = source
    ctx.currentFile = filePath
    ctx.currentLineOffset = 0
    ctx.currentColOffset = 0
    processNsRequires(forms, env)
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
  }

  const api: Session = {
    registry,
    get currentNs() {
      return currentNs
    },
    setNs,
    getNs,
    loadFile,
    addSourceRoot,
    evaluate(
      source: string,
      opts?: { lineOffset?: number; colOffset?: number; file?: string }
    ) {
      ctx.currentSource = source
      ctx.currentFile = opts?.file
      ctx.currentLineOffset = opts?.lineOffset ?? 0
      ctx.currentColOffset = opts?.colOffset ?? 0
      try {
        const tokens = tokenize(source)
        // If source opens with an ns declaration, switch to that namespace
        // so requires resolve against the right env and currentNs is updated.
        // This mirrors what loadFile does, making eval and load-file consistent.
        const declaredNs = extractNsNameFromTokens(tokens)
        if (declaredNs) {
          ensureNs(declaredNs)
          currentNs = declaredNs
          syncNsVar(declaredNs)
        }
        const env = getNsEnv(currentNs)!
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
        processNsRequires(forms, env)
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
    evaluateForms(forms: CljValue[]) {
      try {
        const env = getNsEnv(currentNs)!
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
      let env: Env | null = registry.get(nsName ?? currentNs) ?? null
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
  return api
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createSession(options?: SessionOptions): Session {
  const registry: NamespaceRegistry = new Map()

  const coreEnv = makeEnv()
  coreEnv.ns = makeNamespace('clojure.core')
  loadCoreFunctions(coreEnv, options?.output)
  registry.set('clojure.core', coreEnv)

  const userEnv = makeEnv(coreEnv)
  userEnv.ns = makeNamespace('user')
  registry.set('user', userEnv)

  const session = buildSessionApi({ registry, currentNs: 'user' }, options)

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
 * A snapshot of a session's registry + current namespace.
 * Produced by snapshotSession; consumed by createSessionFromSnapshot.
 * CljValue objects are shared (they are immutable); only the Env containers
 * are deep-copied so each derived session gets independent namespace state.
 */
export type SessionSnapshot = {
  registry: NamespaceRegistry
  currentNs: string
}

/**
 * Capture a deep clone of the session's env state.
 * Typically called once after createSession() and before any user code is
 * evaluated, to produce a pristine snapshot that can be cloned cheaply per test.
 */
export function snapshotSession(session: Session): SessionSnapshot {
  return {
    registry: cloneRegistry(session.registry),
    currentNs: session.currentNs,
  }
}

/**
 * Create a new session from a previously captured snapshot.
 * Skips the core.clj bootstrap — the cloned registry already contains the
 * fully-expanded core environment. Re-wires all registry-dependent closures
 * (resolveNs, require) to the new registry instance.
 */
export function createSessionFromSnapshot(
  snapshot: SessionSnapshot,
  options?: SessionOptions
): Session {
  const registry = cloneRegistry(snapshot.registry)
  const session = buildSessionApi(
    { registry, currentNs: snapshot.currentNs },
    options
  )
  for (const source of options?.entries ?? []) {
    session.loadFile(source)
  }
  return session
}
