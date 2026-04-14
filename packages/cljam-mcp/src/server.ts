// We use the low-level Server directly instead of McpServer (which is deprecated)
// because McpServer.registerTool requires Zod schemas. We use raw JSON Schema so that
// cljam-mcp has zero runtime dependencies beyond the SDK itself.
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { printString } from '@regibyte/cljam'
import { readFileSync } from 'node:fs'
import { resolve, isAbsolute } from 'node:path'
import { SessionManager, type Preset } from './session-manager.js'
import { ConnectionManager } from './nrepl-bridge.js'

// ---------------------------------------------------------------------------
// Tool result helpers
// ---------------------------------------------------------------------------

type TextContent = { type: 'text'; text: string }
type ToolResult = { content: TextContent[] }

function ok(obj: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] }
}

function fail(message: string, extra?: Record<string, unknown>): ToolResult {
  return ok({ error: message, ...extra })
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOL_DEFINITIONS = [
  {
    name: 'new_session',
    description: [
      'Create a new cljam Clojure session. Returns a session_id used by all other tools.',
      '',
      'preset options:',
      '  "sandbox" (default) — safe, no I/O, no dynamic imports, no host globals beyond Math.',
      '  "node"              — full Node.js: Math/console/process/fetch, dynamic import enabled.',
      '',
      'root_dir: absolute path to the project root. When set:',
      '  - load_file accepts paths relative to root_dir',
      '  - (:require [ns]) can resolve .clj files under root_dir',
      '',
      'IMPORTANT — cljam diverges from JVM Clojure in these ways:',
      '  - No Java interop: (.method obj), (new Class), import do not exist.',
      '  - No JVM classes: Thread, ArrayList, etc. are unavailable.',
      '  - Floating point follows JS/IEEE-754 (not JVM rounding).',
      '  - Use (async ...) instead of future/agent for async work. @ Deref within async block acts as await.',
      '  - Refs/dosync exist but STM retry semantics are simplified.',
      '  - In sandbox preset: no I/O, no dynamic JS imports.',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        preset: {
          type: 'string',
          enum: ['sandbox', 'node'],
          description: 'Security preset. Default: "sandbox".',
        },
        root_dir: {
          type: 'string',
          description: 'Absolute path to the project root directory.',
        },
      },
    },
  },
  {
    name: 'eval',
    description: [
      'Evaluate one or more Clojure forms in a session.',
      '',
      'Returns:',
      '  result  — the last form\'s value as an EDN string',
      '  ns      — the current namespace after evaluation',
      '  stdout  — captured output from println/print/prn (if any)',
      '  error   — error message if evaluation failed (session stays alive)',
      '',
      'Multiple top-level forms are supported — the last value is returned.',
      'State from previous eval calls persists across calls (def, require, etc.).',
      '',
      'Examples:',
      '  (+ 1 2)                          ;; result: "3"',
      '  (def x 42)                       ;; result: "#\'user/x"',
      '  (println "hello") x              ;; result: "42", stdout: "hello"',
      '  (describe #\'clojure.core/map)    ;; result: structured map describing the fn',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string', description: 'Session ID from new_session.' },
        code: {
          type: 'string',
          description: 'Clojure code to evaluate. Multiple top-level forms are allowed.',
        },
        ns: {
          type: 'string',
          description: 'Switch to this namespace before evaluating. Optional.',
        },
      },
      required: ['session_id', 'code'],
    },
  },
  {
    name: 'list_sessions',
    description: 'List all active sessions with their current namespace, preset, and metadata.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'delete_session',
    description: 'Delete a session and free its memory.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
      },
      required: ['session_id'],
    },
  },
  {
    name: 'load_file',
    description: [
      'Load a .clj file into a session by path.',
      '',
      'Evaluates all forms in the file. The file\'s (ns ...) declaration updates the',
      'session\'s current namespace.',
      '',
      'path can be:',
      '  - An absolute path: "/Users/me/project/src/my/lib.clj"',
      '  - A path relative to root_dir (if root_dir was set in new_session)',
      '',
      'Use this to load your project source files before evaluating code against them.',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        path: {
          type: 'string',
          description: 'Absolute or root_dir-relative path to the .clj file.',
        },
      },
      required: ['session_id', 'path'],
    },
  },
]

// ---------------------------------------------------------------------------
// Mode 2 — nREPL bridge tool definitions
// ---------------------------------------------------------------------------

const NREPL_TOOL_DEFINITIONS = [
  {
    name: 'connect_nrepl',
    description: [
      'Connect to a running nREPL server over TCP. Returns connection_id and an initial session.',
      '',
      'Works with:',
      '  - A cljam nREPL server started with startNreplServer()',
      '  - The same server Calva is connected to (shared session, shared live state)',
      '  - Any standard nREPL-compatible server',
      '',
      'After connecting, use nrepl_eval with the returned session_id.',
      'To share a Calva session, pass the Calva session ID (from status bar) as session_id in nrepl_eval.',
      '',
      'On cljam servers: also returns other_sessions — all pre-existing sessions (Calva etc).',
      'Use this to identify which session belongs to the human developer without a separate call.',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        host: {
          type: 'string',
          description: 'Hostname. Default: "localhost".',
        },
        port: {
          type: 'number',
          description: 'TCP port (see .nrepl-port file in project root).',
        },
      },
      required: ['port'],
    },
  },
  {
    name: 'nrepl_eval',
    description: [
      'Evaluate Clojure code in an nREPL session.',
      '',
      'Returns:',
      '  value  — the result as a string (EDN for cljam, pr-str for JVM Clojure)',
      '  ns     — current namespace after evaluation',
      '  out    — captured output from println/print (if any)',
      '  error  — error message if evaluation failed',
      '',
      'State persists across calls. Works with any nREPL-compatible server.',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        connection_id: { type: 'string', description: 'Connection ID from connect_nrepl.' },
        session_id: { type: 'string', description: 'nREPL session ID from connect_nrepl or nrepl_sessions.' },
        code: { type: 'string', description: 'Clojure code to evaluate.' },
        ns: { type: 'string', description: 'Namespace to switch to before evaluating. Optional.' },
      },
      required: ['connection_id', 'session_id', 'code'],
    },
  },
  {
    name: 'nrepl_sessions',
    description: 'List all sessions created on this nREPL connection.',
    inputSchema: {
      type: 'object',
      properties: {
        connection_id: { type: 'string', description: 'Connection ID from connect_nrepl.' },
      },
      required: ['connection_id'],
    },
  },
  {
    name: 'nrepl_new_session',
    description: 'Clone a new nREPL session from the server snapshot. Returns a fresh session_id with independent namespace state.',
    inputSchema: {
      type: 'object',
      properties: {
        connection_id: { type: 'string', description: 'Connection ID from connect_nrepl.' },
      },
      required: ['connection_id'],
    },
  },
  {
    name: 'nrepl_close',
    description: 'Close an nREPL connection and free all its sessions.',
    inputSchema: {
      type: 'object',
      properties: {
        connection_id: { type: 'string', description: 'Connection ID from connect_nrepl.' },
      },
      required: ['connection_id'],
    },
  },
  {
    name: 'nrepl_server_sessions',
    description: [
      'List ALL sessions on the nREPL server — every connected client (including Calva).',
      '',
      'Use this to find Calva\'s session ID for true shared pair-programming:',
      '  1. Call nrepl_server_sessions to see all sessions',
      '  2. Identify the Calva session (by ns or process of elimination)',
      '  3. Pass that session_id to nrepl_eval — you are now in the same session as Calva',
      '',
      'Requires a cljam nREPL server (startNreplServer from @regibyte/cljam/nrepl).',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        connection_id: { type: 'string', description: 'Connection ID from connect_nrepl.' },
      },
      required: ['connection_id'],
    },
  },
]

// ---------------------------------------------------------------------------
// createMcpServer
// ---------------------------------------------------------------------------

export function createMcpServer(): Server {
  const manager = new SessionManager()
  const connManager = new ConnectionManager()

  const server = new Server(
    { name: 'cljam-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [...TOOL_DEFINITIONS, ...NREPL_TOOL_DEFINITIONS],
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const a = (args ?? {}) as Record<string, unknown>

    switch (name) {
      case 'new_session': {
        const preset = (a.preset as Preset | undefined) ?? 'sandbox'
        const rootDir = a.root_dir as string | undefined
        const record = manager.create(preset, rootDir)
        return ok({
          session_id: record.id,
          ns: record.session.currentNs,
          preset,
          root_dir: rootDir ?? null,
          created_at: record.createdAt.toISOString(),
          capabilities: record.session.capabilities,
        })
      }

      case 'eval': {
        const sessionId = a.session_id as string
        const code = a.code as string
        const ns = a.ns as string | undefined

        const record = manager.get(sessionId)
        if (!record) return fail(`Session not found: ${sessionId}`)

        // Reset output buffer before this eval so we only capture what THIS call emits
        record.outputBuffer.length = 0

        if (ns) record.session.setNs(ns)

        try {
          const result = await record.session.evaluateAsync(code)
          const stdout = record.outputBuffer.join('\n')
          return ok({
            result: printString(result),
            ns: record.session.currentNs,
            ...(stdout ? { stdout } : {}),
          })
        } catch (e) {
          const stdout = record.outputBuffer.join('\n')
          const message = e instanceof Error ? e.message : String(e)
          return ok({
            error: message,
            ns: record.session.currentNs,
            ...(stdout ? { stdout } : {}),
          })
        }
      }

      case 'list_sessions': {
        return ok(
          manager.list().map((r) => ({
            session_id: r.id,
            ns: r.session.currentNs,
            preset: r.preset,
            root_dir: r.rootDir ?? null,
            created_at: r.createdAt.toISOString(),
          }))
        )
      }

      case 'delete_session': {
        const sessionId = a.session_id as string
        return manager.delete(sessionId)
          ? ok({ ok: true })
          : fail(`Session not found: ${sessionId}`)
      }

      case 'load_file': {
        const sessionId = a.session_id as string
        const rawPath = a.path as string

        const record = manager.get(sessionId)
        if (!record) return fail(`Session not found: ${sessionId}`)

        const filePath =
          isAbsolute(rawPath) || !record.rootDir
            ? rawPath
            : resolve(record.rootDir, rawPath)

        record.outputBuffer.length = 0
        try {
          const source = readFileSync(filePath, 'utf-8')
          const ns = await record.session.loadFileAsync(source, undefined, filePath)
          const stdout = record.outputBuffer.join('\n')
          return ok({ ok: true, ns, ...(stdout ? { stdout } : {}) })
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          return ok({ ok: false, error: message })
        }
      }

      // ── Mode 2: nREPL bridge tools ─────────────────────────────────────

      case 'connect_nrepl': {
        const host = (a.host as string | undefined) ?? 'localhost'
        const port = a.port as number
        try {
          const conn = await connManager.connect(host, port)
          const session = await conn.newSession()
          // Fetch all server sessions so the caller can immediately identify
          // which sessions belong to other clients (e.g. Calva) without a
          // separate nrepl_server_sessions call.
          let allSessions: { session_id: string; ns: string }[] = []
          try {
            const raw = await conn.lsServerSessions()
            allSessions = raw.map((s) => ({ session_id: s.id, ns: s.ns }))
          } catch {
            // Non-cljam servers won't support ls-sessions — silently skip.
          }
          const otherSessions = allSessions.filter((s) => s.session_id !== session.id)
          return ok({
            connection_id: conn.id,
            session_id: session.id,
            ns: session.ns,
            host,
            port,
            other_sessions: otherSessions,
          })
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          return fail(`Failed to connect to nREPL at ${host}:${port} — ${message}`)
        }
      }

      case 'nrepl_eval': {
        const connectionId = a.connection_id as string
        const sessionId = a.session_id as string
        const code = a.code as string
        const ns = a.ns as string | undefined

        const conn = connManager.get(connectionId)
        if (!conn) return fail(`Connection not found: ${connectionId}`)

        const result = await conn.eval(sessionId, code, ns)
        return ok({
          ...(result.value !== undefined ? { value: result.value } : {}),
          ...(result.error !== undefined ? { error: result.error } : {}),
          ...(result.ns ? { ns: result.ns } : {}),
          ...(result.out ? { out: result.out } : {}),
        })
      }

      case 'nrepl_sessions': {
        const connectionId = a.connection_id as string
        const conn = connManager.get(connectionId)
        if (!conn) return fail(`Connection not found: ${connectionId}`)
        return ok(
          conn.sessions().map((s) => ({ session_id: s.id, ns: s.ns }))
        )
      }

      case 'nrepl_new_session': {
        const connectionId = a.connection_id as string
        const conn = connManager.get(connectionId)
        if (!conn) return fail(`Connection not found: ${connectionId}`)
        try {
          const session = await conn.newSession()
          return ok({ session_id: session.id, ns: session.ns })
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          return fail(`Failed to create session: ${message}`)
        }
      }

      case 'nrepl_close': {
        const connectionId = a.connection_id as string
        return connManager.close(connectionId)
          ? ok({ ok: true })
          : fail(`Connection not found: ${connectionId}`)
      }

      case 'nrepl_server_sessions': {
        const connectionId = a.connection_id as string
        const conn = connManager.get(connectionId)
        if (!conn) return fail(`Connection not found: ${connectionId}`)
        try {
          const sessions = await conn.lsServerSessions()
          return ok(sessions.map((s) => ({ session_id: s.id, ns: s.ns })))
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          return fail(`Failed to list server sessions: ${message}`)
        }
      }

      default:
        return fail(`Unknown tool: ${name}`)
    }
  })

  return server
}

// ---------------------------------------------------------------------------
// startMcpServer — wires stdio transport and connects
// ---------------------------------------------------------------------------

export async function startMcpServer(): Promise<void> {
  const server = createMcpServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
