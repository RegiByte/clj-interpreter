import { isKeyword, isList, isSymbol, isVector } from './assertions'
import { loadCoreFunctions } from './core-env'
import { define, lookup, makeEnv } from './env'
import { evaluateForms, RecurSignal } from './evaluator'
import { CljThrownSignal, EvaluationError, ReaderError } from './errors'
import { cljNativeFunction, cljNil } from './factories'
import { formatErrorContext } from './positions'
import { printString } from './printer'
import { readForms } from './reader'
import { tokenize } from './tokenizer'
import type { CljValue, Env, Token, TokenSymbol } from './types'
import { coreSource } from '../clojure/core-source'

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
  getNs: (namespace: string) => Env | null
  loadFile: (source: string, nsName?: string) => void
  evaluate: (source: string) => CljValue
  evaluateForms: (forms: CljValue[]) => CljValue
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
    (f) => isList(f) && isSymbol(f.value[0]) && f.value[0].name === 'ns'
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
        if (!currentEnv.readerAliases) {
          currentEnv.readerAliases = new Map()
        }
        currentEnv.readerAliases.set(alias.name, nsName)
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
      if (!currentEnv.aliases) {
        currentEnv.aliases = new Map()
      }
      currentEnv.aliases.set(alias.name, targetEnv)
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
      i++
    } else {
      throw new EvaluationError(
        `Unknown require option ${kw.name}. Supported: :as, :refer`,
        { spec, keyword: kw.name }
      )
    }
  }
}

export function createSession(options?: SessionOptions): Session {
  const registry: NamespaceRegistry = new Map()

  const coreEnv = makeEnv()
  coreEnv.namespace = 'clojure.core'
  coreEnv.resolveNs = (name: string) => registry.get(name) ?? null
  loadCoreFunctions(coreEnv, options?.output)
  registry.set('clojure.core', coreEnv)

  const userEnv = makeEnv(coreEnv)
  userEnv.namespace = 'user'
  registry.set('user', userEnv)

  let currentNs = 'user'

  const resolveNamespace: ((nsName: string) => boolean) | undefined =
    options?.readFile && options?.sourceRoots
      ? (nsName: string) => {
          for (const root of options.sourceRoots!) {
            const filePath = `${root.replace(/\/$/, '')}/${nsName.replace(/\./g, '/')}.clj`
            try {
              const source = options.readFile!(filePath)
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
      : undefined

  function ensureNs(name: string): Env {
    if (!registry.has(name)) {
      const nsEnv = makeEnv(coreEnv)
      nsEnv.namespace = name
      registry.set(name, nsEnv)
    }
    return registry.get(name)!
  }

  function setNs(name: string) {
    ensureNs(name)
    currentNs = name
  }

  function getNs(name: string): Env | null {
    return registry.get(name) ?? null
  }

  define(
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

  function processNsRequires(forms: CljValue[], env: Env) {
    const requireClauses = extractRequireClauses(forms)
    for (const specs of requireClauses) {
      for (const spec of specs) {
        processRequireSpec(spec, env, registry, resolveNamespace)
      }
    }
  }

  function loadFile(source: string, nsName?: string) {
    const tokens = tokenize(source)
    const targetNs = extractNsNameFromTokens(tokens) ?? nsName ?? 'user'
    const aliasMap = extractAliasMapFromTokens(tokens)
    const forms = readForms(tokens, targetNs, aliasMap)
    const env = ensureNs(targetNs)
    processNsRequires(forms, env)
    evaluateForms(forms, env)
  }

  loadFile(coreSource)

  for (const source of options?.entries ?? []) {
    loadFile(source)
  }

  const api: Session = {
    registry,
    get currentNs() {
      return currentNs
    },
    setNs,
    getNs,
    loadFile,
    evaluate(source: string) {
      try {
        const tokens = tokenize(source)
        const env = getNs(currentNs)!
        // Seed alias map from tokens (new aliases declared in this source) and
        // from env.aliases/:as (prior require calls) and env.readerAliases/:as-alias.
        const aliasMap = extractAliasMapFromTokens(tokens)
        env.aliases?.forEach((nsEnv, alias) => {
          if (nsEnv.namespace) aliasMap.set(alias, nsEnv.namespace)
        })
        env.readerAliases?.forEach((nsName, alias) => {
          aliasMap.set(alias, nsName)
        })
        const forms = readForms(tokens, currentNs, aliasMap)
        processNsRequires(forms, env)
        return evaluateForms(forms, env)
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
          e.message += formatErrorContext(source, e.pos)
        }
        throw e
      }
    },
    evaluateForms(forms: CljValue[]) {
      try {
        return evaluateForms(forms, getNs(currentNs)!)
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
  }
  return api
}
