import type {
  CljBoolean,
  CljComment,
  CljFunction,
  CljKeyword,
  CljList,
  CljMacro,
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
export const cljFunction = <
  TParams extends CljSymbol[],
  TRest extends CljSymbol | null,
  TBody extends CljValue[],
  TEnv extends Env,
>(
  params: TParams,
  restParam: TRest,
  body: TBody,
  env: TEnv
) =>
  ({
    kind: 'function',
    params,
    body,
    env,
    restParam,
  }) as const satisfies CljFunction
export const cljNativeFunction = <
  T extends string,
  U extends (...args: CljValue[]) => CljValue,
>(
  name: T,
  fn: U
) =>
  ({ kind: 'native-function', name, fn }) as const satisfies CljNativeFunction
export const cljMacro = <
  TParams extends CljSymbol[],
  TRest extends CljSymbol | null,
  TBody extends CljValue[],
  TEnv extends Env,
>(
  params: TParams,
  restParam: TRest,
  body: TBody,
  env: TEnv
) =>
  ({
    kind: 'macro',
    params,
    body,
    env,
    restParam,
  }) as const satisfies CljMacro
