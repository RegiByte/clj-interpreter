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

import { type Session, printString } from '@regibyte/cljam'
import type { MeshBroker, NodeInfo, Unsubscribe } from './broker.js'
import type { EvalReply, EvalRequest, MeshStreamChunk } from './protocol.js'

/**
 * Mutable output redirect installed around each eval.
 *
 * The session is created with output/stderr handlers that call
 * `currentOut` / `currentErr`. Before each eval, MeshNode installs
 * per-eval handlers that fire-and-forget stream chunks to the requester.
 * After the eval (and after all chunks are flushed), the handlers are cleared.
 *
 * Usage in server scripts:
 *   let currentOut: ((t: string) => void) | null = null
 *   let currentErr: ((t: string) => void) | null = null
 *   const outputRedirect: OutputRedirect = {
 *     install: (out, err) => { currentOut = out; currentErr = err },
 *     uninstall: () => { currentOut = null; currentErr = null },
 *   }
 *   const session = createSession({
 *     output: (t) => { currentOut?.(t) },
 *     stderr: (t) => { currentErr?.(t) },
 *   })
 *   new MeshNode({ ..., outputRedirect })
 */
export type OutputRedirect = {
  install(out: (text: string) => void, err: (text: string) => void): void
  uninstall(): void
}

export type MeshNodeOptions = {
  nodeId: string
  session: Session
  broker: MeshBroker
  /** Capability tags advertised to the mesh. Typically sourced from the
   *  session's installed RuntimeModules. */
  capabilities?: string[]
  /** How often to re-register with the broker in milliseconds. Default: 7000. */
  heartbeatIntervalMs?: number
  /**
   * When provided, stdout/stderr from each eval is streamed back to the
   * requester in real-time as chunks, before the terminal eval-reply.
   * See OutputRedirect for the wiring pattern.
   */
  outputRedirect?: OutputRedirect
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
  private readonly outputRedirect?: OutputRedirect
  private unsubscribe?: Unsubscribe
  private heartbeatInterval?: ReturnType<typeof setInterval>
  private running = false

  constructor(opts: MeshNodeOptions) {
    this.nodeId = opts.nodeId
    this.session = opts.session
    this.broker = opts.broker
    this.capabilities = opts.capabilities ?? []
    this.heartbeatIntervalMs = opts.heartbeatIntervalMs ?? 7_000
    this.outputRedirect = opts.outputRedirect
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
    // Collect fire-and-forget sendChunk promises so we can flush them before
    // the terminal reply. This guarantees the requester's streamReply loop
    // always sees every chunk before the eval-reply sentinel.
    const pendingChunks: Promise<void>[] = []

    if (this.outputRedirect) {
      this.outputRedirect.install(
        (text) => { pendingChunks.push(this.broker.sendChunk(req.replyTo, { type: 'out', text })) },
        (text) => { pendingChunks.push(this.broker.sendChunk(req.replyTo, { type: 'err', text })) }
      )
    }

    // Temporarily switch to the requester's namespace so symbols resolve the
    // same way they would locally. Restore afterward regardless of outcome.
    const prevNs = this.session.currentNs
    if (req.ns && req.ns !== prevNs) {
      try { this.session.setNs(req.ns) } catch { /* ns doesn't exist on this node — stay put */ }
    }

    let reply: EvalReply
    try {
      const result = await this.session.evaluateAsync(req.source)
      // Flush all output chunks to Redis before the terminal reply so ordering
      // is guaranteed: requester sees chunks first, then eval-reply.
      if (pendingChunks.length > 0) await Promise.all(pendingChunks)
      reply = { type: 'eval-reply', id: req.id, value: printString(result) }
    } catch (e) {
      if (pendingChunks.length > 0) await Promise.all(pendingChunks)
      reply = { type: 'eval-reply', id: req.id, error: e instanceof Error ? e.message : String(e) }
    } finally {
      this.outputRedirect?.uninstall()
      if (req.ns && this.session.currentNs !== prevNs) {
        try { this.session.setNs(prevNs) } catch { /* ignore */ }
      }
    }
    await this.broker.reply(req.replyTo, reply)
  }

  async evalAt(
    targetId: string,
    source: string,
    ns?: string,
    timeoutMs = 10_000,
    onChunk?: (chunk: MeshStreamChunk) => void
  ): Promise<EvalResult> {
    // Pre-flight: fail fast instead of timing out for unknown/dead nodes.
    const nodes = await this.broker.discover()
    if (!nodes.some((n) => n.id === targetId)) {
      const known = nodes.map((n) => n.id).join(', ') || '(none)'
      throw new Error(`Node "${targetId}" is not registered in the mesh. Known nodes: ${known}`)
    }

    const id = crypto.randomUUID()
    const replyTo = this.broker.allocReplyAddr(id)

    // Start streaming BEFORE sending — a fast node may reply before we BLPOP.
    const replyPromise = this.broker.streamReply(replyTo, onChunk ?? (() => {}), timeoutMs)
    await this.broker.send(targetId, { type: 'eval', id, source, replyTo, ns })

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
