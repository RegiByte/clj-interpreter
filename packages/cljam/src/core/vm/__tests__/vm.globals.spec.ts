import { describe, expect, it } from 'vitest'
import { addConstant, emit, emitOperand, makeChunk } from '../chunk'
import { define, internVar, makeEnv, makeNamespace } from '../../env'
import { createEvaluationContext } from '../../evaluator'
import { EvaluationError } from '../../errors'
import { v } from '../../factories'
import type { Pos } from '../../types'
import { Op } from '../opcodes'
import { executeChunk } from '../vm'

describe('VM global opcodes', () => {
  it('executes LoadGlobal from env binding', () => {
    const chunk = makeChunk('load-global-test')
    const index = addConstant(chunk, v.symbol('x'))

    emit(chunk, Op.LoadGlobal)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const env = makeEnv()
    define('x', v.number(42), env)

    expect(
      executeChunk({ chunk, env, ctx: createEvaluationContext() })
    ).toEqual(v.number(42))
  })

  it('executes LoadGlobal from namespace vars', () => {
    const chunk = makeChunk('load-global-ns-test')
    const index = addConstant(chunk, v.symbol('x'))

    emit(chunk, Op.LoadGlobal)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const env = makeEnv()
    env.ns = makeNamespace('user')
    internVar('x', v.number(42), env)

    expect(
      executeChunk({ chunk, env, ctx: createEvaluationContext() })
    ).toEqual(v.number(42))
  })

  it('derefs namespace vars at execution time', () => {
    const chunk = makeChunk('load-global-var-rederef-test')
    const index = addConstant(chunk, v.symbol('x'))

    emit(chunk, Op.LoadGlobal)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const env = makeEnv()
    env.ns = makeNamespace('user')
    internVar('x', v.number(1), env)

    internVar('x', v.number(2), env)

    expect(
      executeChunk({ chunk, env, ctx: createEvaluationContext() })
    ).toEqual(v.number(2))
  })

  it('throws for missing globals', () => {
    const chunk = makeChunk('missing-global-test')
    const index = addConstant(chunk, v.symbol('missing'))

    emit(chunk, Op.LoadGlobal)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    expect(() =>
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)
  })

  it.each([
    ['full namespace name', 'source.ns/answer'],
    ['alias from current namespace', 'src/answer'],
  ])('executes LoadQualified using %s', (_label, symbolName) => {
    const chunk = makeChunk('load-qualified-test')
    const index = addConstant(chunk, v.symbol(symbolName))

    emit(chunk, Op.LoadQualified)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const sourceNs = makeNamespace('source.ns')
    sourceNs.vars.set('answer', v.var('source.ns', 'answer', v.number(42)))

    const env = makeEnv()
    env.ns = makeNamespace('consumer.ns')
    env.ns.aliases.set('src', sourceNs)

    const ctx = createEvaluationContext()
    ctx.resolveNs = (name) => (name === 'source.ns' ? sourceNs : null)

    expect(executeChunk({ chunk, env, ctx })).toEqual(v.number(42))
  })

  it('derefs qualified vars at execution time', () => {
    const chunk = makeChunk('load-qualified-rederef-test')
    const index = addConstant(chunk, v.symbol('source.ns/answer'))

    emit(chunk, Op.LoadQualified)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const sourceNs = makeNamespace('source.ns')
    const answer = v.var('source.ns', 'answer', v.number(1))
    sourceNs.vars.set('answer', answer)

    const ctx = createEvaluationContext()
    ctx.resolveNs = (name) => (name === 'source.ns' ? sourceNs : null)

    expect(executeChunk({ chunk, env: makeEnv(), ctx })).toEqual(v.number(1))

    answer.value = v.number(2)

    expect(executeChunk({ chunk, env: makeEnv(), ctx })).toEqual(v.number(2))
  })

  it('respects dynamic binding stacks for qualified vars', () => {
    const chunk = makeChunk('load-qualified-dynamic-test')
    const index = addConstant(chunk, v.symbol('source.ns/*answer*'))

    emit(chunk, Op.LoadQualified)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const sourceNs = makeNamespace('source.ns')
    const answer = v.var('source.ns', '*answer*', v.keyword(':root'))
    answer.dynamic = true
    answer.bindingStack = [v.keyword(':bound')]
    sourceNs.vars.set('*answer*', answer)

    const ctx = createEvaluationContext()
    ctx.resolveNs = (name) => (name === 'source.ns' ? sourceNs : null)

    expect(executeChunk({ chunk, env: makeEnv(), ctx })).toEqual(
      v.keyword(':bound')
    )
  })

  it.each([
    [
      'invalid constant index',
      (chunk: ReturnType<typeof makeChunk>) => {
        emit(chunk, Op.LoadQualified)
        emitOperand(chunk, 999)
      },
    ],
    [
      'non-symbol constant',
      (chunk: ReturnType<typeof makeChunk>) => {
        const index = addConstant(chunk, v.number(1))
        emit(chunk, Op.LoadQualified)
        emitOperand(chunk, index)
      },
    ],
    [
      'missing namespace',
      (chunk: ReturnType<typeof makeChunk>) => {
        const index = addConstant(chunk, v.symbol('missing.ns/answer'))
        emit(chunk, Op.LoadQualified)
        emitOperand(chunk, index)
      },
    ],
    [
      'missing var',
      (chunk: ReturnType<typeof makeChunk>) => {
        const index = addConstant(chunk, v.symbol('source.ns/missing'))
        emit(chunk, Op.LoadQualified)
        emitOperand(chunk, index)
      },
    ],
  ])('throws when LoadQualified has %s', (_label, buildChunk) => {
    const chunk = makeChunk('bad-load-qualified-test')
    buildChunk(chunk)
    emit(chunk, Op.Return)

    const sourceNs = makeNamespace('source.ns')
    const ctx = createEvaluationContext()
    ctx.resolveNs = (name) => (name === 'source.ns' ? sourceNs : null)

    expect(() => executeChunk({ chunk, env: makeEnv(), ctx })).toThrow(
      EvaluationError
    )
  })

  it('attaches instruction position to LoadQualified errors', () => {
    const chunk = makeChunk('load-qualified-position-test')
    const pos = { start: 10, end: 27, lineOffset: 0, colOffset: 0 } as Pos
    const index = addConstant(chunk, v.symbol('missing.ns/answer'))

    emit(chunk, Op.LoadQualified, pos)
    emitOperand(chunk, index, pos)
    emit(chunk, Op.Return)

    let err: EvaluationError | undefined
    try {
      executeChunk({ chunk, env: makeEnv(), ctx: createEvaluationContext() })
    } catch (e) {
      if (e instanceof EvaluationError) err = e
    }

    expect(err).toBeDefined()
    expect(err!.pos).toBe(pos)
  })
})
