import { isKeyword, isList, isSymbol, isVector } from './assertions'
import { loadCoreFunctions } from './core-env'
import { define, lookup, makeEnv } from './env'
import { EvaluationError, evaluateForms, RecurSignal } from './evaluator'
import { cljNativeFunction, cljNil } from './factories'
import { parseForms } from './parser'
import { tokenize } from './tokenizer'
import type { CljValue, Env } from './types'

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

function extractNsName(forms: CljValue[]): string | null {
  const nsForm = findNsForm(forms)
  if (!nsForm) return null
  const nameSymbol = nsForm.value[1]
  return isSymbol(nameSymbol) ? nameSymbol.name : null
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
    const forms = parseForms(tokenize(source))
    const targetNs = extractNsName(forms) ?? nsName ?? 'user'
    const env = ensureNs(targetNs)
    processNsRequires(forms, env)
    evaluateForms(forms, env)
  }

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
        const forms = parseForms(tokenize(source))
        const env = getNs(currentNs)!
        processNsRequires(forms, env)
        return evaluateForms(forms, env)
      } catch (e) {
        if (e instanceof RecurSignal) {
          throw new EvaluationError('recur called outside of loop or fn', {
            args: e.args,
          })
        }
        throw e
      }
    },
    evaluateForms(forms: CljValue[]) {
      try {
        return evaluateForms(forms, getNs(currentNs)!)
      } catch (e) {
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
