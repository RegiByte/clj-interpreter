import { is } from '../assertions.ts'
import { v } from '../factories.ts'
import type {
  CljList,
  CljValue,
  CompiledExpr,
  CompileEnv,
  CompileFn,
} from '../types.ts'

const IF_TEST_POS = 1
const IF_THEN_POS = 2
const IF_ELSE_POS = 3

/**
 * Compiles an if expression to a js closure.
 * Short-circuits: only evaluates taken branch after test result.
 * Returns null if test, then, or else cannot be compiled.
 * Falling back to the interpreter.
 *
 * (if test then else?)
 */
export function compileIf(
  node: CljList,
  compileEnv: CompileEnv | null,
  compile: CompileFn
): CompiledExpr | null {
  const compiledTest = compile(node.value[IF_TEST_POS], compileEnv)
  const compiledThen = compile(node.value[IF_THEN_POS], compileEnv)
  const hasElse = node.value.length > IF_ELSE_POS
  const compiledElse = hasElse
    ? compile(node.value[IF_ELSE_POS], compileEnv)
    : null
  if (
    compiledTest === null ||
    compiledThen === null ||
    (hasElse && compiledElse === null)
  ) {
    return null
  }

  return (env, ctx) => {
    if (is.truthy(compiledTest(env, ctx))) {
      return compiledThen(env, ctx)
    } else {
      return compiledElse ? compiledElse(env, ctx) : v.nil()
    }
  }
}

/**
 * Compiles a do expression to a js closure.
 * Evaluates all forms in sequence, returns last result.
 * Returns null if any form cannot be compiled.
 * Falling back to the interpreter.
 *
 * (do e1 e2 ... eN)
 */
export function compileDo(
  node: CljValue[],
  compileEnv: CompileEnv | null,
  compile: CompileFn
): CompiledExpr | null {
  const compiledForms: CompiledExpr[] = []
  for (const form of node) {
    const compiled = compile(form, compileEnv)
    // Can't compile a form, so bail out
    if (compiled === null) return null
    compiledForms.push(compiled)
  }

  return (env, ctx) => {
    let result: CljValue = v.nil()
    for (const compiled of compiledForms) {
      result = compiled(env, ctx)
    }
    return result
  }
}
