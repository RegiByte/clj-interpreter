import { expect } from 'vitest'
import { define, makeEnv } from '../../env'
import { EvaluationError } from '../../errors'
import { createEvaluationContext } from '../../evaluator'
import { hofFunctions } from '../../modules/core/stdlib/hof'
import { v } from '../../factories'
import { printString } from '../../printer'
import { readForms } from '../../reader'
import { createSession } from '../../session'
import { tokenize } from '../../tokenizer'
import type { CljSymbol, CljValue, VmChunk, VmCompileResult } from '../../types'
import { tryCompileVmFnBodyFromIr, tryCompileVmFromIr } from '../ir-compiler'
import { executeChunk } from '../vm'

export const formToNode = (code: string) =>
  readForms(tokenize(code), 'user', new Map())[0] as CljValue

/**
 * Bare-form compile helpers over the live ir-compiler. Analysis runs against
 * an empty env, so free symbols stay runtime-resolved (LoadGlobal /
 * LoadQualified) — the same contract the legacy compiler's form-only
 * signature provided.
 */
export function tryCompileVm(node: CljValue): VmCompileResult {
  return tryCompileVmFromIr(node, makeEnv(), createEvaluationContext())
}

export function compileVm(node: CljValue): VmChunk | null {
  const result = tryCompileVm(node)
  return result.ok ? result.chunk : null
}

export function tryCompileVmFnBody(
  params: CljSymbol[],
  restParam: CljSymbol | null,
  body: CljValue[],
  selfName: string | null = null
): VmCompileResult {
  return tryCompileVmFnBodyFromIr(
    params,
    restParam,
    body,
    selfName,
    makeEnv(),
    createEvaluationContext()
  )
}

export function makeCallTestEnv() {
  const env = makeEnv()

  define(
    '+',
    v.nativeFn('+', (...args: CljValue[]) => {
      const total = args.reduce((acc, arg) => {
        if (arg.kind !== 'number') return acc
        return acc + arg.value
      }, 0)
      return v.number(total)
    }),
    env
  )
  define(
    '-',
    v.nativeFn('-', (a: CljValue, b: CljValue) => {
      if (a.kind !== 'number' || b.kind !== 'number') return v.nil()
      return v.number(a.value - b.value)
    }),
    env
  )
  define(
    '*',
    v.nativeFn('*', (...args: CljValue[]) => {
      const total = args.reduce((acc, arg) => {
        if (arg.kind !== 'number') return acc
        return acc * arg.value
      }, 1)
      return v.number(total)
    }),
    env
  )
  define(
    '=',
    v.nativeFn('=', (...args: CljValue[]) => {
      if (args.length < 2) return v.boolean(true)
      const first = printString(args[0])
      return v.boolean(args.every((arg) => printString(arg) === first))
    }),
    env
  )
  define(
    'truthy?',
    v.nativeFn('truthy?', (value: CljValue) => v.boolean(value.kind !== 'nil')),
    env
  )
  define(
    'forty-two',
    v.nativeFn('forty-two', () => v.number(42)),
    env
  )
  define('apply', hofFunctions.apply, env)

  return env
}

export function expectVmCompilesTo(code: string, expected: unknown) {
  const node = formToNode(code)
  const chunk = compileVm(node)

  expect(chunk).not.toBeNull()
  if (chunk === null) return

  const result = executeChunk({
    chunk,
    env: makeCallTestEnv(),
    ctx: createEvaluationContext(),
  })
  expect(result).toEqual(expected)
}

export function expectVmCallCompilesTo(code: string, expected: CljValue) {
  const node = formToNode(code)
  const chunk = compileVm(node)

  expect(chunk).not.toBeNull()
  if (chunk === null) return

  const result = executeChunk({
    chunk,
    env: makeCallTestEnv(),
    ctx: createEvaluationContext(),
  })
  expect(result).toEqual(expected)
}

export function compileFnBodyForTest(
  paramNames: string[],
  bodyCode: string[],
  options: {
    restParam?: string | null
    selfName?: string | null
  } = {}
) {
  const result = tryCompileVmFnBody(
    paramNames.map((name) => v.symbol(name)),
    options.restParam === undefined || options.restParam === null
      ? null
      : v.symbol(options.restParam),
    bodyCode.map(formToNode),
    options.selfName ?? null
  )
  return result.ok ? result.chunk : null
}

export function expectVmFnBodyCompilesTo(
  paramNames: string[],
  bodyCode: string[],
  locals: CljValue[],
  expected: CljValue,
  options: {
    restParam?: string | null
    selfName?: string | null
  } = {}
) {
  const chunk = compileFnBodyForTest(paramNames, bodyCode, options)

  expect(chunk).not.toBeNull()
  if (chunk === null) return

  const result = executeChunk({
    chunk,
    env: makeCallTestEnv(),
    ctx: createEvaluationContext(),
    locals,
  })

  expect(result).toEqual(expected)
}

export function expectSessionEvaluationError(code: string): EvaluationError {
  try {
    createSession().evaluate(code)
  } catch (error) {
    expect(error).toBeInstanceOf(EvaluationError)
    return error as EvaluationError
  }
  throw new Error(`Expected EvaluationError for: ${code}`)
}
