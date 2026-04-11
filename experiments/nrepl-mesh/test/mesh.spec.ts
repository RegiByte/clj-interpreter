/**
 * nREPL Mesh — same-process integration tests.
 *
 * Two nodes running in the same process, each with their own broker instance,
 * communicating through Redis. Requires Redis on localhost:6379
 * (docker compose up in this folder).
 */

import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createSession } from '@regibyte/cljam'
import { createRedisBroker } from '../src/brokers/redis.js'
import { MeshNode } from '../src/mesh-node.js'
import type { RedisBroker } from '../src/brokers/redis.js'
import type { MeshBroker, NodeInfo } from '../src/broker.js'

describe('nREPL mesh — two nodes, one Redis', () => {
  let nodeA: MeshNode
  let nodeB: MeshNode
  let brokerA: RedisBroker
  let brokerB: RedisBroker

  beforeAll(async () => {
    brokerA = createRedisBroker()
    brokerB = createRedisBroker()

    nodeA = new MeshNode({ nodeId: 'test-node-a', session: createSession(), broker: brokerA })
    nodeB = new MeshNode({ nodeId: 'test-node-b', session: createSession(), broker: brokerB })

    await nodeA.start()
    await nodeB.start()
  }, 10_000)

  afterAll(async () => {
    await nodeA.stop()
    await nodeB.stop()
    await brokerA.close()
    await brokerB.close()
  })

  // --- basic eval ---

  test('node-a evals at node-b — arithmetic', async () => {
    const { value, error } = await nodeA.evalAt('test-node-b', '(+ 1 2)')
    expect(error).toBeUndefined()
    expect(value).toBe('3')
  })

  test('node-b evals at node-a — string op', async () => {
    const { value, error } = await nodeB.evalAt('test-node-a', '(str "hello" " world")')
    expect(error).toBeUndefined()
    expect(value).toBe('"hello world"')
  })

  test('eval returns keyword', async () => {
    const { value } = await nodeA.evalAt('test-node-b', ':some-key')
    expect(value).toBe(':some-key')
  })

  test('eval returns a vector', async () => {
    const { value } = await nodeA.evalAt('test-node-b', '[1 2 3]')
    expect(value).toBe('[1 2 3]')
  })

  test('eval returns a map', async () => {
    const { value } = await nodeA.evalAt('test-node-b', '{:a 1 :b 2}')
    expect(value).toBe('{:a 1 :b 2}')
  })

  // --- errors ---

  test('eval error — value is undefined, error is a string', async () => {
    const { value, error } = await nodeA.evalAt('test-node-b', '(/ 1 0)')
    expect(value).toBeUndefined()
    expect(typeof error).toBe('string')
    expect(error!.length).toBeGreaterThan(0)
  })

  test('unresolved symbol returns an error', async () => {
    const { value, error } = await nodeA.evalAt('test-node-b', 'undefined-sym')
    expect(value).toBeUndefined()
    expect(error).toBeTruthy()
  })

  test('(throw ...) returns an error with the thrown value', async () => {
    const { error } = await nodeA.evalAt('test-node-b', '(throw {:type :oops})')
    expect(error).toContain('Unhandled throw')
  })

  // --- state persistence ---

  test('session state persists between requests on the same node', async () => {
    await nodeA.evalAt('test-node-b', '(def remote-x 777)')
    const { value } = await nodeA.evalAt('test-node-b', 'remote-x')
    expect(value).toBe('777')
  })

  test('state on node-a is independent from node-b', async () => {
    await nodeA.evalAt('test-node-a', '(def local-y 111)')
    const { value: aValue } = await nodeA.evalAt('test-node-a', 'local-y')
    const { value: bValue, error: bError } = await nodeA.evalAt('test-node-b', 'local-y')
    expect(aValue).toBe('111')
    expect(bValue).toBeUndefined()
    expect(bError).toBeTruthy()
  })

  // --- async forms ---

  test('(async ...) form is evaluated and awaited transparently', async () => {
    const { value, error } = await nodeA.evalAt(
      'test-node-b',
      '(async (+ 1 @(promise-of 41)))'
    )
    expect(error).toBeUndefined()
    expect(value).toBe('42')
  })

  test('async rejection returns as error', async () => {
    const { error } = await nodeA.evalAt(
      'test-node-b',
      '(async (throw {:type :async-fail}))'
    )
    expect(error).toContain('Unhandled throw')
  })

  // --- node registry ---

  test('both nodes are visible in listNodes', async () => {
    const nodes = await nodeA.listNodes()
    const ids = nodes.map((n) => n.id)
    expect(ids).toContain('test-node-a')
    expect(ids).toContain('test-node-b')
  })

  test('stopped node is removed from registry', async () => {
    const tempBroker = createRedisBroker()
    const tempNode = new MeshNode({
      nodeId: 'temp-node',
      session: createSession(),
      broker: tempBroker,
    })
    await tempNode.start()

    const before = await nodeA.listNodes()
    expect(before.map((n) => n.id)).toContain('temp-node')

    await tempNode.stop()
    await tempBroker.close()

    const after = await nodeA.listNodes()
    expect(after.map((n) => n.id)).not.toContain('temp-node')
  })

  // --- capabilities ---

  test('nodes with no capabilities have empty capabilities array', async () => {
    const nodes = await nodeA.listNodes()
    const a = nodes.find((n) => n.id === 'test-node-a')
    expect(a?.capabilities).toEqual([])
  })

  test('listNodes filters by capability tag', async () => {
    const taggedBroker = createRedisBroker()
    const taggedNode = new MeshNode({
      nodeId: 'tagged-node',
      session: createSession(),
      broker: taggedBroker,
      capabilities: ['http', 'database'],
    })
    await taggedNode.start()

    const httpNodes = await nodeA.listNodes('http')
    expect(httpNodes.map((n) => n.id)).toContain('tagged-node')

    const dbNodes = await nodeA.listNodes('database')
    expect(dbNodes.map((n) => n.id)).toContain('tagged-node')

    const mlNodes = await nodeA.listNodes('ml')
    expect(mlNodes.map((n) => n.id)).not.toContain('tagged-node')

    await taggedNode.stop()
    await taggedBroker.close()
  })

  // --- timeout ---

  test('evalAt throws immediately when target node is not registered', async () => {
    await expect(
      nodeA.evalAt('ghost-node', '(+ 1 2)', 500)
    ).rejects.toThrow('not registered')
  }, 3_000)
})

// ---------------------------------------------------------------------------
// Heartbeat unit tests — no Redis required
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

describe('MeshNode heartbeat — unit tests', () => {
  function createMockBroker(): MeshBroker & { registerCalls: NodeInfo[] } {
    const registerCalls: NodeInfo[] = []
    return {
      registerCalls,
      async send() {},
      async subscribe(_nodeId, _handler) { return async () => {} },
      async reply() {},
      async awaitReply() { return null },
      allocReplyAddr(id: string) { return `reply:${id}` },
      async register(info: NodeInfo) { registerCalls.push({ ...info }) },
      async deregister() {},
      async discover() { return [] },
      async close() {},
    }
  }

  test('register is called on start, then on each heartbeat interval', async () => {
    const broker = createMockBroker()
    const node = new MeshNode({
      nodeId: 'hb-node',
      session: createSession(),
      broker,
      heartbeatIntervalMs: 20,
    })

    await node.start()
    expect(broker.registerCalls.length).toBe(1)  // initial register

    await sleep(55)  // enough time for ≥ 2 heartbeats at 20ms interval
    expect(broker.registerCalls.length).toBeGreaterThanOrEqual(3)

    await node.stop()
  }, 2_000)

  test('heartbeat stops after stop() is called', async () => {
    const broker = createMockBroker()
    const node = new MeshNode({
      nodeId: 'hb-stop-node',
      session: createSession(),
      broker,
      heartbeatIntervalMs: 20,
    })

    await node.start()
    await sleep(30)  // let at least one heartbeat fire
    const countBeforeStop = broker.registerCalls.length
    expect(countBeforeStop).toBeGreaterThanOrEqual(2)

    await node.stop()

    const countAfterStop = broker.registerCalls.length
    await sleep(40)  // wait past another interval — no new calls expected
    expect(broker.registerCalls.length).toBe(countAfterStop)
  }, 2_000)

  test('each heartbeat updates lastSeen', async () => {
    const broker = createMockBroker()
    const node = new MeshNode({
      nodeId: 'hb-time-node',
      session: createSession(),
      broker,
      heartbeatIntervalMs: 20,
    })

    await node.start()
    const firstLastSeen = broker.registerCalls[0].lastSeen

    await sleep(30)  // wait for at least one heartbeat
    const lastCall = broker.registerCalls[broker.registerCalls.length - 1]
    expect(lastCall.lastSeen).toBeGreaterThanOrEqual(firstLastSeen)

    await node.stop()
  }, 2_000)
})
