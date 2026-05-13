import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { tokenize } from '../../tokenizer'
import { readForms } from '../../reader'
import type { CljValue } from '../../types'
import { executeChunk } from '../vm'
import { define, makeEnv } from '../../env'
import { EvaluationError } from '../../errors'
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
  expected: CljValue,
  options: {
    restParam?: string | null
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

function expectSessionEvaluationError(code: string): EvaluationError {
  try {
    createSession().evaluate(code)
  } catch (error) {
    expect(error).toBeInstanceOf(EvaluationError)
    return error as EvaluationError
  }
  throw new Error(`Expected EvaluationError for: ${code}`)
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
    '(:k {:k 1})',
    '([1 2] 0)',
    '((if true + -) 1 2)',
    '((if false + -) 1 2)',
  ])('matches interpreter result for %s', (code) => {
    expectVmEqualsInterpreter(code)
  })

  it.each(['js/Math.pow', '(if true 1 2 3)'])(
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
      ['(do (fn* [] (try 1 (catch string? e e))) 42)']
    )

    expect(chunk).toBeNull()
  })

  it('compiles nested fn* captures to LoadUpvalue', () => {
    const chunk = compileFnBodyForTest(['x'], ['(fn* [] x)'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.innerFunctions).toHaveLength(1)
    expect(chunk.innerFunctions[0].upvalueDescriptors).toEqual([
      { isLocal: true, index: 0 },
    ])
    expect(disassembleChunk(chunk.innerFunctions[0].arities[0].chunk)).toBe(
      ['== vm-fn-body ==', '0000 LoadUpvalue 0', '0002 Return'].join('\n')
    )
  })

  it('executes nested fn* capturing an outer local', () => {
    expect(
      createSession().evaluate('((fn [] (let* [x 10] ((fn* [] x)))))')
    ).toEqual(v.number(10))
  })

  it('keeps returned closure upvalues alive after the defining frame returns', () => {
    expect(
      createSession().evaluate('((fn [] ((let* [x 10] (fn* [] x)))))')
    ).toEqual(v.number(10))
  })

  it('captures parent params through make-adder style closures', () => {
    expect(
      createSession().evaluate(
        '((fn [] (let* [make-adder (fn* [x] (fn* [y] (+ x y))) add10 (make-adder 10)] (add10 5))))'
      )
    ).toEqual(v.number(15))
  })

  it('preserves lexical shadowing for captured locals', () => {
    expect(
      createSession().evaluate(
        '((fn [] (let* [x 1 f (fn* [] x)] (let* [x 2] (f)))))'
      )
    ).toEqual(v.number(1))
  })

  it('relays upvalues through multi-level closure chains', () => {
    expect(
      createSession().evaluate(
        '((fn [] (let* [x 7 f (((fn* [] (fn* [] (fn* [] x)))))] (f))))'
      )
    ).toEqual(v.number(7))
  })

  it('shares captured upvalues across multi-arity nested fn*', () => {
    expect(
      createSession().evaluate(
        '((fn [] (let* [x 10 f (fn* ([a] (+ x a)) ([a b] (+ x a b)))] [(f 1) (f 1 2)])))'
      )
    ).toEqual(v.vector([v.number(11), v.number(13)]))
  })

  it('falls back for named anonymous fn* until VM self-reference is designed', () => {
    expect(compileFnBodyForTest([], ['(fn* local-name [] 42)'])).toBeNull()
  })

  it('compiles rest params into the slot after fixed params', () => {
    const chunk = compileFnBodyForTest(['x'], ['more'], { restParam: 'more' })

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(2)
    expect(disassembleChunk(chunk)).toBe(
      ['== vm-fn-body ==', '0000 LoadLocal 1', '0002 Return'].join('\n')
    )
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

  it('compiles variadic function-level recur to FnRecurRest', () => {
    const chunk = compileFnBodyForTest(
      ['done', 'x'],
      ['(if done more (recur true x 2 3))'],
      { restParam: 'more' }
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toContain('FnRecurRest 4 2 -> 0000')
  })

  it('repackages extra variadic function-level recur args into the rest slot', () => {
    expectVmFnBodyCompilesTo(
      ['done', 'x'],
      ['(if done more (recur true x 2 3))'],
      [v.boolean(false), v.number(1), v.nil()],
      v.list([v.number(2), v.number(3)]),
      { restParam: 'more' }
    )
  })

  it('repackages empty variadic function-level recur rest as nil', () => {
    expectVmFnBodyCompilesTo(
      ['done', 'x'],
      ['(if done more (recur true x))'],
      [v.boolean(false), v.number(1), v.list([v.number(9)])],
      v.nil(),
      { restParam: 'more' }
    )
  })

  it('evaluates variadic recur arguments before rewriting function slots', () => {
    expectVmFnBodyCompilesTo(
      ['done', 'a', 'b'],
      ['(if done [a b more] (recur true b a b))'],
      [v.boolean(false), v.number(1), v.number(2), v.nil()],
      v.vector([v.number(2), v.number(1), v.list([v.number(2)])]),
      { restParam: 'more' }
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

  it('stores bytecodeBody for catch-only try bodies and evaluates them through normal application', () => {
    const fn = createSession().evaluate('(fn [x] (try x (catch :default e e)))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    expect(fn.arities[0].bytecodeBody?.code).toContain(Op.PushTry)
    expect(fn.arities[0].bytecodeBody?.code).toContain(Op.PopTry)
    expect(
      applyFunctionWithContext(
        fn,
        [v.number(42)],
        createEvaluationContext(),
        fn.env
      )
    ).toEqual(v.number(42))
  })

  it('compiles catch-only try bodies to PushTry, PopTry, and catch table metadata', () => {
    const chunk = compileFnBodyForTest([], ['(try 42 (catch :default e e))'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.catchTables).toEqual([
      {
        clauses: [
          {
            discriminator: v.keyword(':default'),
            bindingSlot: 0,
            bodyIp: 7,
          },
        ],
      },
    ])
    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 PushTry 0',
        '0002 Constant 0 ; 42',
        '0004 PopTry',
        '0005 Jump 2 -> 0009',
        '0007 LoadLocal 0',
        '0009 Return',
      ].join('\n')
    )
  })

  it.each([
    ['finally', '(try x (catch :default e e) (finally x))'],
    ['predicate catch', '(try x (catch string? e e))'],
    ['unsupported catch body', '(try x (catch :default e (def caught e)))'],
  ])(
    'does not store bytecodeBody for unsupported try bodies with %s and still evaluates',
    (_label, code) => {
      const fn = createSession().evaluate(`(fn [x] ${code})`)

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
    }
  )

  it('stores bytecodeBody for direct throw bodies', () => {
    const fn = createSession().evaluate('(fn [] (throw {:type :error/test}))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    expect(fn.arities[0].bytecodeBody?.code).toContain(Op.Throw)
  })

  it('surfaces direct bytecode map throws with current session behavior', () => {
    const error = expectSessionEvaluationError(
      '((fn [] (throw {:type :error/test :message "oops"})))'
    )

    expect(error.message).toBe(
      'Unhandled throw: {:type :error/test :message "oops"}'
    )
    expect(error.context).toEqual({
      thrownValue: v.map([
        [v.keyword(':type'), v.keyword(':error/test')],
        [v.keyword(':message'), v.string('oops')],
      ]),
    })
  })

  it('surfaces direct bytecode string throws with current session behavior', () => {
    const error = expectSessionEvaluationError('((fn [] (throw "bare string")))')

    expect(error.message).toBe('Unhandled throw: "bare string"')
    expect(error.context).toEqual({ thrownValue: v.string('bare string') })
  })

  it('does not inject frames into direct bytecode user-thrown maps', () => {
    expect(
      createSession().evaluate(
        '(try ((fn [] (throw {:type :error/test}))) (catch :error/test e (contains? e :frames)))'
      )
    ).toEqual(v.boolean(false))
  })

  it.each([
    [
      'no-throw path skips catch',
      '((fn [] (try 42 (catch :default e 0))))',
      v.number(42),
    ],
    [
      'direct throw caught by keyword type',
      '((fn [] (try (throw {:type :error/test :message "boom"}) (catch :error/test e (:type e)))))',
      v.keyword(':error/test'),
    ],
    [
      ':default catches a bare thrown string',
      '((fn [] (try (throw "oops") (catch :default e e))))',
      v.string('oops'),
    ],
    [
      'delegated native throw caught by keyword type',
      '((fn [throw] (try (throw {:type :native}) (catch :native e (:type e)))) throw)',
      v.keyword(':native'),
    ],
    [
      'first matching catch wins',
      '((fn [] (try (throw {:type :b}) (catch :a e :a) (catch :b e :b) (catch :default e :default))))',
      v.keyword(':b'),
    ],
    [
      'runtime EvaluationError caught as :error/runtime',
      '((fn [] (try (/ 1 0) (catch :error/runtime e (:type e)))))',
      v.keyword(':error/runtime'),
    ],
    [
      'runtime EvaluationError map includes message',
      '((fn [] (try (/ 1 0) (catch :error/runtime e (contains? e :message)))))',
      v.boolean(true),
    ],
    [
      'user-thrown map caught inside VM has no frames injected',
      '((fn [] (try (throw {:type :error/test}) (catch :error/test e (contains? e :frames)))))',
      v.boolean(false),
    ],
    [
      'nested catch-only try lets outer handler catch inner miss',
      '((fn [] (try (try (throw {:type :outer}) (catch :inner e :inner)) (catch :outer e :outer))))',
      v.keyword(':outer'),
    ],
  ])('evaluates catch-only try through bytecode: %s', (_label, code, expected) => {
    expect(createSession().evaluate(code)).toEqual(expected)
  })

  it('propagates non-matching VM catches like the interpreter', () => {
    const error = expectSessionEvaluationError(
      '((fn [] (try (throw {:type :x}) (catch :y e e))))'
    )

    expect(error.message).toBe('Unhandled throw: {:type :x}')
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

  it('falls back and preserves runtime arity behavior for too few variadic recur args', () => {
    const fn = createSession().evaluate('(fn [x & more] (recur))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeUndefined()
    expect(() => createSession().evaluate('((fn [x & more] (recur)) 1)')).toThrow(
      'Arguments length mismatch: fn expects at least 1 arguments, but 0 were provided'
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

  it('stores bytecodeBody for rest-param arities', () => {
    const fn = createSession().evaluate('(fn [x & more] more)')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    expect(fn.arities[0].bytecodeBody?.localCount).toBe(2)
  })

  it('evaluates empty and non-empty rest params through bytecodeBody', () => {
    const s = createSession()

    s.evaluate('(def resty (fn [x & more] more))')

    expect(s.evaluate('(resty 1)')).toEqual(v.nil())
    expect(s.evaluate('(resty 1 2 3)')).toEqual(
      v.list([v.number(2), v.number(3)])
    )
  })

  it('prefers exact bytecode arity over variadic bytecode arity', () => {
    const s = createSession()
    const fn = s.evaluate('(fn ([x] :exact) ([x & more] more))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    expect(fn.arities[1].bytecodeBody).toBeDefined()
    expect(s.evaluate('((fn ([x] :exact) ([x & more] more)) 1)')).toEqual(
      v.keyword(':exact')
    )
    expect(s.evaluate('((fn ([x] :exact) ([x & more] more)) 1 2)')).toEqual(
      v.list([v.number(2)])
    )
  })

  it('compiles nested rest-param fn* closures', () => {
    const chunk = compileFnBodyForTest([], ['(fn* [x & more] more)'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.innerFunctions).toHaveLength(1)
    expect(chunk.innerFunctions[0].arities[0].restParam?.name).toBe('more')
    expect(chunk.innerFunctions[0].arities[0].chunk.localCount).toBe(2)
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

  it('executes a nested fn* that captures loop-local slots', () => {
    const fn = createSession().evaluate(
      '(fn [] (loop* [i 0] (if (= i 1) (let* [f (fn* [] i)] (f)) (recur (+ i 1)))))'
    )

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    expect(
      createSession().evaluate(
        '((fn [] (loop* [i 0] (if (= i 1) (let* [f (fn* [] i)] (f)) (recur (+ i 1))))))'
      )
    ).toEqual(v.number(1))
  })

  it('closes captured loop locals before recur rewrites the slots', () => {
    expect(
      createSession().evaluate(
        '((fn [] (let* [fns (loop* [i 0 fns []] (if (= i 3) fns (recur (+ i 1) (conj fns (fn* [] i))))) f0 (nth fns 0) f1 (nth fns 1) f2 (nth fns 2)] [(f0) (f1) (f2)])))'
      )
    ).toEqual(v.vector([v.number(0), v.number(1), v.number(2)]))
  })

  it('closes multiple captured loop locals together before recur', () => {
    expect(
      createSession().evaluate(
        '((fn [] (let* [fns (loop* [i 0 j 10 fns []] (if (= i 2) fns (recur (+ i 1) (+ j 10) (conj fns (fn* [] [i j]))))) f0 (nth fns 0) f1 (nth fns 1)] [(f0) (f1)])))'
      )
    ).toEqual(
      v.vector([
        v.vector([v.number(0), v.number(10)]),
        v.vector([v.number(1), v.number(20)]),
      ])
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

  it('compiles canonical throw to direct Throw', () => {
    const chunk = compileVm(formToNode('(throw {:type :x})'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-expression ==',
        '0000 Constant 0 ; :type',
        '0002 Constant 1 ; :x',
        '0004 MakeMap ; 1',
        '0006 Throw',
        '0007 Return',
      ].join('\n')
    )
    expect(chunk.code).toContain(Op.Throw)
    expect(disassembleChunk(chunk)).not.toContain('LoadGlobal')
    expect(disassembleChunk(chunk)).not.toContain('Call')
  })

  it('keeps local throw bindings on the generic Call path', () => {
    const chunk = compileVm(
      formToNode('(let* [throw :answer] (throw {:answer 99}))')
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const disassembly = disassembleChunk(chunk)
    expect(disassembly).toContain('LoadLocal 0')
    expect(disassembly).toContain('Call 1')
    expect(disassembly).not.toContain('Throw')
    expect(
      createSession().evaluate(
        '((fn [] (let* [throw :answer] (throw {:answer 99}))))'
      )
    ).toEqual(v.number(99))
  })

  it.each(['(throw)', '(throw :a :b)'])(
    'keeps malformed throw arities on the generic Call path for %s',
    (code) => {
      const chunk = compileVm(formToNode(code))

      expect(chunk).not.toBeNull()
      if (chunk === null) return

      const disassembly = disassembleChunk(chunk)
      expect(disassembly).toContain('LoadGlobal 0 ; throw')
      expect(disassembly).toContain(`Call ${code === '(throw)' ? 0 : 2}`)
      expect(disassembly).not.toContain('Throw')
    }
  )

  it('keeps qualified operators on the generic Call path', () => {
    const chunk = compileVm(formToNode('(clojure.core/+ 1 2)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const disassembly = disassembleChunk(chunk)
    expect(disassembly).toContain('LoadQualified 0 ; clojure.core/+')
    expect(disassembly).toContain('Call 2')
    expect(disassembly).not.toContain('Add 2')
  })

  it('compiles non-symbol callee expressions through generic Call', () => {
    const chunk = compileVm(formToNode('([1 2] 0)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    const disassembly = disassembleChunk(chunk)
    expect(disassembly).toContain('MakeVector ; 2')
    expect(disassembly).toContain('Call 1')
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
    [
      '^:fast []',
      {
        ...v.vector([]),
        meta: v.map([[v.keyword(':fast'), v.boolean(true)]]),
      },
    ],
    [
      '^:fast [1 (+ 2 3)]',
      {
        ...v.vector([v.number(1), v.number(5)]),
        meta: v.map([[v.keyword(':fast'), v.boolean(true)]]),
      },
    ],
    [
      '^{:a 1} {}',
      { ...v.map([]), meta: v.map([[v.keyword(':a'), v.number(1)]]) },
    ],
    [
      '^{:a 1} {:b 2}',
      {
        ...v.map([[v.keyword(':b'), v.number(2)]]),
        meta: v.map([[v.keyword(':a'), v.number(1)]]),
      },
    ],
  ])('executes compiled collection expressions %s', (code, expected) => {
    expectVmCallCompilesTo(code, expected)
  })

  it.each(['(meta ^:fast [])', '(meta ^:fast {:b 2})'])(
    'matches interpreter metadata result for %s',
    (code) => {
      expectVmEqualsInterpreter(code)
    }
  )

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
      '^:fast []',
      [
        '== vm-expression ==',
        '0000 MakeVector ; 0',
        '0002 WithMeta 0 ; {:fast true}',
        '0004 Return',
      ],
    ],
    [
      '^:fast [1 (+ 2 3)]',
      [
        '== vm-expression ==',
        '0000 Constant 0 ; 1',
        '0002 Constant 1 ; 2',
        '0004 Constant 2 ; 3',
        '0006 Add 2',
        '0008 MakeVector ; 2',
        '0010 WithMeta 3 ; {:fast true}',
        '0012 Return',
      ],
    ],
    [
      '^{:a 1} {}',
      [
        '== vm-expression ==',
        '0000 MakeMap ; 0',
        '0002 WithMeta 0 ; {:a 1}',
        '0004 Return',
      ],
    ],
    [
      '^{:a 1} {:b 2}',
      [
        '== vm-expression ==',
        '0000 Constant 0 ; :b',
        '0002 Constant 1 ; 2',
        '0004 MakeMap ; 1',
        '0006 WithMeta 2 ; {:a 1}',
        '0008 Return',
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
