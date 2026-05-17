import { describe, expect, it } from 'vitest'
import { define, makeEnv } from '../../env'
import { createEvaluationContext } from '../../evaluator'
import { v } from '../../factories'
import {
  createSession,
  createSessionFromSnapshot,
  snapshotSession,
} from '../../session'
import { compileVm, tryCompileVm } from '../compiler'
import { disassembleChunk } from '../debug'
import { executeChunk } from '../vm'
import {
  expectVmCompilesTo,
  formToNode,
  makeCallTestEnv,
} from './compiler-test-utils'

function createVmRequiredSession() {
  return createSessionFromSnapshot(snapshotSession(createSession()), {
    vmExecutionMode: 'vm-required',
  })
}

describe('VM compiler literals', () => {
  it.each([
    ['42', v.number(42)],
    ['"hello"', v.string('hello')],
    ['\\a', v.char('a')],
    [':ok', v.keyword(':ok')],
    ['nil', v.nil()],
    ['true', v.boolean(true)],
    ['false', v.boolean(false)],
    ['#"abc"', v.regex('abc', '')],
  ])('compiles and executes %s', (code, expected) => {
    expectVmCompilesTo(code, expected)
  })

  it('emits Constant plus Return for numbers', () => {
    const chunk = compileVm(formToNode('42'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      ['== vm-expression ==', '0000 Constant 0 ; 42', '0002 Return'].join('\n')
    )
  })

  it('emits True plus Return for true', () => {
    const chunk = compileVm(formToNode('true'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      ['== vm-expression ==', '0000 True', '0001 Return'].join('\n')
    )
  })

  it('compiles quote as a literal constant at the expression boundary', () => {
    expectVmCompilesTo('(quote &)', v.symbol('&'))
    expectVmCompilesTo('(quote [a b])', v.vector([v.symbol('a'), v.symbol('b')]))
  })

  it('compiles var as an explicit var load', () => {
    const chunk = compileVm(formToNode('(var x)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      ['== vm-expression ==', '0000 LoadVar 0 ; x', '0002 Return'].join('\n')
    )
  })

  it('preserves nested structured fallback reasons from child emitters', () => {
    const result = tryCompileVm(formToNode('[(async 1)]'))

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toEqual({
      category: 'unsupported-special-form',
      detail: 'VM does not support special form async',
    })
  })
})

describe('VM Symbols', () => {
  it('compiles def as initializer plus Def', () => {
    const chunk = compileVm(formToNode('(def x 1)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-expression ==',
        '0000 Constant 0 ; 1',
        '0002 Def 1 ; x',
        '0004 Return',
      ].join('\n')
    )
  })

  it('executes compiled def and returns the interned Var', () => {
    const chunk = compileVm(formToNode('(def x 1)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const env = makeEnv()
    env.ns = v.namespace('user')
    const result = executeChunk({ chunk, env, ctx: createEvaluationContext() })

    expect(result.kind).toBe('var')
    expect(result).toBe(env.ns.vars.get('x'))
    expect(env.ns.vars.get('x')?.value).toEqual(v.number(1))
  })

  it('compiled def docstring is attached to the returned Var metadata', () => {
    const s = createVmRequiredSession()
    const result = s.evaluate('(meta (def x "doc text" 1))')

    expect((s.evaluate('(:doc (meta #\'x))') as any).value).toBe('doc text')
    expect((result as any).entries).toContainEqual([
      v.keyword(':doc'),
      v.string('doc text'),
    ])
  })

  it('var-get can consume def in vm-required mode', () => {
    const s = createVmRequiredSession()

    expect((s.evaluate('(var-get (def x 1))') as any).value).toBe(1)
  })

  it('compiled redef preserves Var identity', () => {
    const s = createVmRequiredSession()
    const original = s.evaluate('(def x 1)')
    const redefined = s.evaluate('(def x 2)')

    expect(redefined).toBe(original)
    expect(s.evaluate('#\'x')).toBe(original)
    expect((s.evaluate('x') as any).value).toBe(2)
  })

  it('compiles bare def declarations as nil no-ops', () => {
    const chunk = compileVm(formToNode('(def native-shim)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      ['== vm-expression ==', '0000 Nil', '0001 Return'].join('\n')
    )
  })

  it('executes compiled bare def without interning a Var', () => {
    const chunk = compileVm(formToNode('(def native-shim)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const env = makeEnv()
    env.ns = v.namespace('user')
    const result = executeChunk({ chunk, env, ctx: createEvaluationContext() })

    expect(result).toEqual(v.nil())
    expect(env.ns.vars.has('native-shim')).toBe(false)
  })

  it('compiles unqualified symbols to LoadGlobal plus Return', () => {
    const chunk = compileVm(formToNode('x'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      ['== vm-expression ==', '0000 LoadGlobal 0 ; x', '0002 Return'].join('\n')
    )
  })
  it('executes compiled unqualified symbol reads', () => {
    const node = formToNode('x')
    const chunk = compileVm(node)

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const env = makeEnv()
    define('x', v.number(42), env)

    expect(
      executeChunk({ chunk, env, ctx: createEvaluationContext() })
    ).toEqual(v.number(42))
  })

  it('executes compiled var loads without derefing the namespace var', () => {
    const node = formToNode('(var x)')
    const chunk = compileVm(node)

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const env = makeEnv()
    env.ns = v.namespace('user')
    const target = v.var('user', 'x', v.number(42))
    env.ns.vars.set('x', target)

    expect(executeChunk({ chunk, env, ctx: createEvaluationContext() })).toBe(
      target
    )
  })

  it.each([
    ['foo/bar', 'foo/bar'],
    ['clojure.core/+', 'clojure.core/+'],
  ])(
    'compiles qualified symbol %s to LoadQualified plus Return',
    (code, rendered) => {
      const chunk = compileVm(formToNode(code))

      expect(chunk).not.toBeNull()
      if (chunk === null) return

      expect(disassembleChunk(chunk)).toBe(
        [
          '== vm-expression ==',
          `0000 LoadQualified 0 ; ${rendered}`,
          '0002 Return',
        ].join('\n')
      )
    }
  )

  it.each([
    ['full namespace name', 'source.ns/answer'],
    ['alias-qualified name', 'src/answer'],
  ])('executes compiled qualified symbol reads via %s', (_label, code) => {
    const chunk = compileVm(formToNode(code))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const sourceNs = v.namespace('source.ns')
    sourceNs.vars.set('answer', v.var('source.ns', 'answer', v.number(42)))

    const env = makeEnv()
    env.ns = v.namespace('consumer.ns')
    env.ns.aliases.set('src', sourceNs)

    const ctx = createEvaluationContext()
    ctx.resolveNs = (name) => (name === 'source.ns' ? sourceNs : null)

    expect(executeChunk({ chunk, env, ctx })).toEqual(v.number(42))
  })

  it('compiled qualified reads see later root redefinition', () => {
    const chunk = compileVm(formToNode('source.ns/answer'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const sourceNs = v.namespace('source.ns')
    const answer = v.var('source.ns', 'answer', v.number(1))
    sourceNs.vars.set('answer', answer)

    const ctx = createEvaluationContext()
    ctx.resolveNs = (name) => (name === 'source.ns' ? sourceNs : null)

    expect(executeChunk({ chunk, env: makeEnv(), ctx })).toEqual(v.number(1))

    answer.value = v.number(2)

    expect(executeChunk({ chunk, env: makeEnv(), ctx })).toEqual(v.number(2))
  })

  it('compiles qualified symbols inside calls and collections', () => {
    const sourceNs = v.namespace('source.ns')
    sourceNs.vars.set('answer', v.var('source.ns', 'answer', v.number(40)))

    const env = makeCallTestEnv()
    env.ns = v.namespace('consumer.ns')
    env.ns.aliases.set('src', sourceNs)

    const ctx = createEvaluationContext()
    ctx.resolveNs = (name) => (name === 'source.ns' ? sourceNs : null)

    const chunk = compileVm(formToNode('[(+ src/answer 2) source.ns/answer]'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(executeChunk({ chunk, env, ctx })).toEqual(
      v.vector([v.number(42), v.number(40)])
    )
  })

  it.each(['js/Math.pow', 'js/console.log', 'foo/bar.baz'])(
    'compiles dotted qualified symbol %s',
    (code) => {
      expect(compileVm(formToNode(code))).not.toBeNull()
    }
  )

  it('compiles qualified var loads and preserves alias resolution at runtime', () => {
    const chunk = compileVm(formToNode('(var src/answer)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const sourceNs = v.namespace('source.ns')
    const answer = v.var('source.ns', 'answer', v.number(42))
    sourceNs.vars.set('answer', answer)

    const env = makeEnv()
    env.ns = v.namespace('consumer.ns')
    env.ns.aliases.set('src', sourceNs)

    expect(
      executeChunk({ chunk, env, ctx: createEvaluationContext() })
    ).toBe(answer)
  })

  it('executes lexical var loads for local var values', () => {
    const result = createSession().evaluate('(let [f (var +)] (var f))')

    expect(result.kind).toBe('var')
    expect((result as any).ns).toBe('clojure.core')
    expect((result as any).name).toBe('+')
  })

  it('executes lexical var loads for function params', () => {
    const result = createSession().evaluate('((fn [f] (var f)) (var +))')

    expect(result.kind).toBe('var')
    expect((result as any).ns).toBe('clojure.core')
    expect((result as any).name).toBe('+')
  })

  it('falls through local non-var values to namespace vars', () => {
    const session = createSession()
    session.evaluate('(def x 42)')

    const result = session.evaluate('(let [x :not-var] (var x))')

    expect(result.kind).toBe('var')
    expect((result as any).ns).toBe('user')
    expect((result as any).name).toBe('x')
  })

  it('errors when lexical non-var values do not resolve to any var', () => {
    expect(() =>
      createSession().evaluate('(let [x :not-var] (var x))')
    ).toThrow('Unable to resolve var: x in this context')
  })

  it('falls through inner non-var shadowing to an outer var candidate', () => {
    const result = createSession().evaluate(
      '(let [x (var +)] (let [x :not-var] (var x)))'
    )

    expect(result.kind).toBe('var')
    expect((result as any).ns).toBe('clojure.core')
    expect((result as any).name).toBe('+')
  })

  it('executes lexical var loads through captured upvalues', () => {
    const result = createSession().evaluate(
      '(let [x (var +)] ((fn [] (var x))))'
    )

    expect(result.kind).toBe('var')
    expect((result as any).ns).toBe('clojure.core')
    expect((result as any).name).toBe('+')
  })
})
