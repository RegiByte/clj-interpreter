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

  it('does not cache plain env bindings as namespace vars', () => {
    const chunk = makeChunk('load-global-env-binding-cache-test')
    const index = addConstant(chunk, v.symbol('x'))

    emit(chunk, Op.LoadGlobal)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const firstEnv = makeEnv()
    define('x', v.number(1), firstEnv)

    const secondEnv = makeEnv()
    define('x', v.number(2), secondEnv)

    expect(
      executeChunk({ chunk, env: firstEnv, ctx: createEvaluationContext() })
    ).toEqual(v.number(1))
    expect(
      executeChunk({ chunk, env: secondEnv, ctx: createEvaluationContext() })
    ).toEqual(v.number(2))
  })

  it('does not reuse cached vars across different namespace objects', () => {
    const chunk = makeChunk('load-global-namespace-object-cache-test')
    const index = addConstant(chunk, v.symbol('x'))

    emit(chunk, Op.LoadGlobal)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const firstEnv = makeEnv()
    firstEnv.ns = makeNamespace('user')
    internVar('x', v.number(1), firstEnv)

    const secondEnv = makeEnv()
    secondEnv.ns = makeNamespace('user')
    internVar('x', v.number(2), secondEnv)

    expect(
      executeChunk({ chunk, env: firstEnv, ctx: createEvaluationContext() })
    ).toEqual(v.number(1))
    expect(
      executeChunk({ chunk, env: secondEnv, ctx: createEvaluationContext() })
    ).toEqual(v.number(2))
  })

  it('does not negatively cache missing globals', () => {
    const chunk = makeChunk('load-global-missing-cache-test')
    const index = addConstant(chunk, v.symbol('x'))

    emit(chunk, Op.LoadGlobal)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const env = makeEnv()
    env.ns = makeNamespace('user')

    expect(() =>
      executeChunk({ chunk, env, ctx: createEvaluationContext() })
    ).toThrow(EvaluationError)

    internVar('x', v.number(42), env)

    expect(
      executeChunk({ chunk, env, ctx: createEvaluationContext() })
    ).toEqual(v.number(42))
  })

  it('respects dynamic binding stacks for cached globals', () => {
    const chunk = makeChunk('load-global-dynamic-cache-test')
    const index = addConstant(chunk, v.symbol('*answer*'))

    emit(chunk, Op.LoadGlobal)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const env = makeEnv()
    env.ns = makeNamespace('user')
    internVar('*answer*', v.keyword(':root'), env)
    const answer = env.ns.vars.get('*answer*')!
    answer.dynamic = true

    expect(
      executeChunk({ chunk, env, ctx: createEvaluationContext() })
    ).toEqual(v.keyword(':root'))

    answer.bindingStack = [v.keyword(':bound')]

    expect(
      executeChunk({ chunk, env, ctx: createEvaluationContext() })
    ).toEqual(v.keyword(':bound'))
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

  it('executes LoadVar for unqualified namespace vars', () => {
    const chunk = makeChunk('load-var-test')
    const index = addConstant(chunk, v.symbol('x'))

    emit(chunk, Op.LoadVar)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const env = makeEnv()
    env.ns = makeNamespace('user')
    internVar('x', v.number(42), env)

    const result = executeChunk({ chunk, env, ctx: createEvaluationContext() })

    expect(result.kind).toBe('var')
    expect((result as any).ns).toBe('user')
    expect((result as any).name).toBe('x')
    expect((result as any).value).toEqual(v.number(42))
  })

  it.each([
    ['full namespace name', 'source.ns/answer'],
    ['alias from current namespace', 'src/answer'],
  ])('executes LoadVar for qualified vars using %s', (_label, symbolName) => {
    const chunk = makeChunk('load-qualified-var-test')
    const index = addConstant(chunk, v.symbol(symbolName))

    emit(chunk, Op.LoadVar)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const sourceNs = makeNamespace('source.ns')
    const answer = v.var('source.ns', 'answer', v.number(42))
    sourceNs.vars.set('answer', answer)

    const env = makeEnv()
    env.ns = makeNamespace('consumer.ns')
    env.ns.aliases.set('src', sourceNs)

    const ctx = createEvaluationContext()
    ctx.resolveNs = (name) => (name === 'source.ns' ? sourceNs : null)

    expect(executeChunk({ chunk, env, ctx })).toBe(answer)
  })

  it('executes LoadLexicalVar from a local var candidate', () => {
    const chunk = makeChunk('load-lexical-var-test')
    const target = v.var('user', 'x', v.number(42))
    chunk.lexicalVarLookups.push({
      symbol: v.symbol('x'),
      candidates: [{ kind: 'local', slot: 0 }],
    })

    emit(chunk, Op.LoadLexicalVar)
    emitOperand(chunk, 0)
    emit(chunk, Op.Return)

    expect(
      executeChunk({
        chunk,
        env: makeEnv(),
        ctx: createEvaluationContext(),
        locals: [target],
      })
    ).toBe(target)
  })

  it('executes LoadLexicalVar using nearest-to-outermost candidates', () => {
    const chunk = makeChunk('load-lexical-var-chain-test')
    const target = v.var('user', 'x', v.number(42))
    chunk.lexicalVarLookups.push({
      symbol: v.symbol('x'),
      candidates: [
        { kind: 'local', slot: 1 },
        { kind: 'local', slot: 0 },
      ],
    })

    emit(chunk, Op.LoadLexicalVar)
    emitOperand(chunk, 0)
    emit(chunk, Op.Return)

    expect(
      executeChunk({
        chunk,
        env: makeEnv(),
        ctx: createEvaluationContext(),
        locals: [target, v.keyword(':not-var')],
      })
    ).toBe(target)
  })

  it('executes LoadLexicalVar fallback through namespace vars', () => {
    const chunk = makeChunk('load-lexical-var-fallback-test')
    chunk.lexicalVarLookups.push({
      symbol: v.symbol('x'),
      candidates: [{ kind: 'local', slot: 0 }],
    })

    emit(chunk, Op.LoadLexicalVar)
    emitOperand(chunk, 0)
    emit(chunk, Op.Return)

    const env = makeEnv()
    env.ns = makeNamespace('user')
    const target = v.var('user', 'x', v.number(42))
    env.ns.vars.set('x', target)

    expect(
      executeChunk({
        chunk,
        env,
        ctx: createEvaluationContext(),
        locals: [v.keyword(':not-var')],
      })
    ).toBe(target)
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

  it.each([
    [
      'missing namespace',
      v.symbol('missing.ns/answer'),
      'No such namespace: missing.ns',
    ],
    [
      'missing qualified var',
      v.symbol('source.ns/missing'),
      'Var source.ns/missing not found',
    ],
    [
      'missing unqualified var',
      v.symbol('missing'),
      'Unable to resolve var: missing in this context',
    ],
    ['non-symbol target', v.number(1), 'var expects a symbol'],
  ])('throws when LoadVar has %s', (_label, target, message) => {
    const chunk = makeChunk('bad-load-var-test')
    const index = addConstant(chunk, target)

    emit(chunk, Op.LoadVar)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    const sourceNs = makeNamespace('source.ns')
    const ctx = createEvaluationContext()
    ctx.resolveNs = (name) => (name === 'source.ns' ? sourceNs : null)

    expect(() => executeChunk({ chunk, env: makeEnv(), ctx })).toThrow(message)
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
