/**
 * The AST walker's runtime scope model.
 *
 * The analyzer resolved every local reference to a flat per-arity slot index
 * (`LocalNode.slot`) or an upvalue index (`LocalNode.upvalueIndex`), erasing
 * `let`/frame boundaries on purpose. The walker honors that layout: ONE flat
 * frame per fn application (and one per top-level form), with `let`/`loop`/
 * `catch` writing into pre-assigned indices — no per-form allocation, no
 * Env-chain walk. This is the tree-walking analogue of the VM's `locals` array.
 */

import { cljNil } from '../factories'
import type { CljValue } from '../types'

export type EvalFrame = {
  /** Indexed locals; the analyzer assigned the slot numbers. */
  slots: CljValue[]
  /** Captured values, indexed by `LocalNode.upvalueIndex`. */
  upvalues: CljValue[]
}

export function makeFrame(slotCount: number): EvalFrame {
  const slots: CljValue[] = new Array(slotCount)
  for (let i = 0; i < slotCount; i++) slots[i] = cljNil()
  return { slots, upvalues: [] }
}
