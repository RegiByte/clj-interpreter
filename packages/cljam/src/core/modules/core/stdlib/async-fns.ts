/**
 * Async stdlib functions: then, catch*, pending?, promise-of
 * EXPERIMENTAL — part of CljPending support. Deleteable.
 * To revert: delete this file and remove the import from core-module.ts.
 */

import { DocGroups, docMeta, v } from '../../../factories'
import { CljThrownSignal, EvaluationError } from '../../../errors'
import { thrownValueForHandler } from '../../../evaluator/form-parsers'
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
        if (typeof f === 'undefined') {
          throw new EvaluationError(
            'invalid signature: expected (then value f)',
            { fn: f, args: [] }
          )
        }
        if (!is.callable(f)) {
          throw new EvaluationError(
            `${printString(f)} is not a callable value`,
            { fn: f, args: [] }
          )
        }
        if (!is.pending(val)) {
          return ctx.applyCallable(f, [val], callEnv)
        }
        // A handler-returned (or resolved) pending flattens at the cljPending
        // factory seam; a handler throw rejects the chain natively.
        const promise = val.promise.then((resolved) =>
          ctx.applyCallable(f, [resolved], callEnv)
        )
        return v.pending(promise)
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Applies f to the resolved value of a pending, or to val directly if not pending.',
        arglists: [['val', 'f']],
        docGroup: DocGroups.async,
      }),
    ]),

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
        if (!is.pending(val)) return val // not pending — no rejection possible
        const promise = val.promise.catch((err) => {
          // Shared normalization table (same as try/catch in every engine);
          // null = host fault — rethrow it, parity with async try.
          const errVal = thrownValueForHandler(err, ctx)
          if (errVal === null) throw err
          return ctx.applyCallable(f, [errVal], callEnv)
        })
        return v.pending(promise)
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Handles rejection of a pending value by calling f with the thrown value or an error map.',
        arglists: [['val', 'f']],
        docGroup: DocGroups.async,
      }),
    ]),

  // (pending? x) → boolean
  'pending?': v
    .nativeFn('pending?', (val: CljValue) => {
      return v.boolean(is.pending(val))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if val is a pending (async) value.',
        arglists: [['val']],
        docGroup: DocGroups.async,
      }),
    ]),

  // (promise-of val) → CljPending that resolves immediately with val
  // Primarily for testing / development before host JS interop is built.
  'promise-of': v
    .nativeFn('promise-of', (val: CljValue) => {
      return v.pending(Promise.resolve(val))
    })
    .withMeta([
      ...docMeta({
        doc: 'Wraps val in an immediately-resolving pending value. Useful for testing async composition.',
        arglists: [['val']],
        docGroup: DocGroups.async,
      }),
    ]),

  // (all pendings) → CljPending of a vector of all resolved values.
  // Accepts any seqable (vector, list, lazy-seq, cons, nil); non-pending items resolve immediately.
  // If any input rejects, the result pending rejects with that error.
  all: v
    .nativeFn('all', (val: CljValue) => {
      const items: CljValue[] = is.nil(val) ? [] : toSeq(val)
      const promises = items.map((item) =>
        is.pending(item) ? item.promise : Promise.resolve(item)
      )
      return v.pending(
        Promise.all(promises).then((results) => v.vector(results))
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns a pending that resolves with a vector of all results when every input resolves.',
        arglists: [['pendings']],
        docGroup: DocGroups.async,
      }),
    ]),

  // (make-promise executor) — create a CljPending from an executor fn (fn [resolve reject] ...).
  // resolve and reject are plain callables: (resolve value) / (reject error-value).
  // Mirrors JS: new Promise((resolve, reject) => ...).
  'make-promise': v
    .nativeFnCtx(
      'make-promise',
      (ctx: EvaluationContext, callEnv: Env, executor: CljValue) => {
        if (!is.callable(executor)) {
          throw new EvaluationError(
            `make-promise expects a callable executor, got ${executor.kind}`,
            { fn: executor, args: [] }
          )
        }
        const promise = new Promise<CljValue>((resolve, reject) => {
          const resolveFn = v.nativeFn('resolve', (val: CljValue) => {
            resolve(val ?? v.nil())
            return v.nil()
          })
          const rejectFn = v.nativeFn('reject', (val: CljValue) => {
            reject(new CljThrownSignal(val))
            return v.nil()
          })
          try {
            ctx.applyCallable(executor, [resolveFn, rejectFn], callEnv)
          } catch (e) {
            reject(e)
          }
        })
        return v.pending(promise)
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Creates a pending value from an executor fn (fn [resolve reject] ...). Like JS new Promise(executor).',
        arglists: [['executor']],
        docGroup: DocGroups.async,
      }),
    ]),
}
