import { isList, isSymbol } from './assertions'
import { loadCoreFunctions } from './core-env'
import { makeEnv } from './env'
import { evaluateForms } from './evaluator'
import { parseForms } from './parser'
import { tokenize } from './tokenizer'
import type { CljValue, Env } from './types'

type NamespaceRegistry = Map<string, Env>

type Session = {
  registry: NamespaceRegistry
  currentNs: string | null
  setNs: (namespace: string) => void
  getNs: (namespace: string) => Env | null
  loadFile: (source: string, nsName?: string) => void
  evaluate: (source: string) => CljValue
}

function extractNsName(forms: CljValue[]): string | null {
  const nsForm = forms.find(
    (f) => isList(f) && isSymbol(f.value[0]) && f.value[0].name === 'ns'
  )
  if (!nsForm || !isList(nsForm)) return null
  const nameSymbol = nsForm.value[1]
  return isSymbol(nameSymbol) ? nameSymbol.name : null
}

export function createSession(): Session {
  const registry: NamespaceRegistry = new Map()

  const coreEnv = makeEnv()
  coreEnv.namespace = 'clojure.core'
  loadCoreFunctions(coreEnv)
  registry.set('clojure.core', coreEnv)

  const userEnv = makeEnv(coreEnv)
  userEnv.namespace = 'user'
  registry.set('user', userEnv)

  let currentNs = 'user'

  function setNs(name: string) {
    if (!registry.has(name)) {
      const nsEnv = makeEnv(coreEnv)
      nsEnv.namespace = name
      registry.set(name, nsEnv)
    }
    currentNs = name
  }

  function getNs(name: string): Env | null {
    return registry.get(name) ?? null
  }

  function loadFile(source: string, nsName?: string) {
    const forms = parseForms(tokenize(source))
    const targetNs = extractNsName(forms) ?? nsName ?? 'user'
    setNs(targetNs)
    const env = getNs(targetNs)!
    evaluateForms(forms, env)
  }

  const api = {
    registry,
    currentNs,
    setNs,
    getNs,
    loadFile,
    evaluate: (source: string) => {
      const forms = parseForms(tokenize(source))
      return evaluateForms(forms, getNs(currentNs)!)
    },
  } satisfies Session
  return api
}
