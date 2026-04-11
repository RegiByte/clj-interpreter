import { join } from 'node:path'

// Resolve packages/cljam/ root regardless of where tests are run from
const pkgRoot = join(import.meta.dir, '../../../..')

const input = '(def x 41)\n(+ x 1)\n(exit)\n'
const result = Bun.spawnSync(
  ['bun', 'run', 'src/bin/cli.ts', 'repl'],
  {
    cwd: pkgRoot,
    stdin: Buffer.from(input),
  }
)

process.stdout.write(new TextDecoder().decode(result.stdout))
process.stderr.write(new TextDecoder().decode(result.stderr))
process.exit(result.exitCode ?? 1)
