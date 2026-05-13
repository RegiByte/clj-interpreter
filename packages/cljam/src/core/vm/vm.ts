import { is } from '../assertions'
import { derefValue, getNamespaceEnv, lookup, lookupVar } from '../env'
import { CljThrownSignal, EvaluationError, isEvaluationError } from '../errors'
import { matchesDiscriminator } from '../evaluator/form-parsers'
import { v } from '../factories'
import { framesToClj, getPos } from '../positions'
import { printString } from '../printer'
import type {
  Arity,
  CljFunction,
  CljMultiMethod,
  CljSymbol,
  CljValue,
  CljVar,
  Env,
  EvaluationContext,
  Pos,
  StackFrame,
  VmAbrupt,
  VmBindingFrameRecord,
  VmCallFrame,
  VmChunk,
  VmExecuteInput,
  VmFinallyContinuationRecord,
  VmFunctionClosure,
  VmTryRecord,
  VmUpvalue,
} from '../types'
import {
  RecurSignal,
  resolveArity,
  slotValuesForArity,
} from '../evaluator/arity'
import { dispatchMultiMethod } from '../evaluator/multimethod-dispatch'
import { Op, opcodeName } from './opcodes'

const DEFAULT_VM_FRAME_LIMIT = 10000

type VmState = {
  ctx: EvaluationContext
  stack: CljValue[]
  frames: VmCallFrame[]
  done: boolean
  result: CljValue | null
  openUpvalues: VmUpvalue[]
  pendingAbrupt: VmAbrupt | null
}

type IntrinsicName = '+' | '-' | '*' | '/' | '<' | '>' | '<=' | '>=' | '='

export function executeChunk(input: VmExecuteInput): CljValue {
  const state = createVmState(input)
  try {
    return runToCompletion(state)
  } catch (e) {
    captureVmFrames(e, state)
    throw e
  }
}

function createVmState(input: VmExecuteInput): VmState {
  const locals = [...(input.locals ?? [])]
  while (locals.length < input.chunk.localCount) {
    locals.push(v.nil())
  }

  return {
    ctx: input.ctx,
    stack: [],
    frames: [
      {
        chunk: input.chunk,
        env: input.env,
        locals,
        ip: 0,
        stackBase: 0,
        fnName: input.rootFnName ?? input.chunk.name ?? null,
        callPos: null,
        closure: input.closure ?? null,
        unwindStack: [],
      },
    ],
    done: false,
    result: null,
    openUpvalues: [],
    pendingAbrupt: null,
  }
}

function runToCompletion(state: VmState): CljValue {
  while (!state.done) {
    try {
      executeInstruction(state)
    } catch (e) {
      beginAbruptFromThrown(state, e)
    }
    drainAbruptCompletion(state)
  }
  return state.result ?? v.nil()
}

function executeInstruction(state: VmState): void {
  const frame = currentFrame(state)
  const { chunk, env, locals } = frame
  const { ctx, stack } = state

  if (frame.ip >= chunk.code.length) {
    returnFromFrame(state, v.nil())
    return
  }

  const instructionOffset = frame.ip
  const instruction = chunk.code[frame.ip++]
  const instructionPos = getInstructionPos(chunk, instructionOffset)
  switch (instruction) {
    case Op.Constant: {
      const constantIndex = chunk.code[frame.ip++]
      const value = chunk.constants[constantIndex]
      if (value === undefined) {
        throw new EvaluationError(
          `Invalid constant index: ${constantIndex}`,
          { instruction, constantIndex, ip: frame.ip, stack, chunk },
          instructionPos
        )
      }
      stack.push(value)
      break
    }
    case Op.LoadLocal: {
      const slot = chunk.code[frame.ip++]
      const value = locals[slot]
      if (value === undefined) {
        throw new EvaluationError(
          `Invalid local index: ${slot}`,
          { instruction, slot, ip: frame.ip, stack, chunk },
          instructionPos
        )
      }
      stack.push(value)

      break
    }
    case Op.LoadUpvalue: {
      const slot = chunk.code[frame.ip++]
      const upvalue = frame.closure?.upvalues[slot]
      if (upvalue === undefined) {
        throw new EvaluationError(
          `Invalid upvalue index: ${slot}`,
          { instruction, slot, ip: frame.ip, stack, chunk },
          instructionPos
        )
      }
      stack.push(readUpvalue(upvalue))

      break
    }
    case Op.StoreLocal: {
      const slot = chunk.code[frame.ip++]
      if (slot === undefined || slot < 0 || slot >= locals.length) {
        throw new EvaluationError(
          `Invalid local index: ${slot}`,
          { instruction, slot, ip: frame.ip, stack, chunk },
          instructionPos
        )
      }
      const value = stack.pop()
      if (value === undefined) {
        throw new EvaluationError(
          'VM stack underflow on StoreLocal',
          { instruction, slot, ip: frame.ip, stack, chunk },
          instructionPos
        )
      }
      locals[slot] = value
      break
    }
    case Op.LoadGlobal: {
      const symbolIndex = chunk.code[frame.ip++]
      const symbol = chunk.constants[symbolIndex]
      if (symbol === undefined) {
        throw new EvaluationError(
          `Invalid constant index: ${symbolIndex}`,
          {
            instruction,
            constantIndex: symbolIndex,
            ip: frame.ip,
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
            ip: frame.ip,
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
      const symbolIndex = chunk.code[frame.ip++]
      const symbol = chunk.constants[symbolIndex]
      if (symbol === undefined) {
        throw new EvaluationError(
          `Invalid constant index: ${symbolIndex}`,
          {
            instruction,
            constantIndex: symbolIndex,
            ip: frame.ip,
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
            ip: frame.ip,
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
            ip: frame.ip,
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
            ip: frame.ip,
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
            ip: frame.ip,
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
            ip: frame.ip,
            stack,
            chunk,
          },
          instructionPos
        )
      }
      break
    }
    case Op.MakeVector: {
      const length = chunk.code[frame.ip++]
      assertCountOperand(
        length,
        'MakeVector',
        instruction,
        frame.ip,
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
            ip: frame.ip,
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
      const length = chunk.code[frame.ip++]
      assertCountOperand(
        length,
        'MakeMap',
        instruction,
        frame.ip,
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
            ip: frame.ip,
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
      const length = chunk.code[frame.ip++]
      assertCountOperand(
        length,
        'MakeSet',
        instruction,
        frame.ip,
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
            ip: frame.ip,
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
    case Op.WithMeta: {
      const metaIndex = chunk.code[frame.ip++]
      const meta = chunk.constants[metaIndex]
      if (meta === undefined) {
        throw new EvaluationError(
          `Invalid metadata constant index: ${metaIndex}`,
          { instruction, metaIndex, ip: frame.ip, stack, chunk },
          instructionPos
        )
      }
      if (!is.map(meta)) {
        throw new EvaluationError(
          `VM WithMeta expected metadata map, got ${printString(meta)}`,
          { instruction, metaIndex, meta, ip: frame.ip, stack, chunk },
          instructionPos
        )
      }
      if (stack.length < 1) {
        throw new EvaluationError(
          'VM stack underflow on WithMeta, no value to attach metadata to',
          { instruction, metaIndex, ip: frame.ip, stack, chunk },
          instructionPos
        )
      }

      const value = stack[stack.length - 1]
      if (!is.vector(value) && !is.map(value)) {
        throw new EvaluationError(
          `VM WithMeta does not support ${value.kind}`,
          { instruction, metaIndex, value, ip: frame.ip, stack, chunk },
          instructionPos
        )
      }

      stack[stack.length - 1] = { ...value, meta }
      break
    }
    case Op.Closure: {
      const templateIndex = chunk.code[frame.ip++]
      if (
        templateIndex === undefined ||
        !Number.isInteger(templateIndex) ||
        templateIndex < 0 ||
        templateIndex >= chunk.innerFunctions.length
      ) {
        throw new EvaluationError(
          `Invalid closure template index: ${templateIndex}`,
          {
            instruction,
            templateIndex,
            ip: frame.ip,
            stack,
            chunk,
          },
          instructionPos
        )
      }

      const template = chunk.innerFunctions[templateIndex]
      const upvalues = template.upvalueDescriptors.map((descriptor) => {
        if (descriptor.isLocal) {
          return captureUpvalue(state, frame, descriptor.index)
        }
        const upvalue = frame.closure?.upvalues[descriptor.index]
        if (upvalue === undefined) {
          throw new EvaluationError(
            `Invalid enclosing upvalue index: ${descriptor.index}`,
            {
              instruction,
              descriptor,
              templateIndex,
              ip: frame.ip,
              stack,
              chunk,
            },
            instructionPos
          )
        }
        return upvalue
      })
      const vmClosure: VmFunctionClosure = {
        env,
        upvalues,
        name: template.name,
      }
      const fn = v.multiArityFunction(
        template.arities.map((arityTemplate) => ({
          params: arityTemplate.params,
          restParam: arityTemplate.restParam,
          body: [],
          bytecodeBody: arityTemplate.chunk,
          vmClosure,
        })),
        env
      )
      if (template.name) fn.name = template.name
      if (template.meta) fn.meta = template.meta

      stack.push(fn)
      break
    }
    case Op.Call: {
      const argCount = chunk.code[frame.ip++]
      assertCountOperand(
        argCount,
        'Call',
        instruction,
        frame.ip,
        stack,
        chunk,
        instructionPos
      )

      if (stack.length < argCount + 1) {
        throw new EvaluationError(
          'VM stack underflow on Call, not enough arguments',
          {
            instruction,
            ip: frame.ip,
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
            ip: frame.ip,
            stack,
            chunk,
          },
          instructionPos
        )
      }

      if (is.multiMethod(callable)) {
        try {
          const result = delegateMultiMethod(
            state,
            callable,
            args,
            env,
            instructionPos
          )
          stack.push(result)
        } catch (e) {
          hydrateVmErrorPos(e, instructionPos)
          captureVmFrames(e, state)
          throw e
        }
        break
      }

      if (!is.callable(callable)) {
        const name = 'name' in callable ? callable.name : printString(callable)
        throw new EvaluationError(
          `${name} is not callable`,
          {
            instruction,
            ip: frame.ip,
            stack,
            chunk,
          },
          instructionPos
        )
      }

      try {
        if (tryPushBytecodeFrame(state, callable, args, instructionPos)) {
          break
        }
        const result = delegateCall(state, callable, args, env, instructionPos)
        stack.push(result)
      } catch (e) {
        hydrateVmErrorPos(e, instructionPos)
        captureVmFrames(e, state)
        throw e
      }
      break
    }
    case Op.Add:
      executeIntrinsic(state, '+', instruction, instructionPos)
      break
    case Op.Sub:
      executeIntrinsic(state, '-', instruction, instructionPos)
      break
    case Op.Mul:
      executeIntrinsic(state, '*', instruction, instructionPos)
      break
    case Op.Div:
      executeIntrinsic(state, '/', instruction, instructionPos)
      break
    case Op.Lt:
      executeIntrinsic(state, '<', instruction, instructionPos)
      break
    case Op.Lte:
      executeIntrinsic(state, '<=', instruction, instructionPos)
      break
    case Op.Gt:
      executeIntrinsic(state, '>', instruction, instructionPos)
      break
    case Op.Gte:
      executeIntrinsic(state, '>=', instruction, instructionPos)
      break
    case Op.Eq:
      executeIntrinsic(state, '=', instruction, instructionPos)
      break
    case Op.Return: {
      const value = stack.pop()
      returnFromFrame(state, value ?? v.nil())
      break
    }
    case Op.Throw: {
      const thrown = stack.pop()
      if (thrown === undefined) {
        throw new EvaluationError(
          'VM stack underflow on Throw',
          {
            instruction,
            ip: frame.ip,
            stack,
            chunk,
          },
          instructionPos
        )
      }
      state.pendingAbrupt = {
        kind: 'throw',
        thrown,
        original: new CljThrownSignal(thrown),
        catchable: true,
      }
      break
    }
    case Op.PushTry: {
      const catchTableIndex = readCatchTableIndexOperand(
        frame,
        stack,
        instruction,
        instructionPos
      )
      const finallyIp = readFinallyIpOperand(
        frame,
        stack,
        instruction,
        instructionPos
      )
      const afterIp = readAfterIpOperand(
        frame,
        stack,
        instruction,
        instructionPos
      )
      pushTryRecord(frame, stack.length, catchTableIndex, finallyIp, afterIp)
      break
    }
    case Op.PopTry: {
      popTryRecord(frame, stack, instruction, instructionPos)
      break
    }
    case Op.EnterFinally: {
      const afterIp = readAfterIpOperand(
        frame,
        stack,
        instruction,
        instructionPos
      )
      pushNormalFinallyContinuation(frame, stack.length, afterIp)
      break
    }
    case Op.EndFinally: {
      const record = popFinallyContinuationRecord(
        frame,
        stack,
        instruction,
        instructionPos
      )
      state.pendingAbrupt = record.pendingAbrupt
      if (state.pendingAbrupt === null) {
        frame.ip = record.afterIp
      }
      break
    }
    case Op.PushBindingFrame: {
      pushBindingFrameRecord(frame, stack.length)
      break
    }
    case Op.PushDynamicBinding: {
      const symbol = readSymbolConstantOperand(
        frame,
        stack,
        instruction,
        instructionPos,
        'dynamic binding symbol'
      )
      const value = stack.pop()
      if (value === undefined) {
        throw new EvaluationError(
          'VM stack underflow on PushDynamicBinding',
          {
            instruction,
            ip: frame.ip,
            stack,
            chunk,
          },
          instructionPos
        )
      }
      const bindingFrame = currentBindingFrame(frame, stack, instruction, instructionPos)
      const targetVar = resolveDynamicBindingVar(symbol, env, ctx)
      targetVar.bindingStack ??= []
      targetVar.bindingStack.push(value)
      bindingFrame.boundVars.push(targetVar)
      break
    }
    case Op.PopBindingFrame: {
      const record = popBindingFrameRecord(
        frame,
        stack,
        instruction,
        instructionPos
      )
      cleanupBindingFrame(record)
      break
    }
    case Op.SetDynamic: {
      const symbol = readSymbolConstantOperand(
        frame,
        stack,
        instruction,
        instructionPos,
        'set! target symbol'
      )
      const newVal = stack.pop()
      if (newVal === undefined) {
        throw new EvaluationError(
          'VM stack underflow on SetDynamic',
          { instruction, ip: frame.ip, stack, chunk },
          instructionPos
        )
      }
      const targetVar = resolveDynamicBindingVar(symbol, env, ctx)
      if (!targetVar.bindingStack || targetVar.bindingStack.length === 0) {
        throw new EvaluationError(
          `Cannot set! ${targetVar.ns}/${targetVar.name} — no active binding. Use set! only inside a (binding [...] ...) form.`,
          { sym: symbol },
          instructionPos
        )
      }
      targetVar.bindingStack[targetVar.bindingStack.length - 1] = newVal
      stack.push(newVal)
      break
    }
    case Op.Jump: {
      const offset = chunk.code[frame.ip++]
      assertJumpOffset(
        offset,
        instruction,
        frame.ip,
        stack,
        chunk,
        instructionPos
      )
      frame.ip += offset
      break
    }
    case Op.JumpIfFalsy: {
      const offset = chunk.code[frame.ip++]
      assertJumpOffset(
        offset,
        instruction,
        frame.ip,
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
            ip: frame.ip,
            stack,
            chunk,
          },
          instructionPos
        )
      }
      if (is.falsy(condition)) {
        frame.ip += offset
      }

      break
    }
    case Op.Recur: {
      const localStart = chunk.code[frame.ip++]
      const localCount = chunk.code[frame.ip++]
      const loopHeader = chunk.code[frame.ip++]

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

      closeUpvaluesForFrame(state, frame, localStart)

      for (let i = 0; i < localCount; i++) {
        locals[localStart + i] = args[i]
      }

      frame.ip = loopHeader // jump to loop header!!

      break
    }
    case Op.FnRecur: {
      const argCount = chunk.code[frame.ip++]

      if (
        argCount === undefined ||
        argCount < 0 ||
        argCount > locals.length
      ) {
        throw new EvaluationError(
          `Invalid function recur argument count: ${argCount}`,
          {
            instruction,
            argCount,
          },
          instructionPos
        )
      }

      if (stack.length < argCount) {
        throw new EvaluationError(
          'VM stack underflow on FnRecur, not enough arguments',
          {
            instruction,
            argCount,
          },
          instructionPos
        )
      }

      const args = stack.splice(stack.length - argCount, argCount)

      for (let i = 0; i < argCount; i++) {
        locals[i] = args[i]
      }

      frame.ip = 0

      break
    }
    case Op.FnRecurRest: {
      const argCount = chunk.code[frame.ip++]
      const fixedParamCount = chunk.code[frame.ip++]

      if (
        argCount === undefined ||
        argCount < 0 ||
        fixedParamCount === undefined ||
        fixedParamCount < 0 ||
        fixedParamCount >= locals.length ||
        argCount < fixedParamCount
      ) {
        throw new EvaluationError(
          `Invalid variadic function recur operands: ${argCount}, ${fixedParamCount}`,
          {
            instruction,
            argCount,
            fixedParamCount,
          },
          instructionPos
        )
      }

      if (stack.length < argCount) {
        throw new EvaluationError(
          'VM stack underflow on FnRecurRest, not enough arguments',
          {
            instruction,
            argCount,
            fixedParamCount,
          },
          instructionPos
        )
      }

      const args = stack.splice(stack.length - argCount, argCount)

      for (let i = 0; i < fixedParamCount; i++) {
        locals[i] = args[i]
      }

      const restArgs = args.slice(fixedParamCount)
      locals[fixedParamCount] =
        restArgs.length > 0 ? v.list(restArgs) : v.nil()

      frame.ip = 0

      break
    }
    default: {
      throw new EvaluationError(
        `Unknown VM opcode: ${opcodeName(instruction)}`,
        {
          instruction,
          ip: frame.ip,
          stack,
          chunk,
        },
        instructionPos
      )
    }
  }
}

function currentFrame(state: VmState): VmCallFrame {
  const frame = state.frames[state.frames.length - 1]
  if (frame === undefined) {
    throw new EvaluationError('VM has no active call frame', {
      stack: state.stack,
    })
  }
  return frame
}

function currentFrameOrNull(state: VmState): VmCallFrame | null {
  return state.frames[state.frames.length - 1] ?? null
}

function readCatchTableIndexOperand(
  frame: VmCallFrame,
  stack: CljValue[],
  instruction: number | undefined,
  instructionPos: Pos | undefined
): number {
  const { chunk } = frame
  const catchTableIndex = chunk.code[frame.ip++]
  if (
    catchTableIndex === undefined ||
    !Number.isInteger(catchTableIndex) ||
    catchTableIndex < 0 ||
    catchTableIndex >= chunk.catchTables.length
  ) {
    throw new EvaluationError(
      `Invalid catch table index: ${catchTableIndex}`,
      {
        instruction,
        catchTableIndex,
        ip: frame.ip,
        stack,
        chunk,
      },
      instructionPos
    )
  }
  return catchTableIndex
}

function readFinallyIpOperand(
  frame: VmCallFrame,
  stack: CljValue[],
  instruction: number | undefined,
  instructionPos: Pos | undefined
): number {
  const { chunk } = frame
  const finallyIp = chunk.code[frame.ip++]
  if (
    finallyIp === undefined ||
    !Number.isInteger(finallyIp) ||
    (finallyIp !== -1 && (finallyIp < 0 || finallyIp >= chunk.code.length))
  ) {
    throw new EvaluationError(
      `Invalid finally instruction pointer: ${finallyIp}`,
      {
        instruction,
        finallyIp,
        ip: frame.ip,
        stack,
        chunk,
      },
      instructionPos
    )
  }
  return finallyIp
}

function readAfterIpOperand(
  frame: VmCallFrame,
  stack: CljValue[],
  instruction: number | undefined,
  instructionPos: Pos | undefined
): number {
  const { chunk } = frame
  const afterIp = chunk.code[frame.ip++]
  if (
    afterIp === undefined ||
    !Number.isInteger(afterIp) ||
    afterIp < 0 ||
    afterIp > chunk.code.length
  ) {
    throw new EvaluationError(
      `Invalid after instruction pointer: ${afterIp}`,
      {
        instruction,
        afterIp,
        ip: frame.ip,
        stack,
        chunk,
      },
      instructionPos
    )
  }
  return afterIp
}

function readSymbolConstantOperand(
  frame: VmCallFrame,
  stack: CljValue[],
  instruction: number | undefined,
  instructionPos: Pos | undefined,
  label: string
): CljSymbol {
  const { chunk } = frame
  const constantIndex = chunk.code[frame.ip++]
  const value = chunk.constants[constantIndex]
  if (!is.symbol(value)) {
    throw new EvaluationError(
      `Invalid ${label} constant index: ${constantIndex}`,
      {
        instruction,
        constantIndex,
        ip: frame.ip,
        stack,
        chunk,
      },
      instructionPos
    )
  }
  return value
}

function pushTryRecord(
  frame: VmCallFrame,
  stackDepth: number,
  catchTableIndex: number,
  finallyIp: number,
  afterIp: number
): void {
  frame.unwindStack.push({
    kind: 'try',
    stackDepth,
    catchTableIndex,
    finallyIp,
    afterIp,
  })
}

function pushBindingFrameRecord(frame: VmCallFrame, stackDepth: number): void {
  frame.unwindStack.push({
    kind: 'binding-frame',
    stackDepth,
    boundVars: [],
  })
}

function pushNormalFinallyContinuation(
  frame: VmCallFrame,
  stackDepth: number,
  afterIp: number
): void {
  frame.unwindStack.push({
    kind: 'finally-continuation',
    stackDepth,
    afterIp,
    pendingAbrupt: null,
  })
}

function popTryRecord(
  frame: VmCallFrame,
  stack: CljValue[],
  instruction: number | undefined,
  instructionPos: Pos | undefined
): VmTryRecord {
  const record = frame.unwindStack.pop()
  if (record === undefined || record.kind !== 'try') {
    throw new EvaluationError(
      'VM unwind stack underflow on PopTry',
      {
        instruction,
        ip: frame.ip,
        stack,
        chunk: frame.chunk,
      },
      instructionPos
    )
  }
  return record
}

function popFinallyContinuationRecord(
  frame: VmCallFrame,
  stack: CljValue[],
  instruction: number | undefined,
  instructionPos: Pos | undefined
): VmFinallyContinuationRecord {
  const record = frame.unwindStack.pop()
  if (record === undefined || record.kind !== 'finally-continuation') {
    throw new EvaluationError(
      'VM unwind stack underflow on EndFinally',
      {
        instruction,
        ip: frame.ip,
        stack,
        chunk: frame.chunk,
      },
      instructionPos
    )
  }
  return record
}

function currentBindingFrame(
  frame: VmCallFrame,
  stack: CljValue[],
  instruction: number | undefined,
  instructionPos: Pos | undefined
): VmBindingFrameRecord {
  const record = frame.unwindStack[frame.unwindStack.length - 1]
  if (record === undefined || record.kind !== 'binding-frame') {
    throw new EvaluationError(
      'VM has no active binding frame',
      {
        instruction,
        ip: frame.ip,
        stack,
        chunk: frame.chunk,
      },
      instructionPos
    )
  }
  return record
}

function popBindingFrameRecord(
  frame: VmCallFrame,
  stack: CljValue[],
  instruction: number | undefined,
  instructionPos: Pos | undefined
): VmBindingFrameRecord {
  const record = frame.unwindStack.pop()
  if (record === undefined || record.kind !== 'binding-frame') {
    throw new EvaluationError(
      'VM unwind stack underflow on PopBindingFrame',
      {
        instruction,
        ip: frame.ip,
        stack,
        chunk: frame.chunk,
      },
      instructionPos
    )
  }
  return record
}

function cleanupBindingFrame(record: VmBindingFrameRecord): void {
  for (let i = record.boundVars.length - 1; i >= 0; i--) {
    record.boundVars[i].bindingStack!.pop()
  }
}

function resolveDynamicBindingVar(
  symbol: CljSymbol,
  env: Env,
  ctx: EvaluationContext
): CljVar {
  const slashIdx = symbol.name.indexOf('/')
  let targetVar: CljVar | undefined
  if (slashIdx > 0 && slashIdx < symbol.name.length - 1) {
    const nsPrefix = symbol.name.slice(0, slashIdx)
    const localName = symbol.name.slice(slashIdx + 1)
    const nsEnv = getNamespaceEnv(env)
    const targetNs =
      nsEnv.ns?.aliases.get(nsPrefix) ?? ctx.resolveNs(nsPrefix) ?? null
    if (!targetNs) {
      throw new EvaluationError(
        `No such namespace: ${nsPrefix}`,
        { sym: symbol },
        getPos(symbol)
      )
    }
    targetVar = targetNs.vars.get(localName)
  } else {
    targetVar = lookupVar(symbol.name, env)
  }

  if (!targetVar) {
    throw new EvaluationError(
      `No var found for symbol '${symbol.name}' in binding form`,
      { sym: symbol },
      getPos(symbol)
    )
  }
  if (!targetVar.dynamic) {
    throw new EvaluationError(
      `Cannot use binding with non-dynamic var ${targetVar.ns}/${targetVar.name}. ` +
        `Mark it dynamic with (def ^:dynamic ${symbol.name} ...)`,
      { sym: symbol },
      getPos(symbol)
    )
  }

  return targetVar
}

function beginAbruptFromThrown(state: VmState, error: unknown): void {
  if (error instanceof RecurSignal) throw error

  if (error instanceof CljThrownSignal) {
    state.pendingAbrupt = {
      kind: 'throw',
      thrown: error.value,
      original: error,
      catchable: true,
    }
    return
  }

  if (isEvaluationError(error)) {
    captureVmFrames(error, state)
    state.pendingAbrupt = {
      kind: 'throw',
      thrown: runtimeErrorValue(error, state.ctx),
      original: error,
      catchable: true,
    }
    return
  }

  throw error
}

function drainAbruptCompletion(state: VmState): void {
  while (state.pendingAbrupt !== null && !state.done) {
    const frame = currentFrameOrNull(state)
    if (frame === null) {
      finishUncaughtAbrupt(state)
    }

    const record = frame.unwindStack.pop()
    if (record === undefined) {
      abortFrame(state, frame)
      continue
    }

    state.stack.length = record.stackDepth

    if (record.kind === 'try') {
      if (tryEnterCatch(state, frame, record)) return
      if (record.finallyIp !== -1) {
        enterFinally(state, frame, record.finallyIp, record.afterIp)
        return
      }
      continue
    }

    if (record.kind === 'finally-continuation') {
      if (state.pendingAbrupt !== null) {
        continue
      }
      state.pendingAbrupt = record.pendingAbrupt
      if (state.pendingAbrupt === null) {
        frame.ip = record.afterIp
        return
      }
    }

    if (record.kind === 'binding-frame') {
      cleanupBindingFrame(record)
      continue
    }
  }
}

function enterFinally(
  state: VmState,
  frame: VmCallFrame,
  finallyIp: number,
  afterIp: number
): void {
  frame.unwindStack.push({
    kind: 'finally-continuation',
    stackDepth: state.stack.length,
    afterIp,
    pendingAbrupt: state.pendingAbrupt,
  })
  state.pendingAbrupt = null
  frame.ip = finallyIp
}

function tryEnterCatch(
  state: VmState,
  frame: VmCallFrame,
  record: VmTryRecord
): boolean {
  const abrupt = state.pendingAbrupt
  if (abrupt === null || !abrupt.catchable) return false

  const catchTable = frame.chunk.catchTables[record.catchTableIndex]
  if (catchTable === undefined) {
    throw new EvaluationError('VM catch table missing during unwind', {
      catchTableIndex: record.catchTableIndex,
      chunk: frame.chunk,
    })
  }

  for (const clause of catchTable.clauses) {
    const discriminator =
      clause.discriminatorSlot >= 0
        ? (frame.locals[clause.discriminatorSlot] ?? clause.discriminator)
        : clause.discriminator
    let matches: boolean
    try {
      matches = matchesDiscriminator(discriminator, abrupt.thrown, frame.env, state.ctx)
    } catch (e) {
      // Predicate evaluation or call threw — the new error replaces the original
      // pending throw. The try record is already popped, so drainAbruptCompletion
      // will route the new error through finally (if any) before continuing outward.
      beginAbruptFromThrown(state, e)
      return false
    }
    if (!matches) continue

    if (clause.bindingSlot < 0 || clause.bindingSlot >= frame.locals.length) {
      throw new EvaluationError('Invalid catch binding local slot', {
        bindingSlot: clause.bindingSlot,
        chunk: frame.chunk,
      })
    }
    if (clause.bodyIp < 0 || clause.bodyIp >= frame.chunk.code.length) {
      throw new EvaluationError('Invalid catch body instruction pointer', {
        bodyIp: clause.bodyIp,
        chunk: frame.chunk,
      })
    }

    frame.locals[clause.bindingSlot] = abrupt.thrown
    state.pendingAbrupt = null
    frame.ip = clause.bodyIp
    return true
  }

  return false
}

function abortFrame(state: VmState, frame: VmCallFrame): void {
  closeUpvaluesForFrame(state, frame, 0)
  state.stack.length = frame.stackBase
  state.frames.pop()
}

function finishUncaughtAbrupt(state: VmState): never {
  const abrupt = state.pendingAbrupt
  state.pendingAbrupt = null
  if (abrupt === null) {
    throw new EvaluationError('VM abrupt completion missing reason', {
      stack: state.stack,
    })
  }
  throw abrupt.original
}

function runtimeErrorValue(
  error: EvaluationError,
  ctx: EvaluationContext
): CljValue {
  const typeKeyword = error.code
    ? v.keyword(`:${error.code}`)
    : v.keyword(':error/runtime')
  const entries: [CljValue, CljValue][] = [
    [v.keyword(':type'), typeKeyword],
    [v.keyword(':message'), v.string(error.message)],
  ]
  if (error.frames && error.frames.length > 0) {
    entries.push([
      v.keyword(':frames'),
      framesToClj(error.frames, ctx.currentSource),
    ])
  }
  return v.map(entries)
}

function returnFromFrame(state: VmState, value: CljValue): void {
  const frame = currentFrame(state)
  closeUpvaluesForFrame(state, frame, 0)
  state.stack.length = frame.stackBase
  state.frames.pop()

  if (state.frames.length === 0) {
    state.done = true
    state.result = value
    return
  }

  state.stack.push(value)
}

function tryPushBytecodeFrame(
  state: VmState,
  callable: CljValue,
  args: CljValue[],
  callPos: Pos | undefined
): boolean {
  if (!is.function(callable)) return false

  let arity: Arity
  try {
    arity = resolveArity(callable.arities, args.length)
  } catch {
    return false
  }

  if (arity.bytecodeBody === undefined) return false

  pushBytecodeFrame(state, callable, arity, args, callPos)
  return true
}

function pushBytecodeFrame(
  state: VmState,
  fn: CljFunction,
  arity: Arity,
  args: CljValue[],
  callPos: Pos | undefined
): void {
  const chunk = arity.bytecodeBody
  if (chunk === undefined) {
    throw new EvaluationError(
      'Internal VM error: cannot push frame without bytecode body',
      { fn, arity },
      callPos
    )
  }
  if (state.frames.length >= DEFAULT_VM_FRAME_LIMIT) {
    throw new EvaluationError(
      `Stack overflow: exceeded ${DEFAULT_VM_FRAME_LIMIT} VM call frames. Use loop/recur for unbounded iteration.`,
      { fn, arity, frameLimit: DEFAULT_VM_FRAME_LIMIT },
      callPos
    )
  }

  const locals = [...slotValuesForArity(arity, args)]
  while (locals.length < chunk.localCount) {
    locals.push(v.nil())
  }

  state.frames.push({
    chunk,
    env: fn.env,
    locals,
    ip: 0,
    stackBase: state.stack.length,
    fnName: fn.name ?? chunk.name ?? null,
    callPos: callPos ?? null,
    closure: arity.vmClosure ?? null,
    unwindStack: [],
  })
}

function readUpvalue(upvalue: VmUpvalue): CljValue {
  if (upvalue.frame !== null) {
    return upvalue.frame.locals[upvalue.slot] ?? v.nil()
  }
  return upvalue.closedValue ?? v.nil()
}

function captureUpvalue(
  state: VmState,
  frame: VmCallFrame,
  slot: number
): VmUpvalue {
  const existing = state.openUpvalues.find(
    (upvalue) => upvalue.frame === frame && upvalue.slot === slot
  )
  if (existing !== undefined) return existing

  const upvalue: VmUpvalue = {
    frame,
    slot,
    closedValue: null,
  }
  state.openUpvalues.push(upvalue)
  return upvalue
}

function closeUpvaluesForFrame(
  state: VmState,
  frame: VmCallFrame,
  fromLocal: number
): void {
  const remaining: VmUpvalue[] = []
  for (const upvalue of state.openUpvalues) {
    if (upvalue.frame === frame && upvalue.slot >= fromLocal) {
      upvalue.closedValue = frame.locals[upvalue.slot] ?? v.nil()
      upvalue.frame = null
    } else {
      remaining.push(upvalue)
    }
  }
  state.openUpvalues = remaining
}

function delegateCall(
  state: VmState,
  callable: CljValue,
  args: CljValue[],
  env: Env,
  callPos: Pos | undefined
): CljValue {
  const frame: StackFrame = {
    fnName: callableDisplayName(callable),
    line: null,
    col: null,
    source: state.ctx.currentFile ?? null,
    pos: callPos ?? null,
  }
  state.ctx.frameStack.push(frame)
  try {
    return state.ctx.applyCallable(callable, args, env)
  } catch (e) {
    captureDelegatedVmFrames(e, state)
    throw e
  } finally {
    state.ctx.frameStack.pop()
  }
}

function delegateMultiMethod(
  state: VmState,
  callable: CljMultiMethod,
  args: CljValue[],
  env: Env,
  callPos: Pos | undefined
): CljValue {
  const frame: StackFrame = {
    fnName: callable.name ?? null,
    line: null,
    col: null,
    source: state.ctx.currentFile ?? null,
    pos: callPos ?? null,
  }
  state.ctx.frameStack.push(frame)
  try {
    return dispatchMultiMethod(callable, args, state.ctx, env)
  } catch (e) {
    captureDelegatedVmFrames(e, state)
    throw e
  } finally {
    state.ctx.frameStack.pop()
  }
}

function callableDisplayName(callable: CljValue): string | null {
  if (
    is.function(callable) ||
    is.nativeFunction(callable) ||
    is.multiMethod(callable)
  ) {
    return callable.name ?? null
  }
  if (is.keyword(callable)) return callable.name
  return null
}

function captureVmFrames(error: unknown, state: VmState): void {
  if (!isEvaluationError(error)) return
  if (error.frames) return

  const outerFrames = [...state.ctx.frameStack].reverse()
  const includeRootVmFrame = shouldIncludeRootVmFrame(outerFrames, state.frames)
  error.frames = [
    ...vmFramesToStackFrames(state.frames, includeRootVmFrame),
    ...outerFrames,
  ]
}

function captureDelegatedVmFrames(error: unknown, state: VmState): void {
  if (!isEvaluationError(error)) return
  if (error.frames) return

  const outerFrames = [...state.ctx.frameStack].reverse()
  const includeRootVmFrame = shouldIncludeRootVmFrame(outerFrames, state.frames)
  error.frames = [
    ...outerFrames,
    ...vmFramesToStackFrames(state.frames, includeRootVmFrame),
  ]
}

function shouldIncludeRootVmFrame(
  outerFrames: StackFrame[],
  vmFrames: VmCallFrame[]
): boolean {
  if (outerFrames.length === 0) return true
  const rootFrame = vmFrames[0]
  if (rootFrame === undefined) return false
  const outerFrame = outerFrames[0]
  return outerFrame.fnName !== rootFrame.fnName
}

function vmFramesToStackFrames(
  frames: VmCallFrame[],
  includeRoot: boolean
): StackFrame[] {
  const startIndex = includeRoot ? 0 : 1
  return frames
    .slice(startIndex)
    .reverse()
    .map((frame) => ({
      fnName: frame.fnName,
      line: null,
      col: null,
      source: null,
      pos: frame.callPos,
    }))
}

function executeIntrinsic(
  state: VmState,
  name: IntrinsicName,
  instruction: number,
  instructionPos: Pos | undefined
): void {
  const frame = currentFrame(state)
  const argCount = frame.chunk.code[frame.ip++]
  assertCountOperand(
    argCount,
    opcodeName(instruction),
    instruction,
    frame.ip,
    state.stack,
    frame.chunk,
    instructionPos
  )

  if (state.stack.length < argCount) {
    throw new EvaluationError(
      `VM stack underflow on ${opcodeName(instruction)}, not enough arguments`,
      {
        instruction,
        ip: frame.ip,
        stack: state.stack,
        chunk: frame.chunk,
      },
      instructionPos
    )
  }

  const args = state.stack.splice(state.stack.length - argCount, argCount)

  try {
    const visibleOp = lookup(name, frame.env)
    if (isCurrentCoreIntrinsicRoot(name, visibleOp, state.ctx)) {
      state.stack.push(applyIntrinsic(name, args))
      return
    }
    if (!is.callable(visibleOp)) {
      throw new EvaluationError(
        `${name} is not callable`,
        {
          instruction,
          ip: frame.ip,
          stack: state.stack,
          chunk: frame.chunk,
        },
        instructionPos
      )
    }
    state.stack.push(delegateCall(state, visibleOp, args, frame.env, instructionPos))
  } catch (e) {
    hydrateVmErrorPos(e, instructionPos)
    captureVmFrames(e, state)
    throw e
  }
}

function isCurrentCoreIntrinsicRoot(
  name: IntrinsicName,
  op: CljValue,
  ctx: EvaluationContext
): boolean {
  const coreVar = ctx.resolveNs('clojure.core')?.vars.get(name)
  return (
    coreVar !== undefined &&
    derefValue(coreVar) === op &&
    is.nativeFunction(op) &&
    op.name === name
  )
}

function assertNumberArg(
  name: IntrinsicName,
  args: CljValue[],
  index: number
): number {
  const arg = args[index]
  if (!is.number(arg)) {
    throw EvaluationError.atArg(
      `${name} expects all arguments to be numbers`,
      { args },
      index
    )
  }
  return arg.value
}

function applyIntrinsic(name: IntrinsicName, args: CljValue[]): CljValue {
  switch (name) {
    case '+': {
      let result = 0
      for (let i = 0; i < args.length; i++) {
        result += assertNumberArg(name, args, i)
      }
      return v.number(result)
    }
    case '-': {
      if (args.length === 0) {
        throw new EvaluationError('- expects at least one argument', { args })
      }
      let result = assertNumberArg(name, args, 0)
      if (args.length === 1) return v.number(-result)
      for (let i = 1; i < args.length; i++) {
        result -= assertNumberArg(name, args, i)
      }
      return v.number(result)
    }
    case '*': {
      let result = 1
      for (let i = 0; i < args.length; i++) {
        result *= assertNumberArg(name, args, i)
      }
      return v.number(result)
    }
    case '/': {
      if (args.length === 0) {
        throw new EvaluationError('/ expects at least one argument', { args })
      }
      let result = assertNumberArg(name, args, 0)
      for (let i = 1; i < args.length; i++) {
        const divisor = assertNumberArg(name, args, i)
        if (divisor === 0) {
          throw EvaluationError.atArg('division by zero', { args }, i)
        }
        result /= divisor
      }
      return v.number(result)
    }
    case '<':
    case '>':
    case '<=':
    case '>=': {
      if (args.length < 2) {
        throw new EvaluationError(`${name} expects at least two arguments`, {
          args,
        })
      }
      const nums = args.map((_, i) => assertNumberArg(name, args, i))
      let prev = nums[0]
      for (let i = 1; i < nums.length; i++) {
        const current = nums[i]
        let passed: boolean
        switch (name) {
          case '<':
            passed = prev < current
            break
          case '>':
            passed = prev > current
            break
          case '<=':
            passed = prev <= current
            break
          case '>=':
            passed = prev >= current
            break
        }
        if (!passed) return v.boolean(false)
        prev = current
      }
      return v.boolean(true)
    }
    case '=': {
      if (args.length < 2) {
        throw new EvaluationError('= expects at least two arguments', { args })
      }
      for (let i = 1; i < args.length; i++) {
        if (!is.equal(args[i], args[i - 1])) return v.boolean(false)
      }
      return v.boolean(true)
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
