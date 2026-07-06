/**
 * Engine-neutral pending-value (CljPending) utilities.
 *
 * Deref interception inside (async ...) bodies — `@p` awaits, the JVM 3-arg
 * `(deref p timeout-ms timeout-val)` races — is implemented by BOTH async
 * evaluators (the AST walker's walk-async.ts and the legacy form twin's
 * async-evaluator.ts). These shared pieces live here, outside either engine,
 * so the deref contract survives the Phase 4 legacy deletion.
 */

import type { CljPending, CljValue } from './types'

/**
 * Kinds handled by the sync `deref` function in stdlib/atoms.ts. When @ is
 * used inside (async ...) on a non-pending value, we delegate to sync deref
 * for these kinds. Everything else gets the await-or-identity treatment:
 * return the value as-is (matches JS `await` semantics). If a new derefable
 * type is added to atoms.ts, add its kind here too.
 */
export const SYNC_DEREFABLE_KINDS = new Set([
  'atom',
  'volatile',
  'reduced',
  'delay',
])

/**
 * The JVM 3-arg deref race: resolve with `timeoutVal` when the timeout wins.
 * The timer is cleared once the pending settles so it doesn't hold the event
 * loop open after the race is decided.
 */
export function racePendingTimeout(
  pending: CljPending,
  timeoutMs: number,
  timeoutVal: CljValue
): Promise<CljValue> {
  let timerId: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<CljValue>((resolve) => {
    timerId = setTimeout(() => resolve(timeoutVal), timeoutMs)
  })
  const clear = () => {
    if (timerId !== null) clearTimeout(timerId)
  }
  pending.promise.then(clear, clear)
  return Promise.race([pending.promise, timeoutPromise])
}
