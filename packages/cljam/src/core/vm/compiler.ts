import { is } from '../assertions'
import { parseArities } from '../evaluator/arity'
import { assertRecurInTailPosition } from '../evaluator/recur-check'
import { v } from '../factories'
import { specialFormKeywords, valueKeywords } from '../keywords'
import { getPos } from '../positions'
import type {
  Arity,
  CljList,
  CljMap,
  CljSet,
  CljSymbol,
  CljValue,
  Env,
  CljVector,
  OpCode,
  Pos,
  VmChunk,
  VmFunctionTemplate,
  VmUpvalueDescriptor,
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
  kind: 'loop'
  localStart: number
  localCount: number
  loopHeader: number
} | {
  kind: 'fn'
  paramCount: number
  hasRestParam: boolean
}

type IntrinsicName = '+' | '-' | '*' | '/' | '<' | '>' | '<=' | '>=' | '='

type VmLocal = {
  name: string
  slot: number
  captured: boolean
  loopLocal: boolean
}

type VmCompileEnv = {
  locals: Map<string, number>
  localInfo: VmLocal[]
  upvalueDescriptors: VmUpvalueDescriptor[]
  nextLocalSlot: number
  recurTarget: RecurTarget | null
  allowNestedFn: boolean
  enclosing: VmCompileEnv | null
  functionDepth: number
}

type UpvalueResolution = number | null

const unsupportedVmSpecialForms = new Set<string>([
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
    localInfo: [],
    upvalueDescriptors: [],
    nextLocalSlot: 0,
    recurTarget: null,
    allowNestedFn: false,
    enclosing: null,
    functionDepth: 0,
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
      const upvalueSlot = resolveUpvalue(compileEnv, node.name)
      if (upvalueSlot !== null) {
        emit(chunk, Op.LoadUpvalue)
        emitOperand(chunk, upvalueSlot)
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
      if (name === specialFormKeywords['fn*']) {
        return emitFnStar(chunk, node, compileEnv)
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

function emitFnStar(
  chunk: VmChunk,
  node: CljList,
  compileEnv: VmCompileEnv
): boolean {
  if (!compileEnv.allowNestedFn) return false

  return emitTransaction(chunk, () => {
    const rest = node.value.slice(1)
    if (rest[0] && is.symbol(rest[0])) {
      return false
    }

    let arities: Arity[]
    try {
      arities = parseArities(rest, emptyEnvForVmParsing())
    } catch {
      return false
    }

    const templateArityChunks = []
    const upvalueDescriptors: VmUpvalueDescriptor[] = []

    for (const arity of arities) {
      assertRecurInTailPosition(arity.body)
      const arityChunk = compileVmFnBodyInternal(
        arity.params,
        arity.restParam,
        arity.body,
        {
          allowNestedFn: true,
          enclosing: compileEnv,
          upvalueDescriptors,
        }
      )
      if (arityChunk === null) return false
      templateArityChunks.push({
        params: arity.params,
        restParam: arity.restParam,
        chunk: arityChunk,
      })
    }

    const template: VmFunctionTemplate = {
      arities: templateArityChunks,
      upvalueDescriptors: [...upvalueDescriptors],
    }
    const templateIndex = chunk.innerFunctions.length
    chunk.innerFunctions.push(template)
    emit(chunk, Op.Closure, getPos(node) ?? null)
    emitOperand(chunk, templateIndex, getPos(node) ?? null)

    return true
  })
}

function emptyEnvForVmParsing(): Env {
  return { bindings: new Map(), outer: null }
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
      compileEnv.locals.get(callee.name) === undefined &&
      !hasEnclosingLocal(compileEnv, callee.name)
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
      declareLocal(compileEnv, name.name, slot, false)
      chunk.localCount = Math.max(chunk.localCount, compileEnv.nextLocalSlot)
    }

    for (let i = 0; i < body.length; i++) {
      const form = body[i]
      if (!emitExpression(chunk, form, compileEnv)) return false

      if (i < body.length - 1) {
        emit(chunk, Op.Pop)
      }
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
      declareLocal(compileEnv, name.name, slot, true)
      chunk.localCount = Math.max(chunk.localCount, compileEnv.nextLocalSlot)
    }

    const loopHeader = chunk.code.length

    const recurTarget = {
      kind: 'loop',
      localStart,
      localCount,
      loopHeader,
    } satisfies RecurTarget

    const previousRecurTarget = compileEnv.recurTarget
    compileEnv.recurTarget = recurTarget
    let bodyCompiled = true

    for (let i = 0; i < body.length; i++) {
      const form = body[i]
      if (!emitExpression(chunk, form, compileEnv)) {
        bodyCompiled = false
        break
      }

      if (i < body.length - 1) {
        emit(chunk, Op.Pop)
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

    if (recurTarget.kind === 'loop') {
      if (args.length !== recurTarget.localCount) return false
    } else if (recurTarget.hasRestParam) {
      if (args.length < recurTarget.paramCount) return false
    } else if (args.length !== recurTarget.paramCount) {
      return false
    }

    // Emit expressions for the arguments that will be placed in the stack
    for (let i = 0; i < args.length; i++) {
      if (!emitExpression(chunk, args[i], compileEnv)) return false
    }

    if (recurTarget.kind === 'loop') {
      emit(chunk, Op.Recur)
      emitOperand(chunk, recurTarget.localStart)
      emitOperand(chunk, recurTarget.localCount)
      emitOperand(chunk, recurTarget.loopHeader)
    } else if (recurTarget.hasRestParam) {
      emit(chunk, Op.FnRecurRest)
      emitOperand(chunk, args.length)
      emitOperand(chunk, recurTarget.paramCount)
    } else {
      emit(chunk, Op.FnRecur)
      emitOperand(chunk, recurTarget.paramCount)
    }

    return true
  })
}

export function compileVmFnBody(
  params: CljSymbol[],
  restParam: CljSymbol | null,
  body: CljValue[]
): VmChunk | null {
  return compileVmFnBodyInternal(params, restParam, body, {
    allowNestedFn: true,
    enclosing: null,
  })
}

function compileVmFnBodyInternal(
  params: CljSymbol[],
  restParam: CljSymbol | null,
  body: CljValue[],
  options: {
    allowNestedFn: boolean
    enclosing: VmCompileEnv | null
    upvalueDescriptors?: VmUpvalueDescriptor[]
  }
): VmChunk | null {
  const compileEnv = {
    locals: new Map<string, number>(),
    localInfo: [],
    upvalueDescriptors: options.upvalueDescriptors ?? [],
    nextLocalSlot: 0,
    recurTarget: {
      kind: 'fn',
      paramCount: params.length,
      hasRestParam: restParam !== null,
    },
    allowNestedFn: options.allowNestedFn,
    enclosing: options.enclosing,
    functionDepth: (options.enclosing?.functionDepth ?? -1) + 1,
  } as VmCompileEnv

  params.forEach((param, index) => {
    declareLocal(compileEnv, param.name, index, false)
  })

  if (restParam !== null) {
    declareLocal(compileEnv, restParam.name, params.length, false)
  }

  const chunk = makeChunk('vm-fn-body')
  const paramSlotCount = params.length + (restParam === null ? 0 : 1)
  chunk.localCount = paramSlotCount
  compileEnv.nextLocalSlot = paramSlotCount

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

function declareLocal(
  compileEnv: VmCompileEnv,
  name: string,
  slot: number,
  loopLocal: boolean
): void {
  compileEnv.locals.set(name, slot)
  compileEnv.localInfo[slot] = {
    name,
    slot,
    captured: false,
    loopLocal,
  }
}

function resolveUpvalue(
  compileEnv: VmCompileEnv,
  name: string
): UpvalueResolution {
  const enclosing = compileEnv.enclosing
  if (enclosing === null) return null

  const local = enclosing.locals.get(name)
  if (local !== undefined) {
    const localInfo = enclosing.localInfo[local]
    if (localInfo !== undefined) localInfo.captured = true
    return addUpvalueDescriptor(compileEnv, { isLocal: true, index: local })
  }

  const enclosingUpvalue = resolveUpvalue(enclosing, name)
  if (enclosingUpvalue === null) return null

  return addUpvalueDescriptor(compileEnv, {
    isLocal: false,
    index: enclosingUpvalue,
  })
}

function addUpvalueDescriptor(
  compileEnv: VmCompileEnv,
  descriptor: VmUpvalueDescriptor
): number {
  const existingIndex = compileEnv.upvalueDescriptors.findIndex(
    (existing) =>
      existing.isLocal === descriptor.isLocal &&
      existing.index === descriptor.index
  )
  if (existingIndex !== -1) return existingIndex

  compileEnv.upvalueDescriptors.push(descriptor)
  return compileEnv.upvalueDescriptors.length - 1
}

function hasEnclosingLocal(compileEnv: VmCompileEnv, name: string): boolean {
  let current = compileEnv.enclosing
  while (current !== null) {
    if (current.locals.has(name)) return true
    current = current.enclosing
  }
  return false
}
