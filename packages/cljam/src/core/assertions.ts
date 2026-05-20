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
  type CljMapEntry,
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
import { isEqual } from './persistent/equality.ts'
export { isEqual }

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
export const isMapEntry = (value: CljValue): value is CljMapEntry =>
  isVector(value) && value.__cljamMapEntry === true
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
  isVector(value) ||
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

export const isString = (value: CljValue): value is CljString =>
  value.kind === 'string'
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
  mapEntry: isMapEntry,
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
