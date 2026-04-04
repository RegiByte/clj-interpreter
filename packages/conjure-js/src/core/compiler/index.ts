/**
 * Compiler — Incremental Implementation
 *
 * Transforms AST nodes into compiled closures that eliminate
 * interpreter dispatch overhead. Supports:
 * - Phase 1: Literals, symbols
 * - Phase 2: if, do
 * - Phase 3A: Function calls (generic)
 * - Phase 3B: let* with slot indexing
 * - Phase 4: fn* with compile-once body caching
 * - Phase 4b: fn* param slots (eliminates bindParams + RecurSignal for fn recur)
 * - Phase 5: loop* / recur → while(true) with mutable slot cells
 * - Phase 6: qualified symbols (ns/sym)
 * - Phase 7: collection literals ([...], {...}, #{...})
 *
 * Returns null for unsupported forms (fallback to interpreter).
 * See ./evaluate.ts:evaluateWithContext for the entry point.
 */
import { is } from '../assertions.ts'
import { derefValue, getNamespaceEnv, lookup } from '../env.ts'
import { EvaluationError } from '../errors.ts'
import { specialFormKeywords, valueKeywords } from '../keywords.ts'
import {
  type CljList,
  type CljMap,
  type CljSet,
  type CljSymbol,
  type CljValue,
  type CljVector,
  type CompiledExpr,
  type CompileEnv,
  type CompileFn,
} from '../types.ts'
import { compileFnBody, compileLet, compileLoop, compileRecur } from './binding.ts'
import { compileCall } from './callable.ts'
import { compileMap, compileSet, compileVector } from './collections.ts'
import { findSlot } from './compile-env.ts'
import { compileDo, compileIf } from './control-flow.ts'

/**
 * Export the compiler functions for use in the evaluator
 * Ideally external consumers should only use the compile function,
 * not it's children!
 */
export { compileDo, compileIf, compileLet, compileLoop, compileRecur, compileFnBody }

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
      case specialFormKeywords['let*']:
        return compileLet(node, compileEnv, compile)
      case specialFormKeywords['loop*']:
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
    // Phase 6: qualified symbol — alias/name strings captured at compile time,
    // namespace resolved at runtime (vars are mutable; ctx not available at compile time).
    const alias = symbolName.slice(0, slashIdx)
    const localName = symbolName.slice(slashIdx + 1)
    return (env, ctx) => {
      const nsEnv = getNamespaceEnv(env)
      const targetNs = nsEnv.ns?.aliases.get(alias) ?? ctx.resolveNs(alias) ?? null
      if (!targetNs) {
        throw new EvaluationError(`No such namespace or alias: ${alias}`, {
          symbol: symbolName,
          env,
        })
      }
      const varObj = targetNs.vars.get(localName)
      if (varObj === undefined) {
        throw new EvaluationError(`Symbol ${symbolName} not found`, {
          symbol: symbolName,
          env,
        })
      }
      return derefValue(varObj)
    }
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
    case valueKeywords.vector:
      return compileVector(node as CljVector, compileEnv, compile)
    case valueKeywords.map:
      return compileMap(node as CljMap, compileEnv, compile)
    case valueKeywords.set:
      return compileSet(node as CljSet, compileEnv, compile)
    case valueKeywords.list: {
      return compileList(node, compileEnv, compile)
    }
  }
  return null
}
