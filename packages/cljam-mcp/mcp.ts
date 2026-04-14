// cljam-mcp — MCP server for cljam.
// Gives LLMs a persistent, stateful Clojure REPL via the Model Context Protocol.
//
// Embedded usage:
//   import { createMcpServer } from '@regibyte/cljam-mcp'
//   const server = createMcpServer()
//   // wire your own transport
//
// CLI usage:
//   npx cljam-mcp          # starts an MCP server on stdio
//
// Tools exposed:
//   new_session    — create a sandbox or node-preset session
//   eval           — evaluate Clojure code, returns EDN result + captured stdout
//   clone_session  — fork a session from a snapshot
//   list_sessions  — list active sessions
//   delete_session — free a session
//   load_file      — load a .clj file by path

export { createMcpServer, startMcpServer } from './src/server.js'
export type { SessionRecord, Preset } from './src/session-manager.js'
