import { is } from '../../assertions'
import { v, docMeta, DocGroups } from '../../factories'
import type { RuntimeModule, VarMap } from '../../module'
import type { CljValue, Env, EvaluationContext } from '../../types'
import {
  bytecodeInfoForTarget,
  bytecodeSummaryForValue,
  bytecodeSummaryToMap,
  bytecodeCensusItemForValue,
  namespaceCensus,
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
  'namespace-census-impl*': v
    .nativeFnCtx(
      'cljam.vm/namespace-census-impl*',
      function namespaceCensusImpl(
        ctx: EvaluationContext,
        _callEnv: Env,
        nsSym: CljValue,
        includePrivateVal: CljValue,
        ngramSizesVal: CljValue
      ) {
        if (!is.symbol(nsSym)) return v.nil()
        const includePrivate = is.boolean(includePrivateVal) && includePrivateVal.value
        const ngramSizes: number[] = []
        if (is.vector(ngramSizesVal)) {
          for (const item of ngramSizesVal.value) {
            if (is.number(item)) ngramSizes.push(item.value)
          }
        }
        return namespaceCensus(ctx, nsSym, includePrivate, ngramSizes)
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Implementation detail for cljam.vm/namespace-census. Computes full namespace census in one JS pass.',
        arglists: [['ns-sym', 'include-private?', 'ngram-sizes']],
        docGroup: DocGroups.runtime,
      }),
    ]),
  'bytecode-census-item*-impl': v
    .nativeFn(
      'cljam.vm/bytecode-census-item*-impl',
      function bytecodeCensusItemImpl(value: CljValue, ngramSizesVal: CljValue) {
        const ngramSizes: number[] = []
        if (is.vector(ngramSizesVal)) {
          for (const item of ngramSizesVal.value) {
            if (is.number(item)) ngramSizes.push(item.value)
          }
        } else if (is.list(ngramSizesVal)) {
          for (const item of ngramSizesVal.value) {
            if (is.number(item)) ngramSizes.push(item.value)
          }
        }
        return bytecodeCensusItemForValue(value, ngramSizes)
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Implementation detail for cljam.vm census helpers. Returns all census data for a single var/value in one JS pass.',
        arglists: [['value', 'ngram-sizes']],
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
