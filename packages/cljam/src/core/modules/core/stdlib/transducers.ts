// Transducer protocol primitives: reduced, volatile!, transduce

import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { v } from '../../../factories'
import { joinLines, printString } from '../../../printer'
import { toSeq } from '../../../transformations'
import type {
  CljFunction,
  CljNativeFunction,
  CljValue,
  Env,
  EvaluationContext,
} from '../../../types'

export const transducerFunctions: Record<string, CljValue> = {
  // ── Reduced sentinel ────────────────────────────────────────────────────
  reduced: v
    .nativeFn('reduced', function reducedImpl(value: CljValue) {
      if (value === undefined) {
        throw new EvaluationError('reduced expects one argument', {})
      }
      return v.reduced(value)
    })
    .doc(
      'Returns a reduced value, indicating termination of the reduction process.',
      [['value']]
    ),
  'reduced?': v
    .nativeFn('reduced?', function isReducedImpl(value: CljValue) {
      if (value === undefined) {
        throw new EvaluationError('reduced? expects one argument', {})
      }
      return v.boolean(is.reduced(value))
    })
    .doc(
      'Returns true if the given value is a reduced value, false otherwise.',
      [['value']]
    ),
  unreduced: v
    .nativeFn('unreduced', function unreducedImpl(value: CljValue) {
      if (value === undefined) {
        throw new EvaluationError('unreduced expects one argument', {})
      }
      return is.reduced(value) ? value.value : value
    })
    .doc(
      'Returns the unreduced value of the given value. If the value is not a reduced value, it is returned unchanged.',
      [['value']]
    ),
  'ensure-reduced': v
    .nativeFn('ensure-reduced', function ensureReducedImpl(value: CljValue) {
      if (value === undefined) {
        throw new EvaluationError('ensure-reduced expects one argument', {})
      }
      return is.reduced(value) ? value : v.reduced(value)
    })
    .doc(
      'Returns the given value if it is a reduced value, otherwise returns a reduced value with the given value as its value.',
      [['value']]
    ),

  // ── Volatile ─────────────────────────────────────────────────────────────
  'volatile!': v
    .nativeFn('volatile!', function volatileImpl(value: CljValue) {
      if (value === undefined) {
        throw new EvaluationError('volatile! expects one argument', {})
      }
      return v.volatile(value)
    })
    .doc('Returns a volatile value with the given value as its value.', [
      ['value'],
    ]),
  'volatile?': v
    .nativeFn('volatile?', function isVolatileImpl(value: CljValue) {
      if (value === undefined) {
        throw new EvaluationError('volatile? expects one argument', {})
      }
      return v.boolean(is.volatile(value))
    })
    .doc(
      'Returns true if the given value is a volatile value, false otherwise.',
      [['value']]
    ),
  'vreset!': v
    .nativeFn('vreset!', function vresetImpl(vol: CljValue, newVal: CljValue) {
      if (!is.volatile(vol)) {
        throw new EvaluationError(
          `vreset! expects a volatile as its first argument, got ${printString(vol)}`,
          { vol }
        )
      }
      if (newVal === undefined) {
        throw new EvaluationError('vreset! expects two arguments', { vol })
      }
      vol.value = newVal
      return newVal
    })
    .doc(
      'Resets the value of the given volatile to the given new value and returns the new value.',
      [['vol', 'newVal']]
    ),
  'vswap!': v
    .nativeFnCtx(
      'vswap!',
      function vswapImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        vol: CljValue,
        fn: CljValue,
        ...extraArgs: CljValue[]
      ) {
        if (!is.volatile(vol)) {
          throw new EvaluationError(
            `vswap! expects a volatile as its first argument, got ${printString(vol)}`,
            { vol }
          )
        }
        if (!is.aFunction(fn)) {
          throw new EvaluationError(
            `vswap! expects a function as its second argument, got ${printString(fn)}`,
            { fn }
          )
        }
        const newVal = ctx.applyFunction(
          fn as CljFunction | CljNativeFunction,
          [vol.value, ...extraArgs],
          callEnv
        )
        vol.value = newVal
        return newVal
      }
    )
    .doc(
      'Applies fn to the current value of the volatile, replacing the current value with the result. Returns the new value.',
      [
        ['vol', 'fn'],
        ['vol', 'fn', '&', 'extraArgs'],
      ]
    ),

  // ── transduce ─────────────────────────────────────────────────────────────

  // (transduce xf f coll)       — 3-arity: calls (f) to produce init
  // (transduce xf f init coll)  — 4-arity: init supplied explicitly
  // xf   — transducer (1-arg fn: takes rf, returns composed rf)
  // f    — bottom reducing function (must support 0-arity when used as 3-arity)
  // init — initial accumulator value
  // coll — source collection (nil is treated as empty)
  transduce: v
    .nativeFnCtx(
      'transduce',
      function transduceImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        xform: CljValue,
        f: CljValue,
        init: CljValue,
        coll: CljValue
      ) {
        if (!is.aFunction(xform)) {
          throw new EvaluationError(
            `transduce expects a transducer (function) as first argument, got ${printString(xform)}`,
            { xf: xform }
          )
        }
        if (!is.aFunction(f)) {
          throw new EvaluationError(
            `transduce expects a reducing function as second argument, got ${printString(f)}`,
            { f }
          )
        }
        if (init === undefined) {
          throw new EvaluationError(
            'transduce expects 3 or 4 arguments: (transduce xf f coll) or (transduce xf f init coll)',
            {}
          )
        }

        // 3-arity: (transduce xform f coll) — derive init by calling (f) with no args
        let actualInit: CljValue
        let actualColl: CljValue
        if (coll === undefined) {
          actualColl = init
          actualInit = ctx.applyFunction(
            f as CljFunction | CljNativeFunction,
            [],
            callEnv
          )
        } else {
          actualInit = init
          actualColl = coll
        }

        // Apply transducer to bottom reducer to get the composed reducing fn
        const rf = ctx.applyFunction(
          xform as CljFunction | CljNativeFunction,
          [f],
          callEnv
        ) as CljFunction | CljNativeFunction

        // nil collection is treated as empty — skip loop, run completion only
        if (is.nil(actualColl)) {
          return ctx.applyFunction(
            rf as CljFunction | CljNativeFunction,
            [actualInit],
            callEnv
          )
        }

        if (!is.seqable(actualColl)) {
          throw new EvaluationError(
            `transduce expects a collection or string as ${coll === undefined ? 'third' : 'fourth'} argument, got ${printString(actualColl)}`,
            { coll: actualColl }
          )
        }

        // Step loop
        const items = toSeq(actualColl)
        let acc = actualInit
        for (const item of items) {
          // 2-arity call on the composed rf
          const result = ctx.applyFunction(rf, [acc, item], callEnv)
          if (is.reduced(result)) {
            acc = result.value
            break
          }
          acc = result
        }

        // Completion (1-arity call on the composed rf)
        return ctx.applyFunction(rf, [acc], callEnv)
      }
    )
    .doc(
      joinLines([
        'reduce with a transformation of f (xf). If init is not',
        'supplied, (f) will be called to produce it. f should be a reducing',
        'step function that accepts both 1 and 2 arguments, if it accepts',
        "only 2 you can add the arity-1 with 'completing'. Returns the result",
        'of applying (the transformed) xf to init and the first item in coll,',
        'then applying xf to that result and the 2nd item, etc. If coll',
        'contains no items, returns init and f is not called. Note that',
        'certain transforms may inject or skip items.',
      ]),
      [
        ['xform', 'f', 'coll'],
        ['xform', 'f', 'init', 'coll'],
      ]
    ),
}
