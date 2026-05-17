import { describe, expect, it } from 'vitest'
import { is } from '../assertions'
import { createSession } from '../session'
import type { CljValue, CljVector } from '../types'
import { v } from '../factories'

function disassemble(code: string): string[] | null {
  const result = createSession().evaluate(code)
  if (is.nil(result)) return null
  if (!is.vector(result)) {
    throw new Error(`expected vector or nil, got ${result.kind}`)
  }
  return strings(result)
}

function strings(value: CljVector): string[] {
  return value.value.map((line) => {
    if (!is.string(line)) {
      throw new Error(`expected string line, got ${line.kind}`)
    }
    return line.value
  })
}

function expectStringVector(value: CljValue): string[] {
  if (!is.vector(value)) throw new Error(`expected vector, got ${value.kind}`)
  return strings(value)
}

function joined(lines: string[] | null): string {
  if (lines === null) throw new Error('expected disassembly lines, got nil')
  return lines.join('\n')
}

function expectLines(lines: string[] | null): string[] {
  if (lines === null) throw new Error('expected disassembly lines, got nil')
  return lines
}

describe('disassemble*', () => {
  it('returns expression bytecode lines without executing the expression result', () => {
    const result = expectLines(disassemble('(disassemble* (+ 1 (* 2 3)))'))

    expect(result).toContain('== expression ==')
    expect(joined(result)).toContain('Mul 2')
    expect(joined(result)).toContain('Add 2')
    expect(result.some((line) => line.endsWith('Return'))).toBe(true)
  })

  it('returns nil for non-compilable expressions', () => {
    expect(disassemble('(disassemble* (async 42))')).toBeNull()
  })

  it('includes generated closure arity bytecode for inline function expressions', () => {
    const result = disassemble('(disassemble* (fn [x] (+ x 1)))')
    const text = joined(result)

    expect(result).not.toBeNull()
    expect(result).toContain('== expression ==')
    expect(result).toContain('')
    expect(text).toContain('Closure 0')
    expect(result).toContain('== expression/fn[0]/arity[0] [x] ==')
    expect(text).toContain('LoadLocal 0')
    expect(text).toContain('Constant 0 ; 1')
    expect(text).toContain('Add 2')
  })

  it('does not call inline function bodies while disassembling them', () => {
    const result = disassemble('(disassemble* (fn [] (/ 1 0)))')

    expect(result).not.toBeNull()
    expect(result).toContain('== expression/fn[0]/arity[0] [] ==')
    expect(joined(result)).toContain('Div 2')
  })

  it('includes nested closure upvalue bytecode', () => {
    const result = disassemble('(disassemble* (let [x 10] (fn [] x)))')

    expect(result).not.toBeNull()
    expect(result).toContain('== expression ==')
    expect(joined(result)).toContain('Closure 0')
    expect(result).toContain('== expression/fn[0]/arity[0] [] ==')
    expect(joined(result)).toContain('LoadUpvalue 0')
  })

  it('disassembles bytecode-backed function vars and bare symbols', () => {
    const session = createSession()

    session.evaluate('(defn f [x] (+ x 1))')

    const viaVar = expectStringVector(session.evaluate("(disassemble* #'f)"))
    const viaSymbol = expectStringVector(session.evaluate('(disassemble* f)'))

    expect(viaVar).toContain('== user/f/arity[0] [x] ==')
    expect(joined(viaVar)).toContain('Add 2')
    expect(viaSymbol).toEqual(viaVar)
  })

  it('disassembles every bytecode-backed arity for multi-arity functions', () => {
    const session = createSession()

    session.evaluate('(defn multi ([x] (+ x 1)) ([x y] (+ x y)))')
    const result = expectStringVector(session.evaluate('(disassemble* multi)'))

    expect(result).toContain('== user/multi/arity[0] [x] ==')
    expect(result).toContain('== user/multi/arity[1] [x y] ==')
  })

  it('disassembles bytecode-backed macro vars', () => {
    const session = createSession()

    session.evaluate('(defmacro one [] 1)')
    const result = expectStringVector(session.evaluate("(disassemble* #'one)"))

    expect(result).toContain('== user/one/arity[0] [] ==')
    expect(joined(result)).toContain('Constant 0 ; 1')
  })

  it('returns nil for native and non-bytecode values', () => {
    const session = createSession()

    session.evaluate('(def not-bytecode 1)')

    expect(session.evaluate('(disassemble* +)')).toEqual(v.nil())
    expect(session.evaluate('(disassemble* not-bytecode)')).toEqual(v.nil())
  })
})
