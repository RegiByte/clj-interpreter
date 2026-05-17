import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { DocGroups, docMeta, v } from '../../../factories'
import { getNamespaceEnv, internVar } from '../../../env'
import type {
  CljKeyword,
  CljMultiMethod,
  CljNativeFunction,
  CljValue,
} from '../../../types'

/**
 * Creates a keyword-based dispatch fn: looks up the keyword in a map arg.
 * Moved here from special-forms.ts so it can be shared by make-multimethod!.
 */
function keywordToDispatchFn(kw: CljKeyword): CljNativeFunction {
  return v.nativeFn(`kw:${kw.name}`, (...args: CljValue[]) => {
    const target = args[0]
    if (!is.map(target)) return v.nil()
    const entry = target.entries.find(([k]) => is.equal(k, kw))
    return entry ? entry[1] : v.nil()
  })
}

export const multimethodFunctions: Record<string, CljValue> = {
  'multimethod?': v
    .nativeFn('multimethod?', function isMultimethodImpl(x: CljValue) {
      return v.boolean(is.multiMethod(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if x is a multimethod.',
        arglists: [['x']],
        docGroup: DocGroups.predicates,
      }),
    ]),

  /**
   * Creates a multimethod with the given name and dispatch-fn, and interns it
   * into the current namespace. If the var already holds a multimethod, this
   * is a no-op — preserving all registered methods (re-eval guard).
   */
  'make-multimethod!': v
    .nativeFnCtx(
      'make-multimethod!',
      function makeMultimethodImpl(
        ctx,
        callEnv,
        nameVal: CljValue,
        dispatchFnVal: CljValue,
        ...opts: CljValue[]
      ) {
        if (!is.string(nameVal)) {
          throw new EvaluationError(
            `make-multimethod!: first argument must be a string, got ${nameVal.kind}`,
            { nameVal }
          )
        }
        const name = nameVal.value
        // Re-eval guard: if a multimethod is already interned, leave it alone.
        const nsEnv = getNamespaceEnv(callEnv)
        const existing = nsEnv.ns!.vars.get(name)
        if (existing && is.multiMethod(existing.value)) {
          return v.nil()
        }
        // Build the dispatch fn.
        let dispatchFn: CljMultiMethod['dispatchFn']
        if (is.keyword(dispatchFnVal)) {
          dispatchFn = keywordToDispatchFn(dispatchFnVal)
        } else if (is.aFunction(dispatchFnVal)) {
          dispatchFn = dispatchFnVal
        } else {
          throw new EvaluationError(
            `make-multimethod!: dispatch-fn must be a function or keyword, got ${dispatchFnVal.kind}`,
            { dispatchFnVal }
          )
        }
        // Parse optional flat keyword-value pairs: :default <sentinel-val>
        let defaultDispatchVal: CljValue | undefined
        for (let i = 0; i + 1 < opts.length; i += 2) {
          if (
            is.keyword(opts[i]) &&
            (opts[i] as CljKeyword).name === ':default'
          ) {
            defaultDispatchVal = opts[i + 1]
          }
        }
        const mm = v.multiMethod(
          name,
          dispatchFn,
          [],
          undefined,
          defaultDispatchVal
        )
        internVar(name, mm, nsEnv)
        if (nsEnv.ns) ctx.touchNamespace?.(nsEnv.ns, 'defmulti')
        return v.nil()
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Creates a multimethod with the given name and dispatch-fn in the current namespace. Accepts optional :default <sentinel-val> to customize the fallback sentinel. No-op if already a multimethod (re-eval safe).',
        arglists: [['name', 'dispatch-fn', '& opts']],
        docGroup: DocGroups.multimethods,
        extra: { 'no-doc': true },
      }),
    ]),

  /**
   * Adds or replaces a method on a multimethod var.
   * dispatch-val :default installs the fallback method.
   * Mutates the var in place so all references see the update.
   */
  'add-method!': v
    .nativeFnCtx(
      'add-method!',
      function addMethodImpl(
        ctx,
        _callEnv,
        varVal: CljValue,
        dispatchVal: CljValue,
        methodFn: CljValue
      ) {
        if (!is.var(varVal)) {
          throw new EvaluationError(
            `add-method!: first argument must be a Var, got ${varVal.kind}`,
            { varVal }
          )
        }
        if (!is.multiMethod(varVal.value)) {
          throw new EvaluationError(
            `add-method!: ${varVal.name} is not a multimethod`,
            { varVal }
          )
        }
        if (!is.aFunction(methodFn)) {
          throw new EvaluationError(
            `add-method!: method must be a function, got ${methodFn.kind}`,
            { methodFn }
          )
        }
        const existing = varVal.value as CljMultiMethod
        // The sentinel is the custom defaultDispatchVal if set, otherwise :default.
        const sentinel: CljValue =
          existing.defaultDispatchVal ?? v.keyword(':default')
        const isDefault = is.equal(dispatchVal, sentinel)
        let updated: CljMultiMethod
        if (isDefault) {
          updated = v.multiMethod(
            existing.name,
            existing.dispatchFn,
            existing.methods,
            methodFn,
            existing.defaultDispatchVal
          )
        } else {
          const filtered = existing.methods.filter(
            (m) => !is.equal(m.dispatchVal, dispatchVal)
          )
          updated = v.multiMethod(
            existing.name,
            existing.dispatchFn,
            [...filtered, { dispatchVal, fn: methodFn }],
            existing.defaultMethod,
            existing.defaultDispatchVal
          )
        }
        varVal.value = updated
        const ns = ctx.resolveNs(varVal.ns)
        if (ns) ctx.touchNamespace?.(ns, 'defmethod')
        return v.nil()
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Adds or replaces a method on a multimethod var. Uses :default as the fallback dispatch value.',
        arglists: [['mm-var', 'dispatch-val', 'fn']],
        docGroup: DocGroups.multimethods,
        extra: { 'no-doc': true },
      }),
    ]),
}
