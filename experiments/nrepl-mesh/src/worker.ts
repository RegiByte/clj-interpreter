/**
 * nREPL Mesh — pure worker node (no nREPL server).
 *
 * Registers in the mesh, evaluates incoming requests, and streams output
 * back to the requester. That's all. No TCP server, no port file.
 * Use this when you don't need a REPL attached to the worker process.
 *
 * Usage:
 *   NODE_ID=worker1 REDIS_URL=redis://... bun src/worker.ts
 *
 * Env:
 *   NODE_ID       — node id advertised to the mesh (default: random)
 *   REDIS_URL     — broker URL (default: redis://localhost:6379)
 */

import { readFileSync } from 'node:fs'
import { createSession } from '@regibyte/cljam'
import { makeNodeHostModule } from 'cljam/nrepl'
import { createRedisBroker } from './brokers/redis.js'
import { MeshNode } from './mesh-node.js'
import { makeMeshModule } from './mesh-module.js'

const nodeId = process.env.NODE_ID ?? `worker-${crypto.randomUUID().slice(0, 8)}`
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

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

let currentOut: ((t: string) => void) | null = null
let currentErr: ((t: string) => void) | null = null
const outputRedirect = {
  install: (out: (t: string) => void, err: (t: string) => void) => { currentOut = out; currentErr = err },
  uninstall: () => { currentOut = null; currentErr = null },
}

const session = createSession({
  output: (t) => { process.stdout.write(t); currentOut?.(t) },
  stderr: (t) => { process.stderr.write(t); currentErr?.(t) },
  readFile: (p) => readFileSync(p, 'utf8'),
})

const meshNode = new MeshNode({ nodeId, session, broker, outputRedirect })
session.runtime.installModules([makeNodeHostModule(session), makeMeshModule(meshNode)])

async function main(): Promise<void> {
  await meshNode.start()
  console.log(`[worker] Node "${nodeId}" started — broker: ${maskRedisUrl(REDIS_URL)}`)
  console.log('[worker] Press Ctrl+C to stop\n')

  const shutdown = async () => {
    console.log(`\n[worker] Stopping "${nodeId}"...`)
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
