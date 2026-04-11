import { is } from '../assertions.ts'
import { CljThrownSignal, EvaluationError } from '../errors.ts'
import { v } from '../factories.ts'
import { RecurSignal } from '../evaluator/arity.ts'
import {
  matchesDiscriminator,
  parseTryStructure,
} from '../evaluator/form-parsers.ts'
import { framesToClj } from '../positions.ts'
import type {
  CljList,
  CljValue,
  CompiledExpr,
  CompileEnv,
  CompileFn,
  SlotRef,
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
 * Compiles a try/catch/finally expression to a js closure.
 *
 * Body forms and each catch clause's body are compiled eagerly; catch
 * discriminators are stored as raw AST nodes and evaluated at runtime by
 * matchesDiscriminator (same as the interpreter path).
 *
 * Bails (returns null) if any body form, catch body, or finally form cannot
 * be compiled — consistent with the all-or-nothing pattern used by all other
 * compiler phases.
 *
 * (try body* (catch discriminator e body*) ... (finally body*))
 */
export function compileTry(
  node: CljList,
  compileEnv: CompileEnv | null,
  compile: CompileFn
): CompiledExpr | null {
  const { bodyForms, catchClauses, finallyForms } = parseTryStructure(node)

  const compiledBody = compileDo(bodyForms, compileEnv, compile)
  if (compiledBody === null) return null

  const compiledClauses: Array<{
    discriminator: CljValue
    catchSlot: SlotRef
    compiledCatchBody: CompiledExpr
  }> = []

  for (const clause of catchClauses) {
    const catchSlot: SlotRef = { value: null }
    const catchCompileEnv: CompileEnv = {
      bindings: new Map([[clause.binding, catchSlot]]),
      outer: compileEnv,
    }
    const compiledCatchBody = compileDo(clause.body, catchCompileEnv, compile)
    if (compiledCatchBody === null) return null
    compiledClauses.push({ discriminator: clause.discriminator, catchSlot, compiledCatchBody })
  }

  let compiledFinally: CompiledExpr | null = null
  if (finallyForms !== null && finallyForms.length > 0) {
    compiledFinally = compileDo(finallyForms, compileEnv, compile)
    if (compiledFinally === null) return null
  }

  return (env, ctx) => {
    let result: CljValue = v.nil()
    let pendingThrow: unknown = null

    try {
      result = compiledBody(env, ctx)
    } catch (e) {
      if (e instanceof RecurSignal) throw e

      let thrownValue: CljValue
      if (e instanceof CljThrownSignal) {
        thrownValue = e.value
      } else if (e instanceof EvaluationError) {
        const entries: [CljValue, CljValue][] = [
          [v.keyword(':type'), v.keyword(':error/runtime')],
          [v.keyword(':message'), v.string(e.message)],
        ]
        if (e.frames && e.frames.length > 0) {
          entries.push([v.keyword(':frames'), framesToClj(e.frames)])
        }
        thrownValue = v.map(entries)
      } else {
        throw e
      }

      let handled = false
      for (const { discriminator, catchSlot, compiledCatchBody } of compiledClauses) {
        if (matchesDiscriminator(discriminator, thrownValue, env, ctx)) {
          catchSlot.value = thrownValue
          result = compiledCatchBody(env, ctx)
          handled = true
          break
        }
      }

      if (!handled) {
        pendingThrow = e
      }
    } finally {
      if (compiledFinally !== null) {
        compiledFinally(env, ctx)
      }
    }

    if (pendingThrow !== null) throw pendingThrow
    return result
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

  // Single-form body: return the compiled expression directly.
  // This eliminates one closure-call frame per recursion level — important
  // for deep recursion where every saved native frame extends the stack budget.
  if (compiledForms.length === 1) return compiledForms[0]

  return (env, ctx) => {
    let result: CljValue = v.nil()
    for (const compiled of compiledForms) {
      result = compiled(env, ctx)
    }
    return result
  }
}
