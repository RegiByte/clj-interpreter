#!/usr/bin/env node
/**
 * cljam — Node.js bin entry for @regibyte/cljam.
 *
 * Handles commands that run in plain Node.js. Commands that require the Bun
 * runtime (repl, run, nrepl-server) must be invoked via Bun directly.
 *
 * Available commands:
 *   cljam gen-lib-source <src-dir> <output-file>
 */

import { genLibrarySources } from './gen-library-sources.mjs'

const [command, ...args] = process.argv.slice(2)

if (command === 'gen-lib-source') {
  const [srcDir, outputFile] = args
  if (!srcDir || !outputFile) {
    console.error('Usage: cljam gen-lib-source <src-dir> <output-file>')
    console.error('Example: cljam gen-lib-source src/clojure src/generated/sources.ts')
    process.exit(1)
  }
  genLibrarySources(srcDir, outputFile)

} else if (command === 'repl' || command === 'run' || command === 'nrepl-server') {
  console.error(`'cljam ${command}' requires the Bun runtime.`)
  console.error('Install Bun (https://bun.sh) and run:')
  console.error(`  bun run node_modules/@regibyte/cljam/src/bin/cli.ts ${command} ${args.join(' ')}`)
  process.exit(1)

} else {
  if (command) {
    console.error(`Unknown command: ${command}`)
    console.error('')
  }
  console.error('Usage: cljam <command> [options]')
  console.error('')
  console.error('Commands (Node.js):')
  console.error('  gen-lib-source <src-dir> <output-file>')
  console.error('      Generate sources.ts from a directory of .clj files')
  console.error('')
  console.error('Commands (Bun required):')
  console.error('  repl                Start an interactive REPL')
  console.error('  run <file.clj>      Run a Clojure file')
  console.error('  nrepl-server        Start an nREPL server')
  process.exit(command ? 1 : 0)
}
