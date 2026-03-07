import { spawnSync } from 'node:child_process'

const input = '(def x 41)\n(+ x 1)\n(exit)\n'
const result = spawnSync(
  'bun',
  ['run', 'src/bin/cli.ts', 'repl'],
  {
    cwd: process.cwd(),
    encoding: 'utf8',
    input,
  }
)

process.stdout.write(result.stdout)
process.stderr.write(result.stderr)
process.exit(result.status ?? 1)
