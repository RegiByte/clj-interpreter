import { describe, it, expect } from 'vitest'
import { resolveModuleOrder } from '../module'
import type { RuntimeModule } from '../module'
import { cljNumber, cljString } from '../factories'
import { createRuntime } from '../runtime'

// ---------------------------------------------------------------------------
// resolveModuleOrder tests
// ---------------------------------------------------------------------------

describe('resolveModuleOrder', () => {
  it('returns a single module with no deps as-is', () => {
    const a: RuntimeModule = { id: 'a', declareNs: [{ name: 'ns.a', vars: () => new Map() }] }
    const order = resolveModuleOrder([a])
    expect(order.map((m) => m.id)).toEqual(['a'])
  })

  it('orders A before B when B depends on A\'s namespace', () => {
    const a: RuntimeModule = { id: 'a', declareNs: [{ name: 'ns.a', vars: () => new Map() }] }
    const b: RuntimeModule = {
      id: 'b',
      dependsOn: ['ns.a'],
      declareNs: [{ name: 'ns.b', vars: () => new Map() }],
    }
    const order = resolveModuleOrder([b, a]) // intentionally reversed input
    expect(order.map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('orders three modules in dependency chain', () => {
    const a: RuntimeModule = { id: 'a', declareNs: [{ name: 'ns.a', vars: () => new Map() }] }
    const b: RuntimeModule = {
      id: 'b',
      dependsOn: ['ns.a'],
      declareNs: [{ name: 'ns.b', vars: () => new Map() }],
    }
    const c: RuntimeModule = {
      id: 'c',
      dependsOn: ['ns.b'],
      declareNs: [{ name: 'ns.c', vars: () => new Map() }],
    }
    const order = resolveModuleOrder([c, a, b])
    expect(order.map((m) => m.id)).toEqual(['a', 'b', 'c'])
  })

  it('places C after both A and B when both contribute to the same namespace', () => {
    // A and B both extend 'shared.ns'; C depends on 'shared.ns'
    // C must come after both A and B
    const a: RuntimeModule = {
      id: 'a',
      declareNs: [{ name: 'shared.ns', vars: () => new Map() }],
    }
    const b: RuntimeModule = {
      id: 'b',
      declareNs: [{ name: 'shared.ns', vars: () => new Map() }],
    }
    const c: RuntimeModule = {
      id: 'c',
      dependsOn: ['shared.ns'],
      declareNs: [{ name: 'ns.c', vars: () => new Map() }],
    }
    const order = resolveModuleOrder([c, a, b])
    const ids = order.map((m) => m.id)
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('c'))
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('c'))
  })

  it('handles self-extension without creating a self-loop', () => {
    // A contributes to 'shared.ns' and also depends on 'shared.ns' (because
    // another module B also contributes to it and A needs B to go first)
    const b: RuntimeModule = {
      id: 'b',
      declareNs: [{ name: 'shared.ns', vars: () => new Map() }],
    }
    const a: RuntimeModule = {
      id: 'a',
      dependsOn: ['shared.ns'],
      declareNs: [{ name: 'shared.ns', vars: () => new Map() }],
    }
    // A depends on providers of 'shared.ns' (= B), but excludes itself.
    // So: B before A. No cycle.
    const order = resolveModuleOrder([a, b])
    const ids = order.map((m) => m.id)
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('a'))
  })

  it('works when module has no dependsOn field', () => {
    const a: RuntimeModule = { id: 'a', declareNs: [{ name: 'ns.a', vars: () => new Map() }] }
    expect(() => resolveModuleOrder([a])).not.toThrow()
  })

  it('works when module has empty dependsOn array', () => {
    const a: RuntimeModule = { id: 'a', dependsOn: [], declareNs: [{ name: 'ns.a', vars: () => new Map() }] }
    expect(() => resolveModuleOrder([a])).not.toThrow()
  })

  it('throws on duplicate module IDs', () => {
    const a: RuntimeModule = { id: 'a', declareNs: [{ name: 'ns.a', vars: () => new Map() }] }
    const a2: RuntimeModule = { id: 'a', declareNs: [{ name: 'ns.b', vars: () => new Map() }] }
    expect(() => resolveModuleOrder([a, a2])).toThrow("Duplicate module ID: 'a'")
  })

  it('throws when a dependency namespace has no providers', () => {
    const a: RuntimeModule = {
      id: 'a',
      dependsOn: ['ns.missing'],
      declareNs: [{ name: 'ns.a', vars: () => new Map() }],
    }
    expect(() => resolveModuleOrder([a])).toThrow(
      "No module provides namespace 'ns.missing' (required by 'a')"
    )
  })

  it('throws on circular dependency', () => {
    // A depends on ns.b (provided by B), B depends on ns.a (provided by A)
    const a: RuntimeModule = {
      id: 'a',
      dependsOn: ['ns.b'],
      declareNs: [{ name: 'ns.a', vars: () => new Map() }],
    }
    const b: RuntimeModule = {
      id: 'b',
      dependsOn: ['ns.a'],
      declareNs: [{ name: 'ns.b', vars: () => new Map() }],
    }
    expect(() => resolveModuleOrder([a, b])).toThrow('Circular dependency detected')
  })
})

// ---------------------------------------------------------------------------
// runtime.installModules tests
// ---------------------------------------------------------------------------

describe('runtime.installModules', () => {
  it('installs vars from a module into the correct namespace', () => {
    const runtime = createRuntime()
    const mod: RuntimeModule = {
      id: 'test/mod',
      dependsOn: ['clojure.core'],
      declareNs: [
        {
          name: 'clojure.core',
          vars: () =>
            new Map([['test-var', { value: cljNumber(42) }]]),
        },
      ],
    }
    runtime.installModules([mod])
    const ns = runtime.getNs('clojure.core')!
    const v = ns.vars.get('test-var')
    expect(v).toBeDefined()
    expect(v!.value).toMatchObject(cljNumber(42))
    expect(v!.kind).toBe('var')
    expect(v!.ns).toBe('clojure.core')
    expect(v!.name).toBe('test-var')
  })

  it('installs vars into a new namespace', () => {
    const runtime = createRuntime()
    const mod: RuntimeModule = {
      id: 'test/new-ns',
      declareNs: [
        {
          name: 'my.new.ns',
          vars: () => new Map([['greet', { value: cljString('hello') }]]),
        },
      ],
    }
    runtime.installModules([mod])
    const ns = runtime.getNs('my.new.ns')
    expect(ns).not.toBeNull()
    expect(ns!.vars.get('greet')).toBeDefined()
    expect(ns!.vars.get('greet')!.value).toMatchObject(cljString('hello'))
  })

  it('installs dynamic var with dynamic flag set', () => {
    const runtime = createRuntime()
    const mod: RuntimeModule = {
      id: 'test/dynamic',
      declareNs: [
        {
          name: 'my.ns',
          vars: () =>
            new Map([['*my-dynamic*', { value: cljNumber(0), dynamic: true }]]),
        },
      ],
    }
    runtime.installModules([mod])
    const v = runtime.getNs('my.ns')!.vars.get('*my-dynamic*')!
    expect(v.dynamic).toBe(true)
  })

  it('installs multiple modules in dependency order', () => {
    const installed: string[] = []
    const runtime = createRuntime()

    const a: RuntimeModule = {
      id: 'test/a',
      declareNs: [
        {
          name: 'ns.a',
          vars: () => {
            installed.push('a')
            return new Map([['x', { value: cljNumber(1) }]])
          },
        },
      ],
    }
    const b: RuntimeModule = {
      id: 'test/b',
      dependsOn: ['ns.a'],
      declareNs: [
        {
          name: 'ns.b',
          vars: () => {
            installed.push('b')
            return new Map([['y', { value: cljNumber(2) }]])
          },
        },
      ],
    }
    runtime.installModules([b, a]) // reversed input
    expect(installed).toEqual(['a', 'b'])
  })

  it('provides ModuleContext with access to already-installed vars', () => {
    const runtime = createRuntime()
    let seenCtx: ReturnType<Parameters<typeof runtime.installModules>[0][0]['declareNs'][0]['vars']> | null = null

    const mod: RuntimeModule = {
      id: 'test/ctx',
      dependsOn: ['clojure.core'],
      declareNs: [
        {
          name: 'my.ns',
          vars: (ctx) => {
            // Should be able to read existing clojure.core vars
            const plusVar = ctx.getVar('clojure.core', '+')
            expect(plusVar).not.toBeNull()
            expect(plusVar!.kind).toBe('var')
            seenCtx = new Map()
            return seenCtx
          },
        },
      ],
    }
    runtime.installModules([mod])
    expect(seenCtx).not.toBeNull()
  })

  it('throws on var collision between two modules', () => {
    const runtime = createRuntime()
    const a: RuntimeModule = {
      id: 'test/a',
      declareNs: [
        { name: 'shared.ns', vars: () => new Map([['clash', { value: cljNumber(1) }]]) },
      ],
    }
    const b: RuntimeModule = {
      id: 'test/b',
      declareNs: [
        { name: 'shared.ns', vars: () => new Map([['clash', { value: cljNumber(2) }]]) },
      ],
    }
    // Install a first
    runtime.installModules([a])
    // Installing b should throw because 'shared.ns/clash' is already claimed by 'test/a'
    expect(() => runtime.installModules([b])).toThrow(
      "var 'clash' in 'shared.ns' already declared by module 'test/a'"
    )
  })

  it('does not throw when two modules add different vars to the same namespace', () => {
    const runtime = createRuntime()
    const a: RuntimeModule = {
      id: 'test/a',
      declareNs: [{ name: 'shared.ns', vars: () => new Map([['x', { value: cljNumber(1) }]]) }],
    }
    const b: RuntimeModule = {
      id: 'test/b',
      declareNs: [{ name: 'shared.ns', vars: () => new Map([['y', { value: cljNumber(2) }]]) }],
    }
    expect(() => runtime.installModules([a, b])).not.toThrow()
    const ns = runtime.getNs('shared.ns')!
    expect(ns.vars.get('x')!.value).toMatchObject(cljNumber(1))
    expect(ns.vars.get('y')!.value).toMatchObject(cljNumber(2))
  })
})
