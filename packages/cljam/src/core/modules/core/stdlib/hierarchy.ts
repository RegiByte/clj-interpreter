import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { DocGroups, docMeta, v } from '../../../factories'
import {
  mapGet,
  mapDissoc,
  mapAssoc,
  NOT_FOUND,
  setContains,
  setConj,
  setCount,
  setValues,
} from '../../../persistent/map-helpers'
import { printString } from '../../../printer'
import type {
  CljMap,
  CljSet,
  CljValue,
  CljVar,
  EvaluationContext,
  Env,
} from '../../../types'

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Get one of the three sub-maps (:parents, :ancestors, :descendants) from a
 * hierarchy map. Returns an empty map if the key is absent.
 */
function getSubMap(h: CljMap, key: string): CljMap {
  const kw = v.kw(key)
  const val = mapGet(h, kw)
  return val !== NOT_FOUND && is.map(val) ? (val as CljMap) : v.map([])
}

/**
 * Get the set associated with a node in a sub-map.
 * Returns an empty set if the node is absent.
 */
function getNodeSet(subMap: CljMap, node: CljValue): CljSet {
  const val = mapGet(subMap, node)
  return val !== NOT_FOUND && is.set(val) ? (val as CljSet) : v.set([])
}

/**
 * Return a new sub-map with `node` mapped to `set`.
 * If the set is empty, the node is removed from the map entirely.
 */
function setNodeSet(subMap: CljMap, node: CljValue, set: CljSet): CljMap {
  if (setCount(set) > 0) return mapAssoc(subMap, node, set)
  return mapDissoc(subMap, node)
}

/** Return a new set that is the union of a and b (deduplicating by is.equal). */
function unionSets(a: CljSet, b: CljSet): CljSet {
  let result = a
  for (const val of setValues(b)) {
    result = setConj(result, val)
  }
  return result
}

/**
 * Compute all transitive ancestors for `node` by BFS over the :parents map.
 * The node itself is NOT included — returns only proper ancestors.
 */
function computeAncestors(parentsMap: CljMap, node: CljValue): CljSet {
  const visited: CljValue[] = []
  const frontier: CljValue[] = [...setValues(getNodeSet(parentsMap, node))]

  while (frontier.length > 0) {
    const current = frontier.shift()!
    if (visited.some((x) => is.equal(x, current))) continue
    visited.push(current)
    for (const p of setValues(getNodeSet(parentsMap, current))) {
      if (!visited.some((x) => is.equal(x, p))) frontier.push(p)
    }
  }
  return v.set(visited)
}

/**
 * Rebuild the full hierarchy (ancestors + descendants) from scratch using only
 * the :parents map. Used by underive — correct but not optimised for hot paths.
 */
function rebuildFromParents(parentsMap: CljMap): CljMap {
  // Collect every node that appears anywhere in the parents map
  const allNodes: CljValue[] = []
  for (const [child, parents] of parentsMap.entries) {
    if (!allNodes.some((n) => is.equal(n, child))) allNodes.push(child)
    if (is.set(parents)) {
      for (const p of setValues(parents as CljSet)) {
        if (!allNodes.some((n) => is.equal(n, p))) allNodes.push(p)
      }
    }
  }

  // Compute ancestors for each node
  const ancestorEntries: [CljValue, CljValue][] = []
  for (const node of allNodes) {
    const ancs = computeAncestors(parentsMap, node)
    if (setCount(ancs) > 0) ancestorEntries.push([node, ancs])
  }
  const ancestorsMap = v.map(ancestorEntries)

  // Invert the ancestor relation to build descendants
  const descMap = new Map<string, { key: CljValue; values: CljValue[] }>()
  for (const [node, ancsVal] of ancestorEntries) {
    if (!is.set(ancsVal)) continue
    for (const anc of setValues(ancsVal as CljSet)) {
      const key = printString(anc)
      if (!descMap.has(key)) descMap.set(key, { key: anc, values: [] })
      descMap.get(key)!.values.push(node)
    }
  }
  const descendantsMap = v.map(
    [...descMap.values()].map(
      ({ key, values }) => [key, v.set(values)] as [CljValue, CljValue]
    )
  )

  return v.map([
    [v.kw(':parents'), parentsMap],
    [v.kw(':ancestors'), ancestorsMap],
    [v.kw(':descendants'), descendantsMap],
  ])
}

// ─── Public graph functions ───────────────────────────────────────────────────

/**
 * Pure derive: returns a new hierarchy map with a child→parent edge added.
 * Precomputes the full transitive closure incrementally (no rebuild from scratch).
 * Throws on self-derivation or cycle detection.
 */
export function hierarchyDerive(
  h: CljMap,
  child: CljValue,
  parent: CljValue
): CljMap {
  if (is.equal(child, parent)) {
    throw new EvaluationError(
      `derive: cannot derive ${printString(child)} from itself`,
      { child }
    )
  }

  // Cycle check: if child is already in the ancestors of parent,
  // then adding parent as an ancestor of child would create a cycle.
  const ancestorsMap = getSubMap(h, ':ancestors')
  const parentAncs = getNodeSet(ancestorsMap, parent)
  if (setContains(parentAncs, child)) {
    throw new EvaluationError(
      `derive: cycle — ${printString(child)} is already an ancestor of ${printString(parent)}`,
      { child, parent }
    )
  }

  // The ancestors to propagate to child (and all of child's descendants):
  // {parent} ∪ ancestors(parent)
  const newAncsForChild = unionSets(v.set([parent]), parentAncs)

  // child + all current descendants of child
  const descendantsMap = getSubMap(h, ':descendants')
  const childDescs = getNodeSet(descendantsMap, child)
  const childAndDescs: CljValue[] = [child, ...setValues(childDescs)]

  // Update :ancestors for child and all descendants
  let newAncestorsMap = ancestorsMap
  for (const node of childAndDescs) {
    const existing = getNodeSet(newAncestorsMap, node)
    newAncestorsMap = setNodeSet(
      newAncestorsMap,
      node,
      unionSets(existing, newAncsForChild)
    )
  }

  // The descendants to propagate upward: child + all current descendants of child
  const newDescSet = v.set(childAndDescs)

  // parent + all current ancestors of parent
  const parentAndAncs: CljValue[] = [parent, ...setValues(parentAncs)]

  // Update :descendants for parent and all of parent's ancestors
  let newDescendantsMap = descendantsMap
  for (const node of parentAndAncs) {
    const existing = getNodeSet(newDescendantsMap, node)
    newDescendantsMap = setNodeSet(
      newDescendantsMap,
      node,
      unionSets(existing, newDescSet)
    )
  }

  // Update :parents — add parent to child's direct parent set
  const parentsMap = getSubMap(h, ':parents')
  const existingParents = getNodeSet(parentsMap, child)
  const newParentsMap = setNodeSet(
    parentsMap,
    child,
    unionSets(existingParents, v.set([parent]))
  )

  return v.map([
    [v.kw(':parents'), newParentsMap],
    [v.kw(':ancestors'), newAncestorsMap],
    [v.kw(':descendants'), newDescendantsMap],
  ])
}

/**
 * Pure isa? check: true if child equals parent (reflexive) or parent is in
 * the precomputed ancestors of child.
 */
export function hierarchyIsA(
  h: CljMap,
  child: CljValue,
  parent: CljValue
): boolean {
  if (is.equal(child, parent)) return true
  const ancestorsMap = getSubMap(h, ':ancestors')
  return setContains(getNodeSet(ancestorsMap, child), parent)
}

/**
 * Pure underive: removes the child→parent edge and rebuilds the transitive
 * closure from scratch using the remaining :parents map.
 */
export function hierarchyUnderive(
  h: CljMap,
  child: CljValue,
  parent: CljValue
): CljMap {
  const parentsMap = getSubMap(h, ':parents')
  const existingParents = getNodeSet(parentsMap, child)
  const newParentSet = v.set(
    setValues(existingParents).filter((p) => !is.equal(p, parent))
  )
  const newParentsMap = setNodeSet(parentsMap, child, newParentSet)
  return rebuildFromParents(newParentsMap)
}

// ─── Session-aware helpers ────────────────────────────────────────────────────

/**
 * Find the session-specific *hierarchy* CljVar using the runtime registry.
 * Uses ctx.allNamespaces() which always returns per-session data, bypassing
 * the snapshot env captured in bootstrap-compiled function closures.
 */
function getSessionHierarchyVar(ctx: EvaluationContext): CljVar | null {
  const coreNs = ctx.allNamespaces().find((ns) => ns.name === 'clojure.core')
  if (!coreNs) return null
  return (coreNs.vars.get('*hierarchy*') as CljVar | undefined) ?? null
}

/**
 * Read *hierarchy* value from a CljVar, respecting the dynamic binding stack.
 * Falls back to the root value when no binding is active.
 */
function readHierarchyValue(hVar: CljVar): CljMap | null {
  const val =
    hVar.dynamic && hVar.bindingStack && hVar.bindingStack.length > 0
      ? hVar.bindingStack[hVar.bindingStack.length - 1]
      : hVar.value
  return is.map(val) ? (val as CljMap) : null
}

const noDocExtras = {
  'no-doc': true,
}

export const hierarchyFunctions: Record<string, CljValue> = {
  'hierarchy-derive*': v
    .nativeFn(
      'hierarchy-derive*',
      function hierarchyDeriveNative(
        h: CljValue,
        child: CljValue,
        parent: CljValue
      ) {
        if (!is.map(h)) {
          throw new EvaluationError(
            `hierarchy-derive*: expected a hierarchy map, got ${h.kind}`,
            { h }
          )
        }
        return hierarchyDerive(h, child, parent)
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Pure derive: returns a new hierarchy with child deriving from parent.',
        arglists: [['h', 'child', 'parent']],
        docGroup: DocGroups.hierarchy,
        extra: noDocExtras,
      }),
    ]),

  'hierarchy-underive*': v
    .nativeFn(
      'hierarchy-underive*',
      function hierarchyUnderiveNative(
        h: CljValue,
        child: CljValue,
        parent: CljValue
      ) {
        if (!is.map(h)) {
          throw new EvaluationError(
            `hierarchy-underive*: expected a hierarchy map, got ${h.kind}`,
            { h }
          )
        }
        return hierarchyUnderive(h, child, parent)
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Pure underive: returns a new hierarchy with the child→parent edge removed.',
        arglists: [['h', 'child', 'parent']],
        docGroup: DocGroups.hierarchy,
        extra: noDocExtras,
      }),
    ]),

  'hierarchy-isa?*': v
    .nativeFn(
      'hierarchy-isa?*',
      function hierarchyIsANative(
        h: CljValue,
        child: CljValue,
        parent: CljValue
      ) {
        if (!is.map(h)) {
          throw new EvaluationError(
            `hierarchy-isa?*: expected a hierarchy map, got ${h.kind}`,
            { h }
          )
        }
        return v.boolean(hierarchyIsA(h, child, parent))
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Pure isa? check: returns true if child isa? parent according to the given hierarchy.',
        arglists: [['h', 'child', 'parent']],
        docGroup: DocGroups.hierarchy,
        extra: noDocExtras,
      }),
    ]),

  // ─── Session-aware global *hierarchy* functions ───────────────────────────
  // These use ctx.allNamespaces() to find the per-session *hierarchy* CljVar,
  // bypassing the snapshot env captured in bootstrap-compiled closures.

  'hierarchy-derive-global!': v
    .nativeFnCtx(
      'hierarchy-derive-global!',
      function hierarchyDeriveGlobal(
        ctx: EvaluationContext,
        _callEnv: Env,
        child: CljValue,
        parent: CljValue
      ) {
        const hVar = getSessionHierarchyVar(ctx)
        if (!hVar) {
          throw new EvaluationError(
            'hierarchy-derive-global!: *hierarchy* not found in clojure.core',
            { child, parent }
          )
        }
        const h = readHierarchyValue(hVar)
        if (!h) {
          throw new EvaluationError(
            'hierarchy-derive-global!: *hierarchy* root value is not a map',
            { child, parent }
          )
        }
        const newH = hierarchyDerive(h, child, parent)
        hVar.value = newH
        return newH
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Derives child from parent in the global *hierarchy* (session-safe).',
        arglists: [['child', 'parent']],
        docGroup: DocGroups.hierarchy,
        extra: noDocExtras,
      }),
    ]),

  'hierarchy-underive-global!': v
    .nativeFnCtx(
      'hierarchy-underive-global!',
      function hierarchyUnderiveGlobal(
        ctx: EvaluationContext,
        _callEnv: Env,
        child: CljValue,
        parent: CljValue
      ) {
        const hVar = getSessionHierarchyVar(ctx)
        if (!hVar) {
          throw new EvaluationError(
            'hierarchy-underive-global!: *hierarchy* not found in clojure.core',
            { child, parent }
          )
        }
        const h = readHierarchyValue(hVar)
        if (!h) {
          throw new EvaluationError(
            'hierarchy-underive-global!: *hierarchy* root value is not a map',
            { child, parent }
          )
        }
        const newH = hierarchyUnderive(h, child, parent)
        hVar.value = newH
        return newH
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Underives child from parent in the global *hierarchy* (session-safe).',
        arglists: [['child', 'parent']],
        docGroup: DocGroups.hierarchy,
        extra: noDocExtras,
      }),
    ]),

  'hierarchy-isa?-global': v
    .nativeFnCtx(
      'hierarchy-isa?-global',
      function hierarchyIsAGlobal(
        ctx: EvaluationContext,
        _callEnv: Env,
        child: CljValue,
        parent: CljValue
      ) {
        const hVar = getSessionHierarchyVar(ctx)
        if (!hVar) return v.boolean(is.equal(child, parent))
        const h = readHierarchyValue(hVar)
        if (!h) return v.boolean(is.equal(child, parent))
        return v.boolean(hierarchyIsA(h, child, parent))
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns true if child isa? parent in the global *hierarchy* (session-safe).',
        arglists: [['child', 'parent']],
        docGroup: DocGroups.hierarchy,
        extra: noDocExtras,
      }),
    ]),

  'hierarchy-parents-global': v
    .nativeFnCtx(
      'hierarchy-parents-global',
      function hierarchyParentsGlobal(
        ctx: EvaluationContext,
        _callEnv: Env,
        tag: CljValue
      ) {
        const hVar = getSessionHierarchyVar(ctx)
        if (!hVar) return v.nil()
        const h = readHierarchyValue(hVar)
        if (!h) return v.nil()
        const parentSet = getNodeSet(getSubMap(h, ':parents'), tag)
        return setCount(parentSet) > 0 ? parentSet : v.nil()
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns the immediate parents of tag in the global *hierarchy* (session-safe), or nil.',
        arglists: [['tag']],
        docGroup: DocGroups.hierarchy,
        extra: noDocExtras,
      }),
    ]),

  'hierarchy-ancestors-global': v
    .nativeFnCtx(
      'hierarchy-ancestors-global',
      function hierarchyAncestorsGlobal(
        ctx: EvaluationContext,
        _callEnv: Env,
        tag: CljValue
      ) {
        const hVar = getSessionHierarchyVar(ctx)
        if (!hVar) return v.nil()
        const h = readHierarchyValue(hVar)
        if (!h) return v.nil()
        const ancSet = getNodeSet(getSubMap(h, ':ancestors'), tag)
        return setCount(ancSet) > 0 ? ancSet : v.nil()
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns all ancestors of tag in the global *hierarchy* (session-safe), or nil.',
        arglists: [['tag']],
        docGroup: DocGroups.hierarchy,
        extra: noDocExtras,
      }),
    ]),
  'hierarchy-descendants-global': v
    .nativeFnCtx(
      'hierarchy-descendants-global',
      function hierarchyDescendantsGlobal(
        ctx: EvaluationContext,
        _callEnv: Env,
        tag: CljValue
      ) {
        const hVar = getSessionHierarchyVar(ctx)
        if (!hVar) return v.nil()
        const h = readHierarchyValue(hVar)
        if (!h) return v.nil()
        const descSet = getNodeSet(getSubMap(h, ':descendants'), tag)
        return setCount(descSet) > 0 ? descSet : v.nil()
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns all descendants of tag in the global *hierarchy* (session-safe), or nil.',
        arglists: [['tag']],
        docGroup: DocGroups.hierarchy,
        extra: noDocExtras,
      }),
    ]),
}
