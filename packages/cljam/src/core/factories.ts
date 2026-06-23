import { jsToClj } from './conversions'
import { EvaluationError } from './errors'
import type {
  Arity,
  CljAtom,
  CljBoolean,
  CljChar,
  CljCons,
  CljDelay,
  CljFunction,
  CljIndexedSeq,
  CljJsValue,
  CljKeyword,
  CljLazySeq,
  CljList,
  CljMacro,
  CljMap,
  CljMapEntry,
  CljMultiMethod,
  CljNamespace,
  CljNativeFunction,
  CljNil,
  CljNumber,
  CljPending,
  CljProtocol,
  CljProtocolMethod,
  CljRecord,
  CljReduced,
  CljRegex,
  CljSet,
  CljString,
  CljSymbol,
  CljValue,
  CljVar,
  CljVector,
  CljVolatile,
  Env,
  EvaluationContext,
} from './types'
import {
  cljMap as _cljMap,
  makeCljMap,
  makeCljSet,
} from './persistent/map-helpers'
import {
  cljVector as _cljVector,
  makeCljVector,
} from './persistent/vector-helpers'

export const cljNumber = <T extends number>(value: T) =>
  ({ kind: 'number', value }) as const satisfies CljNumber
export const cljString = <T extends string>(value: T) =>
  ({ kind: 'string', value }) as const satisfies CljString
export const cljChar = (value: string): CljChar => ({
  kind: 'character',
  value,
})
export const cljBoolean = <T extends boolean>(value: T) =>
  ({ kind: 'boolean', value }) as const satisfies CljBoolean
export const cljKeyword = <T extends string>(name: T) =>
  ({ kind: 'keyword', name }) as const satisfies CljKeyword
export const cljAutoKeyword = <T extends string>(name: T) =>
  ({
    kind: 'keyword',
    name: name.startsWith(':') ? name : `:${name}`,
  }) as const satisfies CljKeyword
export const cljNil = () =>
  ({ kind: 'nil', value: null }) as const satisfies CljNil
export const cljSymbol = <T extends string>(name: T) =>
  ({ kind: 'symbol', name }) as const satisfies CljSymbol
export const cljList = <T extends CljValue[]>(value: T) =>
  ({ kind: 'list', value }) as const satisfies CljList
export const cljSet = (values: CljValue[]): CljSet => makeCljSet(values)
export const cljVector = (value: CljValue[]): CljVector => _cljVector(value)
export const cljMapEntry = (key: CljValue, value: CljValue): CljMapEntry =>
  // Map entries are always length-2 → array rep (gotchas.md #2); carry the marker.
  makeCljVector({ kind: 'array', items: [key, value] }, undefined, true) as CljMapEntry

// ─── CljMap factory (implementation lives in persistent/map-helpers.ts) ───────

export { makeCljMap }

/** Returns a new value with the given metadata attached.
 *  CljMap and CljVector are handled specially because their compatibility getters
 *  (`entries` / `value`) live on the prototype — object-spread would strip them.
 *  All other IMeta types are plain objects where `{ ...val, meta }` is safe. */
export function cljWithMeta(
  val: CljValue,
  meta: CljMap | undefined
): CljValue {
  if (val.kind === 'map') {
    return makeCljMap((val as CljMap)._data, meta)
  }
  if (val.kind === 'vector') {
    const vec = val as CljVector
    return makeCljVector(vec._data, meta, vec.__cljamMapEntry)
  }
  return { ...val, meta } as CljValue
}

export const cljMap = _cljMap
export const cljFunction = (
  params: CljSymbol[],
  restParam: CljSymbol | null,
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
  params: CljSymbol[],
  restParam: CljSymbol | null,
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
export const cljDelay = (
  thunk: () => CljValue,
  thunkFn?: CljValue,
  callEnv?: Env
): CljDelay => ({
  kind: 'delay',
  thunk,
  thunkFn,
  callEnv,
  realized: false,
  value: undefined,
})
export const cljLazySeq = (
  thunk: () => CljValue,
  thunkFn?: CljValue,
  callEnv?: Env
): CljLazySeq => ({
  kind: 'lazy-seq',
  thunk,
  thunkFn,
  callEnv,
  realized: false,
  value: undefined,
})
export const cljCons = (head: CljValue, tail: CljValue): CljCons => ({
  kind: 'cons',
  head,
  tail,
})
// The SOLE constructor for an indexed-seq view. Normalizes an empty/exhausted
// view → nil so the "a seq is never empty" invariant holds by construction.
export const cljIndexedSeq = (
  array: CljValue[],
  offset = 0
): CljIndexedSeq | CljNil =>
  offset >= array.length
    ? cljNil()
    : { kind: 'indexed-seq', array, offset }
export const cljNamespace = (name: string): CljNamespace => ({
  kind: 'namespace',
  name,
  version: 0,
  vars: new Map(),
  aliases: new Map(),
  readerAliases: new Map(),
})

export const cljJsValue = (value: unknown): CljJsValue => ({
  kind: 'js-value',
  value,
})

export const cljProtocol = (
  name: string,
  ns: string,
  fns: CljProtocolMethod[],
  doc?: string
): CljProtocol => ({
  kind: 'protocol',
  name,
  ns,
  fns,
  doc,
  impls: new Map(),
})

export const cljRecord = (
  recordType: string,
  ns: string,
  fields: [CljValue, CljValue][]
): CljRecord => ({
  kind: 'record',
  recordType,
  ns,
  fields,
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
  /** Attach metadata. */
  withMeta(meta: [CljValue, CljValue][]): NativeFnBuilder
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

/**
 * Takes an existing meta map and merges
 */
function mergeDocMeta(newMap: CljMap, existingMap: CljMap | undefined): CljMap {
  let baseMap = existingMap ?? cljMap([])
  for (const [key, value] of newMap.entries) {
    // Only keywords are allowed in meta maps
    if (key.kind !== 'keyword') continue
    const existing = baseMap.entries.find(
      ([k]) => k.kind === 'keyword' && k.name === key.name
    )
    if (existing) {
      baseMap = cljMap(
        [...baseMap.entries].filter(
          ([k]) => k.kind !== 'keyword' || k.name !== (key as CljKeyword).name
        )
      )
    }
    baseMap = cljMap([...baseMap.entries, [key, value]])
  }
  return baseMap
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
    withMeta(meta: [CljValue, CljValue][]): NativeFnBuilder {
      return makeNativeFnBuilder({
        ...plain,
        meta: mergeDocMeta(cljMap(meta), plain.meta),
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
  defaultMethod?: CljFunction | CljNativeFunction,
  defaultDispatchVal?: CljValue
): CljMultiMethod => ({
  kind: 'multi-method',
  name,
  dispatchFn,
  methods,
  defaultMethod,
  defaultDispatchVal,
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
  char: cljChar,
  boolean: cljBoolean,
  nil: cljNil,
  symbol: cljSymbol,
  keyword: cljKeyword,
  kw: cljKeyword,
  autoKeyword: cljAutoKeyword,

  // collections
  list: cljList,
  vector: cljVector,
  mapEntry: cljMapEntry,
  map: cljMap,
  set: cljSet,
  cons: cljCons,
  indexedSeq: cljIndexedSeq,

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
  protocol: cljProtocol,
  record: cljRecord,
}

type DocMetaOpts = {
  doc: string
  arglists?: string[][]
  docGroup?: string
  extra?: Record<string, CljValue | string | number | boolean>
}

export const docMeta = ({
  doc,
  arglists,
  docGroup,
  extra = {},
}: DocMetaOpts): [CljValue, CljValue][] => {
  const base = [
    [v.keyword(':doc'), v.string(doc)],
    ...(arglists
      ? ([
          [
            cljKeyword(':arglists'),
            cljVector(arglists.map((args) => cljVector(args.map(cljSymbol)))),
          ],
        ] as [CljValue, CljValue][])
      : []),
    ...(docGroup
      ? ([[cljKeyword(':doc-group'), cljString(docGroup)]] as [
          CljValue,
          CljValue,
        ][])
      : []),
  ]
  for (const [key, value] of Object.entries(extra)) {
    base.push([cljAutoKeyword(key), jsToClj(value)])
  }

  return base as [CljValue, CljValue][]
}

export const DocGroups = {
  runtime: 'Dev',
  interop: 'Interop',
  regex: 'Strings',
  introspection: 'Dev',
  utilities: 'Utilities',
  vars: 'Dev',
  io: 'IO',
  async: 'Async',
  arithmetic: 'Arithmetic',
  comparison: 'Comparison',
  edn: 'EDN',
  collections: 'Sequences',
  sequences: 'Sequences',
  transducers: 'Transducers',
  maps: 'Maps',
  predicates: 'Predicates',
  strings: 'Strings',
  control_flow: 'Control Flow',
  threading: 'Threading',
  higher_order: 'Higher-order',
  lazy: 'Sequences',
  atoms: 'State',
  errors: 'Errors',
  sets: 'Sequences',
  metadata: 'Metadata',
  hierarchy: 'Abstractions',
  dev: 'Dev',
  protocols: 'Abstractions',
  multimethods: 'Abstractions',
}
