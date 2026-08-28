import { getPos } from '../positions'
import { mapEntries, setValues } from '../persistent/map-helpers'
import type { CljMap, CljSet, CljValue, Pos } from '../types'

export const TOP_LEVEL_VM_CACHE_VERSION = 'top-level-vm-cache-v1'

export type TopLevelVmCacheKeyInput = {
  namespaceId: number
  namespaceVersion: number
  mode: 'opportunistic' | 'vm-required'
  form: CljValue
}

export function makeTopLevelVmCacheKey(
  input: TopLevelVmCacheKeyInput
): string | null {
  const formFingerprint = fingerprintValue(input.form)
  if (formFingerprint === null) return null
  return [
    TOP_LEVEL_VM_CACHE_VERSION,
    `ns:${input.namespaceId}`,
    `ver:${input.namespaceVersion}`,
    `mode:${input.mode}`,
    `form:${formFingerprint}`,
    `pos:${positionSignature(input.form)}`,
  ].join('|')
}

function fingerprintValue(value: CljValue): string | null {
  switch (value.kind) {
    case 'nil':
      return 'nil'
    case 'boolean':
      return `boolean:${value.value ? 'true' : 'false'}`
    case 'number':
      return `number:${numberFingerprint(value.value)}`
    case 'string':
      return `string:${json(value.value)}`
    case 'character':
      return `character:${json(value.value)}`
    case 'keyword':
      return `keyword:${json(value.name)}`
    case 'symbol':
      return withMeta(`symbol:${json(value.name)}`, value.meta)
    case 'regex':
      return `regex:${json(value.pattern)}/${json(value.flags)}`
    case 'list':
      return withMeta(sequenceFingerprint('list', value.value), value.meta)
    case 'vector':
      return withMeta(sequenceFingerprint('vector', value.value), value.meta)
    case 'map':
      return withMeta(`map:[${fingerprintEntries(mapEntries(value))}]`, value.meta)
    case 'set':
      return `set:[${fingerprintSequence(setValues(value as CljSet))}]`
    case 'record':
      return `record:${json(value.ns)}/${json(value.recordType)}:[${fingerprintEntries(value.fields)}]`
    case 'cons': {
      const head = fingerprintValue(value.head)
      const tail = fingerprintValue(value.tail)
      return head === null || tail === null ? null : `cons:${head}:${tail}`
    }
    case 'reduced': {
      const inner = fingerprintValue(value.value)
      return inner === null ? null : `reduced:${inner}`
    }
    default:
      return null
  }
}

function sequenceFingerprint(kind: string, values: CljValue[]): string | null {
  const sequence = fingerprintSequence(values)
  return sequence === null ? null : `${kind}:[${sequence}]`
}

function fingerprintSequence(values: CljValue[]): string | null {
  const parts: string[] = []
  for (const value of values) {
    const part = fingerprintValue(value)
    if (part === null) return null
    parts.push(part)
  }
  return parts.join(',')
}

function fingerprintEntries(entries: [CljValue, CljValue][]): string | null {
  const parts: string[] = []
  for (const [key, value] of entries) {
    const keyPart = fingerprintValue(key)
    const valuePart = fingerprintValue(value)
    if (keyPart === null || valuePart === null) return null
    parts.push(`${keyPart}=>${valuePart}`)
  }
  return parts.join(',')
}

function withMeta(
  fingerprint: string | null,
  meta: CljMap | undefined
): string | null {
  if (fingerprint === null) return null
  if (meta === undefined) return fingerprint
  const metaFingerprint = fingerprintValue(meta)
  return metaFingerprint === null
    ? null
    : `${fingerprint}^meta:${metaFingerprint}`
}

function numberFingerprint(value: number): string {
  if (Object.is(value, -0)) return '-0'
  if (Number.isNaN(value)) return 'NaN'
  if (value === Infinity) return 'Infinity'
  if (value === -Infinity) return '-Infinity'
  return String(value)
}

function positionSignature(value: CljValue): string {
  const parts: string[] = []
  collectPositionSignature(value, parts)
  return parts.join(',')
}

function collectPositionSignature(value: CljValue, parts: string[]): void {
  parts.push(posFingerprint(getPos(value)))
  switch (value.kind) {
    case 'symbol':
    case 'list':
    case 'vector':
    case 'map':
      collectMetaPosition(value.meta, parts)
      break
  }

  switch (value.kind) {
    case 'list':
    case 'vector':
      for (const child of value.value) collectPositionSignature(child, parts)
      break
    case 'map':
      for (const [key, child] of value.entries) {
        collectPositionSignature(key, parts)
        collectPositionSignature(child, parts)
      }
      break
    case 'set':
      for (const child of setValues(value as CljSet)) collectPositionSignature(child, parts)
      break
    case 'record':
      for (const [key, child] of value.fields) {
        collectPositionSignature(key, parts)
        collectPositionSignature(child, parts)
      }
      break
    case 'cons':
      collectPositionSignature(value.head, parts)
      collectPositionSignature(value.tail, parts)
      break
    case 'reduced':
      collectPositionSignature(value.value, parts)
      break
  }
}

function collectMetaPosition(meta: CljMap | undefined, parts: string[]): void {
  if (meta !== undefined) collectPositionSignature(meta, parts)
}

function posFingerprint(pos: Pos | undefined): string {
  if (pos === undefined) return '-'
  return [
    pos.start,
    pos.end,
    pos.lineOffset ?? 0,
    pos.colOffset ?? 0,
    hashString(pos.source ?? ''),
  ].join(':')
}

function hashString(value: string): string {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function json(value: string): string {
  return JSON.stringify(value)
}
