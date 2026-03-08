import { EvaluationError } from './errors'
import type {
  Arity,
  CljAtom,
  CljBoolean,
  CljFunction,
  CljKeyword,
  CljList,
  CljMacro,
  CljMap,
  CljMultiMethod,
  CljNativeFunction,
  CljNil,
  CljNumber,
  CljReduced,
  CljRegex,
  CljString,
  CljSymbol,
  CljValue,
  CljVar,
  CljVector,
  CljVolatile,
  DestructurePattern,
  Env,
  EvaluationContext,
} from './types'

export const cljNumber = <T extends number>(value: T) =>
  ({ kind: 'number', value }) as const satisfies CljNumber
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
export const cljFunction = (
  params: DestructurePattern[],
  restParam: DestructurePattern | null,
  body: CljValue[],
  env: Env
): CljFunction => ({
  kind: 'function',
  arities: [{ params, restParam, body }],
  env,
})
export const cljMultiArityFunction = (
  arities: Arity[],
  env: Env
): CljFunction => ({
  kind: 'function',
  arities,
  env,
})
export const cljNativeFunction = <
  T extends string,
  U extends (...args: CljValue[]) => CljValue,
>(
  name: T,
  fn: U
) =>
  ({ kind: 'native-function', name, fn }) as const satisfies CljNativeFunction
export const cljNativeFunctionWithContext = <
  T extends string,
  U extends (ctx: EvaluationContext, callEnv: Env, ...args: CljValue[]) => CljValue,
>(
  name: T,
  fn: U
) =>
  ({
    kind: 'native-function',
    name,
    // for now wrap this, we won't use it
    fn: () => {
      throw new EvaluationError('Native function called without context', {
        name,
      })
    },
    fnWithContext: fn,
  }) as const satisfies CljNativeFunction

export const cljMacro = (
  params: DestructurePattern[],
  restParam: DestructurePattern | null,
  body: CljValue[],
  env: Env
): CljMacro => ({
  kind: 'macro',
  arities: [{ params, restParam, body }],
  env,
})
export const cljMultiArityMacro = (arities: Arity[], env: Env): CljMacro => ({
  kind: 'macro',
  arities,
  env,
})

export const cljRegex = (pattern: string, flags: string = ''): CljRegex => ({
  kind: 'regex',
  pattern,
  flags,
})

export const cljVar = (ns: string, name: string, value: CljValue, meta?: CljMap): CljVar =>
  ({ kind: 'var', ns, name, value, meta })

export const cljAtom = (value: CljValue): CljAtom => ({ kind: 'atom', value })
export const cljReduced = (value: CljValue): CljReduced => ({
  kind: 'reduced',
  value,
})
export const cljVolatile = (value: CljValue): CljVolatile => ({
  kind: 'volatile',
  value,
})

export const withDoc = <T extends CljNativeFunction | CljFunction>(
  fn: T,
  doc: string,
  arglists?: string[][]
): T => ({
  ...fn,
  meta: cljMap([
    [cljKeyword(':doc'), cljString(doc)],
    ...(arglists
      ? ([
          [
            cljKeyword(':arglists'),
            cljVector(arglists.map((args) => cljVector(args.map(cljSymbol)))),
          ],
        ] as [CljValue, CljValue][])
      : []),
  ]),
})

export const cljMultiMethod = (
  name: string,
  dispatchFn: CljFunction | CljNativeFunction,
  methods: Array<{
    dispatchVal: CljValue
    fn: CljFunction | CljNativeFunction
  }>,
  defaultMethod?: CljFunction | CljNativeFunction
): CljMultiMethod => ({
  kind: 'multi-method',
  name,
  dispatchFn,
  methods,
  defaultMethod,
})
