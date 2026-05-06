import type { CljValue, Pos, VmChunk } from '../types'

export function makeChunk(name?: string): VmChunk {
  return {
    code: [],
    constants: [],
    positions: [],
    name,
    maxStack: 0,
    localCount: 0,
  }
}

export function addConstant(chunk: VmChunk, value: CljValue): number {
  chunk.constants.push(value)
  return chunk.constants.length - 1
}

export function emit(
  chunk: VmChunk,
  byte: number,
  pos: Pos | null = null
): void {
  chunk.code.push(byte)
  chunk.positions.push(pos)
}

export function emitOperand(
  chunk: VmChunk,
  operand: number,
  pos: Pos | null = null
): void {
  emit(chunk, operand, pos)
}
