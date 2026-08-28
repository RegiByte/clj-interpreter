/**
 * P2 gate: `(var <local>)` lexical-candidate resolution in the analyzer.
 *
 * For each form we pin the `the-var` node's `lexicalCandidates` explicitly,
 * and cross-check that the ir-compiler wires exactly those candidates into
 * the emitted chunk's `lexicalVarLookups` (the LoadLexicalVar plumbing).
 *
 * All forms use `let*`/`fn*` directly so they work with a bare `makeEnv()` env
 * (no macros needed).
 */

import { describe, expect, it } from 'vitest'
import { makeEnv } from '../../env'
import { createEvaluationContext } from '../../evaluator'
import {
  formToNode,
  tryCompileVm,
} from '../../vm/__tests__/compiler-test-utils'
import { analyzeForm } from '../index'
import type {
  FnNode,
  InvokeNode,
  LetNode,
  TheVarNode,
} from '../nodes'

function analyze(code: string) {
  return analyzeForm(formToNode(code), makeEnv(), createEvaluationContext())
}

function chunkCandidates(code: string, lookupIndex = 0) {
  const result = tryCompileVm(formToNode(code))
  if (!result.ok) throw new Error(`ir compile failed: ${result.reason}`)
  const lookup = result.chunk.lexicalVarLookups[lookupIndex]
  if (lookup === undefined)
    throw new Error(`no lexicalVarLookups[${lookupIndex}]`)
  return lookup.candidates
}

/** Candidates from the first `(var ...)` inside the first inner fn's first arity. */
function innerFnChunkCandidates(code: string, lookupIndex = 0) {
  const result = tryCompileVm(formToNode(code))
  if (!result.ok) throw new Error(`ir compile failed: ${result.reason}`)
  const template = result.chunk.innerFunctions[0]
  if (template === undefined) throw new Error('no innerFunctions[0]')
  const arity = template.arities[0]
  if (arity === undefined) throw new Error('no arities[0]')
  const lookup = arity.chunk.lexicalVarLookups[lookupIndex]
  if (lookup === undefined)
    throw new Error(`inner fn: no lexicalVarLookups[${lookupIndex}]`)
  return lookup.candidates
}

describe('analyzer / (var x) lexical candidates', () => {
  it('(let* [f (var +)] (var f)) — one local candidate for f', () => {
    const { node } = analyze('(let* [f (var +)] (var f))')
    expect(node.op).toBe('let')
    const varNode = (node as LetNode).body.ret as TheVarNode
    expect(varNode.op).toBe('the-var')
    expect(varNode.name).toBe('f')

    const expected = chunkCandidates('(let* [f (var +)] (var f))')
    expect(varNode.lexicalCandidates).toEqual(expected)
    expect(varNode.lexicalCandidates).toEqual([{ kind: 'local', slot: 0 }])
  })

  it('(let* [x :not-var] (var x)) — one local candidate for x', () => {
    const { node } = analyze('(let* [x :not-var] (var x))')
    const varNode = (node as LetNode).body.ret as TheVarNode
    expect(varNode.op).toBe('the-var')

    const expected = chunkCandidates('(let* [x :not-var] (var x))')
    expect(varNode.lexicalCandidates).toEqual(expected)
    expect(varNode.lexicalCandidates).toEqual([{ kind: 'local', slot: 0 }])
  })

  it('nested let* shadows — two local candidates innermost-first', () => {
    const code = '(let* [x (var +)] (let* [x :not-var] (var x)))'
    const { node } = analyze(code)
    const outer = node as LetNode
    const inner = outer.body.ret as LetNode
    const varNode = inner.body.ret as TheVarNode
    expect(varNode.op).toBe('the-var')

    const expected = chunkCandidates(code)
    expect(varNode.lexicalCandidates).toEqual(expected)
    expect(varNode.lexicalCandidates).toEqual([
      { kind: 'local', slot: 1 },
      { kind: 'local', slot: 0 },
    ])
  })

  it('inner fn captures x — one upvalue candidate', () => {
    const code = '(let* [x (var +)] ((fn* [] (var x))))'
    const { node } = analyze(code)
    const outer = node as LetNode
    const invoke = outer.body.ret as InvokeNode
    const fn = invoke.fn as FnNode
    const varNode = fn.methods[0].body.ret as TheVarNode
    expect(varNode.op).toBe('the-var')

    const expected = innerFnChunkCandidates(code)
    expect(varNode.lexicalCandidates).toEqual(expected)
    expect(varNode.lexicalCandidates).toEqual([{ kind: 'upvalue', slot: 0 }])

    // Confirm the fn recorded an upvalue descriptor for x.
    expect(fn.captures).toEqual([{ name: 'x', isLocal: true, index: 0 }])
  })

  it('qualified (var clojure.core/+) — empty candidates', () => {
    const { node } = analyze('(var clojure.core/+)')
    expect(node.op).toBe('the-var')
    const varNode = node as TheVarNode
    expect(varNode.lexicalCandidates).toEqual([])
  })

  it('top-level (var x) with no local in scope — empty candidates', () => {
    const { node } = analyze('(var x)')
    expect(node.op).toBe('the-var')
    const varNode = node as TheVarNode
    expect(varNode.lexicalCandidates).toEqual([])
  })
})
