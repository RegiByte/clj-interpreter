import { is } from '../assertions.ts'
import { EvaluationError } from '../errors.ts'
import { dispatchMultiMethod } from '../evaluator/dispatch.ts'
import { resolveArity } from '../evaluator/arity.ts'
import { getLineCol, getPos, maybeHydrateErrorPos } from '../positions.ts'
import { printString } from '../printer.ts'
import type { CljList, CljValue, CompiledExpr, CompileEnv, CompileFn, StackFrame } from '../types.ts'

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
  return (env, ctx) => {
    const op = compiledOp(env, ctx)
    if (is.multiMethod(op)) {
      const args = compiledArgs.map((c) => c!(env, ctx))
      return dispatchMultiMethod(op, args, ctx, env, node)
    }
    if (!is.callable(op)) {
      const name = is.symbol(head) ? head.name : printString(head)
      throw new EvaluationError(`${name} is not callable`, { list: node, env }, getPos(node))
    }
    const args = compiledArgs.map((carg) => carg!(env, ctx))
    const rawPos = getPos(node)
    let line = null as null | number
    let col = null as null | number
    if (rawPos && ctx.currentSource) {
      const lc = getLineCol(ctx.currentSource, rawPos.start)
      line = lc.line
      col = lc.col + 1  // 1-indexed
    }
    const frame: StackFrame = {
      fnName: is.symbol(head) ? head.name : null,
      line,
      col,
      source: ctx.currentFile ?? null,
      pos: rawPos ?? null,
    }
    ctx.frameStack.push(frame)
    try {
      // Fast path: CljFunction with compiled param slots — inline the
      // applyCallableWithContext → applyFunctionWithContext chain to eliminate
      // 2 intermediate function-call frames per recursive level. Semantics
      // match applyFunctionWithContext's fast path exactly:
      //   resolve arity → save param slots → write args → call compiledBody → restore slots
      // Falls through to ctx.applyCallable for all other callables (native
      // functions, vars-as-IFn, keywords, maps, uncompiled functions, etc.)
      if (op.kind === 'function') {
        const arity = resolveArity(op.arities, argCount)
        if (arity.compiledBody && arity.paramSlots) {
          const slots = arity.paramSlots
          const saved: (CljValue | null)[] = new Array(slots.length)
          for (let i = 0; i < slots.length; i++) {
            saved[i] = slots[i].value
            slots[i].value = args[i]
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
