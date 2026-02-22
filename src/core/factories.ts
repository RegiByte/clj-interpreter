import type {
  CljBoolean,
  CljComment,
  CljFunction,
  CljKeyword,
  CljList,
  CljMap,
  CljNativeFunction,
  CljNil,
  CljNumber,
  CljString,
  CljSymbol,
  CljValue,
  CljVector,
  Env,
} from './types'

export const cljNumber = <T extends number>(value: T) =>
  ({ kind: 'number', value }) as const satisfies CljNumber
export const cljComment = <T extends string>(value: T) =>
  ({ kind: 'comment', value }) as const satisfies CljComment
export const cljString = <T extends string>(value: T) =>
  ({ kind: 'string', value }) as const satisfies CljString
export const cljBoolean = <T extends boolean>(value: T) =>
  ({ kind: 'boolean', value }) as const satisfies CljBoolean
export const cljKeyword = <T extends string>(name: T) =>
  ({ kind: 'keyword', name }) as const satisfies CljKeyword
export const cljNil = () =>
  ({ kind: 'nil', value: null }) as const satisfies CljNil
export const cljSymbol = <T extends string>(name: T) =>
  ({ kind: 'symbol', name }) as const satisfies CljSymbol
export const cljList = <T extends CljValue[]>(value: T) =>
  ({ kind: 'list', value }) as const satisfies CljList
export const cljVector = <T extends CljValue[]>(value: T) =>
  ({ kind: 'vector', value }) as const satisfies CljVector
export const cljMap = <T extends [CljValue, CljValue][]>(entries: T) =>
  ({ kind: 'map', entries }) as const satisfies CljMap
export const cljFunction = <T extends CljSymbol[], U extends CljValue[]>(
  params: T,
  body: U,
  env: Env
) => ({ kind: 'function', params, body, env }) as const satisfies CljFunction
export const cljNativeFunction = <
  T extends string,
  U extends (...args: CljValue[]) => CljValue,
>(
  name: T,
  fn: U
) =>
  ({ kind: 'native-function', name, fn }) as const satisfies CljNativeFunction
