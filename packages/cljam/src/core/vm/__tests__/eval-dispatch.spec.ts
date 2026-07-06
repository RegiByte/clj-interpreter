import { describe, expect, it } from 'vitest'
import { internVar, makeEnv } from '../../env'
import { createEvaluationContext } from '../../evaluator'
import { v } from '../../factories'
import { createSession, createSessionFromSnapshot, snapshotSession } from '../../session'
import type { Env, EvalEvent } from '../../types'
import { formToNode, makeCallTestEnv } from './compiler-test-utils'

function makeNamespaceEnv(): Env {
  const env = makeEnv()
  env.ns = v.namespace('user')
  internVar(
    '+',
    v.nativeFn('+', (...args) =>
      v.number(
        args.reduce((sum, arg) => sum + (arg.kind === 'number' ? arg.value : 0), 0)
      )
    ),
    env
  )
  return env
}

describe('VM evaluation dispatch instrumentation', () => {
  it('executes a supported outer form through top-level VM in opportunistic mode', () => {
    const ctx = createEvaluationContext()
    const env = makeCallTestEnv()
    const events: EvalEvent[] = []
    const node = formToNode('(+ 1 2)')

    ctx.vmExecutionMode = 'opportunistic'
    ctx.instrumentation = { onEvent: (event) => events.push(event) }

    expect(ctx.evaluate(node, env)).toEqual(v.number(3))
    expect(events[0]).toMatchObject({
      path: 'vm:top-level',
      mode: 'opportunistic',
      formKind: 'list:+',
    })
    expect(events[0].ast).toBe(node)
  })

  it('reports a structured analyzer error before failing in vm-required mode', () => {
    const ctx = createEvaluationContext()
    const env = makeCallTestEnv()
    const events: EvalEvent[] = []
    const node = formToNode('(let* [[x] [1]] x)')

    ctx.vmExecutionMode = 'vm-required'
    ctx.instrumentation = { onEvent: (event) => events.push(event) }

    let thrown: unknown
    try {
      ctx.evaluate(node, env)
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(Error)
    expect((thrown as Error).message).toContain(
      'let* only supports simple symbol bindings; use let for destructuring'
    )
    expect((thrown as { code?: string }).code).toBe(
      'malformed/let-binding-symbol'
    )
    expect(events[0]).toMatchObject({
      path: 'analyzer-error',
      mode: 'vm-required',
      formKind: 'list:let*',
      reason: {
        category: 'compile-error',
      },
    })
    expect(events[0].ast).toBe(node)
  })

  it('emits bytecode function-body events in function-body mode', () => {
    const ctx = createEvaluationContext()
    const env = makeNamespaceEnv()
    const events: EvalEvent[] = []

    ctx.vmExecutionMode = 'function-body'
    ctx.instrumentation = { onEvent: (event) => events.push(event) }

    expect(ctx.evaluate(formToNode('((fn* [x] (+ x 1)) 2)'), env)).toEqual(
      v.number(3)
    )
    expect(events.some((event) => event.path === 'vm:function-body')).toBe(true)
  })

  it('can observe function-body bytecode compilation during session bootstrap', () => {
    const events: EvalEvent[] = []

    createSession({
      vmExecutionMode: 'function-body',
      instrumentation: { onEvent: (event) => events.push(event) },
    })

    expect(
      events.some((event) => event.path === 'vm:function-body-compiled')
    ).toBe(true)
  })

  it('executes supported public session forms through the AST walker by default', () => {
    const events: EvalEvent[] = []
    const session = createSession({
      instrumentation: { onEvent: (event) => events.push(event) },
    })

    events.length = 0

    expect(session.evaluate('(+ 1 2)')).toEqual(v.number(3))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'ast:top-level',
          mode: 'off',
          formKind: 'list:+',
        }),
      ])
    )
  })

  it('keeps explicit public session VM off mode interpreter-only', () => {
    const events: EvalEvent[] = []
    const session = createSession({
      vmExecutionMode: 'off',
      instrumentation: { onEvent: (event) => events.push(event) },
    })

    events.length = 0

    expect(session.evaluate('(+ 1 2)')).toEqual(v.number(3))
    expect(events.some((event) => event.path === 'vm:top-level')).toBe(false)
    expect(events.some((event) => event.path === 'vm:function-body')).toBe(false)
  })

  it('walks (ns …) by default — no public session form falls back (Phase 4 S1)', () => {
    // Until Phase 4 S1, (ns …) was the canonical fallback specimen — the last
    // form-walker-owned head. It is now a real analyzer op, so the default
    // mode has NO public form left that falls back.
    const events: EvalEvent[] = []
    const session = createSession({
      instrumentation: { onEvent: (event) => events.push(event) },
    })

    events.length = 0

    expect(session.evaluate('(ns fallback.test)')).toEqual(v.nil())
    expect(events.some((event) => event.path === 'fallback')).toBe(false)
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'ast:top-level',
          formKind: 'list:ns',
        }),
      ])
    )
  })

  it('keeps public session vm-required analyzer failures loud and structured', () => {
    const baseline = snapshotSession(createSession())
    const events: EvalEvent[] = []
    const session = createSessionFromSnapshot(baseline, {
      vmExecutionMode: 'vm-required',
      instrumentation: { onEvent: (event) => events.push(event) },
    })

    events.length = 0

    let thrown: unknown
    try {
      session.evaluate('(let* [[x] [1]] x)')
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(Error)
    expect((thrown as Error).message).toContain(
      'let* only supports simple symbol bindings; use let for destructuring'
    )
    expect((thrown as { code?: string }).code).toBe(
      'malformed/let-binding-symbol'
    )
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'analyzer-error',
          mode: 'vm-required',
          reason: expect.objectContaining({
            category: 'compile-error',
          }),
        }),
      ])
    )
  })

  it('does not execute bytecode function bodies when VM mode is off', () => {
    const ctx = createEvaluationContext()
    const env = makeNamespaceEnv()
    const events: EvalEvent[] = []

    ctx.vmExecutionMode = 'off'
    ctx.instrumentation = { onEvent: (event) => events.push(event) }

    expect(ctx.evaluate(formToNode('((fn* [x] (+ x 1)) 2)'), env)).toEqual(
      v.number(3)
    )
    expect(events.some((event) => event.path === 'vm:function-body')).toBe(false)
  })
})
