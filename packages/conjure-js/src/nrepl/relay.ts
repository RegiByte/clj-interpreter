import * as net from 'node:net'
import { writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { BDecoderStream, BEncoderStream } from '../bin/bencode'
import type { Session } from '../core'
import type { WebSocketServer } from 'vite'
import { VERSION } from '../bin/version'
import { resolveSymbol, extractMeta } from '../bin/nrepl-symbol'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NreplMessage = Record<string, unknown>

/** Lightweight per-Calva-session state — no Clojure session, just bookkeeping */
type RelaySession = {
  id: string
  currentNs: string
}

type BrowserResult = {
  id: string
  value?: string
  error?: string
  ns?: string
  out?: string
}

type PendingResolver = (result: BrowserResult) => void

export type BrowserNreplRelayOptions = {
  port?: number
  host?: string
  cwd: string
  ws: WebSocketServer
  serverSession: Session
}

// ---------------------------------------------------------------------------
// Protocol helpers
// ---------------------------------------------------------------------------

function makeId(): string {
  return crypto.randomUUID()
}

function send(encoder: BEncoderStream, msg: NreplMessage) {
  encoder.write(msg)
}

function done(
  encoder: BEncoderStream,
  id: string,
  sessionId: string | undefined,
  extra: NreplMessage = {}
) {
  send(encoder, {
    id,
    ...(sessionId ? { session: sessionId } : {}),
    status: ['done'],
    ...extra,
  })
}

// ---------------------------------------------------------------------------
// Browser forwarding
// ---------------------------------------------------------------------------

async function forwardToB(
  event: string,
  data: Record<string, unknown>,
  ws: WebSocketServer,
  pending: Map<string, PendingResolver>,
  timeoutMs = 15000
): Promise<BrowserResult> {
  const correlationId = makeId()

  if (ws.clients.size === 0) {
    return { id: correlationId, error: 'No browser tab connected to Vite dev server' }
  }

  return new Promise<BrowserResult>((resolve) => {
    const timer = setTimeout(() => {
      if (pending.has(correlationId)) {
        pending.delete(correlationId)
        resolve({ id: correlationId, error: 'Timed out — no response from browser (15s)' })
      }
    }, timeoutMs)

    pending.set(correlationId, (result) => {
      clearTimeout(timer)
      resolve(result)
    })

    ws.send({ type: 'custom', event, data: { ...data, id: correlationId } })
  })
}

// ---------------------------------------------------------------------------
// Op handlers
// ---------------------------------------------------------------------------

function handleClone(
  msg: NreplMessage,
  sessions: Map<string, RelaySession>,
  encoder: BEncoderStream
) {
  const id = (msg['id'] as string) ?? ''
  const newId = makeId()
  sessions.set(newId, { id: newId, currentNs: 'user' })
  done(encoder, id, undefined, { 'new-session': newId })
}

function handleDescribe(msg: NreplMessage, encoder: BEncoderStream) {
  const id = (msg['id'] as string) ?? ''
  const sessionId = msg['session'] as string | undefined
  done(encoder, id, sessionId, {
    ops: {
      eval: {},
      clone: {},
      close: {},
      complete: {},
      describe: {},
      eldoc: {},
      info: {},
      lookup: {},
      'load-file': {},
    },
    versions: { conjure: { 'version-string': VERSION } },
  })
}

function handleComplete(
  msg: NreplMessage,
  session: RelaySession,
  encoder: BEncoderStream,
  serverSession: Session
) {
  const id = (msg['id'] as string) ?? ''
  const prefix = (msg['prefix'] as string) ?? ''
  const nsName = (msg['ns'] as string) ?? session.currentNs
  const names = serverSession.getCompletions(prefix, nsName)
  const completions = names.map((c) => ({
    candidate: c,
    type: 'var',
    ns: session.currentNs,
  }))
  done(encoder, id, session.id, { completions })
}

function handleClose(
  msg: NreplMessage,
  sessions: Map<string, RelaySession>,
  encoder: BEncoderStream
) {
  const id = (msg['id'] as string) ?? ''
  const sessionId = (msg['session'] as string) ?? ''
  sessions.delete(sessionId)
  send(encoder, { id, session: sessionId, status: ['done'] })
}

function handleInfo(
  msg: NreplMessage,
  session: RelaySession,
  encoder: BEncoderStream,
  serverSession: Session
) {
  const id = (msg['id'] as string) ?? ''
  const sym = msg['sym'] as string | undefined
  const nsOverride = msg['ns'] as string | undefined

  if (!sym) {
    done(encoder, id, session.id, { status: ['no-info', 'done'] })
    return
  }

  const resolved = resolveSymbol(sym, serverSession, nsOverride ?? session.currentNs)
  if (!resolved) {
    done(encoder, id, session.id, { status: ['no-info', 'done'] })
    return
  }

  const meta = extractMeta(resolved.value, resolved.varObj?.meta)
  done(encoder, id, session.id, {
    ns: resolved.resolvedNs,
    name: resolved.localName,
    doc: meta.doc,
    'arglists-str': meta.arglistsStr,
    type: meta.type,
  })
}

function handleEldoc(
  msg: NreplMessage,
  session: RelaySession,
  encoder: BEncoderStream,
  serverSession: Session
) {
  const id = (msg['id'] as string) ?? ''
  const sym = msg['sym'] as string | undefined
  const nsOverride = msg['ns'] as string | undefined

  if (!sym) {
    done(encoder, id, session.id, { status: ['no-eldoc', 'done'] })
    return
  }

  const resolved = resolveSymbol(sym, serverSession, nsOverride ?? session.currentNs)
  if (!resolved) {
    done(encoder, id, session.id, { status: ['no-eldoc', 'done'] })
    return
  }

  const meta = extractMeta(resolved.value, resolved.varObj?.meta)
  if (!meta.eldocArgs) {
    done(encoder, id, session.id, { status: ['no-eldoc', 'done'] })
    return
  }

  done(encoder, id, session.id, {
    name: resolved.localName,
    ns: resolved.resolvedNs,
    type: meta.type,
    eldoc: meta.eldocArgs,
  })
}

function handleUnknown(msg: NreplMessage, encoder: BEncoderStream) {
  const id = (msg['id'] as string) ?? ''
  send(encoder, { id, status: ['unknown-op', 'done'] })
}

async function handleEval(
  msg: NreplMessage,
  session: RelaySession,
  encoder: BEncoderStream,
  ws: WebSocketServer,
  pending: Map<string, PendingResolver>
) {
  const id = (msg['id'] as string) ?? ''
  const code = (msg['code'] as string) ?? ''

  const result = await forwardToB(
    'conjure:eval',
    { code, ns: session.currentNs },
    ws,
    pending
  )

  if (result.ns) session.currentNs = result.ns
  if (result.out) send(encoder, { id, session: session.id, out: result.out })

  if (result.error) {
    done(encoder, id, session.id, {
      ex: result.error,
      err: result.error + '\n',
      ns: session.currentNs,
      status: ['eval-error', 'done'],
    })
  } else {
    done(encoder, id, session.id, { value: result.value ?? 'nil', ns: session.currentNs })
  }
}

async function handleLoadFile(
  msg: NreplMessage,
  session: RelaySession,
  encoder: BEncoderStream,
  ws: WebSocketServer,
  pending: Map<string, PendingResolver>
) {
  const id = (msg['id'] as string) ?? ''
  const source = (msg['file'] as string) ?? ''
  const fileName = (msg['file-name'] as string) ?? ''
  const filePath = (msg['file-path'] as string) ?? ''
  const nsHint = fileName.replace(/\.clj$/, '').replace(/\//g, '.') || undefined

  const result = await forwardToB(
    'conjure:load-file',
    { source, nsHint, filePath },
    ws,
    pending
  )

  if (result.ns) session.currentNs = result.ns
  if (result.out) send(encoder, { id, session: session.id, out: result.out })

  if (result.error) {
    done(encoder, id, session.id, {
      ex: result.error,
      err: result.error + '\n',
      ns: session.currentNs,
      status: ['eval-error', 'done'],
    })
  } else {
    done(encoder, id, session.id, { value: result.value ?? 'nil', ns: session.currentNs })
  }
}

// ---------------------------------------------------------------------------
// Per-connection dispatcher
// ---------------------------------------------------------------------------

async function handleMessage(
  msg: NreplMessage,
  sessions: Map<string, RelaySession>,
  defaultSession: RelaySession,
  encoder: BEncoderStream,
  ws: WebSocketServer,
  pending: Map<string, PendingResolver>,
  serverSession: Session
) {
  const op = msg['op'] as string
  const sessionId = msg['session'] as string | undefined
  const session = sessionId ? (sessions.get(sessionId) ?? defaultSession) : defaultSession

  switch (op) {
    case 'clone':
      handleClone(msg, sessions, encoder)
      break
    case 'describe':
      handleDescribe(msg, encoder)
      break
    case 'eval':
      await handleEval(msg, session, encoder, ws, pending)
      break
    case 'load-file':
      await handleLoadFile(msg, session, encoder, ws, pending)
      break
    case 'complete':
      handleComplete(msg, session, encoder, serverSession)
      break
    case 'close':
      handleClose(msg, sessions, encoder)
      break
    case 'info':
    case 'lookup':
      handleInfo(msg, session, encoder, serverSession)
      break
    case 'eldoc':
      handleEldoc(msg, session, encoder, serverSession)
      break
    default:
      handleUnknown(msg, encoder)
  }
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

export function startBrowserNreplRelay(options: BrowserNreplRelayOptions): net.Server {
  const port = options.port ?? 7888
  const host = options.host ?? '127.0.0.1'
  const { ws, serverSession, cwd } = options

  // Shared pending map — keyed by correlation ID, resolved when browser responds
  const pending = new Map<string, PendingResolver>()

  // Wire up browser result listeners once at server level
  ws.on('conjure:eval-result', (data: BrowserResult) => {
    const resolve = pending.get(data.id)
    if (resolve) {
      pending.delete(data.id)
      resolve(data)
    }
  })

  ws.on('conjure:load-file-result', (data: BrowserResult) => {
    const resolve = pending.get(data.id)
    if (resolve) {
      pending.delete(data.id)
      resolve(data)
    }
  })

  const server = net.createServer((socket) => {
    const encoder = new BEncoderStream()
    const decoder = new BDecoderStream()

    encoder.pipe(socket)
    socket.pipe(decoder)

    const sessions = new Map<string, RelaySession>()
    const defaultId = makeId()
    const defaultSession: RelaySession = { id: defaultId, currentNs: 'user' }
    sessions.set(defaultId, defaultSession)

    decoder.on('data', (msg: NreplMessage) => {
      handleMessage(msg, sessions, defaultSession, encoder, ws, pending, serverSession).catch(
        (err) => {
          console.error('[conjure] relay error:', err)
        }
      )
    })

    socket.on('error', () => {
      // connection dropped
    })

    socket.on('close', () => {
      sessions.clear()
    })
  })

  const portFile = join(cwd, '.nrepl-port')

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(
        `[conjure] Port ${port} already in use — browser nREPL relay not started. ` +
          `Kill the process holding the port or set a different nreplPort.`
      )
    } else {
      console.error('[conjure] nREPL relay error:', err.message)
    }
  })

  server.listen(port, host, () => {
    writeFileSync(portFile, String(port), 'utf8')
    console.log(`[conjure] Browser nREPL relay started on port ${port}`)
  })

  const cleanup = () => {
    if (existsSync(portFile)) unlinkSync(portFile)
  }

  server.on('close', cleanup)

  return server
}
