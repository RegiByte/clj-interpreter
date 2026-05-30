/**
 * Analyzer <-> VM slot-parity gate (Item 5).
 *
 * The analyzer is the authority on slot *assignment*, but it must honor the
 * runtime frame *contract* the VM already implements: each arity numbers its
 * frame from 0, params land in slots 0..n-1 (rest at n), and a named fn's self
 * binding sits AFTER the params (so the self slot differs per arity). These
 * tests drive the same `fn*` forms through both the analyzer and the VM compiler
 * and assert the layouts agree, which is what lets the future Phase-1 compiler
 * read slots straight from the IR.
 */

import { describe, expect, it } from 'vitest'
import { makeEnv } from '../../env'
import { createEvaluationContext } from '../../evaluator'
import {
  compileFnBodyForTest,
  formToNode,
} from '../../vm/__tests__/compiler-test-utils'
import { analyzeForm } from '../index'
import type { FnNode, FnMethodNode } from '../nodes'

function analyzeFnForm(code: string): FnNode {
  const { node } = analyzeForm(
    formToNode(code),
    makeEnv(),
    createEvaluationContext()
  )
  if (node.op !== 'fn') throw new Error(`expected fn node, got ${node.op}`)
  return node
}

/** The fn's per-arity template chunks as the VM compiles them. */
function vmArityChunks(code: string) {
  const chunk = compileFnBodyForTest([], [code])
  if (chunk === null) throw new Error(`vm compile returned null for ${code}`)
  const template = chunk.innerFunctions[0]
  if (template === undefined) throw new Error('no inner function template')
  return template.arities.map((a) => a.chunk)
}

/** Slots the analyzer assigned to a method's params, in order (rest included). */
function paramSlots(method: FnMethodNode): number[] {
  return method.params.map((p) => p.slot)
}

/** Analyzer self slot, or null when no self binding was declared. */
function selfSlot(method: FnMethodNode): number | null {
  return method.self === null ? null : method.self.slot
}

describe('analyzer/VM slot parity — params and self', () => {
  it('single-param named fn: params at 0, self after params', () => {
    const fn = analyzeFnForm('(fn* my-name [x] my-name)')
    const [vm] = vmArityChunks('(fn* my-name [x] my-name)')

    expect(paramSlots(fn.methods[0])).toEqual([0])
    expect(selfSlot(fn.methods[0])).toBe(1)
    // Matches the VM frame contract.
    expect(selfSlot(fn.methods[0])).toBe(vm.selfSlot)
  })

  it('variadic named fn: fixed at 0, rest at 1, self at 2', () => {
    const fn = analyzeFnForm('(fn* my-name [x & rest] my-name)')
    const [vm] = vmArityChunks('(fn* my-name [x & rest] my-name)')

    expect(paramSlots(fn.methods[0])).toEqual([0, 1])
    expect(selfSlot(fn.methods[0])).toBe(2)
    expect(selfSlot(fn.methods[0])).toBe(vm.selfSlot)
  })

  it('anonymous fn: no self binding (VM selfSlot === -1)', () => {
    const fn = analyzeFnForm('(fn* [x] x)')
    const [vm] = vmArityChunks('(fn* [x] x)')

    expect(paramSlots(fn.methods[0])).toEqual([0])
    expect(selfSlot(fn.methods[0])).toBeNull()
    expect(vm.selfSlot).toBe(-1)
  })

  it('a param shadows the self-name: no self binding (VM selfSlot === -1)', () => {
    const fn = analyzeFnForm('(fn* x [x] x)')
    const [vm] = vmArityChunks('(fn* x [x] x)')

    expect(paramSlots(fn.methods[0])).toEqual([0])
    expect(selfSlot(fn.methods[0])).toBeNull()
    expect(vm.selfSlot).toBe(-1)
  })

  it('multi-arity named fn: each arity numbers from 0, self after that arity params', () => {
    const code = '(fn* sum* ([n] (sum* n 0)) ([n acc] (sum* n acc)))'
    const fn = analyzeFnForm(code)
    const vm = vmArityChunks(code)

    // Arity [n]: n->0, self->1
    expect(paramSlots(fn.methods[0])).toEqual([0])
    expect(selfSlot(fn.methods[0])).toBe(1)
    expect(selfSlot(fn.methods[0])).toBe(vm[0].selfSlot)

    // Arity [n acc]: n->0, acc->1, self->2 (slot space reset, NOT climbing)
    expect(paramSlots(fn.methods[1])).toEqual([0, 1])
    expect(selfSlot(fn.methods[1])).toBe(2)
    expect(selfSlot(fn.methods[1])).toBe(vm[1].selfSlot)
  })
})

describe('analyzer/VM slot parity — self captured by a nested closure', () => {
  // The whole point of per-arity self slots: when a nested fn captures the
  // self-name, the upvalue descriptor's `index` is the owner's per-arity slot.
  const code = '(fn* foo ([x] (fn* [] foo)) ([x y] (fn* [] foo)))'

  function innerCaptures(method: FnMethodNode) {
    const ret = method.body.ret
    if (ret.op !== 'fn') throw new Error(`expected inner fn, got ${ret.op}`)
    return ret.captures
  }

  it('analyzer: inner fn captures self at the owner arity slot (1, then 2)', () => {
    const fn = analyzeFnForm(code)

    expect(innerCaptures(fn.methods[0])).toEqual([
      { name: 'foo', isLocal: true, index: 1 },
    ])
    expect(innerCaptures(fn.methods[1])).toEqual([
      { name: 'foo', isLocal: true, index: 2 },
    ])
  })

  it('VM agrees: the nested closure upvalue index is the per-arity self slot', () => {
    const vm = vmArityChunks(code)

    expect(vm[0].innerFunctions[0].upvalueDescriptors).toEqual([
      { isLocal: true, index: 1 },
    ])
    expect(vm[1].innerFunctions[0].upvalueDescriptors).toEqual([
      { isLocal: true, index: 2 },
    ])
  })
})
