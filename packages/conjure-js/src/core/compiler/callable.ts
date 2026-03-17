import { is } from '../assertions.ts'
import { EvaluationError } from '../errors.ts'
import { dispatchMultiMethod } from '../evaluator/dispatch.ts'
import { maybeHydrateErrorPos } from '../positions.ts'
import { printString } from '../printer.ts'
import type { CljList, CompiledExpr, CompileEnv, CompileFn } from '../types.ts'

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
  return (env, ctx) => {
    const op = compiledOp(env, ctx)
    if (is.multiMethod(op)) {
      const args = compiledArgs.map((c) => c!(env, ctx))
      return dispatchMultiMethod(op, args, ctx, env)
    }
    if (!is.callable(op)) {
      const name = is.symbol(head) ? head.name : printString(head)
      throw new EvaluationError(`${name} is not callable`, { list: node, env })
    }
    const args = compiledArgs.map((carg) => carg!(env, ctx))
    try {
      return ctx.applyCallable(op, args, env)
    } catch (ex) {
      maybeHydrateErrorPos(ex, node)
      throw ex
    }
  }
}
