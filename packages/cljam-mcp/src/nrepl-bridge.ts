/**
 * nREPL bridge for cljam-mcp — Mode 2.
 *
 * Opens a TCP connection to a running nREPL server (cljam or standard JVM nREPL)
 * and exposes eval / session management as typed async methods.
 *
 * Wire protocol reference: packages/cljam/src/bin/nrepl.ts (server side).
 * Message flow for eval:
 *   → { op: "eval", id, session, code }
 *   ← { id, session, out: "..." }   (0..N output chunks, no status)
 *   ← { id, session, status: ["done"], value: "...", ns: "..." }   (success)
 *   ← { id, session, status: ["eval-error","done"], ex: "...", err: "..." } (failure)
 *
 * Message flow for clone:
 *   → { op: "clone", id }
 *   ← { id, status: ["done"], "new-session": "uuid" }
 */
import * as net from 'net'
import { randomUUID } from 'node:crypto'
import { BEncoderStream, BDecoderStream } from './bencode.js'

type NreplMsg = Record<string, unknown>

interface PendingOp {
  chunks: string[]
  resolve: (msg: NreplMsg & { _out: string }) => void
  reject: (err: Error & { _out?: string }) => void
}

export interface NreplSessionInfo {
  id: string
  ns: string
}

export interface NreplEvalResult {
  value?: string
  error?: string
  out?: string
  ns?: string
}

// ---------------------------------------------------------------------------
// NreplConnection — one TCP connection to an nREPL server
// ---------------------------------------------------------------------------

export class NreplConnection {
  /** Unique ID for this connection (used as connection_id in MCP tools). */
  readonly id: string

  private encoder: BEncoderStream
  private decoder: BDecoderStream
  private socket: net.Socket
  private pending = new Map<string, PendingOp>()
  private _sessions = new Map<string, NreplSessionInfo>()

  private constructor(socket: net.Socket) {
    this.id = randomUUID()
    this.socket = socket
    this.encoder = new BEncoderStream()
    this.decoder = new BDecoderStream()
    // Wire the streams: encoder → socket → decoder
    this.encoder.pipe(socket)
    socket.pipe(this.decoder)
    this.decoder.on('data', (msg: NreplMsg) => this._onMessage(msg))
    socket.on('error', (err) => this._onSocketError(err))
  }

  /** Open a TCP connection to an nREPL server at host:port. */
  static connect(host: string, port: number): Promise<NreplConnection> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host, port }, () =>
        resolve(new NreplConnection(socket))
      )
      socket.once('error', reject)
    })
  }

  // ── Private message routing ────────────────────────────────────────────

  private _onSocketError(err: Error): void {
    // Reject all pending ops when the socket dies
    for (const op of this.pending.values()) {
      op.reject(Object.assign(new Error(`Socket error: ${err.message}`), { _out: '' }))
    }
    this.pending.clear()
  }

  private _onMessage(msg: NreplMsg): void {
    const id = msg['id'] as string | undefined
    if (!id) return

    const op = this.pending.get(id)
    if (!op) return

    // Accumulate output chunks — intermediate messages have no status field
    if (typeof msg['out'] === 'string') op.chunks.push(msg['out'])
    // err chunks from the nREPL server (e.g. stderr from evaluation)
    if (typeof msg['err'] === 'string') op.chunks.push(`[stderr] ${msg['err']}`)

    const status = msg['status'] as string[] | undefined
    if (!status) return // intermediate message — wait for final status

    this.pending.delete(id)

    if (status.includes('eval-error')) {
      const errMsg = (msg['ex'] ?? msg['err'] ?? 'eval-error') as string
      op.reject(
        Object.assign(new Error(errMsg), { _out: op.chunks.join('') })
      )
    } else {
      // done (success) — attach accumulated out to the response
      op.resolve({ ...msg, _out: op.chunks.join('') })
    }
  }

  /** Send an op and return a promise that resolves when status: ["done"] arrives. */
  private _op(msg: NreplMsg): Promise<NreplMsg & { _out: string }> {
    const id = randomUUID()
    return new Promise((resolve, reject) => {
      this.pending.set(id, { chunks: [], resolve, reject })
      this.encoder.write({ ...msg, id })
    })
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Clone a new nREPL session from the server's snapshot.
   * Each session has independent namespace state.
   */
  async newSession(): Promise<NreplSessionInfo> {
    const response = await this._op({ op: 'clone' })
    const sessionId = response['new-session'] as string
    const info: NreplSessionInfo = { id: sessionId, ns: 'user' }
    this._sessions.set(sessionId, info)
    return info
  }

  /**
   * Evaluate Clojure code in a session.
   * Buffers all out/err chunks and returns them alongside the value.
   * Never throws — eval errors are returned as { error: "..." }.
   */
  async eval(
    sessionId: string,
    code: string,
    ns?: string
  ): Promise<NreplEvalResult> {
    const msg: NreplMsg = { op: 'eval', session: sessionId, code }
    if (ns) msg['ns'] = ns

    try {
      const response = await this._op(msg)
      const newNs = response['ns'] as string | undefined
      // Keep tracked session ns up to date
      const tracked = this._sessions.get(sessionId)
      if (tracked && newNs) tracked.ns = newNs
      return {
        value: response['value'] as string | undefined,
        ns: newNs,
        ...(response._out ? { out: response._out } : {}),
      }
    } catch (e: unknown) {
      const err = e as Error & { _out?: string }
      return {
        error: err.message,
        ...(err._out ? { out: err._out } : {}),
      }
    }
  }

  /** List sessions that have been created on this connection. */
  sessions(): NreplSessionInfo[] {
    return Array.from(this._sessions.values())
  }

  /**
   * List ALL sessions on the nREPL server (all connections, including Calva).
   * Calls the `ls-sessions` op — requires a cljam nREPL server v0.0.15+.
   * Use the returned session IDs to eval directly into another client's session.
   */
  async lsServerSessions(): Promise<NreplSessionInfo[]> {
    // ls-sessions needs at least one session to route through
    const ourSession = this._sessions.values().next().value as NreplSessionInfo | undefined
    if (!ourSession) throw new Error('No session available — call newSession() first')

    const response = await this._op({
      op: 'ls-sessions',
      session: ourSession.id,
    })

    const ids = response['session-ids'] as unknown
    const namespaces = response['session-namespaces'] as unknown
    if (!Array.isArray(ids)) return []

    return (ids as string[]).map((id, i) => ({
      id,
      ns: Array.isArray(namespaces) ? ((namespaces as string[])[i] ?? 'user') : 'user',
    }))
  }

  /** Close the TCP connection and reject all pending operations. */
  close(): void {
    for (const op of this.pending.values()) {
      op.reject(
        Object.assign(new Error('Connection closed'), { _out: '' })
      )
    }
    this.pending.clear()
    this._sessions.clear()
    this.encoder.unpipe(this.socket)
    this.socket.destroy()
  }
}

// ---------------------------------------------------------------------------
// ConnectionManager — holds all open NreplConnections by ID
// ---------------------------------------------------------------------------

export class ConnectionManager {
  private connections = new Map<string, NreplConnection>()

  async connect(host: string, port: number): Promise<NreplConnection> {
    const conn = await NreplConnection.connect(host, port)
    this.connections.set(conn.id, conn)
    return conn
  }

  get(id: string): NreplConnection | undefined {
    return this.connections.get(id)
  }

  close(id: string): boolean {
    const conn = this.connections.get(id)
    if (!conn) return false
    conn.close()
    this.connections.delete(id)
    return true
  }
}
