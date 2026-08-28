import { describe, expect, it } from 'vitest'
import { internVar, makeEnv, makeNamespace } from '../../env'
import { EvaluationError } from '../../errors'
import { v } from '../../factories'
import { applyRequireLink, type NamespaceRegistry } from '../../registry'
import type { CljValue, Env } from '../../types'

// ---------------------------------------------------------------------------
// S2 — link/load split acceptance tests for applyRequireLink.
//
// The S2 contract (see .regibyte/S2_LINK_LOAD_DESIGN.md): link application is a
// SEPARATE concern from loading. applyRequireLink installs :as / :refer /
// :as-alias links ASSUMING the target namespace is already resident — it never
// loads. The structural proof is in the signature itself (no resolveNs / readFile
// / importModule parameter exists to load through), and the behavioral proof is
// that an ABSENT target throws namespace/not-found instead of triggering a load.
// That is the S2 acceptance test the design asks for, expressed at the unit
// altitude that exists before the S3 async loader: "link application alone
// performs zero source reads."
// ---------------------------------------------------------------------------

/** A minimal registry with clojure.core, user, and a resident `lib` ns. */
function fixture(): { registry: NamespaceRegistry; user: Env; lib: Env } {
  const registry: NamespaceRegistry = new Map<string, Env>()

  const core = makeEnv()
  core.ns = makeNamespace('clojure.core')
  registry.set('clojure.core', core)

  const user = makeEnv(core)
  user.ns = makeNamespace('user')
  registry.set('user', user)

  const lib = makeEnv(core)
  lib.ns = makeNamespace('lib')
  registry.set('lib', lib)
  internVar('foo', v.number(42), lib)

  return { registry, user, lib }
}

/** Build a require spec vector from CljValue elements. */
function spec(...els: CljValue[]): CljValue {
  return v.vector(els)
}

function captureSync(fn: () => unknown): EvaluationError | undefined {
  try {
    fn()
  } catch (e) {
    return e instanceof EvaluationError ? e : undefined
  }
  return undefined
}

describe('S2 applyRequireLink — link without load', () => {
  it(':as installs an alias to the resident target namespace', () => {
    const { registry, user, lib } = fixture()
    const changed = applyRequireLink(
      spec(v.symbol('lib'), v.keyword(':as'), v.symbol('l')),
      user,
      registry
    )
    expect(changed).toBe(true)
    expect(user.ns!.aliases.get('l')).toBe(lib.ns)
  })

  it(':refer copies the referenced var into the current namespace', () => {
    const { registry, user, lib } = fixture()
    applyRequireLink(
      spec(v.symbol('lib'), v.keyword(':refer'), v.vector([v.symbol('foo')])),
      user,
      registry
    )
    expect(user.ns!.vars.get('foo')).toBe(lib.ns!.vars.get('foo'))
  })

  it(':as-alias records a reader alias without requiring the target be resident', () => {
    const { registry, user } = fixture()
    applyRequireLink(
      spec(v.symbol('not.loaded.yet'), v.keyword(':as-alias'), v.symbol('nl')),
      user,
      registry
    )
    expect(user.ns!.readerAliases.get('nl')).toBe('not.loaded.yet')
  })

  it('an ABSENT target throws namespace/not-found — never loads it', () => {
    const { registry, user } = fixture()
    const err = captureSync(() =>
      applyRequireLink(
        spec(v.symbol('missing.ns'), v.keyword(':as'), v.symbol('m')),
        user,
        registry
      )
    )
    expect(err).toBeDefined()
    expect(err!.code).toBe('namespace/not-found')
    // The target was never created as a side effect of the failed link.
    expect(registry.has('missing.ns')).toBe(false)
  })

  it('preserves the allowedPackages gate (G8) for library namespaces', () => {
    const { registry, user } = fixture()
    const err = captureSync(() =>
      applyRequireLink(
        spec(v.symbol('lib'), v.keyword(':as'), v.symbol('l')),
        user,
        registry,
        ['other-pkg'],
        () => true
      )
    )
    expect(err).toBeDefined()
    expect(err!.code).toBe('namespace/access-denied')
  })

  it('preserves require-spec validation messages (G8)', () => {
    const { registry, user } = fixture()
    // First element must be a namespace symbol.
    const err = captureSync(() =>
      applyRequireLink(spec(v.keyword(':as'), v.symbol('l')), user, registry)
    )
    expect(err).toBeDefined()
    expect(err!.message).toMatch(/First element of require spec/)
  })
})
