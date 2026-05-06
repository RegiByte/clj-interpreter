import { valueKeywords } from '../keywords'
import type { CljValue, VmChunk } from '../types'
import { addConstant, emit, emitOperand, makeChunk } from './chunk'
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
    case valueKeywords.regex:
      const index = addConstant(chunk, node)
      emit(chunk, Op.Constant)
      emitOperand(chunk, index)
      return true
    case valueKeywords.nil:
      emit(chunk, Op.Nil)
      return true
    case valueKeywords.boolean:
      emit(chunk, node.value ? Op.True : Op.False)
      return true
    default:
      return false
  }
}
