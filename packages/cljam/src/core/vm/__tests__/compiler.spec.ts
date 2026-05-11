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

  const result = executeChunk(
    chunk,
    makeCallTestEnv(),
    createEvaluationContext()
  )
  expect(result).toEqual(expected)
}

function expectVmCallCompilesTo(code: string, expected: CljValue) {
  const node = formToNode(code)
  const chunk = compileVm(node)

  expect(chunk).not.toBeNull()
  if (chunk === null) return

  const result = executeChunk(
    chunk,
    makeCallTestEnv(),
    createEvaluationContext()
  )
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

  const result = executeChunk(
    chunk,
    makeCallTestEnv(),
    createEvaluationContext(),
    locals
  )

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

    expect(executeChunk(chunk, env, createEvaluationContext())).toEqual(
      v.number(42)
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

    expect(executeChunk(chunk, env, ctx)).toEqual(v.number(42))
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

    expect(executeChunk(chunk, makeEnv(), ctx)).toEqual(v.number(1))

    answer.value = v.number(2)

    expect(executeChunk(chunk, makeEnv(), ctx)).toEqual(v.number(2))
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

    expect(executeChunk(chunk, env, ctx)).toEqual(
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
      executeChunk(chunk, makeCallTestEnv(), createEvaluationContext(), [
        v.number(10),
        v.number(20),
      ])
    ).toEqual(v.number(20))
  })

  it('compiles calls that read parameter locals', () => {
    const chunk = compileFnBodyForTest(['x'], ['(+ x 2)'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 LoadGlobal 0 ; +',
        '0002 LoadLocal 0',
        '0004 Constant 1 ; 2',
        '0006 Call 2',
        '0008 Return',
      ].join('\n')
    )

    expect(
      executeChunk(chunk, makeCallTestEnv(), createEvaluationContext(), [
        v.number(40),
      ])
    ).toEqual(v.number(42))
  })

  it('compiles multi-form function bodies with Pop between forms', () => {
    const chunk = compileFnBodyForTest(['x'], ['(+ x 1)', '(+ x 2)'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 LoadGlobal 0 ; +',
        '0002 LoadLocal 0',
        '0004 Constant 1 ; 1',
        '0006 Call 2',
        '0008 Pop',
        '0009 LoadGlobal 2 ; +',
        '0011 LoadLocal 0',
        '0013 Constant 3 ; 2',
        '0015 Call 2',
        '0017 Return',
      ].join('\n')
    )

    expect(
      executeChunk(chunk, makeCallTestEnv(), createEvaluationContext(), [
        v.number(40),
      ])
    ).toEqual(v.number(42))
  })

  it.each([
    ['fn*', '(fn* [y] y)'],
    ['loop*', '(loop* [y x] y)'],
    ['recur', '(recur x)'],
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

  it('falls back for rest params until rest locals are explicitly modeled', () => {
    expect(
      compileFnBodyForTest(['x'], ['x'], { restParam: 'more' })
    ).toBeNull()
  })

  it('compiles let* by allocating slots after params', () => {
    const chunk = compileFnBodyForTest(['x'], ['(let* [y (+ x 1)] y)'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.localCount).toBe(2)
    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 LoadGlobal 0 ; +',
        '0002 LoadLocal 0',
        '0004 Constant 1 ; 1',
        '0006 Call 2',
        '0008 StoreLocal 1',
        '0010 LoadLocal 1',
        '0012 Return',
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
        '0000 LoadGlobal 0 ; +',
        '0002 LoadLocal 0',
        '0004 Constant 1 ; 1',
        '0006 Call 2',
        '0008 StoreLocal 1',
        '0010 LoadGlobal 2 ; +',
        '0012 LoadLocal 1',
        '0014 Constant 3 ; 1',
        '0016 Call 2',
        '0018 StoreLocal 2',
        '0020 LoadLocal 2',
        '0022 Return',
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
        '0000 LoadGlobal 0 ; +',
        '0002 LoadLocal 0',
        '0004 Constant 1 ; 1',
        '0006 Call 2',
        '0008 StoreLocal 1',
        '0010 LoadLocal 1',
        '0012 Pop',
        '0013 LoadLocal 0',
        '0015 Return',
      ].join('\n')
    )

    expect(
      executeChunk(chunk, makeCallTestEnv(), createEvaluationContext(), [
        v.number(41),
        v.nil(),
      ])
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
    [
      'local shadowing',
      '((fn [x] (let* [x (+ x 1)] x)) 41)',
      v.number(42),
    ],
    [
      'shadowing does not leak',
      '((fn [x] (let* [x (+ x 1)] x) x) 41)',
      v.number(41),
    ],
  ])('evaluates let* function body with %s', (_label, code, expected) => {
    expect(createSession().evaluate(code)).toEqual(expected)
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

    expect(executeChunk(chunk, env, createEvaluationContext())).toEqual(
      v.number(42)
    )
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
  it('compiles (+ 1 2) to Call plus Return', () => {
    const chunk = compileVm(formToNode('(+ 1 2)'))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-expression ==',
        '0000 LoadGlobal 0 ; +',
        '0002 Constant 1 ; 1',
        '0004 Constant 2 ; 2',
        '0006 Call 2',
        '0008 Return',
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

    expect(executeChunk(chunk, env, createEvaluationContext())).toEqual(
      v.number(3)
    )
  })

  it.each([
    ['(+)', v.number(0)],
    ['(+ 1)', v.number(1)],
    ['(+ 1 2 3)', v.number(6)],
    ['(- 10 3)', v.number(7)],
    ['(forty-two)', v.number(42)],
  ])('executes compiled call expression %s', (code, expected) => {
    expectVmCallCompilesTo(code, expected)
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
        '0000 LoadGlobal 0 ; +',
        '0002 Constant 1 ; 1',
        '0004 Constant 2 ; 2',
        '0006 Call 2',
        '0008 MakeVector ; 1',
        '0010 Return',
      ],
    ],
    [
      '[:a (+ 1 2) :b (- 10 3)]',
      [
        '== vm-expression ==',
        '0000 Constant 0 ; :a',
        '0002 LoadGlobal 1 ; +',
        '0004 Constant 2 ; 1',
        '0006 Constant 3 ; 2',
        '0008 Call 2',
        '0010 Constant 4 ; :b',
        '0012 LoadGlobal 5 ; -',
        '0014 Constant 6 ; 10',
        '0016 Constant 7 ; 3',
        '0018 Call 2',
        '0020 MakeVector ; 4',
        '0022 Return',
      ],
    ],
    [
      '{:a 1 :b (+ 2 3)}',
      [
        '== vm-expression ==',
        '0000 Constant 0 ; :a',
        '0002 Constant 1 ; 1',
        '0004 Constant 2 ; :b',
        '0006 LoadGlobal 3 ; +',
        '0008 Constant 4 ; 2',
        '0010 Constant 5 ; 3',
        '0012 Call 2',
        '0014 MakeMap ; 2',
        '0016 Return',
      ],
    ],
    [
      '#{1 (+ 1 2)}',
      [
        '== vm-expression ==',
        '0000 Constant 0 ; 1',
        '0002 LoadGlobal 1 ; +',
        '0004 Constant 2 ; 1',
        '0006 Constant 3 ; 2',
        '0008 Call 2',
        '0010 MakeSet ; 2',
        '0012 Return',
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
