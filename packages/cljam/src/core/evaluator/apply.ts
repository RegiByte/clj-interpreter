import { is } from '../assertions'
import { EvaluationError } from '../errors'
import { cljNil } from '../factories'
import { valueKeywords } from '../keywords'
import { mapGet, NOT_FOUND, setContains } from '../persistent/map-helpers'
import { vectorCount, vectorNth } from '../persistent/vector-helpers'
import { printString } from '../printer'
import type {
  CljFunction,
  CljMacro,
  CljNativeFunction,
  CljValue,
  Env,
  EvaluationContext,
} from '../types'
import { executeChunk } from '../vm/vm'
import { makeFrame, walkNode } from '../walker'
import { RecurSignal, resolveArity, slotValuesForArity } from './arity'
import { cljToJs, jsToClj } from './js-interop'
import { dispatchMultiMethod } from './multimethod-dispatch'

export function applyFunctionWithContext(
  fn: CljFunction | CljNativeFunction,
  args: CljValue[],
  ctx: EvaluationContext,
  callEnv: Env
): CljValue {
  if (fn.kind === valueKeywords.nativeFunction) {
    // New path, native fns receive evaluation context as first argument
    if (fn.fnWithContext) {
      return fn.fnWithContext(ctx, callEnv, ...args)
    }
    return fn.fn(...args)
  }
  if (fn.kind === valueKeywords.function) {
    const arity = resolveArity(fn.arities, args.length)

    if (arity.bytecodeBody && ctx.vmExecutionMode !== 'off') {
      const chunk = arity.bytecodeBody
      let locals = slotValuesForArity(arity, args)
      while (locals.length < chunk.localCount) {
        locals.push(cljNil())
      }
      if (chunk.selfSlot >= 0) {
        locals[chunk.selfSlot] = fn
      }
      ctx.instrumentation?.onEvent({
        path: 'vm:function-body',
        mode: ctx.vmExecutionMode ?? 'function-body',
        formKind: 'fn*',
      })
      return executeChunk({
        chunk,
        env: fn.env,
        ctx,
        locals,
        rootFnName: fn.name ?? null,
        closure: arity.vmClosure ?? null,
      })
    }

    // AST-walker path — the base engine. Frame layout matches the analyzer's
    // slot plan: args at 0..n-1 (variadic rest packed at n), self after
    // params, everything else nil until written.
    if (arity.astMethod) {
      const method = arity.astMethod
      ctx.instrumentation?.onEvent({
        path: 'ast:function-body',
        mode: ctx.vmExecutionMode ?? 'off',
        formKind: 'fn*',
        details: { functionName: fn.name ?? null },
      })
      const frame = makeFrame(arity.astSlotCount ?? 0)
      frame.upvalues = arity.astUpvalues ?? []
      let currentArgs = args
      while (true) {
        const slotArgs = slotValuesForArity(arity, currentArgs)
        for (let i = 0; i < slotArgs.length; i++) frame.slots[i] = slotArgs[i]
        if (method.self !== null) frame.slots[method.self.slot] = fn
        try {
          return walkNode(method.body, frame, fn.env, ctx)
        } catch (e) {
          if (e instanceof RecurSignal) {
            currentArgs = e.args
            continue
          }
          throw e
        }
      }
    }

    // Internal invariant: every fn is walker-created (astMethod) or
    // VM-compiled (bytecodeBody, per mode). A bare-form arity means a
    // construction path bypassed both engines — a bug, not a user error.
    throw new EvaluationError(
      `fn ${fn.name ?? '(anonymous)'} has no executable body for this arity (internal invariant violation)`,
      { fn, args }
    )
  }

  throw new EvaluationError(
    `${(fn as CljValue).kind} is not a callable function`,
    {
      fn,
      args,
    }
  )
}

export function applyMacroWithContext(
  macro: CljMacro,
  rawArgs: CljValue[],
  ctx: EvaluationContext
): CljValue {
  const arity = resolveArity(macro.arities, rawArgs.length)

  if (arity.bytecodeBody && ctx.vmExecutionMode !== 'off') {
    const chunk = arity.bytecodeBody
    let locals = slotValuesForArity(arity, rawArgs)
    while (locals.length < chunk.localCount) {
      locals.push(cljNil())
    }
    if (chunk.selfSlot >= 0) {
      locals[chunk.selfSlot] = macro
    }
    ctx.instrumentation?.onEvent({
      path: 'vm:macro-body',
      mode: ctx.vmExecutionMode ?? 'function-body',
      formKind: 'defmacro',
    })
    return executeChunk({
      chunk,
      env: macro.env,
      ctx,
      locals,
      rootFnName: macro.name ?? null,
      closure: arity.vmClosure ?? null,
    })
  }

  // AST-walker path — parallel of the fn astMethod branch, minus the
  // RecurSignal loop: the interpreter's macro path has none either (a
  // fn-level recur in a macro body propagates out on both paths).
  if (arity.astMethod) {
    const method = arity.astMethod
    ctx.instrumentation?.onEvent({
      path: 'ast:macro-body',
      mode: ctx.vmExecutionMode ?? 'off',
      formKind: 'defmacro',
      details: { macroName: macro.name ?? null },
    })
    const frame = makeFrame(arity.astSlotCount ?? 0)
    frame.upvalues = arity.astUpvalues ?? []
    const slotArgs = slotValuesForArity(arity, rawArgs)
    for (let i = 0; i < slotArgs.length; i++) frame.slots[i] = slotArgs[i]
    if (method.self !== null) frame.slots[method.self.slot] = macro
    return walkNode(method.body, frame, macro.env, ctx)
  }

  // Same invariant as applyFunctionWithContext: macros are walker-created
  // (astMethod) or VM-compiled (bytecodeBody, per mode).
  throw new EvaluationError(
    `macro ${macro.name ?? '(anonymous)'} has no executable body for this arity (internal invariant violation)`,
    { macro, rawArgs }
  )
}

/**
 * Invokes any IFn value — functions, native functions, keywords, collections,
 * vars, and host callables.
 * Used by comp, partial, and any other HOF that needs to call an arbitrary
 * callable without going through the full list-evaluation dispatch.
 */
export function applyCallableWithContext(
  fn: CljValue,
  args: CljValue[],
  ctx: EvaluationContext,
  callEnv: Env
): CljValue {
  if (is.aFunction(fn)) {
    return applyFunctionWithContext(fn, args, ctx, callEnv)
  }
  if (is.jsValue(fn)) {
    if (typeof fn.value !== valueKeywords.function) {
      throw new EvaluationError(
        `js-value is not callable: ${typeof fn.value}`,
        { fn, args }
      )
    }
    const jsArgs = args.map((a) => cljToJs(a, ctx, callEnv))
    const rawResult = (fn.value as (...a: unknown[]) => unknown)(...jsArgs)
    return jsToClj(rawResult)
  }
  if (is.keyword(fn)) {
    const target = args[0]
    const defaultVal = args.length > 1 ? args[1] : cljNil()
    if (is.map(target)) {
      const found = mapGet(target, fn)
      return found === NOT_FOUND ? defaultVal : found
    }
    if (is.record(target)) {
      const entry = target.fields.find(([k]) => is.equal(k, fn))
      return entry ? entry[1] : defaultVal
    }
    return defaultVal
  }
  if (is.vector(fn)) {
    if (args.length !== 1) {
      throw new EvaluationError(
        `Vector used as function requires exactly one argument, got ${args.length}`,
        { fn, args }
      )
    }
    const index = args[0]
    if (!is.number(index) || !Number.isInteger(index.value)) {
      const err = new EvaluationError(
        `Vector used as function expects a number index, got ${printString(index)}`,
        { fn, args }
      )
      err.data = { argIndex: 0 }
      throw err
    }
    const count = vectorCount(fn)
    if (index.value < 0 || index.value >= count) {
      const err = new EvaluationError(
        `nth index ${index.value} is out of bounds for collection of length ${count}`,
        { fn, args }
      )
      err.data = { argIndex: 0 }
      throw err
    }
    return vectorNth(fn, index.value)
  }
  if (is.record(fn)) {
    if (args.length === 0) {
      throw new EvaluationError(
        'Record used as function requires at least one argument',
        { fn, args }
      )
    }
    const key = args[0]
    const defaultVal = args.length > 1 ? args[1] : cljNil()
    const entry = fn.fields.find(([k]) => is.equal(k, key))
    return entry ? entry[1] : defaultVal
  }
  if (is.map(fn)) {
    if (args.length === 0) {
      throw new EvaluationError(
        'Map used as function requires at least one argument',
        { fn, args }
      )
    }
    const key = args[0]
    const defaultVal = args.length > 1 ? args[1] : cljNil()
    const found = mapGet(fn, key)
    return found === NOT_FOUND ? defaultVal : found
  }
  if (is.set(fn)) {
    if (args.length === 0) {
      throw new EvaluationError(
        'Set used as function requires at least one argument',
        { fn, args }
      )
    }
    const key = args[0]
    return setContains(fn, key) ? key : cljNil()
  }
  // Vars are IFn — deref to current value and delegate. This makes #'handler
  // hot-swappable: the var is captured, not the value at capture time.
  if (is.var(fn)) {
    return applyCallableWithContext(fn.value, args, ctx, callEnv)
  }
  if (is.multiMethod(fn)) {
    return dispatchMultiMethod(fn, args, ctx, callEnv)
  }
  throw new EvaluationError(`${printString(fn)} is not a callable value`, {
    fn,
    args,
  })
}
