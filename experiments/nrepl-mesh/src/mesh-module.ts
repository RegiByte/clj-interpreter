/**
 * makeMeshModule — creates a RuntimeModule that exposes mesh primitives to a
 * Conjure session under the `mesh` namespace.
 *
 * Isolation guarantee: this file is the only coupling point between the mesh
 * experiment and the conjure-js interpreter. It imports from '@regibyte/cljam' (the
 * public API only) and from the local broker/node layer. The core interpreter
 * never imports from here.
 *
 * Exposed vars in `mesh`:
 *   *eval-target*   dynamic var — current target node-id (string) or nil
 *   set-target!     (set-target! node-id-or-nil) — updates *eval-target* root
 *   with-node       (with-node node-id 'form)    — eval quoted form remotely
 *   list-nodes      (list-nodes) or (list-nodes :cap) — discover peers
 *
 * Usage:
 *   const meshMod = makeMeshModule(meshNode)
 *   const session = createSession({ extraModules: [meshMod] })
 *   // or: session.installModule(meshMod)  — once installModule API exists
 *
 * Clojure usage:
 *   (mesh/set-target! :node-b)
 *   (mesh/with-node :node-b '(reduce + [1 2 3]))  ;; => CljPending → 6
 *   (mesh/list-nodes :http)                        ;; => CljPending → [{:id ...}]
 */

import {
  v,
  cljNil,
  cljString,
  cljNumber,
  cljKeyword,
  cljVector,
  cljMap,
  cljPending,
  printString,
  readString,
} from '@regibyte/cljam'
import type {
  RuntimeModule,
  VarMap,
  CljValue,
  EvaluationContext,
  Env,
} from '@regibyte/cljam'
import type { MeshNode } from './mesh-node.js'
import type { NodeInfo } from './broker.js'

// ---------------------------------------------------------------------------
// Module factory
// ---------------------------------------------------------------------------

export function makeMeshModule(meshNode: MeshNode): RuntimeModule {
  return {
    id: 'mesh',
    dependsOn: ['clojure.core'],
    declareNs: [
      {
        name: 'mesh',
        vars(): VarMap {
          const map: VarMap = new Map()

          // ------------------------------------------------------------------
          // *eval-target* — dynamic var; holds the current remote node-id or nil.
          // nREPL server will check this var before routing incoming eval ops.
          // ------------------------------------------------------------------
          map.set('*eval-target*', {
            value: cljNil(),
            dynamic: true,
          })

          // ------------------------------------------------------------------
          // (set-target! node-id-or-nil)
          // Validates the node is registered, then mutates the root value of
          // *eval-target*. Returns a CljPending so the nREPL can await the
          // result and surface validation errors immediately.
          // Pass nil to clear: (mesh/set-target! nil)  — resolves instantly.
          // ------------------------------------------------------------------
          map.set('set-target!', {
            value: v
              .nativeFnCtx(
                'set-target!',
                (
                  ctx: EvaluationContext,
                  _callEnv: Env,
                  nodeIdVal: CljValue
                ) => {
                  const meshNs = ctx.resolveNs('mesh')
                  const varObj = meshNs?.vars.get('*eval-target*')

                  const promise = (async () => {
                    if (nodeIdVal.kind === 'nil') {
                      if (varObj) varObj.value = cljNil()
                      return cljNil()
                    }

                    const nodeId = extractId(nodeIdVal)
                    // Validate before setting — prevents stuck state where every
                    // subsequent eval (including set-target! nil) gets routed to
                    // a non-existent node and fails.
                    const nodes = await meshNode.listNodes()
                    if (!nodes.some((n) => n.id === nodeId)) {
                      const known = nodes.map((n) => n.id).join(', ') || '(none)'
                      throw new Error(
                        `Node "${nodeId}" is not registered in the mesh. Known nodes: ${known}`
                      )
                    }

                    const newVal = cljString(nodeId)
                    if (varObj) varObj.value = newVal
                    return newVal
                  })()

                  return cljPending(promise)
                }
              )
              .doc(
                'Validates the node is registered, then sets *eval-target* to the given ' +
                  'node-id (keyword or string), or nil to clear. Returns a pending. ' +
                  'Subsequent nREPL evals are routed to the target node when set.',
                [['node-id-or-nil']]
              ),
          })

          // ------------------------------------------------------------------
          // (with-node node-id 'form)
          // Sends the quoted form as source to the given remote node.
          // Returns a CljPending that resolves to the remote result (read back
          // from the wire EDN string).
          //
          // Examples:
          //   (with-node :node-b '(reduce + [1 2 3]))
          //   (with-node "node-b" `(+ ~x ~y))
          // ------------------------------------------------------------------
          map.set('with-node', {
            value: v
              .nativeFnCtx(
                'with-node',
                (
                  _ctx: EvaluationContext,
                  _callEnv: Env,
                  nodeIdVal: CljValue,
                  form: CljValue
                ) => {
                  const nodeId = extractId(nodeIdVal)
                  const source = printString(form)
                  const promise = meshNode
                    .evalAt(nodeId, source, undefined)
                    .then((result) => {
                      if (result.error) throw new Error(result.error)
                      return readString(result.value!)
                    })
                  return cljPending(promise)
                }
              )
              .doc(
                'Evaluates the quoted form on the given remote node. Returns a pending value.',
                [['node-id', 'form']]
              ),
          })

          // ------------------------------------------------------------------
          // (list-nodes) or (list-nodes :capability)
          // Discovers all live nodes, optionally filtered by a capability tag.
          // Returns a CljPending that resolves to a vector of node maps:
          //   [{:id "node-a" :capabilities [:http :database] :last-seen 1234}]
          // ------------------------------------------------------------------
          map.set('list-nodes', {
            value: v
              .nativeFn('list-nodes', (cap?: CljValue) => {
                const capability =
                  cap && cap.kind === 'keyword'
                    ? cap.name.slice(1) // strip leading ':'
                    : cap && cap.kind === 'string'
                      ? cap.value
                      : undefined
                const promise = meshNode
                  .listNodes(capability)
                  .then((nodes) => cljVector(nodes.map(nodeInfoToMap)))
                return cljPending(promise)
              })
              .doc(
                'Returns a pending vector of node info maps, optionally filtered by capability.',
                [[], [':capability']]
              ),
          })

          return map
        },
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract a string node-id from a keyword (:node-b → "node-b") or string. */
function extractId(val: CljValue): string {
  if (val.kind === 'keyword') return val.name.slice(1)
  if (val.kind === 'string') return val.value
  throw new Error(`mesh: node-id must be a keyword or string, got ${val.kind}`)
}

/** Convert a NodeInfo struct to a Clojure map. */
function nodeInfoToMap(info: NodeInfo): CljValue {
  return cljMap([
    [cljKeyword(':id'), cljString(info.id)],
    [
      cljKeyword(':capabilities'),
      cljVector(info.capabilities.map((c) => cljKeyword(`:${c}`))),
    ],
    [cljKeyword(':last-seen'), cljNumber(info.lastSeen)],
  ])
}
