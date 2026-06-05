import { describe, expect, it } from 'vitest'
import { generateModuleCode } from '../codegen'
import type { CodegenContext } from '../codegen'
import {
  extractNsName,
  extractNsRequires,
  extractStringRequires,
} from '../namespace-utils'
import { parseDescriptor } from '../../core/loader/ns-descriptor'

// ---------------------------------------------------------------------------
// S0 — Vite graph-aware tripwires (see .regibyte/NAMESPACE_LOADER_PLAN.md §S7).
//
// The Vite codegen must agree with the runtime loader on namespace-graph
// semantics: if any namespace in a file's transitive closure imports a host
// module, the generated browser module must use top-level await + loadFileAsync.
// Today the sync-vs-async decision looks ONLY at the current file's own string
// requires (codegen.ts), so a purely-transitive host dependency is missed.
//
// Honest breakdown after auditing the real code:
//   V1 — RED   : per-module load-call is not graph-aware (the genuine gap).
//   V2 — GUARD : __importMap already includes transitive hosts (global file
//                scan in index.ts scanStringRequires); lock it so S7 does not
//                regress the map to a per-graph subset.
//   V3 — SKIP  : equivalence with the shared core descriptor parser
//                (core/loader/ns-descriptor.ts) cannot be a compiling test until
//                that module exists in S1. Flip to `it` then.
// ---------------------------------------------------------------------------

const RED = 'RED until S7'
const GUARD = 'GUARD — must stay green'

/**
 * S7 codegen seam (test-only). The graph-aware analyzer will need to read a
 * dependency's source to discover transitive host imports. Declaring it here as
 * an optional extension keeps S0 purely additive — codegen ignores it today, so
 * these tests are genuinely red until S7 wires the transitive scan through it.
 */
interface S7CodegenContext extends CodegenContext {
  readDepSource?: (depNs: string) => string | null
}

function makeCtx(overrides?: Partial<S7CodegenContext>): S7CodegenContext {
  return {
    sourceRoots: ['src'],
    coreIndexPath: '/project/src/core/index.ts',
    virtualSessionId: 'virtual:clj-session',
    resolveDepPath: () => null,
    ...overrides,
  }
}

describe(`S7/V1 graph-aware load call [${RED}]`, () => {
  const depWithHost = '(ns dep (:require ["host-mod" :as h]))\n(def x 1)'

  it('emits await loadFileAsync when a transitive dep imports a host module', () => {
    // app has NO direct string require, but its dependency `dep` does.
    const ctx = makeCtx({
      resolveDepPath: (ns) => (ns === 'dep' ? '/project/src/dep.clj' : null),
      readDepSource: (ns) => (ns === 'dep' ? depWithHost : null),
    })
    const source = '(ns app (:require [dep :as d]))\n(def y d/x)'
    const code = generateModuleCode(ctx, 'app', source)

    expect(code).toContain('await __session.loadFileAsync(')
    expect(code).not.toContain('__session.loadFile(')
  })

  it(`pure transitive graph still emits sync loadFile [${GUARD}]`, () => {
    const depPure = '(ns dep)\n(def x 1)'
    const ctx = makeCtx({
      resolveDepPath: (ns) => (ns === 'dep' ? '/project/src/dep.clj' : null),
      readDepSource: (ns) => (ns === 'dep' ? depPure : null),
    })
    const source = '(ns app (:require [dep :as d]))\n(def y d/x)'
    const code = generateModuleCode(ctx, 'app', source)

    expect(code).toContain('__session.loadFile(')
    expect(code).not.toContain('loadFileAsync')
  })

  it(`direct host require still emits async [${GUARD}]`, () => {
    const ctx = makeCtx()
    const source = '(ns app (:require ["host-mod" :as h]))\n(def x 1)'
    const code = generateModuleCode(ctx, 'app', source)

    expect(code).toContain('await __session.loadFileAsync(')
  })
})

describe(`S7/V2 import map covers transitive hosts [${GUARD}]`, () => {
  // index.ts scanStringRequires walks every .clj file under the source roots and
  // aggregates each file's direct string requires into __importMap. So a host
  // module that is only a transitive dependency is still present in the map,
  // because the scanner visits its declaring file directly. This guard locks the
  // building block; S7 must not narrow the import map to a per-entry-graph subset
  // and drop transitively-required hosts.
  it('extractStringRequires surfaces the host module from the dep file', () => {
    const depSource = '(ns dep (:require ["host-mod" :as h]))\n(def x 1)'
    expect(extractStringRequires(depSource)).toEqual(['host-mod'])
  })
})

describe('S7/V3 Vite descriptor parser matches the shared core parser', () => {
  // G7: the Vite extractors and the shared core descriptor parser must agree on
  // namespace-graph semantics for the same source, so the bundler and runtime
  // never disagree. Both consume the same reader, so this locks equivalence.
  const source =
    '(ns app (:require [some.lib :as sl] [pure.ns :as-alias pn] ["react" :as React] ["react"]))\n(def x 1)'

  it('extractNsName agrees with parseDescriptor.nsName', () => {
    expect(extractNsName(source)).toBe(parseDescriptor(source).nsName)
  })

  it('extractNsRequires agrees with the descriptor clj requires + reader aliases', () => {
    // extractNsRequires returns every vector+symbol-head require name, which the
    // descriptor splits into loadable cljRequires and non-loading :as-alias
    // reader aliases. Their union is the same set.
    const d = parseDescriptor(source)
    const descriptorNsNames = [
      ...d.cljRequires.map((r) => r.nsName),
      ...d.readerAliases.map((r) => r.nsName),
    ]
    expect(extractNsRequires(source).sort()).toEqual(descriptorNsNames.sort())
  })

  it('extractStringRequires agrees with the descriptor host specifiers (deduped)', () => {
    const d = parseDescriptor(source)
    const descriptorHosts = [...new Set(d.hostRequires.map((h) => h.specifier))]
    expect(extractStringRequires(source).sort()).toEqual(descriptorHosts.sort())
  })
})
