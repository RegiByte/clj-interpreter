import { is } from '../assertions'
import { v } from '../factories'
import { valueKeywords } from '../keywords'
import { getPos } from '../positions'
import type {
  CljList,
  CljMap,
  CljSet,
  CljValue,
  CljVector,
  OpCode,
  Pos,
  VmChunk,
} from '../types'
import {
  addConstant,
  emit,
  emitOperand,
  emitTransaction,
  makeChunk,
} from './chunk'
import { Op } from './opcodes'

export function compileVm(node: CljValue): VmChunk | null {
  const chunk = makeChunk('vm-expression')

  if (!emitExpression(chunk, node)) {
    return null
  }

  emit(chunk, Op.Return)
  return chunk
}

function emitExpression(chunk: VmChunk, node: CljValue): boolean {
  switch (node.kind) {
    case valueKeywords.number:
    case valueKeywords.string:
    case valueKeywords.character:
    case valueKeywords.keyword:
    case valueKeywords.regex: {
      const index = addConstant(chunk, node)
      emit(chunk, Op.Constant)
      emitOperand(chunk, index)
      return true
    }
    case valueKeywords.nil:
      emit(chunk, Op.Nil)
      return true
    case valueKeywords.boolean:
      emit(chunk, node.value ? Op.True : Op.False)
      return true
    case valueKeywords.symbol: {
      const symbolName = node.name
      const slashIdx = symbolName.indexOf('/')
      // qualified symbol not supported yet
      if (slashIdx > 0 && slashIdx < symbolName.length - 1) return false
      const index = addConstant(chunk, node)
      const pos = getPos(node) ?? null
      emit(chunk, Op.LoadGlobal, pos)
      emitOperand(chunk, index, pos)
      return true
    }
    case valueKeywords.list: {
      if (node.value.length === 0) return false
      const head = node.value[0]
      if (!is.symbol(head)) return false
      if (head.name === 'do') return emitDo(chunk, node)
      if (head.name === 'if') return emitIf(chunk, node)

      return emitCall(chunk, node)
    }
    case valueKeywords.vector: {
      return emitVector(chunk, node)
    }
    case valueKeywords.map: {
      return emitMap(chunk, node)
    }
    case valueKeywords.set: {
      return emitSet(chunk, node)
    }
    default:
      return false
  }
}

function emitDo(chunk: VmChunk, node: CljList): boolean {
  return emitTransaction(chunk, () => {
    const body = node.value.slice(1)
    if (body.length === 0) {
      emit(chunk, Op.Nil, getPos(node) ?? null)
      return true
    }

    for (let i = 0; i < body.length; i++) {
      const form = body[i]

      if (!emitExpression(chunk, form)) return false

      if (i < body.length - 1) {
        emit(chunk, Op.Pop, getPos(node) ?? null)
      }
    }

    return true
  })
}

function emitIf(chunk: VmChunk, node: CljList): boolean {
  return emitTransaction(chunk, () => {
    const parts = node.value
    if (parts.length < 3 || parts.length > 4) return false

    const test = parts[1]
    const thenBranch = parts[2]
    const elseBranch = parts[3] ?? v.nil()

    if (!emitExpression(chunk, test)) return false

    const elseJump = emitJump(chunk, Op.JumpIfFalsy, getPos(node) ?? null)

    if (!emitExpression(chunk, thenBranch)) return false

    const endJump = emitJump(chunk, Op.Jump, getPos(node) ?? null)

    patchJump(chunk, elseJump)

    if (!emitExpression(chunk, elseBranch)) return false

    patchJump(chunk, endJump)

    return true
  })
}

function emitJump(chunk: VmChunk, opcode: OpCode, pos: Pos | null): number {
  emit(chunk, opcode, pos)

  const operandOffset = chunk.code.length
  emitOperand(chunk, 0, pos) // placeholder

  return operandOffset
}

function patchJump(chunk: VmChunk, operandOffset: number): void {
  const jumpFrom = operandOffset + 1 // +1 for the operand reading itself
  const jumpTo = chunk.code.length
  const offset = jumpTo - jumpFrom

  chunk.code[operandOffset] = offset
}

function emitCall(chunk: VmChunk, node: CljList): boolean {
  if (node.value.length === 0) return false // empty list fallback

  return emitTransaction(chunk, () => {
    const callee = node.value[0]
    const args = node.value.slice(1)
    if (!emitExpression(chunk, callee)) return false

    for (let i = 0; i < args.length; i++) {
      if (!emitExpression(chunk, args[i])) return false
    }

    const pos = getPos(node) ?? null
    emit(chunk, Op.Call, pos)
    emitOperand(chunk, args.length, pos)

    return true
  })
}

function emitVector(chunk: VmChunk, node: CljVector): boolean {
  return emitTransaction(chunk, () => {
    const elements = node.value
    if (elements.length === 0) {
      // Emits an empty MakeVector 0 to return an empty vector
      // could just bail here too, may do that later
      emit(chunk, Op.MakeVector, getPos(node) ?? null)
      emitOperand(chunk, 0, getPos(node) ?? null)
      return true
    }
    for (let i = 0; i < elements.length; i++) {
      if (!emitExpression(chunk, elements[i])) return false
    }

    const pos = getPos(node) ?? null
    emit(chunk, Op.MakeVector, pos)
    emitOperand(chunk, elements.length, pos)
    return true
  })
}

function emitMap(chunk: VmChunk, node: CljMap): boolean {
  return emitTransaction(chunk, () => {
    const entries = node.entries
    if (entries.length === 0) {
      emit(chunk, Op.MakeMap, getPos(node) ?? null)
      emitOperand(chunk, 0, getPos(node) ?? null)
      return true
    }

    for (const [key, value] of entries) {
      if (!emitExpression(chunk, key)) return false
      if (!emitExpression(chunk, value)) return false
    }

    const pos = getPos(node) ?? null
    emit(chunk, Op.MakeMap, pos)
    emitOperand(chunk, entries.length, pos)
    return true
  })
}

function emitSet(chunk: VmChunk, node: CljSet): boolean {
  return emitTransaction(chunk, () => {
    const elements = node.values
    if (elements.length === 0) {
      emit(chunk, Op.MakeSet, getPos(node) ?? null)
      emitOperand(chunk, 0, getPos(node) ?? null)
      return true
    }

    for (let i = 0; i < elements.length; i++) {
      if (!emitExpression(chunk, elements[i])) return false
    }

    const pos = getPos(node) ?? null
    emit(chunk, Op.MakeSet, pos)
    emitOperand(chunk, elements.length, pos)
    return true
  })
}
