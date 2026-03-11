import * as net from 'net'
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { BDecoderStream, BEncoderStream } from './bencode'
import {
  createSession,
  createSessionFromSnapshot,
  printString,
  snapshotSession,
  type CljValue,
  type Session,
  type SessionSnapshot,
} from '../core'
import { withPrintContext } from '../core/printer'
import { tryLookup } from '../core/env'
import { inferSourceRoot } from './nrepl-utils'
import { resolveSymbol as resolveSymbolShared, extractMeta as extractMetaShared } from './nrepl-symbol'
import { VERSION } from './version'
import { makeNodeHostModule } from '../host/node-host-module'

const CONJURE_VERSION = VERSION

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NreplMessage = Record<string, unknown>

type ManagedSession = {
  id: string
  session: Session
  /** Mutable: updated to the current eval message id before each eval call */
  currentMsgId: string
  /** Tracks which file each namespace was loaded from, for go-to-definition */
  nsToFile: Map<string, string>
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

function makeSessionId(): string {
  return crypto.randomUUID()
}

function createManagedSession(
  id: string,
  snapshot: SessionSnapshot,
  encoder: BEncoderStream,
  sourceRoots?: string[]
): ManagedSession {
  let currentMsgId = ''

  const session = createSessionFromSnapshot(snapshot, {
    output: (text) => {
      send(encoder, { id: currentMsgId, session: id, out: text })
    },
    readFile: (filePath) => readFileSync(filePath, 'utf8'),
    sourceRoots,
  })

  session.runtime.installModules([makeNodeHostModule(session)])

  return {
    id,
    session,
    get currentMsgId() {
      return currentMsgId
    },
    set currentMsgId(v) {
      currentMsgId = v
    },
    nsToFile: new Map(),
  }
}

// ---------------------------------------------------------------------------
// Protocol helpers
// ---------------------------------------------------------------------------

function send(encoder: BEncoderStream, msg: NreplMessage) {
  encoder.write(msg)
}

function done(
  encoder: BEncoderStream,
  id: string,
  sessionId: string | undefined,
  extra: NreplMessage = {}
) {
  // If the caller already sets status (e.g. ['eval-error', 'done']), preserve it.
  send(encoder, {
    id,
    ...(sessionId ? { session: sessionId } : {}),
    status: ['done'],
    ...extra,
  })
}

// ---------------------------------------------------------------------------
// Op handlers
// ---------------------------------------------------------------------------

function handleClone(
  msg: NreplMessage,
  sessions: Map<string, ManagedSession>,
  snapshot: SessionSnapshot,
  encoder: BEncoderStream,
  sourceRoots?: string[]
) {
  const id = (msg['id'] as string) ?? ''
  const newId = makeSessionId()
  const managed = createManagedSession(newId, snapshot, encoder, sourceRoots)
  sessions.set(newId, managed)
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
    versions: {
      conjure: { 'version-string': CONJURE_VERSION },
    },
  })
}

function handleEval(
  msg: NreplMessage,
  managed: ManagedSession,
  encoder: BEncoderStream
) {
  const id = (msg['id'] as string) ?? ''
  const code = (msg['code'] as string) ?? ''

  managed.currentMsgId = id

  // Calva sends 1-based :line and :column for the start of the evaluated form
  // in the original file. Convert to 0-based offsets so evaluateDef can add
  // them to the relative positions the reader computes from the snippet.
  const lineOffset = typeof msg['line']   === 'number' ? (msg['line']   as number) - 1 : 0
  const colOffset  = typeof msg['column'] === 'number' ? (msg['column'] as number) - 1 : 0

  try {
    const result = managed.session.evaluate(code, { lineOffset, colOffset })
    const nsEnv = managed.session.registry.get(managed.session.currentNs)
    const printLen = nsEnv ? tryLookup('*print-length*', nsEnv) : undefined
    const printLvl = nsEnv ? tryLookup('*print-level*', nsEnv) : undefined
    const resultStr = withPrintContext(
      {
        printLength: printLen?.kind === 'number' ? printLen.value : null,
        printLevel: printLvl?.kind === 'number' ? printLvl.value : null,
      },
      () => printString(result)
    )
    done(encoder, id, managed.id, {
      value: resultStr,
      ns: managed.session.currentNs,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    done(encoder, id, managed.id, {
      ex: message,
      err: message + '\n',
      ns: managed.session.currentNs,
      status: ['eval-error', 'done'],
    })
  }
}

function handleLoadFile(
  msg: NreplMessage,
  managed: ManagedSession,
  encoder: BEncoderStream
) {
  const id = (msg['id'] as string) ?? ''
  const source = (msg['file'] as string) ?? ''
  const fileName = (msg['file-name'] as string) ?? ''
  const filePath = (msg['file-path'] as string) ?? ''

  managed.currentMsgId = id

  try {
    // Dynamically infer source root from the file path + ns declaration.
    // This is the zero-config path: Calva sends the absolute path, and we
    // derive the root so sibling namespaces resolve via require.
    if (filePath) {
      const inferred = inferSourceRoot(filePath, source)
      if (inferred) {
        managed.session.addSourceRoot(inferred)
      }
    }

    const nsHint =
      fileName.replace(/\.clj$/, '').replace(/\//g, '.') || undefined
    const loadedNs = managed.session.loadFile(source, nsHint, filePath || undefined)

    // Track the file path for this namespace so info/lookup can return :file
    // for go-to-definition support.
    if (filePath && loadedNs) {
      managed.nsToFile.set(loadedNs, filePath)
    }

    // Switch the session's active namespace to the one declared in the loaded
    // file. Without this, subsequent eval ops land in the wrong namespace and
    // can't see the defs that were just loaded.
    managed.session.setNs(loadedNs)

    done(encoder, id, managed.id, {
      value: 'nil',
      ns: managed.session.currentNs,
    })
  } catch (error) {
    done(encoder, id, managed.id, {
      ex: error instanceof Error ? error.message : String(error),
      ns: managed.session.currentNs,
      status: ['eval-error', 'done'],
    })
  }
}

function handleComplete(
  msg: NreplMessage,
  managed: ManagedSession,
  encoder: BEncoderStream
) {
  const id = (msg['id'] as string) ?? ''
  const prefix = (msg['prefix'] as string) ?? ''
  const nsName = msg['ns'] as string | undefined

  const names = managed.session.getCompletions(prefix, nsName)
  const completions = names.map((c) => ({
    candidate: c,
    type: 'var',
    ns: managed.session.currentNs,
  }))

  done(encoder, id, managed.id, { completions })
}

function handleClose(
  msg: NreplMessage,
  sessions: Map<string, ManagedSession>,
  encoder: BEncoderStream
) {
  // cider sends a close message with an id
  const id = (msg['id'] as string) ?? ''
  const sessionId = (msg['session'] as string) ?? ''
  sessions.delete(sessionId)
  send(encoder, { id, session: sessionId, status: ['done'] })
}

function resolveSymbol(
  sym: string,
  managed: ManagedSession,
  contextNs?: string
) {
  return resolveSymbolShared(sym, managed.session, contextNs)
}

function extractMeta(resolved: { value: CljValue; varObj?: import('./nrepl-symbol').ResolvedSymbol['varObj'] }) {
  return extractMetaShared(resolved.value, resolved.varObj?.meta)
}

function handleInfo(
  msg: NreplMessage,
  managed: ManagedSession,
  encoder: BEncoderStream
) {
  const id = (msg['id'] as string) ?? ''
  const sym = msg['sym'] as string | undefined
  const nsOverride = msg['ns'] as string | undefined

  if (!sym) {
    done(encoder, id, managed.id, { status: ['no-info', 'done'] })
    return
  }

  const resolved = resolveSymbol(sym, managed, nsOverride)
  if (!resolved) {
    // Check if sym is itself a namespace name (e.g. navigating to demo.math)
    const nsFile = managed.nsToFile.get(sym)
    if (nsFile) {
      done(encoder, id, managed.id, {
        ns: sym,
        name: sym,
        type: 'namespace',
        file: nsFile,
      })
      return
    }
    done(encoder, id, managed.id, { status: ['no-info', 'done'] })
    return
  }

  const meta = extractMeta(resolved)
  const file = managed.nsToFile.get(resolved.resolvedNs)

  // Extract :line/:column/:file from var meta if present (stamped by evaluateDef).
  let varLine: number | undefined
  let varColumn: number | undefined
  let varFile: string | undefined
  const varMetaEntries = resolved.varObj?.meta?.entries ?? []
  for (const [k, v] of varMetaEntries) {
    if (k.kind !== 'keyword') continue
    if (k.name === ':line'   && v.kind === 'number') varLine   = v.value
    if (k.name === ':column' && v.kind === 'number') varColumn = v.value
    if (k.name === ':file'   && v.kind === 'string') varFile   = v.value
  }

  done(encoder, id, managed.id, {
    ns: resolved.resolvedNs,
    name: resolved.localName,
    doc: meta.doc,
    'arglists-str': meta.arglistsStr,
    type: meta.type,
    ...(varFile ?? file ? { file: varFile ?? file } : {}),
    ...(varLine   !== undefined ? { line: varLine }     : {}),
    ...(varColumn !== undefined ? { column: varColumn } : {}),
  })
}

function handleLookup(
  msg: NreplMessage,
  managed: ManagedSession,
  encoder: BEncoderStream
) {
  handleInfo(msg, managed, encoder)
}

function handleEldoc(
  msg: NreplMessage,
  managed: ManagedSession,
  encoder: BEncoderStream
) {
  const id = (msg['id'] as string) ?? ''
  const sym = msg['sym'] as string | undefined
  const nsOverride = msg['ns'] as string | undefined

  if (!sym) {
    done(encoder, id, managed.id, { status: ['no-eldoc', 'done'] })
    return
  }

  const resolved = resolveSymbol(sym, managed, nsOverride)
  if (!resolved) {
    done(encoder, id, managed.id, { status: ['no-eldoc', 'done'] })
    return
  }

  const meta = extractMeta(resolved)
  if (!meta.eldocArgs) {
    done(encoder, id, managed.id, { status: ['no-eldoc', 'done'] })
    return
  }

  done(encoder, id, managed.id, {
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

// ---------------------------------------------------------------------------
// Per-connection dispatcher
// ---------------------------------------------------------------------------

function handleMessage(
  msg: NreplMessage,
  sessions: Map<string, ManagedSession>,
  snapshot: SessionSnapshot,
  encoder: BEncoderStream,
  defaultSession: ManagedSession,
  sourceRoots?: string[]
) {
  const op = msg['op'] as string
  const sessionId = msg['session'] as string | undefined
  const managed = sessionId
    ? (sessions.get(sessionId) ?? defaultSession)
    : defaultSession

  switch (op) {
    case 'clone':
      handleClone(msg, sessions, snapshot, encoder, sourceRoots)
      break
    case 'describe':
      handleDescribe(msg, encoder)
      break
    case 'eval':
      handleEval(msg, managed, encoder)
      break
    case 'load-file':
      handleLoadFile(msg, managed, encoder)
      break
    case 'complete':
      handleComplete(msg, managed, encoder)
      break
    case 'close':
      handleClose(msg, sessions, encoder)
      break
    case 'info':
      handleInfo(msg, managed, encoder)
      break
    case 'lookup':
      handleLookup(msg, managed, encoder)
      break
    case 'eldoc':
      handleEldoc(msg, managed, encoder)
      break
    default:
      handleUnknown(msg, encoder)
  }
}

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------

export type NreplServerOptions = {
  port?: number
  host?: string
  sourceRoots?: string[]
}

export function startNreplServer(options: NreplServerOptions = {}): net.Server {
  const port = options.port ?? 7888
  const host = options.host ?? '127.0.0.1'

  // Build a warm snapshot once — all clones skip the core bootstrap.
  // Source roots from config discovery are baked in so every cloned session inherits them.
  const warmSession = createSession({
    sourceRoots: options.sourceRoots,
    readFile: (filePath) => readFileSync(filePath, 'utf8'),
  })
  const snapshot = snapshotSession(warmSession)

  const server = net.createServer((socket) => {
    const encoder = new BEncoderStream()
    const decoder = new BDecoderStream()

    encoder.pipe(socket)
    socket.pipe(decoder)

    const sessions = new Map<string, ManagedSession>()

    // A default session for session-less messages (e.g. Calva's initial eval)
    const defaultId = makeSessionId()
    const defaultSession = createManagedSession(defaultId, snapshot, encoder, options.sourceRoots)
    sessions.set(defaultId, defaultSession)

    decoder.on('data', (msg: NreplMessage) => {
      handleMessage(msg, sessions, snapshot, encoder, defaultSession, options.sourceRoots)
    })

    socket.on('error', () => {
      // Connection dropped — nothing to clean up beyond GC
    })

    socket.on('close', () => {
      sessions.clear()
    })
  })

  const portFile = join(process.cwd(), '.nrepl-port')

  server.listen(port, host, () => {
    writeFileSync(portFile, String(port), 'utf8')
    process.stdout.write(`Conjure nREPL server v${VERSION} started on port ${port}\n`)
  })

  const cleanup = () => {
    if (existsSync(portFile)) unlinkSync(portFile)
  }
  server.on('close', cleanup)
  process.on('exit', cleanup)
  process.on('SIGINT', () => {
    cleanup()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    cleanup()
    process.exit(0)
  })

  return server
}
