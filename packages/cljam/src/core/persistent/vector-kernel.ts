// Persistent vector trie kernel — Clojure's PersistentVector: a 32-way bitmapped
// trie with a tail buffer. Dense and index-addressed (no hashing, no holes, no
// collisions) — strictly simpler than the HAMT in hamt-kernel.ts.
//
// Pure functions over opaque CljValue leaf payloads. Plugged into nothing in
// Phase A — proven in isolation by the fuzz-vs-array oracle before any production
// wiring (Phase B) touches it.
//
// Import hygiene (the map arc's hardest-won lesson): this file imports ONLY the
// CljValue type. No hash/equality/factories — those would form a cycle. The
// _hash field is declared here but NEVER maintained by the kernel; incremental
// hashing lives one layer up in vector-helpers.ts (Phase B).
//
// Type placement (session 333): TrieNode and TrieVectorData are authored here,
// kernel-local, so Phase A modifies zero production files. Phase B lifts
// TrieVectorData into types.ts (type-only import of TrieNode back from here,
// exactly as types.ts imports HamtNode today).

import type { CljValue, TrieVectorData } from '../types'

const BITS = 5
const WIDTH = 1 << BITS // 32 — branching factor and tail capacity
const MASK = WIDTH - 1 // 31 (0b11111) — the low 5 bits of an index

// A node is a uniform array of 32 children: either 32 leaf payloads (a leaf node,
// reached when the index walk hits shift 0) or 32 child nodes (an internal node).
// Internal-vs-leaf is disambiguated purely by depth (shift), exactly as Clojure's
// uniform Object[]. The fuzz harness is what guarantees we never confuse them.
export type TrieNode = CljValue[] | TrieNode[]

// TrieVectorData now lives in types.ts (it joins the CljVectorData union next to
// ArrayVectorData) and is imported back here — a type-only cycle that erases at
// runtime. The kernel still owns TrieNode. Field docs, for reference:
//   count: total element count (trie portion + tail)
//   shift: bits to shift for the root level = 5 * (number of internal levels)
//   root:  the upper tree — everything EXCEPT the tail. Always an internal node.
//   tail:  the trailing 0..32 elements, kept flat for O(1) amortized conj
//   _hash: maintained by the helpers layer, never by the kernel

// The root is always an internal node (never a bare leaf) and shift is always ≥ 5,
// even when the trie portion is empty (everything sits in the tail). This invariant
// keeps arrayFor's walk uniform — it always descends at least once from the root.
export const EMPTY_TRIE: TrieVectorData = {
  kind: 'trie',
  count: 0,
  shift: BITS,
  root: [],
  tail: [],
}

// Number of elements held in complete trie leaves (i.e. NOT in the tail). The tail
// holds count - tailOffset elements, always in [1, 32] for a non-empty vector.
function tailOffset(count: number): number {
  if (count < WIDTH) return 0
  return ((count - 1) >>> BITS) << BITS
}

// The leaf array containing index i. Precondition: 0 <= i < count (bounds/OOB
// semantics are the caller's job per the seq layer — gotchas.md #11).
function arrayFor(data: TrieVectorData, i: number): CljValue[] {
  if (i >= tailOffset(data.count)) return data.tail
  let node: TrieNode = data.root
  // Consume 5 index bits per level, most-significant first, until we reach the leaf.
  for (let level = data.shift; level > 0; level -= BITS) {
    node = (node as TrieNode[])[(i >>> level) & MASK]
  }
  return node as CljValue[]
}

export function trieNth(data: TrieVectorData, i: number): CljValue {
  // Fail fast on OOB rather than letting a bad index walk into an undefined leaf
  // slot and surface as a confusing error far from the source (JS arrays return
  // undefined for OOB — the opposite of fail-clearly). Clojure's public nth does
  // the same checkIndex. The guard lives here, on the one public entry that takes
  // a caller-supplied index — NOT in arrayFor, whose other callers (triePop,
  // trieToArray) always pass an index that is valid by construction. Phase B's
  // vectorNth/vectorGet layer Clojure's throw-vs-nil OOB semantics on top.
  if (i < 0 || i >= data.count) {
    throw new Error(`vector-kernel: index ${i} out of bounds (count=${data.count})`)
  }
  return arrayFor(data, i)[i & MASK]
}

// Build a chain of single-child internal nodes from `level` down to 0, parking the
// leaf at the bottom. Used when the tree must grow taller than its current root.
function newPath(level: number, leaf: CljValue[]): TrieNode {
  if (level === 0) return leaf
  return [newPath(level - BITS, leaf)]
}

// Insert a full tail leaf at the next free slot, copying only the root-to-leaf path
// (every off-path subtree is shared by reference — the structural-sharing dividend).
// `count` is the OLD count (before the conj), matching Clojure's `cnt`.
function pushTail(
  level: number,
  parent: TrieNode,
  leaf: CljValue[],
  count: number
): TrieNode {
  const subidx = ((count - 1) >>> level) & MASK
  const ret = (parent as TrieNode[]).slice()
  if (level === BITS) {
    ret[subidx] = leaf
  } else {
    const child = (parent as TrieNode[])[subidx]
    ret[subidx] =
      child !== undefined
        ? pushTail(level - BITS, child, leaf, count)
        : newPath(level - BITS, leaf)
  }
  return ret
}

export function trieConj(data: TrieVectorData, x: CljValue): TrieVectorData {
  const { count, shift, root, tail } = data
  // Room in the tail? O(32) copy, amortizes the cost of the rarer tree push.
  if (count - tailOffset(count) < WIDTH) {
    return { kind: 'trie', count: count + 1, shift, root, tail: [...tail, x] }
  }
  // Tail is full (32) — push it into the tree as a leaf and start a fresh tail.
  let newRoot: TrieNode
  let newShift = shift
  if (count >>> BITS > 1 << shift) {
    // The root can't hold another leaf at this height — grow one level taller.
    newRoot = [root, newPath(shift, tail)]
    newShift = shift + BITS
  } else {
    newRoot = pushTail(shift, root, tail, count)
  }
  return {
    kind: 'trie',
    count: count + 1,
    shift: newShift,
    root: newRoot,
    tail: [x],
  }
}

// Path-copy update at an existing index. Off-path subtrees are shared by reference.
function doAssoc(
  level: number,
  node: TrieNode,
  i: number,
  x: CljValue
): TrieNode {
  const ret = (node as TrieNode[]).slice()
  if (level === 0) {
    ;(ret as unknown as CljValue[])[i & MASK] = x
  } else {
    const subidx = (i >>> level) & MASK
    ret[subidx] = doAssoc(level - BITS, (node as TrieNode[])[subidx], i, x)
  }
  return ret
}

export function trieAssoc(
  data: TrieVectorData,
  i: number,
  x: CljValue
): TrieVectorData {
  const { count, shift, root, tail } = data
  // Clojure allows assoc at the end (i === count) as an append.
  if (i === count) return trieConj(data, x)
  if (i >= tailOffset(count)) {
    const newTail = tail.slice()
    newTail[i & MASK] = x
    return { kind: 'trie', count, shift, root, tail: newTail }
  }
  return { kind: 'trie', count, shift, root: doAssoc(shift, root, i, x), tail }
}

// Copy the trie path that drops the last leaf. Returns null when the whole subtree
// empties out. Pop always removes the highest-index child, so dropping it is a
// truncating slice (keeps every array dense — no Clojure-style null holes).
// `count` is the OLD count (before the pop).
function popTail(
  level: number,
  node: TrieNode,
  count: number
): TrieNode | null {
  const subidx = ((count - 2) >>> level) & MASK
  if (level > BITS) {
    const newChild = popTail(level - BITS, (node as TrieNode[])[subidx], count)
    if (newChild === null) {
      if (subidx === 0) return null
      return (node as TrieNode[]).slice(0, subidx)
    }
    const ret = (node as TrieNode[]).slice()
    ret[subidx] = newChild
    return ret
  }
  // level === BITS: children are leaves.
  if (subidx === 0) return null
  return (node as TrieNode[]).slice(0, subidx)
}

export function triePop(data: TrieVectorData): TrieVectorData {
  const { count, shift, root, tail } = data
  if (count === 0) throw new Error('vector-kernel: pop on empty vector')
  if (count === 1) return EMPTY_TRIE
  // More than one element in the tail — just shrink the tail.
  if (count - tailOffset(count) > 1) {
    return {
      kind: 'trie',
      count: count - 1,
      shift,
      root,
      tail: tail.slice(0, -1),
    }
  }
  // The tail has exactly one element — the new tail is the previous leaf, pulled
  // out of the trie; the trie path is copied without it, possibly shrinking height.
  //
  // newTail is a SHARED reference to the very leaf node that popTail is about to
  // drop from the trie path. This is intentional structural sharing: the popped
  // result owns this array as its tail, while the original vector still reaches it
  // through its (unchanged) trie — both treat it as immutable, so the alias is
  // safe and free. Do NOT slice or mutate this array here or in Phase B wiring;
  // doing so would make the trie and the tail diverge.
  const newTail = arrayFor(data, count - 2)
  let newRoot: TrieNode = popTail(shift, root, count) ?? []
  let newShift = shift
  // Root collapsed to a single child and we have height to spare — drop a level.
  if (shift > BITS && (newRoot as TrieNode[]).length === 1) {
    newRoot = (newRoot as TrieNode[])[0]
    newShift -= BITS
  }
  return {
    kind: 'trie',
    count: count - 1,
    shift: newShift,
    root: newRoot,
    tail: newTail,
  }
}

// Bulk build — O(n) one-shot, fills leaves directly rather than folding 32-element
// tail copies through trieConj (which would carry a ~16× constant). The preferred
// path for `vec`/`into` over a large seq. Equivalent structure to repeated conj;
// the fuzz harness asserts that equivalence.
export function trieFromArray(items: CljValue[]): TrieVectorData {
  const n = items.length
  if (n === 0) return EMPTY_TRIE
  // Everything fits in a tail — trie portion stays empty (root is an empty node).
  if (n <= WIDTH) {
    return {
      kind: 'trie',
      count: n,
      shift: BITS,
      root: [],
      tail: items.slice(),
    }
  }
  const tailLen = ((n - 1) % WIDTH) + 1 // 1..32 trailing elements
  const tailOff = n - tailLen
  const tail = items.slice(tailOff)

  // Chop the trie portion into full 32-element leaves, then group bottom-up into
  // internal nodes until a single root remains. The do/while runs at least once,
  // so even a single leaf gets wrapped in an internal node (shift never stays 0).
  let nodes: TrieNode[] = []
  for (let i = 0; i < tailOff; i += WIDTH) {
    nodes.push(items.slice(i, i + WIDTH))
  }
  let shift = 0
  do {
    const parents: TrieNode[] = []
    for (let i = 0; i < nodes.length; i += WIDTH)
      parents.push(nodes.slice(i, i + WIDTH))
    nodes = parents
    shift += BITS
  } while (nodes.length > 1)

  return { kind: 'trie', count: n, shift, root: nodes[0], tail }
}

// Materialize to a flat array — the compat getter (Phase B) and the fuzz oracle use
// this. Walks full leaves directly then appends the tail; O(n), allocates once.
export function trieToArray(data: TrieVectorData): CljValue[] {
  const out: CljValue[] = []
  const off = tailOffset(data.count)
  for (let i = 0; i < off; i += WIDTH) {
    const leaf = arrayFor(data, i)
    for (let j = 0; j < leaf.length; j++) out.push(leaf[j])
  }
  for (let j = 0; j < data.tail.length; j++) out.push(data.tail[j])
  return out
}
