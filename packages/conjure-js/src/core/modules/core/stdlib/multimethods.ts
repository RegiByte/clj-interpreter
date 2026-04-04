import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { v } from '../../../factories'
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
    .doc('Returns true if x is a multimethod.', [['x']]),

  /**
   * Creates a multimethod with the given name and dispatch-fn, and interns it
   * into the current namespace. If the var already holds a multimethod, this
   * is a no-op — preserving all registered methods (re-eval guard).
   */
  'make-multimethod!': v
    .nativeFnCtx(
      'make-multimethod!',
      function makeMultimethodImpl(
        _ctx,
        callEnv,
        nameVal: CljValue,
        dispatchFnVal: CljValue
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
        const mm = v.multiMethod(name, dispatchFn, [])
        internVar(name, mm, nsEnv)
        return v.nil()
      }
    )
    .doc(
      'Creates a multimethod with the given name and dispatch-fn in the current namespace. No-op if already a multimethod (re-eval safe).',
      [['name', 'dispatch-fn']]
    ),

  /**
   * Adds or replaces a method on a multimethod var.
   * dispatch-val :default installs the fallback method.
   * Mutates the var in place so all references see the update.
   */
  'add-method!': v
    .nativeFnCtx(
      'add-method!',
      function addMethodImpl(
        _ctx,
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
        const isDefault =
          is.keyword(dispatchVal) && dispatchVal.name === ':default'
        let updated: CljMultiMethod
        if (isDefault) {
          updated = v.multiMethod(
            existing.name,
            existing.dispatchFn,
            existing.methods,
            methodFn
          )
        } else {
          const filtered = existing.methods.filter(
            (m) => !is.equal(m.dispatchVal, dispatchVal)
          )
          updated = v.multiMethod(existing.name, existing.dispatchFn, [
            ...filtered,
            { dispatchVal, fn: methodFn },
          ])
        }
        varVal.value = updated
        return v.nil()
      }
    )
    .doc(
      'Adds or replaces a method on a multimethod var. Uses :default as the fallback dispatch value.',
      [['mm-var', 'dispatch-val', 'fn']]
    ),
}
