import { is } from '../assertions'
import { lookup } from '../env'
import { EvaluationError } from '../errors'
import { v } from '../factories'
import { getPos } from '../positions'
import { printString } from '../printer'
import type { CljValue, Env, EvaluationContext, VmChunk } from '../types'
import { Op, opcodeName } from './opcodes'

export function executeChunk(
  chunk: VmChunk,
  env: Env,
  ctx: EvaluationContext
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
      case Op.LoadGlobal: {
        const symbolIndex = chunk.code[ip++]
        const symbol = chunk.constants[symbolIndex]
        if (symbol === undefined) {
          throw new EvaluationError(`Invalid constant index: ${symbolIndex}`, {
            instruction,
            constantIndex: symbolIndex,
            ip,
            stack,
            chunk,
          })
        }
        if (!is.symbol(symbol)) {
          throw new EvaluationError(`LoadGlobal expected symbol constant`, {
            instruction,
            constantIndex: symbolIndex,
            value: symbol,
            ip,
            stack,
            chunk,
          })
        }
        try {
          const value = lookup(symbol.name, env)
          stack.push(value)
        } catch (e) {
          if (e instanceof EvaluationError && !e.pos) {
            const pos = getPos(symbol)
            if (pos) e.pos = pos
          }
          throw e
        }

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
      case Op.Pop: {
        const value = stack.pop()
        if (value === undefined) {
          throw new EvaluationError('VM stack underflow on Pop', {
            instruction,
            ip,
            stack,
            chunk,
          })
        }
        break
      }
      case Op.Call: {
        const argCount = chunk.code[ip++]
        if (argCount === undefined) {
          throw new EvaluationError(
            'VM stack underflow on Call, argCount missing',
            {
              instruction,
              ip,
              stack,
              chunk,
            }
          )
        }

        if (stack.length < argCount + 1) {
          throw new EvaluationError(
            'VM stack underflow on Call, not enough arguments',
            {
              instruction,
              ip,
              stack,
              chunk,
            }
          )
        }

        const args = stack.splice(stack.length - argCount, argCount)

        const callable = stack.pop()

        if (callable === undefined) {
          throw new EvaluationError(
            'VM stack underflow on Call, callable missing',
            {
              instruction,
              ip,
              stack,
              chunk,
            }
          )
        }

        if (!is.callable(callable)) {
          const name =
            'name' in callable ? callable.name : printString(callable)
          throw new EvaluationError(`${name} is not callable`, {
            instruction,
            ip,
            stack,
            chunk,
          })
        }

        const result = ctx.applyCallable(callable, args, env)
        stack.push(result)
        break
      }
      case Op.Return: {
        const value = stack.pop()
        return value ?? v.nil()
      }
      case Op.Jump: {
        const offset = chunk.code[ip++]
        assertJumpOffset(offset, instruction, ip, stack, chunk)
        ip += offset
        break
      }
      case Op.JumpIfFalsy: {
        const offset = chunk.code[ip++]
        assertJumpOffset(offset, instruction, ip, stack, chunk)
        const condition = stack.pop()

        if (condition === undefined) {
          throw new EvaluationError('VM stack underflow on JumpIfFalsy', {
            instruction,
            ip,
            stack,
            chunk,
          })
        }
        if (is.falsy(condition)) {
          ip += offset
        }

        break
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

function assertJumpOffset(
  offset: number | undefined,
  instruction: number,
  ip: number,
  stack: CljValue[],
  chunk: VmChunk
): asserts offset is number {
  if (
    offset === undefined ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    ip + offset > chunk.code.length
  ) {
    throw new EvaluationError(`Invalid jump offset: ${offset}`, {
      instruction,
      offset,
      ip,
      stack,
      chunk,
    })
  }
}
