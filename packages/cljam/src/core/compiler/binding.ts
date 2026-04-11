import { is } from '../assertions.ts'
import { assertRecurInTailPosition } from '../evaluator/recur-check.ts'
import { v } from '../factories.ts'
import type {
  CljList,
  CljSymbol,
  CljValue,
  CompiledExpr,
  CompileEnv,
  CompileFn,
  SlotRef,
} from '../types.ts'
import { findLoopTarget } from './compile-env.ts'
import { compileDo } from './control-flow.ts'

const BINDINGS_POS = 1
const BODY_START_POS = 2

export function compileLet(
  node: CljList,
  compileEnv: CompileEnv | null,
  compile: CompileFn
): CompiledExpr | null {
  const bindings = node.value[BINDINGS_POS]
  // must be a vector with an even number of elements, else bail out
  if (!is.vector(bindings) || bindings.value.length % 2 !== 0) return null

  let currentCompileEnv = compileEnv
  const slotInits: Array<[SlotRef, CompiledExpr]> = []

  for (let i = 0; i < bindings.value.length; i += 2) {
    const pattern = bindings.value[i]
    // destructuring pattern not supported yet
    if (!is.symbol(pattern)) return null
    const slot: SlotRef = { value: null }

    const compiledInit = compile(bindings.value[i + 1], currentCompileEnv)
    // unsupported init form, bail out
    if (compiledInit === null) return null
    slotInits.push([slot, compiledInit])

    currentCompileEnv = {
      bindings: new Map([[pattern.name, slot]]),
      outer: currentCompileEnv,
    }
  }

  // compile the body with full env (all bindings in scope)
  const body = node.value.slice(BODY_START_POS)
  const compiledBody = compileDo(body, currentCompileEnv, compile)
  // unsupported body form, bail out
  if (compiledBody === null) return null

  return (env, ctx) => {
    // save all previous slot values (handles recursive/nested lets)
    const prevSlotValues = slotInits.map(([slot]) => slot.value)

    // evaluate inits sequentially, writing. into slots
    for (const [slot, compiledInit] of slotInits) {
      slot.value = compiledInit(env, ctx)
    }

    const result = compiledBody(env, ctx)

    // restore prev slot values
    slotInits.forEach(([slot], index) => {
      slot.value = prevSlotValues[index]
    })

    return result
  }
}

export function compileLoop(
  node: CljList,
  compileEnv: CompileEnv | null,
  compile: CompileFn
): CompiledExpr | null {
  const bindings = node.value[BINDINGS_POS]
  if (!is.vector(bindings) || bindings.value.length % 2 !== 0) return null
  const body = node.value.slice(BODY_START_POS)
  assertRecurInTailPosition(body)

  let currentCompileEnv = compileEnv
  const slotInits: Array<[SlotRef, CompiledExpr]> = []
  const namedSlots: Array<[string, SlotRef]> = []

  for (let i = 0; i < bindings.value.length; i += 2) {
    const pattern = bindings.value[i]
    // destructuring pattern not supported yet
    if (!is.symbol(pattern)) return null
    const compiledInit = compile(bindings.value[i + 1], currentCompileEnv)
    // unsuported init, bail out
    if (compiledInit === null) return null
    const slot: SlotRef = { value: null }
    slotInits.push([slot, compiledInit])
    namedSlots.push([pattern.name, slot])

    currentCompileEnv = {
      bindings: new Map([[pattern.name, slot]]),
      outer: currentCompileEnv,
    }
  }
  const slots = slotInits.map((entry) => entry[0])
  const recurTarget: { args: CljValue[] | null } = { args: null }
  // map of ALL slots, outer: compileEnv, loop: { slots, recurTarget }
  const loopCompileEnv = {
    bindings: new Map(namedSlots),
    outer: compileEnv,
    loop: {
      slots,
      recurTarget,
    },
  }
  const compiledBody = compileDo(body, loopCompileEnv, compile)
  if (compiledBody === null) return null

  return (env, ctx) => {
    for (const [slot, compiledInit] of slotInits) {
      slot.value = compiledInit(env, ctx)
    }

    while (true) {
      recurTarget.args = null
      const result = compiledBody(env, ctx)
      if (recurTarget.args !== null) {
        // rebind!
        for (let i = 0; i < slots.length; i++) {
          slots[i].value = recurTarget.args[i]
        }
      } else {
        return result
      }
    }
  }
}

export function compileRecur(
  node: CljList,
  compileEnv: CompileEnv | null,
  compile: CompileFn
): CompiledExpr | null {
  const loopInfo = findLoopTarget(compileEnv)
  // no compiler loop in scope, bail out
  // this will fallback to a thrown CljSignal in the interpreter
  if (loopInfo === null) return null
  const { recurTarget, slots } = loopInfo
  const argForms = node.value.slice(BINDINGS_POS)
  // Arity mismatch, bail out
  if (argForms.length !== slots.length) return null

  const compiledArgs: CompiledExpr[] = []
  for (const arg of argForms) {
    const compiled = compile(arg, compileEnv)
    if (compiled === null) return null
    compiledArgs.push(compiled)
  }
  return (env, ctx) => {
    // important: evaluate ALL new values before writting ANY slot
    const newArgs = compiledArgs.map((compiledArg) => compiledArg(env, ctx))
    recurTarget.args = newArgs
    // return value ignored, loop checks recurTarget.args
    return v.nil()
  }
}

/**
 * Compiles an fn arity body with param slots.
 *
 * Allocates one SlotRef per param at compile time. The returned compiledBody
 * wraps the inner compiled form in a while(true) loop that handles fn-level
 * recur without throwing RecurSignal — identical to compileLoop's mechanism.
 *
 * At call time, applyFunctionWithContext writes args into paramSlots and calls
 * compiledBody(fn.env, ctx). save/restore around the call handles reentrancy.
 *
 * Returns null if the body cannot be fully compiled (fallback to interpreter).
 */
export function compileFnBody(
  params: CljSymbol[],
  body: CljValue[],
  compile: CompileFn
): { compiledBody: CompiledExpr; paramSlots: SlotRef[] } | null {
  const paramSlots: SlotRef[] = params.map(() => ({ value: null }))
  const recurTarget: { args: CljValue[] | null } = { args: null }
  const fnCompileEnv: CompileEnv = {
    bindings: new Map(params.map((p, i) => [p.name, paramSlots[i]])),
    outer: null,
    loop: { slots: paramSlots, recurTarget },
  }
  const innerCompiled = compileDo(body, fnCompileEnv, compile)
  if (innerCompiled === null) return null

  const compiledBody: CompiledExpr = (env, ctx) => {
    while (true) {
      recurTarget.args = null
      const result = innerCompiled(env, ctx)
      if (recurTarget.args !== null) {
        for (let i = 0; i < paramSlots.length; i++) {
          paramSlots[i].value = recurTarget.args[i]
        }
      } else {
        return result
      }
    }
  }
  return { compiledBody, paramSlots }
}
