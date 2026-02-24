import {
  valueKeywords,
  type CljBoolean,
  type CljFunction,
  type CljKeyword,
  type CljList,
  type CljMap,
  type CljNativeFunction,
  type CljNumber,
  type CljString,
  type CljSymbol,
  type CljValue,
  type CljVector,
} from './types.ts'
import { specialFormKeywords } from './evaluator.ts'

export const isFalsy = (value: CljValue): boolean => {
  if (value.kind === 'nil') return true
  if (value.kind === 'boolean') return !value.value
  return false
}
export const isTruthy = (value: CljValue): boolean => {
  return !isFalsy(value)
}
export const isSpecialForm = (
  value: CljValue
): value is CljSymbol & { name: keyof typeof specialFormKeywords } =>
  value.kind === 'symbol' && value.name in specialFormKeywords
export const isComment = (value: CljValue): boolean => value.kind === 'comment'
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
export const isMap = (value: CljValue): value is CljMap => value.kind === 'map'
export const isKeyword = (value: CljValue): value is CljKeyword =>
  value.kind === 'keyword'
export const isAFunction = (
  value: CljValue
): value is CljFunction | CljNativeFunction =>
  isFunction(value) || isNativeFunction(value)
export const isCollection = (
  value: CljValue
): value is CljList | CljVector | CljMap =>
  isVector(value) || isMap(value) || isList(value)

export const isCljValue = (value: any): value is CljValue => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind in valueKeywords
  )
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
}

export const isEqual = (a: CljValue, b: CljValue): boolean => {
  if (a.kind !== b.kind) return false

  const handler = equalityHandlers[a.kind as keyof typeof equalityHandlers]
  if (!handler) return false
  return handler(a as never, b as never)
}
