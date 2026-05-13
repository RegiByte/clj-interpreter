import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { createSession } from '../../session'
import { disassembleChunk } from '../debug'
import { Op } from '../opcodes'
import { compileFnBodyForTest } from './compiler-test-utils'

describe('VM binding compilation', () => {
  it('compiles binding to binding-frame opcodes', () => {
    const chunk = compileFnBodyForTest([], ['(binding [*x* 42] *x*)'])

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.code).toContain(Op.PushBindingFrame)
    expect(chunk.code).toContain(Op.PushDynamicBinding)
    expect(chunk.code).toContain(Op.PopBindingFrame)
    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 PushBindingFrame',
        '0001 Constant 0 ; 42',
        '0003 PushDynamicBinding 1 ; *x*',
        '0005 LoadGlobal 2 ; *x*',
        '0007 PopBindingFrame',
        '0008 Return',
      ].join('\n')
    )
  })

  it('stores bytecodeBody for binding bodies and returns the bound value', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')
    const fn = s.evaluate('(fn [] (binding [*x* :bound] *x*))')

    expect(fn.kind).toBe('function')
    if (fn.kind !== 'function') return

    expect(fn.arities[0].bytecodeBody).toBeDefined()
    expect(s.evaluate('((fn [] (binding [*x* :bound] *x*)))')).toEqual(
      v.keyword(':bound')
    )
  })

  it('restores root value after normal completion', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')

    expect(s.evaluate('((fn [] (binding [*x* :bound] *x*)))')).toEqual(
      v.keyword(':bound')
    )
    expect(s.evaluate('*x*')).toEqual(v.keyword(':root'))
  })

  it('restores dynamic binding when the body throws', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')

    expect(
      s.evaluate(
        '(try ((fn [] (binding [*x* :bound] (throw {:type :boom})))) (catch :boom e *x*))'
      )
    ).toEqual(v.keyword(':root'))
    expect(s.evaluate('*x*')).toEqual(v.keyword(':root'))
  })

  it('restores earlier pushes when later RHS evaluation fails', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')
    s.evaluate('(def ^:dynamic *y* :root-y)')

    expect(() =>
      s.evaluate('((fn [] (binding [*x* :bound *y* (/ 1 0)] *x*)))')
    ).toThrow()
    expect(s.evaluate('[*x* *y*]')).toEqual(
      v.vector([v.keyword(':root'), v.keyword(':root-y')])
    )
  })

  it('restores earlier pushes when later var validation fails', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')
    s.evaluate('(def *not-dynamic* :root-not-dynamic)')

    expect(() =>
      s.evaluate(
        '((fn [] (binding [*x* :bound *not-dynamic* :bad] *x*)))'
      )
    ).toThrow(
      'Cannot use binding with non-dynamic var user/*not-dynamic*. Mark it dynamic with (def ^:dynamic *not-dynamic* ...)'
    )
    expect(s.evaluate('*x*')).toEqual(v.keyword(':root'))
  })

  it('restores nested bindings in LIFO order', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')

    expect(
      s.evaluate(
        '((fn [] (binding [*x* :outer] [(binding [*x* :inner] *x*) *x*])))'
      )
    ).toEqual(v.vector([v.keyword(':inner'), v.keyword(':outer')]))
    expect(s.evaluate('*x*')).toEqual(v.keyword(':root'))
  })

  it('falls back for malformed binding forms', () => {
    expect(compileFnBodyForTest([], ['(binding [:not-symbol 1] 2)'])).toBeNull()
    expect(compileFnBodyForTest([], ['(binding [*x*] 2)'])).toBeNull()
    expect(compileFnBodyForTest([], ['(binding :not-a-vector 2)'])).toBeNull()
  })
})
