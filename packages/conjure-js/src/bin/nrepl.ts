import * as net from 'net'
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { BDecoderStream, BEncoderStream } from './bencode'
import {
  createSession,
  createSessionFromSnapshot,
  printString,
  snapshotSession,
  type CljMap,
  type CljValue,
  type Session,
  type SessionSnapshot,
} from '../core'
import { tryLookup, lookupVar, getNamespaceEnv } from '../core/env'
import { inferSourceRoot } from './nrepl-utils'
import { VERSION } from './version'
import { injectNodeHostFunctions } from '../host/node'

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

  injectNodeHostFunctions(session)

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

  try {
    const result = managed.session.evaluate(code)
    done(encoder, id, managed.id, {
      value: printString(result),
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
    const loadedNs = managed.session.loadFile(source, nsHint)

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
): { value: CljValue; resolvedNs: string; localName: string } | null {
  const ns = contextNs ?? managed.session.currentNs
  const slashIdx = sym.indexOf('/')

  if (slashIdx > 0) {
    const qualifier = sym.slice(0, slashIdx)
    const localName = sym.slice(slashIdx + 1)

    // 1. Try as full namespace name (use registry Env for chain-based lookup)
    const nsEnvFull = managed.session.registry.get(qualifier)
    if (nsEnvFull) {
      const value = tryLookup(localName, nsEnvFull)
      if (value !== undefined) return { value, resolvedNs: qualifier, localName }
    }

    // 2. Try as alias (:as str → clojure.string)
    const currentNsData = managed.session.getNs(ns)
    const aliasedNs = currentNsData?.aliases.get(qualifier)
    if (aliasedNs) {
      const v = aliasedNs.vars.get(localName)
      if (v !== undefined)
        return { value: v.value, resolvedNs: aliasedNs.name, localName }
    }

    return null
  }

  // Unqualified symbol
  const localName = sym
  const nsEnvFull = managed.session.registry.get(ns)
  if (!nsEnvFull) return null
  const value = tryLookup(sym, nsEnvFull)
  if (value === undefined) return null

  // Determine the namespace where this symbol is defined.
  // CljVar carries the authoritative ns; fall back to other heuristics.
  const varObj = lookupVar(sym, nsEnvFull)
  let resolvedNs: string
  if (varObj) {
    resolvedNs = varObj.ns
  } else if (value.kind === 'function' || value.kind === 'macro') {
    resolvedNs = getNamespaceEnv(value.env).ns?.name ?? ns
  } else if (value.kind === 'native-function') {
    const i = value.name.indexOf('/')
    resolvedNs = i > 0 ? value.name.slice(0, i) : ns
  } else {
    resolvedNs = ns
  }

  return { value, resolvedNs, localName }
}

function extractMeta(value: CljValue): {
  doc: string
  arglistsStr: string
  eldocArgs: string[][] | null
  type: string
} {
  const type =
    value.kind === 'macro'
      ? 'macro'
      : value.kind === 'function' || value.kind === 'native-function'
        ? 'function'
        : 'var'

  const meta: CljMap | undefined =
    value.kind === 'function'
      ? value.meta
      : value.kind === 'native-function'
        ? value.meta
        : undefined

  let doc = ''
  let arglistsStr = ''
  let eldocArgs: string[][] | null = null

  if (meta) {
    const docEntry = meta.entries.find(
      ([k]) => k.kind === 'keyword' && k.name === ':doc'
    )
    if (docEntry && docEntry[1].kind === 'string') doc = docEntry[1].value

    const argsEntry = meta.entries.find(
      ([k]) => k.kind === 'keyword' && k.name === ':arglists'
    )
    if (argsEntry && argsEntry[1].kind === 'vector') {
      const arglists = argsEntry[1]
      arglistsStr = '(' + arglists.value.map((al) => printString(al)).join(' ') + ')'
      eldocArgs = arglists.value.map((al) => {
        if (al.kind !== 'vector') return [printString(al)]
        return al.value.map((p) => (p.kind === 'symbol' ? p.name : printString(p)))
      })
    }
  }

  // Fallback: derive arglists from structural arities (fn/macro without meta)
  if (
    arglistsStr === '' &&
    (value.kind === 'function' || value.kind === 'macro')
  ) {
    const arityStrs = value.arities.map((arity) => {
      const params = arity.params.map((p) => printString(p))
      if (arity.restParam) params.push('&', printString(arity.restParam))
      return '[' + params.join(' ') + ']'
    })
    arglistsStr = '(' + arityStrs.join(' ') + ')'
    eldocArgs = value.arities.map((arity) => {
      const params = arity.params.map((p) => printString(p))
      if (arity.restParam) params.push('&', printString(arity.restParam))
      return params
    })
  }

  return { doc, arglistsStr, eldocArgs, type }
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

  const meta = extractMeta(resolved.value)
  const file = managed.nsToFile.get(resolved.resolvedNs)
  done(encoder, id, managed.id, {
    ns: resolved.resolvedNs,
    name: resolved.localName,
    doc: meta.doc,
    'arglists-str': meta.arglistsStr,
    type: meta.type,
    ...(file ? { file } : {}),
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

  const meta = extractMeta(resolved.value)
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
