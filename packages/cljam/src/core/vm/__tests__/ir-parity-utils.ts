/**
 * Bytecode-diff harness for the IR-driven compiler migration.
 *
 * Compiles the SAME expanded form through the legacy `tryCompileVm` and the new
 * `tryCompileVmFromIr`, then asserts the two chunks are equal on everything that
 * affects execution. Source positions are intentionally excluded: positions are
 * stored as a non-enumerable `_pos` (so `toEqual` ignores them on constants) and
 * the parallel `positions` / `callArgPositions` arrays are dropped during
 * normalization. See the plan: positions are allowed to diverge in Phase 1.
 *
 * Forms are read and `expandAll`-ed exactly the way the session does, against a
 * fully bootstrapped (clojure.core-loaded) session, so realistic forms with
 * macros and core fns resolve.
 */

import { expect } from 'vitest'
import { createEvaluationContext } from '../../evaluator'
import {
  extractAliasMapFromTokens,
  extractNsNameFromTokens,
} from '../../ns-forms'
import { readForms } from '../../reader'
import {
  createSession,
  createSessionFromSnapshot,
  snapshotSession,
  type Session,
} from '../../session'
import { tokenize } from '../../tokenizer'
import type {
  CljValue,
  Env,
  EvaluationContext,
  VmChunk,
  VmCompileResult,
} from '../../types'
import { tryCompileVm } from '../compiler'
import { tryCompileVmFromIr } from '../ir-compiler'
import { executeChunk } from '../vm'

const baseline = snapshotSession(createSession())

function freshSession(): Session {
  return createSessionFromSnapshot(baseline)
}

function makeTestContext(session: Session): EvaluationContext {
  const ctx = createEvaluationContext()
  ctx.resolveNs = (name) => session.runtime.getNs(name)
  ctx.allNamespaces = () => {
    const namespaces = []
    for (const env of session.runtime.registry.values()) {
      if (env.ns) namespaces.push(env.ns)
    }
    return namespaces
  }
  ctx.setCurrentNs = (name) => session.setNs(name)
  ctx.currentDir = session.currentDir
  ctx.setCurrentDir = (dir) => session.setCurrentDir(dir)
  return ctx
}

export type PreparedForm = {
  ctx: EvaluationContext
  env: Env
  form: CljValue
}

/** Read a single form and macroexpand it against a core-loaded session. */
export function prepareForm(code: string): PreparedForm {
  const session = freshSession()
  const ctx = makeTestContext(session)
  const tokens = tokenize(code)
  const declaredNs = extractNsNameFromTokens(tokens)
  if (declaredNs) session.setNs(declaredNs)

  const env = session.runtime.getNamespaceEnv(session.currentNs)
  if (!env) throw new Error(`Missing namespace env: ${session.currentNs}`)

  const aliasMap = extractAliasMapFromTokens(tokens)
  env.ns?.aliases.forEach((ns, alias) => aliasMap.set(alias, ns.name))
  env.ns?.readerAliases.forEach((nsName, alias) => aliasMap.set(alias, nsName))

  const forms = readForms(tokens, session.currentNs, aliasMap, code)
  if (forms.length !== 1) {
    throw new Error(`parity harness expects exactly one form, got ${forms.length}`)
  }

  session.runtime.processNsRequires(forms, env, ctx)
  return { ctx, env, form: ctx.expandAll(forms[0], env) }
}

export type CompileBoth = {
  legacy: VmCompileResult
  ir: VmCompileResult
  prepared: PreparedForm
}

/** Compile one form through both compilers. */
export function compileBoth(code: string): CompileBoth {
  const prepared = prepareForm(code)
  const legacy = tryCompileVm(prepared.form)
  const ir = tryCompileVmFromIr(prepared.form, prepared.env, prepared.ctx)
  return { legacy, ir, prepared }
}

/**
 * Reduces a chunk to the execution-relevant fields, recursively. Drops `id`,
 * `globalVarCache`, `name`, and the position side-arrays. `constants` are kept
 * raw (toEqual ignores the non-enumerable `_pos`).
 */
export function normalizeChunk(chunk: VmChunk): unknown {
  return {
    code: chunk.code,
    constants: chunk.constants,
    maxStack: chunk.maxStack,
    localCount: chunk.localCount,
    selfSlot: chunk.selfSlot,
    catchTables: chunk.catchTables,
    lexicalVarLookups: chunk.lexicalVarLookups.map((lookup) => ({
      symbol: lookup.symbol.name,
      candidates: lookup.candidates,
    })),
    innerFunctions: chunk.innerFunctions.map((template) => ({
      upvalueDescriptors: template.upvalueDescriptors,
      arities: template.arities.map((arity) => ({
        params: arity.params.map((p) => p.name),
        restParam: arity.restParam === null ? null : arity.restParam.name,
        bodyLength: arity.body.length,
        chunk: normalizeChunk(arity.chunk),
      })),
    })),
  }
}

/**
 * Asserts both compilers succeed and produce byte-equal chunks (modulo
 * positions). Use this for forms expected to compile on both paths.
 */
export function expectChunkParity(code: string): void {
  const { legacy, ir } = compileBoth(code)
  if (!legacy.ok) {
    throw new Error(
      `legacy compiler fell back for: ${code} (${legacy.reason.category}: ${legacy.reason.detail})`
    )
  }
  if (!ir.ok) {
    throw new Error(
      `IR compiler fell back for: ${code} (${ir.reason.category}: ${ir.reason.detail})`
    )
  }
  expect(normalizeChunk(ir.chunk)).toEqual(normalizeChunk(legacy.chunk))
}

/** Asserts both compilers fall back (coverage parity for unsupported forms). */
export function expectBothFallback(code: string): void {
  const { legacy, ir } = compileBoth(code)
  expect(legacy.ok).toBe(false)
  expect(ir.ok).toBe(false)
}

/**
 * Behavioral guardrail for forms where the IR compiler INTENTIONALLY diverges
 * from the legacy bytecode (e.g. RB-007-class letfn/lazy-seq capture, where the
 * analyzer captures the letfn binding instead of the legacy fn self-slot).
 * Executes the IR-compiled chunk on the VM and asserts it equals the
 * interpreter (vm mode forced `off` so the reference is interpreter-only).
 */
export function expectIrVmMatchesInterpreter(code: string): void {
  const { ctx, env, form } = prepareForm(code)
  const ir = tryCompileVmFromIr(form, env, ctx)
  if (!ir.ok) {
    throw new Error(
      `IR compiler fell back for: ${code} (${ir.reason.category}: ${ir.reason.detail})`
    )
  }
  const vmValue = executeChunk({ chunk: ir.chunk, env, ctx })
  ctx.vmExecutionMode = 'off'
  const interpValue = ctx.evaluate(form, env)
  expect(vmValue).toEqual(interpValue)
}
