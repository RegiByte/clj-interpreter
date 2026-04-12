// Protocol system: make-protocol!, extend-protocol!, satisfies?, protocols, extenders
// Note: ns-name, find-ns, all-ns are owned by bootstrap.ts (wireNsCore), not here.
import { is } from '../../../assertions'
import { getNamespaceEnv, internVar } from '../../../env'
import { EvaluationError } from '../../../errors'
import { v } from '../../../factories'
import { printString } from '../../../printer'
import type {
  CljFunction,
  CljMap,
  CljNativeFunction,
  CljProtocol,
  CljValue,
  EvaluationContext,
  Env,
} from '../../../types'

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

/**
 * Compute the dispatch type tag for any CljValue.
 * Records get "ns/RecordType"; everything else gets its kind string.
 */
export function typeTagOf(value: CljValue): string {
  if (is.record(value)) return `${value.ns}/${value.recordType}`
  return value.kind
}

/**
 * Walk all loaded namespace vars and yield every CljProtocol found.
 * This is the reusable cross-namespace scanner: O(vars) but only needed
 * for `protocols` and `extenders` which are introspection paths, not hot paths.
 */
export function* allProtocols(
  ctx: EvaluationContext
): Generator<CljProtocol> {
  for (const ns of ctx.allNamespaces()) {
    for (const varDecl of ns.vars.values()) {
      if (is.protocol(varDecl.value)) yield varDecl.value
    }
  }
}

// Type name registry: Clojure symbol name → kind string.
// Used at macro-expansion time (via make-protocol!/extend-protocol!) to map
// type symbols like 'String to their kind tags like "string".
export const TYPE_NAME_REGISTRY: Record<string, string> = {
  nil: 'nil',
  String: 'string',
  Number: 'number',
  Boolean: 'boolean',
  Keyword: 'keyword',
  Symbol: 'symbol',
  List: 'list',
  Vector: 'vector',
  Map: 'map',
  Set: 'set',
  Function: 'function',
  NativeFunction: 'native-function',
  Atom: 'atom',
  LazySeq: 'lazy-seq',
  Cons: 'cons',
  Regex: 'regex',
  Var: 'var',
  JsValue: 'js-value',
}

// ---------------------------------------------------------------------------
// describe* helpers
// ---------------------------------------------------------------------------

/**
 * Extracts arglists from a user-defined function's arities.
 * Each arity becomes a string[] like ["x", "y"] or ["x", "&", "rest"].
 * Destructured params are rendered via printString: [[a b] c] → ["[a b]", "c"].
 */
function arglistsFromFunction(fn: CljFunction): string[][] {
  return fn.arities.map((arity) => {
    const params = arity.params.map((p) => printString(p as CljValue))
    if (arity.restParam) {
      return [...params, '&', printString(arity.restParam as CljValue)]
    }
    return params
  })
}

/**
 * Extracts arglists from a native function's :arglists meta entry.
 * Meta stores arglists as CljVector of CljVector of CljSymbol (from buildDocMeta).
 */
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
    .map((alist) => alist.value.map((s) => (is.symbol(s) ? s.name : printString(s))))
}

/**
 * Extracts :doc from a value's meta map. Returns CljNil if absent.
 */
function getMetaDoc(meta: CljMap | undefined): CljValue {
  if (!meta) return v.nil()
  const entry = meta.entries.find(([k]) => is.keyword(k) && k.name === ':doc')
  return entry ? entry[1] : v.nil()
}

/**
 * Returns a named entry value from a native fn's meta map, or nil.
 */
function getMetaEntry(meta: CljMap | undefined, keyName: string): CljValue {
  if (!meta) return v.nil()
  const entry = meta.entries.find(([k]) => is.keyword(k) && k.name === keyName)
  return entry ? entry[1] : v.nil()
}

/**
 * Returns true if the native fn is a protocol dispatch fn
 * (has :protocol key in its meta — stamped by make-protocol!).
 */
function isProtocolFn(fn: CljNativeFunction): boolean {
  return (
    fn.meta !== undefined &&
    fn.meta.entries.some(([k]) => is.keyword(k) && k.name === ':protocol')
  )
}

/**
 * Returns a compact describe map for a single var's value.
 * Used inside namespace describes — no ctx needed, no arglists for protocol fns.
 */
function shallowDescribeVarValue(value: CljValue): CljMap {
  switch (value.kind) {
    case 'function': {
      const arglists = arglistsFromFunction(value)
      return v.map([
        [v.kw(':kind'), v.kw(':fn')],
        ...(value.name
          ? ([[v.kw(':name'), v.string(value.name)]] as [CljValue, CljValue][])
          : []),
        [v.kw(':arglists'), v.vector(arglists.map((al) => v.vector(al.map(v.string))))],
        [v.kw(':doc'), getMetaDoc(value.meta)],
      ])
    }
    case 'native-function': {
      if (isProtocolFn(value)) {
        return v.map([
          [v.kw(':kind'), v.kw(':protocol-fn')],
          [v.kw(':name'), v.string(value.name)],
          [v.kw(':protocol'), getMetaEntry(value.meta, ':protocol')],
        ])
      }
      const arglists = arglistsFromNativeMeta(value)
      return v.map([
        [v.kw(':kind'), v.kw(':native-fn')],
        [v.kw(':name'), v.string(value.name)],
        [v.kw(':arglists'), v.vector(arglists.map((al) => v.vector(al.map(v.string))))],
        [v.kw(':doc'), getMetaDoc(value.meta)],
      ])
    }
    case 'protocol': {
      return v.map([
        [v.kw(':kind'), v.kw(':protocol')],
        [v.kw(':name'), v.string(value.name)],
        [v.kw(':methods'), v.vector(value.fns.map((fn) => v.string(fn.name)))],
      ])
    }
    case 'multi-method': {
      return v.map([
        [v.kw(':kind'), v.kw(':multi-method')],
        [v.kw(':name'), v.string(value.name)],
        [v.kw(':dispatch-vals'), v.vector(value.methods.map((m) => m.dispatchVal))],
        [v.kw(':default?'), v.boolean(value.defaultMethod !== undefined)],
      ])
    }
    case 'macro': {
      return v.map([
        [v.kw(':kind'), v.kw(':macro')],
        ...(value.name
          ? ([[v.kw(':name'), v.string(value.name)]] as [CljValue, CljValue][])
          : []),
      ])
    }
    default: {
      return v.map([[v.kw(':kind'), v.kw(`:${value.kind}`)]])
    }
  }
}

/**
 * Full describe implementation. Handles every CljValue kind.
 * Called by the describe* native fn.
 */
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
          [v.kw(':name'), v.string(fn.name)],
          [v.kw(':arglists'), v.vector(fn.arglists.map((al) => v.vector(al.map(v.string))))],
          [v.kw(':doc'), fn.doc !== undefined ? v.string(fn.doc) : v.nil()],
        ])
      )
      return v.map([
        [v.kw(':kind'), v.kw(':protocol')],
        [v.kw(':name'), v.string(value.name)],
        [v.kw(':ns'), v.string(value.ns)],
        [v.kw(':doc'), value.doc !== undefined ? v.string(value.doc) : v.nil()],
        [v.kw(':methods'), v.vector(methods)],
        [v.kw(':extenders'), v.vector(extenders)],
      ])
    }

    case 'function': {
      const arglists = arglistsFromFunction(value)
      return v.map([
        [v.kw(':kind'), v.kw(':fn')],
        [v.kw(':name'), value.name !== undefined ? v.string(value.name) : v.nil()],
        [v.kw(':arglists'), v.vector(arglists.map((al) => v.vector(al.map(v.string))))],
        [v.kw(':doc'), getMetaDoc(value.meta)],
      ])
    }

    case 'native-function': {
      if (isProtocolFn(value)) {
        const protocolStr = getMetaEntry(value.meta, ':protocol')
        // Look up this method's arglists from the protocol definition
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
          [v.kw(':kind'), v.kw(':protocol-fn')],
          [v.kw(':name'), v.string(value.name)],
          [v.kw(':protocol'), protocolStr],
          [v.kw(':arglists'), v.vector(arglists.map((al) => v.vector(al.map(v.string))))],
        ])
      }
      const arglists = arglistsFromNativeMeta(value)
      return v.map([
        [v.kw(':kind'), v.kw(':native-fn')],
        [v.kw(':name'), v.string(value.name)],
        [v.kw(':arglists'), v.vector(arglists.map((al) => v.vector(al.map(v.string))))],
        [v.kw(':doc'), getMetaDoc(value.meta)],
      ])
    }

    case 'multi-method': {
      return v.map([
        [v.kw(':kind'), v.kw(':multi-method')],
        [v.kw(':name'), v.string(value.name)],
        [v.kw(':dispatch-vals'), v.vector(value.methods.map((m) => m.dispatchVal))],
        [v.kw(':default?'), v.boolean(value.defaultMethod !== undefined)],
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
        [v.kw(':kind'), v.kw(':record')],
        [v.kw(':type'), v.keyword(`:${value.ns}/${value.recordType}`)],
        [v.kw(':ns'), v.string(value.ns)],
        [v.kw(':name'), v.string(value.recordType)],
        [v.kw(':fields'), v.map(value.fields)],
        [v.kw(':protocols'), v.vector(protocols)],
      ])
    }

    case 'namespace': {
      const allVarsEntries = [...value.vars.entries()]
      const totalCount = allVarsEntries.length
      const truncated = limit !== null && totalCount > limit
      const limited = truncated ? allVarsEntries.slice(0, limit!) : allVarsEntries
      const varEntries: [CljValue, CljValue][] = limited.map(([name, varDecl]) => [
        v.string(name),
        shallowDescribeVarValue(varDecl.value),
      ])
      return v.map([
        [v.kw(':kind'), v.kw(':namespace')],
        [v.kw(':name'), v.string(value.name)],
        [v.kw(':var-count'), v.number(totalCount)],
        ...(truncated
          ? ([[v.kw(':showing'), v.number(limit!)]] as [CljValue, CljValue][])
          : []),
        [v.kw(':vars'), v.map(varEntries)],
      ])
    }

    case 'var': {
      return v.map([
        [v.kw(':kind'), v.kw(':var')],
        [v.kw(':ns'), v.string(value.ns)],
        [v.kw(':name'), v.string(value.name)],
        [v.kw(':dynamic'), v.boolean(value.dynamic ?? false)],
        [v.kw(':value'), describeValue(ctx, value.value, null)],
      ])
    }

    case 'string':
      return v.map([
        [v.kw(':kind'), v.kw(':string')],
        [v.kw(':value'), value],
        [v.kw(':count'), v.number(value.value.length)],
      ])

    case 'number':
      return v.map([
        [v.kw(':kind'), v.kw(':number')],
        [v.kw(':value'), value],
      ])

    case 'boolean':
      return v.map([
        [v.kw(':kind'), v.kw(':boolean')],
        [v.kw(':value'), value],
      ])

    case 'nil':
      return v.map([[v.kw(':kind'), v.kw(':nil')]])

    case 'keyword': {
      const raw = value.name.slice(1)
      const slashIdx = raw.indexOf('/')
      return v.map([
        [v.kw(':kind'), v.kw(':keyword')],
        [v.kw(':name'), v.string(slashIdx >= 0 ? raw.slice(slashIdx + 1) : raw)],
        [v.kw(':ns'), slashIdx >= 0 ? v.string(raw.slice(0, slashIdx)) : v.nil()],
      ])
    }

    case 'symbol': {
      const raw = value.name
      const slashIdx = raw.indexOf('/')
      return v.map([
        [v.kw(':kind'), v.kw(':symbol')],
        [v.kw(':name'), v.string(slashIdx >= 0 ? raw.slice(slashIdx + 1) : raw)],
        [v.kw(':ns'), slashIdx >= 0 ? v.string(raw.slice(0, slashIdx)) : v.nil()],
      ])
    }

    case 'list':
      return v.map([
        [v.kw(':kind'), v.kw(':list')],
        [v.kw(':count'), v.number(value.value.length)],
      ])

    case 'vector':
      return v.map([
        [v.kw(':kind'), v.kw(':vector')],
        [v.kw(':count'), v.number(value.value.length)],
      ])

    case 'map':
      return v.map([
        [v.kw(':kind'), v.kw(':map')],
        [v.kw(':count'), v.number(value.entries.length)],
      ])

    case 'set':
      return v.map([
        [v.kw(':kind'), v.kw(':set')],
        [v.kw(':count'), v.number(value.values.length)],
      ])

    case 'atom':
      return v.map([
        [v.kw(':kind'), v.kw(':atom')],
        [v.kw(':deref-kind'), v.kw(`:${value.value.kind}`)],
      ])

    case 'lazy-seq':
      return v.map([
        [v.kw(':kind'), v.kw(':lazy-seq')],
        [v.kw(':realized'), v.boolean(value.realized)],
      ])

    case 'cons':
      return v.map([[v.kw(':kind'), v.kw(':cons')]])

    case 'regex':
      return v.map([
        [v.kw(':kind'), v.kw(':regex')],
        [v.kw(':pattern'), v.string(value.pattern)],
        [v.kw(':flags'), v.string(value.flags)],
      ])

    case 'delay':
      return v.map([
        [v.kw(':kind'), v.kw(':delay')],
        [v.kw(':realized'), v.boolean(value.realized)],
      ])

    case 'macro':
      return v.map([
        [v.kw(':kind'), v.kw(':macro')],
        ...(value.name
          ? ([[v.kw(':name'), v.string(value.name)]] as [CljValue, CljValue][])
          : []),
      ])

    default: {
      return v.map([[v.kw(':kind'), v.kw(`:${(value as { kind: string }).kind}`)]])
    }
  }
}

// ---------------------------------------------------------------------------
// Native functions
// ---------------------------------------------------------------------------

export const protocolFunctions: Record<string, CljValue> = {
  // -------------------------------------------------------------------------
  // make-protocol! name doc method-defs
  // Called by the defprotocol macro. Creates a CljProtocol, interns it as
  // a var, and interns one dispatch function per method — all in the current ns.
  //
  // method-defs: a CljVector of [name arglists doc?] CljVectors
  // -------------------------------------------------------------------------
  'make-protocol!': v
    .nativeFnCtx(
      'make-protocol!',
      function makeProtocolImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        nameVal: CljValue,
        docVal: CljValue,
        methodDefsVal: CljValue
      ) {
        if (!is.string(nameVal)) {
          throw new EvaluationError(
            `make-protocol!: name must be a string, got ${nameVal.kind}`,
            { nameVal }
          )
        }
        if (!is.vector(methodDefsVal)) {
          throw new EvaluationError(
            `make-protocol!: method-defs must be a vector, got ${methodDefsVal.kind}`,
            { methodDefsVal }
          )
        }

        const protocolName = nameVal.value
        const doc =
          is.string(docVal) ? docVal.value : undefined

        // Parse method definitions from [[name arglists doc?] ...]
        const fns: CljProtocol['fns'] = []
        for (const methodDef of methodDefsVal.value) {
          if (!is.vector(methodDef)) continue
          const [mName, mArglists, mDoc] = methodDef.value
          if (!is.string(mName)) continue
          // arglists: vector of vectors of strings e.g. [["this" "x"] ["this"]]
          const arglists: string[][] = []
          if (is.vector(mArglists)) {
            for (const alist of mArglists.value) {
              if (is.vector(alist)) {
                arglists.push(alist.value.map((s) => (is.string(s) ? s.value : printString(s))))
              }
            }
          }
          fns.push({
            name: mName.value,
            arglists,
            doc: is.string(mDoc) ? mDoc.value : undefined,
          })
        }

        // Re-eval guard: if a protocol with this name already exists in the ns, reuse it.
        // This preserves registered implementations across hot-reload.
        const nsEnv = getNamespaceEnv(callEnv)
        const nsName = nsEnv.ns!.name
        const existingVar = nsEnv.ns!.vars.get(protocolName)
        if (existingVar && is.protocol(existingVar.value)) {
          return v.nil()
        }

        // Build the protocol object
        const protocol = v.protocol(protocolName, nsName, fns, doc)

        // Intern the protocol itself
        internVar(protocolName, protocol, nsEnv)

        // Intern one dispatch function per method.
        // Each dispatch fn closes over the protocol and its own method name.
        for (const methodDef of fns) {
          const methodName = methodDef.name
          const dispatchFn: CljNativeFunction = {
            kind: 'native-function',
            name: methodName,
            fn: () => {
              throw new EvaluationError(
                `Protocol dispatch function '${methodName}' called without context`,
                {}
              )
            },
            fnWithContext: (
              innerCtx: EvaluationContext,
              innerCallEnv: Env,
              ...args: CljValue[]
            ) => {
              if (args.length === 0) {
                throw new EvaluationError(
                  `Protocol method '${methodName}' called with no arguments`,
                  {}
                )
              }
              const target = args[0]
              const tag = typeTagOf(target)
              const typeImpls = protocol.impls.get(tag)
              if (!typeImpls || !typeImpls[methodName]) {
                throw new EvaluationError(
                  `No implementation of protocol method '${nsName}/${protocolName}/${methodName}' for type '${tag}'`,
                  { target, tag, protocolName, methodName }
                )
              }
              return innerCtx.applyFunction(
                typeImpls[methodName],
                args,
                innerCallEnv
              )
            },
            meta: v.map([
              [v.kw(':protocol'), v.string(`${nsName}/${protocolName}`)],
              [v.kw(':name'), v.string(methodName)],
            ]),
          }
          // Warn if the method name shadows an existing non-protocol var.
          const existing = nsEnv.ns!.vars.get(methodName)
          if (existing && !is.protocol(existing.value)) {
            ctx.io.stderr(
              `WARNING: defprotocol '${protocolName}' method '${methodName}' shadows existing var in ${nsName}`
            )
          }
          internVar(methodName, dispatchFn, nsEnv)
        }

        return v.nil()
      }
    )
    .doc(
      'Creates a protocol with the given name, docstring, and method definitions. Interns the protocol and its dispatch functions in the current namespace.',
      [['name', 'doc', 'method-defs']]
    ),

  // -------------------------------------------------------------------------
  // extend-protocol! proto-var type-tag impl-map
  // Registers method implementations for a type tag on a protocol.
  //
  // proto-var: a CljVar whose value is a CljProtocol
  // type-tag:  string — "string", "nil", "my.ns/Circle", etc.
  // impl-map:  a CljMap of method-name-string → CljFunction
  // -------------------------------------------------------------------------
  'extend-protocol!': v
    .nativeFnCtx(
      'extend-protocol!',
      function extendProtocolImpl(
        _ctx: EvaluationContext,
        _callEnv: Env,
        protoVal: CljValue,
        typeTagVal: CljValue,
        implMapVal: CljValue
      ) {
        // Accept either a Var holding a protocol, or the protocol directly
        let protocol: CljProtocol
        if (is.var(protoVal) && is.protocol(protoVal.value)) {
          protocol = protoVal.value
        } else if (is.protocol(protoVal)) {
          protocol = protoVal
        } else {
          throw new EvaluationError(
            `extend-protocol!: first argument must be a protocol var or protocol, got ${protoVal.kind}`,
            { protoVal }
          )
        }
        if (!is.string(typeTagVal)) {
          throw new EvaluationError(
            `extend-protocol!: type-tag must be a string, got ${typeTagVal.kind}`,
            { typeTagVal }
          )
        }
        if (!is.map(implMapVal)) {
          throw new EvaluationError(
            `extend-protocol!: impl-map must be a map, got ${implMapVal.kind}`,
            { implMapVal }
          )
        }

        const typeTag = typeTagVal.value
        const impls: Record<string, CljFunction | CljNativeFunction> = {}

        for (const [keyVal, fnVal] of implMapVal.entries) {
          if (!is.string(keyVal)) continue
          if (!is.aFunction(fnVal)) {
            throw new EvaluationError(
              `extend-protocol!: implementation for '${keyVal.value}' must be a function, got ${fnVal.kind}`,
              { fnVal }
            )
          }
          impls[keyVal.value] = fnVal
        }

        protocol.impls.set(typeTag, impls)
        return v.nil()
      }
    )
    .doc(
      'Registers method implementations for type-tag on a protocol. Mutates the protocol in place.',
      [['proto-var', 'type-tag', 'impl-map']]
    ),

  // -------------------------------------------------------------------------
  // satisfies? proto value
  // Returns true if value implements proto.
  // -------------------------------------------------------------------------
  'satisfies?': v
    .nativeFn(
      'satisfies?',
      function satisfiesImpl(protoVal: CljValue, valueVal: CljValue) {
        let protocol: CljProtocol
        if (is.var(protoVal) && is.protocol(protoVal.value)) {
          protocol = protoVal.value
        } else if (is.protocol(protoVal)) {
          protocol = protoVal
        } else {
          throw new EvaluationError(
            `satisfies?: first argument must be a protocol, got ${protoVal.kind}`,
            { protoVal }
          )
        }
        if (valueVal === undefined) {
          throw new EvaluationError(`satisfies?: second argument is required`, {})
        }
        const tag = typeTagOf(valueVal)
        return v.boolean(protocol.impls.has(tag))
      }
    )
    .doc(
      'Returns true if value implements the protocol.',
      [['protocol', 'value']]
    ),

  // -------------------------------------------------------------------------
  // protocols type-kw-or-value
  // Returns a vector of all protocols that a type implements.
  // Accepts a keyword type tag (preferred: :string, :user/Circle) or any value
  // (backward compat: extracts the type tag via typeTagOf).
  // Scans all loaded namespaces — uses ctx.allNamespaces().
  // -------------------------------------------------------------------------
  'protocols': v
    .nativeFnCtx(
      'protocols',
      function protocolsImpl(
        ctx: EvaluationContext,
        _callEnv: Env,
        arg: CljValue
      ) {
        if (arg === undefined) {
          throw new EvaluationError(`protocols: argument is required`, {})
        }
        // Keyword type tag: strip leading colon from the internal name field
        // ':string' → 'string', ':user/Circle' → 'user/Circle'
        const tag = is.keyword(arg)
          ? arg.name.slice(1)
          : typeTagOf(arg)
        const matching: CljValue[] = []
        for (const proto of allProtocols(ctx)) {
          if (proto.impls.has(tag)) matching.push(proto)
        }
        return v.vector(matching)
      }
    )
    .doc(
      'Returns a vector of all protocols that a type implements. Accepts a keyword type tag (:string, :user/Circle) or any value.',
      [['type-kw-or-value']]
    ),

  // -------------------------------------------------------------------------
  // extenders proto
  // Returns a vector of type-tag strings that have extended the protocol.
  // -------------------------------------------------------------------------
  'extenders': v
    .nativeFn(
      'extenders',
      function extendersImpl(protoVal: CljValue) {
        let protocol: CljProtocol
        if (is.var(protoVal) && is.protocol(protoVal.value)) {
          protocol = protoVal.value
        } else if (is.protocol(protoVal)) {
          protocol = protoVal
        } else {
          throw new EvaluationError(
            `extenders: argument must be a protocol, got ${protoVal.kind}`,
            { protoVal }
          )
        }
        return v.vector([...protocol.impls.keys()].map((key) => v.keyword(`:${key}`)))
      }
    )
    .doc(
      'Returns a vector of type-tag strings that have extended the protocol.',
      [['protocol']]
    ),

  // -------------------------------------------------------------------------
  // make-record! record-type ns-name field-map
  // Low-level record constructor — called by ->RecordType and map->RecordType.
  // field-map: a CljMap of :keyword → value
  // -------------------------------------------------------------------------
  'make-record!': v
    .nativeFn(
      'make-record!',
      function makeRecordImpl(
        recordTypeVal: CljValue,
        nsNameVal: CljValue,
        fieldMapVal: CljValue
      ) {
        if (!is.string(recordTypeVal)) {
          throw new EvaluationError(
            `make-record!: record-type must be a string, got ${recordTypeVal.kind}`,
            { recordTypeVal }
          )
        }
        if (!is.string(nsNameVal)) {
          throw new EvaluationError(
            `make-record!: ns-name must be a string, got ${nsNameVal.kind}`,
            { nsNameVal }
          )
        }
        if (!is.map(fieldMapVal)) {
          throw new EvaluationError(
            `make-record!: field-map must be a map, got ${fieldMapVal.kind}`,
            { fieldMapVal }
          )
        }
        return v.record(
          recordTypeVal.value,
          nsNameVal.value,
          fieldMapVal.entries
        )
      }
    )
    .doc(
      'Creates a record value. Called by generated constructors (->Name, map->Name).',
      [['record-type', 'ns-name', 'field-map']]
    ),

  // -------------------------------------------------------------------------
  // protocol? value — predicate
  // -------------------------------------------------------------------------
  'protocol?': v
    .nativeFn('protocol?', function isProtocolImpl(x: CljValue) {
      return v.boolean(is.protocol(x))
    })
    .doc('Returns true if x is a protocol.', [['x']]),

  // -------------------------------------------------------------------------
  // record? value — predicate
  // -------------------------------------------------------------------------
  'record?': v
    .nativeFn('record?', function isRecordImpl(x: CljValue) {
      return v.boolean(is.record(x))
    })
    .doc('Returns true if x is a record.', [['x']]),

  // -------------------------------------------------------------------------
  // record-type value — returns the qualified type name of a record
  // -------------------------------------------------------------------------
  'record-type': v
    .nativeFn('record-type', function recordTypeImpl(x: CljValue) {
      if (!is.record(x)) {
        throw new EvaluationError(
          `record-type: expected a record, got ${x.kind}`,
          { x }
        )
      }
      return v.string(`${x.ns}/${x.recordType}`)
    })
    .doc('Returns the qualified type name (ns/Name) of a record.', [['record']]),

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
    .doc(
      'Returns a plain map describing any cljam value. Called by describe — prefer using describe directly.',
      [['value'], ['value', 'limit']]
    ),
}
// Note: ns-name, find-ns, and all-ns are registered by bootstrap.ts (wireNsCore),
// which runs on every runtime restore. They must not be redefined here.
