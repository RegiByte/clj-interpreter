import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(__dirname, '../..')
import { runCli, runFile } from './cli'

function makeIo() {
  const lines: string[] = []
  const errors: string[] = []

  return {
    io: {
      writeLine: (text: string) => lines.push(text),
      writeError: (text: string) => errors.push(text),
    },
    lines,
    errors,
  }
}

describe('bun cli', () => {
  it('runs a script file and resolves sibling namespaces', () => {
    const fixturePath = join(__dirname, '__fixtures__/smoke/app/main.clj')
    const { io, lines, errors } = makeIo()

    const exitCode = runFile(fixturePath, io)

    expect(exitCode).toBe(0)
    expect(lines).toContain('5\n')
    expect(errors).toEqual([])
  })

  it('prints usage when run is missing a file path', async () => {
    const { io, lines } = makeIo()

    const exitCode = await runCli(['run'], io)

    expect(exitCode).toBe(1)
    expect(lines).toEqual([
      'Usage:',
      '  cljam repl',
      '  cljam run <file.clj>',
      '  cljam nrepl-server [--port <number>] [--host <string>] [--root-dir <path>]',
    ])
  })

  it('returns an error for missing files', () => {
    const { io, errors } = makeIo()

    const exitCode = runFile('missing-file.clj', io)

    expect(exitCode).toBe(1)
    expect(errors).toEqual(['File not found: missing-file.clj'])
  })

  it('runs the repl command from streamed stdin and exits cleanly', async () => {
    const fixturePath = join(__dirname, '__fixtures__/smoke/repl-smoke.ts')
    const { spawnSync } = await import('node:child_process')

    const result = spawnSync(
      'bun',
      ['run', fixturePath],
      { cwd: pkgRoot, encoding: 'utf8' }
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Conjure')
    expect(result.stdout).toContain('42')
    expect(result.stderr).toBe('')
  })
})
