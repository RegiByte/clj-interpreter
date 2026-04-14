// We use the low-level Server directly instead of McpServer (which is deprecated)
// because McpServer.registerTool requires Zod schemas. We use raw JSON Schema so that
// cljam-mcp has zero runtime dependencies beyond the SDK itself.
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { printString, type CljamLibrary } from '@regibyte/cljam'
import { readFileSync } from 'node:fs'
import { resolve, isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'
import { SessionManager, type Preset } from './session-manager.js'
import { ConnectionManager } from './nrepl-bridge.js'

// ---------------------------------------------------------------------------
// Library loading helpers
// ---------------------------------------------------------------------------

/**
 * Read the `cljam.libraries` array from `root_dir/package.json`.
 * Returns an empty array if the file is missing, unparseable, or has no entry.
 */
function readPackageLibraries(rootDir: string): string[] {
  try {
    const pkgPath = resolve(rootDir, 'package.json')
    const content = readFileSync(pkgPath, 'utf-8')
    const pkg = JSON.parse(content) as Record<string, unknown>
    const cljamField = pkg?.cljam as Record<string, unknown> | undefined
    const specs = cljamField?.libraries
    if (!Array.isArray(specs)) return []
    return specs.filter((s): s is string => typeof s === 'string')
  } catch {
    return []
  }
}

/**
 * Resolve the entry point of a package (either a relative local path or an npm package name)
 * from the context of root_dir by reading its package.json exports/main field.
 *
 * This manual resolution is necessary because createRequire (CJS resolver) does not
 * understand ESM `exports` fields, and import.meta.resolve requires Node 20.6+.
 */
function resolvePackageEntry(spec: string, rootDir: string): string {
  // Determine the package directory
  const pkgDir = spec.startsWith('.')
    ? resolve(rootDir, spec)                           // local: ./packages/my-lib
    : resolve(rootDir, 'node_modules', spec)           // npm:   @scope/pkg or pkg

  // Read the package's own package.json to find its entry point
  const pkgJsonPath = resolve(pkgDir, 'package.json')
  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8')) as {
    exports?: string | Record<string, unknown>
    main?: string
  }

  // Prefer exports["."] (ESM-standard), fall back to main
  if (pkgJson.exports) {
    const dotExport =
      typeof pkgJson.exports === 'string' ? pkgJson.exports : pkgJson.exports['.']

    if (typeof dotExport === 'string') {
      return resolve(pkgDir, dotExport)
    }
    // Conditional exports: { import: ..., default: ... }
    if (dotExport && typeof dotExport === 'object') {
      const cond = dotExport as Record<string, unknown>
      const entry = cond['import'] ?? cond['default'] ?? cond['require']
      if (typeof entry === 'string') return resolve(pkgDir, entry)
    }
  }

  if (pkgJson.main) return resolve(pkgDir, pkgJson.main)

  // Last resort: conventional index file
  return resolve(pkgDir, 'index.js')
}

/**
 * Dynamically import each library spec from the context of `root_dir`.
 * Each package must export a `library` named export conforming to CljamLibrary.
 *
 * Returns the loaded libraries and any load errors (for diagnostic reporting).
 */
async function loadLibraries(
  rootDir: string,
  specs: string[]
): Promise<{ libs: CljamLibrary[]; errors: string[] }> {
  if (specs.length === 0) return { libs: [], errors: [] }

  const libs: CljamLibrary[] = []
  const errors: string[] = []

  for (const spec of specs) {
    try {
      const entryPath = resolvePackageEntry(spec, rootDir)
      // pathToFileURL is required for import() to treat the path as a file URL,
      // which works across platforms and avoids bare-specifier confusion
      const mod = await import(pathToFileURL(entryPath).href) as Record<string, unknown>
      const lib = mod.library as CljamLibrary | undefined

      if (!lib || typeof lib.id !== 'string') {
        errors.push(
          `${spec}: module does not export a \`library\` CljamLibrary object (exports: ${JSON.stringify(Object.keys(mod))})`
        )
        continue
      }

      libs.push(lib)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`${spec}: ${msg}`)
    }
  }

  return { libs, errors }
}

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
      '  - cljam.libraries in root_dir/package.json are auto-loaded:',
      '    { "cljam": { "libraries": ["@regibyte/cljam-schema"] } }',
      '    Each listed package must export a `library` CljamLibrary object.',
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
  {
    name: 'handbook',
    description: [
      'Look up a cljam quick-reference entry by topic.',
      '',
      'Returns a dense, example-heavy reference for a specific topic.',
      'Designed for LLM agents — use this to quickly understand cljam behaviour',
      'that differs from JVM Clojure, or to find the idiomatic way to do something.',
      '',
      'If topic is omitted, returns the list of all available topic keys.',
      '',
      'Available topics include:',
      '  sort, char-literals, dynamic-vars, require, jvm-gaps, types,',
      '  records, protocols, schema-primitives, schema-compound, schema-api,',
      '  describe, sessions, pair-programming, handbook',
      '',
      'Example:',
      '  handbook { topic: "sort" }',
      '  → "Default comparator is `compare`, NOT `<` ..."',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Topic key (e.g. "sort", "schema-api"). Omit to list all topics.',
        },
      },
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

  // Lazy sandbox session for handbook lookups — created on first use, reused after.
  let handbookReady = false
  const handbookRecord = manager.create('sandbox')
  async function ensureHandbook(): Promise<void> {
    if (handbookReady) return
    await handbookRecord.session.evaluateAsync("(require '[cljam.handbook :as h])")
    handbookReady = true
  }

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

        // Auto-load libraries declared in root_dir/package.json under cljam.libraries
        let libraries: CljamLibrary[] = []
        const libraryErrors: string[] = []
        if (rootDir) {
          const specs = readPackageLibraries(rootDir)
          if (specs.length > 0) {
            const result = await loadLibraries(rootDir, specs)
            libraries = result.libs
            libraryErrors.push(...result.errors)
          }
        }

        const record = manager.create(preset, rootDir, libraries)
        return ok({
          session_id: record.id,
          ns: record.session.currentNs,
          preset,
          root_dir: rootDir ?? null,
          libraries: record.libraryIds,
          created_at: record.createdAt.toISOString(),
          capabilities: record.session.capabilities,
          ...(libraryErrors.length > 0 ? { library_load_errors: libraryErrors } : {}),
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
            libraries: r.libraryIds,
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

      case 'handbook': {
        await ensureHandbook()
        const topic = a.topic as string | undefined

        if (!topic) {
          // No topic given — return sorted list of all topic keys.
          // printString on a seq/vector uses EDN format (space-separated, no commas),
          // so we return it as a plain string rather than trying to JSON.parse it.
          const result = await handbookRecord.session.evaluateAsync(
            '(sort (map name (h/topics)))'
          )
          return ok({ topics: printString(result) })
        }

        // Lookup: pass topic as a keyword (strip any leading colon the caller might include)
        const kw = topic.startsWith(':') ? topic : `:${topic}`
        const result = await handbookRecord.session.evaluateAsync(`(h/lookup ${kw})`)
        // printString wraps strings in EDN quotes — JSON.parse unwraps them cleanly
        const entry = JSON.parse(printString(result))
        return ok({ topic, entry })
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
