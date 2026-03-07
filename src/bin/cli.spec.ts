import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
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
    const fixturePath = join(
      process.cwd(),
      'src/bin/__fixtures__/smoke/app/main.clj'
    )
    const { io, lines, errors } = makeIo()

    const exitCode = runFile(fixturePath, io)

    expect(exitCode).toBe(0)
    expect(lines).toContain('5')
    expect(errors).toEqual([])
  })

  it('prints usage when run is missing a file path', async () => {
    const { io, lines } = makeIo()

    const exitCode = await runCli(['run'], io)

    expect(exitCode).toBe(1)
    expect(lines).toEqual([
      'Usage:',
      '  conjure repl',
      '  conjure run <file.clj>',
      '  conjure nrepl-server [--port <number>] [--host <string>]',
    ])
  })

  it('returns an error for missing files', () => {
    const { io, errors } = makeIo()

    const exitCode = runFile('missing-file.clj', io)

    expect(exitCode).toBe(1)
    expect(errors).toEqual(['File not found: missing-file.clj'])
  })

  it('runs the repl command from streamed stdin and exits cleanly', async () => {
    const fixturePath = join(
      process.cwd(),
      'src/bin/__fixtures__/smoke/repl-smoke.ts'
    )
    const { spawnSync } = await import('node:child_process')

    const result = spawnSync(
      'bun',
      ['run', fixturePath],
      { cwd: process.cwd(), encoding: 'utf8' }
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('Conjure REPL')
    expect(result.stdout).toContain('42')
    expect(result.stderr).toBe('')
  })
})
