import type { CljMap, CljNamespace, CljValue } from './types'

// ---------------------------------------------------------------------------
// RuntimeModule — declarative unit of capability installation into a runtime.
// Modules are plain data. `vars(ctx)` is the only computation, called once per
// namespace declaration at install time in dependency order.
//
// Additive namespace model: multiple modules may contribute vars to the same
// namespace. The uniqueness invariant is at the (namespace, varName) level —
// two modules cannot declare the same var in the same namespace.
//
// `dependsOn` lists namespace names. A module that lists 'clojure.core' will
// be installed after ALL modules that contribute vars to 'clojure.core'.
// If no installed module provides a depended-on namespace, resolveModuleOrder
// throws immediately with a clear message.
// ---------------------------------------------------------------------------

export type RuntimeModule = {
  id: string
  dependsOn?: string[]        // namespace names that must be fully installed before this module
  declareNs: NamespaceDeclaration[]
}

export type NamespaceDeclaration = {
  name: string                // the namespace this declaration contributes vars into
  vars(ctx: ModuleContext): VarMap
}

export type VarDeclaration = {
  value: CljValue
  meta?: CljMap
  dynamic?: boolean
  macro?: boolean
}

export type VarMap = Map<string, VarDeclaration>

export type ModuleContext = {
  // Read-only view of already-installed state at construction time
  getVar(ns: string, name: string): CljValue | null
  getNamespace(name: string): CljNamespace | null
}

// ---------------------------------------------------------------------------
// resolveModuleOrder — returns modules in dependency-safe install order.
//
// Algorithm (Kahn's topological sort):
//   1. Build nsProviders: namespace → [module IDs that contribute to it]
//   2. For each module M and each dep namespace in M.dependsOn:
//        - If no provider exists → throw (missing dep)
//        - For each provider P where P.id ≠ M.id → add edge P → M
//   3. Run Kahn's algorithm; throw on cycle
// ---------------------------------------------------------------------------

export function resolveModuleOrder(
  modules: RuntimeModule[],
  existingNamespaces?: Set<string>
): RuntimeModule[] {
  // Index modules by ID for quick lookup
  const byId = new Map<string, RuntimeModule>()
  for (const m of modules) {
    if (byId.has(m.id)) {
      throw new Error(`Duplicate module ID: '${m.id}'`)
    }
    byId.set(m.id, m)
  }

  // Build namespace → provider module IDs map
  const nsProviders = new Map<string, string[]>()
  for (const m of modules) {
    for (const decl of m.declareNs) {
      const providers = nsProviders.get(decl.name) ?? []
      providers.push(m.id)
      nsProviders.set(decl.name, providers)
    }
  }

  // Build dependency edges: providerID → [dependentIDs]
  // inDegree tracks how many unresolved dependencies each module has
  const graph = new Map<string, string[]>()
  const inDegree = new Map<string, number>()
  for (const m of modules) {
    graph.set(m.id, [])
    inDegree.set(m.id, 0)
  }

  for (const m of modules) {
    for (const depNs of m.dependsOn ?? []) {
      // A dep is satisfied if some already-installed namespace provides it
      if (existingNamespaces?.has(depNs)) continue

      const providers = nsProviders.get(depNs)
      if (!providers || providers.length === 0) {
        throw new Error(
          `No module provides namespace '${depNs}' (required by '${m.id}')`
        )
      }
      for (const providerId of providers) {
        // Self-exclusion: a module that both contributes to and depends on the
        // same namespace does not create a self-loop.
        if (providerId === m.id) continue
        graph.get(providerId)!.push(m.id)
        inDegree.set(m.id, inDegree.get(m.id)! + 1)
      }
    }
  }

  // Kahn's algorithm — start with nodes that have no unresolved deps
  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }

  const result: RuntimeModule[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    result.push(byId.get(id)!)
    for (const dependentId of graph.get(id)!) {
      const newDegree = inDegree.get(dependentId)! - 1
      inDegree.set(dependentId, newDegree)
      if (newDegree === 0) queue.push(dependentId)
    }
  }

  // If not all modules were processed, there is a cycle
  if (result.length !== modules.length) {
    const unprocessed = modules
      .map((m) => m.id)
      .filter((id) => !result.some((m) => m.id === id))
    throw new Error(
      `Circular dependency detected in module system. Modules in cycle: ${unprocessed.join(', ')}`
    )
  }

  return result
}
