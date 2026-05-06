import { is } from '../assertions.ts'
import { derefValue } from '../env.ts'
import { EvaluationError } from '../errors.ts'
import { dispatchMultiMethod } from '../evaluator/multimethod-dispatch.ts'
import { resolveArity, slotValuesForArity } from '../evaluator/arity.ts'
import { v } from '../factories.ts'
import { getPos, maybeHydrateErrorPos } from '../positions.ts'
import { printString } from '../printer.ts'
import type {
  CljList,
  CljValue,
  CompiledExpr,
  CompileEnv,
  CompileFn,
  StackFrame,
} from '../types.ts'

type IntrinsicName = '+' | '-' | '*' | '/' | '<' | '>' | '<=' | '>=' | '='

const intrinsicNames = new Set<string>([
  '+',
  '-',
  '*',
  '/',
  '<',
  '>',
  '<=',
  '>=',
  '=',
])

function intrinsicNameFor(head: CljValue): IntrinsicName | null {
  if (!is.symbol(head) || !intrinsicNames.has(head.name)) return null
  return head.name as IntrinsicName
}

function isCurrentCoreRoot(
  name: IntrinsicName,
  op: CljValue,
  ctx: Parameters<CompiledExpr>[1]
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

function evalCompiledArgs(
  compiledArgs: CompiledExpr[],
  env: Parameters<CompiledExpr>[0],
  ctx: Parameters<CompiledExpr>[1]
): CljValue[] {
  return compiledArgs.map((carg) => carg(env, ctx))
}

function applyCompiledFunctionFastPath(
  op: CljValue,
  args: CljValue[],
  argCount: number,
  env: Parameters<CompiledExpr>[0],
  ctx: Parameters<CompiledExpr>[1]
): CljValue {
  // Fast path: CljFunction with compiled param slots — inline the
  // applyCallableWithContext → applyFunctionWithContext chain to eliminate
  // 2 intermediate function-call frames per recursive level. Semantics
  // match applyFunctionWithContext's fast path exactly:
  //   resolve arity → save param slots → write args → call compiledBody → restore slots
  // Falls through to ctx.applyCallable for all other callables (native
  // functions, vars-as-IFn, keywords, maps, uncompiled functions, etc.)
  if (is.function(op)) {
    const arity = resolveArity(op.arities, argCount)
    if (arity.compiledBody && arity.paramSlots) {
      const slots = arity.paramSlots
      const slotValues = slotValuesForArity(arity, args)
      const saved: (CljValue | null)[] = new Array(slots.length)
      for (let i = 0; i < slots.length; i++) {
        saved[i] = slots[i].value
        slots[i].value = slotValues[i]
      }
      try {
        return arity.compiledBody(op.env, ctx)
      } finally {
        for (let i = 0; i < slots.length; i++) {
          slots[i].value = saved[i]
        }
      }
    }
  }
  return ctx.applyCallable(op, args, env)
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
          const err = new EvaluationError('division by zero', { args })
          err.data = { argIndex: i }
          throw err
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
      for (let i = 1; i < args.length; i++) {
        const current = nums[i]
        let result
        switch (name) {
          case '<':
            result = prev < current
            break
          case '>':
            result = prev > current
            break
          case '<=':
            result = prev <= current
            break
          case '>=':
            result = prev >= current
            break
          default:
            throw new Error(
              `Internal compiler error: unexpected intrinsic name: ${name}`
            )
        }
        if (!result) return v.boolean(false)
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

export function compileCall(
  node: CljList,
  compileEnv: CompileEnv | null,
  compile: CompileFn
): CompiledExpr | null {
  const head = node.value[0]
  const compiledOp = compile(head, compileEnv)
  if (compiledOp === null) return null
  const compiledArgs: CompiledExpr[] = []
  for (const arg of node.value.slice(1)) {
    const compiled = compile(arg, compileEnv)
    // Uncompilable argument, bail out
    if (compiled === null) return null
    compiledArgs.push(compiled)
  }
  // Capture arg count at compile time to avoid a runtime .length lookup
  const argCount = compiledArgs.length
  const intrinsicName = intrinsicNameFor(head)
  return (env, ctx) => {
    const op = compiledOp(env, ctx)
    if (is.multiMethod(op)) {
      const args = evalCompiledArgs(compiledArgs, env, ctx)
      return dispatchMultiMethod(op, args, ctx, env, node)
    }
    if (!is.callable(op)) {
      const name = is.symbol(head) ? head.name : printString(head)
      throw new EvaluationError(
        `${name} is not callable`,
        { list: node, env },
        getPos(node)
      )
    }
    const useIntrinsic =
      intrinsicName !== null && isCurrentCoreRoot(intrinsicName, op, ctx)
    const args = useIntrinsic ? null : evalCompiledArgs(compiledArgs, env, ctx)
    const rawPos = getPos(node)
    const frame: StackFrame = {
      fnName: is.symbol(head) ? head.name : null,
      line: null,
      col: null,
      source: ctx.currentFile ?? null,
      pos: rawPos ?? null,
    }
    ctx.frameStack.push(frame)
    try {
      if (useIntrinsic) {
        return applyIntrinsic(
          intrinsicName,
          evalCompiledArgs(compiledArgs, env, ctx)
        )
      }
      if (args === null) {
        throw new EvaluationError(
          'Internal compiler error: missing compiled call arguments',
          { node }
        )
      }
      return applyCompiledFunctionFastPath(op, args, argCount, env, ctx)
    } catch (ex) {
      maybeHydrateErrorPos(ex, node)
      if (ex instanceof EvaluationError && !ex.frames) {
        ex.frames = [...ctx.frameStack].reverse()
      }
      throw ex
    } finally {
      ctx.frameStack.pop()
    }
  }
}
