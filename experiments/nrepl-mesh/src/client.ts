/**
 * nREPL Mesh — interactive CLI client.
 *
 * Usage:
 *   bun src/client.ts                  # list available nodes, then exit
 *   bun src/client.ts <target-node-id> # enter a REPL targeting that node
 *
 * REPL commands:
 *   :nodes          — refresh and print the node list
 *   :target <id>    — switch to a different target node
 *   :quit           — exit
 *   <form>          — evaluate at the current target node
 */

import { createInterface } from 'node:readline'
import { createSession } from '@regibyte/cljam'
import { createRedisBroker } from './brokers/redis.js'
import { MeshNode } from './mesh-node.js'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

const session = createSession()
const broker = createRedisBroker({ url: REDIS_URL })
const client = new MeshNode({
  nodeId: `client-${process.pid}`,
  session,
  broker,
})

const rl = createInterface({ input: process.stdin, output: process.stdout })

function prompt(target: string): void {
  rl.question(`[${target}]> `, async (input) => {
    const trimmed = input.trim()
    if (!trimmed) {
      prompt(target)
      return
    }

    if (trimmed === ':quit') {
      await client.stop()
      await broker.close()
      rl.close()
      process.exit(0)
    }

    if (trimmed === ':nodes') {
      await printNodes()
      prompt(target)
      return
    }

    const targetSwitch = trimmed.match(/^:target\s+(.+)$/)
    if (targetSwitch) {
      const newTarget = targetSwitch[1].trim()
      console.log(`Switched target to: ${newTarget}`)
      prompt(newTarget)
      return
    }

    try {
      const { value, error } = await client.evalAt(target, trimmed)
      if (error) {
        console.log(`Error: ${error}`)
      } else {
        console.log(`=> ${value}`)
      }
    } catch (e) {
      console.log(`Error: ${e instanceof Error ? e.message : String(e)}`)
    }

    prompt(target)
  })
}

async function printNodes(): Promise<void> {
  const nodes = await client.listNodes()
  if (nodes.length === 0) {
    console.log('No nodes registered.')
    return
  }
  console.log('\nNodes:')
  for (const n of nodes) {
    const ageSec = Math.floor((Date.now() - n.lastSeen) / 1000)
    const marker = n.id === client.nodeId ? ' (you)' : ''
    const caps = n?.capabilities?.length > 0 ? `  [${n.capabilities.join(', ')}]` : ''
    console.log(`  ${n.id}${marker}${caps}  — seen ${ageSec}s ago`)
  }
  console.log()
}

async function main(): Promise<void> {
  await client.start()

  const targetArg = process.argv[2]

  if (!targetArg) {
    console.log('nREPL Mesh — available nodes:\n')
    await printNodes()
    console.log('Usage: bun src/client.ts <target-node-id>')
    await client.stop()
    await broker.close()
    rl.close()
    return
  }

  console.log(`nREPL Mesh client — targeting: ${targetArg}`)
  console.log('Commands: :nodes, :target <id>, :quit\n')
  prompt(targetArg)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
