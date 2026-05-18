import { is } from '../assertions.ts'
import { getNamespaceEnv, lookupVar } from '../env.ts'
import { EvaluationError } from '../errors.ts'
import { slotValuesForArity } from '../evaluator/arity.ts'
import { assertRecurInTailPosition } from '../evaluator/recur-check.ts'
import { v } from '../factories.ts'
import type {
  Arity,
  CljList,
  CljSymbol,
  CljValue,
  CljVar,
  CompiledExpr,
  CompileEnv,
  CompileFn,
  SlotRef,
} from '../types.ts'
import { findLoopTarget } from './compile-env.ts'
import { compileDo } from './control-flow.ts'
import { namedCompiledExpr } from './profile-name.ts'

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

  return namedCompiledExpr('let', (env, ctx) => {
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
  })
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

  return namedCompiledExpr('loop', (env, ctx) => {
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
  })
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
  if (loopInfo.hasRestParam) {
    if (argForms.length < (loopInfo.fixedParamCount ?? 0)) return null
  } else if (argForms.length !== slots.length) {
    return null
  }

  const compiledArgs: CompiledExpr[] = []
  for (const arg of argForms) {
    const compiled = compile(arg, compileEnv)
    if (compiled === null) return null
    compiledArgs.push(compiled)
  }
  return namedCompiledExpr('recur', (env, ctx) => {
    // important: evaluate ALL new values before writting ANY slot
    const newArgs = compiledArgs.map((compiledArg) => compiledArg(env, ctx))
    recurTarget.args = newArgs
    // return value ignored, loop checks recurTarget.args
    return v.nil()
  })
}

/**
 * Compiles a (binding [*var* val ...] body...) form.
 *
 * At compile time: validates the binding vector shape and compiles all
 * init expressions and the body. Bails (returns null) if any sub-form
 * cannot be compiled.
 *
 * At runtime: evaluates each init, pushes the result onto the dynamic
 * var's bindingStack, executes the body, then pops all pushed values in
 * a finally block so bindings are restored even when the body throws.
 */
export function compileBinding(
  node: CljList,
  compileEnv: CompileEnv | null,
  compile: CompileFn
): CompiledExpr | null {
  const bindings = node.value[1]
  if (!is.vector(bindings) || bindings.value.length % 2 !== 0) return null

  // Collect (varName, compiledInit) pairs — bail if any RHS can't compile
  const pairs: Array<[string, CompiledExpr]> = []
  for (let i = 0; i < bindings.value.length; i += 2) {
    const sym = bindings.value[i]
    if (!is.symbol(sym)) return null
    const compiledInit = compile(bindings.value[i + 1], compileEnv)
    if (compiledInit === null) return null
    pairs.push([sym.name, compiledInit])
  }

  const body = node.value.slice(2)
  const compiledBody = compileDo(body, compileEnv, compile)
  if (compiledBody === null) return null

  return namedCompiledExpr('binding', (env, ctx) => {
    const boundVars: CljVar[] = []
    try {
      for (const [name, compiledInit] of pairs) {
        const newVal = compiledInit(env, ctx)
        // Support both unqualified (*my-var*) and qualified (my.ns/*my-var*) symbols.
        const slashIdx = name.indexOf('/')
        let varObj: CljVar | undefined
        if (slashIdx > 0 && slashIdx < name.length - 1) {
          const nsPrefix = name.slice(0, slashIdx)
          const localName = name.slice(slashIdx + 1)
          const nsEnv = getNamespaceEnv(env)
          const targetNs = nsEnv.ns?.aliases.get(nsPrefix) ?? ctx.resolveNs(nsPrefix) ?? null
          varObj = targetNs?.vars.get(localName)
        } else {
          varObj = lookupVar(name, env)
        }
        if (!varObj) {
          throw new EvaluationError(
            `No var found for symbol '${name}' in binding form`,
            { name }
          )
        }
        if (!varObj.dynamic) {
          throw new EvaluationError(
            `Cannot use binding with non-dynamic var ${varObj.ns}/${varObj.name}. Mark it dynamic with (def ^:dynamic ${varObj.name} ...)`,
            { name }
          )
        }
        varObj.bindingStack ??= []
        varObj.bindingStack.push(newVal)
        boundVars.push(varObj)
      }
    } catch (e) {
      for (let i = boundVars.length - 1; i >= 0; i--) {
        boundVars[i].bindingStack!.pop()
      }
      throw e
    }
    try {
      return compiledBody(env, ctx)
    } finally {
      for (let i = boundVars.length - 1; i >= 0; i--) {
        boundVars[i].bindingStack!.pop()
      }
    }
  })
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
 * `profileFragment` labels the generated JS closure for CPU profilers (V8 name).
 *
 * Returns null if the body cannot be fully compiled (fallback to interpreter).
 */
export function compileFnBody(
  params: CljSymbol[],
  restParam: CljSymbol | null,
  body: CljValue[],
  compile: CompileFn,
  profileFragment: string = 'fn_body'
): { compiledBody: CompiledExpr; paramSlots: SlotRef[] } | null {
  const arityForSlots: Arity = { params, restParam, body }
  const paramSlots: SlotRef[] = params.map(() => ({ value: null }))
  if (restParam !== null) paramSlots.push({ value: null })
  const recurTarget: { args: CljValue[] | null } = { args: null }
  const bindings = new Map(params.map((p, i) => [p.name, paramSlots[i]]))
  if (restParam !== null) {
    bindings.set(restParam.name, paramSlots[paramSlots.length - 1])
  }
  const fnCompileEnv: CompileEnv = {
    bindings,
    outer: null,
    loop: {
      slots: paramSlots,
      recurTarget,
      fixedParamCount: params.length,
      hasRestParam: restParam !== null,
    },
  }
  const innerCompiled = compileDo(body, fnCompileEnv, compile)
  if (innerCompiled === null) return null

  const compiledBody: CompiledExpr = namedCompiledExpr(profileFragment, (env, ctx) => {
    while (true) {
      recurTarget.args = null
      const result = innerCompiled(env, ctx)
      if (recurTarget.args !== null) {
        const slotValues = slotValuesForArity(arityForSlots, recurTarget.args)
        for (let i = 0; i < paramSlots.length; i++) {
          paramSlots[i].value = slotValues[i]
        }
      } else {
        return result
      }
    }
  })
  return { compiledBody, paramSlots }
}
