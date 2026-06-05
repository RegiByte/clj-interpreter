import { describe, expect, it } from 'vitest'
import { is } from '../../assertions'
import { EvaluationError } from '../../errors'
import { parseDescriptor } from '../ns-descriptor'

// ---------------------------------------------------------------------------
// S1 — pure ns-descriptor parser (.regibyte/NAMESPACE_LOADER_PLAN.md §6/§S1).
// Parsing performs no eval, no macroexpand, no host import, no registry
// mutation — every assertion here runs without a session or registry.
// ---------------------------------------------------------------------------

describe('parseDescriptor — namespace + body', () => {
  it('no ns form: falls back to the hint, whole source is body', () => {
    const d = parseDescriptor('(def a 1)\n(def b 2)', 'fallback.ns')
    expect(d.nsName).toBe('fallback.ns')
    expect(d.nsForm).toBeNull()
    expect(d.bodyForms).toHaveLength(2)
    expect(d.forms).toHaveLength(2)
  })

  it('no ns form and no hint: defaults to user', () => {
    const d = parseDescriptor('(def a 1)')
    expect(d.nsName).toBe('user')
  })

  it('one ns form with docstring: captures name and doc, excludes ns from body', () => {
    const d = parseDescriptor('(ns my.app "the docstring")\n(def a 1)')
    expect(d.nsName).toBe('my.app')
    expect(d.doc).toBe('the docstring')
    expect(d.nsForm).not.toBeNull()
    expect(d.bodyForms).toHaveLength(1)
    expect(d.forms).toHaveLength(2)
  })

  it('ns form without docstring leaves doc undefined', () => {
    const d = parseDescriptor('(ns my.app (:require [x :as x]))')
    expect(d.doc).toBeUndefined()
  })
})

describe('parseDescriptor — require classification', () => {
  it('direct Clojure requires land in cljRequires with raw spec retained', () => {
    const d = parseDescriptor('(ns app (:require [some.lib :as sl] [other.lib]))')
    expect(d.cljRequires.map((r) => r.nsName)).toEqual(['some.lib', 'other.lib'])
    // Raw spec is retained as the S2 link seam.
    expect(is.vector(d.cljRequires[0].spec)).toBe(true)
    expect(d.hostRequires).toHaveLength(0)
  })

  it('direct host requires land in hostRequires with specifier + alias', () => {
    const d = parseDescriptor('(ns app (:require ["react" :as React] ["lodash"]))')
    expect(d.hostRequires.map((h) => h.specifier)).toEqual(['react', 'lodash'])
    expect(d.hostRequires[0].alias).toBe('React')
    expect(d.hostRequires[1].alias).toBeNull()
    expect(d.cljRequires).toHaveLength(0)
  })

  it(':as builds the alias map (clojure namespace aliases only)', () => {
    const d = parseDescriptor('(ns app (:require [some.lib :as sl]))')
    expect(d.aliasMap.get('sl')).toBe('some.lib')
  })

  it(':refer does not affect classification or alias map (link-time concern)', () => {
    const d = parseDescriptor('(ns app (:require [some.lib :refer [a b]]))')
    expect(d.cljRequires.map((r) => r.nsName)).toEqual(['some.lib'])
    expect(d.aliasMap.size).toBe(0)
  })

  it(':as-alias records a reader alias and does NOT load the namespace', () => {
    const d = parseDescriptor('(ns app (:require [pure.ns :as-alias pn]))')
    expect(d.readerAliases).toEqual([{ alias: 'pn', nsName: 'pure.ns' }])
    expect(d.aliasMap.get('pn')).toBe('pure.ns')
    // :as-alias is not a real require — it must not appear in the load graph.
    expect(d.cljRequires).toHaveLength(0)
  })

  it('host module aliases are excluded from the reader alias map', () => {
    const d = parseDescriptor('(ns app (:require ["react" :as React]))')
    expect(d.aliasMap.has('React')).toBe(false)
  })
})

describe('parseDescriptor — reader-alias bootstrap', () => {
  it('::alias/foo in the body resolves using the file-declared :as-alias', () => {
    const d = parseDescriptor(
      '(ns app (:require [some.lib :as-alias sl]))\n(def x ::sl/foo)'
    )
    const defForm = d.bodyForms[0]
    expect(is.list(defForm)).toBe(true)
    const kw = is.list(defForm) ? defForm.value[2] : undefined
    expect(kw && is.keyword(kw)).toBe(true)
    expect(kw && is.keyword(kw) ? kw.name : '').toMatch(/some\.lib\/foo/)
  })
})

describe('parseDescriptor — one namespace per file (G1)', () => {
  it('rejects more than one ns form with namespace/multiple-ns-forms', () => {
    let err: EvaluationError | undefined
    try {
      parseDescriptor('(ns alpha)\n(def a 1)\n(ns beta)\n(def b 2)')
    } catch (e) {
      err = e instanceof EvaluationError ? e : undefined
    }
    expect(err).toBeDefined()
    expect(err!.code).toBe('namespace/multiple-ns-forms')
  })

  it('a nested ns inside another form does not trip the guard', () => {
    // Only TOP-LEVEL ns forms count.
    expect(() => parseDescriptor('(ns solo)\n(comment (ns inner))')).not.toThrow()
  })
})

describe('parseDescriptor — purity', () => {
  it('is deterministic: same source yields structurally equal descriptors', () => {
    const src = '(ns app (:require [a :as a] ["host" :as H]))\n(def x 1)'
    const d1 = parseDescriptor(src)
    const d2 = parseDescriptor(src)
    expect(d1.nsName).toBe(d2.nsName)
    expect(d1.cljRequires.map((r) => r.nsName)).toEqual(
      d2.cljRequires.map((r) => r.nsName)
    )
    expect(d1.hostRequires.map((h) => h.specifier)).toEqual(
      d2.hostRequires.map((h) => h.specifier)
    )
  })

  it('host requires are parsed without importing the module', () => {
    // parseDescriptor takes no importModule — parsing a host require cannot
    // perform the import, proving the parse phase is side-effect free.
    const d = parseDescriptor('(ns app (:require ["never-imported" :as N]))')
    expect(d.hostRequires[0].specifier).toBe('never-imported')
  })
})
