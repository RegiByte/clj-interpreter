import { describe, expect, it } from 'vitest'
import { createSession } from '../session'
import { EvaluationError } from '../errors'
import type { CljPending } from '../types'

// ---------------------------------------------------------------------------
// S0 — Namespace loader/linker tripwire tests.
//
// These tests pin down the TARGET contract of the Phase 1.75 loader/linker
// (see .regibyte/NAMESPACE_LOADER_PLAN.md). Most of them are RED on purpose:
// they assert behavior that S1–S7 will implement. They are isolated in this
// dedicated file so the expected-red set is greppable and does not pollute the
// green suite. A few are GREEN guards — invariants the loader rebuild must not
// regress; those are labeled [GUARD].
//
// Target error-code taxonomy (extends existing namespace/access-denied,
// namespace/not-found):
//   namespace/multiple-ns-forms  — G1  : >1 ns form in a loaded file
//   namespace/requires-async     — G2  : sync loadFile on a host-touching graph
//   namespace/circular-dependency— G11 : cyclic require (data.cyclePath)
//   namespace/load-failed        — G12 : import / dep / body failure (carries cause)
//   namespace/ns-in-repl         — G14 : (ns ...) in evaluate/evaluateAsync
// ---------------------------------------------------------------------------

const RED = 'RED until loader lands'
const GUARD = 'GUARD — must stay green'

/** Capture a thrown EvaluationError so we can assert .code and .message. */
function captureSync(fn: () => unknown): EvaluationError | undefined {
  try {
    fn()
  } catch (e) {
    return e instanceof EvaluationError ? e : undefined
  }
  return undefined
}

async function captureAsync(
  fn: () => Promise<unknown>
): Promise<EvaluationError | undefined> {
  try {
    await fn()
  } catch (e) {
    return e instanceof EvaluationError ? e : undefined
  }
  return undefined
}

/** A session wired with importModule + a virtual filesystem for graph tests. */
function graphSession(files: Record<string, string>, modules: Record<string, unknown> = {}) {
  return createSession({
    importModule: (specifier: string) => {
      if (specifier in modules) return modules[specifier]
      throw new Error(`Unknown module: ${specifier}`)
    },
    sourceRoots: ['src'],
    readFile: (path: string) => {
      const content = files[path]
      if (content === undefined) throw new Error(`File not found: ${path}`)
      return content
    },
  })
}

// ---------------------------------------------------------------------------
// G1 — One namespace per file. More than one ns form is an error, never a
// silent misbinding. Today the second (ns ...) no-ops and its defs land in the
// first namespace (confirmed by probe).
// ---------------------------------------------------------------------------

describe(`G1 one-namespace-per-file [${RED}]`, () => {
  it('loadFile rejects more than one ns form', () => {
    const s = createSession()
    const err = captureSync(() =>
      s.loadFile('(ns alpha)\n(def a 1)\n(ns beta)\n(def b 2)')
    )
    expect(err).toBeDefined()
    expect(err!.code).toBe('namespace/multiple-ns-forms')
  })

  it('loadFileAsync rejects more than one ns form', async () => {
    const s = createSession()
    const err = await captureAsync(() =>
      s.loadFileAsync('(ns alpha)\n(def a 1)\n(ns beta)\n(def b 2)')
    )
    expect(err).toBeDefined()
    expect(err!.code).toBe('namespace/multiple-ns-forms')
  })

  it('single ns form loads normally [' + GUARD + ']', () => {
    const s = createSession()
    expect(() => s.loadFile('(ns solo)\n(def a 1)')).not.toThrow()
    expect(s.getNs('solo')?.vars.has('a')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// G2 — Transitive async correctness. app -> root -> dep -> ["host-mod"].
// The outer requires look sync by syntax, but the closure needs a host import.
// loadFileAsync must succeed; loadFile must fail clearly.
// ---------------------------------------------------------------------------

describe('G2 transitive async correctness', () => {
  const graph = {
    'src/app.clj': '(ns app (:require [root :as r]))\n(def out r/val)',
    'src/root.clj': '(ns root (:require [dep :as d]))\n(def val d/x)',
    'src/dep.clj': '(ns dep (:require ["host-mod" :as h]))\n(def x 42)',
  }

  it(`loadFileAsync loads the transitive host graph [${RED}]`, async () => {
    const s = graphSession(graph, { 'host-mod': { ok: true } })
    const ns = await s.loadFileAsync(graph['src/app.clj'], 'app', 'src/app.clj')
    expect(ns).toBe('app')
    expect(s.getNs('app')?.vars.get('out')?.value).toEqual({ kind: 'number', value: 42 })
  })

  it(`loadFile fails fast on a transitive host graph [${RED}]`, () => {
    const s = graphSession(graph, { 'host-mod': { ok: true } })
    const err = captureSync(() =>
      s.loadFile(graph['src/app.clj'], 'app', 'src/app.clj')
    )
    expect(err).toBeDefined()
    expect(err!.code).toBe('namespace/requires-async')
  })

  it(`pure transitive graph still loads synchronously [${GUARD}]`, () => {
    const pure = {
      'src/app.clj': '(ns app (:require [root :as r]))\n(def out r/val)',
      'src/root.clj': '(ns root (:require [dep :as d]))\n(def val d/x)',
      'src/dep.clj': '(ns dep)\n(def x 42)',
    }
    const s = graphSession(pure)
    expect(() => s.loadFile(pure['src/app.clj'], 'app', 'src/app.clj')).not.toThrow()
    expect(s.getNs('app')?.vars.get('out')?.value).toEqual({ kind: 'number', value: 42 })
  })

  it(`direct host require still loads via loadFileAsync [${GUARD}]`, async () => {
    const s = createSession({ importModule: () => ({ ok: true }) })
    await s.loadFileAsync('(ns d (:require ["host-mod" :as h]))\n(def x 1)', 'd')
    expect(s.getNs('d')?.vars.has('h')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// S7 — Unresolvable declared dependency is an error, never a silent skip.
// A clj require whose namespace has no locatable source is a genuine bug; the
// loader must surface it, not quietly continue. The runtime already does the
// right thing: resolveNamespace returns false (no source found), then
// applyRequireLink asserts residency and throws namespace/not-found. This GUARD
// locks that behavior so the S7 Vite-side fail-fast has a runtime counterpart
// it can mirror, and so a future refactor can't regress it into a silent skip.
// ---------------------------------------------------------------------------

describe(`S7 unresolvable declared dependency [${GUARD}]`, () => {
  const files = {
    'src/app.clj': '(ns app (:require [missing :as m]))\n(def x 1)',
  }

  it('loadFile throws namespace/not-found for an unresolvable clj require', () => {
    const s = graphSession(files)
    const err = captureSync(() =>
      s.loadFile(files['src/app.clj'], 'app', 'src/app.clj')
    )
    expect(err).toBeDefined()
    expect(err!.code).toBe('namespace/not-found')
    expect(err!.message).toMatch(/missing/)
  })

  it('loadFileAsync throws namespace/not-found for an unresolvable clj require', async () => {
    const s = graphSession(files)
    const err = await captureAsync(() =>
      s.loadFileAsync(files['src/app.clj'], 'app', 'src/app.clj')
    )
    expect(err).toBeDefined()
    expect(err!.code).toBe('namespace/not-found')
    expect(err!.message).toMatch(/missing/)
  })
})

// ---------------------------------------------------------------------------
// G11 — Cycles fail clearly with the cycle path. Today a cyclic require
// produces a confusing partial-load "symbol not found", because loadFile marks
// the namespace source-loaded before processing requires, so the back-edge is a
// silent no-op rather than a diagnosed cycle.
// ---------------------------------------------------------------------------

describe(`G11 circular dependency [${RED}]`, () => {
  const cycle = {
    'src/a.clj': '(ns a (:require [b :as b]))\n(def x 1)',
    'src/b.clj': '(ns b (:require [a :as a]))\n(def y 1)',
  }

  it('loadFileAsync throws a circular-dependency error with the path', async () => {
    const s = graphSession(cycle)
    const err = await captureAsync(() =>
      s.loadFileAsync(cycle['src/a.clj'], 'a', 'src/a.clj')
    )
    expect(err).toBeDefined()
    expect(err!.code).toBe('namespace/circular-dependency')
    expect(err!.message).toMatch(/a.*b.*a/)
  })

  it('loadFile throws a circular-dependency error too (does not hang)', () => {
    const s = graphSession(cycle)
    const err = captureSync(() =>
      s.loadFile(cycle['src/a.clj'], 'a', 'src/a.clj')
    )
    expect(err).toBeDefined()
    expect(err!.code).toBe('namespace/circular-dependency')
  })
})

// ---------------------------------------------------------------------------
// G12 — Failed loads have deterministic state. A rejected host import must not
// leave the namespace stuck as `loading`; the first and second attempts both
// fail with the same error, and the second must not hang (vitest would time out).
// ---------------------------------------------------------------------------

describe(`G12 failed-import state [${GUARD}]`, () => {
  const files = {
    'src/dep.clj': '(ns dep (:require ["bad-mod" :as h]))\n(def x 1)',
  }

  it('rejected importModule fails deterministically on repeated attempts', async () => {
    // The guarantee is deterministic rejection that never hangs (vitest would
    // time out on a stuck `loading` state) — not a specific error class.
    const importModule = (specifier: string) => {
      throw new Error(`boom: ${specifier}`)
    }
    const mk = () =>
      createSession({
        importModule,
        sourceRoots: ['src'],
        readFile: (p: string) => {
          const c = files[p as keyof typeof files]
          if (c === undefined) throw new Error(`nf ${p}`)
          return c
        },
      })

    await expect(
      mk().loadFileAsync(files['src/dep.clj'], 'dep', 'src/dep.clj')
    ).rejects.toThrow(/boom/)
    await expect(
      mk().loadFileAsync(files['src/dep.clj'], 'dep', 'src/dep.clj')
    ).rejects.toThrow(/boom/)
  })
})

// ---------------------------------------------------------------------------
// G13 — Top-level pending policy. The discriminator is DEREF, not "a pending
// exists". Producing/bubbling a pending in tail position is fine; a top-level
// @ (deref-as-await outside an (async ...) boundary) must fail. cljam already
// enforces this at the value level, so these are GUARDs the loader must keep.
// ---------------------------------------------------------------------------

describe(`G13 top-level pending policy [${GUARD}]`, () => {
  const mk = () => createSession({ importModule: () => ({}) })

  it('tail-position (async ...) is allowed — pending bubbles to host', async () => {
    const s = mk()
    await expect(s.loadFileAsync('(ns app)\n(async 1)', 'app')).resolves.toBe('app')
  })

  it('top-level def of a pending is allowed (binds the pending value)', async () => {
    const s = mk()
    await s.loadFileAsync('(ns app)\n(def x (async 1))', 'app')
    const x = s.getNs('app')?.vars.get('x')?.value as CljPending | undefined
    expect(x?.kind).toBe('pending')
  })

  it('top-level @ deref of a pending fails clearly', async () => {
    const s = mk()
    await expect(s.loadFileAsync('(ns app)\n@(async 1)', 'app')).rejects.toThrow(
      /async.*context|then\/catch/i
    )
  })

  it('pending inside a fn body is fine — only top-level deref is banned', async () => {
    const s = mk()
    await expect(
      s.loadFileAsync('(ns app)\n(defn f [] (async 1))\n(def y 1)', 'app')
    ).resolves.toBe('app')
  })
})

// ---------------------------------------------------------------------------
// G14 — REPL ns is never a no-op. In evaluate/evaluateAsync, (ns foo) must
// throw a clear error directing users to (in-ns 'foo) or (load "file"). Today
// a non-first (ns ...) form silently no-ops and following defs misbind into the
// current namespace (confirmed by probe).
// ---------------------------------------------------------------------------

describe(`G14 REPL ns is never a no-op [${RED}]`, () => {
  it('a late (ns ...) form in evaluate throws ns-in-repl', () => {
    const s = createSession()
    const before = s.currentNs
    const err = captureSync(() => s.evaluate('(+ 1 1)\n(ns repl.target)\n(def x 1)'))
    expect(err).toBeDefined()
    expect(err!.code).toBe('namespace/ns-in-repl')
    // It must NOT have silently misbound x into the original namespace.
    expect(s.getNs(before)?.vars.has('x')).toBe(false)
  })

  it('a standalone (ns ...) in evaluate switches the current namespace', () => {
    const s = createSession()
    s.evaluate('(ns repl.solo)')
    expect(s.currentNs).toBe('repl.solo')
  })

  it('in-ns remains the supported REPL namespace switch [' + GUARD + ']', () => {
    const s = createSession()
    s.evaluate("(in-ns 'repl.target)")
    expect(s.currentNs).toBe('repl.target')
  })
})

// ---------------------------------------------------------------------------
// S5b — REPL async host-require routing. A leading (ns app (:require [root :as r]))
// evaluated via evaluateAsync, where `root` transitively needs a host import,
// must LOAD (await the closure) instead of throwing namespace/requires-async.
// Today the symbol-spec branch of processNsRequiresAsync drops to the sync
// resolveNamespace → loadFile → graphNeedsAsync path and throws. After S5b it
// routes through the async graph loader, mirroring loadFileAsync's cljRequires.
// Preserves the Calva "add a host dep to the ns form, re-eval to load it" flow.
// ---------------------------------------------------------------------------

describe('S5b REPL async host-require routing', () => {
  const graph = {
    'src/root.clj': '(ns root (:require [dep :as d]))\n(def val d/x)',
    'src/dep.clj': '(ns dep (:require ["host-mod" :as h]))\n(def x 42)',
  }

  it(`REPL leading ns with a transitive host require loads via evaluateAsync [${RED}]`, async () => {
    const s = graphSession(graph, { 'host-mod': { ok: true } })
    await s.evaluateAsync('(ns app (:require [root :as r]))')
    expect(s.currentNs).toBe('app')
    // The transitive closure (root → dep → ["host-mod"]) loaded, and the :as
    // alias resolves end-to-end from the REPL.
    const result = await s.evaluateAsync('r/val')
    expect(result).toEqual({ kind: 'number', value: 42 })
  })

  it(`host-free leading ns require still loads via evaluateAsync [${GUARD}]`, async () => {
    const s = graphSession({ 'src/lib.clj': '(ns lib)\n(def answer 42)' })
    await s.evaluateAsync('(ns app2 (:require [lib :as l]))')
    expect(s.currentNs).toBe('app2')
    const result = await s.evaluateAsync('l/answer')
    expect(result).toEqual({ kind: 'number', value: 42 })
  })
})
