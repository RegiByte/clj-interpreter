/**
 * Async stdlib functions: then, catch*, pending?, promise-of
 * EXPERIMENTAL — part of CljPending support. Deleteable.
 * To revert: delete this file and remove the import from core-module.ts.
 */

import { v } from '../../../factories'
import { CljThrownSignal, EvaluationError } from '../../../errors'
import { is } from '../../../assertions'
import { printString } from '../../../printer'
import { toSeq } from '../../../transformations'
import type { EvaluationContext, CljValue, Env } from '../../../types'

export const asyncFunctions: Record<string, CljValue> = {
  // (then val f) — apply f when resolved, or immediately if val is not pending
  then: v
    .nativeFnCtx(
      'then',
      (ctx: EvaluationContext, callEnv: Env, val: CljValue, f: CljValue) => {
        if (!is.callable(f)) {
          throw new EvaluationError(
            `${printString(f)} is not a callable value`,
            { fn: f, args: [] }
          )
        }
        if (val.kind !== 'pending') {
          return ctx.applyCallable(f, [val], callEnv)
        }
        const promise = val.promise.then((resolved) => {
          try {
            const result = ctx.applyCallable(f, [resolved], callEnv)
            // Unwrap nested CljPending for transparent chaining
            return result.kind === 'pending' ? result.promise : result
          } catch (e) {
            return Promise.reject(e)
          }
        })
        return v.pending(promise)
      }
    )
    .doc(
      'Applies f to the resolved value of a pending, or to val directly if not pending.',
      [['val', 'f']]
    ),

  // (catch* val f) — handle rejection; named catch* to avoid collision with catch special form
  'catch*': v
    .nativeFnCtx(
      'catch*',
      (ctx: EvaluationContext, callEnv: Env, val: CljValue, f: CljValue) => {
        if (!is.callable(f)) {
          throw new EvaluationError(
            `${printString(f)} is not a callable value`,
            { fn: f, args: [] }
          )
        }
        if (val.kind !== 'pending') return val // not pending — no rejection possible
        const promise = val.promise.catch((err) => {
          // Normalize the thrown value to a CljValue map
          let errVal: CljValue
          if (err instanceof CljThrownSignal) {
            // (throw ...) inside async: pass the thrown value directly
            errVal = err.value
          } else {
            errVal = {
              kind: 'map',
              entries: [
                [
                  { kind: 'keyword', name: ':type' },
                  { kind: 'keyword', name: ':error/js' },
                ],
                [
                  { kind: 'keyword', name: ':message' },
                  {
                    kind: 'string',
                    value: err instanceof Error ? err.message : String(err),
                  },
                ],
              ],
            }
          }
          try {
            const result = ctx.applyCallable(f, [errVal], callEnv)
            return result.kind === 'pending' ? result.promise : result
          } catch (e) {
            return Promise.reject(e)
          }
        })
        return v.pending(promise)
      }
    )
    .doc(
      'Handles rejection of a pending value by calling f with the thrown value or an error map.',
      [['val', 'f']]
    ),

  // (pending? x) → boolean
  'pending?': v
    .nativeFn('pending?', (val: CljValue) => {
      return v.boolean(val.kind === 'pending')
    })
    .doc('Returns true if val is a pending (async) value.', [['val']]),

  // (promise-of val) → CljPending that resolves immediately with val
  // Primarily for testing / development before host JS interop is built.
  'promise-of': v
    .nativeFn('promise-of', (val: CljValue) => {
      return v.pending(Promise.resolve(val))
    })
    .doc(
      'Wraps val in an immediately-resolving pending value. Useful for testing async composition.',
      [['val']]
    ),

  // (all pendings) → CljPending of a vector of all resolved values.
  // Accepts any seqable (vector, list, lazy-seq, cons, nil); non-pending items resolve immediately.
  // If any input rejects, the result pending rejects with that error.
  all: v
    .nativeFn('all', (val: CljValue) => {
      const items: CljValue[] = val.kind === 'nil' ? [] : toSeq(val)
      const promises = items.map((item) =>
        item.kind === 'pending' ? item.promise : Promise.resolve(item)
      )
      return v.pending(
        Promise.all(promises).then((results) => v.vector(results))
      )
    })
    .doc(
      'Returns a pending that resolves with a vector of all results when every input resolves.',
      [['pendings']]
    ),
}
