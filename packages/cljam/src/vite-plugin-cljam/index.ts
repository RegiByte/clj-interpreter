import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, relative, join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import { createSession } from '../core/session'
import type { Session } from '../core/session'
import { nsToPath, pathToNs, extractStringRequires } from './namespace-utils'
import { generateModuleCode, generateDts, safeJsIdentifier } from './codegen'
import type { CodegenContext } from './codegen'
import { startBrowserNreplRelay } from '../nrepl/relay'

interface CljPluginOptions {
  sourceRoots?: string[]
  nreplPort?: number
  /**
   * Path to a user-defined session factory (relative to project root).
   * The factory must be the default export with signature:
   *   (importMap: Record<string, unknown>) => SessionOptions | null | undefined
   *
   * The plugin automatically injects `importModule` (wired to the import map) and
   * `output` (wired to nREPL output capture + console.log). Do NOT provide these.
   * Return only what you need: hostBindings, modules, entries, stderr, etc.
   *
   * Example: entrypoint: 'src/conjure.ts'
   */
  entrypoint?: string
}

// Resolve the cljam core index path regardless of whether this plugin
// is running from TypeScript source (src/vite-plugin-cljamam/) or the pre-built
// output (dist-vite-plugin/). Never use the consuming project's root.
function resolveCoreIndexPath(): string {
  const thisDir = dirname(fileURLToPath(import.meta.url))
  // Source layout: packages/cljam/src/vite-plugin-cljamam/index.ts
  const fromSource = resolve(thisDir, '../core/index.ts')
  try {
    statSync(fromSource)
    return fromSource
  } catch {
    // Built layout: packages/cljam/dist-vite-plugin/index.mjs
    return resolve(thisDir, '../src/core/index.ts')
  }
}

const VIRTUAL_SESSION_ID = 'virtual:clj-session'
const RESOLVED_VIRTUAL_SESSION_ID = '\0' + VIRTUAL_SESSION_ID

export function cljPlugin(options?: CljPluginOptions): Plugin {
  const sourceRoots = options?.sourceRoots ?? ['src']
  let projectRoot = ''
  let serverSession: Session
  let coreIndexPath: string
  let codegenCtx: CodegenContext
  let generatorScriptPath: string
  let serveMode = false
  // Collected during configResolved: original CLJ source string → resolved path/package name.
  // Original string = what the CLJ runtime passes to importModule(s).
  // Resolved = what Vite should actually import (absolute path for relative, unchanged for pkgs).
  let stringRequires: Array<{ original: string; resolved: string }> = []
  // Resolved absolute path to the user-defined session entrypoint (Mode 2), or null (Mode 1).
  let entrypointPath: string | null = null

  function writeFileIfChanged(path: string, content: string) {
    try {
      const existing = readFileSync(path, 'utf-8')
      if (existing === content) {
        return
      }
    } catch {
      // file does not exist yet
    }
    writeFileSync(path, content, 'utf-8')
  }

  function collectCljFiles(dir: string): string[] {
    let results: string[] = []
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return results
    }
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules') continue
      const fullPath = join(dir, entry)
      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          results = results.concat(collectCljFiles(fullPath))
        } else if (entry.endsWith('.clj')) {
          results.push(fullPath)
        }
      } catch {
        continue
      }
    }
    return results
  }

  function eagerlyGenerateDts() {
    for (const root of sourceRoots) {
      const rootPath = resolve(projectRoot, root)
      for (const filePath of collectCljFiles(rootPath)) {
        try {
          const source = readFileSync(filePath, 'utf-8')
          const nsNameFromPath = pathToNs(relative(projectRoot, filePath), sourceRoots)
          const dts = generateDts(codegenCtx, nsNameFromPath, source)
          if (dts) writeFileIfChanged(filePath + '.d.ts', dts)
        } catch {
          continue
        }
      }
    }
  }

  function initServerSession() {
    // Use a require resolver anchored to the project root so that the server session
    // can import npm packages from the consuming project's node_modules (e.g. date-fns),
    // not just from the plugin's own node_modules.
    const projectRequire = createRequire(resolve(projectRoot, 'package.json'))

    serverSession = createSession({
      sourceRoots,
      readFile: (filePath: string) =>
        readFileSync(resolve(projectRoot, filePath), 'utf-8'),
      output: () => {},
      // Node dynamic import — used only during server-side code generation (DTS inference).
      // In the browser bundle, importModule is a synchronous import map lookup instead.
      importModule: async (s: string) => {
        if (!s.startsWith('.') && !s.startsWith('/')) {
          // Package import: resolve from project root context so the consuming project's
          // node_modules are searched instead of (or in addition to) the plugin's.
          try {
            const resolved = projectRequire.resolve(s)
            return import(pathToFileURL(resolved).href)
          } catch {
            try {
              return await import(s)
            } catch {
              // Package not importable in Node context (browser-only) — return stub
              // so that namespace loading succeeds and codegen can infer exported vars.
              return {}
            }
          }
        }
        // Local/absolute path: may be a browser-only file (e.g. local .ts with DOM deps).
        // Return a stub so the CLJ namespace still loads for server-side var inference.
        try {
          return await import(s)
        } catch {
          return {}
        }
      },
    })
    codegenCtx = {
      sourceRoots,
      coreIndexPath,
      virtualSessionId: VIRTUAL_SESSION_ID,
      resolveDepPath: (depNs: string) => {
        for (const root of sourceRoots) {
          const depPath = resolve(projectRoot, nsToPath(depNs, root))
          try {
            readFileSync(depPath)
            return depPath
          } catch {
            continue
          }
        }
        return null
      },
    }
  }

  function scanStringRequires() {
    // original string (what CLJ runtime passes to importModule) → resolved path/pkg
    const seen = new Map<string, string>()
    for (const root of sourceRoots) {
      const rootPath = resolve(projectRoot, root)
      for (const filePath of collectCljFiles(rootPath)) {
        try {
          const source = readFileSync(filePath, 'utf-8')
          // Call twice: without filePath to get original CLJ source strings,
          // with filePath to get resolved absolute paths for relative specifiers.
          const originals = extractStringRequires(source)
          const resolved = extractStringRequires(source, filePath)
          for (let i = 0; i < originals.length; i++) {
            seen.set(originals[i], resolved[i])
          }
        } catch {
          continue
        }
      }
    }
    stringRequires = [...seen.entries()].map(([original, resolved]) => ({
      original,
      resolved,
    }))
  }

  function regenerateBuiltInNamespaceSources() {
    try {
      statSync(generatorScriptPath)
    } catch {
      // Script doesn't exist in this project — pre-built sources are already
      // included in the cljam package, no regeneration needed.
      return
    }
    try {
      execFileSync(process.execPath, [generatorScriptPath], {
        cwd: projectRoot,
        stdio: 'pipe',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to generate built-in namespace sources: ${message}`)
    }
  }

  /**
   * Generate the static import table lines for the virtual session module.
   * Each specifier gets a unique variable name. Returns { importLines, mapEntries }.
   */
  function buildImportTable(): { importLines: string[]; mapEntries: string[] } {
    const importLines: string[] = []
    const mapEntries: string[] = []
    stringRequires.forEach(({ original, resolved }, i) => {
      const varName = `_imp_${i}`
      // Import statement uses the resolved path (absolute for local files, pkg name for packages).
      // Map key uses the original CLJ source string — this is what importModule(s) receives at runtime.
      importLines.push(`import * as ${varName} from ${JSON.stringify(resolved)};`)
      mapEntries.push(`  ${JSON.stringify(original)}: ${varName},`)
    })
    return { importLines, mapEntries }
  }

  return {
    name: 'vite-plugin-cljam',

    configResolved(config: ResolvedConfig) {
      projectRoot = config.root
      serveMode = config.command === 'serve'
      generatorScriptPath = resolve(projectRoot, 'scripts/gen-core-source.mjs')
      regenerateBuiltInNamespaceSources()
      coreIndexPath = resolveCoreIndexPath()
      initServerSession()

      // Detect Mode 2: explicit user entrypoint
      if (options?.entrypoint) {
        const ep = resolve(projectRoot, options.entrypoint)
        try {
          statSync(ep)
          entrypointPath = ep
        } catch {
          // Configured entrypoint doesn't exist — fall through to Mode 1 with a warning
          console.warn(
            `[vite-plugin-cljam] entrypoint not found: ${options.entrypoint} — falling back to auto-generated session`
          )
        }
      }

      scanStringRequires()
      eagerlyGenerateDts()
    },

    configureServer(server: ViteDevServer) {
      startBrowserNreplRelay({
        port: options?.nreplPort,
        cwd: projectRoot,
        ws: server.ws,
        serverSession,
      })
    },

    resolveId(source: string) {
      if (source === VIRTUAL_SESSION_ID) {
        return RESOLVED_VIRTUAL_SESSION_ID
      }
      if (source.endsWith('.clj') && !source.includes('?')) {
        return null
      }
      return undefined
    },

    load(id: string) {
      if (id === RESOLVED_VIRTUAL_SESSION_ID) {
        const { importLines, mapEntries } = buildImportTable()

        // All static imports must be at the top of the module (ESM hoist semantics)
        const lines: string[] = [
          `import { createSession, printString } from ${JSON.stringify(coreIndexPath)};`,
          ...importLines,
          ...(entrypointPath
            ? [`import __conjureFactory from ${JSON.stringify(entrypointPath)};`]
            : []),
          ``,
          `const __importMap = {`,
          ...mapEntries,
          `};`,
          ``,
          `let _session = null;`,
          `let _outputLines = [];`,
        ]

        if (entrypointPath) {
          // Mode 2: user-defined factory returns SessionOptions (without output/importModule).
          // The plugin owns output capture (for nREPL relay) and importModule (import map wiring).
          // User factory controls hostBindings, modules, entries, etc.
          lines.push(
            `export function getSession() {`,
            `  if (!_session) {`,
            `    const __userOpts = __conjureFactory(__importMap) ?? {};`,
            `    _session = createSession({`,
            `      ...(__userOpts),`,
            `      importModule: (s) => __importMap[s],`,
            `      output: (text) => { _outputLines.push(text); console.log(text.replace(/\\n$/, '')); },`,
            `    });`,
            `  }`,
            `  return _session;`,
            `}`,
          )
        } else {
          // Mode 1: auto-generate session with import map wired in
          lines.push(
            `export function getSession() {`,
            `  if (!_session) {`,
            `    _session = createSession({`,
            `      importModule: (s) => __importMap[s],`,
            `      output: (text) => { _outputLines.push(text); console.log(text.replace(/\\n$/, '')); },`,
            `    });`,
            `  }`,
            `  return _session;`,
            `}`,
          )
        }

        if (serveMode) {
          lines.push(
            ``,
            `// Browser nREPL relay — active only in Vite dev server`,
            `if (import.meta.hot) {`,
            `  import.meta.hot.on('conjure:eval', async ({ id, code, ns }) => {`,
            `    const session = getSession();`,
            `    _outputLines = [];`,
            `    try {`,
            `      if (ns && ns !== session.currentNs) session.setNs(ns);`,
            `      const result = await session.evaluateAsync(code);`,
            `      const out = _outputLines.join('');`,
            `      import.meta.hot.send('conjure:eval-result', { id, value: printString(result), ns: session.currentNs, ...(out ? { out } : {}) });`,
            `    } catch (err) {`,
            `      console.error(err);`,
            `      const out = _outputLines.join('');`,
            `      import.meta.hot.send('conjure:eval-result', { id, error: err instanceof Error ? err.message : String(err), ns: session.currentNs, ...(out ? { out } : {}) });`,
            `    }`,
            `  });`,
            ``,
            `  import.meta.hot.on('conjure:load-file', async ({ id, source, nsHint, filePath }) => {`,
            `    const session = getSession();`,
            `    _outputLines = [];`,
            `    try {`,
            `      const loadedNs = await session.loadFileAsync(source, nsHint, filePath || undefined);`,
            `      if (loadedNs) session.setNs(loadedNs);`,
            `      const out = _outputLines.join('');`,
            `      import.meta.hot.send('conjure:load-file-result', { id, value: 'nil', ns: session.currentNs, ...(out ? { out } : {}) });`,
            `    } catch (err) {`,
            `      console.error(err);`,
            `      const out = _outputLines.join('');`,
            `      import.meta.hot.send('conjure:load-file-result', { id, error: err instanceof Error ? err.message : String(err), ns: session.currentNs, ...(out ? { out } : {}) });`,
            `    }`,
            `  });`,
            `}`,
          )
        }

        return lines.join('\n')
      }

      if (id.endsWith('.clj') && !id.includes('?')) {
        const source = readFileSync(id, 'utf-8')
        const nsNameFromPath = pathToNs(relative(projectRoot, id), sourceRoots)
        const code = generateModuleCode(codegenCtx, nsNameFromPath, source, id)
        const dts = generateDts(codegenCtx, nsNameFromPath, source)
        if (dts) writeFileIfChanged(id + '.d.ts', dts)
        return code
      }
    },

    hotUpdate({ file, modules, read }) {
      if (!file.endsWith('.clj')) return

      const doUpdate = async () => {
        if (file.startsWith(resolve(projectRoot, 'src/clojure') + '/')) {
          regenerateBuiltInNamespaceSources()
        }
        const source = await read()
        try {
          const nsNameFromPath = pathToNs(relative(projectRoot, file), sourceRoots)
          await serverSession.loadFileAsync(source, nsNameFromPath)
          const dts = generateDts(codegenCtx, nsNameFromPath, source)
          writeFileIfChanged(file + '.d.ts', dts)
        } catch {
          // file may not be under source roots
        }
        return modules
      }

      return doUpdate()
    },
  } satisfies Plugin
}

export { safeJsIdentifier, generateModuleCode, generateDts }
export type { CljPluginOptions, CodegenContext }
