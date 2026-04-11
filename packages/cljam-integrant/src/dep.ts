// dep.ts — bidirectional dependency graph + Kahn's topological sort.
//
// Port of weavejester/dependency (Clojure), adapted for Conjure's CljValue types.
//
// Node identity: uses printString(node) as the Map key, giving structural equality
// semantics. Two separate :app/db keywords are the same node; two equal maps are
// the same node. This is required because JS Map/Set use reference equality.
//
// The graph is immutable — every mutating operation returns a new DepGraph.

import { EvaluationError, printString } from '@regibyte/cljam'
import type { CljValue } from '@regibyte/cljam'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DepGraph {
  /** string key → original CljValue node */
  nodes: Map<string, CljValue>
  /** string key → set of string keys this node directly depends on */
  deps: Map<string, Set<string>>
  /** string key → set of string keys that directly depend on this node */
  dependents: Map<string, Set<string>>
}

// ---------------------------------------------------------------------------
// Constructors
// ---------------------------------------------------------------------------

export function emptyGraph(): DepGraph {
  return {
    nodes: new Map(),
    deps: new Map(),
    dependents: new Map(),
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function nodeKey(node: CljValue): string {
  return printString(node)
}

function cloneGraph(g: DepGraph): DepGraph {
  return {
    nodes: new Map(g.nodes),
    deps: new Map([...g.deps.entries()].map(([k, s]) => [k, new Set(s)])),
    dependents: new Map(
      [...g.dependents.entries()].map(([k, s]) => [k, new Set(s)])
    ),
  }
}

function ensureNode(g: DepGraph, k: string, node: CljValue): void {
  if (!g.nodes.has(k)) {
    g.nodes.set(k, node)
    g.deps.set(k, new Set())
    g.dependents.set(k, new Set())
  }
}

// Compute the full transitive dependency set of a node (string keys only).
// Does NOT include the start node itself.
function transitiveDepsOfKey(g: DepGraph, startKey: string): Set<string> {
  const visited = new Set<string>()
  const stack = [...(g.deps.get(startKey) ?? [])]
  while (stack.length > 0) {
    const k = stack.pop()!
    if (!visited.has(k)) {
      visited.add(k)
      for (const dep of g.deps.get(k) ?? []) {
        stack.push(dep)
      }
    }
  }
  return visited
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Add node to the graph (no dependency). No-op if already present. */
export function addNode(g: DepGraph, node: CljValue): DepGraph {
  const k = nodeKey(node)
  if (g.nodes.has(k)) return g
  const ng = cloneGraph(g)
  ensureNode(ng, k, node)
  return ng
}

/**
 * Add a dependency: `node` depends on `dep`.
 * Throws `integrant/circular-dependency` if this would create a cycle.
 */
export function depend(g: DepGraph, node: CljValue, dep: CljValue): DepGraph {
  const nk = nodeKey(node)
  const dk = nodeKey(dep)

  if (nk === dk) {
    const err = new EvaluationError(
      `integrant/circular-dependency: ${printString(node)} cannot depend on itself`,
      { node, dep }
    )
    err.code = 'integrant/circular-dependency'
    throw err
  }

  // Cycle check: would adding node→dep create a cycle?
  // Yes if dep can already reach node transitively (dep transitively depends on node).
  const transitiveDepsOfDep = transitiveDepsOfKey(g, dk)
  if (transitiveDepsOfDep.has(nk) || (g.deps.get(dk)?.has(nk) ?? false)) {
    const err = new EvaluationError(
      `integrant/circular-dependency: circular dependency between ${printString(node)} and ${printString(dep)}`,
      { node, dep }
    )
    err.code = 'integrant/circular-dependency'
    throw err
  }

  const ng = cloneGraph(g)
  ensureNode(ng, nk, node)
  ensureNode(ng, dk, dep)
  ng.deps.get(nk)!.add(dk)
  ng.dependents.get(dk)!.add(nk)
  return ng
}

/**
 * Topological sort using Kahn's algorithm.
 * Returns nodes in dependency order — dependencies appear before dependents.
 * Throws `integrant/circular-dependency` if the graph contains a cycle.
 */
export function topoSort(g: DepGraph): CljValue[] {
  const result: CljValue[] = []

  // in-degree = number of things this node depends on (within this graph)
  const inDegree = new Map<string, number>()
  for (const k of g.nodes.keys()) {
    inDegree.set(k, g.deps.get(k)?.size ?? 0)
  }

  // Seed queue with nodes that have no deps (stable alphabetical order)
  const queue: string[] = [...inDegree.entries()]
    .filter(([, d]) => d === 0)
    .map(([k]) => k)
    .sort()

  while (queue.length > 0) {
    const k = queue.shift()!
    result.push(g.nodes.get(k)!)

    // Decrement in-degree of every node that depends on k
    const newReady: string[] = []
    for (const dk of g.dependents.get(k) ?? []) {
      const newDeg = (inDegree.get(dk) ?? 0) - 1
      inDegree.set(dk, newDeg)
      if (newDeg === 0) newReady.push(dk)
    }
    newReady.sort()
    queue.push(...newReady)
  }

  if (result.length !== g.nodes.size) {
    const err = new EvaluationError(
      'integrant/circular-dependency: circular dependency in system configuration',
      {}
    )
    err.code = 'integrant/circular-dependency'
    throw err
  }

  return result
}

/** Return all nodes in the graph as an array. */
export function graphNodes(g: DepGraph): CljValue[] {
  return [...g.nodes.values()]
}

/**
 * Return the full transitive closure of a set of nodes:
 * the nodes themselves plus everything they (transitively) depend on.
 */
export function transitiveDepsOf(
  g: DepGraph,
  nodeSet: CljValue[]
): CljValue[] {
  const resultKeys = new Set<string>()
  for (const node of nodeSet) {
    const k = nodeKey(node)
    if (!g.nodes.has(k)) continue
    resultKeys.add(k)
    for (const dep of transitiveDepsOfKey(g, k)) {
      resultKeys.add(dep)
    }
  }
  return [...resultKeys].map((k) => g.nodes.get(k)!).filter(Boolean)
}
