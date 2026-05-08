import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { tokenize } from '../../tokenizer'
import { readForms } from '../../reader'
import type { CljValue } from '../../types'
import { executeChunk } from '../vm'
import { define, makeEnv } from '../../env'
import { createEvaluationContext } from '../../evaluator'
import { compileVm } from '../compiler'
import { disassembleChunk } from '../debug'
import { jsToClj } from '../../conversions'
import { printString } from '../../printer'

const formToNode = (code: string) =>
  readForms(tokenize(code), 'user', new Map())[0] as CljValue

function expectVmCompilesTo(code: string, expected: unknown) {
  const node = formToNode(code)
  const chunk = compileVm(node)

  expect(chunk).not.toBeNull()
  if (chunk === null) return

  const result = executeChunk(chunk, makeEnv(), createEvaluationContext())
  expect(result).toEqual(expected)
}

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

  return env
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

  it.each(['[1 2]', '{:a 1}', '#{1}'])(
    'returns null for unsupported form %s',
    (code) => {
      expect(compileVm(formToNode(code))).toBeNull()
    }
  )
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
  it.each(['foo/bar', 'js/Math'])(
    'still falls back for qualified symbol %s',
    (code) => {
      expect(compileVm(formToNode(code))).toBeNull()
    }
  )
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
    expect(compileVm(formToNode('(do 1 [2 3])'))).toBeNull()
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
  ])('executes compiled call inside surrounding form %s', (code, expected) => {
    expectVmCallCompilesTo(code, expected)
  })

  it.each([
    ['([1 2] 0)', 'unsupported callee expression'],
    ['(+ 1 [2 3])', 'unsupported argument expression'],
    ['(+ 1 foo/bar)', 'unsupported qualified argument symbol'],
  ])('falls back for %s: %s', (code) => {
    expect(compileVm(formToNode(code))).toBeNull()
  })
})
