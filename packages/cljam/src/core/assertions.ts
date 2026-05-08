import {
  type CljAtom,
  type CljBoolean,
  type CljChar,
  type CljCons,
  type CljDelay,
  type CljFunction,
  type CljJsValue,
  type CljKeyword,
  type CljLazySeq,
  type CljList,
  type CljMacro,
  type CljMap,
  type CljMultiMethod,
  type CljNamespace,
  type CljNativeFunction,
  type CljNumber,
  type CljPending,
  type CljProtocol,
  type CljReduced,
  type CljRecord,
  type CljRegex,
  type CljSet,
  type CljString,
  type CljSymbol,
  type CljValue,
  type CljVar,
  type CljVector,
  type CljVolatile,
} from './types.ts'

import { specialFormKeywords, valueKeywords } from './keywords.ts'

export const isNil = (value: CljValue): boolean => value.kind === 'nil'
export const isBoolean = (value: CljValue): value is CljBoolean =>
  value.kind === 'boolean'
export const isChar = (value: CljValue): value is CljChar =>
  value.kind === 'character'
export const isFalsy = (value: CljValue): boolean => {
  if (value.kind === 'nil') return true
  if (value.kind === 'boolean') return value.value === false
  return false
}
export const isTruthy = (value: CljValue): boolean => {
  return !isFalsy(value)
}
export const isSpecialForm = (
  value: CljValue
): value is CljSymbol & { name: keyof typeof specialFormKeywords } =>
  value.kind === 'symbol' && value.name in specialFormKeywords
export const isSymbol = (value: CljValue): value is CljSymbol =>
  value.kind === 'symbol'
export const isVector = (value: CljValue): value is CljVector =>
  value.kind === 'vector'
export const isList = (value: CljValue): value is CljList =>
  value.kind === 'list'
export const isFunction = (value: CljValue): value is CljFunction =>
  value.kind === 'function'
export const isNativeFunction = (value: CljValue): value is CljNativeFunction =>
  value.kind === 'native-function'
export const isMacro = (value: CljValue): value is CljMacro =>
  value.kind === 'macro'
export const isMap = (value: CljValue): value is CljMap => value.kind === 'map'
export const isKeyword = (value: CljValue): value is CljKeyword =>
  value.kind === 'keyword'
export const isAFunction = (
  value: CljValue
): value is CljFunction | CljNativeFunction =>
  isFunction(value) || isNativeFunction(value)

export const isJsValue = (value: CljValue): value is CljJsValue =>
  value.kind === 'js-value'

/** True for any value that can be invoked like a function (IFn). */
export const isCallable = (value: CljValue): boolean =>
  isAFunction(value) ||
  isKeyword(value) ||
  isMap(value) ||
  isRecord(value) ||
  isSet(value) ||
  isVar(value) ||
  (isJsValue(value) && typeof value.value === 'function')
export const isMultiMethod = (value: CljValue): value is CljMultiMethod =>
  value.kind === 'multi-method'
export const isAtom = (value: CljValue): value is CljAtom =>
  value.kind === 'atom'
export const isReduced = (value: CljValue): value is CljReduced =>
  value.kind === 'reduced'
export const isVolatile = (value: CljValue): value is CljVolatile =>
  value.kind === 'volatile'
export const isRegex = (value: CljValue): value is CljRegex =>
  value.kind === 'regex'
export const isVar = (value: CljValue): value is CljVar => value.kind === 'var'
export const isSet = (value: CljValue): value is CljSet =>
  value.kind === valueKeywords.set
export const isDelay = (value: CljValue): value is CljDelay =>
  value.kind === 'delay'
export const isLazySeq = (value: CljValue): value is CljLazySeq =>
  value.kind === 'lazy-seq'
export const isCons = (value: CljValue): value is CljCons =>
  value.kind === 'cons'
export const isNamespace = (value: CljValue): value is CljNamespace =>
  value.kind === 'namespace'
export const isProtocol = (value: CljValue): value is CljProtocol =>
  value.kind === 'protocol'
export const isRecord = (value: CljValue): value is CljRecord =>
  value.kind === 'record'
export const isCollection = (
  value: CljValue
): value is CljList | CljVector | CljMap | CljRecord | CljSet | CljCons =>
  isVector(value) ||
  isMap(value) ||
  isRecord(value) ||
  isList(value) ||
  isSet(value) ||
  isCons(value)

export const isSeqable = (
  value: CljValue
): value is
  | CljList
  | CljVector
  | CljMap
  | CljRecord
  | CljSet
  | CljString
  | CljLazySeq
  | CljCons =>
  isCollection(value) || value.kind === 'string' || isLazySeq(value)

export const isCljValue = (value: any): value is CljValue => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind in valueKeywords
  )
}

/** Realize a lazy-seq for equality comparison (trampoline to handle chains). */
function realizeLazySeqForEquality(ls: CljLazySeq): CljValue {
  let current: CljValue = ls
  while (current.kind === 'lazy-seq') {
    const lazy = current as CljLazySeq
    if (lazy.realized) {
      current = lazy.value!
    } else if (lazy.thunk) {
      lazy.value = lazy.thunk()
      lazy.thunk = null
      lazy.realized = true
      current = lazy.value!
    } else {
      // No thunk and not realized — treat as nil
      return { kind: 'nil', value: null }
    }
  }
  return current
}

/** Convert any sequential value (list, vector, cons, lazy-seq) to a flat JS array for equality.
 *  Returns null if the value is not sequential.
 *  Note: will not terminate on infinite lazy sequences — that matches Clojure semantics. */
function seqToArrayForEquality(value: CljValue): CljValue[] | null {
  if (value.kind === 'nil') return []
  if (value.kind === 'list' || value.kind === 'vector') {
    return (value as CljList | CljVector).value
  }
  if (value.kind === 'lazy-seq') {
    const realized = realizeLazySeqForEquality(value as CljLazySeq)
    return seqToArrayForEquality(realized)
  }
  if (value.kind === 'cons') {
    const result: CljValue[] = []
    let current: CljValue = value
    while (true) {
      if (current.kind === 'nil') break
      if (current.kind === 'cons') {
        result.push((current as CljCons).head)
        current = (current as CljCons).tail
        continue
      }
      if (current.kind === 'lazy-seq') {
        current = realizeLazySeqForEquality(current as CljLazySeq)
        continue
      }
      if (current.kind === 'list' || current.kind === 'vector') {
        result.push(...(current as CljList | CljVector).value)
        break
      }
      return null // non-sequential tail
    }
    return result
  }
  return null
}

const equalityHandlers = {
  [valueKeywords.number]: (a: CljNumber, b: CljNumber) => a.value === b.value,
  [valueKeywords.string]: (a: CljString, b: CljString) => a.value === b.value,
  [valueKeywords.character]: (a: CljChar, b: CljChar) => a.value === b.value,
  [valueKeywords.boolean]: (a: CljBoolean, b: CljBoolean) =>
    a.value === b.value,
  [valueKeywords.nil]: () => true,
  [valueKeywords.symbol]: (a: CljSymbol, b: CljSymbol) => a.name === b.name,
  [valueKeywords.keyword]: (a: CljKeyword, b: CljKeyword) => a.name === b.name,
  [valueKeywords.vector]: (a: CljVector, b: CljVector) => {
    if (a.value.length !== b.value.length) return false
    return a.value.every((value, index) => isEqual(value, b.value[index]))
  },
  [valueKeywords.map]: (a: CljMap, b: CljMap) => {
    if (a.entries.length !== b.entries.length) return false
    const uniqueKeys = new Set([
      ...a.entries.map(([key]) => key),
      ...b.entries.map(([key]) => key),
    ])
    for (const key of uniqueKeys) {
      const aEntry = a.entries.find(([k]) => isEqual(k, key))
      if (!aEntry) return false
      const bEntry = b.entries.find(([k]) => isEqual(k, key))
      if (!bEntry) return false
      if (!isEqual(aEntry[1], bEntry[1])) return false
    }
    return true
  },
  [valueKeywords.list]: (a: CljList, b: CljList) => {
    if (a.value.length !== b.value.length) return false
    return a.value.every((value, index) => isEqual(value, b.value[index]))
  },
  [valueKeywords.atom]: (a: CljAtom, b: CljAtom) => a === b,
  [valueKeywords.reduced]: (a: CljReduced, b: CljReduced) =>
    isEqual(a.value, b.value),
  [valueKeywords.volatile]: (a: CljVolatile, b: CljVolatile) => a === b,
  // Regex uses reference equality matching Clojure Pattern semantics:
  // (= #"foo" #"foo") => false — each literal is a distinct object
  [valueKeywords.regex]: (a: CljRegex, b: CljRegex) => a === b,
  [valueKeywords.var]: (a: CljVar, b: CljVar) => a === b,
  [valueKeywords.set]: (a: CljSet, b: CljSet) => {
    if (a.values.length !== b.values.length) return false
    return a.values.every((av) => b.values.some((bv) => isEqual(av, bv)))
  },
  [valueKeywords.delay]: (a: CljDelay, b: CljDelay) => a === b,
  [valueKeywords.lazySeq]: (a: CljLazySeq, b: CljLazySeq) => {
    // Realize both and compare structurally
    const aVal = realizeLazySeqForEquality(a)
    const bVal = realizeLazySeqForEquality(b)
    return isEqual(aVal, bVal)
  },
  [valueKeywords.cons]: (a: CljCons, b: CljCons) =>
    isEqual(a.head, b.head) && isEqual(a.tail, b.tail),
  [valueKeywords.namespace]: (a: CljNamespace, b: CljNamespace) => a === b,
  // Records are equal when they share the same qualified type and identical field values.
  [valueKeywords.record]: (a: CljRecord, b: CljRecord) => {
    if (a.ns !== b.ns || a.recordType !== b.recordType) return false
    if (a.fields.length !== b.fields.length) return false
    // Field order is canonical (set by the constructor) — compare positionally.
    return a.fields.every(([k, av], i) => {
      const [bk, bv] = b.fields[i]
      return isEqual(k, bk) && isEqual(av, bv)
    })
  },
}

export const isString = (value: CljValue): value is CljString =>
  value.kind === 'string'
export const isEqual = (a: CljValue, b: CljValue): boolean => {
  // Normalize lazy-seqs first — they realize to nil, cons, list, or vector
  if (a.kind === 'lazy-seq') {
    return isEqual(realizeLazySeqForEquality(a as CljLazySeq), b)
  }
  if (b.kind === 'lazy-seq') {
    return isEqual(a, realizeLazySeqForEquality(b as CljLazySeq))
  }

  // Cross-type sequential equality: lists, vectors, and cons cells all compare as ordered sequences.
  // In Clojure: (= [1 2 3] '(1 2 3)) => true, (= '(1 2) (cons 1 '(2))) => true
  const aIsSeq = a.kind === 'list' || a.kind === 'vector' || a.kind === 'cons'
  const bIsSeq = b.kind === 'list' || b.kind === 'vector' || b.kind === 'cons'
  if (aIsSeq && bIsSeq) {
    const aArr = seqToArrayForEquality(a)
    const bArr = seqToArrayForEquality(b)
    if (aArr === null || bArr === null) return false
    if (aArr.length !== bArr.length) return false
    return aArr.every((av, i) => isEqual(av, bArr![i]))
  }

  if (a.kind !== b.kind) return false

  const handler = equalityHandlers[a.kind as keyof typeof equalityHandlers]
  if (!handler) return false
  return handler(a as never, b as never)
}
export const isNumber = (value: CljValue): value is CljNumber =>
  value.kind === 'number'

export const isPending = (value: CljValue): value is CljPending =>
  value.kind === 'pending'

// Main assertion interface for the entire package
export const is = {
  nil: isNil,
  number: isNumber,
  string: isString,
  boolean: isBoolean,
  char: isChar,
  falsy: isFalsy,
  truthy: isTruthy,
  specialForm: isSpecialForm,
  symbol: isSymbol,
  vector: isVector,
  list: isList,
  function: isFunction,
  nativeFunction: isNativeFunction,
  macro: isMacro,
  map: isMap,
  keyword: isKeyword,
  aFunction: isAFunction,
  callable: isCallable,
  multiMethod: isMultiMethod,
  atom: isAtom,
  reduced: isReduced,
  volatile: isVolatile,
  regex: isRegex,
  var: isVar,
  set: isSet,
  delay: isDelay,
  lazySeq: isLazySeq,
  cons: isCons,
  namespace: isNamespace,
  protocol: isProtocol,
  record: isRecord,
  collection: isCollection,
  seqable: isSeqable,
  cljValue: isCljValue,
  equal: isEqual,
  jsValue: isJsValue,
  pending: isPending,
}
