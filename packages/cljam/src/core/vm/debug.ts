import { printString } from '../printer'
import type { VmChunk } from '../types'
import { Op, opcodeName } from './opcodes'

export function disassembleChunk(chunk: VmChunk): string {
  const lines: string[] = []
  lines.push(`== ${chunk.name ?? 'chunk'} ==`)

  let offset = 0
  while (offset < chunk.code.length) {
    offset = disassembleInstruction(chunk, offset, lines)
  }

  return lines.join('\n')
}

function disassembleInstruction(
  chunk: VmChunk,
  offset: number,
  lines: string[]
): number {
  const instruction = chunk.code[offset]
  const name = opcodeName(instruction)

  switch (instruction) {
    case Op.Constant: {
      const constantIndex = chunk.code[offset + 1]
      const constant = chunk.constants[constantIndex]
      const rendered =
        constant === undefined ? '<missing>' : printString(constant)
      lines.push(
        `${formatOffset(offset)} ${name} ${constantIndex} ; ${rendered}`
      )
      return offset + 2
    }
    case Op.StoreLocal:
    case Op.LoadLocal: {
      const slot = chunk.code[offset + 1]
      lines.push(`${formatOffset(offset)} ${name} ${slot}`)
      return offset + 2
    }
    case Op.LoadGlobal:
    case Op.LoadQualified: {
      const constantIndex = chunk.code[offset + 1]
      const constant = chunk.constants[constantIndex]
      const rendered =
        constant === undefined ? '<missing>' : printString(constant)

      lines.push(
        `${formatOffset(offset)} ${name} ${constantIndex} ; ${rendered}`
      )

      return offset + 2
    }
    case Op.Jump:
    case Op.JumpIfFalsy: {
      const operandOffset = chunk.code[offset + 1]
      const offsetAfterOperand = 2 + offset
      const finalOffset = offsetAfterOperand + operandOffset
      lines.push(
        `${formatOffset(offset)} ${name} ${operandOffset} -> ${formatOffset(finalOffset)}`
      )
      return offset + 2
    }
    case Op.Call: {
      const operandOffset = chunk.code[offset + 1]
      lines.push(`${formatOffset(offset)} ${name} ${operandOffset}`)
      return offset + 2
    }
    case Op.Nil:
    case Op.True:
    case Op.False:
    case Op.Pop:
    case Op.Return: {
      lines.push(`${formatOffset(offset)} ${name}`)
      return offset + 1
    }
    case Op.MakeVector:
    case Op.MakeMap:
    case Op.MakeSet: {
      const operandOffset = chunk.code[offset + 1]
      lines.push(`${formatOffset(offset)} ${name} ; ${operandOffset}`)
      return offset + 2
    }
    default: {
      lines.push(
        `${formatOffset(offset)} ${name} ; [disassembleInstruction] unknown opcode`
      )
      return offset + 1
    }
  }
}

function formatOffset(offset: number): string {
  return offset.toString().padStart(4, '0')
}
