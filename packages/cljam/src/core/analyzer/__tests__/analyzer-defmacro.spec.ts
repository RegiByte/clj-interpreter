/**
 * Analyzer — defmacro special form.
 *
 * Verifies that `defmacro` is dispatched as a special form (not analyzed as a
 * plain invoke), produces a `def` node with `isMacro === true`, and that its
 * `init` is the anonymous `fn*` the analyzer synthesizes from the arity forms.
 */

import { describe, expect, it } from 'vitest'
import { makeEnv } from '../../env'
import { createEvaluationContext } from '../../evaluator'
import { formToNode } from '../../vm/__tests__/compiler-test-utils'
import { analyzeForm } from '../index'
import type { DefNode, FnNode } from '../nodes'

function analyzeDefmacro(code: string): { def: DefNode; fn: FnNode } {
  const { node, errors } = analyzeForm(
    formToNode(code),
    makeEnv(),
    createEvaluationContext()
  )
  expect(errors, 'expected no analysis errors').toHaveLength(0)
  if (node.op !== 'def') throw new Error(`expected def node, got ${node.op}`)
  if (node.init === null || node.init.op !== 'fn')
    throw new Error(`expected fn init, got ${node.init?.op ?? 'null'}`)
  return { def: node, fn: node.init }
}

describe('analyzer — defmacro', () => {
  it('single-arity: produces a def node with isMacro true', () => {
    const { def } = analyzeDefmacro('(defmacro m [x] x)')
    expect(def.op).toBe('def')
    expect(def.name).toBe('m')
    expect(def.isMacro).toBe(true)
  })

  it('single-arity: init is an anonymous fn node with one method', () => {
    const { fn } = analyzeDefmacro('(defmacro m [x] x)')
    expect(fn.op).toBe('fn')
    expect(fn.name).toBeNull()
    expect(fn.methods).toHaveLength(1)
    expect(fn.methods[0].fixedArity).toBe(1)
    expect(fn.methods[0].variadic).toBe(false)
  })

  it('multi-arity: init fn has the right number of methods', () => {
    const { def, fn } = analyzeDefmacro('(defmacro m ([x] x) ([x y] x))')
    expect(def.isMacro).toBe(true)
    expect(fn.methods).toHaveLength(2)
    expect(fn.methods[0].fixedArity).toBe(1)
    expect(fn.methods[1].fixedArity).toBe(2)
  })

  it('docstring is captured in the def node and does not become an arity', () => {
    const { def, fn } = analyzeDefmacro(
      '(defmacro m "does something" [x] x)'
    )
    expect(def.doc).toBe('does something')
    expect(fn.methods).toHaveLength(1)
  })

  it('synthesized fn has no self-binding (anonymous, not named)', () => {
    const { fn } = analyzeDefmacro('(defmacro m [x] x)')
    expect(fn.name).toBeNull()
    // No self binding on the single method.
    expect(fn.methods[0].self).toBeNull()
  })

  it('children includes init', () => {
    const { def } = analyzeDefmacro('(defmacro m [x] x)')
    expect(def.children).toContain('init')
  })

  it('ns is set from the current namespace', () => {
    const { def } = analyzeDefmacro('(defmacro m [x] x)')
    expect(typeof def.ns).toBe('string')
  })

  it('variadic arity: fn is variadic', () => {
    const { fn } = analyzeDefmacro('(defmacro m [x & more] x)')
    expect(fn.variadic).toBe(true)
    expect(fn.methods[0].variadic).toBe(true)
  })
})
