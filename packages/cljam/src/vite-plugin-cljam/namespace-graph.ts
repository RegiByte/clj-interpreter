import type { CodegenContext } from './codegen'
import { extractNsRequires, extractStringRequires } from './namespace-utils'

/**
 * graphNeedsAsync — the Vite-side twin of the runtime's `graphNeedsAsync`
 * (core/runtime.ts). A pure pre-walk of a file's transitive Clojure dependency
 * closure: returns true if the file itself OR any reachable dependency declares
 * a host (string) require. That is exactly the condition under which the
 * generated browser module must use top-level await + `loadFileAsync` — so the
 * bundler and the runtime agree on namespace-graph semantics (G6/G7).
 *
 * The ONLY thing that differs from the runtime twin is source lookup: the
 * runtime resolves a namespace via `locateNamespaceSource(nsName)`; the bundler
 * reads it via `ctx.readDepSource(depNs)`. An unresolvable dependency is NOT
 * decided here — this stays a pure sync-vs-async boolean. The authoritative
 * "declared dep cannot be resolved" error is raised in codegen's `depImports`
 * (via `resolveDepPath`), per-module across Vite's module graph, mirroring how
 * the runtime defers that error to `applyRequireLink` rather than the pre-walk.
 *
 * The `visited` set is keyed by namespace name and breaks cycles so the walk
 * terminates on any graph shape.
 */
export function graphNeedsAsync(
  source: string,
  ctx: Pick<CodegenContext, 'readDepSource'>,
  visited: Set<string> = new Set()
): boolean {
  if (extractStringRequires(source).length > 0) return true

  for (const depNs of extractNsRequires(source)) {
    if (visited.has(depNs)) continue
    visited.add(depNs)
    const depSource = ctx.readDepSource?.(depNs)
    if (!depSource) continue
    if (graphNeedsAsync(depSource, ctx, visited)) return true
  }
  return false
}
