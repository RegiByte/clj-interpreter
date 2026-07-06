/**
 * cljam analyzer — faithful AST -> CljValue projection.
 *
 * This is the `ast*` view: a 1:1 map of node fields exposed as cljam data for
 * REPL inspection and (later) self-hosted passes. Every node becomes a map with
 * `:op`, `:form`, `:context`, `:pos`, `:children` (the ordered child-key
 * vector), each child converted recursively, plus the op-specific fields.
 *
 * Kept separate from the human-readable printer (print.ts) on purpose: faithful
 * data here, curated lines there.
 */

import { v } from '../factories'
import type { CljValue, Pos } from '../types'
import type { Upvalue } from './env'
import type { AstNode } from './nodes'

function kw(name: string): CljValue {
  return v.keyword(`:${name}`)
}

function posToClj(pos: Pos | null): CljValue {
  if (pos === null) return v.nil()
  return v.map([
    [kw('start'), v.number(pos.start)],
    [kw('end'), v.number(pos.end)],
  ])
}

function captureToClj(c: Upvalue): CljValue {
  return v.map([
    [kw('name'), v.symbol(c.name)],
    [kw('local?'), v.boolean(c.isLocal)],
    [kw('index'), v.number(c.index)],
  ])
}

function childValue(child: unknown): CljValue {
  if (Array.isArray(child)) {
    return v.vector(child.map((c) => astToClj(c as AstNode)))
  }
  if (child === null || child === undefined) return v.nil()
  return astToClj(child as AstNode)
}

export function astToClj(node: AstNode): CljValue {
  const entries: [CljValue, CljValue][] = [
    [kw('op'), kw(node.op)],
    [kw('form'), node.form],
    [kw('context'), kw(node.env.context)],
    [kw('pos'), posToClj(node.pos)],
    [kw('children'), v.vector(node.children.map((c) => kw(c)))],
  ]

  for (const [key, value] of opFields(node)) entries.push([kw(key), value])

  for (const key of node.children) {
    const child = (node as unknown as Record<string, unknown>)[key]
    entries.push([kw(key), childValue(child)])
  }

  if (node.rawForms !== undefined) {
    entries.push([kw('raw-forms'), v.vector(node.rawForms)])
  }

  return v.map(entries)
}

function opFields(node: AstNode): [string, CljValue][] {
  switch (node.op) {
    case 'const':
      return [
        ['type', kw(node.type)],
        ['val', node.val],
        ['literal?', v.boolean(true)],
      ]
    case 'local': {
      const fields: [string, CljValue][] = [
        ['name', v.symbol(node.name)],
        ['local', kw(node.localKind)],
        ['slot', v.number(node.slot)],
        ['resolved', kw(node.resolved)],
      ]
      if (node.upvalueIndex !== undefined)
        fields.push(['upvalue-index', v.number(node.upvalueIndex)])
      if (node.argId !== undefined)
        fields.push(['arg-id', v.number(node.argId)])
      if (node.variadic !== undefined)
        fields.push(['variadic?', v.boolean(node.variadic)])
      return fields
    }
    case 'var':
      return [
        ['name', v.symbol(node.name)],
        ['ns', node.ns !== null ? v.symbol(node.ns) : v.nil()],
        ['resolved?', v.boolean(node.resolved)],
      ]
    case 'the-var':
      return [
        ['name', v.symbol(node.name)],
        ['ns', node.ns !== null ? v.symbol(node.ns) : v.nil()],
        ['resolved?', v.boolean(node.resolved)],
        [
          'lexical-candidates',
          v.vector(
            node.lexicalCandidates.map((c) =>
              v.map([
                [kw('kind'), kw(c.kind)],
                [kw('slot'), v.number(c.slot)],
              ])
            )
          ),
        ],
      ]
    case 'js-var':
      return [
        ['name', v.symbol(node.name)],
        ['segments', v.vector(node.segments.map((s) => v.string(s)))],
      ]
    case 'host-call':
      return [['method', v.symbol(node.method)]]
    case 'host-field':
      return [
        ['field', v.symbol(node.field)],
        ['assignable?', v.boolean(true)],
      ]
    case 'do':
      return [['body?', v.boolean(node.body)]]
    case 'loop':
      return [['loop-arity', v.number(node.loopArity)]]
    case 'fn':
      return [
        ['name', node.name !== null ? v.symbol(node.name) : v.nil()],
        ['variadic?', v.boolean(node.variadic)],
        ['max-fixed-arity', v.number(node.maxFixedArity)],
        ['captures', v.vector(node.captures.map(captureToClj))],
      ]
    case 'fn-method':
      return [
        ['fixed-arity', v.number(node.fixedArity)],
        ['variadic?', v.boolean(node.variadic)],
      ]
    case 'recur':
      return [
        [
          'target-kind',
          node.targetKind !== null ? kw(node.targetKind) : v.nil(),
        ],
        [
          'target-arity',
          node.targetArity !== null ? v.number(node.targetArity) : v.nil(),
        ],
      ]
    case 'def': {
      const fields: [string, CljValue][] = [
        ['name', v.symbol(node.name)],
        ['ns', node.ns !== null ? v.symbol(node.ns) : v.nil()],
      ]
      if (node.doc !== null) fields.push(['doc', v.string(node.doc)])
      if (node.isMacro) fields.push(['macro?', v.boolean(true)])
      return fields
    }
    case 'binding': {
      const fields: [string, CljValue][] = [
        ['name', v.symbol(node.name)],
        ['local', kw(node.localKind)],
        ['slot', v.number(node.slot)],
        ['captured?', v.boolean(node.binding.cell.captured)],
      ]
      if (node.argId !== undefined)
        fields.push(['arg-id', v.number(node.argId)])
      if (node.variadic !== undefined)
        fields.push(['variadic?', v.boolean(node.variadic)])
      return fields
    }
    case 'quote':
      return [['literal?', v.boolean(true)]]
    case 'ns':
      return [
        [
          'docstring',
          node.docstring !== null ? v.string(node.docstring) : v.nil(),
        ],
      ]
    case 'invalid':
      return [
        ['message', v.string(node.message)],
        ['kind', kw(node.kind)],
      ]
    default:
      return []
  }
}
