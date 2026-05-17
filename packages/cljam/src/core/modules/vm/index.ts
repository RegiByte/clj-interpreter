import { v, docMeta, DocGroups } from '../../factories'
import type { RuntimeModule, VarMap } from '../../module'
import type { CljValue, Env, EvaluationContext } from '../../types'
import {
  bytecodeInfoForTarget,
  bytecodeSummaryForValue,
  bytecodeSummaryToMap,
  resolveBytecodeTarget,
} from '../../vm/introspection'

const vmNativeFunctions: Record<string, CljValue> = {
  'bytecode-info*-impl': v
    .nativeFnCtx(
      'cljam.vm/bytecode-info*-impl',
      function bytecodeInfoImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        form: CljValue | undefined
      ) {
        const target = resolveBytecodeTarget(ctx, callEnv, form)
        return target === null ? v.nil() : bytecodeInfoForTarget(target)
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Implementation detail for cljam.vm/bytecode-info*. Returns structured VM bytecode information for a quoted target form.',
        arglists: [['form']],
        docGroup: DocGroups.runtime,
      }),
    ]),
  'value-summary*-impl': v
    .nativeFn('cljam.vm/value-summary*-impl', function valueSummaryImpl(
      value: CljValue
    ) {
      return bytecodeSummaryToMap(bytecodeSummaryForValue(value))
    })
    .withMeta([
      ...docMeta({
        doc: 'Implementation detail for cljam.vm census helpers. Returns bytecode summary information for an already-resolved value.',
        arglists: [['value']],
        docGroup: DocGroups.runtime,
      }),
    ]),
}

export function makeVmModule(): RuntimeModule {
  return {
    id: 'cljam/vm',
    declareNs: [
      {
        name: 'cljam.vm',
        vars(_ctx): VarMap {
          const map = new Map()
          for (const [name, fn] of Object.entries(vmNativeFunctions)) {
            map.set(name, { value: fn })
          }
          return map
        },
      },
    ],
  }
}
