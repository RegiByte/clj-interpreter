/**
 * mesh-module unit tests — no Redis required.
 *
 * Uses a mock MeshNode to verify:
 *   - Module installs cleanly and the `mesh` namespace is available
 *   - *eval-target* starts as nil
 *   - set-target! mutates the root of *eval-target*
 *   - with-node calls evalAt and returns a resolved CljPending
 *   - with-node propagates remote errors as rejected pendings
 *   - list-nodes returns a pending vector of node maps
 *   - list-nodes passes the capability filter through to the node
 */

import { describe, expect, test } from 'vitest'
import { createSession, printString } from '@regibyte/cljam'
import { makeMeshModule } from '../src/mesh-module.js'
import type { MeshNode } from '../src/mesh-node.js'
import type { NodeInfo } from '../src/broker.js'

// ---------------------------------------------------------------------------
// Mock MeshNode — satisfies only what the module calls
// ---------------------------------------------------------------------------

function createMockNode(overrides?: Partial<MockNodeControl>): {
  node: MeshNode
  control: MockNodeControl
} {
  const control: MockNodeControl = {
    evalAtResult: { value: 'nil' },
    listNodesResult: [],
    evalAtCalls: [],
    listNodesCalls: [],
    ...overrides,
  }

  const node = {
    nodeId: 'mock-node',
    evalAt: async (targetId: string, source: string) => {
      control.evalAtCalls.push({ targetId, source })
      return control.evalAtResult
    },
    listNodes: async (capability?: string) => {
      control.listNodesCalls.push(capability)
      return control.listNodesResult
    },
  } as unknown as MeshNode

  return { node, control }
}

type MockNodeControl = {
  evalAtResult: { value?: string; error?: string }
  listNodesResult: NodeInfo[]
  evalAtCalls: Array<{ targetId: string; source: string }>
  listNodesCalls: Array<string | undefined>
}

// ---------------------------------------------------------------------------
// Helper — create a session with the mesh module installed
// ---------------------------------------------------------------------------

function sessionWithMesh(node: MeshNode) {
  const session = createSession({ modules: [makeMeshModule(node)] })
  return session
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('mesh RuntimeModule', () => {
  test('mesh namespace is available after install', () => {
    const { node } = createMockNode()
    const session = sessionWithMesh(node)
    const ns = session.getNs('mesh')
    expect(ns).not.toBeNull()
    expect(ns?.vars.has('*eval-target*')).toBe(true)
    expect(ns?.vars.has('set-target!')).toBe(true)
    expect(ns?.vars.has('with-node')).toBe(true)
    expect(ns?.vars.has('list-nodes')).toBe(true)
  })

  test('*eval-target* starts as nil', () => {
    const { node } = createMockNode()
    const session = sessionWithMesh(node)
    const result = session.evaluate('mesh/*eval-target*')
    expect(result).toEqual({ kind: 'nil', value: null })
  })

  test('set-target! with a keyword sets *eval-target* to a string', async () => {
    const { node } = createMockNode({
      listNodesResult: [{ id: 'node-b', capabilities: [], lastSeen: Date.now() }],
    })
    const session = sessionWithMesh(node)
    await session.evaluateAsync('(mesh/set-target! :node-b)')
    const result = session.evaluate('mesh/*eval-target*')
    expect(result).toEqual({ kind: 'string', value: 'node-b' })
  })

  test('set-target! with a string also works', async () => {
    const { node } = createMockNode({
      listNodesResult: [{ id: 'node-c', capabilities: [], lastSeen: Date.now() }],
    })
    const session = sessionWithMesh(node)
    await session.evaluateAsync('(mesh/set-target! "node-c")')
    const result = session.evaluate('mesh/*eval-target*')
    expect(result).toEqual({ kind: 'string', value: 'node-c' })
  })

  test('set-target! with nil clears *eval-target*', () => {
    const { node } = createMockNode()
    const session = sessionWithMesh(node)
    session.evaluate('(mesh/set-target! :node-b)')
    session.evaluate('(mesh/set-target! nil)')
    const result = session.evaluate('mesh/*eval-target*')
    expect(result).toEqual({ kind: 'nil', value: null })
  })

  test('with-node returns a pending that resolves to the parsed value', async () => {
    const { node, control } = createMockNode({ evalAtResult: { value: '42' } })
    const session = sessionWithMesh(node)
    const pending = await session.evaluateAsync("(mesh/with-node :node-b '(+ 1 2))")
    expect(pending.kind).toBe('number')
    expect((pending as { kind: 'number'; value: number }).value).toBe(42)
    expect(control.evalAtCalls).toHaveLength(1)
    expect(control.evalAtCalls[0]?.targetId).toBe('node-b')
    expect(control.evalAtCalls[0]?.source).toBe('(+ 1 2)')
  })

  test('with-node sends printString of the quoted form as source', async () => {
    const { node, control } = createMockNode({ evalAtResult: { value: '"hello"' } })
    const session = sessionWithMesh(node)
    await session.evaluateAsync('(mesh/with-node :node-b \'(str "hello" " world"))')
    expect(control.evalAtCalls[0]?.source).toBe('(str "hello" " world")')
  })

  test('with-node resolves to a keyword result', async () => {
    const { node } = createMockNode({ evalAtResult: { value: ':done' } })
    const session = sessionWithMesh(node)
    const result = await session.evaluateAsync("(mesh/with-node :node-b ':done)")
    expect(result).toEqual({ kind: 'keyword', name: ':done' })
  })

  test('with-node resolves to a vector result', async () => {
    const { node } = createMockNode({ evalAtResult: { value: '[1 2 3]' } })
    const session = sessionWithMesh(node)
    const result = await session.evaluateAsync("(mesh/with-node :node-b '[1 2 3])")
    expect(printString(result)).toBe('[1 2 3]')
  })

  test('with-node rejects when remote returns an error', async () => {
    const { node } = createMockNode({ evalAtResult: { error: 'division by zero' } })
    const session = sessionWithMesh(node)
    await expect(
      session.evaluateAsync("(mesh/with-node :node-b '(/ 1 0))")
    ).rejects.toThrow('division by zero')
  })

  test('list-nodes returns a pending vector of node maps', async () => {
    const { node } = createMockNode({
      listNodesResult: [
        { id: 'node-a', capabilities: ['http'], lastSeen: 1000 },
        { id: 'node-b', capabilities: [], lastSeen: 2000 },
      ],
    })
    const session = sessionWithMesh(node)
    const result = await session.evaluateAsync('(mesh/list-nodes)')
    expect(result.kind).toBe('vector')
    const printed = printString(result)
    expect(printed).toContain(':id')
    expect(printed).toContain('"node-a"')
    expect(printed).toContain('"node-b"')
  })

  test('list-nodes passes capability keyword to the node (strips colon)', async () => {
    const { node, control } = createMockNode({ listNodesResult: [] })
    const session = sessionWithMesh(node)
    await session.evaluateAsync('(mesh/list-nodes :http)')
    expect(control.listNodesCalls[0]).toBe('http')
  })

  test('list-nodes passes capability string to the node unchanged', async () => {
    const { node, control } = createMockNode({ listNodesResult: [] })
    const session = sessionWithMesh(node)
    await session.evaluateAsync('(mesh/list-nodes "database")')
    expect(control.listNodesCalls[0]).toBe('database')
  })

  test('list-nodes with no arg passes undefined', async () => {
    const { node, control } = createMockNode({ listNodesResult: [] })
    const session = sessionWithMesh(node)
    await session.evaluateAsync('(mesh/list-nodes)')
    expect(control.listNodesCalls[0]).toBeUndefined()
  })

  test('capabilities in node map are keywords', async () => {
    const { node } = createMockNode({
      listNodesResult: [{ id: 'worker', capabilities: ['gpu', 'ml'], lastSeen: 999 }],
    })
    const session = sessionWithMesh(node)
    const result = await session.evaluateAsync('(mesh/list-nodes)')
    const printed = printString(result)
    expect(printed).toContain(':gpu')
    expect(printed).toContain(':ml')
  })
})
