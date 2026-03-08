import { resolve } from 'node:path'
import { describe, expect, it, beforeEach } from 'vitest'
import { cljPlugin, safeJsIdentifier, generateModuleCode, generateDts } from '../index'
import type { CodegenContext } from '../codegen'
import type { Plugin, ResolvedConfig } from 'vite'
import { createSession } from '../../core/session'

const projectRoot = resolve(__dirname, '../../..')

type HookLike<T extends (this: any, ...args: any[]) => any> = T | { handler: T }

function getHookHandler<T extends (this: any, ...args: any[]) => any>(
  hook: HookLike<T> | undefined,
  name: string
): OmitThisParameter<T> {
  if (!hook) {
    throw new Error(`Missing plugin hook: ${name}`)
  }
  return (typeof hook === 'function' ? hook : hook.handler) as OmitThisParameter<T>
}

function makePlugin(sourceRoots?: string[]) {
  const plugin = cljPlugin({ sourceRoots }) as Plugin & Record<string, unknown>
  const configResolved = getHookHandler(plugin.configResolved, 'configResolved')
  configResolved({
    root: projectRoot,
  } as ResolvedConfig)
  return plugin
}

function makeCodegenCtx(overrides?: Partial<CodegenContext>): CodegenContext {
  return {
    session: createSession(),
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

  it('replaces / with _DIV_', () => {
    expect(safeJsIdentifier('/')).toBe('_DIV_')
  })

  it('leaves simple names unchanged', () => {
    expect(safeJsIdentifier('helper')).toBe('helper')
  })

  it('replaces dot with _DOT_', () => {
    expect(safeJsIdentifier('.indexOf')).toBe('_DOT_indexOf')
  })

  it('encodes standalone - (subtraction fn) as _MINUS_', () => {
    expect(safeJsIdentifier('-')).toBe('_MINUS_')
  })

  it('keeps - as _ when used as a kebab-case word separator', () => {
    expect(safeJsIdentifier('not-found')).toBe('not_found')
    expect(safeJsIdentifier('not-found-bro')).toBe('not_found_bro')
    expect(safeJsIdentifier('take-while')).toBe('take_while')
  })

  it('prefixes JS reserved word throw with $', () => {
    expect(safeJsIdentifier('throw')).toBe('$throw')
  })

  it('prefixes other JS reserved words with $', () => {
    expect(safeJsIdentifier('catch')).toBe('$catch')
    expect(safeJsIdentifier('finally')).toBe('$finally')
    expect(safeJsIdentifier('try')).toBe('$try')
    expect(safeJsIdentifier('delete')).toBe('$delete')
  })

  it('does not prefix non-reserved words that happen to be similar', () => {
    expect(safeJsIdentifier('throwable')).toBe('throwable')
    expect(safeJsIdentifier('retry')).toBe('retry')
  })
})

describe('cljPlugin', () => {
  let plugin: Plugin & Record<string, unknown>

  beforeEach(() => {
    plugin = makePlugin(['src/clojure'])
  })

  describe('resolveId', () => {
    it('resolves virtual:clj-session to the resolved ID', () => {
      const resolveId = getHookHandler(plugin.resolveId, 'resolveId')
      const result = resolveId('virtual:clj-session', undefined, {
        attributes: {},
        isEntry: false,
      })
      expect(result).toBe('\0virtual:clj-session')
    })

    it('returns undefined for non-clj imports', () => {
      const resolveId = getHookHandler(plugin.resolveId, 'resolveId')
      const result = resolveId('./utils.ts', undefined, {
        attributes: {},
        isEntry: false,
      })
      expect(result).toBeUndefined()
    })

    it('returns null for .clj imports (let Vite resolve the path)', () => {
      const resolveId = getHookHandler(plugin.resolveId, 'resolveId')
      const result = resolveId('./utils.clj', undefined, {
        attributes: {},
        isEntry: false,
      })
      expect(result).toBeNull()
    })

    it('returns undefined for .clj?raw imports (let Vite handle)', () => {
      const resolveId = getHookHandler(plugin.resolveId, 'resolveId')
      const result = resolveId('./utils.clj?raw', undefined, {
        attributes: {},
        isEntry: false,
      })
      expect(result).toBeUndefined()
    })
  })

  describe('load virtual session module', () => {
    it('generates session module code for virtual:clj-session', () => {
      const load = getHookHandler(plugin.load, 'load')
      const code = load('\0virtual:clj-session', {})
      expect(code).toContain('import { createSession }')
      expect(code).toContain('export function getSession()')
      expect(code).toContain('createSession()')
    })

    it('returns undefined for non-clj files', () => {
      const load = getHookHandler(plugin.load, 'load')
      expect(load('some-file.ts', {})).toBeUndefined()
    })

    it('returns undefined for .clj?raw files', () => {
      const load = getHookHandler(plugin.load, 'load')
      expect(load('some-file.clj?raw', {})).toBeUndefined()
    })
  })
})

describe('generateModuleCode', () => {
  it('generates function exports with late-binding wrappers', () => {
    const ctx = makeCodegenCtx()
    const source = '(ns test.gen)\n(defn helper [x] (+ x 1))'
    const code = generateModuleCode(ctx, 'test.gen', source)

    expect(code).toContain('export function helper(...args)')
    expect(code).toContain('__ns.vars.get("helper")')
    expect(code).toContain('args.map(jsToClj)')
    expect(code).toContain('applyFunction(fn, cljArgs)')
    expect(code).toContain('cljToJs(result)')
  })

  it('generates const exports for non-function values', () => {
    const ctx = makeCodegenCtx()
    const source = '(ns test.vals)\n(def greeting "hello")\n(def my-count 42)'
    const code = generateModuleCode(ctx, 'test.vals', source)

    expect(code).toContain('export const greeting = cljToJs(')
    expect(code).toContain('"greeting"')
    expect(code).toContain('export const my_count = cljToJs(')
    expect(code).toContain('"my-count"')
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

describe('generateDts', () => {
  it('emits typed function declaration with real param names', () => {
    const ctx = makeCodegenCtx()
    const source = '(ns test.dts.fns)\n(defn add [a b] (+ a b))'
    const dts = generateDts(ctx, 'test.dts.fns', source)

    expect(dts).toContain('export function add(a: unknown, b: unknown): unknown;')
  })

  it('emits multiple overload signatures for multi-arity functions', () => {
    const ctx = makeCodegenCtx()
    const source = [
      '(ns test.dts.multi)',
      '(defn greet',
      '  ([name] name)',
      '  ([greeting name] (str greeting name)))',
    ].join('\n')
    const dts = generateDts(ctx, 'test.dts.multi', source)

    expect(dts).toContain('export function greet(name: unknown): unknown;')
    expect(dts).toContain(
      'export function greet(greeting: unknown, name: unknown): unknown;'
    )
  })

  it('emits variadic signature when function has a rest param', () => {
    const ctx = makeCodegenCtx()
    const source = '(ns test.dts.variadic)\n(defn log [level & args] args)'
    const dts = generateDts(ctx, 'test.dts.variadic', source)

    expect(dts).toContain(
      'export function log(level: unknown, ...args: unknown[]): unknown;'
    )
  })

  it('emits zero-param variadic signature for rest-only functions', () => {
    const ctx = makeCodegenCtx()
    const source = '(ns test.dts.restonly)\n(defn sum [& nums] nums)'
    const dts = generateDts(ctx, 'test.dts.restonly', source)

    expect(dts).toContain('export function sum(...nums: unknown[]): unknown;')
  })

  it('emits typed const for primitive values', () => {
    const ctx = makeCodegenCtx()
    const source = [
      '(ns test.dts.prims)',
      '(def greeting "hello")',
      '(def answer 42)',
      '(def active? true)',
    ].join('\n')
    const dts = generateDts(ctx, 'test.dts.prims', source)

    expect(dts).toContain('export const greeting: string;')
    expect(dts).toContain('export const answer: number;')
    expect(dts).toContain('export const active_QMARK_: boolean;')
  })

  it('emits unknown[] for vector and list values', () => {
    const ctx = makeCodegenCtx()
    const source = '(ns test.dts.colls)\n(def items [1 2 3])'
    const dts = generateDts(ctx, 'test.dts.colls', source)

    expect(dts).toContain('export const items: unknown[];')
  })

  it('emits Record<string, unknown> for map values', () => {
    const ctx = makeCodegenCtx()
    const source = '(ns test.dts.maps)\n(def config {:host "localhost" :port 3000})'
    const dts = generateDts(ctx, 'test.dts.maps', source)

    expect(dts).toContain('export const config: Record<string, unknown>;')
  })

  it('excludes macros from declarations', () => {
    const ctx = makeCodegenCtx()
    const source =
      '(ns test.dts.macros)\n(defmacro my-when [test & body] `(if ~test (do ~@body) nil))\n(def x 1)'
    const dts = generateDts(ctx, 'test.dts.macros', source)

    expect(dts).not.toContain('my_when')
    expect(dts).toContain('export const x: number;')
  })

  it('applies safeJsIdentifier to param names', () => {
    const ctx = makeCodegenCtx()
    const source = '(ns test.dts.paramnames)\n(defn transform [input-val output-fn?] input-val)'
    const dts = generateDts(ctx, 'test.dts.paramnames', source)

    expect(dts).toContain(
      'export function transform(input_val: unknown, output_fn_QMARK_: unknown): unknown;'
    )
  })

  it('returns empty string when namespace fails to load', () => {
    const ctx = makeCodegenCtx()
    const dts = generateDts(ctx, 'nonexistent.ns', '(invalid clojure source !!!)')

    expect(dts).toBe('')
  })
})
