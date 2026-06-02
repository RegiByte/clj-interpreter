/**
 * IR-driven VM bytecode compiler (Phase 1).
 *
 * A pure lowering from the analyzer IR (`AstNode`) to a `VmChunk`. Unlike the
 * legacy `vm/compiler.ts`, this emitter makes NO scoping decisions: every local
 * slot, upvalue index, capture set, recur target, and tail-position fact is
 * already resolved on the IR by the analyzer. The emitter only translates a
 * resolved tree into bytecode, reusing the `chunk.ts` emit primitives (so
 * `maxStack` is tracked for free).
 *
 * Two public entry points mirror the legacy compiler's signatures so the live
 * path can swap to them one line at a time:
 *   - `tryCompileVmFromIr`        ~ `tryCompileVm`        (whole top-level form)
 *   - `tryCompileVmFnBodyFromIr`  ~ `tryCompileVmFnBody`  (one fn arity body)
 *
 * The shared primitive is `emitMethodBodyToChunk`: it lays an arity's frame
 * (params at slots 0..n-1, rest at n, self after params) and emits the body in
 * tail position followed by `Return`. The `fn` lowering reuses it per method to
 * build `innerFunctions` templates; the fn-body entry synthesizes a single
 * `(fn* ...)` form, analyzes it, and emits its one method.
 */

import { analyzeForm } from '../analyzer'
import type { AnalysisError } from '../analyzer/env'
import type {
  AstNode,
  FnMethodNode,
  FnNode,
  InvokeNode,
} from '../analyzer/nodes'
import { is } from '../assertions'
import { parseArities } from '../evaluator/arity'
import { mergeDocIntoMeta } from '../evaluator/defs'
import { v } from '../factories'
import { specialFormKeywords } from '../keywords.ts'
import { getPos, setPos } from '../positions'
import type {
  CljBoolean,
  CljList,
  CljMap,
  CljSymbol,
  CljValue,
  CljVector,
  Env,
  EvaluationContext,
  OpCode,
  Pos,
  VmArityTemplate,
  VmCatchClause,
  VmChunk,
  VmCompileResult,
  VmFallbackReason,
  VmFunctionTemplate,
  VmLexicalVarLookup,
} from '../types'
import {
  addConstant,
  emit,
  emitOperand,
  makeChunk,
  recordCallArgPositions,
} from './chunk'
import { Op } from './opcodes'

/** Recur target for an enclosing `loop*` (emission facts the IR cannot carry). */
type LoopRecur = {
  localStart: number
  localCount: number
  loopHeader: number
}

/** Recur target for the current fn arity. */
type FnRecur = {
  paramCount: number
  hasRest: boolean
}

/**
 * Mutable emission state threaded through `emitNode`. Carries the chunk being
 * written plus the facts the IR cannot express by itself: the active loop recur
 * target, the current fn arity's recur shape, and the current arity's self slot
 * (for the tail-self-call -> FnRecur decision). Tail/statement/expr context is
 * read straight from `node.env.context`.
 */
export type EmitState = {
  chunk: VmChunk
  loopRecur: LoopRecur | null
  fnRecur: FnRecur | null
  selfSlot: number
  reason: VmFallbackReason | null
}

const PORTED_MALFORMED_ANALYSIS_CODES = new Set([
  'malformed/if-arity',
  'malformed/binding-vector',
  'malformed/binding-even',
  'malformed/let-binding-symbol',
  'malformed/loop-binding-symbol',
  'malformed/letfn-bindings-vector',
  'malformed/letfn-bindings-even',
  'malformed/letfn-name-symbol',
  'malformed/set-arity',
  'malformed/set-target-symbol',
  'malformed/def-name-symbol',
  'malformed/defmacro-name-symbol',
  'malformed/var-arg-symbol',
  'malformed/amp-once',
  'malformed/amp-position',
  'malformed/param-symbol',
  'malformed/rest-symbol',
  'malformed/fn-needs-params',
  'malformed/arity-clause-list',
  'malformed/arity-clause-vector',
  'malformed/single-variadic',
  'malformed/fn-shape',
  'malformed/recur-outside',
  'malformed/recur-tail',
  'malformed/recur-arity',
])

function fail(st: EmitState, reason: VmFallbackReason): false {
  if (st.reason === null) st.reason = reason
  return false
}

function compileResultForAnalysisErrors(
  errors: AnalysisError[]
): VmCompileResult {
  const error = errors[0]
  const reason: VmFallbackReason = {
    category: 'compile-error',
    detail: error.message,
  }
  const analysisError = {
    message: error.message,
    pos: error.pos,
    kind: error.kind,
    code: error.code,
  }

  if (
    error.kind === 'malformed' &&
    error.code !== undefined &&
    PORTED_MALFORMED_ANALYSIS_CODES.has(error.code)
  ) {
    return { ok: false, fatal: true, reason, analysisError }
  }

  return { ok: false, reason, analysisError }
}

function unsupported(st: EmitState, node: AstNode): false {
  return fail(st, {
    category: 'unsupported-special-form',
    detail: `ir-compiler: no lowering for op '${node.op}'`,
  })
}

/**
 * The legacy VM compiler refuses `async`/`ns` by head symbol (compiler.ts
 * `unsupportedVmSpecialForms`), even though the analyzer models both as plain
 * invoke nodes. Mirror that here so the live IR path falls back exactly where
 * legacy does, with the same `reason.category` (the probe suites assert it).
 */
const unsupportedVmSpecialForms = new Set<string>([
  specialFormKeywords['async'],
  specialFormKeywords['ns'],
])

function unsupportedInvokeReason(node: InvokeNode): VmFallbackReason | null {
  const form = node.form
  if (!is.list(form) || form.value.length === 0) return null
  const head = form.value[0]
  if (!is.symbol(head) || !unsupportedVmSpecialForms.has(head.name)) return null
  return head.name === specialFormKeywords['ns']
    ? {
        category: 'unsupported-top-level-mutation',
        detail: `VM does not support top-level mutation form ${head.name}`,
      }
    : {
        category: 'unsupported-special-form',
        detail: `VM does not support special form ${head.name}`,
      }
}

/** Widen the chunk's local-array size to include `slot`. */
export function bumpLocal(chunk: VmChunk, slot: number): void {
  chunk.localCount = Math.max(chunk.localCount, slot + 1)
}

export function emitJump(chunk: VmChunk, opcode: OpCode, pos: Pos | null): number {
  emit(chunk, opcode, pos)
  const operandOffset = chunk.code.length
  emitOperand(chunk, 0, pos)
  return operandOffset
}

export function patchJump(chunk: VmChunk, operandOffset: number): void {
  patchJumpTo(chunk, operandOffset, chunk.code.length)
}

export function patchJumpTo(
  chunk: VmChunk,
  operandOffset: number,
  jumpTo: number
): void {
  chunk.code[operandOffset] = jumpTo - (operandOffset + 1)
}

/** Add a constant and emit `Constant <index>`. */
export function emitConstant(
  chunk: VmChunk,
  value: CljValue,
  pos: Pos | null
): void {
  const index = addConstant(chunk, value)
  emit(chunk, Op.Constant, pos)
  emitOperand(chunk, index, pos)
}

function emitSymbolRef(chunk: VmChunk, sym: CljSymbol, pos: Pos | null): boolean {
  const name = sym.name
  const slashIdx = name.indexOf('/')
  if (slashIdx > 0 && slashIdx < name.length - 1) {
    const localPart = name.slice(slashIdx + 1)
    if (localPart.includes('.')) {
      emitDotChainRef(chunk, sym, pos)
      return true
    }
    const idx = addConstant(chunk, sym)
    emit(chunk, Op.LoadQualified, pos)
    emitOperand(chunk, idx, pos)
    return true
  }
  const idx = addConstant(chunk, sym)
  emit(chunk, Op.LoadGlobal, pos)
  emitOperand(chunk, idx, pos)
  return true
}

function emitDotChainRef(chunk: VmChunk, sym: CljSymbol, pos: Pos | null): void {
  const slashIdx = sym.name.indexOf('/')
  const alias = sym.name.slice(0, slashIdx)
  const localPart = sym.name.slice(slashIdx + 1)
  const segments = localPart.split('.')
  const rootSym = v.symbol(`${alias}/${segments[0]}`)
  const rootIdx = addConstant(chunk, rootSym)
  emit(chunk, Op.LoadQualified, pos)
  emitOperand(chunk, rootIdx, pos)
  for (const prop of segments.slice(1)) {
    const propIdx = addConstant(chunk, v.string(prop))
    emit(chunk, Op.JsGetProp, pos)
    emitOperand(chunk, propIdx, pos)
  }
}

function isQualifiedName(name: string): boolean {
  const slashIdx = name.indexOf('/')
  return slashIdx > 0 && slashIdx < name.length - 1
}

function emptyEnvForParsing(): Env {
  return { bindings: new Map(), outer: null }
}

/** The fixed set of intrinsic operators, keyed off the original (unqualified) callee symbol. */
function intrinsicOpcodeForName(name: string): OpCode | null {
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

/**
 * Intrinsic gate (mirrors `emitCall`, compiler.ts 1262-1292): an invoke whose
 * callee resolved to a Var (not a local/upvalue) AND whose ORIGINAL symbol is
 * unqualified and names an intrinsic. Keying off `node.fn.op === 'var'` captures
 * the legacy "not a local / not an enclosing local" condition for free, and
 * keying off the original `node.fn.form` keeps `clojure.core/+` (qualified) out.
 */
function intrinsicOpcodeForInvoke(node: InvokeNode): OpCode | null {
  const fn = node.fn
  if (fn.op !== 'var') return null
  if (!is.symbol(fn.form)) return null
  if (isQualifiedName(fn.form.name)) return null
  return intrinsicOpcodeForName(fn.form.name)
}

/**
 * Tail self-call gate (mirrors `emitTailSelfCall`, compiler.ts 1326-1374): a
 * return-position invoke of the current arity's self binding, with a matching
 * arity. The analyzer resolves the self reference to a `local` at the self slot,
 * so this is a pure predicate over the IR plus the current arity's recur shape.
 */
function shouldEmitTailSelfCall(node: InvokeNode, st: EmitState): boolean {
  if (node.env.context !== 'return') return false
  if (st.fnRecur === null || st.selfSlot < 0) return false
  const fn = node.fn
  if (fn.op !== 'local' || fn.resolved !== 'local' || fn.slot !== st.selfSlot) {
    return false
  }
  const argc = node.args.length
  return st.fnRecur.hasRest
    ? argc >= st.fnRecur.paramCount
    : argc === st.fnRecur.paramCount
}

function symbolWithMeta(sym: CljSymbol, meta: CljMap | undefined): CljSymbol {
  if (meta === sym.meta) return sym
  const copy: CljSymbol = { ...sym, meta }
  const pos = getPos(sym)
  if (pos) setPos(copy, pos)
  return copy
}

/**
 * Builds the {:macro true :arglists [...] :doc "..."} meta for a defmacro symbol
 * constant. Mirrors the private `withDefmacroMeta` in the legacy compiler.
 */
function withDefmacroMeta(
  baseMeta: CljMap | undefined,
  docstring: string | undefined,
  arityForms: CljValue[]
): CljMap | undefined {
  let finalMeta = docstring ? mergeDocIntoMeta(baseMeta, docstring) : baseMeta
  const arglistVecs: CljValue[] = is.vector(arityForms[0])
    ? [arityForms[0]]
    : arityForms
        .filter(is.list)
        .map((form) => (form as CljList).value[0])
        .filter(is.vector)
  if (arglistVecs.length > 0) {
    const base = (finalMeta?.entries ?? []).filter(
      ([k]) => !(is.keyword(k) && k.name === ':arglists')
    )
    const entries: [CljValue, CljValue][] = [
      ...base,
      [v.keyword(':arglists'), v.vector(arglistVecs)],
    ]
    finalMeta = v.map(entries)
  }
  return finalMeta
}

function emitJsGetPropIr(chunk: VmChunk, propName: string, pos: Pos | null): void {
  const propIndex = addConstant(chunk, v.string(propName))
  emit(chunk, Op.JsGetProp, pos)
  emitOperand(chunk, propIndex, pos)
}

/** Extract the arity forms from a `(fn* name? <arities>)` form (drops fn* and any self-name). */
function fnArityForms(form: CljValue): CljValue[] {
  const rest = (form as CljList).value.slice(1)
  if (rest.length > 0 && is.symbol(rest[0])) return rest.slice(1)
  return rest
}

/**
 * Builds a `VmFunctionTemplate` from a resolved `fn` node and pushes it onto the
 * current chunk's `innerFunctions`, returning its index. Per-arity bodies are
 * emitted via `emitMethodBodyToChunk`; the arity metadata (`params`/`restParam`/
 * `body`) is recovered from the original form via the shared `parseArities` so it
 * is byte-identical to the legacy compiler. `nameOverride` lets `defmacro` set the
 * template name from the def symbol (its synthetic fn is anonymous).
 */
function buildFnTemplate(
  node: FnNode,
  st: EmitState,
  nameOverride: string | null
): number | null {
  let arities
  try {
    arities = parseArities(fnArityForms(node.form), emptyEnvForParsing())
  } catch (error) {
    fail(st, {
      category: 'compile-error',
      detail: error instanceof Error ? error.message : String(error),
    })
    return null
  }
  if (arities.length !== node.methods.length) {
    fail(st, {
      category: 'compile-error',
      detail: 'ir-compiler: fn arity count mismatch between IR and parsed form',
    })
    return null
  }

  const templateArities: VmArityTemplate[] = []
  for (let i = 0; i < node.methods.length; i++) {
    const out: { reason: VmFallbackReason | null } = { reason: null }
    const chunk = emitMethodBodyToChunk(node.methods[i], out)
    if (chunk === null) {
      if (out.reason !== null) st.reason = out.reason
      return null
    }
    templateArities.push({
      params: arities[i].params,
      restParam: arities[i].restParam,
      body: arities[i].body,
      chunk,
    })
  }

  const template: VmFunctionTemplate = {
    arities: templateArities,
    upvalueDescriptors: node.captures.map((u) => ({
      isLocal: u.isLocal,
      index: u.index,
    })),
  }
  const name = nameOverride ?? node.name
  if (name !== null) template.name = name

  const templateIndex = st.chunk.innerFunctions.length
  st.chunk.innerFunctions.push(template)
  return templateIndex
}

/**
 * The central dispatch. Returns true on success; on failure it records a reason
 * in `st.reason` and returns false (the whole compile then falls back to the
 * interpreter, preserving legacy behavior). Each slice fills in the ops it owns.
 */
export function emitNode(node: AstNode, st: EmitState): boolean {
  switch (node.op) {
    case 'const': {
      const { chunk } = st
      if (node.type === 'nil') {
        emit(chunk, Op.Nil, node.pos)
      } else if (node.type === 'bool') {
        emit(chunk, (node.val as CljBoolean).value ? Op.True : Op.False, node.pos)
      } else {
        emitConstant(chunk, node.val, node.pos)
      }
      return true
    }

    case 'quote':
      emitConstant(st.chunk, node.expr.val, node.pos)
      return true

    case 'local': {
      const { chunk } = st
      if (node.resolved === 'local') {
        emit(chunk, Op.LoadLocal, node.pos)
        emitOperand(chunk, node.slot, node.pos)
      } else {
        emit(chunk, Op.LoadUpvalue, node.pos)
        emitOperand(chunk, node.upvalueIndex!, node.pos)
      }
      return true
    }

    case 'var':
    case 'js-var':
      return emitSymbolRef(st.chunk, node.form as CljSymbol, node.pos)

    case 'vector': {
      const { chunk } = st
      for (const item of node.items) {
        if (!emitNode(item, st)) return false
      }
      emit(chunk, Op.MakeVector, node.pos)
      emitOperand(chunk, node.items.length, node.pos)
      const vecMeta = (node.form as CljVector).meta
      if (vecMeta) {
        emit(chunk, Op.WithMeta, node.pos)
        emitOperand(chunk, addConstant(chunk, vecMeta), node.pos)
      }
      return true
    }

    case 'map': {
      const { chunk } = st
      for (let i = 0; i < node.keys.length; i++) {
        if (!emitNode(node.keys[i], st)) return false
        if (!emitNode(node.vals[i], st)) return false
      }
      emit(chunk, Op.MakeMap, node.pos)
      emitOperand(chunk, node.keys.length, node.pos)
      const mapMeta = (node.form as CljMap).meta
      if (mapMeta) {
        emit(chunk, Op.WithMeta, node.pos)
        emitOperand(chunk, addConstant(chunk, mapMeta), node.pos)
      }
      return true
    }

    case 'set': {
      const { chunk } = st
      for (const item of node.items) {
        if (!emitNode(item, st)) return false
      }
      emit(chunk, Op.MakeSet, node.pos)
      emitOperand(chunk, node.items.length, node.pos)
      return true
    }

    case 'if': {
      const { chunk } = st
      if (!emitNode(node.test, st)) return false
      const elseJump = emitJump(chunk, Op.JumpIfFalsy, node.pos)
      if (!emitNode(node.then, st)) return false
      const endJump = emitJump(chunk, Op.Jump, node.pos)
      patchJump(chunk, elseJump)
      if (!emitNode(node.else, st)) return false
      patchJump(chunk, endJump)
      return true
    }

    case 'do': {
      const { chunk } = st
      for (const stmt of node.statements) {
        if (!emitNode(stmt, st)) return false
        emit(chunk, Op.Pop, node.pos)
      }
      return emitNode(node.ret, st)
    }

    case 'invoke': {
      const { chunk } = st
      const unsupportedReason = unsupportedInvokeReason(node)
      if (unsupportedReason !== null) return fail(st, unsupportedReason)
      if (shouldEmitTailSelfCall(node, st)) {
        for (const arg of node.args) {
          if (!emitNode(arg, st)) return false
        }
        if (st.fnRecur!.hasRest) {
          emit(chunk, Op.FnRecurRest, node.pos)
          emitOperand(chunk, node.args.length, node.pos)
          emitOperand(chunk, st.fnRecur!.paramCount, node.pos)
        } else {
          emit(chunk, Op.FnRecur, node.pos)
          emitOperand(chunk, st.fnRecur!.paramCount, node.pos)
        }
        return true
      }

      const intrinsic = intrinsicOpcodeForInvoke(node)
      if (intrinsic !== null) {
        for (const arg of node.args) {
          if (!emitNode(arg, st)) return false
        }
        const instructionOffset = chunk.code.length
        emit(chunk, intrinsic, node.pos)
        emitOperand(chunk, node.args.length, node.pos)
        recordCallArgPositions(
          chunk,
          instructionOffset,
          node.args.map((arg) => arg.pos ?? null)
        )
        return true
      }

      if (!emitNode(node.fn, st)) return false
      for (const arg of node.args) {
        if (!emitNode(arg, st)) return false
      }
      const instructionOffset = chunk.code.length
      emit(chunk, Op.Call, node.pos)
      emitOperand(chunk, node.args.length, node.pos)
      recordCallArgPositions(
        chunk,
        instructionOffset,
        node.args.map((arg) => arg.pos ?? null)
      )
      return true
    }

    case 'let': {
      const { chunk } = st
      for (const binding of node.bindings) {
        if (binding.init === null) {
          return fail(st, { category: 'compile-error', detail: 'let* binding missing init' })
        }
        if (!emitNode(binding.init, st)) return false
        emit(chunk, Op.StoreLocal, binding.pos)
        emitOperand(chunk, binding.slot, binding.pos)
        bumpLocal(chunk, binding.slot)
      }
      return emitNode(node.body, st)
    }

    case 'loop': {
      const { chunk } = st
      for (const binding of node.bindings) {
        if (binding.init === null) {
          return fail(st, { category: 'compile-error', detail: 'loop* binding missing init' })
        }
        if (!emitNode(binding.init, st)) return false
        emit(chunk, Op.StoreLocal, binding.pos)
        emitOperand(chunk, binding.slot, binding.pos)
        bumpLocal(chunk, binding.slot)
      }
      const localStart = node.bindings.length > 0 ? node.bindings[0].slot : 0
      const localCount = node.bindings.length
      const loopHeader = chunk.code.length
      const previousLoopRecur = st.loopRecur
      st.loopRecur = { localStart, localCount, loopHeader }
      const ok = emitNode(node.body, st)
      st.loopRecur = previousLoopRecur
      return ok
    }

    case 'recur': {
      const { chunk } = st
      for (const expr of node.exprs) {
        if (!emitNode(expr, st)) return false
      }
      if (node.targetKind === 'loop') {
        if (st.loopRecur === null) {
          return fail(st, { category: 'compile-error', detail: 'recur loop target missing' })
        }
        emit(chunk, Op.Recur, node.pos)
        emitOperand(chunk, st.loopRecur.localStart, node.pos)
        emitOperand(chunk, st.loopRecur.localCount, node.pos)
        emitOperand(chunk, st.loopRecur.loopHeader, node.pos)
        return true
      }
      if (node.targetKind === 'fn') {
        if (st.fnRecur === null) {
          return fail(st, { category: 'compile-error', detail: 'recur fn target missing' })
        }
        if (st.fnRecur.hasRest) {
          emit(chunk, Op.FnRecurRest, node.pos)
          emitOperand(chunk, node.exprs.length, node.pos)
          emitOperand(chunk, st.fnRecur.paramCount, node.pos)
        } else {
          emit(chunk, Op.FnRecur, node.pos)
          emitOperand(chunk, st.fnRecur.paramCount, node.pos)
        }
        return true
      }
      return fail(st, { category: 'compile-error', detail: 'recur has no resolved target' })
    }

    case 'letfn': {
      const { chunk } = st
      for (const binding of node.bindings) bumpLocal(chunk, binding.slot)
      for (const binding of node.bindings) {
        if (binding.init === null) {
          return fail(st, { category: 'compile-error', detail: 'letfn* binding missing init' })
        }
        if (!emitNode(binding.init, st)) return false
        emit(chunk, Op.StoreLocal, binding.pos)
        emitOperand(chunk, binding.slot, binding.pos)
      }
      return emitNode(node.body, st)
    }

    case 'fn': {
      const templateIndex = buildFnTemplate(node, st, null)
      if (templateIndex === null) return false
      emit(st.chunk, Op.Closure, node.pos)
      emitOperand(st.chunk, templateIndex, node.pos)
      return true
    }

    case 'def': {
      const { chunk } = st
      const defList = node.form as CljList
      const nameSym = defList.value[1] as CljSymbol

      if (node.isMacro) {
        if (node.init === null || node.init.op !== 'fn') {
          return fail(st, { category: 'compile-error', detail: 'ir-compiler: defmacro missing fn init' })
        }
        const templateIndex = buildFnTemplate(node.init as FnNode, st, node.name)
        if (templateIndex === null) return false
        emit(chunk, Op.Closure, node.pos)
        emitOperand(chunk, templateIndex, node.pos)

        const rest = defList.value.slice(2)
        const hasDoc = rest.length > 0 && is.string(rest[0])
        const arityForms = hasDoc ? rest.slice(1) : rest
        const symbolConstant = symbolWithMeta(
          nameSym,
          withDefmacroMeta(nameSym.meta, node.doc ?? undefined, arityForms)
        )
        const symIdx = addConstant(chunk, symbolConstant)
        emit(chunk, Op.DefMacro, node.pos)
        emitOperand(chunk, symIdx, node.pos)
        return true
      }

      // Bare `(def x)` — legacy emits only Nil (no Def instruction).
      if (node.init === null) {
        emit(chunk, Op.Nil, node.pos)
        return true
      }
      if (!emitNode(node.init, st)) return false
      const symbolConstant = node.doc !== null
        ? symbolWithMeta(nameSym, mergeDocIntoMeta(nameSym.meta, node.doc))
        : nameSym
      const symIdx = addConstant(chunk, symbolConstant)
      emit(chunk, Op.Def, node.pos)
      emitOperand(chunk, symIdx, node.pos)
      return true
    }

    case 'the-var': {
      const { chunk } = st
      const target = (node.form as CljList).value[1] as CljSymbol
      if (node.lexicalCandidates.length > 0) {
        const lookup: VmLexicalVarLookup = { symbol: target, candidates: node.lexicalCandidates }
        const lookupIndex = chunk.lexicalVarLookups.length
        chunk.lexicalVarLookups.push(lookup)
        emit(chunk, Op.LoadLexicalVar, node.pos)
        emitOperand(chunk, lookupIndex, node.pos)
        return true
      }
      const index = addConstant(chunk, target)
      emit(chunk, Op.LoadVar, node.pos)
      emitOperand(chunk, index, node.pos)
      return true
    }

    case 'throw': {
      if (!emitNode(node.exception, st)) return false
      emit(st.chunk, Op.Throw, node.pos)
      return true
    }

    case 'try': {
      const { chunk } = st
      const pos = node.pos
      const hasFinally = node.finallyBody !== null

      // Pre-bump all catch binding slots so result + discriminator slots
      // are allocated strictly above them (avoids slot collision).
      for (const c of node.catches) bumpLocal(chunk, c.local.slot)

      // Result slot for finally: allocated above all catch bindings.
      // NOTE: this differs from the legacy ordering (legacy allocates result
      // slot BEFORE catch bindings) — an intended divergence for try+finally.
      const resultSlot = hasFinally ? chunk.localCount++ : -1

      // Set up catch table(s)
      const tableIndex = chunk.catchTables.length
      const tableClauses: VmCatchClause[] = node.catches.map((c) => ({
        discriminator: c.discriminator !== null ? c.discriminator.form : c.form,
        discriminatorSlot: -1,
        bindingSlot: -1,
        bodyIp: -1,
      }))
      chunk.catchTables.push({ clauses: tableClauses })

      const finallyOnlyTableIndex = hasFinally ? chunk.catchTables.length : -1
      if (hasFinally) chunk.catchTables.push({ clauses: [] })

      // Tracking arrays for cross-site patching
      const finallyOpOffsets: number[] = []
      const afterOpOffsets: number[] = []
      const finallyEntryJumps: number[] = []
      const catchEndJumps: number[] = []

      // Pre-compile inline-fn discriminators before PushTry.
      // An fn discriminator closes over VM locals in scope at the catch site;
      // we store the closure to a fresh slot and record it in the table clause.
      for (let i = 0; i < node.catches.length; i++) {
        const catchNode = node.catches[i]
        if (catchNode.discriminator === null || catchNode.discriminator.op !== 'fn') continue
        if (!emitNode(catchNode.discriminator, st)) return false
        const discSlot = chunk.localCount++
        emit(chunk, Op.StoreLocal, pos)
        emitOperand(chunk, discSlot, pos)
        tableClauses[i].discriminatorSlot = discSlot
      }

      // PushTry for the main body
      emit(chunk, Op.PushTry, pos)
      emitOperand(chunk, tableIndex, pos)
      finallyOpOffsets.push(chunk.code.length)
      emitOperand(chunk, -1, pos) // finallyIp — patched later
      afterOpOffsets.push(chunk.code.length)
      emitOperand(chunk, 0, pos)  // afterIp — patched later

      // Emit body
      if (!emitNode(node.body, st)) return false

      // Normal try exit
      emit(chunk, Op.PopTry, pos)
      let normalEndJump = -1
      if (hasFinally) {
        emit(chunk, Op.StoreLocal, pos)
        emitOperand(chunk, resultSlot, pos)
        emit(chunk, Op.EnterFinally, pos)
        afterOpOffsets.push(chunk.code.length)
        emitOperand(chunk, 0, pos)
        finallyEntryJumps.push(emitJump(chunk, Op.Jump, pos))
      } else {
        normalEndJump = emitJump(chunk, Op.Jump, pos)
      }

      // Emit catch clauses
      for (let i = 0; i < node.catches.length; i++) {
        const catchNode = node.catches[i]
        const tableClause = tableClauses[i]
        const bindingSlot = catchNode.local.slot

        tableClause.bindingSlot = bindingSlot
        tableClause.bodyIp = chunk.code.length

        if (hasFinally) {
          emit(chunk, Op.PushTry, pos)
          emitOperand(chunk, finallyOnlyTableIndex, pos)
          finallyOpOffsets.push(chunk.code.length)
          emitOperand(chunk, -1, pos)
          afterOpOffsets.push(chunk.code.length)
          emitOperand(chunk, 0, pos)
        }

        bumpLocal(chunk, bindingSlot)
        if (!emitNode(catchNode.body, st)) return false

        if (hasFinally) {
          emit(chunk, Op.PopTry, pos)
          emit(chunk, Op.StoreLocal, pos)
          emitOperand(chunk, resultSlot, pos)
          emit(chunk, Op.EnterFinally, pos)
          afterOpOffsets.push(chunk.code.length)
          emitOperand(chunk, 0, pos)
          finallyEntryJumps.push(emitJump(chunk, Op.Jump, pos))
        } else if (i < node.catches.length - 1) {
          catchEndJumps.push(emitJump(chunk, Op.Jump, pos))
        }
      }

      // Finally tail or catch-only tail
      if (hasFinally) {
        const finallyIp = chunk.code.length
        for (const op of finallyOpOffsets) chunk.code[op] = finallyIp
        for (const j of finallyEntryJumps) patchJumpTo(chunk, j, finallyIp)

        if (!emitNode(node.finallyBody!, st)) return false
        emit(chunk, Op.Pop, pos)
        emit(chunk, Op.EndFinally, pos)

        const afterIp = chunk.code.length
        for (const op of afterOpOffsets) chunk.code[op] = afterIp

        emit(chunk, Op.LoadLocal, pos)
        emitOperand(chunk, resultSlot, pos)
      } else {
        patchJump(chunk, normalEndJump)
        for (const j of catchEndJumps) patchJump(chunk, j)
        chunk.code[afterOpOffsets[0]] = chunk.code.length
      }

      return true
    }

    case 'dynamic': {
      const { chunk } = st
      emit(chunk, Op.PushBindingFrame, node.pos)
      for (let i = 0; i < node.bindingVars.length; i++) {
        if (!emitNode(node.inits[i], st)) return false
        const sym = node.bindingVars[i].form as CljSymbol
        const symPos = node.bindingVars[i].pos
        emit(chunk, Op.PushDynamicBinding, symPos)
        emitOperand(chunk, addConstant(chunk, sym), symPos)
      }
      if (!emitNode(node.body, st)) return false
      emit(chunk, Op.PopBindingFrame, node.pos)
      return true
    }

    case 'set!': {
      if (node.target.op !== 'var') return unsupported(st, node)
      if (!emitNode(node.val, st)) return false
      const sym = node.target.form as CljSymbol
      const symPos = node.target.pos
      emit(st.chunk, Op.SetDynamic, symPos)
      emitOperand(st.chunk, addConstant(st.chunk, sym), symPos)
      return true
    }

    case 'host-call': {
      if (!emitNode(node.target, st)) return false
      for (const arg of node.args) {
        if (!emitNode(arg, st)) return false
      }
      const methodIdx = addConstant(st.chunk, v.string(node.method))
      emit(st.chunk, Op.JsInvoke, node.pos)
      emitOperand(st.chunk, methodIdx, node.pos)
      emitOperand(st.chunk, node.args.length, node.pos)
      return true
    }

    case 'host-field': {
      if (!emitNode(node.target, st)) return false
      emitJsGetPropIr(st.chunk, node.field, node.pos)
      return true
    }

    case 'new': {
      if (!emitNode(node.className, st)) return false
      for (const arg of node.args) {
        if (!emitNode(arg, st)) return false
      }
      emit(st.chunk, Op.JsNew, node.pos)
      emitOperand(st.chunk, node.args.length, node.pos)
      return true
    }

    case 'invalid':
      return fail(st, { category: 'compile-error', detail: node.message })

    default:
      return fail(st, {
        category: 'compile-error',
        detail: `ir-compiler: unexpected node op in expression position`,
      })
  }
}

/**
 * Emits one fn arity's body into a fresh chunk: params occupy slots 0..n-1
 * (rest at n), the self-name (if any) sits after the params, and the body is
 * emitted in tail position followed by `Return`. Returns the chunk, or null on
 * failure (with `reason` set on the returned-by-ref state via `outReason`).
 */
export function emitMethodBodyToChunk(
  method: FnMethodNode,
  outReason: { reason: VmFallbackReason | null }
): VmChunk | null {
  const chunk = makeChunk('vm-fn-body')
  for (const p of method.params) bumpLocal(chunk, p.slot)
  let selfSlot = -1
  if (method.self !== null) {
    selfSlot = method.self.slot
    chunk.selfSlot = selfSlot
    bumpLocal(chunk, selfSlot)
  }
  const st: EmitState = {
    chunk,
    loopRecur: null,
    fnRecur: { paramCount: method.fixedArity, hasRest: method.variadic },
    selfSlot,
    reason: null,
  }
  if (!emitNode(method.body, st)) {
    outReason.reason = st.reason
    return null
  }
  emit(chunk, Op.Return)
  return chunk
}

/** Compile a single, already-resolved AST node as a top-level expression. */
export function tryCompileVmFromIr(
  form: CljValue,
  env: Env,
  ctx: EvaluationContext
): VmCompileResult {
  try {
    const { node, errors } = analyzeForm(form, env, ctx)
    if (errors.length > 0) {
      return compileResultForAnalysisErrors(errors)
    }
    const chunk = makeChunk('vm-expression')
    const st: EmitState = {
      chunk,
      loopRecur: null,
      fnRecur: null,
      selfSlot: -1,
      reason: null,
    }
    if (!emitNode(node, st)) {
      return {
        ok: false,
        reason: st.reason ?? {
          category: 'compile-error',
          detail: 'ir-compiler: could not compile top-level form',
        },
      }
    }
    emit(chunk, Op.Return)
    return { ok: true, chunk }
  } catch (error) {
    // Mirror the legacy compiler's safety net: an analyzer/emit throw on a wild
    // form becomes a clean fallback to the interpreter, never a crashed eval.
    return {
      ok: false,
      reason: {
        category: 'compile-error',
        detail: error instanceof Error ? error.message : String(error),
      },
    }
  }
}

/** Build a synthetic anonymous-or-named `(fn* ...)` form for one arity. */
function synthFnStar(
  params: CljSymbol[],
  restParam: CljSymbol | null,
  body: CljValue[],
  selfName: string | null
): CljValue {
  const paramVec: CljValue[] = [...params]
  if (restParam !== null) {
    paramVec.push(v.symbol('&'))
    paramVec.push(restParam)
  }
  const head: CljValue[] = [v.symbol('fn*')]
  if (selfName !== null) head.push(v.symbol(selfName))
  head.push(v.vector(paramVec))
  for (const f of body) head.push(f)
  return v.list(head)
}

/** Compile one fn arity body to a bare chunk (the `arity.bytecodeBody` shape). */
export function tryCompileVmFnBodyFromIr(
  params: CljSymbol[],
  restParam: CljSymbol | null,
  body: CljValue[],
  selfName: string | null,
  env: Env,
  ctx: EvaluationContext
): VmCompileResult {
  try {
    const fnForm = synthFnStar(params, restParam, body, selfName)
    const { node, errors } = analyzeForm(fnForm, env, ctx)
    if (errors.length > 0) {
      return compileResultForAnalysisErrors(errors)
    }
    if (node.op !== 'fn' || node.methods.length !== 1) {
      return {
        ok: false,
        reason: { category: 'compile-error', detail: 'ir-compiler: fn-body synthesis did not yield a single-arity fn' },
      }
    }
    const out: { reason: VmFallbackReason | null } = { reason: null }
    const chunk = emitMethodBodyToChunk(node.methods[0], out)
    if (chunk === null) {
      return {
        ok: false,
        reason: out.reason ?? { category: 'compile-error', detail: 'ir-compiler: could not compile fn body' },
      }
    }
    return { ok: true, chunk }
  } catch (error) {
    return {
      ok: false,
      reason: {
        category: 'compile-error',
        detail: error instanceof Error ? error.message : String(error),
      },
    }
  }
}
