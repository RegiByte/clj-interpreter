import type { SessionOptions } from './core/session'

/**
 * Preset functions — plain SessionOptions objects. Compose with spread:
 *
 *   createSession({ ...nodePreset(), libraries: [myLib] })
 *   createSession({ ...nodePreset(), hostBindings: { ...nodePreset().hostBindings, extra } })
 */

// ---------------------------------------------------------------------------
// Session profile — workspace-config-level capability description
// ---------------------------------------------------------------------------

/**
 * Named capability tiers for configuring a session's JS host access.
 * Used in `package.json` under `cljam.preset` to set the session profile
 * for all clients (nREPL, MCP, CLI REPL) uniformly.
 *
 *   "none"       — no host bindings (pure sandbox, maximum isolation)
 *   "node"       — safe Node.js scripting: Math, JSON, Promise, console, Buffer, timers
 *                  No network (fetch) or platform access (process). The default.
 *   "node-agent" — node + fetch + process (full agentic Node.js environment)
 *   "browser"    — browser globals: Math, JSON, fetch, document, window, timers
 */
export type SessionPresetName = 'none' | 'node' | 'node-agent' | 'browser'

/**
 * Resolved capability profile for a session.
 * Produced by `resolveSessionProfile` and consumed by both `startNreplServer`
 * and `SessionManager` in cljam-mcp — ensures consistent host access across
 * all clients connected to the same project.
 */
export type SessionProfile = {
  preset: SessionPresetName
  hostBindings: Record<string, unknown>
  allowedHostModules: string[] | 'all'
  allowedPackages: string[] | 'all'
}

const NODE_BASE_BINDINGS: Record<string, unknown> = {
  Math,
  JSON: globalThis.JSON,
  Promise: globalThis.Promise,
  Object: globalThis.Object,
  console,
  // Buffer is Node-only; guard so this module-level const is safe to evaluate in browsers
  ...(typeof Buffer !== 'undefined' ? { Buffer } : {}),
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
}

function presetBindings(preset: SessionPresetName): Record<string, unknown> {
  switch (preset) {
    case 'none':
      return {}
    case 'node':
      return { ...NODE_BASE_BINDINGS }
    case 'node-agent':
      return { ...NODE_BASE_BINDINGS, fetch: globalThis.fetch, process }
    case 'browser': {
      const g = globalThis as Record<string, unknown>
      return {
        Math,
        JSON: globalThis.JSON,
        Promise: globalThis.Promise,
        console,
        fetch: globalThis.fetch,
        setTimeout: globalThis.setTimeout,
        clearTimeout: globalThis.clearTimeout,
        setInterval: globalThis.setInterval,
        clearInterval: globalThis.clearInterval,
        ...(g['document'] !== undefined ? { document: g['document'] } : {}),
        ...(g['window'] !== undefined ? { window: g['window'] } : {}),
        ...(g['alert'] !== undefined ? { alert: g['alert'] } : {}),
        ...(g['location'] !== undefined ? { location: g['location'] } : {}),
        ...(g['history'] !== undefined ? { history: g['history'] } : {}),
      }
    }
  }
}

/**
 * Resolve a `SessionProfile` from its component parts.
 *
 * @param preset           - Named capability tier. Defaults to `'node'`.
 * @param extraBindings    - Global names to add on top of the preset (additive only).
 *                           Each name is looked up on `globalThis`; unknown names are silently ignored.
 *                           Example: `['fetch', 'crypto']`
 * @param allowedHostModules - Which JS specifiers may be imported via `(:require ["pkg" :as X])`.
 *                           Defaults to `'all'`.
 * @param allowedPackages  - Which Clojure library namespaces may be required.
 *                           Defaults to `'all'`.
 */
export function resolveSessionProfile(
  preset: SessionPresetName = 'node',
  extraBindings: string[] = [],
  allowedHostModules: string[] | 'all' = 'all',
  allowedPackages: string[] | 'all' = 'all'
): SessionProfile {
  const base = presetBindings(preset)
  const g = globalThis as Record<string, unknown>
  const extras = Object.fromEntries(
    extraBindings.filter((name) => name in g).map((name) => [name, g[name]])
  )
  return {
    preset,
    hostBindings: { ...base, ...extras },
    allowedHostModules,
    allowedPackages,
  }
}

/**
 * Full Node.js environment: stdout/stderr wired to process streams,
 * dynamic import enabled, common Node globals in js namespace,
 * all packages allowed.
 */
export function nodePreset(): SessionOptions {
  return {
    output: (text) => process.stdout.write(text + '\n'),
    stderr: (text) => process.stderr.write(text + '\n'),
    importModule: (specifier) => import(/** @vite-ignore */ specifier),
    hostBindings: {
      Math,
      console,
      process,
      Buffer,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      fetch: globalThis.fetch,
    },
    allowedPackages: 'all',
    allowedHostModules: 'all',
  }
}

/**
 * Browser environment: output wired to console.log/error,
 * dynamic import enabled, common browser globals in js namespace,
 * all packages allowed.
 */
export function browserPreset(): SessionOptions {
  return {
    output: (text) => console.log(text),
    stderr: (text) => console.error(text),
    importModule: (specifier) => import(/** @vite-ignore */ specifier),
    hostBindings: {
      Math,
      console,
      window: globalThis,
      document: (globalThis as typeof globalThis & { document?: unknown })
        .document,
      fetch: globalThis.fetch,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    },
    allowedPackages: 'all',
    allowedHostModules: 'all',
  }
}

/**
 * Secure-by-default preset for LLM sessions and sandboxed evaluation.
 * - No IO (output is a noop — caller overrides output/stderr if needed)
 * - No importModule — dynamic JS imports disabled
 * - No host globals beyond Math (pure computation, no side effects)
 * - allowedPackages: [] — nothing loads unless you explicitly add it
 *
 * Typical usage:
 *   const output: string[] = []
 *   createSession({
 *     ...sandboxPreset(),
 *     output: (text) => output.push(text),
 *     libraries: [dateLib],
 *     allowedPackages: ['cljam-date'],
 *   })
 */
export function sandboxPreset(): SessionOptions {
  return {
    output: () => {
      /* noop */
    },
    stderr: () => {
      /* noop */
    },
    // importModule intentionally absent — dynamic JS imports disabled
    hostBindings: {
      Math, // pure computation, no side effects
    },
    allowedPackages: [],
    allowedHostModules: [],
  }
}
