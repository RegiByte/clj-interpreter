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
 */
import { startMcpServer, type McpServerOptions } from '../src/server.js'
import { resolve } from 'node:path'

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

startMcpServer(parseArgs(process.argv.slice(2))).catch((e: unknown) => {
  console.error('[cljam-mcp] Fatal error:', e)
  process.exit(1)
})
