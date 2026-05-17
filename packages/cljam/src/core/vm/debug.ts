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
    case Op.LoadLocal:
    case Op.LoadUpvalue: {
      const slot = chunk.code[offset + 1]
      lines.push(`${formatOffset(offset)} ${name} ${slot}`)
      return offset + 2
    }
    case Op.LoadGlobal:
    case Op.LoadQualified:
    case Op.LoadVar:
    case Op.Def:
    case Op.DefMacro:
    case Op.JsGetProp:
    case Op.PushDynamicBinding:
    case Op.SetDynamic: {
      const constantIndex = chunk.code[offset + 1]
      const constant = chunk.constants[constantIndex]
      const rendered =
        constant === undefined ? '<missing>' : printString(constant)

      lines.push(
        `${formatOffset(offset)} ${name} ${constantIndex} ; ${rendered}`
      )

      return offset + 2
    }
    case Op.LoadLexicalVar: {
      const lookupIndex = chunk.code[offset + 1]
      const lookup = chunk.lexicalVarLookups[lookupIndex]
      const renderedSymbol =
        lookup === undefined ? '<missing>' : printString(lookup.symbol)
      const renderedCandidates =
        lookup === undefined
          ? '<missing>'
          : lookup.candidates
              .map((candidate) => `${candidate.kind} ${candidate.slot}`)
              .join(', ')

      lines.push(
        `${formatOffset(offset)} ${name} ${lookupIndex} ; ${renderedSymbol} [${renderedCandidates}]`
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
    case Op.JsNew: {
      const argc = chunk.code[offset + 1]
      lines.push(`${formatOffset(offset)} ${name} ${argc}`)
      return offset + 2
    }
    case Op.JsInvoke: {
      const constantIndex = chunk.code[offset + 1]
      const argc = chunk.code[offset + 2]
      const constant = chunk.constants[constantIndex]
      const rendered =
        constant === undefined ? '<missing>' : printString(constant)
      lines.push(
        `${formatOffset(offset)} ${name} ${constantIndex} ; ${rendered} ${argc}`
      )
      return offset + 3
    }
    case Op.WithMeta: {
      const constantIndex = chunk.code[offset + 1]
      const constant = chunk.constants[constantIndex]
      const rendered =
        constant === undefined ? '<missing>' : printString(constant)
      lines.push(
        `${formatOffset(offset)} ${name} ${constantIndex} ; ${rendered}`
      )
      return offset + 2
    }
    case Op.Closure: {
      const templateIndex = chunk.code[offset + 1]
      lines.push(`${formatOffset(offset)} ${name} ${templateIndex}`)
      return offset + 2
    }
    case Op.PushTry: {
      const catchTableIndex = chunk.code[offset + 1]
      const finallyIp = chunk.code[offset + 2]
      const afterIp = chunk.code[offset + 3]
      const renderedFinally =
        finallyIp === -1 ? 'none' : formatOffset(finallyIp)
      lines.push(
        `${formatOffset(offset)} ${name} ${catchTableIndex} finally ${renderedFinally} after ${formatOffset(afterIp)}`
      )
      return offset + 4
    }
    case Op.EnterFinally: {
      const afterIp = chunk.code[offset + 1]
      lines.push(
        `${formatOffset(offset)} ${name} after ${formatOffset(afterIp)}`
      )
      return offset + 2
    }
    case Op.Add:
    case Op.Sub:
    case Op.Mul:
    case Op.Div:
    case Op.Lt:
    case Op.Lte:
    case Op.Gt:
    case Op.Gte:
    case Op.Eq: {
      const argc = chunk.code[offset + 1]
      lines.push(`${formatOffset(offset)} ${name} ${argc}`)
      return offset + 2
    }
    case Op.Nil:
    case Op.True:
    case Op.False:
    case Op.Pop:
    case Op.Return:
    case Op.Throw:
    case Op.PopTry:
    case Op.PushBindingFrame:
    case Op.PopBindingFrame:
    case Op.EndFinally: {
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
    case Op.Recur: {
      const localStart = chunk.code[offset + 1]
      const localCount = chunk.code[offset + 2]
      const loopHeader = chunk.code[offset + 3]

      lines.push(
        `${formatOffset(offset)} ${name} ${localStart} ${localCount} -> ${formatOffset(loopHeader)}`
      )

      return offset + 4
    }
    case Op.FnRecur: {
      const argc = chunk.code[offset + 1]
      lines.push(`${formatOffset(offset)} ${name} ${argc} -> 0000`)
      return offset + 2
    }
    case Op.FnRecurRest: {
      const argc = chunk.code[offset + 1]
      const fixedParamCount = chunk.code[offset + 2]
      lines.push(
        `${formatOffset(offset)} ${name} ${argc} ${fixedParamCount} -> 0000`
      )
      return offset + 3
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
