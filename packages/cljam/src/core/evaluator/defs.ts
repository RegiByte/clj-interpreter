import { is } from '../assertions'
import { getNamespaceEnv } from '../env'
import { v } from '../factories'
import { getLineCol, getPos } from '../positions'
import type {
  CljMacro,
  CljMap,
  NamespaceMutationReason,
  CljSymbol,
  CljValue,
  CljVar,
  Env,
  EvaluationContext,
} from '../types'

function hasDynamicMeta(meta: CljMap | undefined): boolean {
  if (!meta) return false
  for (const [k, v] of meta.entries) {
    if (
      is.keyword(k) &&
      k.name === ':dynamic' &&
      is.boolean(v) &&
      v.value === true
    ) {
      return true
    }
  }
  return false
}

/**
 * Merge reader-attached symbol metadata with source-position metadata
 * (:line, :column, :file) derived from the current evaluation context.
 * Returns undefined if there is nothing to attach.
 */
export function buildVarMeta(
  symMeta: CljMap | undefined,
  ctx: EvaluationContext,
  nameVal?: CljValue
): CljMap | undefined {
  const pos = nameVal ? getPos(nameVal) : undefined
  const hasPosInfo = pos && ctx.currentSource

  if (!symMeta && !hasPosInfo) return undefined

  const posEntries: [CljValue, CljValue][] = []
  if (hasPosInfo) {
    const { line, col } = getLineCol(ctx.currentSource!, pos!.start)
    const lineOffset = ctx.currentLineOffset ?? 0
    const colOffset = ctx.currentColOffset ?? 0
    posEntries.push([v.keyword(':line'), v.number(line + lineOffset)])
    posEntries.push([
      v.keyword(':column'),
      v.number(line === 1 ? col + colOffset : col),
    ])
    if (ctx.currentFile) {
      posEntries.push([v.keyword(':file'), v.string(ctx.currentFile)])
    }
  }

  // Preserve all existing symMeta entries except the three we're stamping.
  const POS_KEYS = new Set([':line', ':column', ':file'])
  const baseEntries = (symMeta?.entries ?? []).filter(
    ([k]) => !(is.keyword(k) && POS_KEYS.has(k.name))
  )

  const allEntries = [...baseEntries, ...posEntries]
  return allEntries.length > 0 ? v.map(allEntries) : undefined
}

export function mergeDocIntoMeta(
  base: CljMap | undefined,
  docstring: string
): CljMap {
  const docEntry: [CljValue, CljValue] = [
    v.keyword(':doc'),
    v.string(docstring),
  ]
  const existing = (base?.entries ?? []).filter(
    ([k]) => !(is.keyword(k) && k.name === ':doc')
  )
  return v.map([...existing, docEntry])
}

/**
 * Builds the {:doc "..." :arglists [...]} meta for a defmacro name symbol from
 * the raw arity forms (param vectors read before any evaluation). Shared by
 * the interpreter (`evaluateDefmacro`), the VM emitter (`Op.DefMacro`), and
 * the AST walker so the three defmacro paths cannot drift.
 */
export function withDefmacroMeta(
  baseMeta: CljMap | undefined,
  docstring: string | undefined,
  arityForms: CljValue[]
): CljMap | undefined {
  let finalMeta = docstring ? mergeDocIntoMeta(baseMeta, docstring) : baseMeta
  const arglistVecs: CljValue[] = is.vector(arityForms[0])
    ? [arityForms[0]]
    : arityForms
        .filter(is.list)
        .map((form) => form.value[0])
        .filter(is.vector)
  if (arglistVecs.length > 0) {
    const base = (finalMeta?.entries ?? []).filter(
      ([k]) => !(is.keyword(k) && k.name === ':arglists')
    )
    const entries: [CljValue, CljValue][] = [
      ...base,
      [v.keyword(':arglists'), v.vector(arglistVecs)],
    ]
    finalMeta = v.map(entries)
  }
  return finalMeta
}

function propagateDocToFunction(value: CljValue, meta: CljMap | undefined) {
  if (!meta || !is.function(value)) return

  const docEntry = meta.entries.find(
    ([k]) => is.keyword(k) && k.name === ':doc'
  )
  if (!docEntry) return

  const prevEntries = value.meta?.entries ?? []
  const filtered = prevEntries.filter(
    ([k]) => !(is.keyword(k) && k.name === ':doc')
  )
  value.meta = v.map([...filtered, docEntry])
}

function propagateMacroMeta(macro: CljMacro, meta: CljMap | undefined) {
  if (!meta) return

  const propagatedEntries = meta.entries.filter(
    ([k]) =>
      is.keyword(k) && (k.name === ':doc' || k.name === ':arglists')
  )
  if (propagatedEntries.length === 0) return

  const propagatedKeys = new Set(
    propagatedEntries.map(([k]) => (is.keyword(k) ? k.name : ''))
  )
  const prevEntries = (macro.meta?.entries ?? []).filter(
    ([k]) => !(is.keyword(k) && propagatedKeys.has(k.name))
  )
  macro.meta = v.map([...prevEntries, ...propagatedEntries])
}

export type DefineVarInput = {
  name: CljSymbol
  value: CljValue
  env: Env
  ctx: EvaluationContext
  docstring?: string
  mutationReason?: NamespaceMutationReason
}

export function defineVar({
  name,
  value,
  env,
  ctx,
  docstring,
  mutationReason = 'def',
}: DefineVarInput): CljVar {
  const nsEnv = getNamespaceEnv(env)
  const cljNs = nsEnv.ns!
  const varMeta = buildVarMeta(name.meta, ctx, name)
  const finalMeta = docstring ? mergeDocIntoMeta(varMeta, docstring) : varMeta

  propagateDocToFunction(value, finalMeta)
  if (is.function(value) || is.macro(value)) {
    value.displayName = `${cljNs.name}/${name.name}`
  }

  const existing = cljNs.vars.get(name.name)
  if (existing) {
    existing.value = value
    if (finalMeta) {
      existing.meta = finalMeta
      if (hasDynamicMeta(finalMeta)) existing.dynamic = true
    }
    ctx.touchNamespace?.(cljNs, mutationReason)
    return existing
  }

  const newVar = v.var(cljNs.name, name.name, value, finalMeta)
  if (hasDynamicMeta(finalMeta)) newVar.dynamic = true
  cljNs.vars.set(name.name, newVar)
  ctx.touchNamespace?.(cljNs, mutationReason)
  return newVar
}

export type DefineMacroInput = {
  name: CljSymbol
  macro: CljMacro
  env: Env
  ctx: EvaluationContext
}

export function defineMacro({
  name,
  macro,
  env,
  ctx,
}: DefineMacroInput): CljVar {
  macro.name = name.name
  const theVar = defineVar({
    name,
    value: macro,
    env,
    ctx,
    mutationReason: 'defmacro',
  })
  propagateMacroMeta(macro, theVar.meta)
  return theVar
}
