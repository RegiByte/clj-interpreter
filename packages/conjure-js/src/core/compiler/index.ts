/**
 * Compiler — Incremental Implementation
 *
 * Transforms AST nodes into compiled closures that eliminate
 * interpreter dispatch overhead. Supports:
 * - Phase 1: Literals, symbols
 * - Phase 2: if, do
 * - Phase 3: let with slot indexing
 * - Phase 4: fn with compile-once caching
 * - Phase 5: loop/recur → while
 *
 * Returns null for unsupported forms (fallback to interpreter).
 * See ./evaluate.ts:evaluateWithContext for the entry point.
 */
import { is } from '../assertions.ts'
import { lookup } from '../env.ts'
import { specialFormKeywords, valueKeywords } from '../keywords.ts'
import {
  type CljList,
  type CljSymbol,
  type CljValue,
  type CompiledExpr,
  type CompileEnv,
  type CompileFn,
} from '../types.ts'
import { compileLet, compileLoop, compileRecur } from './binding.ts'
import { compileCall } from './callable.ts'
import { findSlot } from './compile-env.ts'
import { compileDo, compileIf } from './control-flow.ts'

/**
 * Export the compiler functions for use in the evaluator
 * Ideally external consumers should only use the compile function,
 * not it's children!
 */
export { compileDo, compileIf, compileLet, compileLoop, compileRecur }

function compileList(
  node: CljList,
  compileEnv: CompileEnv | null,
  compile: CompileFn
): CompiledExpr | null {
  if (node.value.length === 0) return () => node
  const head = node.value[0]
  // First check supported special forms
  if (is.symbol(head)) {
    switch (head.name) {
      case specialFormKeywords.if:
        return compileIf(node, compileEnv, compile)
      case specialFormKeywords.do:
        return compileDo(node.value.slice(1), compileEnv, compile)
      case specialFormKeywords.let:
        return compileLet(node, compileEnv, compile)
      case specialFormKeywords.loop:
        return compileLoop(node, compileEnv, compile)
      case specialFormKeywords.recur:
        return compileRecur(node, compileEnv, compile)
    }
  }

  if (!is.specialForm(head)) {
    // Otherwise, compile as a callable
    return compileCall(node, compileEnv, compile)
  }

  // Unsupported form, bail out
  return null
}

/**
 * Compiles a symbol to a compiled expression.
 * It will look for the symbol as a slot in the compile environment,
 * if found, it will return a closure that directly accesses the slot value.
 * If not found, it will return a closure that looks up the symbol
 * in the local evaluation environment.
 */
function compileSymbol(
  node: CljSymbol,
  compileEnv: CompileEnv | null
): CompiledExpr | null {
  const symbolName = node.name
  const slashIdx = symbolName.indexOf('/')
  if (slashIdx > 0 && slashIdx < symbolName.length - 1) {
    // qualified symbol not supported yet
    return null
  }
  const slot = findSlot(symbolName, compileEnv)
  if (slot !== null) {
    return (_env, _ctx) => slot.value! // direct slot access, no lookup
  }
  // Regular lookup
  return (env, _ctx) => lookup(symbolName, env)
}

/**
 * A pure function that compiles a node to a compiled expression.
 * The goal is to remove the overhead of interpreting the AST structure.
 * Non-supported nodes return null and fallback to the evaluator.
 */
export function compile(
  node: CljValue,
  compileEnv: CompileEnv | null = null
): CompiledExpr | null {
  switch (node.kind) {
    // Self evaluating forms compile to constant closures
    case valueKeywords.number:
    case valueKeywords.string:
    case valueKeywords.keyword:
    case valueKeywords.nil:
    case valueKeywords.boolean:
    case valueKeywords.regex:
      return () => node
    case valueKeywords.symbol: {
      return compileSymbol(node, compileEnv)
    }
    case valueKeywords.list: {
      return compileList(node, compileEnv, compile)
    }
  }
  return null
}
