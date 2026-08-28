#!/usr/bin/env node
/**
 * cljam-mcp — stdio MCP server entry point.
 *
 * Add to your MCP client config:
 *   {
 *     "mcpServers": {
 *       "cljam": {
 *         "command": "npx",
 *         "args": ["cljam-mcp", "--root-dir", "/path/to/workspace"]
 *       }
 *     }
 *   }
 *
 * Optional flags:
 *   --root-dir <path>   default workspace for new sessions (also: --workspace, $CLJAM_MCP_ROOT_DIR)
 *   --main <ns[:fn]>    bootstrap entrypoint, overrides cljam.main from package.json
 *                       (also: $CLJAM_MCP_MAIN)
 *
 * Error reporting contract: this binary is launched by an MCP host (e.g. Claude
 * Desktop) over stdio. The host shows the user only "transport closed" when we
 * die — it does NOT surface our exit reason inline. Our stderr, however, IS
 * written to the host's MCP log. So every fatal path here must print a clear,
 * actionable diagnosis to stderr before exiting. The server module (and its
 * heavy `@regibyte/cljam` dependency) is imported *dynamically* below, AFTER the
 * process-level handlers are installed, so that a module-link failure in that
 * graph is catchable here instead of crashing as an uncaught link error with no
 * context.
 */
import { resolve } from 'node:path'
import type { McpServerOptions } from '../src/server.js'

function parseArgs(args: string[]): McpServerOptions {
  let defaultRootDir = process.env.CLJAM_MCP_ROOT_DIR
  let defaultMain = process.env.CLJAM_MCP_MAIN

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if ((arg === '--root-dir' || arg === '--workspace') && args[i + 1]) {
      defaultRootDir = args[++i]
    } else if (arg === '--main' && args[i + 1]) {
      defaultMain = args[++i]
    }
  }

  return {
    defaultRootDir: defaultRootDir ? resolve(defaultRootDir) : undefined,
    defaultMain: defaultMain && defaultMain.trim().length > 0 ? defaultMain.trim() : undefined,
  }
}

/**
 * Print a clear diagnosis to stderr and exit non-zero. The MCP host captures
 * stderr into its log, so this is the only channel a user has to learn *why*
 * the server died. We add a targeted hint for the one failure mode that is both
 * common in the monorepo and otherwise inscrutable: a stale `@regibyte/cljam`
 * dependency that resolves to a snapshot missing files the live source needs.
 */
function die(context: string, e: unknown): never {
  const detail = e instanceof Error ? (e.stack ?? `${e.name}: ${e.message}`) : String(e)
  console.error(`[cljam-mcp] ${context}`)
  console.error(detail)

  const isCljamResolutionFailure =
    /@regibyte\/cljam/.test(detail) && /cannot find module/i.test(detail)
  if (isCljamResolutionFailure) {
    console.error(
      '\n[cljam-mcp] Hint: a module inside @regibyte/cljam could not be resolved.\n' +
        '  In the cljam monorepo this almost always means the dependency points at a\n' +
        "  stale snapshot copy. Check that cljam-mcp's devDependency on @regibyte/cljam\n" +
        '  is "workspace:*" (a live link), NOT "file:../cljam" (a frozen copy), then run\n' +
        '  `bun install` from the repo root.',
    )
  }
  process.exit(1)
}

process.on('uncaughtException', (e) => die('Uncaught exception:', e))
process.on('unhandledRejection', (e) => die('Unhandled promise rejection:', e))

async function main(): Promise<void> {
  // Dynamic import: the server + @regibyte/cljam graph links here, inside reach
  // of the handlers above, so a resolution/link fault surfaces as a clear
  // diagnosis rather than an uncaught crash with no context.
  let startMcpServer: (options?: McpServerOptions) => Promise<void>
  try {
    ;({ startMcpServer } = await import('../src/server.js'))
  } catch (e) {
    die('Failed to load the MCP server module:', e)
  }

  await startMcpServer(parseArgs(process.argv.slice(2)))
}

main().catch((e: unknown) => die('Fatal error during startup:', e))
