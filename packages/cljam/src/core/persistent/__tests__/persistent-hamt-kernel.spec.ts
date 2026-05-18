import { describe, expect, it } from 'vitest'
import {
  EMPTY_NODE,
  NOT_FOUND,
  hamtAssoc,
  hamtCount,
  hamtDissoc,
  hamtEntries,
  hamtForEach,
  hamtGet,
  type HamtNode,
  type HamtOps,
} from '../hamt-kernel.ts'
import { hashString } from '../hash.ts'

// ─── test ops ────────────────────────────────────────────────────────────────

// Standard string ops — used for most tests.
const strOps: HamtOps<string> = {
  hash: hashString,
  equal: (a, b) => a === b,
}

// Collision-forcing ops — all keys hash to the same constant.
// Forces every insertion into a CollisionNode for correctness testing.
const collideOps: HamtOps<string> = {
  hash: (_k) => 0x12345678,
  equal: (a, b) => a === b,
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildMap(ops: HamtOps<string>, pairs: [string, string][]): HamtNode<string, string> {
  let node: HamtNode<string, string> = EMPTY_NODE
  for (const [k, v] of pairs) {
    node = hamtAssoc(ops, node, ops.hash(k), k, v)
  }
  return node
}

function sortedEntries(node: HamtNode<string, string>): [string, string][] {
  return hamtEntries(node).sort(([a], [b]) => a.localeCompare(b))
}

// ─── empty node ───────────────────────────────────────────────────────────────

describe('EmptyNode', () => {
  it('get returns NOT_FOUND', () => {
    expect(hamtGet(strOps, EMPTY_NODE, hashString('x'), 'x')).toBe(NOT_FOUND)
  })

  it('dissoc returns empty', () => {
    const result = hamtDissoc(strOps, EMPTY_NODE, hashString('x'), 'x')
    expect(result.kind).toBe('empty')
  })

  it('count is 0', () => {
    expect(hamtCount(EMPTY_NODE)).toBe(0)
  })

  it('entries is empty', () => {
    expect(hamtEntries(EMPTY_NODE)).toEqual([])
  })

  it('forEach is a no-op', () => {
    const calls: string[] = []
    hamtForEach(EMPTY_NODE, (k) => calls.push(k))
    expect(calls).toEqual([])
  })
})

// ─── single entry ─────────────────────────────────────────────────────────────

describe('single entry (LeafNode)', () => {
  const node = hamtAssoc(strOps, EMPTY_NODE, hashString('hello'), 'hello', 'world')

  it('get returns the value', () => {
    expect(hamtGet(strOps, node, hashString('hello'), 'hello')).toBe('world')
  })

  it('get of missing key returns NOT_FOUND', () => {
    expect(hamtGet(strOps, node, hashString('other'), 'other')).toBe(NOT_FOUND)
  })

  it('count is 1', () => {
    expect(hamtCount(node)).toBe(1)
  })

  it('entries contains the pair', () => {
    expect(hamtEntries(node)).toEqual([['hello', 'world']])
  })

  it('dissoc returns empty', () => {
    const result = hamtDissoc(strOps, node, hashString('hello'), 'hello')
    expect(result.kind).toBe('empty')
  })

  it('dissoc of missing key is no-op', () => {
    const result = hamtDissoc(strOps, node, hashString('other'), 'other')
    expect(result).toBe(node) // same reference
  })
})

// ─── multiple entries ──────────────────────────────────────────────────────────

describe('multiple entries', () => {
  const keys = ['alpha', 'beta', 'gamma', 'delta', 'epsilon']
  const pairs: [string, string][] = keys.map((k) => [k, `val-${k}`])
  const node = buildMap(strOps, pairs)

  it('count matches', () => {
    expect(hamtCount(node)).toBe(5)
  })

  it('get returns correct value for each key', () => {
    for (const [k, v] of pairs) {
      expect(hamtGet(strOps, node, hashString(k), k)).toBe(v)
    }
  })

  it('get of absent key returns NOT_FOUND', () => {
    expect(hamtGet(strOps, node, hashString('absent'), 'absent')).toBe(NOT_FOUND)
  })

  it('entries contains all pairs', () => {
    const got = sortedEntries(node)
    const expected = [...pairs].sort(([a], [b]) => a.localeCompare(b))
    expect(got).toEqual(expected)
  })
})

// ─── update (last-write-wins) ─────────────────────────────────────────────────

describe('update: assoc same key twice', () => {
  const n1 = hamtAssoc(strOps, EMPTY_NODE, hashString('key'), 'key', 'first')
  const n2 = hamtAssoc(strOps, n1, hashString('key'), 'key', 'second')

  it('count remains 1', () => {
    expect(hamtCount(n2)).toBe(1)
  })

  it('get returns the latest value', () => {
    expect(hamtGet(strOps, n2, hashString('key'), 'key')).toBe('second')
  })

  it('assoc with same value returns same node reference', () => {
    const n3 = hamtAssoc(strOps, n2, hashString('key'), 'key', 'second')
    expect(n3).toBe(n2)
  })
})

// ─── deletion ─────────────────────────────────────────────────────────────────

describe('deletion', () => {
  const keys = ['a', 'b', 'c', 'd', 'e']
  const node = buildMap(strOps, keys.map((k) => [k, k]))

  it('dissoc reduces count', () => {
    const n2 = hamtDissoc(strOps, node, hashString('c'), 'c')
    expect(hamtCount(n2)).toBe(4)
  })

  it('dissoc removes the key', () => {
    const n2 = hamtDissoc(strOps, node, hashString('c'), 'c')
    expect(hamtGet(strOps, n2, hashString('c'), 'c')).toBe(NOT_FOUND)
  })

  it('dissoc leaves other keys intact', () => {
    const n2 = hamtDissoc(strOps, node, hashString('c'), 'c')
    for (const k of ['a', 'b', 'd', 'e']) {
      expect(hamtGet(strOps, n2, hashString(k), k)).toBe(k)
    }
  })

  it('dissoc of absent key is a no-op (same reference)', () => {
    const n2 = hamtDissoc(strOps, node, hashString('missing'), 'missing')
    expect(n2).toBe(node)
  })

  it('dissoc all entries returns empty', () => {
    let n: HamtNode<string, string> = node
    for (const k of keys) {
      n = hamtDissoc(strOps, n, hashString(k), k)
    }
    expect(n.kind).toBe('empty')
  })
})

// ─── structural sharing ───────────────────────────────────────────────────────

describe('structural sharing', () => {
  it('assoc returns a new root, original root is unchanged', () => {
    const n1 = buildMap(strOps, [['x', '1'], ['y', '2'], ['z', '3']])
    const n2 = hamtAssoc(strOps, n1, hashString('w'), 'w', '4')
    // Original still has 3 entries
    expect(hamtCount(n1)).toBe(3)
    expect(hamtGet(strOps, n1, hashString('w'), 'w')).toBe(NOT_FOUND)
    // New node has 4
    expect(hamtCount(n2)).toBe(4)
    expect(hamtGet(strOps, n2, hashString('w'), 'w')).toBe('4')
  })

  it('dissoc returns a new root, original root is unchanged', () => {
    const n1 = buildMap(strOps, [['x', '1'], ['y', '2'], ['z', '3']])
    const n2 = hamtDissoc(strOps, n1, hashString('y'), 'y')
    expect(hamtCount(n1)).toBe(3)
    expect(hamtGet(strOps, n1, hashString('y'), 'y')).toBe('2')
    expect(hamtCount(n2)).toBe(2)
    expect(hamtGet(strOps, n2, hashString('y'), 'y')).toBe(NOT_FOUND)
  })
})

// ─── hash collisions (CollisionNode) ──────────────────────────────────────────

describe('hash collisions (CollisionNode)', () => {
  // All keys hash to the same value — every operation lands in a CollisionNode.
  const n1 = hamtAssoc(collideOps, EMPTY_NODE, 0x12345678, 'apple', 'fruit')
  const n2 = hamtAssoc(collideOps, n1, 0x12345678, 'ant', 'insect')
  const n3 = hamtAssoc(collideOps, n2, 0x12345678, 'anchor', 'nautical')

  it('count is correct', () => {
    expect(hamtCount(n3)).toBe(3)
  })

  it('each key is retrievable', () => {
    expect(hamtGet(collideOps, n3, 0x12345678, 'apple')).toBe('fruit')
    expect(hamtGet(collideOps, n3, 0x12345678, 'ant')).toBe('insect')
    expect(hamtGet(collideOps, n3, 0x12345678, 'anchor')).toBe('nautical')
  })

  it('absent key returns NOT_FOUND', () => {
    expect(hamtGet(collideOps, n3, 0x12345678, 'absent')).toBe(NOT_FOUND)
  })

  it('update inside collision preserves count', () => {
    const n4 = hamtAssoc(collideOps, n3, 0x12345678, 'ant', 'updated')
    expect(hamtCount(n4)).toBe(3)
    expect(hamtGet(collideOps, n4, 0x12345678, 'ant')).toBe('updated')
  })

  it('dissoc from collision reduces count', () => {
    const n4 = hamtDissoc(collideOps, n3, 0x12345678, 'ant')
    expect(hamtCount(n4)).toBe(2)
    expect(hamtGet(collideOps, n4, 0x12345678, 'ant')).toBe(NOT_FOUND)
    expect(hamtGet(collideOps, n4, 0x12345678, 'apple')).toBe('fruit')
  })

  it('dissoc from collision of size 2 collapses to LeafNode', () => {
    const n4 = hamtDissoc(collideOps, n2, 0x12345678, 'ant')
    expect(n4.kind).toBe('leaf')
    expect(hamtGet(collideOps, n4, 0x12345678, 'apple')).toBe('fruit')
  })
})

// ─── BitmapIndexedNode → ArrayNode transition ─────────────────────────────────

describe('BitmapIndexedNode → ArrayNode expansion', () => {
  // Need enough entries that at least one subtree concentrates 16+ children.
  // 50 entries reliably forces the transition (verified empirically with hashString).
  const entries50: [string, string][] = Array.from({ length: 50 }, (_, i) => [`key${i}`, `val${i}`])
  const node = buildMap(strOps, entries50)

  it('node structure contains an ArrayNode somewhere', () => {
    const hasArray = (n: HamtNode<string, string>): boolean => {
      if (n.kind === 'array') return true
      if (n.kind === 'bitmap') return n.children.some(hasArray)
      return false
    }
    expect(hasArray(node)).toBe(true)
  })

  it('count is 50', () => {
    expect(hamtCount(node)).toBe(50)
  })

  it('all 50 keys are retrievable', () => {
    for (const [k, v] of entries50) {
      expect(hamtGet(strOps, node, hashString(k), k)).toBe(v)
    }
  })
})

// ─── ArrayNode → BitmapIndexedNode collapse ────────────────────────────────────

describe('ArrayNode → BitmapIndexedNode collapse on deletion', () => {
  // Build a map large enough to produce an ArrayNode, then delete until collapse.
  const entries50: [string, string][] = Array.from({ length: 50 }, (_, i) => [`item${i}`, `v${i}`])
  const bigNode = buildMap(strOps, entries50)

  const hasArray = (n: HamtNode<string, string>): boolean => {
    if (n.kind === 'array') return true
    if (n.kind === 'bitmap') return n.children.some(hasArray)
    return false
  }

  it('big node has an ArrayNode', () => {
    expect(hasArray(bigNode)).toBe(true)
  })

  it('deleting most entries collapses ArrayNode to BitmapIndexedNode', () => {
    // Remove 45 of the 50 entries, leaving 5
    let node = bigNode
    for (let i = 0; i < 45; i++) {
      node = hamtDissoc(strOps, node, hashString(`item${i}`), `item${i}`)
    }
    expect(hamtCount(node)).toBe(5)
    expect(hasArray(node)).toBe(false)
  })

  it('remaining 5 keys are still accessible after collapse', () => {
    let node = bigNode
    for (let i = 0; i < 45; i++) {
      node = hamtDissoc(strOps, node, hashString(`item${i}`), `item${i}`)
    }
    for (let i = 45; i < 50; i++) {
      expect(hamtGet(strOps, node, hashString(`item${i}`), `item${i}`)).toBe(`v${i}`)
    }
  })
})

// ─── large map correctness ────────────────────────────────────────────────────

describe('large map (100+ entries)', () => {
  const N = 100
  const pairs: [string, string][] = Array.from({ length: N }, (_, i) => [`k${i}`, `v${i}`])
  const node = buildMap(strOps, pairs)

  it('count is N', () => {
    expect(hamtCount(node)).toBe(N)
  })

  it('all keys are retrievable', () => {
    for (const [k, v] of pairs) {
      expect(hamtGet(strOps, node, hashString(k), k)).toBe(v)
    }
  })

  it('hamtEntries returns all N entries', () => {
    expect(hamtEntries(node).length).toBe(N)
  })

  it('hamtForEach visits all N entries', () => {
    let count = 0
    hamtForEach(node, () => { count++ })
    expect(count).toBe(N)
  })
})

// ─── hamtCount correctness ────────────────────────────────────────────────────

describe('hamtCount', () => {
  it('tracks assoc correctly', () => {
    let node: HamtNode<string, string> = EMPTY_NODE
    for (let i = 0; i < 20; i++) {
      node = hamtAssoc(strOps, node, hashString(`k${i}`), `k${i}`, `v${i}`)
      expect(hamtCount(node)).toBe(i + 1)
    }
  })

  it('tracks dissoc correctly', () => {
    let node = buildMap(strOps, Array.from({ length: 10 }, (_, i) => [`k${i}`, `v${i}`]))
    for (let i = 0; i < 10; i++) {
      node = hamtDissoc(strOps, node, hashString(`k${i}`), `k${i}`)
      expect(hamtCount(node)).toBe(9 - i)
    }
  })

  it('does not increment count when updating existing key', () => {
    const n1 = buildMap(strOps, [['x', 'a'], ['y', 'b']])
    const n2 = hamtAssoc(strOps, n1, hashString('x'), 'x', 'updated')
    expect(hamtCount(n2)).toBe(2)
  })
})

// ─── idempotency ──────────────────────────────────────────────────────────────

describe('idempotency', () => {
  it('assoc of same key/value returns same node reference (leaf case)', () => {
    const n1 = hamtAssoc(strOps, EMPTY_NODE, hashString('key'), 'key', 'value')
    const n2 = hamtAssoc(strOps, n1, hashString('key'), 'key', 'value')
    expect(n2).toBe(n1)
  })

  it('dissoc of absent key returns same node reference', () => {
    const n1 = buildMap(strOps, [['x', 'x'], ['y', 'y']])
    const n2 = hamtDissoc(strOps, n1, hashString('absent'), 'absent')
    expect(n2).toBe(n1)
  })
})
