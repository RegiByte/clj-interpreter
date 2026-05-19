// Introspection: describe* — live describe system for all cljam values.
import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { DocGroups, docMeta, v } from '../../../factories'
import { setCount } from '../../../persistent/map-helpers'
import { printString } from '../../../printer'
import type {
  Arity,
  CljFunction,
  CljMacro,
  CljMap,
  CljNativeFunction,
  CljSet,
  CljValue,
  EvaluationContext,
  Env,
} from '../../../types'
import { allProtocols, typeTagOf } from './protocols'

// Keywords for describe*
const keywords = {
  kind: v.autoKeyword('kind'),
  name: v.autoKeyword('name'),
  fn: v.autoKeyword('fn'),
  nativeFn: v.autoKeyword('native-fn'),
  arglists: v.autoKeyword('arglists'),
  doc: v.autoKeyword('doc'),
  protocol: v.autoKeyword('protocol'),
  protocols: v.autoKeyword('protocols'),
  fields: v.autoKeyword('fields'),
  protocolFn: v.autoKeyword('protocol-fn'),
  methods: v.autoKeyword('methods'),
  dispatchVals: v.autoKeyword('dispatch-vals'),
  default: v.autoKeyword('default?'),
  multiMethod: v.autoKeyword('multi-method'),
  macro: v.autoKeyword('macro'),
  ns: v.autoKeyword('ns'),
  extenders: v.autoKeyword('extenders'),
  record: v.autoKeyword('record'),
  type: v.autoKeyword('type'),
  namespace: v.autoKeyword('namespace'),
  varCount: v.autoKeyword('var-count'),
  var: v.autoKeyword('var'),
  vars: v.autoKeyword('vars'),
  showing: v.autoKeyword('showing'),
  dynamic: v.autoKeyword('dynamic'),
  value: v.autoKeyword('value'),
  string: v.autoKeyword('string'),
  count: v.autoKeyword('count'),
  number: v.autoKeyword('number'),
  boolean: v.autoKeyword('boolean'),
  nil: v.autoKeyword('nil'),
  keyword: v.autoKeyword('keyword'),
  symbol: v.autoKeyword('symbol'),
  list: v.autoKeyword('list'),
  vector: v.autoKeyword('vector'),
  map: v.autoKeyword('map'),
  set: v.autoKeyword('set'),
  atom: v.autoKeyword('atom'),
  lazySeq: v.autoKeyword('lazy-seq'),
  cons: v.autoKeyword('cons'),
  regex: v.autoKeyword('regex'),
  delay: v.autoKeyword('delay'),
  reduced: v.autoKeyword('reduced'),
  derefKind: v.autoKeyword('deref-kind'),
  realized: v.autoKeyword('realized'),
  pattern: v.autoKeyword('pattern'),
  flags: v.autoKeyword('flags'),
}

// ---------------------------------------------------------------------------
// describe* helpers
// ---------------------------------------------------------------------------

function arglistsFromArities(arities: Arity[]): string[][] {
  return arities.map((arity) => {
    const params = arity.params.map((p) => printString(p as CljValue))
    if (arity.restParam) {
      return [...params, '&', printString(arity.restParam as CljValue)]
    }
    return params
  })
}

function arglistsFromFunction(fn: CljFunction): string[][] {
  return arglistsFromArities(fn.arities)
}

function arglistsFromNativeMeta(fn: CljNativeFunction): string[][] {
  const meta = fn.meta
  if (!meta) return []
  const alistsEntry = meta.entries.find(
    ([k]) => is.keyword(k) && k.name === ':arglists'
  )
  if (!alistsEntry) return []
  const alistsVal = alistsEntry[1]
  if (!is.vector(alistsVal)) return []
  return alistsVal.value
    .filter(is.vector)
    .map((alist) =>
      alist.value.map((s) => (is.symbol(s) ? s.name : printString(s)))
    )
}

function getMetaDoc(meta: CljMap | undefined): CljValue {
  if (!meta) return v.nil()
  const entry = meta.entries.find(([k]) => is.keyword(k) && k.name === ':doc')
  return entry ? entry[1] : v.nil()
}

function getMetaEntry(meta: CljMap | undefined, keyName: string): CljValue {
  if (!meta) return v.nil()
  const entry = meta.entries.find(([k]) => is.keyword(k) && k.name === keyName)
  return entry ? entry[1] : v.nil()
}

function isProtocolFn(fn: CljNativeFunction): boolean {
  return (
    fn.meta !== undefined &&
    fn.meta.entries.some(([k]) => is.keyword(k) && k.name === ':protocol')
  )
}

function shallowDescribeVarValue(value: CljValue): CljMap {
  switch (value.kind) {
    case 'function': {
      const arglists = arglistsFromFunction(value)
      return v.map([
        [keywords.kind, keywords.fn],
        ...(value.name
          ? ([[keywords.name, v.string(value.name)]] as [CljValue, CljValue][])
          : []),
        [
          keywords.arglists,
          v.vector(arglists.map((al) => v.vector(al.map(v.string)))),
        ],
        [keywords.doc, getMetaDoc(value.meta)],
      ])
    }
    case 'native-function': {
      if (isProtocolFn(value)) {
        return v.map([
          [keywords.kind, keywords.protocolFn],
          [keywords.name, v.string(value.name)],
          [keywords.protocol, getMetaEntry(value.meta, ':protocol')],
        ])
      }
      const arglists = arglistsFromNativeMeta(value)
      return v.map([
        [keywords.kind, keywords.nativeFn],
        [keywords.name, v.string(value.name)],
        [
          keywords.arglists,
          v.vector(arglists.map((al) => v.vector(al.map(v.string)))),
        ],
        [keywords.doc, getMetaDoc(value.meta)],
      ])
    }
    case 'protocol': {
      return v.map([
        [keywords.kind, keywords.protocol],
        [keywords.name, v.string(value.name)],
        [keywords.methods, v.vector(value.fns.map((fn) => v.string(fn.name)))],
      ])
    }
    case 'multi-method': {
      return v.map([
        [keywords.kind, keywords.multiMethod],
        [keywords.name, v.string(value.name)],
        [
          keywords.dispatchVals,
          v.vector(value.methods.map((m) => m.dispatchVal)),
        ],
        [keywords.default, v.boolean(value.defaultMethod !== undefined)],
      ])
    }
    case 'macro': {
      const arglists = arglistsFromArities((value as CljMacro).arities)
      return v.map([
        [keywords.kind, keywords.macro],
        ...(value.name
          ? ([[keywords.name, v.string(value.name)]] as [CljValue, CljValue][])
          : []),
        [
          keywords.arglists,
          v.vector(arglists.map((al) => v.vector(al.map(v.string)))),
        ],
        [keywords.doc, getMetaDoc((value as CljMacro).meta)],
      ])
    }
    default: {
      return v.map([[keywords.kind, v.kw(`:${value.kind}`)]])
    }
  }
}

function describeValue(
  ctx: EvaluationContext,
  value: CljValue,
  limit: number | null
): CljValue {
  switch (value.kind) {
    case 'protocol': {
      const extenders = [...value.impls.keys()].map((k) => v.keyword(`:${k}`))
      const methods = value.fns.map((fn) =>
        v.map([
          [keywords.name, v.string(fn.name)],
          [
            keywords.arglists,
            v.vector(fn.arglists.map((al) => v.vector(al.map(v.string)))),
          ],
          [keywords.doc, fn.doc !== undefined ? v.string(fn.doc) : v.nil()],
        ])
      )
      return v.map([
        [keywords.kind, keywords.protocol],
        [keywords.name, v.string(value.name)],
        [keywords.ns, v.string(value.ns)],
        [keywords.doc, value.doc !== undefined ? v.string(value.doc) : v.nil()],
        [keywords.methods, v.vector(methods)],
        [keywords.extenders, v.vector(extenders)],
      ])
    }

    case 'function': {
      const arglists = arglistsFromFunction(value)
      return v.map([
        [keywords.kind, keywords.fn],
        [
          keywords.name,
          value.name !== undefined ? v.string(value.name) : v.nil(),
        ],
        [
          keywords.arglists,
          v.vector(arglists.map((al) => v.vector(al.map(v.string)))),
        ],
        [keywords.doc, getMetaDoc(value.meta)],
      ])
    }

    case 'native-function': {
      if (isProtocolFn(value)) {
        const protocolStr = getMetaEntry(value.meta, ':protocol')
        const arglists: string[][] = []
        if (is.string(protocolStr)) {
          for (const proto of allProtocols(ctx)) {
            if (`${proto.ns}/${proto.name}` === protocolStr.value) {
              const methodDef = proto.fns.find((f) => f.name === value.name)
              if (methodDef) arglists.push(...methodDef.arglists)
              break
            }
          }
        }
        return v.map([
          [keywords.kind, keywords.protocolFn],
          [keywords.name, v.string(value.name)],
          [keywords.protocol, protocolStr],
          [
            keywords.arglists,
            v.vector(arglists.map((al) => v.vector(al.map(v.string)))),
          ],
        ])
      }
      const arglists = arglistsFromNativeMeta(value)
      return v.map([
        [keywords.kind, keywords.nativeFn],
        [keywords.name, v.string(value.name)],
        [
          keywords.arglists,
          v.vector(arglists.map((al) => v.vector(al.map(v.string)))),
        ],
        [keywords.doc, getMetaDoc(value.meta)],
      ])
    }

    case 'multi-method': {
      return v.map([
        [keywords.kind, keywords.multiMethod],
        [keywords.name, v.string(value.name)],
        [
          keywords.dispatchVals,
          v.vector(value.methods.map((m) => m.dispatchVal)),
        ],
        [keywords.default, v.boolean(value.defaultMethod !== undefined)],
      ])
    }

    case 'record': {
      const typeTag = typeTagOf(value)
      const protocols: CljValue[] = []
      for (const proto of allProtocols(ctx)) {
        if (proto.impls.has(typeTag)) {
          protocols.push(v.keyword(`:${proto.ns}/${proto.name}`))
        }
      }
      return v.map([
        [keywords.kind, keywords.record],
        [keywords.type, v.keyword(`:${value.ns}/${value.recordType}`)],
        [keywords.ns, v.string(value.ns)],
        [keywords.name, v.string(value.recordType)],
        [keywords.fields, v.map(value.fields)],
        [keywords.protocols, v.vector(protocols)],
      ])
    }

    case 'namespace': {
      const allVarsEntries = [...value.vars.entries()]
      const totalCount = allVarsEntries.length
      const truncated = limit !== null && totalCount > limit
      const limited = truncated
        ? allVarsEntries.slice(0, limit!)
        : allVarsEntries
      const varEntries: [CljValue, CljValue][] = limited.map(
        ([name, varDecl]) => [
          v.string(name),
          shallowDescribeVarValue(varDecl.value),
        ]
      )
      return v.map([
        [keywords.kind, keywords.namespace],
        [keywords.name, v.string(value.name)],
        [keywords.doc, value.doc !== undefined ? v.string(value.doc) : v.nil()],
        [keywords.varCount, v.number(totalCount)],
        ...(truncated
          ? ([[keywords.showing, v.number(limit!)]] as [CljValue, CljValue][])
          : []),
        [keywords.vars, v.map(varEntries)],
      ])
    }

    case 'var': {
      return v.map([
        [keywords.kind, keywords.var],
        [keywords.ns, v.string(value.ns)],
        [keywords.name, v.string(value.name)],
        [keywords.dynamic, v.boolean(value.dynamic ?? false)],
        [keywords.value, describeValue(ctx, value.value, null)],
      ])
    }

    case 'string':
      return v.map([
        [keywords.kind, keywords.string],
        [keywords.value, value],
        [keywords.count, v.number(value.value.length)],
      ])

    case 'number':
      return v.map([
        [keywords.kind, keywords.number],
        [keywords.value, value],
      ])

    case 'boolean':
      return v.map([
        [keywords.kind, keywords.boolean],
        [keywords.value, value],
      ])

    case 'nil':
      return v.map([[keywords.kind, keywords.nil]])

    case 'keyword': {
      const raw = value.name.slice(1)
      const slashIdx = raw.indexOf('/')
      return v.map([
        [keywords.kind, keywords.keyword],
        [
          keywords.name,
          v.string(slashIdx >= 0 ? raw.slice(slashIdx + 1) : raw),
        ],
        [
          keywords.ns,
          slashIdx >= 0 ? v.string(raw.slice(0, slashIdx)) : v.nil(),
        ],
      ])
    }

    case 'symbol': {
      const raw = value.name
      const slashIdx = raw.indexOf('/')
      return v.map([
        [keywords.kind, keywords.symbol],
        [
          keywords.name,
          v.string(slashIdx >= 0 ? raw.slice(slashIdx + 1) : raw),
        ],
        [
          keywords.ns,
          slashIdx >= 0 ? v.string(raw.slice(0, slashIdx)) : v.nil(),
        ],
      ])
    }

    case 'list':
      return v.map([
        [keywords.kind, keywords.list],
        [keywords.count, v.number(value.value.length)],
      ])

    case 'vector':
      return v.map([
        [keywords.kind, keywords.vector],
        [keywords.count, v.number(value.value.length)],
      ])

    case 'map':
      return v.map([
        [keywords.kind, keywords.map],
        [keywords.count, v.number(value.entries.length)],
      ])

    case 'set':
      return v.map([
        [keywords.kind, keywords.set],
        [keywords.count, v.number(setCount(value as CljSet))],
      ])

    case 'atom':
      return v.map([
        [keywords.kind, keywords.atom],
        [keywords.derefKind, v.kw(`:${value.value.kind}`)],
        [keywords.value, describeValue(ctx, value.value, null)],
      ])

    case 'lazy-seq':
      return v.map([
        [keywords.kind, keywords.lazySeq],
        [keywords.realized, v.boolean(value.realized)],
      ])

    case 'cons':
      return v.map([[keywords.kind, keywords.cons]])

    case 'regex':
      return v.map([
        [keywords.kind, keywords.regex],
        [keywords.pattern, v.string(value.pattern)],
        [keywords.flags, v.string(value.flags)],
      ])

    case 'delay':
      return v.map([
        [keywords.kind, keywords.delay],
        [keywords.realized, v.boolean(value.realized)],
      ])

    case 'macro': {
      const arglists = arglistsFromArities((value as CljMacro).arities)
      return v.map([
        [keywords.kind, keywords.macro],
        ...(value.name
          ? ([[keywords.name, v.string(value.name)]] as [CljValue, CljValue][])
          : []),
        [
          keywords.arglists,
          v.vector(arglists.map((al) => v.vector(al.map(v.string)))),
        ],
        [keywords.doc, getMetaDoc((value as CljMacro).meta)],
      ])
    }

    default: {
      return v.map([
        [keywords.kind, v.kw(`:${(value as { kind: string }).kind}`)],
      ])
    }
  }
}

// ---------------------------------------------------------------------------
// Native functions
// ---------------------------------------------------------------------------

export const introspectionFunctions: Record<string, CljValue> = {
  // -------------------------------------------------------------------------
  // describe* value [limit]
  // Returns a plain map describing any cljam value.
  // limit: CljNumber or CljNil — caps vars shown in namespace describes.
  // Called by the Clojure `describe` fn which reads *describe-limit*.
  // -------------------------------------------------------------------------
  'describe*': v
    .nativeFnCtx(
      'describe*',
      function describeNativeImpl(
        ctx: EvaluationContext,
        _callEnv: Env,
        valueVal: CljValue,
        limitVal?: CljValue
      ) {
        if (valueVal === undefined) {
          throw new EvaluationError('describe*: argument is required', {})
        }
        const limit =
          limitVal !== undefined && is.number(limitVal) ? limitVal.value : null
        return describeValue(ctx, valueVal, limit)
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns a plain map describing any cljam value. Called by describe — prefer using describe directly.',
        arglists: [['value'], ['value', 'limit']],
        docGroup: DocGroups.introspection,
        extra: {
          'no-doc': true,
        },
      }),
    ]),
}
