import { is } from '../assertions'
import { EvaluationError } from '../errors'
import { cljNil } from '../factories'
import { valueKeywords } from '../keywords'
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
import {
  bindParams,
  RecurSignal,
  resolveArity,
  slotValuesForArity,
} from './arity'
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

    // Phase 4b fast path: param slots compiled into body — no Env allocation,
    // no lookup chain walks, no RecurSignal (while(true) is inside compiledBody).
    // Save/restore handles reentrancy for mutual and non-tail-recursive calls.
    if (arity.compiledBody && arity.paramSlots) {
      const slots = arity.paramSlots
      const slotValues = slotValuesForArity(arity, args)
      const savedValues: (CljValue | null)[] = new Array(slots.length)
      for (let i = 0; i < slots.length; i++) {
        savedValues[i] = slots[i].value // save for reentrancy
        slots[i].value = slotValues[i] // write call args
      }
      try {
        return arity.compiledBody(fn.env, ctx)
      } finally {
        for (let i = 0; i < slots.length; i++) {
          slots[i].value = savedValues[i] // restore on exit
        }
      }
    }

    // Original path: bindParams + RecurSignal loop (rest params, uncompiled bodies)
    let currentArgs = args
    while (true) {
      const localEnv = bindParams(
        arity.params,
        arity.restParam,
        currentArgs,
        fn.env,
        ctx,
        callEnv
      )
      try {
        if (arity.compiledBody) {
          return arity.compiledBody(localEnv, ctx)
        }
        return ctx.evaluateForms(arity.body, localEnv)
      } catch (e) {
        if (e instanceof RecurSignal) {
          currentArgs = e.args
          continue
        }
        throw e
      }
    }
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

  const localEnv = bindParams(
    arity.params,
    arity.restParam,
    rawArgs,
    macro.env,
    ctx,
    macro.env
  )
  return ctx.evaluateForms(arity.body, localEnv)
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
      const entry = target.entries.find(([k]) => is.equal(k, fn))
      return entry ? entry[1] : defaultVal
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
    if (index.value < 0 || index.value >= fn.value.length) {
      const err = new EvaluationError(
        `nth index ${index.value} is out of bounds for collection of length ${fn.value.length}`,
        { fn, args }
      )
      err.data = { argIndex: 0 }
      throw err
    }
    return fn.value[index.value]
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
    const entry = fn.entries.find(([k]) => is.equal(k, key))
    return entry ? entry[1] : defaultVal
  }
  if (is.set(fn)) {
    if (args.length === 0) {
      throw new EvaluationError(
        'Set used as function requires at least one argument',
        { fn, args }
      )
    }
    const key = args[0]
    const found = fn.values.some((v) => is.equal(v, key))
    return found ? key : cljNil()
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
