/**
 * nREPL Mesh — local REPL connector (editor-facing, not a worker node).
 *
 * This process connects to the mesh broker but does NOT register as a node.
 * It will not appear in (mesh/list-nodes) and will never receive remote evals.
 * It is a pure client: it can discover workers, route evals to them, and
 * receive streamed output back. Local evals (target = nil) run in the
 * per-connection managed session, completely independent of the mesh.
 *
 * Usage:
 *   REDIS_URL=redis://... bun src/nrepl-local.ts
 *
 * Env:
 *   REDIS_URL     — broker URL, same cluster as the worker nodes
 *   NREPL_PORT    — nREPL TCP port (default: 7888)
 *
 * Workflow:
 *   1. bun src/nrepl-local.ts
 *   2. Connect your editor to localhost:NREPL_PORT
 *   3. List workers:         (mesh/list-nodes)
 *   4. Route to a worker:    (mesh/set-target! "node1")
 *   5. All evals go there.
 *   6. Return to local:      (mesh/set-target! nil)
 *   7. One-off remote eval:  (mesh/with-node "node1" '(+ 1 2))
 */

import { readFileSync } from 'node:fs'
import { createSession } from '@regibyte/cljam'
import { startNreplServer, makeNodeHostModule } from 'cljam/nrepl'
import { createRedisBroker } from './brokers/redis.js'
import { MeshNode } from './mesh-node.js'
import { makeMeshModule } from './mesh-module.js'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'
const NREPL_PORT = Number(process.env.NREPL_PORT ?? 7888)

function maskRedisUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.password) parsed.password = '***'
    return parsed.toString()
  } catch {
    return url
  }
}

const broker = createRedisBroker({ url: REDIS_URL })

// This session is only used by the mesh module for outgoing evalAt calls.
// It is never used to evaluate incoming mesh requests (we don't register).
const session = createSession({
  output: (t) => process.stdout.write(t),
  stderr: (t) => process.stderr.write(t),
  readFile: (p) => readFileSync(p, 'utf8'),
})

// Client-only MeshNode: can send evals and discover nodes, but never registered
// in the mesh — start() is intentionally not called.
const meshNode = new MeshNode({ nodeId: 'local-connector', session, broker })
session.runtime.installModules([makeNodeHostModule(session), makeMeshModule(meshNode)])

async function main(): Promise<void> {
  console.log(`[mesh]  Connected to broker: ${maskRedisUrl(REDIS_URL)} (client-only, not registered)`)

  startNreplServer({
    session,
    meshNode,
    port: NREPL_PORT,
    host: '127.0.0.1',
    writePortFile: true,
    onOutput: (t) => process.stdout.write(t),
  })
  console.log(`[nrepl] Listening on 127.0.0.1:${NREPL_PORT}`)
  console.log(`[nrepl] Connect your editor, then try:`)
  console.log(`          (mesh/list-nodes)`)
  console.log(`          (mesh/set-target! "node1")`)
  console.log(`          (mesh/set-target! nil)  ; back to local`)
  console.log('[mesh]  Press Ctrl+C to stop\n')

  const shutdown = async () => {
    console.log('\n[mesh] Disconnecting...')
    await broker.close()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown())
  process.on('SIGTERM', () => void shutdown())
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
