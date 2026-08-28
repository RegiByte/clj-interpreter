// Generic Hash Array Mapped Trie kernel.
// No CljValue dependency — inject hash/equal via HamtOps.

// ─── constants ───────────────────────────────────────────────────────────────

const SHIFT_STEP = 5
const MASK = 0x1f // 0b11111
const MAX_BITMAP_CHILDREN = 16 // BitmapIndexedNode → ArrayNode at this child count
const MIN_ARRAY_CHILDREN = 8 // ArrayNode → BitmapIndexedNode below this count

// ─── node types ──────────────────────────────────────────────────────────────

type EmptyNode = { kind: 'empty' }
type LeafNode<K, V> = { kind: 'leaf'; hash: number; key: K; value: V }
type CollisionNode<K, V> = { kind: 'collision'; hash: number; entries: [K, V][] }
type BitmapIndexedNode<K, V> = { kind: 'bitmap'; bitmap: number; children: HamtNode<K, V>[] }
type ArrayNode<K, V> = { kind: 'array'; count: number; children: (HamtNode<K, V> | null)[] }

export type HamtNode<K, V> =
  | EmptyNode
  | LeafNode<K, V>
  | CollisionNode<K, V>
  | BitmapIndexedNode<K, V>
  | ArrayNode<K, V>

export const EMPTY_NODE: HamtNode<never, never> = { kind: 'empty' }
export const NOT_FOUND: unique symbol = Symbol('hamt/not-found')

export interface HamtOps<K> {
  hash: (k: K) => number
  equal: (a: K, b: K) => boolean
}

// ─── bit utilities ────────────────────────────────────────────────────────────

// Hamming weight (count set bits in 32-bit int). From jsperf.com/hamming-weight.
function popcount(x: number): number {
  x -= (x >> 1) & 0x55555555
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333)
  x = (x + (x >> 4)) & 0x0f0f0f0f
  x += x >> 8
  x += x >> 16
  return x & 0x7f
}

// Convert a logical fragment (0–31) to its dense array index given a bitmap.
function bitmapIndex(bitmap: number, bit: number): number {
  return popcount(bitmap & (bit - 1))
}

// ─── immutable array helpers ─────────────────────────────────────────────────

function arrayUpdate<T>(arr: T[], at: number, v: T): T[] {
  const out = arr.slice()
  out[at] = v
  return out
}

function arraySpliceIn<T>(arr: T[], at: number, v: T): T[] {
  const len = arr.length
  const out = new Array(len + 1)
  let i = 0,
    g = 0
  while (i < at) out[g++] = arr[i++]
  out[g++] = v
  while (i < len) out[g++] = arr[i++]
  return out
}

function arraySpliceOut<T>(arr: T[], at: number): T[] {
  const len = arr.length
  const out = new Array(len - 1)
  let i = 0,
    g = 0
  while (i < at) out[g++] = arr[i++]
  i++
  while (i < len) out[g++] = arr[i++]
  return out
}

// ─── internal structural helpers ──────────────────────────────────────────────

// Merge two distinct-hash "leaf-like" nodes into a BitmapIndexedNode.
// Walks deeper until their 5-bit fragments diverge. n1 and n2 must have
// different hashes — true collisions (same hash) are handled in hamtAssoc.
function mergeNodes<K, V>(
  shift: number,
  hash1: number,
  node1: HamtNode<K, V>,
  hash2: number,
  node2: HamtNode<K, V>,
): HamtNode<K, V> {
  const frag1 = (hash1 >>> shift) & MASK
  const frag2 = (hash2 >>> shift) & MASK
  if (frag1 === frag2) {
    // Fragments collide at this level — recurse one level deeper.
    const child = mergeNodes(shift + SHIFT_STEP, hash1, node1, hash2, node2)
    const bit = 1 << frag1
    return { kind: 'bitmap', bitmap: bit, children: [child] }
  }
  const bit1 = 1 << frag1
  const bit2 = 1 << frag2
  return {
    kind: 'bitmap',
    bitmap: bit1 | bit2,
    children: frag1 < frag2 ? [node1, node2] : [node2, node1],
  }
}

// Expand a BitmapIndexedNode to an ArrayNode after the 16th child is added.
function expandToArray<K, V>(
  frag: number,
  newChild: HamtNode<K, V>,
  bitmap: number,
  children: HamtNode<K, V>[],
): ArrayNode<K, V> {
  const arr: (HamtNode<K, V> | null)[] = new Array(32).fill(null)
  let bit = bitmap
  let packed = 0
  for (let i = 0; bit !== 0; i++) {
    if (bit & 1) arr[i] = children[packed++]
    bit >>>= 1
  }
  arr[frag] = newChild
  return { kind: 'array', count: packed + 1, children: arr }
}

// Collapse an ArrayNode to a BitmapIndexedNode after count drops below minimum.
function packToBitmap<K, V>(
  count: number,
  removedFrag: number,
  children: (HamtNode<K, V> | null)[],
): BitmapIndexedNode<K, V> {
  const packed: HamtNode<K, V>[] = new Array(count - 1)
  let g = 0
  let bitmap = 0
  for (let i = 0; i < 32; i++) {
    if (i !== removedFrag) {
      const child = children[i]
      if (child !== null) {
        packed[g++] = child
        bitmap |= 1 << i
      }
    }
  }
  return { kind: 'bitmap', bitmap, children: packed }
}

// ─── recursive internals ──────────────────────────────────────────────────────
// shift is threaded internally, always starting at 0 from the public surface.
// Two different 32-bit hashes always diverge within 7 levels (7 × 5 = 35 bits
// covers all 32 bits), so mergeNodes and the recursive assoc/dissoc always
// terminate. JavaScript's `>>>` silently masks shift amounts mod 32, but that
// wrapping is unreachable because equal hashes are caught by the CollisionNode
// path before any recursive call.

function assocNode<K, V>(
  ops: HamtOps<K>,
  node: HamtNode<K, V>,
  shift: number,
  hash: number,
  key: K,
  value: V,
): HamtNode<K, V> {
  switch (node.kind) {
    case 'empty':
      return { kind: 'leaf', hash, key, value }

    case 'leaf': {
      if (ops.equal(key, node.key)) {
        if (value === node.value) return node
        return { kind: 'leaf', hash, key, value }
      }
      if (hash === node.hash) {
        // True hash collision — create CollisionNode
        return { kind: 'collision', hash, entries: [[node.key, node.value], [key, value]] }
      }
      return mergeNodes(shift, node.hash, node, hash, { kind: 'leaf', hash, key, value })
    }

    case 'collision': {
      if (hash === node.hash) {
        for (let i = 0; i < node.entries.length; i++) {
          if (ops.equal(key, node.entries[i][0])) {
            if (node.entries[i][1] === value) return node
            return {
              kind: 'collision',
              hash,
              entries: arrayUpdate(node.entries, i, [key, value]),
            }
          }
        }
        return { kind: 'collision', hash, entries: [...node.entries, [key, value]] }
      }
      // Different hash — the collision node acts as a leaf at its own hash position.
      return mergeNodes(shift, node.hash, node, hash, { kind: 'leaf', hash, key, value })
    }

    case 'bitmap': {
      const frag = (hash >>> shift) & MASK
      const bit = 1 << frag
      const idx = bitmapIndex(node.bitmap, bit)
      if ((node.bitmap & bit) === 0) {
        const newChild: HamtNode<K, V> = { kind: 'leaf', hash, key, value }
        if (node.children.length >= MAX_BITMAP_CHILDREN) {
          return expandToArray(frag, newChild, node.bitmap, node.children)
        }
        return {
          kind: 'bitmap',
          bitmap: node.bitmap | bit,
          children: arraySpliceIn(node.children, idx, newChild),
        }
      }
      const child = node.children[idx]
      const newChild = assocNode(ops, child, shift + SHIFT_STEP, hash, key, value)
      if (newChild === child) return node
      return { kind: 'bitmap', bitmap: node.bitmap, children: arrayUpdate(node.children, idx, newChild) }
    }

    case 'array': {
      const frag = (hash >>> shift) & MASK
      const child = node.children[frag]
      const newChild = child
        ? assocNode(ops, child, shift + SHIFT_STEP, hash, key, value)
        : ({ kind: 'leaf', hash, key, value } as LeafNode<K, V>)
      if (newChild === child) return node
      return {
        kind: 'array',
        count: child ? node.count : node.count + 1,
        children: arrayUpdate(node.children, frag, newChild),
      }
    }
  }
}

function dissocNode<K, V>(
  ops: HamtOps<K>,
  node: HamtNode<K, V>,
  shift: number,
  hash: number,
  key: K,
): HamtNode<K, V> {
  switch (node.kind) {
    case 'empty':
      return node

    case 'leaf':
      return ops.equal(key, node.key) ? (EMPTY_NODE as HamtNode<K, V>) : node

    case 'collision': {
      if (hash !== node.hash) return node
      const idx = node.entries.findIndex(([k]) => ops.equal(key, k))
      if (idx === -1) return node
      if (node.entries.length === 2) {
        // Collapse to the remaining leaf
        const [k, v] = node.entries[idx === 0 ? 1 : 0]
        return { kind: 'leaf', hash: node.hash, key: k, value: v }
      }
      return { kind: 'collision', hash: node.hash, entries: arraySpliceOut(node.entries, idx) }
    }

    case 'bitmap': {
      const frag = (hash >>> shift) & MASK
      const bit = 1 << frag
      if ((node.bitmap & bit) === 0) return node // key not present
      const idx = bitmapIndex(node.bitmap, bit)
      const child = node.children[idx]
      const newChild = dissocNode(ops, child, shift + SHIFT_STEP, hash, key)
      if (newChild === child) return node
      if (newChild.kind === 'empty') {
        const newBitmap = node.bitmap & ~bit
        if (newBitmap === 0) return EMPTY_NODE as HamtNode<K, V>
        // When going from 2 → 1 children and the survivor is a leaf/collision,
        // propagate it upward to keep the tree flat.
        if (node.children.length === 2) {
          const survivor = node.children[idx ^ 1]
          if (survivor.kind === 'leaf' || survivor.kind === 'collision') return survivor
        }
        return {
          kind: 'bitmap',
          bitmap: newBitmap,
          children: arraySpliceOut(node.children, idx),
        }
      }
      return { kind: 'bitmap', bitmap: node.bitmap, children: arrayUpdate(node.children, idx, newChild) }
    }

    case 'array': {
      const frag = (hash >>> shift) & MASK
      const child = node.children[frag]
      if (child === null) return node // key not present
      const newChild = dissocNode(ops, child, shift + SHIFT_STEP, hash, key)
      if (newChild === child) return node
      if (newChild.kind === 'empty') {
        if (node.count - 1 < MIN_ARRAY_CHILDREN) {
          return packToBitmap(node.count, frag, node.children)
        }
        return {
          kind: 'array',
          count: node.count - 1,
          children: arrayUpdate(node.children, frag, null),
        }
      }
      return { kind: 'array', count: node.count, children: arrayUpdate(node.children, frag, newChild) }
    }
  }
}

// ─── public API ───────────────────────────────────────────────────────────────

export function hamtGet<K, V>(
  ops: HamtOps<K>,
  node: HamtNode<K, V>,
  hash: number,
  key: K,
): V | typeof NOT_FOUND {
  let current = node
  let shift = 0
  while (true) {
    switch (current.kind) {
      case 'empty':
        return NOT_FOUND

      case 'leaf':
        return ops.equal(key, current.key) ? current.value : NOT_FOUND

      case 'collision': {
        if (hash !== current.hash) return NOT_FOUND
        for (const [k, v] of current.entries) {
          if (ops.equal(key, k)) return v
        }
        return NOT_FOUND
      }

      case 'bitmap': {
        const frag = (hash >>> shift) & MASK
        const bit = 1 << frag
        if ((current.bitmap & bit) === 0) return NOT_FOUND
        current = current.children[bitmapIndex(current.bitmap, bit)]
        shift += SHIFT_STEP
        break
      }

      case 'array': {
        const child = current.children[(hash >>> shift) & MASK]
        if (child === null) return NOT_FOUND
        current = child
        shift += SHIFT_STEP
        break
      }
    }
  }
}

export function hamtAssoc<K, V>(
  ops: HamtOps<K>,
  node: HamtNode<K, V>,
  hash: number,
  key: K,
  value: V,
): HamtNode<K, V> {
  return assocNode(ops, node, 0, hash, key, value)
}

export function hamtDissoc<K, V>(
  ops: HamtOps<K>,
  node: HamtNode<K, V>,
  hash: number,
  key: K,
): HamtNode<K, V> {
  return dissocNode(ops, node, 0, hash, key)
}

// Recursive count — only used in tests; CljMap tracks size externally.
export function hamtCount<K, V>(node: HamtNode<K, V>): number {
  switch (node.kind) {
    case 'empty':
      return 0
    case 'leaf':
      return 1
    case 'collision':
      return node.entries.length
    case 'bitmap':
      return node.children.reduce((acc, c) => acc + hamtCount(c), 0)
    case 'array':
      return node.children.reduce((acc, c) => acc + (c ? hamtCount(c) : 0), 0)
  }
}

export function hamtForEach<K, V>(node: HamtNode<K, V>, fn: (k: K, v: V) => void): void {
  switch (node.kind) {
    case 'empty':
      return
    case 'leaf':
      fn(node.key, node.value)
      return
    case 'collision':
      for (const [k, v] of node.entries) fn(k, v)
      return
    case 'bitmap':
      for (const child of node.children) hamtForEach(child, fn)
      return
    case 'array':
      for (const child of node.children) {
        if (child !== null) hamtForEach(child, fn)
      }
      return
  }
}

export function hamtEntries<K, V>(node: HamtNode<K, V>): [K, V][] {
  const result: [K, V][] = []
  hamtForEach(node, (k, v) => {
    result.push([k, v])
  })
  return result
}
