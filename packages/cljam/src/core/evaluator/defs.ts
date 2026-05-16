import { is } from '../assertions'
import { getNamespaceEnv } from '../env'
import { v } from '../factories'
import { getLineCol, getPos } from '../positions'
import type {
  CljMap,
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

export type DefineVarInput = {
  name: CljSymbol
  value: CljValue
  env: Env
  ctx: EvaluationContext
  docstring?: string
}

export function defineVar({
  name,
  value,
  env,
  ctx,
  docstring,
}: DefineVarInput): CljVar {
  const nsEnv = getNamespaceEnv(env)
  const cljNs = nsEnv.ns!
  const varMeta = buildVarMeta(name.meta, ctx, name)
  const finalMeta = docstring ? mergeDocIntoMeta(varMeta, docstring) : varMeta

  propagateDocToFunction(value, finalMeta)

  const existing = cljNs.vars.get(name.name)
  if (existing) {
    existing.value = value
    if (finalMeta) {
      existing.meta = finalMeta
      if (hasDynamicMeta(finalMeta)) existing.dynamic = true
    }
    return existing
  }

  const newVar = v.var(cljNs.name, name.name, value, finalMeta)
  if (hasDynamicMeta(finalMeta)) newVar.dynamic = true
  cljNs.vars.set(name.name, newVar)
  return newVar
}
