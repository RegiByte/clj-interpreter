import {
  valueKeywords,
  type CljFunction,
  type CljList,
  type CljMap,
  type CljNativeFunction,
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
  symbol: string
): symbol is keyof typeof specialFormKeywords => symbol in specialFormKeywords
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
