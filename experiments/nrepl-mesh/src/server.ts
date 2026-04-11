/**
 * nREPL Mesh — standalone server node.
 *
 * Usage:
 *   bun src/server.ts [node-id]
 *
 * Env:
 *   REDIS_URL — broker URL (default: redis://localhost:6379)
 *
 * Starts a MeshNode that registers itself, listens for eval requests,
 * and keeps running until Ctrl+C.
 */

import { createSession } from '@regibyte/cljam'
import { createRedisBroker } from './brokers/redis.js'
import { MeshNode } from './mesh-node.js'

const nodeId = process.argv[2] ?? `node-${crypto.randomUUID().slice(0, 8)}`
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

const session = createSession()
const broker = createRedisBroker({ url: REDIS_URL })
const node = new MeshNode({ nodeId, session, broker })

async function main() {
  await node.start()
  console.log(`[mesh] Node "${nodeId}" started — broker: ${REDIS_URL}`)
  console.log(`[mesh] Connect with:  bun src/client.ts ${nodeId}`)
  console.log('[mesh] Press Ctrl+C to stop\n')

  process.on('SIGINT', async () => {
    console.log(`\n[mesh] Stopping node "${nodeId}"...`)
    await node.stop()
    await broker.close()
    process.exit(0)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
