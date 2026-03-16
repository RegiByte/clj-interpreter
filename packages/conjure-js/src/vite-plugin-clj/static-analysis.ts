import { isList, isSymbol, isVector } from '../core/assertions'
import { readForms } from '../core/reader'
import { tokenize } from '../core/tokenizer'
import type { Arity, CljList, CljMap, CljValue, DestructurePattern } from '../core/types'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface VarDescriptor {
  name: string
  kind: 'fn' | 'const' | 'unknown'
  arities?: Arity[]   // present when kind === 'fn'
  tsType?: string     // present when kind === 'const' and value type is inferrable
  isPrivate: boolean
  isMacro: boolean
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse Clojure source and return descriptors for all top-level var definitions.
 * Pure function — no session, no execution, no side effects.
 *
 * Handles: defn, defn-, defmacro, def, defonce, declare.
 * Skips: ns, and any other top-level form that is not a definition.
 *
 * Private vars (defn-) are included with isPrivate: true so callers can decide
 * whether to export them or not.
 */
export function readNamespaceVars(source: string): VarDescriptor[] {
  const forms = readForms(tokenize(source))
  const descriptors: VarDescriptor[] = []

  for (const form of forms) {
    if (!isList(form) || form.value.length < 2) continue
    const head = form.value[0]
    if (!isSymbol(head)) continue

    const descriptor = parseTopLevelDef(form, head.name)
    if (descriptor) descriptors.push(descriptor)
  }

  return descriptors
}

// ---------------------------------------------------------------------------
// Metadata helpers
// ---------------------------------------------------------------------------

function hasPrivateMeta(meta: CljMap | undefined): boolean {
  return (meta?.entries ?? []).some(
    ([k, val]) =>
      k.kind === 'keyword' && k.name === ':private' &&
      val.kind === 'boolean' && val.value === true
  )
}

// ---------------------------------------------------------------------------
// Per-form dispatch
// ---------------------------------------------------------------------------

function parseTopLevelDef(form: CljList, op: string): VarDescriptor | null {
  switch (op) {
    case 'defn':
      return parseDefn(form, false, false)
    case 'defn-':
      return parseDefn(form, true, false)
    case 'defmacro':
      return parseDefn(form, false, true)
    case 'def':
    case 'defonce':
      return parseDef(form)
    case 'declare':
      return parseDeclare(form)
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// defn / defn- / defmacro
// ---------------------------------------------------------------------------

function parseDefn(form: CljList, isPrivate: boolean, isMacro: boolean): VarDescriptor | null {
  const nameSym = form.value[1]
  if (!isSymbol(nameSym)) return null

  const private_ = isPrivate || hasPrivateMeta(nameSym.meta)

  // Elements after the name: optional docstring, then params or arity clauses
  const rest = form.value.slice(2)
  // Skip optional docstring
  const start = rest.length > 0 && rest[0].kind === 'string' ? 1 : 0
  const bodyForms = rest.slice(start)

  if (bodyForms.length === 0) {
    // Bare defn with no param list — treat as unknown function
    return { name: nameSym.name, kind: 'fn', arities: [], isPrivate: private_, isMacro }
  }

  const arities: Arity[] = isList(bodyForms[0])
    ? // Multi-arity: each clause is a list whose first element is the params vector
      bodyForms.filter(isList).map(parseArityClause)
    : // Single-arity: bodyForms[0] is the params vector
      isVector(bodyForms[0]) ? [vectorToArity(bodyForms[0])] : []

  return { name: nameSym.name, kind: 'fn', arities, isPrivate: private_, isMacro }
}

function parseArityClause(clause: CljList): Arity {
  const paramVec = clause.value[0]
  return isVector(paramVec) ? vectorToArity(paramVec) : { params: [], restParam: null, body: [] }
}

function vectorToArity(paramVec: { value: CljValue[] }): Arity {
  const params: DestructurePattern[] = []
  let restParam: DestructurePattern | null = null

  for (let i = 0; i < paramVec.value.length; i++) {
    const p = paramVec.value[i]
    if (isSymbol(p) && p.name === '&') {
      const next = paramVec.value[i + 1]
      if (next) restParam = next as DestructurePattern
      break
    }
    params.push(p as DestructurePattern)
  }

  return { params, restParam, body: [] }
}

// ---------------------------------------------------------------------------
// def / defonce
// ---------------------------------------------------------------------------

function parseDef(form: CljList): VarDescriptor | null {
  const nameSym = form.value[1]
  if (!isSymbol(nameSym)) return null

  const isPrivate = hasPrivateMeta(nameSym.meta)
  const value = form.value[2] // may be undefined for bare (def name)

  if (!value) {
    return { name: nameSym.name, kind: 'unknown', isPrivate, isMacro: false }
  }

  // Inline function literal
  const fnArities = tryExtractFnArities(value)
  if (fnArities !== null) {
    return { name: nameSym.name, kind: 'fn', arities: fnArities, isPrivate, isMacro: false }
  }

  // Literal values with inferrable TypeScript types
  const tsType = inferLiteralTsType(value)
  if (tsType !== null) {
    return { name: nameSym.name, kind: 'const', tsType, isPrivate, isMacro: false }
  }

  return { name: nameSym.name, kind: 'unknown', isPrivate, isMacro: false }
}

function inferLiteralTsType(value: CljValue): string | null {
  switch (value.kind) {
    case 'number':  return 'number'
    case 'string':  return 'string'
    case 'boolean': return 'boolean'
    case 'nil':     return 'null'
    case 'keyword': return 'string'
    case 'vector':
    case 'set':     return 'unknown[]'
    case 'map':     return 'Record<string, unknown>'
    default:        return null
  }
}

// ---------------------------------------------------------------------------
// declare
// ---------------------------------------------------------------------------

function parseDeclare(form: CljList): VarDescriptor | null {
  const nameSym = form.value[1]
  if (!isSymbol(nameSym)) return null
  return { name: nameSym.name, kind: 'unknown', isPrivate: false, isMacro: false }
}

// ---------------------------------------------------------------------------
// (fn ...) extraction for def with inline function
// ---------------------------------------------------------------------------

function tryExtractFnArities(value: CljValue): Arity[] | null {
  if (!isList(value)) return null
  const head = value.value[0]
  if (!isSymbol(head) || head.name !== 'fn') return null

  // After fn: optional name symbol, then params-vector or arity-clauses
  let rest = value.value.slice(1)
  if (rest.length > 0 && isSymbol(rest[0])) rest = rest.slice(1) // skip optional fn name

  if (rest.length === 0) return []

  if (isVector(rest[0])) {
    // Single arity: (fn [params] body)
    return [vectorToArity(rest[0])]
  }

  // Multi arity: (fn ([params] body) ([params] body))
  return rest.filter(isList).map(parseArityClause)
}
