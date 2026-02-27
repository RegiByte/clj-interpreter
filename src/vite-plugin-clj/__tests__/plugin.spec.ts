import { resolve } from 'node:path'
import { describe, expect, it, beforeEach } from 'vitest'
import { cljPlugin, safeJsIdentifier, generateModuleCode } from '../index'
import type { CodegenContext } from '../codegen'
import type { Plugin, ResolvedConfig } from 'vite'
import macrosSource from '../../clojure/macros.clj?raw'
import { createSession } from '../../core/session'

const projectRoot = resolve(__dirname, '../../..')

function makePlugin(sourceRoots?: string[]) {
  const plugin = cljPlugin({ sourceRoots }) as Plugin & Record<string, any>
  plugin.configResolved({
    root: projectRoot,
  } as ResolvedConfig)
  return plugin
}

function makeCodegenCtx(overrides?: Partial<CodegenContext>): CodegenContext {
  return {
    session: createSession({ entries: [macrosSource] }),
    sourceRoots: ['src'],
    coreIndexPath: '/project/src/core/index.ts',
    virtualSessionId: 'virtual:clj-session',
    resolveDepPath: () => null,
    ...overrides,
  }
}

describe('safeJsIdentifier', () => {
  it('replaces hyphens with underscores', () => {
    expect(safeJsIdentifier('my-fn')).toBe('my_fn')
  })

  it('replaces ? with _QMARK_', () => {
    expect(safeJsIdentifier('nil?')).toBe('nil_QMARK_')
  })

  it('replaces ! with _BANG_', () => {
    expect(safeJsIdentifier('swap!')).toBe('swap_BANG_')
  })

  it('replaces * with _STAR_', () => {
    expect(safeJsIdentifier('*out*')).toBe('_STAR_out_STAR_')
  })

  it('replaces > and < and =', () => {
    expect(safeJsIdentifier('>=')).toBe('_GT__EQ_')
    expect(safeJsIdentifier('<=')).toBe('_LT__EQ_')
  })

  it('handles combined transformations', () => {
    expect(safeJsIdentifier('my-fn?')).toBe('my_fn_QMARK_')
  })

  it('leaves simple names unchanged', () => {
    expect(safeJsIdentifier('helper')).toBe('helper')
  })
})

describe('cljPlugin', () => {
  let plugin: Plugin & Record<string, any>

  beforeEach(() => {
    plugin = makePlugin(['src/clojure'])
  })

  describe('resolveId', () => {
    it('resolves virtual:clj-session to the resolved ID', () => {
      const result = plugin.resolveId('virtual:clj-session', undefined, {
        attributes: {},
        isEntry: false,
      })
      expect(result).toBe('\0virtual:clj-session')
    })

    it('returns undefined for non-clj imports', () => {
      const result = plugin.resolveId('./utils.ts', undefined, {
        attributes: {},
        isEntry: false,
      })
      expect(result).toBeUndefined()
    })

    it('returns null for .clj imports (let Vite resolve the path)', () => {
      const result = plugin.resolveId('./utils.clj', undefined, {
        attributes: {},
        isEntry: false,
      })
      expect(result).toBeNull()
    })

    it('returns undefined for .clj?raw imports (let Vite handle)', () => {
      const result = plugin.resolveId('./utils.clj?raw', undefined, {
        attributes: {},
        isEntry: false,
      })
      expect(result).toBeUndefined()
    })
  })

  describe('load virtual session module', () => {
    it('generates session module code for virtual:clj-session', () => {
      const code = plugin.load('\0virtual:clj-session', {})
      expect(code).toContain('import { createSession }')
      expect(code).toContain('import macrosSource from')
      expect(code).toContain('export function getSession()')
      expect(code).toContain('createSession({ entries: [macrosSource] })')
    })

    it('returns undefined for non-clj files', () => {
      expect(plugin.load('some-file.ts', {})).toBeUndefined()
    })

    it('returns undefined for .clj?raw files', () => {
      expect(plugin.load('some-file.clj?raw', {})).toBeUndefined()
    })
  })
})

describe('generateModuleCode', () => {
  it('generates function exports with late-binding wrappers', () => {
    const ctx = makeCodegenCtx()
    const source = '(ns test.gen)\n(defn helper [x] (+ x 1))'
    const code = generateModuleCode(ctx, 'test.gen', source)

    expect(code).toContain('export function helper(...args)')
    expect(code).toContain('__ns.bindings.get("helper")')
    expect(code).toContain('args.map(jsToClj)')
    expect(code).toContain('applyFunction(fn, cljArgs)')
    expect(code).toContain('cljToJs(result)')
  })

  it('generates const exports for non-function values', () => {
    const ctx = makeCodegenCtx()
    const source = '(ns test.vals)\n(def greeting "hello")\n(def my-count 42)'
    const code = generateModuleCode(ctx, 'test.vals', source)

    expect(code).toContain(
      'export const greeting = cljToJs(__ns.bindings.get("greeting"))'
    )
    expect(code).toContain(
      'export const my_count = cljToJs(__ns.bindings.get("my-count"))'
    )
  })

  it('excludes macros from exports', () => {
    const ctx = makeCodegenCtx()
    const source =
      '(ns test.macros)\n(defmacro my-when [test & body] `(if ~test (do ~@body) nil))\n(def x 1)'
    const code = generateModuleCode(ctx, 'test.macros', source)

    expect(code).not.toContain('my_when')
    expect(code).toContain('export const x')
  })

  it('generates dependency imports for require clauses', () => {
    const depPath = '/project/src/dep.clj'
    const ctx = makeCodegenCtx({
      resolveDepPath: (depNs) => (depNs === 'dep' ? depPath : null),
    })

    ctx.session.loadFile('(ns dep)\n(def y 99)')

    const source = '(ns test.deps (:require [dep :as d]))\n(def x d/y)'
    const code = generateModuleCode(ctx, 'test.deps', source)

    expect(code).toContain(`import "${depPath}"`)
  })

  it('transforms Clojure identifiers to safe JS identifiers', () => {
    const ctx = makeCodegenCtx()
    const source =
      '(ns test.names)\n(defn my-fn [x] x)\n(def is-valid? true)'
    const code = generateModuleCode(ctx, 'test.names', source)

    expect(code).toContain('export function my_fn(')
    expect(code).toContain('export const is_valid_QMARK_')
  })

  it('imports from virtual session module', () => {
    const ctx = makeCodegenCtx()
    const source = '(ns test.imports)\n(def x 1)'
    const code = generateModuleCode(ctx, 'test.imports', source)

    expect(code).toContain('import { getSession } from')
    expect(code).toContain('virtual:clj-session')
  })

  it('imports conversion utilities from core index', () => {
    const ctx = makeCodegenCtx()
    const source = '(ns test.core)\n(def x 1)'
    const code = generateModuleCode(ctx, 'test.core', source)

    expect(code).toContain(
      'import { cljToJs, jsToClj, applyFunction } from "/project/src/core/index.ts"'
    )
  })

  it('embeds source as JSON-escaped string for loadFile call', () => {
    const ctx = makeCodegenCtx()
    const source = '(ns test.embed)\n(def msg "hello\\nworld")'
    const code = generateModuleCode(ctx, 'test.embed', source)

    expect(code).toContain('__session.loadFile(')
    expect(code).toContain('"test.embed"')
  })

  it('uses ns name from source over path-derived name', () => {
    const ctx = makeCodegenCtx()
    const source = '(ns actual.name)\n(def x 1)'
    const code = generateModuleCode(ctx, 'path.derived', source)

    expect(code).toContain('"actual.name"')
    expect(code).not.toContain('"path.derived"')
  })

  it('falls back to path-derived name when no ns form', () => {
    const ctx = makeCodegenCtx()
    const source = '(def x 1)'
    const code = generateModuleCode(ctx, 'fallback.name', source)

    expect(code).toContain('"fallback.name"')
  })

  it('skips dependency imports when resolveDepPath returns null', () => {
    const ctx = makeCodegenCtx({
      resolveDepPath: () => null,
    })
    ctx.session.loadFile('(ns dep)\n(def y 99)')
    const source = '(ns test.nodep (:require [dep :as d]))\n(def x d/y)'
    const code = generateModuleCode(ctx, 'test.nodep', source)

    expect(code).not.toContain('import "')
  })
})
