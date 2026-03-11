import { isDelay, isLazySeq } from '../assertions'
import { cljBoolean, v } from '../factories'
import { realizeDelay, realizeLazySeq } from '../transformations'
import type { CljValue } from '../types'

export const lazyFunctions = {
  'force': v.nativeFn('force', function force(value: CljValue) {
    if (isDelay(value)) return realizeDelay(value)
    if (isLazySeq(value)) return realizeLazySeq(value)
    return value
  }).doc(
    'If x is a Delay or LazySeq, forces and returns the realized value. Otherwise returns x.',
    [['x']]
  ),
  'delay?': v.nativeFn('delay?', function isDelayPred(value: CljValue) {
    return cljBoolean(isDelay(value))
  }).doc(
    'Returns true if x is a Delay.',
    [['x']]
  ),
  'lazy-seq?': v.nativeFn('lazy-seq?', function isLazySeqPred(value: CljValue) {
    return cljBoolean(isLazySeq(value))
  }).doc(
    'Returns true if x is a LazySeq.',
    [['x']]
  ),
  'realized?': v.nativeFn('realized?', function isRealized(value: CljValue) {
    if (isDelay(value)) return cljBoolean(value.realized)
    if (isLazySeq(value)) return cljBoolean(value.realized)
    return cljBoolean(false)
  }).doc(
    'Returns true if a Delay or LazySeq has been realized.',
    [['x']]
  ),
}
