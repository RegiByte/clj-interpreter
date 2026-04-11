/**
 * nREPL Mesh — remote server node (nREPL + mesh).
 *
 * Usage (remote machine):
 *   NODE_ID=my-server REDIS_URL=redis://... bun src/nrepl-server.ts
 *
 * Env:
 *   NODE_ID       — node id advertised to the mesh (default: random)
 *   REDIS_URL     — broker URL (default: redis://localhost:6379)
 *   NREPL_PORT    — nREPL TCP port (default: 7888)
 *   NREPL_HOST    — bind address (default: 0.0.0.0)
 *
 * After the server is running:
 *   - Connect any nREPL client on NREPL_HOST:NREPL_PORT
 *   - Other nodes can route evals here via (mesh/with-node "my-server" '(+ 1 2))
 *   - From the REPL: (mesh/list-nodes) shows all live peers
 */

import { readFileSync } from 'node:fs'
import { createSession } from '@regibyte/cljam'
import { startNreplServer, makeNodeHostModule } from 'cljam/nrepl'
import { createRedisBroker } from './brokers/redis.js'
import { MeshNode } from './mesh-node.js'
import { makeMeshModule } from './mesh-module.js'

const nodeId = process.env.NODE_ID ?? process.argv[2] ?? `node-${crypto.randomUUID().slice(0, 8)}`
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'
const NREPL_PORT = Number(process.env.NREPL_PORT ?? 7888)
const NREPL_HOST = process.env.NREPL_HOST ?? '0.0.0.0'

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
  // Always echo to the server terminal so local operators can see eval output.
  // Also forward to the mesh requester when a mesh eval is in progress.
  output: (t) => { process.stdout.write(t); currentOut?.(t) },
  stderr: (t) => { process.stderr.write(t); currentErr?.(t) },
  readFile: (p) => readFileSync(p, 'utf8'),
})
const meshNode = new MeshNode({ nodeId, session, broker, outputRedirect })
session.runtime.installModules([makeNodeHostModule(session), makeMeshModule(meshNode)])

async function main(): Promise<void> {
  await meshNode.start()
  console.log(`[mesh]  Node "${nodeId}" started — broker: ${maskRedisUrl(REDIS_URL)}`)

  startNreplServer({
    session,
    meshNode,
    port: NREPL_PORT,
    host: NREPL_HOST,
    writePortFile: false,
  })
  console.log(`[nrepl] Listening on ${NREPL_HOST}:${NREPL_PORT}`)
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
