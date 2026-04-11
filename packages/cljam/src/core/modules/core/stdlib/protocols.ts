// Protocol system: make-protocol!, extend-protocol!, satisfies?, protocols, extenders
// Note: ns-name, find-ns, all-ns are owned by bootstrap.ts (wireNsCore), not here.
import { is } from '../../../assertions'
import { getNamespaceEnv, internVar } from '../../../env'
import { EvaluationError } from '../../../errors'
import { v } from '../../../factories'
import { printString } from '../../../printer'
import type {
  CljFunction,
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
  // protocols value
  // Returns a vector of all protocols that value implements.
  // Scans all loaded namespaces — uses ctx.allNamespaces().
  // -------------------------------------------------------------------------
  'protocols': v
    .nativeFnCtx(
      'protocols',
      function protocolsImpl(
        ctx: EvaluationContext,
        _callEnv: Env,
        valueVal: CljValue
      ) {
        if (valueVal === undefined) {
          throw new EvaluationError(`protocols: argument is required`, {})
        }
        const tag = typeTagOf(valueVal)
        const matching: CljValue[] = []
        for (const proto of allProtocols(ctx)) {
          if (proto.impls.has(tag)) matching.push(proto)
        }
        return v.vector(matching)
      }
    )
    .doc(
      'Returns a vector of all protocols that value implements, by scanning all loaded namespaces.',
      [['value']]
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
        return v.vector([...protocol.impls.keys()].map(v.string))
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

}
// Note: ns-name, find-ns, and all-ns are registered by bootstrap.ts (wireNsCore),
// which runs on every runtime restore. They must not be redefined here.
