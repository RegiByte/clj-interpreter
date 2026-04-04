import { is } from '../assertions.ts'
import { v } from '../factories.ts'
import { valueKeywords } from '../keywords.ts'
import type {
  CljMap,
  CljSet,
  CljValue,
  CljVector,
  CompiledExpr,
  CompileEnv,
  CompileFn,
} from '../types.ts'

/**
 * Compiles a vector literal to a JS closure.
 * Each element is compiled recursively; the closure evaluates them
 * left-to-right and constructs the vector at runtime.
 * Preserves reader-attached metadata (captured statically at compile time).
 * Returns null if any element cannot be compiled.
 *
 * [e1 e2 ... eN]
 */
export function compileVector(
  node: CljVector,
  compileEnv: CompileEnv | null,
  compile: CompileFn
): CompiledExpr | null {
  const compiledElements: CompiledExpr[] = []
  for (const el of node.value) {
    const compiled = compile(el, compileEnv)
    if (compiled === null) return null
    compiledElements.push(compiled)
  }
  // Metadata is set at read time — capture it statically
  const meta = node.meta
  return (env, ctx) => {
    const evaluated = compiledElements.map((c) => c(env, ctx))
    if (meta) return { kind: valueKeywords.vector, value: evaluated, meta }
    return v.vector(evaluated)
  }
}

/**
 * Compiles a map literal to a JS closure.
 * Key-value pairs are compiled recursively; the closure evaluates them
 * left-to-right (key then value per entry) and constructs the map at runtime.
 * Preserves reader-attached metadata (captured statically at compile time).
 * Returns null if any key or value cannot be compiled.
 *
 * {k1 v1 k2 v2 ... kN vN}
 */
export function compileMap(
  node: CljMap,
  compileEnv: CompileEnv | null,
  compile: CompileFn
): CompiledExpr | null {
  const compiledPairs: [CompiledExpr, CompiledExpr][] = []
  for (const [key, val] of node.entries) {
    const compiledKey = compile(key, compileEnv)
    const compiledVal = compile(val, compileEnv)
    if (compiledKey === null || compiledVal === null) return null
    compiledPairs.push([compiledKey, compiledVal])
  }
  const meta = node.meta
  return (env, ctx) => {
    const entries: [CljValue, CljValue][] = []
    for (const [ck, cv] of compiledPairs) {
      entries.push([ck(env, ctx), cv(env, ctx)])
    }
    if (meta) return { kind: valueKeywords.map, entries, meta }
    return v.map(entries)
  }
}

/**
 * Compiles a set literal to a JS closure.
 * Each element is compiled recursively; the closure evaluates them
 * and deduplicates using structural equality (is.equal) — matching
 * the interpreter's evaluateSet semantics exactly.
 * Returns null if any element cannot be compiled.
 *
 * #{e1 e2 ... eN}
 */
export function compileSet(
  node: CljSet,
  compileEnv: CompileEnv | null,
  compile: CompileFn
): CompiledExpr | null {
  const compiledElements: CompiledExpr[] = []
  for (const el of node.values) {
    const compiled = compile(el, compileEnv)
    if (compiled === null) return null
    compiledElements.push(compiled)
  }
  return (env, ctx) => {
    const evaluated: CljValue[] = []
    for (const c of compiledElements) {
      const ev = c(env, ctx)
      // Deduplicate using structural equality, same as evaluateSet
      if (!evaluated.some((existing) => is.equal(existing, ev))) {
        evaluated.push(ev)
      }
    }
    return v.set(evaluated)
  }
}
