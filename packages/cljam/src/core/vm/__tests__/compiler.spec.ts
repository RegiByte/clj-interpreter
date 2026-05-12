import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { tokenize } from '../../tokenizer'
import { readForms } from '../../reader'
import type { CljValue } from '../../types'
import { executeChunk } from '../vm'
import { define, makeEnv } from '../../env'
import { createEvaluationContext } from '../../evaluator'
import { applyFunctionWithContext } from '../../evaluator/apply'
import { createSession } from '../../session'
import { compileVm, compileVmFnBody } from '../compiler'
import { disassembleChunk } from '../debug'
import { Op } from '../opcodes'
import { jsToClj } from '../../conversions'
import { printString } from '../../printer'
import { hofFunctions } from '../../modules/core/stdlib/hof'
import {
  expectVmEqualsInterpreter,
  expectVmFallsBack,
  expectVmThrowsLikeInterpreter,
} from './helpers'

const formToNode = (code: string) =>
  readForms(tokenize(code), 'user', new Map())[0] as CljValue

function makeCallTestEnv() {
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

function expectVmCompilesTo(code: string, expected: unknown) {
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

function expectVmCallCompilesTo(code: string, expected: CljValue) {
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

function compileFnBodyForTest(
  paramNames: string[],
  bodyCode: string[],
  options: {
    restParam?: string | null
  } = {}
) {
  return compileVmFnBody(
    paramNames.map((name) => v.symbol(name)),
    options.restParam === undefined || options.restParam === null
      ? null
      : v.symbol(options.restParam),
    bodyCode.map(formToNode)
  )
}

function expectVmFnBodyCompilesTo(
  paramNames: string[],
  bodyCode: string[],
  locals: CljValue[],
  expected: CljValue
) {
  const chunk = compileFnBodyForTest(paramNames, bodyCode)

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

describe('VM compiler equivalence helpers', () => {
  it.each([
    '42',
    '"hello"',
    ':ok',
    'nil',
    'true',
    'false',
    '(do 1 2 3)',
    '(if true 1 2)',
    '[1 (+ 2 3)]',
    '{:a 1 :b (+ 2 3)}',
    '#{1 (+ 1 2)}',
  ])('matches interpreter result for %s', (code) => {
    expectVmEqualsInterpreter(code)
  })

  it.each(['js/Math.pow', '([1 2] 0)', '(if true 1 2 3)'])(
    'expects VM fallback for %s',
    (code) => {
      expectVmFallsBack(code)
    }
  )

  it.each(['missing', '(+ missing 1)', 'source.ns/missing'])(
    'throws like the interpreter for %s',
    (code) => {
      expectVmThrowsLikeInterpreter(code)
    }
  )
})

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
})

describe('VM Symbols', () => {
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
    'still falls back for dotted qualified symbol %s',
    (code) => {
      expect(compileVm(formToNode(code))).toBeNull()
    }
  )
})

describe('VM function body compilation', () => {
  it('compiles a parameter reference to LoadLocal', () => {
    const chunk = compileFnBodyForTest(['x'], ['x'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(1)
    expect(disassembleChunk(chunk)).toBe(
      ['== vm-fn-body ==', '0000 LoadLocal 0', '0002 Return'].join('\n')
    )
  })

  it('executes a compiled parameter reference', () => {
    expectVmFnBodyCompilesTo(['x'], ['x'], [v.number(42)], v.number(42))
  })

  it('resolves each parameter to its own local slot', () => {
    const chunk = compileFnBodyForTest(['x', 'y'], ['y'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(2)
    expect(disassembleChunk(chunk)).toBe(
      ['== vm-fn-body ==', '0000 LoadLocal 1', '0002 Return'].join('\n')
    )

    expect(
      executeChunk({
        chunk,
        env: makeCallTestEnv(),
        ctx: createEvaluationContext(),
        locals: [v.number(10), v.number(20)],
      })
    ).toEqual(v.number(20))
  })

  it('compiles calls that read parameter locals', () => {
    const chunk = compileFnBodyForTest(['x'], ['(+ x 2)'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 LoadLocal 0',
        '0002 Constant 0 ; 2',
        '0004 Add 2',
        '0006 Return',
      ].join('\n')
    )

    expect(
      executeChunk({
        chunk,
        env: makeCallTestEnv(),
        ctx: createEvaluationContext(),
        locals: [v.number(40)],
      })
    ).toEqual(v.number(42))
  })

  it('compiles multi-form function bodies with Pop between forms', () => {
    const chunk = compileFnBodyForTest(['x'], ['(+ x 1)', '(+ x 2)'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 LoadLocal 0',
        '0002 Constant 0 ; 1',
        '0004 Add 2',
        '0006 Pop',
        '0007 LoadLocal 0',
        '0009 Constant 1 ; 2',
        '0011 Add 2',
        '0013 Return',
      ].join('\n')
    )

    expect(
      executeChunk({
        chunk,
        env: makeCallTestEnv(),
        ctx: createEvaluationContext(),
        locals: [v.number(40)],
      })
    ).toEqual(v.number(42))
  })

  it.each([
    ['def', '(def y x)'],
    ['try', '(try x (catch :default e e))'],
    ['binding', '(binding [*out* *out*] x)'],
    ['set!', '(set! *out* x)'],
    ['quote', '(quote x)'],
    ['var', '(var x)'],
    ['lazy-seq', '(lazy-seq x)'],
    ['async', '(async x)'],
    ['JS interop dot', '(. x foo)'],
    ['JS constructor interop', '(js/new Date)'],
    ['ns', '(ns demo.vm-test)'],
    ['defmacro', '(defmacro m [] x)'],
    ['letfn*', '(letfn* [f (fn* [] x)] (f))'],
  ])(
    'falls back when a function body contains unsupported %s',
    (_label, code) => {
      expect(compileFnBodyForTest(['x'], [code])).toBeNull()
    }
  )

  it('compiles nested non-capturing fn* to Closure', () => {
    const chunk = compileFnBodyForTest([], ['(fn* [y] (+ y 1))'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.innerFunctions).toHaveLength(1)
    expect(chunk.innerFunctions[0].upvalueDescriptors).toEqual([])
    expect(chunk.innerFunctions[0].arities[0].chunk.localCount).toBe(1)
    expect(disassembleChunk(chunk)).toBe(
      ['== vm-fn-body ==', '0000 Closure 0', '0002 Return'].join('\n')
    )
  })

  it('compiles and executes calls to nested non-capturing fn*', () => {
    expect(
      createSession().evaluate('((fn [x] ((fn* [y] (+ y 1)) x)) 41)')
    ).toEqual(v.number(42))
  })

  it('compiles multi-arity nested fn* as one closure template', () => {
    const chunk = compileFnBodyForTest(
      [],
      ['(fn* ([x] (+ x 1)) ([x y] (+ x y)))']
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.innerFunctions).toHaveLength(1)
    expect(chunk.innerFunctions[0].arities).toHaveLength(2)
    expect(
      createSession().evaluate(
        '((fn [argc] (let* [f (fn* ([x] (+ x 1)) ([x y] (+ x y)))] (if (= argc 1) (f 41) (f 20 22)))) 2)'
      )
    ).toEqual(v.number(42))
  })

  it('falls back for nested fn* with an unsupported body and rolls back the template', () => {
    const chunk = compileFnBodyForTest(
      [],
      ['(do (fn* [] (try 1 (catch :default e e))) 42)']
    )

    expect(chunk).toBeNull()
  })

  it('falls back when nested fn* captures an outer local', () => {
    expect(compileFnBodyForTest(['x'], ['(fn* [] x)'])).toBeNull()
    expect(createSession().evaluate('((let* [x 10] (fn [] x)))')).toEqual(
      v.number(10)
    )
  })

  it('falls back for named anonymous fn* until VM self-reference is designed', () => {
    expect(compileFnBodyForTest([], ['(fn* local-name [] 42)'])).toBeNull()
  })

  it('falls back for rest params until rest locals are explicitly modeled', () => {
    expect(compileFnBodyForTest(['x'], ['x'], { restParam: 'more' })).toBeNull()
  })

  it('compiles let* by allocating slots after params', () => {
    const chunk = compileFnBodyForTest(['x'], ['(let* [y (+ x 1)] y)'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(2)
    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 LoadLocal 0',
        '0002 Constant 0 ; 1',
        '0004 Add 2',
        '0006 StoreLocal 1',
        '0008 LoadLocal 1',
        '0010 Return',
      ].join('\n')
    )
  })

  it('executes a compiled let* local binding', () => {
    expectVmFnBodyCompilesTo(
      ['x'],
      ['(let* [y (+ x 1)] y)'],
      [v.number(41), v.nil()],
      v.number(42)
    )
  })

  it('compiles sequential let* bindings where later init expressions see earlier locals', () => {
    const chunk = compileFnBodyForTest(
      ['x'],
      ['(let* [y (+ x 1) z (+ y 1)] z)']
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(3)
    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 LoadLocal 0',
        '0002 Constant 0 ; 1',
        '0004 Add 2',
        '0006 StoreLocal 1',
        '0008 LoadLocal 1',
        '0010 Constant 1 ; 1',
        '0012 Add 2',
        '0014 StoreLocal 2',
        '0016 LoadLocal 2',
        '0018 Return',
      ].join('\n')
    )
  })

  it('pops intermediate let* body forms before returning the last body value', () => {
    const chunk = compileFnBodyForTest(['x'], ['(let* [y (+ x 1)] y (+ y 1))'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 LoadLocal 0',
        '0002 Constant 0 ; 1',
        '0004 Add 2',
        '0006 StoreLocal 1',
        '0008 LoadLocal 1',
        '0010 Pop',
        '0011 LoadLocal 1',
        '0013 Constant 1 ; 1',
        '0015 Add 2',
        '0017 Return',
      ].join('\n')
    )
  })

  it('lets inner let* bindings shadow params without changing the param slot', () => {
    expectVmFnBodyCompilesTo(
      ['x'],
      ['(let* [x (+ x 1)] x)'],
      [v.number(41), v.nil()],
      v.number(42)
    )
  })

  it('restores shadowed local mappings after leaving let* scope', () => {
    const chunk = compileFnBodyForTest(['x'], ['(let* [x (+ x 1)] x)', 'x'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 LoadLocal 0',
        '0002 Constant 0 ; 1',
        '0004 Add 2',
        '0006 StoreLocal 1',
        '0008 LoadLocal 1',
        '0010 Pop',
        '0011 LoadLocal 0',
        '0013 Return',
      ].join('\n')
    )

    expect(
      executeChunk({
        chunk,
        env: makeCallTestEnv(),
        ctx: createEvaluationContext(),
        locals: [v.number(41), v.nil()],
      })
    ).toEqual(v.number(41))
  })

  it.each([
    ['missing binding vector', '(let*)'],
    ['non-vector bindings', '(let* :not-a-vector x)'],
    ['odd binding count', '(let* [y 1 z] z)'],
    ['non-symbol binding name', '(let* [:y 1] :y)'],
  ])('falls back for malformed let*: %s', (_label, code) => {
    expect(compileFnBodyForTest(['x'], [code])).toBeNull()
  })

  it('compiles loop* without recur as local initialization plus body evaluation', () => {
    const chunk = compileFnBodyForTest([], ['(loop* [i 0] i)'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(1)
    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 Constant 0 ; 0',
        '0002 StoreLocal 0',
        '0004 LoadLocal 0',
        '0006 Return',
      ].join('\n')
    )
  })

  it('compiles loop* recur with a stable loop header after initialization', () => {
    const chunk = compileFnBodyForTest(
      [],
      ['(loop* [i 0] (if (= i 3) i (recur (+ i 1))))']
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(1)
    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 Constant 0 ; 0',
        '0002 StoreLocal 0',
        '0004 LoadLocal 0',
        '0006 Constant 1 ; 3',
        '0008 Eq 2',
        '0010 JumpIfFalsy 4 -> 0016',
        '0012 LoadLocal 0',
        '0014 Jump 10 -> 0026',
        '0016 LoadLocal 0',
        '0018 Constant 2 ; 1',
        '0020 Add 2',
        '0022 Recur 0 1 -> 0004',
        '0026 Return',
      ].join('\n')
    )
  })

  it('pops intermediate loop* body forms while keeping recur in tail position', () => {
    const chunk = compileFnBodyForTest(
      [],
      ['(loop* [i 0] i (if (= i 3) i (recur (+ i 1))))']
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(1)
    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 Constant 0 ; 0',
        '0002 StoreLocal 0',
        '0004 LoadLocal 0',
        '0006 Pop',
        '0007 LoadLocal 0',
        '0009 Constant 1 ; 3',
        '0011 Eq 2',
        '0013 JumpIfFalsy 4 -> 0019',
        '0015 LoadLocal 0',
        '0017 Jump 10 -> 0029',
        '0019 LoadLocal 0',
        '0021 Constant 2 ; 1',
        '0023 Add 2',
        '0025 Recur 0 1 -> 0004',
        '0029 Return',
      ].join('\n')
    )
  })

  it('uses localStart to target loop locals after function params', () => {
    const chunk = compileFnBodyForTest(
      ['base'],
      ['(loop* [i 0 acc base] (if (= i 3) acc (recur (+ i 1) (+ acc 10))))']
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(3)
    const recurOffset = chunk.code.indexOf(Op.Recur)
    expect(recurOffset).toBeGreaterThanOrEqual(0)
    expect(chunk.code.slice(recurOffset, recurOffset + 4)).toEqual([
      Op.Recur,
      1,
      2,
      8,
    ])
  })

  it('executes a compiled loop* recur function body', () => {
    expectVmFnBodyCompilesTo(
      [],
      ['(loop* [i 0] (if (= i 3) i (recur (+ i 1))))'],
      [v.nil()],
      v.number(3)
    )
  })

  it('executes recur updates as simultaneous assignment', () => {
    expectVmFnBodyCompilesTo(
      [],
      ['(loop* [a 1 b 2 done false] (if done [a b] (recur b a true)))'],
      [v.nil(), v.nil(), v.nil()],
      v.vector([v.number(2), v.number(1)])
    )
  })

  it('compiles nested loop* forms so inner recur targets the inner loop', () => {
    const chunk = compileFnBodyForTest(
      [],
      [
        '(loop* [i 0 total 0] (if (= i 3) total (recur (+ i 1) (+ total (loop* [j 0 inner 0] (if (= j i) inner (recur (+ j 1) (+ inner j))))))))',
      ]
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const recurOffsets = chunk.code
      .map((cell, index) => (cell === Op.Recur ? index : -1))
      .filter((index) => index >= 0)

    expect(recurOffsets.length).toBe(2)

    const outerRecur = chunk.code.slice(recurOffsets[1], recurOffsets[1] + 4)
    const innerRecur = chunk.code.slice(recurOffsets[0], recurOffsets[0] + 4)

    expect(innerRecur[1]).toBe(2)
    expect(innerRecur[2]).toBe(2)
    expect(innerRecur[3]).toBeGreaterThan(0)

    expect(outerRecur).toEqual([Op.Recur, 0, 2, 8])
  })

  it('executes nested loop* forms with independent recur targets', () => {
    expectVmFnBodyCompilesTo(
      [],
      [
        '(loop* [i 0 total 0] (if (= i 3) total (recur (+ i 1) (+ total (loop* [j 0 inner 0] (if (= j i) inner (recur (+ j 1) (+ inner j))))))))',
      ],
      [v.nil(), v.nil(), v.nil(), v.nil()],
      v.number(1)
    )
  })

  it.each([
    ['non-vector bindings', '(loop* :not-a-vector x)'],
    ['odd binding count', '(loop* [i 0 acc] acc)'],
    ['non-symbol binding name', '(loop* [:i 0] :i)'],
    ['wrong recur arity', '(loop* [i 0 acc 0] (recur (+ i 1)))'],
  ])('falls back for malformed or unsupported loop*: %s', (_label, code) => {
    expect(compileFnBodyForTest([], [code])).toBeNull()
  })
})

describe('VM function-level recur compilation', () => {
  it('compiles tail-position function-level recur to FnRecur', () => {
    const chunk = compileFnBodyForTest(
      ['n', 'acc'],
      ['(if (= n 0) acc (recur (- n 1) (+ acc n)))']
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(2)
    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 LoadLocal 0',
        '0002 Constant 0 ; 0',
        '0004 Eq 2',
        '0006 JumpIfFalsy 4 -> 0012',
        '0008 LoadLocal 1',
        '0010 Jump 14 -> 0026',
        '0012 LoadLocal 0',
        '0014 Constant 1 ; 1',
        '0016 Sub 2',
        '0018 LoadLocal 1',
        '0020 LoadLocal 0',
        '0022 Add 2',
        '0024 FnRecur 2 -> 0000',
        '0026 Return',
      ].join('\n')
    )
  })

  it('executes function-level recur without growing VM frames', () => {
    expectVmFnBodyCompilesTo(
      ['n', 'acc'],
      ['(if (= n 0) acc (recur (- n 1) (+ acc n)))'],
      [v.number(5), v.number(0)],
      v.number(15)
    )
  })

  it('executes function-level recur updates as simultaneous assignment', () => {
    expectVmFnBodyCompilesTo(
      ['a', 'b', 'done'],
      ['(if done [a b] (recur b a true))'],
      [v.number(1), v.number(2), v.boolean(false)],
      v.vector([v.number(2), v.number(1)])
    )
  })

  it('pops intermediate function body forms before tail-position recur', () => {
    const chunk = compileFnBodyForTest(
      ['n'],
      ['(+ n 10)', '(if (= n 0) n (recur (- n 1)))']
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toContain('0006 Pop')
    expect(disassembleChunk(chunk)).toContain('FnRecur 1 -> 0000')
    expect(
      executeChunk({
        chunk,
        env: makeCallTestEnv(),
        ctx: createEvaluationContext(),
        locals: [v.number(3)],
      })
    ).toEqual(v.number(0))
  })

  it('keeps nested loop* recur targeted at the loop, not the function', () => {
    const chunk = compileFnBodyForTest(
      ['n'],
      ['(loop* [i n] (if (= i 0) i (recur (- i 1))))']
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.code).toContain(Op.Recur)
    expect(chunk.code).not.toContain(Op.FnRecur)
    expect(
      executeChunk({
        chunk,
        env: makeCallTestEnv(),
        ctx: createEvaluationContext(),
        locals: [v.number(3), v.nil()],
      })
    ).toEqual(v.number(0))
  })

  it('falls back for function-level recur arity mismatch', () => {
    expect(compileFnBodyForTest(['n'], ['(recur n n)'])).toBeNull()
  })

  it('keeps top-level VM recur unsupported', () => {
    expectVmFallsBack('(recur 1)')
  })
})

describe('VM function body integration', () => {
  it('stores bytecodeBody on fn arities with VM-compilable bodies', () => {
    const fn = createSession().evaluate('(fn [x] (+ x 1))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    expect(fn.arities[0].bytecodeBody?.localCount).toBe(1)
  })

  it('executes bytecodeBody through normal function application', () => {
    const fn = createSession().evaluate('(fn [x] (+ x 2))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    fn.arities[0].compiledBody = () => {
      throw new Error('compiledBody should not run when bytecodeBody exists')
    }

    const result = applyFunctionWithContext(
      fn,
      [v.number(40)],
      createEvaluationContext(),
      fn.env
    )

    expect(result).toEqual(v.number(42))
  })

  it.each([
    ['identity fn', '((fn [x] x) 42)', v.number(42)],
    ['two-arg fn', '((fn [x y] y) 10 20)', v.number(20)],
    ['if body', '((fn [x] (if x 1 2)) true)', v.number(1)],
    ['multi-form body', '((fn [x] (+ x 1) (+ x 2)) 40)', v.number(42)],
    [
      'collection body',
      '((fn [x] [x (+ x 1)]) 4)',
      v.vector([v.number(4), v.number(5)]),
    ],
  ])('evaluates %s through the session', (_label, code, expected) => {
    expect(createSession().evaluate(code)).toEqual(expected)
  })

  it('stores bytecodeBody for let* bodies and evaluates them through normal application', () => {
    const fn = createSession().evaluate('(fn [x] (let* [y (+ x 1)] y))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    expect(
      applyFunctionWithContext(
        fn,
        [v.number(41)],
        createEvaluationContext(),
        fn.env
      )
    ).toEqual(v.number(42))
  })

  it('does not store bytecodeBody for unsupported bodies and still evaluates', () => {
    const fn = createSession().evaluate('(fn [x] (try x (catch :default e e)))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeUndefined()
    expect(
      applyFunctionWithContext(
        fn,
        [v.number(42)],
        createEvaluationContext(),
        fn.env
      )
    ).toEqual(v.number(42))
  })

  it.each([
    ['single local', '((fn [x] (let* [y (+ x 1)] y)) 41)', v.number(42)],
    [
      'sequential locals',
      '((fn [x] (let* [y (+ x 1) z (+ y 1)] z)) 40)',
      v.number(42),
    ],
    ['local shadowing', '((fn [x] (let* [x (+ x 1)] x)) 41)', v.number(42)],
    [
      'shadowing does not leak',
      '((fn [x] (let* [x (+ x 1)] x) x) 41)',
      v.number(41),
    ],
  ])('evaluates let* function body with %s', (_label, code, expected) => {
    expect(createSession().evaluate(code)).toEqual(expected)
  })

  it.each([
    [
      'counting loop',
      '((fn [] (loop* [i 0] (if (= i 3) i (recur (+ i 1))))))',
      v.number(3),
    ],
    [
      'factorial accumulator',
      '((fn [n] (loop* [i n acc 1] (if (= i 0) acc (recur (- i 1) (* acc i))))) 5)',
      v.number(120),
    ],
    ['loop without recur', '((fn [] (loop* [x 41] (+ x 1))))', v.number(42)],
    [
      'simultaneous assignment',
      '((fn [] (loop* [a 1 b 2 done false] (if done [a b] (recur b a true)))))',
      v.vector([v.number(2), v.number(1)]),
    ],
    [
      'loop can read params',
      '((fn [base] (loop* [i 0 acc base] (if (= i 3) acc (recur (+ i 1) (+ acc 10))))) 5)',
      v.number(35),
    ],
    [
      'let* inside loop body',
      '((fn [] (loop* [i 0] (let* [next (+ i 1)] (if (= next 3) next (recur next))))))',
      v.number(3),
    ],
    [
      'nested loop recur targets',
      '((fn [] (loop* [i 0 total 0] (if (= i 3) total (recur (+ i 1) (+ total (loop* [j 0 inner 0] (if (= j i) inner (recur (+ j 1) (+ inner j))))))))))',
      v.number(1),
    ],
  ])('evaluates loop* function body with %s', (_label, code, expected) => {
    expect(createSession().evaluate(code)).toEqual(expected)
  })

  it('evaluates loop arithmetic through intrinsic bytecode shape', () => {
    const code =
      '((fn [n] (loop* [i 0 acc 0] (if (= i n) acc (recur (+ i 1) (+ acc i))))) 5)'
    const fn = createSession().evaluate(
      '(fn [n] (loop* [i 0 acc 0] (if (= i n) acc (recur (+ i 1) (+ acc i)))))'
    )

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    const bytecodeBody = fn.arities[0].bytecodeBody
    expect(bytecodeBody).toBeDefined()
    if (bytecodeBody === undefined) return

    const disassembly = disassembleChunk(bytecodeBody)
    expect(disassembly).toContain('Eq 2')
    expect(disassembly).toContain('Add 2')
    expect(createSession().evaluate(code)).toEqual(v.number(10))
  })

  it('evaluates bytecode function calls from another bytecode function', () => {
    const s = createSession()
    s.evaluate('(def inc1 (fn [x] (+ x 1)))')
    s.evaluate('(def twice (fn [x] (inc1 (inc1 x))))')

    expect(s.evaluate('(twice 40)')).toEqual(v.number(42))
  })

  it('reports nested bytecode function frames in caught runtime errors', () => {
    const s = createSession()
    s.evaluate('(defn trace-inner [] (/ 1 0))')
    s.evaluate('(defn trace-outer [] (trace-inner))')

    const result = s.evaluate(
      '(try (trace-outer) (catch :error/runtime e (mapv :fn (:frames e))))'
    )

    expect(result).toEqual(
      v.vector([
        v.string('/'),
        v.string('trace-inner'),
        v.string('trace-outer'),
      ])
    )
  })

  it('does not accumulate synthesized VM frames across repeated failures', () => {
    const s = createSession()
    s.evaluate('(defn repeat-inner [] (/ 1 0))')
    s.evaluate('(defn repeat-outer [] (repeat-inner))')

    expect(
      s.evaluate(
        '(try (repeat-outer) (catch :error/runtime e (count (:frames e))))'
      )
    ).toEqual(v.number(3))
    expect(
      s.evaluate(
        '(try (repeat-outer) (catch :error/runtime e (count (:frames e))))'
      )
    ).toEqual(v.number(3))
  })

  it('keeps locals isolated across recursive bytecode frames', () => {
    const s = createSession()
    s.evaluate(
      '(def triangle (fn [n acc] (if (= n 0) acc (triangle (- n 1) (+ acc n)))))'
    )

    expect(s.evaluate('(triangle 4 0)')).toEqual(v.number(10))
  })

  it('evaluates function-level recur through bytecodeBody', () => {
    const s = createSession()
    const fn = s.evaluate(
      '(fn [n acc] (if (= n 0) acc (recur (- n 1) (+ acc n))))'
    )

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    expect(
      s.evaluate(
        '((fn [n acc] (if (= n 0) acc (recur (- n 1) (+ acc n)))) 5 0)'
      )
    ).toEqual(v.number(15))
  })

  it('runs function-level recur past the VM frame limit without pushing frames', () => {
    const s = createSession()
    s.evaluate('(def down (fn [n] (if (= n 0) n (recur (- n 1)))))')

    expect(s.evaluate('(down 10005)')).toEqual(v.number(0))
  })

  it('falls back and preserves runtime arity behavior for function-level recur mismatch', () => {
    const fn = createSession().evaluate('(fn [n] (recur n n))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeUndefined()
    expect(() => createSession().evaluate('((fn [n] (recur n n)) 1)')).toThrow(
      'Arguments length mismatch: fn accepts 1 arguments, but 2 were provided'
    )
  })

  it('preserves arity mismatch errors for bytecode-backed functions', () => {
    expect(() =>
      createSession().evaluate('(let* [f (fn [x] x)] (f))')
    ).toThrow('No matching arity for 0 arguments. Available arities: 1')
  })

  it('falls back to namespace-redefined operators at intrinsic execution time', () => {
    const s = createSession()
    s.evaluate('(def + (fn [a b] 99))')

    expect(s.evaluate('((fn [] (+ 1 2)))')).toEqual(v.number(99))
  })

  it('does not store bytecodeBody for loop* destructuring until VM destructuring exists', () => {
    const fn = createSession().evaluate('(fn [] (loop* [[a b] [1 2]] a))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeUndefined()
  })

  it('throws like the interpreter for non-tail recur in a loop* body', () => {
    expect(() =>
      createSession().evaluate(
        '(fn [] (loop* [i 0] (+ 1 (recur (+ i 1)))))'
      )
    ).toThrow('Can only recur from tail position')
  })

  it('throws like the interpreter for loop* recur arity mismatch at runtime fallback', () => {
    expect(() =>
      createSession().evaluate(
        '((fn [] (loop* [i 0 acc 0] (recur (+ i 1)))))'
      )
    ).toThrow('recur expects 2 arguments but got 1')
  })

  it('does not store bytecodeBody for rest-param arities', () => {
    const fn = createSession().evaluate('(fn [x & more] x)')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeUndefined()
  })

  it('does not store bytecodeBody when the body closes over an outer local', () => {
    const fn = createSession().evaluate('(let* [x 10] (fn [] x))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeUndefined()
    expect(createSession().evaluate('((let* [x 10] (fn [] x)))')).toEqual(
      v.number(10)
    )
  })
})

describe('VM do compilation', () => {
  it('compiles do with literals', () => {
    const chunk = compileVm(formToNode('(do 1 2 3)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-expression ==',
        '0000 Constant 0 ; 1',
        '0002 Pop',
        '0003 Constant 1 ; 2',
        '0005 Pop',
        '0006 Constant 2 ; 3',
        '0008 Return',
      ].join('\n')
    )
  })

  it('executes do and returns the last expression', () => {
    expectVmCompilesTo('(do 1 2 3)', v.number(3))
  })

  it('compiles empty do to nil', () => {
    expectVmCompilesTo('(do)', v.nil())
  })

  it('executes do with symbol reads', () => {
    const chunk = compileVm(formToNode('(do 1 x)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const env = makeEnv()
    define('x', v.number(42), env)

    expect(
      executeChunk({ chunk, env, ctx: createEvaluationContext() })
    ).toEqual(v.number(42))
  })

  it('falls back when any do child cannot compile', () => {
    expect(compileVm(formToNode('(do 1 [2 3 foo/bar.baz])'))).toBeNull()
  })
})

describe('VM if compilation', () => {
  it.each([true, false, null])(
    'compiles if with literal branches: %s',
    (test) => {
      const cljValue = jsToClj(test)
      const chunk = compileVm(formToNode(`(if ${printString(cljValue)} 1 2)`))

      expect(chunk).not.toBeNull()
      if (chunk === null) return

      const constantLiteral = test === null ? 'Nil' : test ? 'True' : 'False'

      expect(disassembleChunk(chunk)).toBe(
        [
          '== vm-expression ==',
          `0000 ${constantLiteral}`,
          '0001 JumpIfFalsy 4 -> 0007',
          '0003 Constant 0 ; 1',
          '0005 Jump 2 -> 0009',
          '0007 Constant 1 ; 2',
          '0009 Return',
        ].join('\n')
      )
    }
  )

  it('compiles if without else to nil else branch', () => {
    const chunk = compileVm(formToNode('(if false 1)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-expression ==',
        '0000 False',
        '0001 JumpIfFalsy 4 -> 0007',
        '0003 Constant 0 ; 1',
        '0005 Jump 1 -> 0008',
        '0007 Nil',
        '0008 Return',
      ].join('\n')
    )
  })

  it('executes compiled if true branch', () => {
    expectVmCompilesTo('(if true 1 2)', v.number(1))
  })

  it('executes compiled if false branch', () => {
    expectVmCompilesTo('(if false 1 2)', v.number(2))
  })

  it('executes compiled if nil as falsey', () => {
    expectVmCompilesTo('(if nil 1 2)', v.number(2))
  })

  it('executes compiled if with truthy non-boolean test', () => {
    expectVmCompilesTo('(if 0 1 2)', v.number(1))
  })

  it('executes compiled if with vector expression in then', () => {
    expectVmCompilesTo(
      '(if 0 [1 (+ 2 3)])',
      v.vector([v.number(1), v.number(5)])
    )
    expectVmCompilesTo(
      '(if nil :ignored [1 (+ 2 3)])',
      v.vector([v.number(1), v.number(5)])
    )
  })

  it('executes compiled if without else as nil', () => {
    expectVmCompilesTo('(if false 1)', v.nil())
  })

  it('compiles if with call expression in test', () => {
    expect(compileVm(formToNode('(if (+ 1 2) 3 4)'))).not.toBeNull()
  })

  it('compiles if with simple call expression', () => {
    expect(compileVm(formToNode('(if false 1 (+ 2 3))'))).not.toBeNull()
  })

  it.each(['(if)', '(if true)', '(if true 1 2 3)'])(
    'falls back for malformed if %s',
    (code) => {
      expect(compileVm(formToNode(code))).toBeNull()
    }
  )
})

describe('VM call compilation', () => {
  it.each([
    ['(+ 1 2)', 'Add'],
    ['(- 10 3)', 'Sub'],
    ['(* 2 3)', 'Mul'],
    ['(/ 10 2)', 'Div'],
    ['(< 1 2)', 'Lt'],
    ['(<= 1 1)', 'Lte'],
    ['(> 2 1)', 'Gt'],
    ['(>= 2 2)', 'Gte'],
    ['(= 1 1)', 'Eq'],
  ])('compiles %s to the %s intrinsic', (code, opcodeName) => {
    const chunk = compileVm(formToNode(code))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const disassembly = disassembleChunk(chunk)
    expect(disassembly).toContain(`${opcodeName} 2`)
    expect(disassembly).not.toContain('Call 2')
  })

  it('compiles (+ 1 2) to Add plus Return', () => {
    const chunk = compileVm(formToNode('(+ 1 2)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-expression ==',
        '0000 Constant 0 ; 1',
        '0002 Constant 1 ; 2',
        '0004 Add 2',
        '0006 Return',
      ].join('\n')
    )
  })

  it('executes compiled calls through applyCallable', () => {
    const chunk = compileVm(formToNode('(+ 1 2)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const env = makeEnv()
    define(
      '+',
      v.nativeFn('+', (a: CljValue, b: CljValue) => {
        if (a.kind !== 'number' || b.kind !== 'number') return v.nil()
        return v.number(a.value + b.value)
      }),
      env
    )

    expect(
      executeChunk({ chunk, env, ctx: createEvaluationContext() })
    ).toEqual(v.number(3))
  })

  it.each([
    ['(+)', v.number(0)],
    ['(+ 1)', v.number(1)],
    ['(+ 1 2 3)', v.number(6)],
    ['(- 10 3)', v.number(7)],
    ['(* 2 3 4)', v.number(24)],
    ['(forty-two)', v.number(42)],
  ])('executes compiled call expression %s', (code, expected) => {
    expectVmCallCompilesTo(code, expected)
  })

  it.each([
    '(/ 100 5 2)',
    '(< 1 2 3)',
    '(< 1 3 2)',
    '(<= 1 1 2)',
    '(> 3 2 1)',
    '(>= 3 1 2)',
    '(= [1 2] (list 1 2))',
  ])('matches interpreter semantics for intrinsic call %s', (code) => {
    expectVmEqualsInterpreter(code)
  })

  it('uses generic Call when an intrinsic operator is shadowed by a local', () => {
    const chunk = compileVm(formToNode('(let* [+ :answer] (+ {:answer 99}))'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const disassembly = disassembleChunk(chunk)
    expect(disassembly).toContain('LoadLocal 0')
    expect(disassembly).toContain('Call 1')
    expect(disassembly).not.toContain('Add 1')
    expect(createSession().evaluate('((fn [] (let* [+ :answer] (+ {:answer 99}))))')).toEqual(
      v.number(99)
    )
  })

  it('keeps qualified operators on the generic Call path', () => {
    const chunk = compileVm(formToNode('(clojure.core/+ 1 2)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const disassembly = disassembleChunk(chunk)
    expect(disassembly).toContain('LoadQualified 0 ; clojure.core/+')
    expect(disassembly).toContain('Call 2')
    expect(disassembly).not.toContain('Add 2')
  })

  it.each([
    ['(+ (+ 1 2) 3)', v.number(6)],
    ['(+ 1 (+ 2 3))', v.number(6)],
    ['(+ (+ 1 2) (+ 3 4))', v.number(10)],
  ])('executes nested compiled call expression %s', (code, expected) => {
    expectVmCallCompilesTo(code, expected)
  })

  it.each([
    ['(do (+ 1 2) (+ 3 4))', v.number(7)],
    ['(if true (+ 1 2) (+ 10 20))', v.number(3)],
    ['(if false (+ 1 2) (+ 10 20))', v.number(30)],
    ['(if (+ 0 0) (+ 1 2) (+ 10 20))', v.number(3)],
    ['(if (truthy? nil) (+ 1 2) (+ 10 20))', v.number(30)],
    ['(apply + 1 [2 3])', v.number(6)],
  ])('executes compiled call inside surrounding form %s', (code, expected) => {
    expectVmCallCompilesTo(code, expected)
  })

  it.each([
    ['([1 2] 0)', 'unsupported callee expression'],
    ['(+ 1 foo/bar.baz)', 'unsupported dotted qualified argument symbol'],
  ])('falls back for %s: %s', (code) => {
    expect(compileVm(formToNode(code))).toBeNull()
  })
})

describe('VM collection compilation', () => {
  it.each(['[]', '[1 2]', '{:a 1}', '#{1}'])(
    'Can compile literal collections %s',
    (code) => {
      const chunk = compileVm(formToNode(code))

      expect(chunk).not.toBeNull()
    }
  )

  it.each([
    ['[1 2 3]', v.vector([v.number(1), v.number(2), v.number(3)])],
    ['[1 (+ 2 3)]', v.vector([v.number(1), v.number(5)])],
    ['[:a :b]', v.vector([v.keyword(':a'), v.keyword(':b')])],
    [
      '[:a (+ 1 2) :b (- 10 3)]',
      v.vector([v.keyword(':a'), v.number(3), v.keyword(':b'), v.number(7)]),
    ],
    [
      '{:a 1 :b 2}',
      v.map([
        [v.keyword(':a'), v.number(1)],
        [v.keyword(':b'), v.number(2)],
      ]),
    ],
    [
      '{:a 1 :b (+ 2 3)}',
      v.map([
        [v.keyword(':a'), v.number(1)],
        [v.keyword(':b'), v.number(5)],
      ]),
    ],
    ['#{1 2 3}', v.set([v.number(1), v.number(2), v.number(3)])],
    ['#{1 (+ 1 2)}', v.set([v.number(1), v.number(3)])],
    ['(do [1 2] [3 4])', v.vector([v.number(3), v.number(4)])],
  ])('executes compiled collection expressions %s', (code, expected) => {
    expectVmCallCompilesTo(code, expected)
  })

  it.each([
    [
      '[(+ 1 2)]',
      [
        '== vm-expression ==',
        '0000 Constant 0 ; 1',
        '0002 Constant 1 ; 2',
        '0004 Add 2',
        '0006 MakeVector ; 1',
        '0008 Return',
      ],
    ],
    [
      '[:a (+ 1 2) :b (- 10 3)]',
      [
        '== vm-expression ==',
        '0000 Constant 0 ; :a',
        '0002 Constant 1 ; 1',
        '0004 Constant 2 ; 2',
        '0006 Add 2',
        '0008 Constant 3 ; :b',
        '0010 Constant 4 ; 10',
        '0012 Constant 5 ; 3',
        '0014 Sub 2',
        '0016 MakeVector ; 4',
        '0018 Return',
      ],
    ],
    [
      '{:a 1 :b (+ 2 3)}',
      [
        '== vm-expression ==',
        '0000 Constant 0 ; :a',
        '0002 Constant 1 ; 1',
        '0004 Constant 2 ; :b',
        '0006 Constant 3 ; 2',
        '0008 Constant 4 ; 3',
        '0010 Add 2',
        '0012 MakeMap ; 2',
        '0014 Return',
      ],
    ],
    [
      '#{1 (+ 1 2)}',
      [
        '== vm-expression ==',
        '0000 Constant 0 ; 1',
        '0002 Constant 1 ; 1',
        '0004 Constant 2 ; 2',
        '0006 Add 2',
        '0008 MakeSet ; 2',
        '0010 Return',
      ],
    ],
    [
      '[1 2 (if 1 3 4)]',
      [
        '== vm-expression ==',
        '0000 Constant 0 ; 1',
        '0002 Constant 1 ; 2',
        '0004 Constant 2 ; 1',
        '0006 JumpIfFalsy 4 -> 0012',
        '0008 Constant 3 ; 3',
        '0010 Jump 2 -> 0014',
        '0012 Constant 4 ; 4',
        '0014 MakeVector ; 3',
        '0016 Return',
      ],
    ],
  ])('Compiles collection expressions to bytecode %s', (code, expected) => {
    const chunk = compileVm(formToNode(code))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(expected.join('\n'))
  })
})
