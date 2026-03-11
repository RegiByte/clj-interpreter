/**
 * MeshNode — a Conjure session attached to the broker-agnostic mesh.
 *
 * Each node:
 *   - Registers itself in the broker's node registry on start
 *   - Subscribes to its own channel and evaluates incoming eval requests
 *   - Exposes evalAt() to send a form to another node and await the result
 *   - Exposes listNodes() to discover peers (optionally by capability)
 *
 * The node owns neither the session nor the broker — both are passed in.
 * This means users can attach a mesh node to any existing Conjure session
 * running in their process, with any broker implementation.
 *
 * Wire contract:
 *   - Forms travel as raw Clojure source strings.
 *   - Results travel as printString(CljValue) — EDN-printable output only.
 *   - Async forms (async ...) are evaluated transparently via evaluateAsync.
 */

import { type Session, printString } from 'conjure-js'
import type { MeshBroker, NodeInfo, Unsubscribe } from './broker.js'
import type { EvalReply, EvalRequest } from './protocol.js'

export type MeshNodeOptions = {
  nodeId: string
  session: Session
  broker: MeshBroker
  /** Capability tags advertised to the mesh. Typically sourced from the
   *  session's installed RuntimeModules. */
  capabilities?: string[]
  /** How often to re-register with the broker in milliseconds. Default: 7000. */
  heartbeatIntervalMs?: number
}

export type EvalResult = {
  value?: string
  error?: string
}

export class MeshNode {
  readonly nodeId: string
  private readonly session: Session
  private readonly broker: MeshBroker
  private readonly capabilities: string[]
  private readonly heartbeatIntervalMs: number
  private unsubscribe?: Unsubscribe
  private heartbeatInterval?: ReturnType<typeof setInterval>
  private running = false

  constructor(opts: MeshNodeOptions) {
    this.nodeId = opts.nodeId
    this.session = opts.session
    this.broker = opts.broker
    this.capabilities = opts.capabilities ?? []
    this.heartbeatIntervalMs = opts.heartbeatIntervalMs ?? 7_000
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true

    const info: NodeInfo = {
      id: this.nodeId,
      capabilities: this.capabilities,
      lastSeen: Date.now(),
    }
    await this.broker.register(info)

    this.heartbeatInterval = setInterval(async () => {
      await this.broker.register({ ...info, lastSeen: Date.now() })
    }, this.heartbeatIntervalMs)

    this.unsubscribe = await this.broker.subscribe(this.nodeId, (msg) => {
      if (msg.type === 'eval') void this.handleEval(msg)
    })
  }

  private async handleEval(req: EvalRequest): Promise<void> {
    let reply: EvalReply
    try {
      const result = await this.session.evaluateAsync(req.source)
      reply = { type: 'eval-reply', id: req.id, value: printString(result) }
    } catch (e) {
      reply = {
        type: 'eval-reply',
        id: req.id,
        error: e instanceof Error ? e.message : String(e),
      }
    }
    await this.broker.reply(req.replyTo, reply)
  }

  async evalAt(targetId: string, source: string, timeoutMs = 10_000): Promise<EvalResult> {
    const id = crypto.randomUUID()
    const replyTo = this.broker.allocReplyAddr(id)

    // Start waiting BEFORE sending — a fast node may reply before we BLPOP.
    // awaitReply implementations must be safe when data is already present.
    const replyPromise = this.broker.awaitReply(replyTo, timeoutMs)
    await this.broker.send(targetId, { type: 'eval', id, source, replyTo })

    const reply = await replyPromise
    if (!reply) {
      throw new Error(`Timeout: no response from node "${targetId}" within ${timeoutMs}ms`)
    }
    return { value: reply.value, error: reply.error }
  }

  async listNodes(capability?: string): Promise<NodeInfo[]> {
    return this.broker.discover(capability)
  }

  async stop(): Promise<void> {
    if (!this.running) return
    this.running = false
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)
    await this.unsubscribe?.()
    await this.broker.deregister(this.nodeId)
  }
}
