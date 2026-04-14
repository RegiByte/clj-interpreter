import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  createSession,
  printString,
  type Session,
  type CljamLibrary,
} from '../core'
import { extractNsName } from '../vite-plugin-cljam/namespace-utils'
import { inferSourceRoot, discoverSourceRoots } from './nrepl-utils'
import { startNreplServer } from './nrepl'
import { VERSION } from './version'
import { makeNodeHostModule } from '../host/node-host-module'

// ---------------------------------------------------------------------------
// Library loading (mirrors cljam-mcp/src/server.ts — reads cljam.libraries
// from a root_dir's package.json and dynamically imports each CljamLibrary)
// ---------------------------------------------------------------------------

function readPackageLibraries(rootDir: string): string[] {
  try {
    const content = readFileSync(resolve(rootDir, 'package.json'), 'utf-8')
    const pkg = JSON.parse(content) as Record<string, unknown>
    const cljam = pkg?.cljam as Record<string, unknown> | undefined
    const specs = cljam?.libraries
    if (!Array.isArray(specs)) return []
    return specs.filter((s): s is string => typeof s === 'string')
  } catch {
    return []
  }
}

function resolvePackageEntry(spec: string, rootDir: string): string {
  const pkgDir = spec.startsWith('.')
    ? resolve(rootDir, spec)
    : resolve(rootDir, 'node_modules', spec)
  const pkgJson = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf-8')) as {
    exports?: string | Record<string, unknown>
    main?: string
  }
  if (pkgJson.exports) {
    const dot = typeof pkgJson.exports === 'string' ? pkgJson.exports : pkgJson.exports['.']
    if (typeof dot === 'string') return resolve(pkgDir, dot)
    if (dot && typeof dot === 'object') {
      const c = dot as Record<string, unknown>
      const e = c['import'] ?? c['default'] ?? c['require']
      if (typeof e === 'string') return resolve(pkgDir, e)
    }
  }
  if (pkgJson.main) return resolve(pkgDir, pkgJson.main)
  return resolve(pkgDir, 'index.js')
}

async function loadLibrariesFromRoot(rootDir: string): Promise<CljamLibrary[]> {
  const specs = readPackageLibraries(rootDir)
  if (specs.length === 0) return []
  const libs: CljamLibrary[] = []
  for (const spec of specs) {
    try {
      const entry = resolvePackageEntry(spec, rootDir)
      const mod = await import(pathToFileURL(entry).href) as Record<string, unknown>
      const lib = mod.library as CljamLibrary | undefined
      if (lib && typeof lib.id === 'string') {
        libs.push(lib)
        process.stderr.write(`[cljam] loaded library: ${lib.id}\n`)
      } else {
        process.stderr.write(`[cljam] warning: ${spec} has no \`library\` export\n`)
      }
    } catch (e) {
      process.stderr.write(`[cljam] warning: could not load library ${spec}: ${e instanceof Error ? e.message : e}\n`)
    }
  }
  return libs
}

type CliIo = {
  writeLine: (text: string) => void
  writeError: (text: string) => void
}

function makeCliIo(): CliIo {
  return {
    writeLine: (text) => output.write(`${text}\n`),
    writeError: (text) => process.stderr.write(`${text}\n`),
  }
}

export function createCliSession(sourceRoots: string[], io: CliIo): Session {
  const session = createSession({
    output: (text) => io.writeLine(text),
    sourceRoots,
    readFile: (filePath) => readFileSync(filePath, 'utf8'),
  })
  session.runtime.installModules([makeNodeHostModule(session)])
  return session
}

function getSourceRoots(filePath?: string): string[] {
  const roots = new Set<string>()
  roots.add(process.cwd())
  if (filePath) {
    roots.add(dirname(filePath))
  }
  return [...roots]
}

function printUsage(io: CliIo) {
  io.writeLine('Usage:')
  io.writeLine('  cljam repl')
  io.writeLine('  cljam run <file.clj>')
  io.writeLine('  cljam nrepl-server [--port <number>] [--host <string>] [--root-dir <path>]')
}

export function runFile(fileArg: string, io: CliIo = makeCliIo()): number {
  const filePath = resolve(fileArg)
  if (!existsSync(filePath)) {
    io.writeError(`File not found: ${fileArg}`)
    return 1
  }

  try {
    const source = readFileSync(filePath, 'utf8')
    const inferredRoot = inferSourceRoot(filePath, source)
    const sourceRoots = inferredRoot
      ? [...new Set([inferredRoot, ...getSourceRoots(filePath)])]
      : getSourceRoots(filePath)

    const session = createCliSession(sourceRoots, io)
    session.loadFile(source)

    const nsName = extractNsName(source)
    if (nsName) {
      session.setNs(nsName)
    }

    return 0
  } catch (error) {
    io.writeError(error instanceof Error ? error.message : String(error))
    return 1
  }
}

function shouldExitRepl(source: string): boolean {
  const trimmed = source.trim()
  return trimmed === '(exit)'
}

function evaluateReplLine(session: Session, line: string, io: CliIo): boolean {
  const trimmed = line.trim()
  if (!trimmed) return true
  if (shouldExitRepl(trimmed)) return false

  try {
    const result = session.evaluate(trimmed)
    io.writeLine(printString(result))
  } catch (error) {
    io.writeError(error instanceof Error ? error.message : String(error))
  }

  return true
}

async function startInteractiveRepl(
  session: Session,
  io: CliIo
): Promise<number> {
  const rl = createInterface({ input, output })
  try {
    while (true) {
      let line: string
      try {
        line = await rl.question(`${session.currentNs}=> `)
      } catch {
        break
      }

      if (!evaluateReplLine(session, line, io)) break
    }

    return 0
  } finally {
    rl.close()
  }
}

async function startStreamRepl(session: Session, io: CliIo): Promise<number> {
  const rl = createInterface({ input, output: process.stderr, terminal: false })

  try {
    for await (const line of rl) {
      if (!evaluateReplLine(session, line, io)) break
    }

    return 0
  } finally {
    rl.close()
  }
}

export async function startRepl(io: CliIo = makeCliIo()): Promise<number> {
  const session = createCliSession(getSourceRoots(), io)

  io.writeLine(`Conjure v${VERSION}`)
  io.writeLine('Type (exit) to exit the REPL.')

  if (!input.isTTY) {
    return startStreamRepl(session, io)
  }

  return startInteractiveRepl(session, io)
}

function parseNreplArgs(args: string[]): { port: number; host: string; rootDir?: string } {
  let port = 7888
  let host = '127.0.0.1'
  let rootDir: string | undefined
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[++i], 10)
    } else if (args[i] === '--host' && args[i + 1]) {
      host = args[++i]
    } else if (args[i] === '--root-dir' && args[i + 1]) {
      rootDir = resolve(args[++i])
    }
  }
  return { port, host, rootDir }
}

export async function runCli(
  args: string[],
  io: CliIo = makeCliIo()
): Promise<number> {
  const [command, ...rest] = args

  if (!command || command === 'repl') {
    return startRepl(io)
  }

  if (command === 'run') {
    const [fileArg] = rest
    if (!fileArg) {
      printUsage(io)
      return 1
    }
    return runFile(fileArg, io)
  }

  if (command === 'nrepl-server') {
    const { port, host, rootDir } = parseNreplArgs(rest)
    const effectiveRoot = rootDir ?? process.cwd()
    const sourceRoots = discoverSourceRoots(effectiveRoot)

    // If root-dir is set, load cljam.libraries from its package.json
    const libraries = await loadLibrariesFromRoot(effectiveRoot)

    if (libraries.length > 0) {
      // Pre-build a session with the libraries installed; the server snapshots it.
      const session = createSession({
        sourceRoots,
        readFile: (filePath) => readFileSync(filePath, 'utf8'),
        libraries,
        output: (text) => process.stdout.write(text),
      })
      session.runtime.installModules([makeNodeHostModule(session)])
      startNreplServer({ port, host, session, onOutput: (t) => process.stdout.write(t) })
    } else {
      startNreplServer({ port, host, sourceRoots })
    }

    // Keep the process alive; the TCP server holds the event loop open.
    return new Promise(() => {})
  }

  printUsage(io)
  return 1
}

const entryPath = fileURLToPath(import.meta.url)
const invokedPath = process.argv[1] ? realpathSync(resolve(process.argv[1])) : ''
if (invokedPath === entryPath) {
  const exitCode = await runCli(process.argv.slice(2))
  process.exitCode = exitCode
}
