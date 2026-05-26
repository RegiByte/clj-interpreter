import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { DocGroups, docMeta, v } from '../../../factories'
import { realizeDelay, realizeLazySeq } from '../../../transformations'
import type { CljValue, Env, EvaluationContext } from '../../../types'

export const lazyFunctions = {
  force: v
    .nativeFnCtx('force', function force(ctx, callEnv, value: CljValue) {
      if (is.delay(value)) return realizeDelay(value, ctx, callEnv)
      if (is.lazySeq(value)) return realizeLazySeq(value, ctx, callEnv)
      return value
    })
    .withMeta([
      ...docMeta({
        doc: 'If x is a Delay or LazySeq, forces and returns the realized value. Otherwise returns x.',
        arglists: [['x']],
        docGroup: DocGroups.lazy,
      }),
    ]),
  'delay?': v
    .nativeFn('delay?', function isDelayPred(value: CljValue) {
      return v.boolean(is.delay(value))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if x is a Delay.',
        arglists: [['x']],
        docGroup: DocGroups.lazy,
      }),
    ]),
  'lazy-seq?': v
    .nativeFn('lazy-seq?', function isLazySeqPred(value: CljValue) {
      return v.boolean(is.lazySeq(value))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if x is a LazySeq.',
        arglists: [['x']],
        docGroup: DocGroups.lazy,
      }),
    ]),
  'realized?': v
    .nativeFn('realized?', function isRealized(value: CljValue) {
      if (is.delay(value)) return v.boolean(value.realized)
      if (is.lazySeq(value)) return v.boolean(value.realized)
      return v.boolean(false)
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if a Delay or LazySeq has been realized.',
        arglists: [['x']],
        docGroup: DocGroups.lazy,
      }),
    ]),
  'make-delay': v
    .nativeFnCtx(
      'make-delay',
      function makeDelayImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        fn: CljValue
      ) {
        if (!is.aFunction(fn)) {
          throw new EvaluationError(
            `make-delay: argument must be a function, got ${fn.kind}`,
            { fn }
          )
        }
        return v.delay(() => ctx.applyCallable(fn, [], callEnv), fn, callEnv)
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Creates a Delay that invokes thunk-fn (a zero-arg function) on first force.',
        arglists: [['thunk-fn']],
        docGroup: DocGroups.lazy,
      }),
    ]),
  'make-lazy-seq': v
    .nativeFnCtx(
      'make-lazy-seq',
      function makeLazySeqImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        fn: CljValue
      ) {
        if (!is.aFunction(fn)) {
          throw new EvaluationError(
            `make-lazy-seq: argument must be a function, got ${fn.kind}`,
            { fn }
          )
        }
        return v.lazySeq(() => ctx.applyCallable(fn, [], callEnv), fn, callEnv)
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Creates a LazySeq that invokes thunk-fn (a zero-arg function) on first realization.',
        arglists: [['thunk-fn']],
        docGroup: DocGroups.lazy,
      }),
    ]),
}
