import { is } from './assertions'
import { EvaluationError } from './errors'
import { v } from './factories'
import { valueKeywords } from './keywords'
import { setValues } from './persistent/map-helpers'
import { vectorToArray } from './persistent/vector-helpers'
import { getPrintContext, printString } from './printer'
import {
  type CljCons,
  type CljDelay,
  type CljLazySeq,
  type CljMultiMethod,
  type CljSet,
  type CljValue,
  type Env,
  type EvaluationContext,
} from './types'

export function valueToString(value: CljValue): string {
  switch (value.kind) {
    case valueKeywords.string:
      return value.value
    case valueKeywords.character:
      return value.value // raw JS character — (str \a \b) → "ab"
    case valueKeywords.number:
      return value.value.toString()
    case valueKeywords.boolean:
      return value.value ? 'true' : 'false'
    case valueKeywords.keyword:
      return value.name
    case valueKeywords.symbol:
      return value.name
    case valueKeywords.list: {
      const { printLength } = getPrintContext()
      const items =
        printLength !== null ? value.value.slice(0, printLength) : value.value
      const suffix =
        printLength !== null && value.value.length > printLength ? ' ...' : ''
      return `(${items.map(valueToString).join(' ')}${suffix})`
    }
    case valueKeywords.vector: {
      const { printLength } = getPrintContext()
      const items =
        printLength !== null ? value.value.slice(0, printLength) : value.value
      const suffix =
        printLength !== null && value.value.length > printLength ? ' ...' : ''
      return `[${items.map(valueToString).join(' ')}${suffix}]`
    }
    case valueKeywords.map: {
      const { printLength } = getPrintContext()
      const entries =
        printLength !== null
          ? value.entries.slice(0, printLength)
          : value.entries
      const suffix =
        printLength !== null && value.entries.length > printLength ? ' ...' : ''
      return `{${entries.map(([key, v]) => `${valueToString(key)} ${valueToString(v)}`).join(' ')}${suffix}}`
    }
    case valueKeywords.set: {
      const { printLength } = getPrintContext()
      const allItems = setValues(value as CljSet)
      const items = printLength !== null ? allItems.slice(0, printLength) : allItems
      const suffix = printLength !== null && allItems.length > printLength ? ' ...' : ''
      return `#{${items.map(valueToString).join(' ')}${suffix}}`
    }
    case valueKeywords.function: {
      if (value.arities.length === 1) {
        const a = value.arities[0]
        const params = a.restParam
          ? [...a.params, v.symbol('&'), a.restParam]
          : a.params
        return `(fn [${params.map(valueToString).join(' ')}] ${a.body.map(valueToString).join(' ')})`
      }
      const clauses = value.arities.map((a) => {
        const params = a.restParam
          ? [...a.params, v.symbol('&'), a.restParam]
          : a.params
        return `([${params.map(valueToString).join(' ')}] ${a.body.map(valueToString).join(' ')})`
      })
      return `(fn ${clauses.join(' ')})`
    }
    case valueKeywords.nativeFunction:
      return `(native-fn ${value.name})`
    case valueKeywords.nil:
      return 'nil'
    // Matches Clojure's Pattern.toString() behavior: returns the pattern string
    // prefixed with inline flags if present, e.g. (?i)hello
    case valueKeywords.regex: {
      const prefix = value.flags ? `(?${value.flags})` : ''
      return `${prefix}${value.pattern}`
    }
    case valueKeywords.delay:
      return value.realized
        ? `#<Delay @${valueToString(value.value!)}>`
        : '#<Delay pending>'
    case valueKeywords.lazySeq: {
      const realized = realizeLazySeq(value)
      if (is.nil(realized)) return '()'
      return valueToString(realized)
    }
    case valueKeywords.cons: {
      const items = consToArray(value)
      const { printLength } = getPrintContext()
      const visible = printLength !== null ? items.slice(0, printLength) : items
      const suffix =
        printLength !== null && items.length > printLength ? ' ...' : ''
      return `(${visible.map(valueToString).join(' ')}${suffix})`
    }
    case valueKeywords.namespace:
      return `#namespace[${value.name}]`
    case valueKeywords.protocol:
      return `#protocol[${value.ns}/${value.name}]`
    case valueKeywords.record: {
      const entries = value.fields
        .map(([k, val]) => `${valueToString(k)} ${valueToString(val)}`)
        .join(' ')
      return `#${value.ns}/${value.recordType}{${entries}}`
    }
    case valueKeywords.multiMethod:
      return `(multi-method ${(value as CljMultiMethod).name})`
    case valueKeywords.atom:
      return `#<Atom ${valueToString(value.value)}>`
    case valueKeywords.reduced:
      return `#<Reduced ${valueToString(value.value)}>`
    case valueKeywords.volatile:
      return `#<Volatile ${valueToString(value.value)}>`
    case valueKeywords.var:
      return `#'${value.ns}/${value.name}`
    case valueKeywords.jsValue: {
      const raw = value.value
      if (raw === null) return 'null'
      if (raw === undefined) return 'undefined'
      if (raw instanceof Date) return raw.toISOString()
      if (typeof raw === 'function') return '#<js Function>'
      if (Array.isArray(raw)) return '#<js Array>'
      if (raw instanceof Promise) return '#<js Promise>'
      const typeName =
        (raw as { constructor?: { name?: string } }).constructor?.name ??
        'Object'
      return `#<js ${typeName}>`
    }
    case 'pending':
      if (value.resolved && value.resolvedValue !== undefined)
        return `#<Pending @${valueToString(value.resolvedValue)}>`
      return '#<Pending>'
    default:
      throw new EvaluationError(`unhandled value type: ${value.kind}`, {
        value,
      })
  }
}

/** Realize a delay: evaluate thunk once, cache result. */
export function realizeDelay(
  d: CljDelay,
  ctx?: EvaluationContext,
  callEnv?: Env
): CljValue {
  if (d.realized) return d.value!
  if (ctx && d.thunkFn) {
    d.value = ctx.applyCallable(d.thunkFn, [], d.callEnv ?? callEnv!)
  } else {
    d.value = d.thunk()
  }
  d.realized = true
  return d.value!
}

/** Realize a lazy-seq: evaluate thunk once, cache result. Trampolines through chained lazy-seqs. */
export function realizeLazySeq(
  ls: CljLazySeq,
  ctx?: EvaluationContext,
  callEnv?: Env
): CljValue {
  let current: CljValue = ls
  while (current.kind === 'lazy-seq') {
    const lazy = current as CljLazySeq
    if (lazy.realized) {
      current = lazy.value!
      continue
    }
    if (lazy.thunk) {
      if (ctx && lazy.thunkFn) {
        lazy.value = ctx.applyCallable(lazy.thunkFn, [], lazy.callEnv ?? callEnv!)
      } else {
        lazy.value = lazy.thunk()
      }
      lazy.thunk = null
      lazy.realized = true
      current = lazy.value!
    } else {
      return v.nil()
    }
  }
  return current
}

export const toSeq = (collection: CljValue): CljValue[] => {
  if (is.list(collection)) {
    return collection.value
  }
  if (is.vector(collection)) {
    return vectorToArray(collection)
  }
  if (is.map(collection)) {
    return collection.entries.map(([key, value]) => v.mapEntry(key, value))
  }
  if (is.record(collection)) {
    return collection.fields.map(([key, value]) => v.mapEntry(key, value))
  }
  if (is.set(collection)) {
    return setValues(collection)
  }
  if (is.string(collection)) {
    return [...collection.value].map(v.string)
  }
  if (is.lazySeq(collection)) {
    const realized = realizeLazySeq(collection)
    if (is.nil(realized)) return []
    return toSeq(realized)
  }
  if (is.cons(collection)) {
    return consToArray(collection)
  }
  if (is.indexedSeq(collection)) {
    return collection.array.slice(collection.offset)
  }
  throw new EvaluationError(
    `toSeq expects a collection or string, got ${printString(collection)}`,
    { collection }
  )
}

/** Walk a cons/lazy-seq chain into a flat array (trampoline, no recursion). */
export function consToArray(c: CljCons): CljValue[] {
  const result: CljValue[] = [c.head]
  let tail: CljValue = c.tail
  while (true) {
    if (is.nil(tail)) break
    if (is.cons(tail)) {
      result.push(tail.head)
      tail = tail.tail
      continue
    }
    if (is.lazySeq(tail)) {
      tail = realizeLazySeq(tail)
      continue
    }
    if (is.list(tail)) {
      result.push(...tail.value)
      break
    }
    if (is.vector(tail)) {
      result.push(...vectorToArray(tail))
      break
    }
    if (is.indexedSeq(tail)) {
      result.push(...tail.array.slice(tail.offset))
      break
    }
    // Other seqable types — fall through to toSeq
    result.push(...toSeq(tail))
    break
  }
  return result
}

/**
 * Stream a (possibly lazy) seq element-by-element, realizing exactly one cell
 * per step. Unlike `toSeq`/`consToArray`, the tail is never materialized up
 * front: a consumer that stops early (e.g. on `reduced`) leaves the rest of the
 * source unrealized. This is what lets `reduce`/`transduce` honor an
 * early-terminating transducer over a lazy source without forcing all of it.
 */
export function* streamSeq(collection: CljValue): Generator<CljValue> {
  let cur: CljValue = collection
  while (true) {
    if (is.lazySeq(cur)) {
      cur = realizeLazySeq(cur)
      continue
    }
    if (is.nil(cur)) return
    if (is.cons(cur)) {
      yield cur.head
      cur = cur.tail
      continue
    }
    if (is.list(cur)) {
      yield* cur.value
      return
    }
    if (is.vector(cur)) {
      yield* vectorToArray(cur)
      return
    }
    if (is.indexedSeq(cur)) {
      const { array, offset } = cur
      for (let i = offset; i < array.length; i++) yield array[i]
      return
    }
    // Other seqable types (map/record/set/string) — concrete, materialize.
    yield* toSeq(cur)
    return
  }
}
