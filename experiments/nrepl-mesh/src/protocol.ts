/**
 * nREPL Mesh — broker-agnostic wire protocol types.
 *
 * Messages carry all routing information as opaque strings so the broker
 * implementation can interpret them however it needs to (Redis list key,
 * AMQP reply queue, Postgres LISTEN channel, etc.).
 */

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export type EvalRequest = {
  type: 'eval'
  /** Correlation ID — echoed back in the reply. */
  id: string
  /** Raw Clojure source string to evaluate. */
  source: string
  /** Opaque broker-specific address where the reply should be sent. */
  replyTo: string
  /** Optional namespace hint. */
  ns?: string
}

// Union grows as new message types are added (e.g. 'ping', 'introspect').
export type MeshMessage = EvalRequest

// ---------------------------------------------------------------------------
// Streaming chunks — sent in real-time from the evaluating node back to the
// requester during evaluation, before the terminal EvalReply arrives.
// ---------------------------------------------------------------------------

export type OutChunk = { type: 'out'; text: string }
export type ErrChunk = { type: 'err'; text: string }
/** A single streaming output frame — stdout or stderr. */
export type MeshStreamChunk = OutChunk | ErrChunk

// ---------------------------------------------------------------------------
// Replies — the terminal message that ends a streaming eval session.
// ---------------------------------------------------------------------------

export type EvalReply = {
  type: 'eval-reply'
  /** Echoed correlation ID. */
  id: string
  /** printString(result), present on success. */
  value?: string
  /** Error message, present on failure. */
  error?: string
}

// Union grows alongside MeshMessage.
export type MeshReply = EvalReply
