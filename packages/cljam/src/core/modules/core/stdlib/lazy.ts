import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { v } from '../../../factories'
import { realizeDelay, realizeLazySeq } from '../../../transformations'
import type { CljValue, Env, EvaluationContext } from '../../../types'

export const lazyFunctions = {
  force: v
    .nativeFn('force', function force(value: CljValue) {
      if (is.delay(value)) return realizeDelay(value)
      if (is.lazySeq(value)) return realizeLazySeq(value)
      return value
    })
    .doc(
      'If x is a Delay or LazySeq, forces and returns the realized value. Otherwise returns x.',
      [['x']]
    ),
  'delay?': v
    .nativeFn('delay?', function isDelayPred(value: CljValue) {
      return v.boolean(is.delay(value))
    })
    .doc('Returns true if x is a Delay.', [['x']]),
  'lazy-seq?': v
    .nativeFn('lazy-seq?', function isLazySeqPred(value: CljValue) {
      return v.boolean(is.lazySeq(value))
    })
    .doc('Returns true if x is a LazySeq.', [['x']]),
  'realized?': v
    .nativeFn('realized?', function isRealized(value: CljValue) {
      if (is.delay(value)) return v.boolean(value.realized)
      if (is.lazySeq(value)) return v.boolean(value.realized)
      return v.boolean(false)
    })
    .doc('Returns true if a Delay or LazySeq has been realized.', [['x']]),
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
        return v.delay(() => ctx.applyCallable(fn, [], callEnv))
      }
    )
    .doc(
      'Creates a Delay that invokes thunk-fn (a zero-arg function) on first force.',
      [['thunk-fn']]
    ),
}
