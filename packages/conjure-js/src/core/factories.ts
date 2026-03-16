import { EvaluationError } from './errors'
import type {
  Arity,
  CljAtom,
  CljBoolean,
  CljCons,
  CljDelay,
  CljFunction,
  CljJsValue,
  CljKeyword,
  CljLazySeq,
  CljList,
  CljMacro,
  CljMap,
  CljMultiMethod,
  CljNamespace,
  CljNativeFunction,
  CljNil,
  CljNumber,
  CljPending,
  CljReduced,
  CljRegex,
  CljSet,
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
export const cljSet = (values: CljValue[]): CljSet => ({ kind: 'set', values })
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
  U extends (
    ctx: EvaluationContext,
    callEnv: Env,
    ...args: CljValue[]
  ) => CljValue,
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

export const cljVar = (
  ns: string,
  name: string,
  value: CljValue,
  meta?: CljMap
): CljVar => ({ kind: 'var', ns, name, value, meta })

export const cljAtom = (value: CljValue): CljAtom => ({ kind: 'atom', value })
export const cljReduced = (value: CljValue): CljReduced => ({
  kind: 'reduced',
  value,
})
export const cljVolatile = (value: CljValue): CljVolatile => ({
  kind: 'volatile',
  value,
})
export const cljDelay = (thunk: () => CljValue): CljDelay => ({
  kind: 'delay',
  thunk,
  realized: false,
})
export const cljLazySeq = (thunk: () => CljValue): CljLazySeq => ({
  kind: 'lazy-seq',
  thunk,
  realized: false,
})
export const cljCons = (head: CljValue, tail: CljValue): CljCons => ({
  kind: 'cons',
  head,
  tail,
})
export const cljNamespace = (name: string): CljNamespace => ({
  kind: 'namespace',
  name,
  vars: new Map(),
  aliases: new Map(),
  readerAliases: new Map(),
})

export const cljJsValue = (value: unknown): CljJsValue => ({
  kind: 'js-value',
  value,
})

// --- ASYNC (experimental) ---
export const cljPending = (promise: Promise<CljValue>): CljPending => {
  const pending: CljPending = { kind: 'pending', promise }
  // Track fulfillment so the printer can show #<Pending @val> when already settled.
  promise.then(
    (v) => {
      pending.resolved = true
      pending.resolvedValue = v
    },
    () => {
      /* rejection — no resolved state; printer shows #<Pending> */
    }
  )
  return pending
}
// --- END ASYNC ---

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

// ---------------------------------------------------------------------------
// NativeFnBuilder — fluent construction API for native functions
//
// Satisfies CljNativeFunction structurally, so it can be stored in any
// registry or record that expects CljNativeFunction — no .build() call needed.
// ---------------------------------------------------------------------------

export type NativeFnBuilder = CljNativeFunction & {
  /** Attach doc-string and optional arglists metadata. */
  doc(text: string, arglists?: string[][]): NativeFnBuilder
}

function buildDocMeta(text: string, arglists?: string[][]): CljMap {
  return cljMap([
    [cljKeyword(':doc'), cljString(text)],
    ...(arglists
      ? ([
          [
            cljKeyword(':arglists'),
            cljVector(arglists.map((args) => cljVector(args.map(cljSymbol)))),
          ],
        ] as [CljValue, CljValue][])
      : []),
  ])
}

function makeNativeFnBuilder(def: CljNativeFunction): NativeFnBuilder {
  // Reconstruct a plain CljNativeFunction explicitly so that the spread
  // inside .doc() never accidentally picks up builder methods from a previous
  // clone round.
  const plain: CljNativeFunction = {
    kind: 'native-function',
    name: def.name,
    fn: def.fn,
    ...(def.fnWithContext !== undefined
      ? { fnWithContext: def.fnWithContext }
      : {}),
    ...(def.meta !== undefined ? { meta: def.meta } : {}),
  }

  return {
    ...plain,
    doc(text: string, arglists?: string[][]): NativeFnBuilder {
      return makeNativeFnBuilder({
        ...plain,
        meta: buildDocMeta(text, arglists),
      })
    },
  }
}

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

// ---------------------------------------------------------------------------
// v — unified value factory namespace
//
// Mirrors the cljXxx standalone functions but collected under one object so
// stdlib files need only a single import.  Primitive factories are thin
// aliases; nativeFn / nativeFnCtx return a NativeFnBuilder with .doc().
// ---------------------------------------------------------------------------

export const v = {
  // primitives
  number: cljNumber,
  string: cljString,
  boolean: cljBoolean,
  keyword: cljKeyword,
  nil: cljNil,
  symbol: cljSymbol,
  kw: cljKeyword,

  // collections
  list: cljList,
  vector: cljVector,
  map: cljMap,
  set: cljSet,
  cons: cljCons,

  // callables
  function: cljFunction,
  multiArityFunction: cljMultiArityFunction,
  macro: cljMacro,
  multiArityMacro: cljMultiArityMacro,
  multiMethod: cljMultiMethod,

  // fluent native function builders
  nativeFn(
    name: string,
    fn: (...args: CljValue[]) => CljValue
  ): NativeFnBuilder {
    return makeNativeFnBuilder({ kind: 'native-function', name, fn })
  },
  nativeFnCtx(
    name: string,
    fn: (ctx: EvaluationContext, callEnv: Env, ...args: CljValue[]) => CljValue
  ): NativeFnBuilder {
    return makeNativeFnBuilder({
      kind: 'native-function',
      name,
      fn: () => {
        throw new EvaluationError('Native function called without context', {
          name,
        })
      },
      fnWithContext: fn,
    })
  },

  // other value types
  var: cljVar,
  atom: cljAtom,
  regex: cljRegex,
  reduced: cljReduced,
  volatile: cljVolatile,
  delay: cljDelay,
  lazySeq: cljLazySeq,
  namespace: cljNamespace,
  pending: cljPending,
  jsValue: cljJsValue,
}
