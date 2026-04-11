import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, afterEach } from 'vitest'
import { printString } from '../core'
import { createCliSession } from './cli'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function makeSession() {
  const { io } = makeIo()
  return createCliSession([process.cwd()], io)
}

const tmpFiles: string[] = []

function tmpPath(name: string): string {
  const p = join(tmpdir(), `conjure-host-io-test-${name}`)
  tmpFiles.push(p)
  return p
}

afterEach(() => {
  for (const p of tmpFiles.splice(0)) {
    if (existsSync(p)) unlinkSync(p)
  }
})

// ---------------------------------------------------------------------------
// slurp
// ---------------------------------------------------------------------------

describe('slurp', () => {
  it('reads a file and returns its content as a string', () => {
    const path = tmpPath('slurp-basic.txt')
    writeFileSync(path, 'hello world', 'utf8')

    const session = makeSession()
    const result = session.evaluate(`(slurp "${path}")`)
    expect(printString(result)).toBe('"hello world"')
  })

  it('returns an empty string for an empty file', () => {
    const path = tmpPath('slurp-empty.txt')
    writeFileSync(path, '', 'utf8')

    const session = makeSession()
    const result = session.evaluate(`(slurp "${path}")`)
    expect(printString(result)).toBe('""')
  })

  it('throws a descriptive error for a missing file', () => {
    const session = makeSession()
    expect(() =>
      session.evaluate('(slurp "/tmp/conjure-no-such-file-xyz.txt")')
    ).toThrow('slurp: file not found')
  })
})

// ---------------------------------------------------------------------------
// spit
// ---------------------------------------------------------------------------

describe('spit', () => {
  it('writes a string to a file and returns nil', () => {
    const path = tmpPath('spit-basic.txt')

    const session = makeSession()
    const result = session.evaluate(`(spit "${path}" "written content")`)
    expect(printString(result)).toBe('nil')
    expect(readFileSync(path, 'utf8')).toBe('written content')
  })

  it('overwrites an existing file', () => {
    const path = tmpPath('spit-overwrite.txt')
    writeFileSync(path, 'old content', 'utf8')

    const session = makeSession()
    session.evaluate(`(spit "${path}" "new content")`)
    expect(readFileSync(path, 'utf8')).toBe('new content')
  })

  it('writes a number as its string representation', () => {
    const path = tmpPath('spit-number.txt')

    const session = makeSession()
    session.evaluate(`(spit "${path}" 42)`)
    expect(readFileSync(path, 'utf8')).toBe('42')
  })
})

// ---------------------------------------------------------------------------
// slurp + spit round-trip
// ---------------------------------------------------------------------------

describe('slurp/spit round-trip', () => {
  it('spits then slurps and recovers the original content', () => {
    const path = tmpPath('round-trip.txt')

    const session = makeSession()
    session.evaluate(`(spit "${path}" "round trip value")`)
    const result = session.evaluate(`(slurp "${path}")`)
    expect(printString(result)).toBe('"round trip value"')
  })

  it('can spit and slurp multiline content', () => {
    const path = tmpPath('round-trip-multiline.txt')
    const content = 'line one\\nline two\\nline three'

    const session = makeSession()
    session.evaluate(`(spit "${path}" "${content}")`)
    const result = session.evaluate(`(slurp "${path}")`)
    expect(printString(result)).toBe(`"${content}"`)
  })
})

// ---------------------------------------------------------------------------
// load
// ---------------------------------------------------------------------------

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__/smoke')

describe('load', () => {
  it('evaluates a .clj file and switches the current namespace', () => {
    const fixturePath = join(fixtureDir, 'app/lib.clj')
    const session = makeSession()

    expect(session.currentNs).toBe('user')
    session.evaluate(`(load "${fixturePath}")`)
    expect(session.currentNs).toBe('app.lib')
  })

  it('makes defs from the loaded file available in the session', () => {
    const fixturePath = join(fixtureDir, 'app/lib.clj')
    const session = makeSession()

    session.evaluate(`(load "${fixturePath}")`)
    // app.lib defines (defn add [a b] (+ a b))
    const result = session.evaluate('(add 10 5)')
    expect(printString(result)).toBe('15')
  })

  it('loads a file that requires a sibling namespace', () => {
    const fixturePath = join(fixtureDir, 'app/main.clj')
    const session = makeSession()

    session.evaluate(`(load "${fixturePath}")`)
    expect(session.currentNs).toBe('app.main')
  })

  it('throws a descriptive error for a missing file', () => {
    const session = makeSession()
    expect(() =>
      session.evaluate('(load "/tmp/conjure-no-such-file.clj")')
    ).toThrow('load: file not found')
  })
})
