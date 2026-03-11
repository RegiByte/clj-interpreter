/**
 * MeshBroker — the transport abstraction for the nREPL mesh.
 *
 * Implementations must satisfy four primitives:
 *   1. Point-to-point delivery  — send a message to a specific node
 *   2. Subscription             — listen for messages addressed to this node
 *   3. Reply correlation        — deliver a reply to an opaque address
 *   4. Presence / discovery     — register, deregister, and discover nodes
 *
 * The broker is broker-specific only in its constructor options and in the
 * meaning of `replyAddr` strings. Everything above that is protocol-agnostic.
 */

import type { MeshMessage, MeshReply, MeshStreamChunk } from './protocol.js'

// ---------------------------------------------------------------------------
// Node registry
// ---------------------------------------------------------------------------

export type NodeInfo = {
  id: string
  /** Capability tags collected from installed RuntimeModules. */
  capabilities: string[]
  /** Unix ms — updated on each register() / heartbeat call. */
  lastSeen: number
}

// ---------------------------------------------------------------------------
// Broker interface
// ---------------------------------------------------------------------------

export type Unsubscribe = () => Promise<void>

export interface MeshBroker {
  /**
   * Deliver a message to a specific node by ID.
   * Fire-and-forget — the broker does not guarantee delivery if the node
   * is not subscribed; callers should use awaitReply with a timeout.
   */
  send(nodeId: string, msg: MeshMessage): Promise<void>

  /**
   * Subscribe to messages addressed to `nodeId`.
   * Returns an unsubscribe function; call it to stop listening.
   */
  subscribe(nodeId: string, handler: (msg: MeshMessage) => void): Promise<Unsubscribe>

  /**
   * Push a streaming output chunk to the reply address.
   * Called by the evaluating node for each println/print during evaluation.
   * Fire-and-forget from the caller's perspective; the broker must preserve
   * FIFO order within the reply address.
   */
  sendChunk(replyAddr: string, chunk: MeshStreamChunk): Promise<void>

  /**
   * Deliver the terminal reply to the opaque address produced by allocReplyAddr().
   * The broker may attach a TTL so stale keys self-clean.
   */
  reply(replyAddr: string, reply: MeshReply): Promise<void>

  /**
   * Read from `replyAddr` in a loop, calling `onChunk` for each streaming
   * output chunk, until the terminal EvalReply arrives or `timeoutMs` elapses.
   * Returns the terminal reply, or null on timeout.
   *
   * IMPORTANT: callers must start streamReply BEFORE calling send() to avoid
   * the race where a fast node replies before the caller starts listening.
   * Brokers must handle this safely (e.g. BLPOP on a pre-populated list
   * returns immediately).
   */
  streamReply(
    replyAddr: string,
    onChunk: (chunk: MeshStreamChunk) => void,
    timeoutMs: number
  ): Promise<MeshReply | null>

  /**
   * Convenience wrapper around streamReply that discards chunks.
   * Kept for backward compatibility.
   */
  awaitReply(replyAddr: string, timeoutMs: number): Promise<MeshReply | null>

  /**
   * Allocate a fresh, unique reply address for the given correlation ID.
   * The meaning is broker-specific: a Redis list key, an AMQP queue name, etc.
   */
  allocReplyAddr(correlationId: string): string

  /**
   * Register or refresh this node's presence in the registry.
   * Callers should call this periodically for heartbeat semantics.
   */
  register(info: NodeInfo): Promise<void>

  /**
   * Remove a node from the registry (called on graceful shutdown).
   */
  deregister(nodeId: string): Promise<void>

  /**
   * Return all known live nodes, optionally filtered by a capability tag.
   */
  discover(capability?: string): Promise<NodeInfo[]>

  /**
   * Release all broker-held resources (connections, timers, etc.).
   * The broker should not be used after close() is called.
   */
  close(): Promise<void>
}
