/**
 * RedisBroker — MeshBroker implementation backed by Redis.
 *
 * Transport mechanics:
 *   - send()       → PUBLISH mesh:req:{nodeId}
 *   - subscribe()  → SUBSCRIBE mesh:req:{nodeId}
 *   - reply()      → LPUSH mesh:reply:{id}  +  EXPIRE
 *   - awaitReply() → BLPOP mesh:reply:{id}  (dedicated per-call connection)
 *   - register()   → HSET mesh:nodes {id} <JSON>
 *   - deregister() → HDEL mesh:nodes {id}
 *   - discover()   → HGETALL mesh:nodes, filter by capability tag
 *
 * The `replyAddr` is a Redis list key; its meaning is opaque to callers.
 * Stale reply keys expire automatically (REPLY_TTL_SEC).
 *
 * Note on connections:
 *   `pub` handles all write commands. `sub` is dedicated to SUBSCRIBE (Redis
 *   requires a connection in subscriber mode to not mix commands).
 *   Each awaitReply() call opens a temporary third connection for BLPOP, since
 *   BLPOP monopolises the connection while blocking.
 */

import Redis from 'ioredis'
import type { MeshBroker, NodeInfo, Unsubscribe } from '../broker.js'
import type { MeshMessage, MeshReply } from '../protocol.js'

const NODES_KEY = 'mesh:nodes'
const REPLY_TTL_SEC = 30

const reqChannel = (nodeId: string) => `mesh:req:${nodeId}`
const replyKey = (correlationId: string) => `mesh:reply:${correlationId}`

export type RedisBrokerOptions = {
  url?: string
}

export class RedisBroker implements MeshBroker {
  private readonly url: string
  private pub: Redis
  private sub: Redis

  constructor(opts: RedisBrokerOptions = {}) {
    this.url = opts.url ?? 'redis://localhost:6379'
    this.pub = new Redis(this.url)
    this.sub = new Redis(this.url)
  }

  async send(nodeId: string, msg: MeshMessage): Promise<void> {
    await this.pub.publish(reqChannel(nodeId), JSON.stringify(msg))
  }

  async subscribe(nodeId: string, handler: (msg: MeshMessage) => void): Promise<Unsubscribe> {
    await this.sub.subscribe(reqChannel(nodeId))

    const listener = (channel: string, raw: string) => {
      if (channel !== reqChannel(nodeId)) return
      try {
        handler(JSON.parse(raw) as MeshMessage)
      } catch {
        // malformed message — ignore
      }
    }

    this.sub.on('message', listener)

    return async () => {
      this.sub.off('message', listener)
      await this.sub.unsubscribe(reqChannel(nodeId))
    }
  }

  async reply(replyAddr: string, reply: MeshReply): Promise<void> {
    await this.pub.lpush(replyAddr, JSON.stringify(reply))
    await this.pub.expire(replyAddr, REPLY_TTL_SEC)
  }

  async awaitReply(replyAddr: string, timeoutMs: number): Promise<MeshReply | null> {
    // A dedicated connection is required: BLPOP blocks the connection.
    const blocker = new Redis(this.url)
    try {
      const timeoutSec = Math.max(1, Math.ceil(timeoutMs / 1000))
      const res = await blocker.blpop(replyAddr, timeoutSec)
      if (!res) return null
      return JSON.parse(res[1]) as MeshReply
    } finally {
      blocker.disconnect()
    }
  }

  allocReplyAddr(correlationId: string): string {
    return replyKey(correlationId)
  }

  async register(info: NodeInfo): Promise<void> {
    await this.pub.hset(NODES_KEY, info.id, JSON.stringify(info))
  }

  async deregister(nodeId: string): Promise<void> {
    await this.pub.hdel(NODES_KEY, nodeId)
  }

  async discover(capability?: string): Promise<NodeInfo[]> {
    const raw = await this.pub.hgetall(NODES_KEY)
    const nodes = Object.values(raw).map((v) => JSON.parse(v) as NodeInfo)
    if (!capability) return nodes
    return nodes.filter((n) => n.capabilities?.includes(capability))
  }

  async close(): Promise<void> {
    this.sub.disconnect()
    this.pub.disconnect()
  }
}

export function createRedisBroker(opts?: RedisBrokerOptions): RedisBroker {
  return new RedisBroker(opts)
}
