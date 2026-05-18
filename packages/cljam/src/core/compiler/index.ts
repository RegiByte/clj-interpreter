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
 * - Phase 8: try/catch/finally
 * - Phase 9: binding (dynamic var push/pop)
 *
 * Returns null for unsupported forms (fallback to interpreter).
 * See ./evaluate.ts:evaluateWithContext for the entry point.
 */
import { is } from '../assertions.ts'
import { derefValue, getNamespaceEnv } from '../env.ts'
import { EvaluationError } from '../errors.ts'
import { specialFormKeywords, valueKeywords } from '../keywords.ts'
import {
  type CljNamespace,
  type CljList,
  type CljMap,
  type CljSet,
  type CljSymbol,
  type CljValue,
  type CljVar,
  type Env,
  type CljVector,
  type CompiledExpr,
  type CompileEnv,
  type CompileFn,
  type EvaluationContext,
} from '../types.ts'
import { getPos } from '../positions.ts'
import { jsToClj } from '../evaluator/js-interop.ts'
import { compileBinding, compileFnBody, compileLet, compileLoop, compileRecur } from './binding.ts'
import { compileCall } from './callable.ts'
import { compileMap, compileSet, compileVector } from './collections.ts'
import { findSlot } from './compile-env.ts'
import { compileDo, compileIf, compileTry } from './control-flow.ts'
import { namedCompiledExpr } from './profile-name.ts'

/**
 * Export the compiler functions for use in the evaluator
 * Ideally external consumers should only use the compile function,
 * not it's children!
 */
export { compileBinding, compileDo, compileIf, compileLet, compileLoop, compileRecur, compileFnBody, compileTry }

type CachedVarRef = {
  ns: CljNamespace
  varRef: CljVar
}

function readUnqualifiedSymbol(
  name: string,
  env: Env,
  cache: { current: CachedVarRef | null }
): CljValue {
  let current: Env | null = env
  while (current) {
    const raw = current.bindings.get(name)
    if (raw !== undefined) return raw

    if (current.ns) {
      const cached = cache.current
      if (
        cached !== null &&
        current.ns === cached.ns &&
        current.ns.vars.get(name) === cached.varRef
      ) {
        return derefValue(cached.varRef)
      }

      const varRef = current.ns.vars.get(name)
      if (varRef !== undefined) {
        cache.current = { ns: current.ns, varRef }
        return derefValue(varRef)
      }
    }

    current = current.outer
  }
  throw new EvaluationError(`Symbol ${name} not found`, { name })
}

function resolveQualifiedVar(
  alias: string,
  localName: string,
  symbolName: string,
  env: Env,
  ctx: EvaluationContext,
  pos: ReturnType<typeof getPos>
): CachedVarRef {
  const nsEnv = getNamespaceEnv(env)
  const targetNs = nsEnv.ns?.aliases.get(alias) ?? ctx.resolveNs(alias) ?? null
  if (!targetNs) {
    throw new EvaluationError(`No such namespace or alias: ${alias}`, {
      symbol: symbolName,
      env,
    }, pos)
  }
  const varRef = targetNs.vars.get(localName)
  if (varRef === undefined) {
    throw new EvaluationError(`Symbol ${symbolName} not found`, {
      symbol: symbolName,
      env,
    }, pos)
  }
  return { ns: targetNs, varRef }
}

function readQualifiedSymbol(
  alias: string,
  localName: string,
  symbolName: string,
  env: Env,
  ctx: EvaluationContext,
  pos: ReturnType<typeof getPos>,
  cache: { current: CachedVarRef | null }
): CljValue {
  const nsEnv = getNamespaceEnv(env)
  const targetNs = nsEnv.ns?.aliases.get(alias) ?? ctx.resolveNs(alias) ?? null
  if (!targetNs) {
    throw new EvaluationError(`No such namespace or alias: ${alias}`, {
      symbol: symbolName,
      env,
    }, pos)
  }

  const cached = cache.current
  if (
    cached !== null &&
    targetNs === cached.ns &&
    targetNs.vars.get(localName) === cached.varRef
  ) {
    return derefValue(cached.varRef)
  }

  const resolved = resolveQualifiedVar(
    alias,
    localName,
    symbolName,
    env,
    ctx,
    pos
  )
  cache.current = resolved
  return derefValue(resolved.varRef)
}

function compileList(
  node: CljList,
  compileEnv: CompileEnv | null,
  compile: CompileFn
): CompiledExpr | null {
  if (node.value.length === 0) {
    return namedCompiledExpr('list_empty', (_env, _ctx) => node)
  }
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
      case specialFormKeywords.try:
        return compileTry(node, compileEnv, compile)
      case specialFormKeywords.binding:
        return compileBinding(node, compileEnv, compile)
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
    const alias = symbolName.slice(0, slashIdx)
    const localName = symbolName.slice(slashIdx + 1)

    if (localName.includes('.')) {
      // Dot-chain qualified symbol: js/console.log, js/Math.pow, etc.
      // Resolves the root var (js/console, js/Math) then walks property segments.
      const segments = localName.split('.')
      return namedCompiledExpr(`sym_dot_${symbolName}`, (env, ctx) => {
        const nsEnv = getNamespaceEnv(env)
        const targetNs = nsEnv.ns?.aliases.get(alias) ?? ctx.resolveNs(alias) ?? null
        if (!targetNs) {
          throw new EvaluationError(`No such namespace or alias: ${alias}`, {
            symbol: symbolName, env,
          }, getPos(node))
        }
        const rootVar = targetNs.vars.get(segments[0])
        if (rootVar === undefined) {
          throw new EvaluationError(`Symbol ${alias}/${segments[0]} not found`, {
            symbol: symbolName, env,
          }, getPos(node))
        }
        let current = derefValue(rootVar)
        for (let i = 1; i < segments.length; i++) {
          // Unwrap to raw JS for property access
          let raw: unknown
          if (current.kind === 'js-value') {
            raw = current.value
          } else if (current.kind === 'string' || current.kind === 'number' || current.kind === 'boolean') {
            raw = current.value
          } else {
            throw new EvaluationError(
              `Cannot access property '${segments[i]}' on ${current.kind} while resolving ${symbolName}`,
              { symbol: symbolName }, getPos(node)
            )
          }
          if (raw === null || raw === undefined) {
            throw new EvaluationError(
              `Cannot access property '${segments[i]}' on ${raw === null ? 'null' : 'undefined'} while resolving ${symbolName}`,
              { symbol: symbolName }, getPos(node)
            )
          }
          const obj = raw as Record<string, unknown>
          const prop = obj[segments[i]]
          // Bind functions to their parent so (js/console.log "hi") works correctly
          if (typeof prop === 'function') {
            current = jsToClj((prop as (...a: unknown[]) => unknown).bind(obj))
          } else {
            current = jsToClj(prop)
          }
        }
        return current
      })
    }

    // Phase 6: qualified symbol — alias/name strings captured at compile time,
    // namespace resolved at runtime. Successful var refs are cached, but misses
    // are not; REPL namespace state can evolve after a function is compiled.
    const cache: { current: CachedVarRef | null } = { current: null }
    const pos = getPos(node)
    return namedCompiledExpr(`sym_qual_${symbolName}`, (env, ctx) => {
      return readQualifiedSymbol(
        alias,
        localName,
        symbolName,
        env,
        ctx,
        pos,
        cache
      )
    })
  }
  const slot = findSlot(symbolName, compileEnv)
  if (slot !== null) {
    return namedCompiledExpr(`sym_slot_${symbolName}`, (_env, _ctx) => slot.value!)
  }
  // Regular lookup — capture pos at compile time so lookup failures point at
  // the symbol in the source rather than the call site.
  const pos = getPos(node)
  const cache: { current: CachedVarRef | null } = { current: null }
  return namedCompiledExpr(`sym_env_${symbolName}`, (env, _ctx) => {
    try {
      return readUnqualifiedSymbol(symbolName, env, cache)
    } catch (e) {
      if (e instanceof EvaluationError && !e.pos && pos) {
        e.pos = pos
      }
      throw e
    }
  })
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
    case valueKeywords.character:
      return namedCompiledExpr(`literal_${node.kind}`, (_env, _ctx) => node)
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
