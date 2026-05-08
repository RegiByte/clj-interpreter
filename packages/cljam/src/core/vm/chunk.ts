import type { CljValue, Pos, VmChunk } from '../types'

type ChunkSnapshot = {
  codeLength: number
  constantsLength: number
  positionsLength: number
}

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

export function snapshotChunk(chunk: VmChunk): ChunkSnapshot {
  return {
    codeLength: chunk.code.length,
    constantsLength: chunk.constants.length,
    positionsLength: chunk.positions.length,
  }
}

export function rollbackChunk(
  chunk: VmChunk,
  snapshot: ChunkSnapshot
): void {
  chunk.code.length = snapshot.codeLength
  chunk.constants.length = snapshot.constantsLength
  chunk.positions.length = snapshot.positionsLength
}

export function emitTransaction(
  chunk: VmChunk,
  emitBody: () => boolean
): boolean {
  const snapshot = snapshotChunk(chunk)

  if (emitBody()) return true

  rollbackChunk(chunk, snapshot)
  return false
}
