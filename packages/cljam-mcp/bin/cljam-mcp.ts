#!/usr/bin/env node
/**
 * cljam-mcp — stdio MCP server entry point.
 *
 * Add to your MCP client config:
 *   {
 *     "mcpServers": {
 *       "cljam": {
 *         "command": "npx",
 *         "args": ["cljam-mcp"]
 *       }
 *     }
 *   }
 */
import { startMcpServer } from '../src/server.js'

startMcpServer().catch((e: unknown) => {
  console.error('[cljam-mcp] Fatal error:', e)
  process.exit(1)
})
