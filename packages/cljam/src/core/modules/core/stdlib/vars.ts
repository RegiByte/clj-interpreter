import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { DocGroups, docMeta, v } from '../../../factories'
import type { CljValue } from '../../../types'

export const varFunctions: Record<string, CljValue> = {
  'var?': v
    .nativeFn('var?', function isVarImpl(x: CljValue) {
      return v.boolean(is.var(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if x is a Var.',
        arglists: [['x']],
        docGroup: DocGroups.predicates,
      }),
    ]),

  'var-get': v
    .nativeFn('var-get', function varGetImpl(x: CljValue) {
      if (!is.var(x)) {
        throw new EvaluationError(`var-get expects a Var, got ${x.kind}`, { x })
      }
      return x.value
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns the value in the Var object.',
        arglists: [['x']],
        docGroup: DocGroups.vars,
      }),
    ]),

  'alter-var-root': v
    .nativeFnCtx(
      'alter-var-root',
      function alterVarRootImpl(
        ctx,
        callEnv,
        varVal: CljValue,
        f: CljValue,
        ...args: CljValue[]
      ) {
        if (!is.var(varVal)) {
          throw new EvaluationError(
            `alter-var-root expects a Var as its first argument, got ${varVal.kind}`,
            { varVal }
          )
        }
        if (!is.aFunction(f)) {
          throw new EvaluationError(
            `alter-var-root expects a function as its second argument, got ${f.kind}`,
            { f }
          )
        }
        const newVal = ctx.applyFunction(f, [varVal.value, ...args], callEnv)
        varVal.value = newVal
        const ns = ctx.resolveNs(varVal.ns)
        if (ns) ctx.touchNamespace?.(ns, 'alter-var-root')
        return newVal
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Atomically alters the root binding of var v by applying f to its current value plus any additional args.',
        arglists: [['v', 'f', '&', 'args']],
        docGroup: DocGroups.vars,
      }),
    ]),
}
