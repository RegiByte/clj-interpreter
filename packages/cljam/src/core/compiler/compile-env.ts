import type { CompileEnv, SlotRef } from '../types.ts'

/**
 * Finds a slot in the compile environment by symbol name.
 * Returns null if the slot is not found.
 * Slots are equivalent to local bindings in the interpreter.
 * The difference is that slots use array indexing instead of recursive name lookup.
 * Slots are allocated at compile time, which reduces object allocation overhead.
 * The values are swapped temporarily duration evaluation of compiled code.
 */
export function findSlot(
  symbolName: string,
  compileEnv: CompileEnv | null
): SlotRef | null {
  let current: CompileEnv | null = compileEnv
  while (current) {
    const slot = current.bindings.get(symbolName)
    if (slot !== undefined) return slot
    current = current.outer
  }
  return null
}

/**
 * Finds the closest loop target in the compile environment.
 * Used for loop/recur compilation, this eliminates the overhead of throwing a RecurSignal,
 * The strategy used by the evaluator. Instead, a loop start marks a target in the compileEnv
 * the recur finds the nearest target and updates the bindings.
 * The compiled loop will observe the bindings after evaluating the body,
 * while they are not null, the loop will continue.
 */
export function findLoopTarget(compileEnv: CompileEnv | null) {
  if (compileEnv === null) return null
  let current: CompileEnv | null = compileEnv
  while (current) {
    if (current.loop) return current.loop
    current = current.outer
  }
  return null
}
