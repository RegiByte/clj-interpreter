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
import { SessionManager, discoverMain, type SessionRecord } from './session-manager.js'
import { ConnectionManager } from './nrepl-bridge.js'

export type McpServerOptions = {
  /** Default workspace root used by new_session when root_dir is omitted. */
  defaultRootDir?: string
  /**
   * Default main spec used by new_session, overriding `cljam.main` from the
   * workspace package.json. Format: "ns" or "ns:fn".
   */
  defaultMain?: string
}

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
      'Sessions use the MCP agent workspace configuration:',
      '  - captured stdout/stderr',
      '  - Math/console/process/fetch/Buffer/timers available in the js namespace',
      '  - dynamic JS imports enabled for day-to-day Node.js work',
      '',
      'root_dir: ESCAPE HATCH — only pass this when you explicitly want a non-default workspace.',
      'Leave it out entirely (do NOT pass null or empty string) to use the configured default workspace.',
      'When a root directory is set (explicitly or via server default):',
      '  - load_file accepts paths relative to root_dir',
      '  - (:require [ns]) resolves .clj files from cljam.sourceRoots in package.json',
      '  - cljam.libraries in root_dir/package.json are auto-loaded:',
      '    { "cljam": { "libraries": ["@regibyte/cljam-schema"] } }',
      '    Each listed package must export a `library` CljamLibrary object.',
      '  - cljam.main in root_dir/package.json is auto-required and the session',
      '    enters that namespace. Format: "my.ns" or "my.ns:bootstrap-fn".',
      '    With ":fn" the function is called with no args after the require.',
      '',
      'IMPORTANT — cljam diverges from JVM Clojure in these ways:',
      '  - No Java interop: (.method obj), (new Class), import do not exist.',
      '  - No JVM classes: Thread, ArrayList, etc. are unavailable.',
      '  - Floating point follows JS/IEEE-754 (not JVM rounding).',
      '  - Use (async ...) instead of future/agent for async work. @ Deref within async block acts as await.',
      '  - Refs/dosync exist but STM retry semantics are simplified.',
      '',
      'JS INTEROP SYNTAX (not ClojureScript — different dot forms):',
      '  (. obj field)           ;; property access: (. "hello" length) → 5',
      '  (. obj method arg...)   ;; method with args: (. "hello" indexOf "l") → 2',
      '  ((. obj method))        ;; zero-arg method: ((. "hello" toUpperCase)) → "HELLO"',
      '  !! (. res json) returns the fn — does NOT call it. ((. res json)) calls it.',
      '  js/Math.floor, js/Math.PI  ;; dot-chain walk from a hostBinding',
      '  (js/Math.floor 3.7) → 3    ;; call result of dot-chain walk',
      '  (js/new Constructor args...)  ;; construct a JS object',
      '  (js/get obj "key")            ;; dynamic property read (JS objects ≠ Clojure maps)',
      '',
      'ASYNC QUICK-REFERENCE:',
      '  (async ...)             ;; returns CljPending immediately — NOT the value',
      '  @expr inside async      ;; awaits a CljPending (like JS await)',
      '  @expr outside async     ;; THROWS — always deref inside an async block',
      '  (def x @pending)        ;; def inside async works — x gets the resolved value',
      '  (then p f)              ;; chain: apply f to resolved value',
      '  (catch* p f)            ;; error handling: f called on rejection',
      '  js/fetch returns CljPending automatically — no wrapping needed',
      '',
      'START HERE — read these handbook entries before writing cljam code:',
      '  handbook { topic: "js-interop" }  — full JS interop syntax + gotchas',
      '  handbook { topic: "async" }       — async blocks, deref, then/catch*, all',
      '  handbook { topic: "jvm-gaps" }    — what JVM Clojure features are absent',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        root_dir: {
          type: 'string',
          description:
            'Absolute path to a specific project root. OMIT this parameter (do not pass null or empty string) to use the server-configured default workspace. Only provide a value to open a session in an explicit non-default location.',
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
    description: 'List all active sessions with their current namespace and workspace metadata.',
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
      '  - A path relative to the session root_dir',
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
      'NEW AGENT? Read these three topics before writing any cljam code:',
      '  handbook { topic: "js-interop" }  — JS dot syntax, method calls, property access',
      '  handbook { topic: "async" }       — (async ...) blocks, @deref, then/catch*/all',
      '  handbook { topic: "jvm-gaps" }    — what JVM features are absent in cljam',
      '',
      'If topic is omitted, returns the list of all available topic keys.',
      '',
      'All available topics:',
      '  jvm-gaps, js-interop, async, node-io',
      '  types, records, protocols',
      '  sort, char-literals, dynamic-vars, require',
      '  schema-primitives, schema-compound, schema-api, and-short-circuit',
      '  describe, sessions, pair-programming, handbook',
      '',
      'Example:',
      '  handbook { topic: "js-interop" }',
      '  → "Property access: (. obj field) ..."',
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

export function createMcpServer(options: McpServerOptions = {}): Server {
  const manager = new SessionManager(options.defaultRootDir)
  const connManager = new ConnectionManager()

  // Lazy session for handbook lookups — built on first use because session
  // creation became async (entrypoint bootstrap support).
  let handbookRecord: SessionRecord | null = null
  let handbookReady = false
  async function ensureHandbook(): Promise<SessionRecord> {
    if (!handbookRecord) handbookRecord = await manager.create()
    if (!handbookReady) {
      await handbookRecord.session.evaluateAsync("(require '[cljam.handbook :as h])")
      handbookReady = true
    }
    return handbookRecord
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
        // Normalize: null and empty string both mean "use the server default" —
        // agents sometimes pass null when they mean "no preference". Treat that as omitted.
        const rootDir =
          typeof a.root_dir === 'string' && a.root_dir.length > 0
            ? a.root_dir
            : undefined

        // Auto-load libraries declared in root_dir/package.json under cljam.libraries
        let libraries: CljamLibrary[] = []
        const libraryErrors: string[] = []
        const effectiveRootDir = rootDir ?? options.defaultRootDir
        if (effectiveRootDir) {
          const specs = readPackageLibraries(effectiveRootDir)
          if (specs.length > 0) {
            const result = await loadLibraries(effectiveRootDir, specs)
            libraries = result.libs
            libraryErrors.push(...result.errors)
          }
        }

        // Resolve main spec: server-level CLI/env override wins, else package.json.
        const main =
          options.defaultMain ??
          (effectiveRootDir ? discoverMain(effectiveRootDir) : undefined)

        const record = await manager.create({ rootDir, libraries, main })
        const startupOutput = record.outputBuffer.join('\n')
        return ok({
          session_id: record.id,
          ns: record.session.currentNs,
          preset: record.preset,
          session_preset: record.sessionPreset,
          root_dir: record.rootDir ?? null,
          source_roots: record.sourceRoots,
          libraries: record.libraryIds,
          ...(record.main ? { main: record.main } : {}),
          created_at: record.createdAt.toISOString(),
          capabilities: record.session.capabilities,
          ...(libraryErrors.length > 0 ? { library_load_errors: libraryErrors } : {}),
          ...(record.mainLoadError ? { main_load_error: record.mainLoadError } : {}),
          ...(startupOutput ? { startup_output: startupOutput } : {}),
          agent_hints: [
            'WORKSPACE INTROSPECTION — do this before writing any code:',
            '  (all-ns)                        — list all loaded namespaces',
            '  (describe (find-ns \'some.ns))   — explore a namespace\'s full API',
            'Check existing namespaces before reimplementing functionality.',
            'If a workspace was loaded, it may already have utilities for your task.',
          ].join('\n'),
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
            session_preset: r.sessionPreset,
            root_dir: r.rootDir ?? null,
            source_roots: r.sourceRoots,
            libraries: r.libraryIds,
            ...(r.main ? { main: r.main } : {}),
            created_at: r.createdAt.toISOString(),
            ...(r.mainLoadError ? { main_load_error: r.mainLoadError } : {}),
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
        const record = await ensureHandbook()
        const topic = a.topic as string | undefined

        if (!topic) {
          // No topic given — return sorted list of all topic keys.
          // printString on a seq/vector uses EDN format (space-separated, no commas),
          // so we return it as a plain string rather than trying to JSON.parse it.
          const result = await record.session.evaluateAsync(
            '(sort (map name (h/topics)))'
          )
          return ok({ topics: printString(result) })
        }

        // Lookup: pass topic as a keyword (strip any leading colon the caller might include)
        const kw = topic.startsWith(':') ? topic : `:${topic}`
        const result = await record.session.evaluateAsync(`(h/lookup ${kw})`)
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

/**
 * Verify the @regibyte/cljam dependency is not just importable but usable before
 * we advertise tools to the client. The dynamic import in `bin/cljam-mcp.ts`
 * catches "failed to link"; this catches the subtler "linked, but the surface we
 * depend on is missing" — e.g. a partial/half-built dist, or an API drift across
 * a version bump. Failing here, loudly, beats accepting a tool call and crashing
 * mid-request where the client only sees a dropped connection.
 */
function preflightCljam(): void {
  if (typeof printString !== 'function') {
    throw new Error(
      'cljam preflight failed: @regibyte/cljam loaded but did not export a callable ' +
        '`printString`. The dependency is likely partially built or version-mismatched. ' +
        'Run `bun install` from the repo root and ensure cljam is built if consumed as dist.',
    )
  }
}

export async function startMcpServer(options: McpServerOptions = {}): Promise<void> {
  preflightCljam()
  const server = createMcpServer(options)
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
