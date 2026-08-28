// native.ts — ring.adapter.native RuntimeModule.
//
// Provides:
//   start-server*   (opts-map) → server-handle-map
//   stop-server*    (server)   → CljPending<nil>
//   wait-ready*     (server)   → CljPending<server>   (updated with actual port)
//   started?*       (server)   → boolean
//
// The native layer owns:
//   - Node.js http.Server lifecycle (create, listen, close)
//   - Request/response conversion between Node and Clojure data
//   - Closing over ctx/callEnv so the Clojure handler can be called on each request
//
// The Clojure layer (ring.adapter.node) owns:
//   - Public API surface (start, stop!, wait-ready!, started?)
//   - Doc-strings and argument validation messages

import { createServer } from 'node:http'
import type { Server, IncomingMessage, ServerResponse } from 'node:http'
import { v, is, EvaluationError } from '@regibyte/cljam'
import type {
  CljValue,
  CljMap,
  CljRecord,
  RuntimeModule,
  VarMap,
  EvaluationContext,
  Env,
} from '@regibyte/cljam'
import { requestToClj } from './request.ts'
import { writeCljResponse, writeErrorResponse } from './response.ts'

// ---------------------------------------------------------------------------
// Handle helpers
// ---------------------------------------------------------------------------

function handleEntries(val: CljMap | CljRecord): [CljValue, CljValue][] {
  return is.record(val) ? val.fields : val.entries
}

function mapGet(m: CljMap | CljRecord, keyName: string): CljValue | null {
  for (const [k, val] of handleEntries(m)) {
    if (is.keyword(k) && k.name === keyName) return val
  }
  return null
}

function extractServer(handleVal: CljValue): Server {
  if (!is.map(handleVal) && !is.record(handleVal)) {
    throw new EvaluationError('expected a server handle map', {
      val: handleVal,
    })
  }
  const handleEntry = mapGet(handleVal, ':_handle')
  if (handleEntry && is.jsValue(handleEntry) && isNodeServer(handleEntry.value)) {
    return handleEntry.value as Server
  }
  throw new EvaluationError('server handle is missing or invalid :_handle', {
    val: handleVal,
  })
}

function isNodeServer(val: unknown): boolean {
  return (
    val !== null &&
    typeof val === 'object' &&
    typeof (val as Record<string, unknown>)['listen'] === 'function' &&
    typeof (val as Record<string, unknown>)['close'] === 'function' &&
    typeof (val as Record<string, unknown>)['listening'] === 'boolean'
  )
}

function withActualPort(handleVal: CljValue, server: Server): CljValue {
  if (!is.map(handleVal) && !is.record(handleVal)) return handleVal
  const addr = server.address() as { port: number } | null
  const actualPort = addr?.port ?? 0
  const updatedEntries = handleEntries(handleVal).map(
    ([k, val]: [CljValue, CljValue]): [CljValue, CljValue] =>
      is.keyword(k) && k.name === ':port'
        ? [k, v.number(actualPort)]
        : [k, val]
  )
  if (is.record(handleVal)) {
    return v.record(handleVal.recordType, handleVal.ns, updatedEntries, handleVal.basis)
  }
  return v.map(updatedEntries)
}

// ---------------------------------------------------------------------------
// Native function definitions
// ---------------------------------------------------------------------------

const nativeFns: Record<string, CljValue> = {
  // (start-server* opts) → CljPending<server-handle-map>
  //
  // opts keys:
  //   :handler   — CljFn (required)
  //   :port      — number (default 3000)
  //   :host      — string (default "localhost")
  //   :on-error  — CljFn {:message s :type s} → any (optional)
  //                Called for server-level errors after startup.
  //                If omitted, errors are logged to stderr so the process
  //                does not crash on an unhandled 'error' event.
  //
  // Returns a CljPending that resolves to the handle map only after the port
  // is bound. The resolved handle always has the correct :port (critical when
  // :port 0 is used for OS-assigned ports). Callers never see a stale port.
  'start-server*': v.nativeFnCtx(
    'ring.adapter.native/start-server*',
    (ctx: EvaluationContext, callEnv: Env, optsVal: CljValue) => {
      if (!is.map(optsVal)) {
        throw new EvaluationError(
          `start-server*: expected a map, got ${optsVal.kind}`,
          { opts: optsVal }
        )
      }

      const handlerFn = mapGet(optsVal, ':handler')
      if (!handlerFn) {
        throw new EvaluationError('start-server*: :handler is required', {
          opts: optsVal,
        })
      }

      const portVal = mapGet(optsVal, ':port')
      const hostVal = mapGet(optsVal, ':host')
      const onErrorFn = mapGet(optsVal, ':on-error')
      const port = portVal && is.number(portVal) ? portVal.value : 3000
      const host = hostVal && is.string(hostVal) ? hostVal.value : 'localhost'

      const requestHandler = async (
        req: IncomingMessage,
        res: ServerResponse
      ): Promise<void> => {
        try {
          const cljReq = await requestToClj(req)
          let result = ctx.applyCallable(handlerFn, [cljReq], callEnv)
          if (is.pending(result)) result = await result.promise
          writeCljResponse(result, res)
        } catch (e) {
          writeErrorResponse(res, e instanceof Error ? e.message : String(e))
        }
      }

      const server = createServer(
        (req: IncomingMessage, res: ServerResponse) => {
          void requestHandler(req, res)
        }
      )

      const handleVal = v.map([
        [v.keyword(':port'), v.number(port)],
        [v.keyword(':host'), v.string(host)],
        [v.keyword(':_handle'), v.jsValue(server)],
      ])

      // Persistent error handler — only attached after the port is successfully
      // bound. Startup errors (EADDRINUSE etc.) are handled exclusively by the
      // promise rejection path below; attaching this handler before listening
      // would cause every startup error to be both logged AND rejected (double
      // handling). Moved inside onListening so it is never active during startup.
      const attachPersistentErrorHandler = () => {
        server.on('error', (err: Error) => {
          if (onErrorFn) {
            const cljErr = v.map([
              [v.keyword(':message'), v.string(err.message)],
              [v.keyword(':type'), v.string(err.constructor?.name ?? 'Error')],
            ])
            try {
              ctx.applyCallable(onErrorFn, [cljErr], callEnv)
            } catch (_) {
              // don't let a throwing :on-error handler crash the process
            }
          } else {
            console.error('[cljam-ring] unhandled server error:', err.message)
          }
        })
      }

      // Resolve only after the port is actually bound so :port is always correct.
      const promise = new Promise<CljValue>((resolve, reject) => {
        const onListening = () => {
          server.removeListener('error', onStartupError)
          attachPersistentErrorHandler()
          resolve(withActualPort(handleVal, server))
        }
        const onStartupError = (err: Error) => {
          server.removeListener('listening', onListening)
          reject(err)
        }
        server.once('listening', onListening)
        server.once('error', onStartupError)
      })

      server.listen(port, host)

      return v.pending(promise)
    }
  ),

  // (stop-server* server opts-or-nil) → CljPending<nil>
  //
  // Shutdown behaviour is controlled by :drain-timeout-ms in opts:
  //
  //   nil (default) — pure graceful: server.close() only, waits indefinitely
  //                   for all connections to drain. Node.js default. Correct
  //                   for production / blue-green deployments.
  //
  //   0             — immediate: closeAllConnections() first, then close().
  //                   Good for REPL / dev hot-reload loops.
  //
  //   N > 0         — graceful with timeout: idle keep-alive connections are
  //                   destroyed immediately (closeIdleConnections), active
  //                   requests are allowed to finish, and after N ms anything
  //                   still open is force-killed (closeAllConnections).
  //
  // Note: in Bun, closeAllConnections() implicitly closes the server too, so
  // server.close() may fire ERR_SERVER_NOT_RUNNING — treated as success.
  'stop-server*': v.nativeFnCtx(
    'ring.adapter.native/stop-server*',
    (_ctx: EvaluationContext, _callEnv: Env, handleVal: CljValue, optsVal?: CljValue) => {
      const server = extractServer(handleVal)

      let drainTimeoutMs: number | null = null
      if (optsVal && is.map(optsVal)) {
        const t = mapGet(optsVal, ':drain-timeout-ms')
        if (t && is.number(t)) drainTimeoutMs = t.value
      }

      const promise = new Promise<CljValue>((resolve, reject) => {
        const doClose = () => {
          server.close((err?: Error) => {
            const code = (err as NodeJS.ErrnoException | undefined)?.code
            if (err && code !== 'ERR_SERVER_NOT_RUNNING') reject(err)
            else resolve(v.nil())
          })
        }

        if (drainTimeoutMs === 0) {
          // Immediate: destroy every socket, then close.
          server.closeAllConnections()
          doClose()
        } else if (drainTimeoutMs !== null && drainTimeoutMs > 0) {
          // Graceful with timeout: drop idle keep-alives now, let active
          // requests finish, force-kill anything left after the deadline.
          server.closeIdleConnections()
          const timer = setTimeout(() => server.closeAllConnections(), drainTimeoutMs)
          server.once('close', () => clearTimeout(timer))
          doClose()
        } else {
          // Pure graceful (default): just stop accepting, drain naturally.
          doClose()
        }
      })
      return v.pending(promise)
    }
  ),

  // (started?* server) → boolean
  //
  // Reads Node's authoritative server.listening flag — no extra state needed.
  'started?*': v.nativeFnCtx(
    'ring.adapter.native/started?*',
    (_ctx: EvaluationContext, _callEnv: Env, handleVal: CljValue) => {
      const server = extractServer(handleVal)
      return v.boolean(server.listening)
    }
  ),
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export function makeRingNativeModule(): RuntimeModule {
  return {
    id: 'cljam-ring/native',
    declareNs: [
      {
        name: 'ring.adapter.native',
        vars(_ctx): VarMap {
          const map = new Map()
          for (const [name, fn] of Object.entries(nativeFns)) {
            map.set(name, { value: fn })
          }
          return map
        },
      },
    ],
  }
}
