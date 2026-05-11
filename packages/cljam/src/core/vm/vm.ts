import { is } from '../assertions'
import { derefValue, getNamespaceEnv, lookup } from '../env'
import { EvaluationError, isEvaluationError } from '../errors'
import { v } from '../factories'
import { getPos } from '../positions'
import { printString } from '../printer'
import type {
  CljValue,
  Env,
  EvaluationContext,
  Pos,
  VmChunk,
  VmExecuteInput,
} from '../types'
import { Op, opcodeName } from './opcodes'

type VmState = {
  chunk: VmChunk
  env: Env
  ctx: EvaluationContext
  stack: CljValue[]
  locals: CljValue[]
  ip: number
  done: boolean
  result: CljValue | null
}

export function executeChunk(input: VmExecuteInput): CljValue {
  const state = createVmState(input)
  return runToCompletion(state)
}

function createVmState(input: VmExecuteInput): VmState {
  return {
    chunk: input.chunk,
    env: input.env,
    ctx: input.ctx,
    stack: [],
    locals: input.locals ?? [],
    ip: 0,
    done: false,
    result: null,
  }
}

function runToCompletion(state: VmState): CljValue {
  while (!state.done) {
    executeInstruction(state)
  }
  return state.result ?? v.nil()
}

function executeInstruction(state: VmState): void {
  const { chunk, env, ctx, stack, locals } = state

  if (state.ip >= chunk.code.length) {
    state.done = true
    state.result = v.nil()
    return
  }

  const instructionOffset = state.ip
  const instruction = chunk.code[state.ip++]
  const instructionPos = getInstructionPos(chunk, instructionOffset)
  switch (instruction) {
    case Op.Constant: {
      const constantIndex = chunk.code[state.ip++]
      const value = chunk.constants[constantIndex]
      if (value === undefined) {
        throw new EvaluationError(
          `Invalid constant index: ${constantIndex}`,
          { instruction, constantIndex, ip: state.ip, stack, chunk },
          instructionPos
        )
      }
      stack.push(value)
      break
    }
    case Op.LoadLocal: {
      const slot = chunk.code[state.ip++]
      const value = locals[slot]
      if (value === undefined) {
        throw new EvaluationError(
          `Invalid local index: ${slot}`,
          { instruction, slot, ip: state.ip, stack, chunk },
          instructionPos
        )
      }
      stack.push(value)

      break
    }
    case Op.StoreLocal: {
      const slot = chunk.code[state.ip++]
      if (slot === undefined || slot < 0 || slot >= locals.length) {
        throw new EvaluationError(
          `Invalid local index: ${slot}`,
          { instruction, slot, ip: state.ip, stack, chunk },
          instructionPos
        )
      }
      const value = stack.pop()
      if (value === undefined) {
        throw new EvaluationError(
          'VM stack underflow on StoreLocal',
          { instruction, slot, ip: state.ip, stack, chunk },
          instructionPos
        )
      }
      locals[slot] = value
      break
    }
    case Op.LoadGlobal: {
      const symbolIndex = chunk.code[state.ip++]
      const symbol = chunk.constants[symbolIndex]
      if (symbol === undefined) {
        throw new EvaluationError(
          `Invalid constant index: ${symbolIndex}`,
          {
            instruction,
            constantIndex: symbolIndex,
            ip: state.ip,
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
            ip: state.ip,
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
      const symbolIndex = chunk.code[state.ip++]
      const symbol = chunk.constants[symbolIndex]
      if (symbol === undefined) {
        throw new EvaluationError(
          `Invalid constant index: ${symbolIndex}`,
          {
            instruction,
            constantIndex: symbolIndex,
            ip: state.ip,
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
            ip: state.ip,
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
            ip: state.ip,
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
            ip: state.ip,
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
            ip: state.ip,
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
            ip: state.ip,
            stack,
            chunk,
          },
          instructionPos
        )
      }
      break
    }
    case Op.MakeVector: {
      const length = chunk.code[state.ip++]
      assertCountOperand(
        length,
        'MakeVector',
        instruction,
        state.ip,
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
            ip: state.ip,
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
      const length = chunk.code[state.ip++]
      assertCountOperand(
        length,
        'MakeMap',
        instruction,
        state.ip,
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
            ip: state.ip,
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
      const length = chunk.code[state.ip++]
      assertCountOperand(
        length,
        'MakeSet',
        instruction,
        state.ip,
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
            ip: state.ip,
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
      const argCount = chunk.code[state.ip++]
      assertCountOperand(
        argCount,
        'Call',
        instruction,
        state.ip,
        stack,
        chunk,
        instructionPos
      )

      if (stack.length < argCount + 1) {
        throw new EvaluationError(
          'VM stack underflow on Call, not enough arguments',
          {
            instruction,
            ip: state.ip,
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
            ip: state.ip,
            stack,
            chunk,
          },
          instructionPos
        )
      }

      if (!is.callable(callable)) {
        const name = 'name' in callable ? callable.name : printString(callable)
        throw new EvaluationError(
          `${name} is not callable`,
          {
            instruction,
            ip: state.ip,
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
      state.done = true
      state.result = value ?? v.nil()
      break
    }
    case Op.Jump: {
      const offset = chunk.code[state.ip++]
      assertJumpOffset(
        offset,
        instruction,
        state.ip,
        stack,
        chunk,
        instructionPos
      )
      state.ip += offset
      break
    }
    case Op.JumpIfFalsy: {
      const offset = chunk.code[state.ip++]
      assertJumpOffset(
        offset,
        instruction,
        state.ip,
        stack,
        chunk,
        instructionPos
      )
      const condition = stack.pop()

      if (condition === undefined) {
        throw new EvaluationError(
          'VM stack underflow on JumpIfFalsy',
          {
            instruction,
            ip: state.ip,
            stack,
            chunk,
          },
          instructionPos
        )
      }
      if (is.falsy(condition)) {
        state.ip += offset
      }

      break
    }
    case Op.Recur: {
      const localStart = chunk.code[state.ip++]
      const localCount = chunk.code[state.ip++]
      const loopHeader = chunk.code[state.ip++]

      if (
        localStart === undefined ||
        localStart < 0 ||
        localStart >= locals.length
      ) {
        throw new EvaluationError(
          `Invalid local start index: ${localStart}`,
          {
            instruction,
            localStart,
            localCount,
            loopHeader,
          },
          instructionPos
        )
      }
      if (
        localCount === undefined ||
        localCount < 0 ||
        localStart + localCount > locals.length
      ) {
        throw new EvaluationError(
          `Invalid local count: ${localCount}`,
          {
            instruction,
            localStart,
            localCount,
            loopHeader,
          },
          instructionPos
        )
      }

      if (
        loopHeader === undefined ||
        loopHeader < 0 ||
        loopHeader >= chunk.code.length
      ) {
        throw new EvaluationError(
          `Invalid loop header index: ${loopHeader}`,
          {
            instruction,
            localStart,
            localCount,
            loopHeader,
          },
          instructionPos
        )
      }

      if (stack.length < localCount) {
        throw new EvaluationError(
          'VM stack underflow on Recur, not enough arguments',
          {
            instruction,
            localStart,
            localCount,
            loopHeader,
          },
          instructionPos
        )
      }

      const args = stack.splice(stack.length - localCount, localCount)

      for (let i = 0; i < localCount; i++) {
        locals[localStart + i] = args[i]
      }

      state.ip = loopHeader // jump to loop header!!

      break
    }
    default: {
      throw new EvaluationError(
        `Unknown VM opcode: ${opcodeName(instruction)}`,
        {
          instruction,
          ip: state.ip,
          stack,
          chunk,
        },
        instructionPos
      )
    }
  }
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
