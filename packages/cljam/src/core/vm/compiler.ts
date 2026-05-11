import { is } from '../assertions'
import { assertRecurInTailPosition } from '../evaluator/recur-check'
import { v } from '../factories'
import { specialFormKeywords, valueKeywords } from '../keywords'
import { getPos } from '../positions'
import type {
  CljList,
  CljMap,
  CljSet,
  CljSymbol,
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

type RecurTarget = {
  localStart: number
  localCount: number
  loopHeader: number
}

type IntrinsicName = '+' | '-' | '*' | '/' | '<' | '>' | '<=' | '>=' | '='

type VmCompileEnv = {
  locals: Map<string, number>
  nextLocalSlot: number
  recurTarget: RecurTarget | null
}

const unsupportedVmSpecialForms = new Set<string>([
  specialFormKeywords['fn*'],
  specialFormKeywords['loop*'],
  specialFormKeywords['recur'],
  specialFormKeywords['def'],
  specialFormKeywords['try'],
  specialFormKeywords['binding'],
  specialFormKeywords['set!'],
  specialFormKeywords['quote'],
  specialFormKeywords['var'],
  specialFormKeywords['lazy-seq'],
  specialFormKeywords['async'],
  specialFormKeywords['.'],
  specialFormKeywords['js/new'],
  specialFormKeywords['ns'],
  specialFormKeywords['defmacro'],
  specialFormKeywords['letfn*'],
])

function isUnsupportedVmSpecialForm(name: string): boolean {
  return unsupportedVmSpecialForms.has(name)
}

function intrinsicOpcodeFor(name: string): OpCode | null {
  switch (name) {
    case '+':
      return Op.Add
    case '-':
      return Op.Sub
    case '*':
      return Op.Mul
    case '/':
      return Op.Div
    case '<':
      return Op.Lt
    case '>':
      return Op.Gt
    case '<=':
      return Op.Lte
    case '>=':
      return Op.Gte
    case '=':
      return Op.Eq
    default:
      return null
  }
}

export function compileVm(node: CljValue): VmChunk | null {
  const chunk = makeChunk('vm-expression')
  const compileEnv = {
    locals: new Map<string, number>(),
    nextLocalSlot: 0,
    recurTarget: null,
  } as VmCompileEnv

  if (!emitExpression(chunk, node, compileEnv)) {
    return null
  }

  emit(chunk, Op.Return)
  return chunk
}

function emitExpression(
  chunk: VmChunk,
  node: CljValue,
  compileEnv: VmCompileEnv
): boolean {
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
      const slot = compileEnv.locals.get(node.name)
      if (slot !== undefined) {
        emit(chunk, Op.LoadLocal)
        emitOperand(chunk, slot)
        return true
      }

      const symbolName = node.name
      const slashIdx = symbolName.indexOf('/')
      // qualified symbol not supported yet
      if (slashIdx > 0 && slashIdx < symbolName.length - 1) {
        const localName = symbolName.slice(slashIdx + 1)
        if (localName.includes('.')) {
          // js interop form not yet supported, e.g (js/console.log "hello")
          return false
        }
        const index = addConstant(chunk, node)
        const pos = getPos(node) ?? null
        emit(chunk, Op.LoadQualified, pos)
        emitOperand(chunk, index, pos)
        return true
      }
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
      const name = head.name
      if (name === specialFormKeywords.do)
        return emitDo(chunk, node, compileEnv)
      if (name === specialFormKeywords.if)
        return emitIf(chunk, node, compileEnv)
      if (name === specialFormKeywords['let*']) {
        return emitLetStar(chunk, node, compileEnv)
      }
      if (name === specialFormKeywords['loop*']) {
        return emitLoopStar(chunk, node, compileEnv)
      }
      if (name === specialFormKeywords['recur']) {
        return emitRecur(chunk, node, compileEnv)
      }
      if (isUnsupportedVmSpecialForm(name)) {
        return false
      }

      return emitCall(chunk, node, compileEnv)
    }
    case valueKeywords.vector: {
      return emitVector(chunk, node, compileEnv)
    }
    case valueKeywords.map: {
      return emitMap(chunk, node, compileEnv)
    }
    case valueKeywords.set: {
      return emitSet(chunk, node, compileEnv)
    }
    default:
      return false
  }
}

function emitDo(
  chunk: VmChunk,
  node: CljList,
  compileEnv: VmCompileEnv
): boolean {
  return emitTransaction(chunk, () => {
    const body = node.value.slice(1)
    if (body.length === 0) {
      emit(chunk, Op.Nil, getPos(node) ?? null)
      return true
    }

    for (let i = 0; i < body.length; i++) {
      const form = body[i]

      if (!emitExpression(chunk, form, compileEnv)) return false

      if (i < body.length - 1) {
        emit(chunk, Op.Pop, getPos(node) ?? null)
      }
    }

    return true
  })
}

function emitIf(
  chunk: VmChunk,
  node: CljList,
  compileEnv: VmCompileEnv
): boolean {
  return emitTransaction(chunk, () => {
    const parts = node.value
    if (parts.length < 3 || parts.length > 4) return false

    const test = parts[1]
    const thenBranch = parts[2]
    const elseBranch = parts[3] ?? v.nil()

    if (!emitExpression(chunk, test, compileEnv)) return false

    const elseJump = emitJump(chunk, Op.JumpIfFalsy, getPos(node) ?? null)

    if (!emitExpression(chunk, thenBranch, compileEnv)) return false

    const endJump = emitJump(chunk, Op.Jump, getPos(node) ?? null)

    patchJump(chunk, elseJump)

    if (!emitExpression(chunk, elseBranch, compileEnv)) return false

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

function emitCall(
  chunk: VmChunk,
  node: CljList,
  compileEnv: VmCompileEnv
): boolean {
  if (node.value.length === 0) return false // empty list fallback

  return emitTransaction(chunk, () => {
    const callee = node.value[0]
    const args = node.value.slice(1)
    if (
      is.symbol(callee) &&
      !isQualifiedSymbolName(callee.name) &&
      compileEnv.locals.get(callee.name) === undefined
    ) {
      const intrinsicOpcode = intrinsicOpcodeFor(callee.name as IntrinsicName)
      if (intrinsicOpcode !== null) {
        for (let i = 0; i < args.length; i++) {
          if (!emitExpression(chunk, args[i], compileEnv)) return false
        }

        const pos = getPos(node) ?? null
        emit(chunk, intrinsicOpcode, pos)
        emitOperand(chunk, args.length, pos)

        return true
      }
    }

    if (!emitExpression(chunk, callee, compileEnv)) return false

    for (let i = 0; i < args.length; i++) {
      if (!emitExpression(chunk, args[i], compileEnv)) return false
    }

    const pos = getPos(node) ?? null
    emit(chunk, Op.Call, pos)
    emitOperand(chunk, args.length, pos)

    return true
  })
}

function isQualifiedSymbolName(name: string): boolean {
  const slashIdx = name.indexOf('/')
  return slashIdx > 0 && slashIdx < name.length - 1
}

function emitVector(
  chunk: VmChunk,
  node: CljVector,
  compileEnv: VmCompileEnv
): boolean {
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
      if (!emitExpression(chunk, elements[i], compileEnv)) return false
    }

    const pos = getPos(node) ?? null
    emit(chunk, Op.MakeVector, pos)
    emitOperand(chunk, elements.length, pos)
    return true
  })
}

function emitMap(
  chunk: VmChunk,
  node: CljMap,
  compileEnv: VmCompileEnv
): boolean {
  return emitTransaction(chunk, () => {
    const entries = node.entries
    if (entries.length === 0) {
      emit(chunk, Op.MakeMap, getPos(node) ?? null)
      emitOperand(chunk, 0, getPos(node) ?? null)
      return true
    }

    for (const [key, value] of entries) {
      if (!emitExpression(chunk, key, compileEnv)) return false
      if (!emitExpression(chunk, value, compileEnv)) return false
    }

    const pos = getPos(node) ?? null
    emit(chunk, Op.MakeMap, pos)
    emitOperand(chunk, entries.length, pos)
    return true
  })
}

function emitSet(
  chunk: VmChunk,
  node: CljSet,
  compileEnv: VmCompileEnv
): boolean {
  return emitTransaction(chunk, () => {
    const elements = node.values
    if (elements.length === 0) {
      emit(chunk, Op.MakeSet, getPos(node) ?? null)
      emitOperand(chunk, 0, getPos(node) ?? null)
      return true
    }

    for (let i = 0; i < elements.length; i++) {
      if (!emitExpression(chunk, elements[i], compileEnv)) return false
    }

    const pos = getPos(node) ?? null
    emit(chunk, Op.MakeSet, pos)
    emitOperand(chunk, elements.length, pos)
    return true
  })
}

function emitLetStar(
  chunk: VmChunk,
  node: CljList,
  compileEnv: VmCompileEnv
): boolean {
  return emitTransaction(chunk, () => {
    const bindings = node.value[1]
    if (!bindings) return false
    if (!is.vector(bindings) || bindings.value.length % 2 !== 0) return false
    const body = node.value.slice(2)
    const previousSlots = new Map<string, number | undefined>()

    for (let i = 0; i < bindings.value.length; i += 2) {
      const slot = compileEnv.nextLocalSlot++
      // For each, compile init, then save local
      const name = bindings.value[i]
      if (!is.symbol(name)) return false
      if (!previousSlots.has(name.name)) {
        previousSlots.set(name.name, compileEnv.locals.get(name.name))
      }
      const expr = bindings.value[i + 1]
      if (!emitExpression(chunk, expr, compileEnv)) return false
      emit(chunk, Op.StoreLocal)
      emitOperand(chunk, slot)
      compileEnv.locals.set(name.name, slot)
      chunk.localCount = Math.max(chunk.localCount, compileEnv.nextLocalSlot)
    }

    for (let i = 0; i < body.length; i++) {
      const form = body[i]
      if (!emitExpression(chunk, form, compileEnv)) return false
    }

    for (const [name, previousSlot] of previousSlots) {
      if (previousSlot === undefined) {
        compileEnv.locals.delete(name)
      } else {
        compileEnv.locals.set(name, previousSlot)
      }
    }

    return true
  })
}

function emitLoopStar(
  chunk: VmChunk,
  node: CljList,
  compileEnv: VmCompileEnv
): boolean {
  return emitTransaction(chunk, () => {
    const bindings = node.value[1]
    if (!bindings) return false
    if (!is.vector(bindings) || bindings.value.length % 2 !== 0) return false
    const body = node.value.slice(2)
    assertRecurInTailPosition(body)

    const localStart = compileEnv.nextLocalSlot
    const localCount = bindings.value.length / 2

    const previousSlots = new Map<string, number | undefined>()

    // init loop bindings
    for (let i = 0; i < bindings.value.length; i += 2) {
      const slot = compileEnv.nextLocalSlot++
      const name = bindings.value[i]
      if (!is.symbol(name)) return false
      if (!previousSlots.has(name.name)) {
        previousSlots.set(name.name, compileEnv.locals.get(name.name))
      }
      const expr = bindings.value[i + 1]
      if (!emitExpression(chunk, expr, compileEnv)) return false
      emit(chunk, Op.StoreLocal)
      emitOperand(chunk, slot)
      compileEnv.locals.set(name.name, slot)
      chunk.localCount = Math.max(chunk.localCount, compileEnv.nextLocalSlot)
    }

    const loopHeader = chunk.code.length

    const recurTarget = {
      localStart,
      localCount,
      loopHeader,
    }

    const previousRecurTarget = compileEnv.recurTarget
    compileEnv.recurTarget = recurTarget
    let bodyCompiled = true

    for (let i = 0; i < body.length; i++) {
      const form = body[i]
      if (!emitExpression(chunk, form, compileEnv)) {
        bodyCompiled = false
        break
      }
    }
    compileEnv.recurTarget = previousRecurTarget
    if (!bodyCompiled) return false

    for (const [name, previousSlot] of previousSlots) {
      if (previousSlot === undefined) {
        compileEnv.locals.delete(name)
      } else {
        compileEnv.locals.set(name, previousSlot)
      }
    }

    return true
  })
}

function emitRecur(
  chunk: VmChunk,
  node: CljList,
  compileEnv: VmCompileEnv
): boolean {
  return emitTransaction(chunk, () => {
    const recurTarget = compileEnv.recurTarget
    if (recurTarget === null) return false
    const args = node.value.slice(1)

    if (args.length !== recurTarget.localCount) return false

    // Emit expressions for the arguments that will be placed in the stack
    for (let i = 0; i < args.length; i++) {
      if (!emitExpression(chunk, args[i], compileEnv)) return false
    }

    emit(chunk, Op.Recur)
    emitOperand(chunk, recurTarget.localStart)
    emitOperand(chunk, recurTarget.localCount)
    emitOperand(chunk, recurTarget.loopHeader)

    return true
  })
}

export function compileVmFnBody(
  params: CljSymbol[],
  restParam: CljSymbol | null,
  body: CljValue[]
): VmChunk | null {
  const compileEnv = {
    locals: new Map<string, number>(),
    nextLocalSlot: 0,
    recurTarget: null,
  } as VmCompileEnv

  if (restParam !== null) {
    return null
  }

  params.forEach((param, index) => {
    compileEnv.locals.set(param.name, index)
  })

  const chunk = makeChunk('vm-fn-body')
  chunk.localCount = params.length
  compileEnv.nextLocalSlot = params.length

  for (let i = 0; i < body.length; i++) {
    const form = body[i]
    if (!emitExpression(chunk, form, compileEnv)) return null

    if (i < body.length - 1) {
      emit(chunk, Op.Pop)
    }
  }

  emit(chunk, Op.Return)

  return chunk
}
