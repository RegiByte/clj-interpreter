import type { SessionOptions } from './core/session'

/**
 * Preset functions — plain SessionOptions objects. Compose with spread:
 *
 *   createSession({ ...nodePreset(), libraries: [myLib] })
 *   createSession({ ...nodePreset(), hostBindings: { ...nodePreset().hostBindings, extra } })
 */

/**
 * Full Node.js environment: stdout/stderr wired to process streams,
 * dynamic import enabled, common Node globals in js namespace,
 * all packages allowed.
 */
export function nodePreset(): SessionOptions {
  return {
    output: (text) => process.stdout.write(text + '\n'),
    stderr: (text) => process.stderr.write(text + '\n'),
    importModule: (specifier) => import(specifier),
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
    importModule: (specifier) => import(specifier),
    hostBindings: {
      Math,
      console,
      window: globalThis,
      document: (globalThis as typeof globalThis & { document?: unknown }).document,
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
    output: () => { /* noop */ },
    stderr: () => { /* noop */ },
    // importModule intentionally absent — dynamic JS imports disabled
    hostBindings: {
      Math, // pure computation, no side effects
    },
    allowedPackages: [],
    allowedHostModules: [],
  }
}
