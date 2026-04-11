import { is } from './assertions'
import { EvaluationError } from './errors'
import { v } from './factories'
import { valueKeywords } from './keywords'
import { getPrintContext, printString } from './printer'
import {
  type CljCons,
  type CljDelay,
  type CljLazySeq,
  type CljValue,
} from './types'

export function valueToString(value: CljValue): string {
  switch (value.kind) {
    case valueKeywords.string:
      return value.value
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
      const items =
        printLength !== null ? value.values.slice(0, printLength) : value.values
      const suffix =
        printLength !== null && value.values.length > printLength ? ' ...' : ''
      return `#{${items.map(valueToString).join(' ')}${suffix}}`
    }
    case valueKeywords.function: {
      if (value.arities.length === 1) {
        const a = value.arities[0]
        const params = a.restParam
          ? [...a.params, { kind: 'symbol' as const, name: '&' }, a.restParam]
          : a.params
        return `(fn [${params.map(valueToString).join(' ')}] ${a.body.map(valueToString).join(' ')})`
      }
      const clauses = value.arities.map((a) => {
        const params = a.restParam
          ? [...a.params, { kind: 'symbol' as const, name: '&' }, a.restParam]
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
export function realizeDelay(d: CljDelay): CljValue {
  if (d.realized) return d.value!
  d.value = d.thunk()
  d.realized = true
  return d.value!
}

/** Realize a lazy-seq: evaluate thunk once, cache result. Trampolines through chained lazy-seqs. */
export function realizeLazySeq(ls: CljLazySeq): CljValue {
  let current: CljValue = ls
  while (current.kind === 'lazy-seq') {
    const lazy = current as CljLazySeq
    if (lazy.realized) {
      current = lazy.value!
      continue
    }
    if (lazy.thunk) {
      lazy.value = lazy.thunk()
      lazy.thunk = null
      lazy.realized = true
      current = lazy.value!
    } else {
      return { kind: 'nil', value: null }
    }
  }
  return current
}

export const toSeq = (collection: CljValue): CljValue[] => {
  if (is.list(collection)) {
    return collection.value
  }
  if (is.vector(collection)) {
    return collection.value
  }
  if (is.map(collection)) {
    return collection.entries.map(([key, value]) => v.vector([key, value]))
  }
  if (is.set(collection)) {
    return collection.values
  }
  if (collection.kind === 'string') {
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
      result.push(...tail.value)
      break
    }
    // Other seqable types — fall through to toSeq
    result.push(...toSeq(tail))
    break
  }
  return result
}
