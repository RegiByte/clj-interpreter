import type { CljValue, Pos, VmChunk } from '../types'
import { Op } from './opcodes'

type ChunkSnapshot = {
  codeLength: number
  constantsLength: number
  positionsLength: number
  innerFunctionsLength: number
  catchTablesLength: number
  maxStack: number
  stackDepth: number
  pendingInstruction: PendingInstruction | null
}

type PendingInstruction = {
  opcode: number
  operands: number[]
}

const stackDepthByChunk = new WeakMap<VmChunk, number>()
const pendingInstructionByChunk = new WeakMap<VmChunk, PendingInstruction>()

export function makeChunk(name?: string): VmChunk {
  const chunk = {
    code: [],
    constants: [],
    positions: [],
    name,
    maxStack: 0,
    localCount: 0,
    innerFunctions: [],
    catchTables: [],
  }
  stackDepthByChunk.set(chunk, 0)
  return chunk
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
  beginInstruction(chunk, byte)
}

export function emitOperand(
  chunk: VmChunk,
  operand: number,
  pos: Pos | null = null
): void {
  chunk.code.push(operand)
  chunk.positions.push(pos)
  recordOperand(chunk, operand)
}

export function snapshotChunk(chunk: VmChunk): ChunkSnapshot {
  const pending = pendingInstructionByChunk.get(chunk)
  return {
    codeLength: chunk.code.length,
    constantsLength: chunk.constants.length,
    positionsLength: chunk.positions.length,
    innerFunctionsLength: chunk.innerFunctions.length,
    catchTablesLength: chunk.catchTables.length,
    maxStack: chunk.maxStack,
    stackDepth: getStackDepth(chunk),
    pendingInstruction:
      pending === undefined
        ? null
        : { opcode: pending.opcode, operands: [...pending.operands] },
  }
}

export function rollbackChunk(chunk: VmChunk, snapshot: ChunkSnapshot): void {
  chunk.code.length = snapshot.codeLength
  chunk.constants.length = snapshot.constantsLength
  chunk.positions.length = snapshot.positionsLength
  chunk.innerFunctions.length = snapshot.innerFunctionsLength
  chunk.catchTables.length = snapshot.catchTablesLength
  chunk.maxStack = snapshot.maxStack
  stackDepthByChunk.set(chunk, snapshot.stackDepth)
  if (snapshot.pendingInstruction === null) {
    pendingInstructionByChunk.delete(chunk)
  } else {
    pendingInstructionByChunk.set(chunk, {
      opcode: snapshot.pendingInstruction.opcode,
      operands: [...snapshot.pendingInstruction.operands],
    })
  }
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

function beginInstruction(chunk: VmChunk, opcode: number): void {
  pendingInstructionByChunk.delete(chunk)

  const operandCount = getOperandCount(opcode)
  if (operandCount === 0) {
    applyStackDelta(chunk, getStackDelta(opcode, []))
    return
  }

  pendingInstructionByChunk.set(chunk, { opcode, operands: [] })
}

function recordOperand(chunk: VmChunk, operand: number): void {
  const pending = pendingInstructionByChunk.get(chunk)
  if (pending === undefined) return

  pending.operands.push(operand)
  if (pending.operands.length < getOperandCount(pending.opcode)) return

  pendingInstructionByChunk.delete(chunk)
  applyStackDelta(chunk, getStackDelta(pending.opcode, pending.operands))
}

function getOperandCount(opcode: number): number {
  switch (opcode) {
    case Op.Constant:
    case Op.LoadLocal:
    case Op.StoreLocal:
    case Op.LoadGlobal:
    case Op.LoadQualified:
    case Op.LoadUpvalue:
    case Op.MakeVector:
    case Op.MakeMap:
    case Op.MakeSet:
    case Op.WithMeta:
    case Op.Call:
    case Op.Closure:
    case Op.Jump:
    case Op.JumpIfFalsy:
    case Op.EnterFinally:
    case Op.Add:
    case Op.Sub:
    case Op.Mul:
    case Op.Div:
    case Op.Lt:
    case Op.Lte:
    case Op.Gt:
    case Op.Gte:
    case Op.Eq:
      return 1
    case Op.Recur:
      return 3
    case Op.FnRecur:
      return 1
    case Op.FnRecurRest:
      return 2
    case Op.PushTry:
      return 3
    default:
      return 0
  }
}

function getStackDelta(opcode: number, operands: number[]): number {
  switch (opcode) {
    case Op.Constant:
    case Op.Nil:
    case Op.True:
    case Op.False:
    case Op.LoadLocal:
    case Op.LoadGlobal:
    case Op.LoadQualified:
    case Op.LoadUpvalue:
    case Op.Closure:
      return 1
    case Op.Pop:
    case Op.StoreLocal:
    case Op.Return:
    case Op.JumpIfFalsy:
    case Op.Throw:
      return -1
    case Op.PushTry:
    case Op.PopTry:
    case Op.EnterFinally:
    case Op.EndFinally:
      return 0
    case Op.MakeVector:
    case Op.MakeSet:
      return 1 - countOperand(operands[0])
    case Op.MakeMap:
      return 1 - countOperand(operands[0]) * 2
    case Op.WithMeta:
      return 0
    case Op.Call:
      return -countOperand(operands[0])
    case Op.Add:
    case Op.Sub:
    case Op.Mul:
    case Op.Div:
    case Op.Lt:
    case Op.Lte:
    case Op.Gt:
    case Op.Gte:
    case Op.Eq:
      return 1 - countOperand(operands[0])
    case Op.Recur:
      return -countOperand(operands[1])
    case Op.FnRecur:
      return -countOperand(operands[0])
    case Op.FnRecurRest:
      return -countOperand(operands[0])
    default:
      return 0
  }
}

function countOperand(operand: number | undefined): number {
  return typeof operand === 'number' && Number.isInteger(operand) && operand > 0
    ? operand
    : 0
}

function applyStackDelta(chunk: VmChunk, delta: number): void {
  const stackDepth = Math.max(0, getStackDepth(chunk) + delta)
  stackDepthByChunk.set(chunk, stackDepth)
  chunk.maxStack = Math.max(chunk.maxStack, stackDepth)
}

function getStackDepth(chunk: VmChunk): number {
  return stackDepthByChunk.get(chunk) ?? 0
}
