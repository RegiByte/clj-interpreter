import { EvaluationError } from '../errors'
import { v } from '../factories'
import type { CljValue, Env, EvaluationContext, VmChunk } from '../types'
import { Op, opcodeName } from './opcodes'

export function executeChunk(
  chunk: VmChunk,
  _env: Env,
  _ctx: EvaluationContext
): CljValue {
  const stack: CljValue[] = []
  let ip = 0

  while (ip < chunk.code.length) {
    const instruction = chunk.code[ip++]
    switch (instruction) {
      case Op.Constant: {
        const constantIndex = chunk.code[ip++]
        const value = chunk.constants[constantIndex]
        if (value === undefined) {
          throw new EvaluationError(
            `Invalid constant index: ${constantIndex}`,
            { instruction, constantIndex, ip, stack, chunk }
          )
        }
        stack.push(value)
        break
      }
      case Op.Nil: {
        stack.push(v.nil())
        break
      }
      case Op.True: {
        stack.push(v.boolean(true))
        break
      }
      case Op.False: {
        stack.push(v.boolean(false))
        break
      }
      case Op.Return: {
        const value = stack.pop()
        return value ?? v.nil()
      }
      default: {
        throw new EvaluationError(
          `Unknown VM opcode: ${opcodeName(instruction)}`,
          {
            instruction,
            ip,
            stack,
            chunk,
          }
        )
      }
    }
  }

  return v.nil()
}
