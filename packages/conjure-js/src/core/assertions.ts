import {
  valueKeywords,
  type CljAtom,
  type CljBoolean,
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
  type CljReduced,
  type CljRegex,
  type CljSet,
  type CljString,
  type CljSymbol,
  type CljValue,
  type CljVar,
  type CljVector,
  type CljVolatile,
} from './types.ts'
import { specialFormKeywords } from './evaluator/special-forms.ts'

export const isNil = (value: CljValue): boolean => value.kind === 'nil'
export const isBoolean = (value: CljValue): value is CljBoolean =>
  value.kind === 'boolean'
export const isFalsy = (value: CljValue): boolean => {
  if (value.kind === 'nil') return true
  if (isBoolean(value)) return !value.value
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
  isAFunction(value) || isKeyword(value) || isMap(value) ||
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
export const isCollection = (
  value: CljValue
): value is CljList | CljVector | CljMap | CljSet | CljCons =>
  isVector(value) ||
  isMap(value) ||
  isList(value) ||
  isSet(value) ||
  isCons(value)

export const isSeqable = (
  value: CljValue
): value is
  | CljList
  | CljVector
  | CljMap
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

const equalityHandlers = {
  [valueKeywords.number]: (a: CljNumber, b: CljNumber) => a.value === b.value,
  [valueKeywords.string]: (a: CljString, b: CljString) => a.value === b.value,
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
}

export const isString = (value: CljValue): value is CljString =>
  value.kind === 'string'
export const isEqual = (a: CljValue, b: CljValue): boolean => {
  if (a.kind !== b.kind) return false

  const handler = equalityHandlers[a.kind as keyof typeof equalityHandlers]
  if (!handler) return false
  return handler(a as never, b as never)
}
export const isNumber = (value: CljValue): value is CljNumber =>
  value.kind === 'number'

// Main assertion interface for the entire package
export const is = {
  nil: isNil,
  number: isNumber,
  string: isString,
  boolean: isBoolean,
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
  collection: isCollection,
  seqable: isSeqable,
  cljValue: isCljValue,
  equal: isEqual,
  jsValue: isJsValue,
}
