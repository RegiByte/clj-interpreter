/**
 * nREPL Mesh — local development node (nREPL + mesh).
 *
 * Usage (local machine):
 *   REDIS_URL=redis://... bun src/nrepl-local.ts
 *
 * Env:
 *   NODE_ID       — local node id (default: "local")
 *   REDIS_URL     — broker URL, same cluster as the remote server
 *   NREPL_PORT    — nREPL TCP port (default: 7888)
 *
 * Workflow:
 *   1. Start: REDIS_URL=redis://... bun src/nrepl-local.ts
 *   2. Connect your editor to localhost:NREPL_PORT
 *   3. List peers:           (mesh/list-nodes)
 *   4. Route to remote:      (mesh/set-target! "my-server")
 *   5. All evals now go to the remote node.
 *   6. Return to local:      (mesh/set-target! nil)
 *   7. One-off remote eval:  (mesh/with-node "my-server" '(+ 1 2))
 */

import { readFileSync } from 'node:fs'
import { createSession } from 'conjure-js'
import { startNreplServer } from 'conjure-js/nrepl'
import { createRedisBroker } from './brokers/redis.js'
import { MeshNode } from './mesh-node.js'
import { makeMeshModule } from './mesh-module.js'

const nodeId = process.env.NODE_ID ?? process.argv[2] ?? 'local'
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

// Mutable per-eval output targets — MeshNode installs/uninstalls them around each eval.
let currentOut: ((t: string) => void) | null = null
let currentErr: ((t: string) => void) | null = null
const outputRedirect = {
  install: (out: (t: string) => void, err: (t: string) => void) => { currentOut = out; currentErr = err },
  uninstall: () => { currentOut = null; currentErr = null },
}
const session = createSession({
  output: (t) => { currentOut?.(t) },
  stderr: (t) => { currentErr?.(t) },
  readFile: (p) => readFileSync(p, 'utf8'),
})
const meshNode = new MeshNode({ nodeId, session, broker, outputRedirect })
session.runtime.installModules([makeMeshModule(meshNode)])

async function main(): Promise<void> {
  await meshNode.start()
  console.log(`[mesh]  Node "${nodeId}" started — broker: ${maskRedisUrl(REDIS_URL)}`)

  startNreplServer({
    session,
    meshNode,
    port: NREPL_PORT,
    host: '127.0.0.1',
    writePortFile: true,
  })
  console.log(`[nrepl] Listening on 127.0.0.1:${NREPL_PORT}`)
  console.log(`[nrepl] Connect your editor, then try:`)
  console.log(`          (mesh/list-nodes)`)
  console.log(`          (mesh/set-target! "remote-node-id")`)
  console.log('[mesh]  Press Ctrl+C to stop\n')

  const shutdown = async () => {
    console.log(`\n[mesh] Stopping node "${nodeId}"...`)
    await meshNode.stop()
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
