import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { discoverSourceRoots, inferSourceRoot } from './nrepl-utils'

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'cljam-test-'))
}

describe('inferSourceRoot', () => {
  it('infers root from file path and ns declaration', () => {
    const source = '(ns demo.math)\n(def pi 3.14)'
    const filePath = '/project/src/clojure/demo/math.clj'
    expect(inferSourceRoot(filePath, source)).toBe('/project/src/clojure')
  })

  it('returns null when ns does not match path', () => {
    const source = '(ns other.thing)\n(def x 1)'
    const filePath = '/project/src/demo/math.clj'
    expect(inferSourceRoot(filePath, source)).toBeNull()
  })

  it('returns null when source has no ns form', () => {
    const source = '(def x 1)'
    const filePath = '/project/src/demo/math.clj'
    expect(inferSourceRoot(filePath, source)).toBeNull()
  })
})

describe('discoverSourceRoots', () => {
  let tempDir: string

  function cleanup() {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true })
  }

  it('reads sourceRoots from package.json cljam key', () => {
    tempDir = makeTempDir()
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        cljam: { sourceRoots: ['src/clojure', 'lib'] },
      })
    )

    const roots = discoverSourceRoots(tempDir)
    expect(roots).toEqual([
      resolve(tempDir, 'src/clojure'),
      resolve(tempDir, 'lib'),
    ])
    cleanup()
  })

  it('walks upward to find package.json', () => {
    tempDir = makeTempDir()
    const nested = join(tempDir, 'a', 'b', 'c')
    mkdirSync(nested, { recursive: true })
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'root-project',
        cljam: { sourceRoots: ['src'] },
      })
    )

    const roots = discoverSourceRoots(nested)
    expect(roots).toEqual([resolve(tempDir, 'src')])
    cleanup()
  })

  it('skips package.json without cljam key', () => {
    tempDir = makeTempDir()
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'no-cljam' })
    )

    const roots = discoverSourceRoots(tempDir)
    expect(roots).toEqual([tempDir])
    cleanup()
  })

  it('falls back to startDir when no package.json exists', () => {
    tempDir = makeTempDir()
    const nested = join(tempDir, 'empty')
    mkdirSync(nested, { recursive: true })

    // No package.json anywhere in tempDir — walk will hit filesystem root
    // and fall back. We test from nested to avoid accidentally finding
    // the project's own package.json.
    const roots = discoverSourceRoots(nested)
    // Should include at least the startDir as fallback
    expect(roots).toContain(nested)
    cleanup()
  })

  it('handles malformed package.json gracefully', () => {
    tempDir = makeTempDir()
    writeFileSync(join(tempDir, 'package.json'), '{ not valid json')

    const roots = discoverSourceRoots(tempDir)
    expect(roots).toEqual([tempDir])
    cleanup()
  })

  it('ignores empty sourceRoots array', () => {
    tempDir = makeTempDir()
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'empty-roots',
        cljam: { sourceRoots: [] },
      })
    )

    const roots = discoverSourceRoots(tempDir)
    expect(roots).toEqual([tempDir])
    cleanup()
  })
})
