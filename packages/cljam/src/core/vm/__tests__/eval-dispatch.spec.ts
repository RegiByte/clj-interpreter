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

  it('reports a structured fallback reason before failing in vm-required mode', () => {
    const ctx = createEvaluationContext()
    const env = makeCallTestEnv()
    const events: EvalEvent[] = []
    const node = formToNode('(let* [[x] [1]] x)')

    ctx.vmExecutionMode = 'vm-required'
    ctx.instrumentation = { onEvent: (event) => events.push(event) }

    expect(() => ctx.evaluate(node, env)).toThrow(
      'VM required but cannot compile: VM only supports simple symbol bindings in let*'
    )
    expect(events[0]).toMatchObject({
      path: 'fallback',
      mode: 'vm-required',
      formKind: 'list:let*',
      reason: {
        category: 'unsupported-binding-form',
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

  it('executes supported public session forms through top-level VM by default', () => {
    const events: EvalEvent[] = []
    const session = createSession({
      instrumentation: { onEvent: (event) => events.push(event) },
    })

    events.length = 0

    expect(session.evaluate('(+ 1 2)')).toEqual(v.number(3))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'vm:top-level',
          mode: 'opportunistic',
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

  it('falls back cleanly for unsupported public session forms by default', () => {
    const events: EvalEvent[] = []
    const session = createSession({
      hostBindings: { Math },
      instrumentation: { onEvent: (event) => events.push(event) },
    })

    events.length = 0

    expect(session.evaluate('(. js/Math pow 2 3)')).toEqual(v.number(8))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'fallback',
          mode: 'opportunistic',
          reason: expect.objectContaining({
            category: 'unsupported-js-interop',
          }),
        }),
      ])
    )
  })

  it('keeps public session vm-required failures loud and structured', () => {
    const baseline = snapshotSession(createSession())
    const events: EvalEvent[] = []
    const session = createSessionFromSnapshot(baseline, {
      vmExecutionMode: 'vm-required',
      instrumentation: { onEvent: (event) => events.push(event) },
    })

    events.length = 0

    expect(() => session.evaluate('(let* [[x] [1]] x)')).toThrow(
      'VM required but cannot compile: VM only supports simple symbol bindings in let*'
    )
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'fallback',
          mode: 'vm-required',
          reason: expect.objectContaining({
            category: 'unsupported-binding-form',
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
