import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { createSession } from '../../session'
import { disassembleChunk } from '../debug'
import { Op } from '../opcodes'
import { compileFnBodyForTest } from './compiler-test-utils'

describe('VM set! compilation', () => {
  it('compiles (set! sym expr) to SetDynamic', () => {
    const chunk = compileFnBodyForTest(
      [],
      ['(binding [*x* 1] (set! *x* 2))']
    )

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(chunk.code).toContain(Op.SetDynamic)
    expect(disassembleChunk(chunk)).toBe(
      [
        '== vm-fn-body ==',
        '0000 PushBindingFrame',
        '0001 Constant 0 ; 1',
        '0003 PushDynamicBinding 1 ; *x*',
        '0005 Constant 2 ; 2',
        '0007 SetDynamic 3 ; *x*',
        '0009 PopBindingFrame',
        '0010 Return',
      ].join('\n')
    )
  })

  it('returns the new value from set!', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')

    expect(
      s.evaluate('((fn [] (binding [*x* :old] (set! *x* :new))))')
    ).toEqual(v.keyword(':new'))
  })

  it('changes the innermost dynamic binding, not the root', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')

    s.evaluate('((fn [] (binding [*x* :bound] (set! *x* :mutated))))')
    expect(s.evaluate('*x*')).toEqual(v.keyword(':root'))
  })

  it('set! in inner binding only mutates the innermost entry', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')

    expect(
      s.evaluate(
        '((fn [] (binding [*x* :outer] (binding [*x* :inner] (set! *x* :mutated)) *x*)))'
      )
    ).toEqual(v.keyword(':outer'))
  })

  it('reads the mutated value inside the binding body', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')

    expect(
      s.evaluate('((fn [] (binding [*x* :old] (set! *x* :new) *x*)))')
    ).toEqual(v.keyword(':new'))
  })

  it('restores root value after binding with set! exits normally', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')

    s.evaluate('((fn [] (binding [*x* :bound] (set! *x* :mutated))))')
    expect(s.evaluate('*x*')).toEqual(v.keyword(':root'))
  })

  it('restores root value after binding with set! exits via throw', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')

    s.evaluate(
      '(try ((fn [] (binding [*x* :bound] (set! *x* :mutated) (throw {:type :boom})))) (catch :boom _ nil))'
    )
    expect(s.evaluate('*x*')).toEqual(v.keyword(':root'))
  })

  it('errors when there is no active binding for the var', () => {
    const s = createSession()
    s.evaluate('(def ^:dynamic *x* :root)')

    expect(() => s.evaluate('((fn [] (set! *x* :new)))')).toThrow(
      'no active binding'
    )
  })

  it('errors when the target var is not dynamic', () => {
    const s = createSession()
    s.evaluate('(def *not-dynamic* :root)')

    expect(() =>
      s.evaluate('((fn [] (binding [*x* 1] (set! *not-dynamic* :new))))')
    ).toThrow()
  })

  it('errors when the target symbol does not resolve to a var', () => {
    const s = createSession()

    expect(() =>
      s.evaluate('((fn [] (binding [*x* 1] (set! *undefined-var* :new))))')
    ).toThrow()
  })

  it('falls back for non-symbol set! target', () => {
    expect(compileFnBodyForTest([], ['(set! 42 :new)'])).toBeNull()
    expect(compileFnBodyForTest([], ['(set! (+ 1 2) :new)'])).toBeNull()
  })

  it('falls back for local/param set! target', () => {
    // Local bindings are immutable; VM falls back so interpreter can error
    expect(compileFnBodyForTest(['x'], ['(set! x 99)'])).toBeNull()
  })

  it('falls back for malformed set! arity', () => {
    expect(compileFnBodyForTest([], ['(set!)'])).toBeNull()
    expect(compileFnBodyForTest([], ['(set! *x*)'])).toBeNull()
    expect(compileFnBodyForTest([], ['(set! *x* 1 2)'])).toBeNull()
  })
})
