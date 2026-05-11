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
import type { CljValue, EvaluationContext } from '../../types'
import { compileVm } from '../compiler'
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

function prepareForm(code: string, session: Session) {
  const ctx = makeTestContext(session)
  const tokens = tokenize(code)
  const declaredNs = extractNsNameFromTokens(tokens)
  if (declaredNs) session.setNs(declaredNs)

  const env = session.runtime.getNamespaceEnv(session.currentNs)
  if (!env) throw new Error(`Missing namespace env: ${session.currentNs}`)

  const aliasMap = extractAliasMapFromTokens(tokens)
  env.ns?.aliases.forEach((ns, alias) => {
    aliasMap.set(alias, ns.name)
  })
  env.ns?.readerAliases.forEach((nsName, alias) => {
    aliasMap.set(alias, nsName)
  })

  const forms = readForms(tokens, session.currentNs, aliasMap, code)
  if (forms.length !== 1) {
    throw new Error(`VM helper expects exactly one form, got ${forms.length}`)
  }

  session.runtime.processNsRequires(forms, env, ctx)
  return {
    ctx,
    env,
    form: ctx.expandAll(forms[0], env),
  }
}

function evaluateWithInterpreter(code: string): CljValue {
  const session = freshSession()
  const { ctx, env, form } = prepareForm(code, session)
  return ctx.evaluate(form, env)
}

function evaluateWithVm(code: string): CljValue {
  const session = freshSession()
  const { ctx, env, form } = prepareForm(code, session)
  const chunk = compileVm(form)

  expect(chunk).not.toBeNull()
  if (chunk === null) throw new Error(`Expected VM compile for: ${code}`)

  return executeChunk({ chunk, env, ctx })
}

function expectThrows(fn: () => unknown): Error {
  try {
    fn()
  } catch (error) {
    if (error instanceof Error) return error
    throw new Error(`Expected Error instance, got ${String(error)}`)
  }
  throw new Error('Expected function to throw')
}

export function expectVmEqualsInterpreter(code: string): void {
  expect(evaluateWithVm(code)).toEqual(evaluateWithInterpreter(code))
}

export function expectVmFallsBack(code: string): void {
  const session = freshSession()
  const { form } = prepareForm(code, session)
  expect(compileVm(form)).toBeNull()
}

export function expectVmThrowsLikeInterpreter(code: string): void {
  const vmError = expectThrows(() => evaluateWithVm(code))
  const interpreterError = expectThrows(() => evaluateWithInterpreter(code))

  expect(vmError.constructor).toBe(interpreterError.constructor)
  expect(vmError.message).toBe(interpreterError.message)
}
