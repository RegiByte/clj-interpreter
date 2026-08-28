import { is } from '../assertions'
import { derefValue, getNamespaceEnv, lookupVar, tryLookup } from '../env'
import { v } from '../factories'
import { specialFormKeywords } from '../keywords'
import { printString } from '../printer'
import type {
  Arity,
  CljSymbol,
  CljValue,
  CljVar,
  Env,
  EvaluationContext,
  OpCode,
  VmChunk,
  VmLexicalVarLookup,
} from '../types'
import { tryCompileVmFromIr } from './ir-compiler'
import {
  collectArityDisassemblyEntries,
  collectChunkDisassemblyEntries,
  type VmDisassemblyEntry,
} from './debug'
import { Op, opcodeName } from './opcodes'

type BytecodeTargetKind = 'expression' | 'var' | 'function' | 'macro'

export type VmBytecodeTarget = {
  target: BytecodeTargetKind
  entries: VmDisassemblyEntry[]
}

type BytecodeValueKind = 'function' | 'macro' | 'native' | 'other'

export type VmBytecodeValueSummary = {
  kind: BytecodeValueKind
  arityCount: number
  bytecodeArityCount: number
  entries: VmDisassemblyEntry[]
}

type StackProvenance = {
  callee: string
} | null

type DecodedInstruction = {
  offset: number
  opcode: OpCode
  op: string
  operands: number[]
  nextOffset: number
  constantIndex?: number
  constant?: CljValue
  symbol?: CljSymbol
  lexicalLookup?: VmLexicalVarLookup
  targetOffset?: number
  argc?: number
}

export function resolveBytecodeTarget(
  ctx: EvaluationContext,
  callEnv: Env,
  form: CljValue | undefined
): VmBytecodeTarget | null {
  if (form === undefined || is.nil(form)) return null

  if (isVarForm(form) && is.symbol(form.value[1])) {
    const varRef = resolveVarTarget(ctx, callEnv, form.value[1])
    if (varRef === undefined) return null

    const entries = bytecodeEntriesForValue(
      varRef.value,
      `${varRef.ns}/${varRef.name}`
    )
    return entries.length === 0 ? null : { target: 'var', entries }
  }

  if (is.symbol(form)) {
    const varRef = resolveVarTarget(ctx, callEnv, form)
    if (varRef !== undefined) {
      const entries = bytecodeEntriesForValue(
        varRef.value,
        `${varRef.ns}/${varRef.name}`
      )
      if (entries.length > 0) return { target: 'var', entries }
    }

    const value = tryLookup(form.name, callEnv)
    if (value !== undefined) {
      const entries = bytecodeEntriesForValue(value, form.name)
      if (entries.length > 0) {
        return {
          target: is.macro(value) ? 'macro' : 'function',
          entries,
        }
      }
    }

    return null
  }

  const expanded = ctx.expandAll(form, callEnv)
  const result = tryCompileVmFromIr(expanded, callEnv, ctx)
  if (!result.ok) return null

  return {
    target: 'expression',
    entries: collectChunkDisassemblyEntries(result.chunk, 'expression'),
  }
}

export function bytecodeInfoForTarget(target: VmBytecodeTarget): CljValue {
  return v.map([
    [v.keyword(':target'), v.keyword(`:${target.target}`)],
    [
      v.keyword(':chunks'),
      v.vector(
        target.entries.map((entry) => chunkInfoToMap(entry.label, entry.chunk))
      ),
    ],
  ])
}

export function bytecodeSummaryForValue(value: CljValue): VmBytecodeValueSummary {
  const resolved = is.var(value) ? derefValue(value) : value
  const label = is.var(value)
    ? `${value.ns}/${value.name}`
    : valueLabelForSummary(resolved)

  if (is.function(resolved) || is.macro(resolved)) {
    return {
      kind: is.macro(resolved) ? 'macro' : 'function',
      arityCount: resolved.arities.length,
      bytecodeArityCount: resolved.arities.filter(
        (arity) => arity.bytecodeBody !== undefined
      ).length,
      entries: bytecodeEntriesForValue(resolved, label),
    }
  }

  return {
    kind: is.nativeFunction(resolved) ? 'native' : 'other',
    arityCount: 0,
    bytecodeArityCount: 0,
    entries: [],
  }
}

export function bytecodeSummaryToMap(summary: VmBytecodeValueSummary): CljValue {
  const info =
    summary.entries.length === 0
      ? v.nil()
      : bytecodeInfoForTarget({
          target: summary.kind === 'macro' ? 'macro' : 'function',
          entries: summary.entries,
        })

  return v.map([
    [v.keyword(':kind'), v.keyword(`:${summary.kind}`)],
    [v.keyword(':arity-count'), v.number(summary.arityCount)],
    [v.keyword(':bytecode-arity-count'), v.number(summary.bytecodeArityCount)],
    [v.keyword(':bytecode-info'), info],
  ])
}

function chunkInfoToMap(label: string, chunk: VmChunk): CljValue {
  return v.map([
    [v.keyword(':label'), v.string(label)],
    [v.keyword(':name'), chunk.name === undefined ? v.nil() : v.string(chunk.name)],
    [v.keyword(':local-count'), v.number(chunk.localCount)],
    [v.keyword(':max-stack'), v.number(chunk.maxStack)],
    [
      v.keyword(':instructions'),
      v.vector(instructionMapsForChunk(chunk)),
    ],
  ])
}

function instructionMapsForChunk(chunk: VmChunk): CljValue[] {
  const result: CljValue[] = []
  const stack: StackProvenance[] = []
  let offset = 0

  while (offset < chunk.code.length) {
    const instruction = decodeInstruction(chunk, offset)
    const callee = applyInstructionStackEffect(stack, instruction)
    result.push(instructionToMap(instruction, callee))
    offset = instruction.nextOffset
  }

  return result
}

function instructionToMap(
  instruction: DecodedInstruction,
  callee: string | undefined
): CljValue {
  const entries: [CljValue, CljValue][] = [
    [v.keyword(':offset'), v.number(instruction.offset)],
    [v.keyword(':opcode'), v.number(instruction.opcode)],
    [v.keyword(':op'), v.keyword(`:${instruction.op}`)],
    [
      v.keyword(':operands'),
      v.vector(instruction.operands.map((operand) => v.number(operand))),
    ],
  ]

  if (instruction.constantIndex !== undefined) {
    entries.push([v.keyword(':constant-index'), v.number(instruction.constantIndex)])
  }
  if (instruction.constant !== undefined) {
    entries.push([v.keyword(':constant'), v.string(printString(instruction.constant))])
    entries.push([v.keyword(':constant-type'), v.keyword(`:${instruction.constant.kind}`)])
  }
  if (instruction.symbol !== undefined) {
    entries.push([v.keyword(':symbol'), v.string(instruction.symbol.name)])
  }
  if (instruction.lexicalLookup !== undefined) {
    entries.push([
      v.keyword(':lexical-candidates'),
      v.vector(
        instruction.lexicalLookup.candidates.map((candidate) =>
          v.map([
            [v.keyword(':kind'), v.keyword(`:${candidate.kind}`)],
            [v.keyword(':slot'), v.number(candidate.slot)],
          ])
        )
      ),
    ])
  }
  if (instruction.targetOffset !== undefined) {
    entries.push([v.keyword(':target-offset'), v.number(instruction.targetOffset)])
  }
  if (instruction.argc !== undefined) {
    entries.push([v.keyword(':argc'), v.number(instruction.argc)])
  }
  if (callee !== undefined) {
    entries.push([v.keyword(':callee'), v.string(callee)])
  }

  return v.map(entries)
}

function decodeInstruction(chunk: VmChunk, offset: number): DecodedInstruction {
  const opcode = chunk.code[offset] as OpCode
  const op = opcodeKeywordName(opcode)

  switch (opcode) {
    case Op.Constant: {
      const constantIndex = chunk.code[offset + 1]
      const constant = chunk.constants[constantIndex]
      return {
        offset,
        opcode,
        op,
        operands: [constantIndex],
        nextOffset: offset + 2,
        constantIndex,
        constant,
        symbol: constant !== undefined && is.symbol(constant) ? constant : undefined,
      }
    }
    case Op.LoadGlobal:
    case Op.LoadQualified:
    case Op.LoadVar:
    case Op.Def:
    case Op.DefMacro:
    case Op.JsGetProp:
    case Op.PushDynamicBinding:
    case Op.SetDynamic:
    case Op.WithMeta: {
      const constantIndex = chunk.code[offset + 1]
      const constant = chunk.constants[constantIndex]
      return {
        offset,
        opcode,
        op,
        operands: [constantIndex],
        nextOffset: offset + 2,
        constantIndex,
        constant,
        symbol: constant !== undefined && is.symbol(constant) ? constant : undefined,
      }
    }
    case Op.LoadLocal:
    case Op.StoreLocal:
    case Op.LoadUpvalue:
    case Op.Closure:
    case Op.MakeVector:
    case Op.MakeMap:
    case Op.MakeSet:
    case Op.EnterFinally:
    case Op.JsNew: {
      const operand = chunk.code[offset + 1]
      return {
        offset,
        opcode,
        op,
        operands: [operand],
        nextOffset: offset + 2,
        targetOffset: opcode === Op.EnterFinally ? operand : undefined,
        argc: opcode === Op.JsNew ? operand : undefined,
      }
    }
    case Op.LoadLexicalVar: {
      const lookupIndex = chunk.code[offset + 1]
      const lookup = chunk.lexicalVarLookups[lookupIndex]
      return {
        offset,
        opcode,
        op,
        operands: [lookupIndex],
        nextOffset: offset + 2,
        symbol: lookup?.symbol,
        lexicalLookup: lookup,
      }
    }
    case Op.Jump:
    case Op.JumpIfFalsy: {
      const operand = chunk.code[offset + 1]
      return {
        offset,
        opcode,
        op,
        operands: [operand],
        nextOffset: offset + 2,
        targetOffset: offset + 2 + operand,
      }
    }
    case Op.Call:
    case Op.FnRecur:
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
      return {
        offset,
        opcode,
        op,
        operands: [argc],
        nextOffset: offset + 2,
        targetOffset: opcode === Op.FnRecur ? 0 : undefined,
        argc,
      }
    }
    case Op.JsInvoke:
    case Op.FnRecurRest: {
      const first = chunk.code[offset + 1]
      const second = chunk.code[offset + 2]
      const constant = opcode === Op.JsInvoke ? chunk.constants[first] : undefined
      return {
        offset,
        opcode,
        op,
        operands: [first, second],
        nextOffset: offset + 3,
        constantIndex: opcode === Op.JsInvoke ? first : undefined,
        constant,
        symbol: constant !== undefined && is.symbol(constant) ? constant : undefined,
        argc: opcode === Op.JsInvoke ? second : first,
        targetOffset: opcode === Op.FnRecurRest ? 0 : undefined,
      }
    }
    case Op.Recur: {
      const localStart = chunk.code[offset + 1]
      const localCount = chunk.code[offset + 2]
      const loopHeader = chunk.code[offset + 3]
      return {
        offset,
        opcode,
        op,
        operands: [localStart, localCount, loopHeader],
        nextOffset: offset + 4,
        targetOffset: loopHeader,
        argc: localCount,
      }
    }
    case Op.PushTry: {
      const catchTableIndex = chunk.code[offset + 1]
      const finallyIp = chunk.code[offset + 2]
      const afterIp = chunk.code[offset + 3]
      return {
        offset,
        opcode,
        op,
        operands: [catchTableIndex, finallyIp, afterIp],
        nextOffset: offset + 4,
        targetOffset: afterIp,
      }
    }
    default:
      return {
        offset,
        opcode,
        op,
        operands: [],
        nextOffset: offset + 1,
      }
  }
}

function applyInstructionStackEffect(
  stack: StackProvenance[],
  instruction: DecodedInstruction
): string | undefined {
  switch (instruction.opcode) {
    case Op.Constant:
    case Op.Nil:
    case Op.True:
    case Op.False:
    case Op.LoadLocal:
    case Op.LoadUpvalue:
    case Op.Closure:
      stack.push(null)
      return undefined
    case Op.LoadGlobal:
    case Op.LoadQualified:
    case Op.LoadVar:
    case Op.LoadLexicalVar:
      stack.push(instruction.symbol ? { callee: instruction.symbol.name } : null)
      return undefined
    case Op.Pop:
    case Op.StoreLocal:
    case Op.Return:
    case Op.JumpIfFalsy:
    case Op.Throw:
      stack.pop()
      return undefined
    case Op.Call: {
      const argc = instruction.argc ?? 0
      const callee = stack[stack.length - argc - 1]?.callee
      popMany(stack, argc + 1)
      stack.push(null)
      return callee
    }
    case Op.JsNew: {
      const argc = instruction.argc ?? 0
      popMany(stack, argc + 1)
      stack.push(null)
      return undefined
    }
    case Op.JsInvoke: {
      const argc = instruction.argc ?? 0
      popMany(stack, argc + 1)
      stack.push(null)
      return undefined
    }
    case Op.MakeVector:
    case Op.MakeSet: {
      popMany(stack, instruction.operands[0] ?? 0)
      stack.push(null)
      return undefined
    }
    case Op.MakeMap: {
      popMany(stack, (instruction.operands[0] ?? 0) * 2)
      stack.push(null)
      return undefined
    }
    case Op.WithMeta:
    case Op.Def:
    case Op.DefMacro:
    case Op.JsGetProp:
      return undefined
    case Op.PushDynamicBinding:
      stack.pop()
      return undefined
    case Op.Add:
    case Op.Sub:
    case Op.Mul:
    case Op.Div:
    case Op.Lt:
    case Op.Lte:
    case Op.Gt:
    case Op.Gte:
    case Op.Eq:
      popMany(stack, instruction.argc ?? 0)
      stack.push(null)
      return undefined
    case Op.Recur:
      popMany(stack, instruction.argc ?? 0)
      return undefined
    case Op.FnRecur:
    case Op.FnRecurRest:
      popMany(stack, instruction.argc ?? 0)
      return undefined
    default:
      return undefined
  }
}

function popMany(stack: StackProvenance[], count: number): void {
  for (let i = 0; i < count; i++) stack.pop()
}

function opcodeKeywordName(opcode: OpCode): string {
  return opcodeName(opcode)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
}

function resolveVarTarget(
  ctx: EvaluationContext,
  callEnv: Env,
  sym: CljSymbol
): CljVar | undefined {
  const slashIdx = sym.name.indexOf('/')
  if (slashIdx > 0 && slashIdx < sym.name.length - 1) {
    const alias = sym.name.slice(0, slashIdx)
    const localName = sym.name.slice(slashIdx + 1)
    const nsEnv = getNamespaceEnv(callEnv)
    const targetNs =
      nsEnv.ns?.aliases.get(alias) ?? ctx.resolveNs(alias) ?? null
    return targetNs?.vars.get(localName)
  }

  return lookupVar(sym.name, callEnv)
}

function bytecodeEntriesForValue(
  value: CljValue,
  label: string
): VmDisassemblyEntry[] {
  if (is.var(value)) {
    return bytecodeEntriesForValue(derefValue(value), `${value.ns}/${value.name}`)
  }

  if (is.function(value) || is.macro(value)) {
    const entries: VmDisassemblyEntry[] = []
    value.arities.forEach((arity, index) => {
      entries.push(
        ...collectArityDisassemblyEntries(arity as Arity, `${label}/arity[${index}]`)
      )
    })
    return entries
  }

  return []
}

function valueLabelForSummary(value: CljValue): string {
  if ((is.function(value) || is.macro(value)) && value.name) return value.name
  return value.kind
}

function isVarForm(form: CljValue): form is { kind: 'list'; value: CljValue[] } {
  return (
    is.list(form) &&
    form.value.length === 2 &&
    is.symbol(form.value[0]) &&
    form.value[0].name === specialFormKeywords.var
  )
}

type JsCounts = {
  opFreqs: Map<string, number>
  invFreqs: Map<string, number>
  ngramFreqMaps: Map<number, Map<string, number>>
  chunkCount: number
  instructionCount: number
}

function makeJsCounts(ngramSizes: number[]): JsCounts {
  const ngramFreqMaps = new Map<number, Map<string, number>>()
  for (const n of ngramSizes) ngramFreqMaps.set(n, new Map())
  return { opFreqs: new Map(), invFreqs: new Map(), ngramFreqMaps, chunkCount: 0, instructionCount: 0 }
}

function accumulateEntryCounts(entries: VmDisassemblyEntry[], ngramSizes: number[], counts: JsCounts): void {
  for (const entry of entries) {
    counts.chunkCount++
    const ops: string[] = []
    const calleeStack: StackProvenance[] = []
    let offset = 0

    while (offset < entry.chunk.code.length) {
      const instruction = decodeInstruction(entry.chunk, offset)
      const opName = instruction.op
      ops.push(opName)
      counts.opFreqs.set(opName, (counts.opFreqs.get(opName) ?? 0) + 1)
      counts.instructionCount++

      const callee = applyInstructionStackEffect(calleeStack, instruction)
      if (callee !== undefined) {
        counts.invFreqs.set(callee, (counts.invFreqs.get(callee) ?? 0) + 1)
      }

      offset = instruction.nextOffset
    }

    for (const n of ngramSizes) {
      const freqMap = counts.ngramFreqMaps.get(n)!
      for (let i = 0; i <= ops.length - n; i++) {
        const key = ops.slice(i, i + n).join('\0')
        freqMap.set(key, (freqMap.get(key) ?? 0) + 1)
      }
    }
  }
}

function accumulateCounts(src: JsCounts, dst: JsCounts): void {
  for (const [k, c] of src.opFreqs) dst.opFreqs.set(k, (dst.opFreqs.get(k) ?? 0) + c)
  for (const [k, c] of src.invFreqs) dst.invFreqs.set(k, (dst.invFreqs.get(k) ?? 0) + c)
  for (const [n, srcMap] of src.ngramFreqMaps) {
    const dstMap = dst.ngramFreqMaps.get(n)!
    for (const [k, c] of srcMap) dstMap.set(k, (dstMap.get(k) ?? 0) + c)
  }
  dst.chunkCount += src.chunkCount
  dst.instructionCount += src.instructionCount
}

function materializeOpFreqMap(freqs: Map<string, number>): CljValue {
  return v.map([...freqs.entries()].map(([k, c]) => [v.keyword(`:${k}`), v.number(c)]))
}

function materializeInvFreqMap(freqs: Map<string, number>): CljValue {
  return v.map([...freqs.entries()].map(([k, c]) => [v.string(k), v.number(c)]))
}

function materializeNgramFreqMap(ngramFreqMaps: Map<number, Map<string, number>>, ngramSizes: number[]): CljValue {
  const entries: [CljValue, CljValue][] = []
  for (const n of ngramSizes) {
    const freqMap = ngramFreqMaps.get(n)!
    entries.push([
      v.number(n),
      v.map(
        [...freqMap.entries()].map(([key, count]) => [
          v.vector(key.split('\0').map((k) => v.keyword(`:${k}`))),
          v.number(count),
        ])
      ),
    ])
  }
  return v.map(entries)
}

function valueKindAndEntries(
  value: CljValue,
  label: string
): { kind: string; arityCount: number; bytecodeArityCount: number; entries: VmDisassemblyEntry[] } {
  const resolved = is.var(value) ? derefValue(value) : value

  if (is.function(resolved) || is.macro(resolved)) {
    const kind = is.macro(resolved) ? 'macro' : 'function'
    const arityCount = resolved.arities.length
    const bytecodeArityCount = resolved.arities.filter((a) => a.bytecodeBody !== undefined).length
    const entries = bytecodeEntriesForValue(resolved, label)
    return { kind: entries.length === 0 ? 'unsupported' : kind, arityCount, bytecodeArityCount, entries }
  }

  return {
    kind: is.nativeFunction(resolved) ? 'native' : 'other',
    arityCount: 0,
    bytecodeArityCount: 0,
    entries: [],
  }
}

export function bytecodeCensusItemForValue(
  value: CljValue,
  ngramSizes: number[]
): CljValue {
  const resolved = is.var(value) ? derefValue(value) : value
  const label = is.var(value)
    ? `${(value as CljVar).ns}/${(value as CljVar).name}`
    : valueLabelForSummary(resolved)

  const { kind, arityCount, bytecodeArityCount, entries } = valueKindAndEntries(value, label)
  const counts = makeJsCounts(ngramSizes)
  accumulateEntryCounts(entries, ngramSizes, counts)

  return v.map([
    [v.keyword(':kind'), v.keyword(`:${kind}`)],
    [v.keyword(':arity-count'), v.number(arityCount)],
    [v.keyword(':bytecode-arity-count'), v.number(bytecodeArityCount)],
    [v.keyword(':bytecode?'), v.boolean(entries.length > 0)],
    [v.keyword(':chunk-count'), v.number(counts.chunkCount)],
    [v.keyword(':instruction-count'), v.number(counts.instructionCount)],
    [v.keyword(':opcode-frequencies'), materializeOpFreqMap(counts.opFreqs)],
    [v.keyword(':invocation-frequencies'), materializeInvFreqMap(counts.invFreqs)],
    [v.keyword(':opcode-ngrams'), materializeNgramFreqMap(counts.ngramFreqMaps, ngramSizes)],
  ])
}

type NsCensusItem = {
  name: CljValue
  kind: string
  arityCount: number
  bytecodeArityCount: number
  hasBytecode: boolean
  chunkCount: number
  instructionCount: number
  counts: JsCounts
}

function isPrivateVar(theVar: CljVar): boolean {
  return (theVar.meta?.entries ?? []).some(
    ([k, val]) =>
      is.keyword(k) && k.name === ':private' && is.boolean(val) && val.value === true
  )
}

export function namespaceCensus(
  ctx: EvaluationContext,
  nsSym: CljSymbol,
  includePrivate: boolean,
  ngramSizes: number[]
): CljValue {
  const ns = ctx.resolveNs(nsSym.name)
  if (ns === null) {
    throw new Error(`Namespace not found: ${nsSym.name}`)
  }

  const aggCounts = makeJsCounts(ngramSizes)
  let totalVars = 0
  let totalBytecodeVars = 0
  let totalNativeVars = 0
  let totalOtherVars = 0
  let totalUnsupportedVars = 0
  let totalArities = 0
  let totalBytecodeArities = 0
  const nsItems: NsCensusItem[] = []

  for (const [varName, theVar] of ns.vars) {
    if (theVar.ns !== ns.name) continue
    if (!includePrivate && isPrivateVar(theVar)) continue

    const label = `${ns.name}/${varName}`
    const { kind, arityCount, bytecodeArityCount, entries } = valueKindAndEntries(theVar, label)
    const itemCounts = makeJsCounts(ngramSizes)
    accumulateEntryCounts(entries, ngramSizes, itemCounts)
    accumulateCounts(itemCounts, aggCounts)

    totalVars++
    totalArities += arityCount
    totalBytecodeArities += bytecodeArityCount
    if (entries.length > 0) totalBytecodeVars++
    else if (kind === 'native') totalNativeVars++
    else if (kind === 'unsupported') totalUnsupportedVars++
    else totalOtherVars++

    nsItems.push({ name: v.symbol(varName), kind, arityCount, bytecodeArityCount, hasBytecode: entries.length > 0, chunkCount: itemCounts.chunkCount, instructionCount: itemCounts.instructionCount, counts: itemCounts })
  }

  const totalsMap = v.map([
    [v.keyword(':vars'), v.number(totalVars)],
    [v.keyword(':bytecode-vars'), v.number(totalBytecodeVars)],
    [v.keyword(':native-vars'), v.number(totalNativeVars)],
    [v.keyword(':other-vars'), v.number(totalOtherVars)],
    [v.keyword(':unsupported-vars'), v.number(totalUnsupportedVars)],
    [v.keyword(':arities'), v.number(totalArities)],
    [v.keyword(':bytecode-arities'), v.number(totalBytecodeArities)],
    [v.keyword(':chunks'), v.number(aggCounts.chunkCount)],
    [v.keyword(':instructions'), v.number(aggCounts.instructionCount)],
  ])

  const itemMaps = nsItems.map((item) =>
    v.map([
      [v.keyword(':name'), item.name],
      [v.keyword(':kind'), v.keyword(`:${item.kind}`)],
      [v.keyword(':bytecode?'), v.boolean(item.hasBytecode)],
      [v.keyword(':arity-count'), v.number(item.arityCount)],
      [v.keyword(':bytecode-arity-count'), v.number(item.bytecodeArityCount)],
      [v.keyword(':chunk-count'), v.number(item.chunkCount)],
      [v.keyword(':instruction-count'), v.number(item.instructionCount)],
      [v.keyword(':opcode-frequencies'), materializeOpFreqMap(item.counts.opFreqs)],
      [v.keyword(':invocation-frequencies'), materializeInvFreqMap(item.counts.invFreqs)],
      [v.keyword(':opcode-ngrams'), materializeNgramFreqMap(item.counts.ngramFreqMaps, ngramSizes)],
    ])
  )

  return v.map([
    [v.keyword(':namespace'), v.symbol(nsSym.name)],
    [v.keyword(':scope'), includePrivate ? v.keyword(':interns') : v.keyword(':publics')],
    [v.keyword(':totals'), totalsMap],
    [v.keyword(':opcode-frequencies'), materializeOpFreqMap(aggCounts.opFreqs)],
    [v.keyword(':invocation-frequencies'), materializeInvFreqMap(aggCounts.invFreqs)],
    [v.keyword(':opcode-ngrams'), materializeNgramFreqMap(aggCounts.ngramFreqMaps, ngramSizes)],
    [v.keyword(':items'), v.vector(itemMaps)],
  ])
}
