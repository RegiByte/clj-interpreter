import { is } from '../assertions'
import { derefValue, getNamespaceEnv, lookup } from '../env'
import { EvaluationError, isEvaluationError } from '../errors'
import { v } from '../factories'
import { getPos } from '../positions'
import { printString } from '../printer'
import type { CljValue, Env, EvaluationContext, Pos, VmChunk } from '../types'
import { Op, opcodeName } from './opcodes'

export function executeChunk(
  chunk: VmChunk,
  env: Env,
  ctx: EvaluationContext,
  locals: CljValue[] = []
): CljValue {
  const stack: CljValue[] = []
  let ip = 0

  while (ip < chunk.code.length) {
    const instructionOffset = ip
    const instruction = chunk.code[ip++]
    const instructionPos = getInstructionPos(chunk, instructionOffset)
    switch (instruction) {
      case Op.Constant: {
        const constantIndex = chunk.code[ip++]
        const value = chunk.constants[constantIndex]
        if (value === undefined) {
          throw new EvaluationError(
            `Invalid constant index: ${constantIndex}`,
            { instruction, constantIndex, ip, stack, chunk },
            instructionPos
          )
        }
        stack.push(value)
        break
      }
      case Op.LoadLocal: {
        const slot = chunk.code[ip++]
        const value = locals[slot]
        if (value === undefined) {
          throw new EvaluationError(
            `Invalid local index: ${slot}`,
            { instruction, slot, ip, stack, chunk },
            instructionPos
          )
        }
        stack.push(value)

        break
      }
      case Op.StoreLocal: {
        const slot = chunk.code[ip++]
        if (slot === undefined || slot < 0 || slot >= locals.length) {
          throw new EvaluationError(
            `Invalid local index: ${slot}`,
            { instruction, slot, ip, stack, chunk },
            instructionPos
          )
        }
        const value = stack.pop()
        if (value === undefined) {
          throw new EvaluationError(
            'VM stack underflow on StoreLocal',
            { instruction, slot, ip, stack, chunk },
            instructionPos
          )
        }
        locals[slot] = value
        break
      }
      case Op.LoadGlobal: {
        const symbolIndex = chunk.code[ip++]
        const symbol = chunk.constants[symbolIndex]
        if (symbol === undefined) {
          throw new EvaluationError(
            `Invalid constant index: ${symbolIndex}`,
            {
              instruction,
              constantIndex: symbolIndex,
              ip,
              stack,
              chunk,
            },
            instructionPos
          )
        }
        if (!is.symbol(symbol)) {
          throw new EvaluationError(
            `LoadGlobal expected symbol constant`,
            {
              instruction,
              constantIndex: symbolIndex,
              value: symbol,
              ip,
              stack,
              chunk,
            },
            instructionPos
          )
        }
        try {
          const value = lookup(symbol.name, env)
          stack.push(value)
        } catch (e) {
          hydrateVmErrorPos(e, getPos(symbol) ?? instructionPos)
          throw e
        }

        break
      }
      case Op.LoadQualified: {
        const symbolIndex = chunk.code[ip++]
        const symbol = chunk.constants[symbolIndex]
        if (symbol === undefined) {
          throw new EvaluationError(
            `Invalid constant index: ${symbolIndex}`,
            {
              instruction,
              constantIndex: symbolIndex,
              ip,
              stack,
              chunk,
            },
            instructionPos
          )
        }
        if (!is.symbol(symbol)) {
          throw new EvaluationError(
            `LoadQualified expected symbol constant`,
            {
              instruction,
              constantIndex: symbolIndex,
              value: symbol,
              ip,
              stack,
              chunk,
            },
            instructionPos
          )
        }
        const slashIdx = symbol.name.indexOf('/')
        if (slashIdx <= 0 || slashIdx >= symbol.name.length - 1) {
          throw new EvaluationError(
            `Invalid qualified symbol: ${symbol.name}`,
            {
              instruction,
              constantIndex: symbolIndex,
              value: symbol,
              ip,
              stack,
              chunk,
            },
            getPos(symbol) ?? instructionPos
          )
        }
        const alias = symbol.name.slice(0, slashIdx)
        const localName = symbol.name.slice(slashIdx + 1)
        const nsEnv = getNamespaceEnv(env)
        // Resolve alias: local :as alias first, then full namespace name
        const targetNs =
          nsEnv.ns?.aliases.get(alias) ?? ctx.resolveNs(alias) ?? null
        if (!targetNs) {
          throw new EvaluationError(
            `No such namespace or alias: ${alias}`,
            {
              instruction,
              constantIndex: symbolIndex,
              value: symbol,
              ip,
              stack,
              chunk,
            },
            getPos(symbol) ?? instructionPos
          )
        }
        const theVar = targetNs.vars.get(localName)
        if (theVar === undefined) {
          throw new EvaluationError(
            `Symbol ${symbol.name} not found`,
            {
              instruction,
              constantIndex: symbolIndex,
              value: symbol,
              ip,
              stack,
              chunk,
            },
            getPos(symbol) ?? instructionPos
          )
        }
        stack.push(derefValue(theVar))
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
          throw new EvaluationError(
            'VM stack underflow on Pop',
            {
              instruction,
              ip,
              stack,
              chunk,
            },
            instructionPos
          )
        }
        break
      }
      case Op.MakeVector: {
        const length = chunk.code[ip++]
        assertCountOperand(
          length,
          'MakeVector',
          instruction,
          ip,
          stack,
          chunk,
          instructionPos
        )
        if (length === 0) {
          stack.push(v.vector([]))
          break
        }
        if (stack.length < length) {
          throw new EvaluationError(
            'VM stack underflow on MakeVector, not enough elements',
            {
              instruction,
              ip,
              stack,
              chunk,
            },
            instructionPos
          )
        }

        const elements = stack.splice(stack.length - length, length)
        stack.push(v.vector(elements))
        break
      }
      case Op.MakeMap: {
        const length = chunk.code[ip++]
        assertCountOperand(
          length,
          'MakeMap',
          instruction,
          ip,
          stack,
          chunk,
          instructionPos
        )
        if (length === 0) {
          stack.push(v.map([]))
          break
        }
        if (stack.length < length * 2) {
          throw new EvaluationError(
            'VM stack underflow on MakeMap, not enough entries',
            {
              instruction,
              ip,
              stack,
              chunk,
            },
            instructionPos
          )
        }

        const entries = stack.splice(stack.length - length * 2, length * 2)
        const pairs: [CljValue, CljValue][] = []
        for (let i = 0; i < entries.length; i += 2) {
          pairs.push([entries[i], entries[i + 1]])
        }
        stack.push(v.map(pairs))
        break
      }
      case Op.MakeSet: {
        const length = chunk.code[ip++]
        assertCountOperand(
          length,
          'MakeSet',
          instruction,
          ip,
          stack,
          chunk,
          instructionPos
        )
        if (length === 0) {
          stack.push(v.set([]))
          break
        }
        if (stack.length < length) {
          throw new EvaluationError(
            'VM stack underflow on MakeSet, not enough elements',
            {
              instruction,
              ip,
              stack,
              chunk,
            },
            instructionPos
          )
        }

        const elements = stack.splice(stack.length - length, length)
        stack.push(v.set(elements))
        break
      }
      case Op.Call: {
        const argCount = chunk.code[ip++]
        assertCountOperand(
          argCount,
          'Call',
          instruction,
          ip,
          stack,
          chunk,
          instructionPos
        )

        if (stack.length < argCount + 1) {
          throw new EvaluationError(
            'VM stack underflow on Call, not enough arguments',
            {
              instruction,
              ip,
              stack,
              chunk,
            },
            instructionPos
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
            },
            instructionPos
          )
        }

        if (!is.callable(callable)) {
          const name =
            'name' in callable ? callable.name : printString(callable)
          throw new EvaluationError(
            `${name} is not callable`,
            {
              instruction,
              ip,
              stack,
              chunk,
            },
            instructionPos
          )
        }

        try {
          const result = ctx.applyCallable(callable, args, env)
          stack.push(result)
        } catch (e) {
          hydrateVmErrorPos(e, instructionPos)
          throw e
        }
        break
      }
      case Op.Return: {
        const value = stack.pop()
        return value ?? v.nil()
      }
      case Op.Jump: {
        const offset = chunk.code[ip++]
        assertJumpOffset(offset, instruction, ip, stack, chunk, instructionPos)
        ip += offset
        break
      }
      case Op.JumpIfFalsy: {
        const offset = chunk.code[ip++]
        assertJumpOffset(offset, instruction, ip, stack, chunk, instructionPos)
        const condition = stack.pop()

        if (condition === undefined) {
          throw new EvaluationError(
            'VM stack underflow on JumpIfFalsy',
            {
              instruction,
              ip,
              stack,
              chunk,
            },
            instructionPos
          )
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
          },
          instructionPos
        )
      }
    }
  }

  return v.nil()
}

function getInstructionPos(chunk: VmChunk, offset: number): Pos | undefined {
  return chunk.positions[offset] ?? undefined
}

function hydrateVmErrorPos(error: unknown, pos: Pos | undefined): void {
  if (pos && isEvaluationError(error) && !error.pos) {
    error.pos = pos
  }
}

function assertJumpOffset(
  offset: number | undefined,
  instruction: number,
  ip: number,
  stack: CljValue[],
  chunk: VmChunk,
  pos: Pos | undefined
): asserts offset is number {
  if (
    offset === undefined ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    ip + offset > chunk.code.length
  ) {
    throw new EvaluationError(
      `Invalid jump offset: ${offset}`,
      {
        instruction,
        offset,
        ip,
        stack,
        chunk,
      },
      pos
    )
  }
}

function assertCountOperand(
  count: number | undefined,
  opName: string,
  instruction: number,
  ip: number,
  stack: CljValue[],
  chunk: VmChunk,
  pos: Pos | undefined
): asserts count is number {
  if (count === undefined || !Number.isInteger(count) || count < 0) {
    throw new EvaluationError(
      `Invalid ${opName} count: ${count}`,
      {
        instruction,
        count,
        ip,
        stack,
        chunk,
      },
      pos
    )
  }
}
