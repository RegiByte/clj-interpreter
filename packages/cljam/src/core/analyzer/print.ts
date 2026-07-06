/**
 * cljam analyzer — generic IR printer (human-readable).
 *
 * Drives traversal off each node's `children` list (the same convention the
 * future passes use; cf. `cljs.analyzer.passes/walk`). Each node prints a short
 * header summarizing its `op` and key scalar fields, then indents its children
 * under their field names. A `<tail>` marker flags nodes in return position so
 * tail placement is visible at a glance, and `fn` nodes print their `captures`
 * set so the RB-007 shape is legible before execution.
 *
 * This is the `analyze*` view. The faithful data view lives in ast-to-clj.ts.
 */

import { printString } from '../printer'
import type { AstNode } from './nodes'

export function printAst(node: AstNode): string[] {
  const out: string[] = []
  emit(node, 0, out)
  return out
}

function indent(depth: number): string {
  return '  '.repeat(depth)
}

function tailMark(node: AstNode): string {
  return node.env.context === 'return' ? ' <tail>' : ''
}

function header(node: AstNode): string {
  switch (node.op) {
    case 'const':
      return `:const ${node.type} ${printString(node.val)}`
    case 'quote':
      return ':quote'
    case 'vector':
      return ':vector'
    case 'map':
      return ':map'
    case 'set':
      return ':set'
    case 'local': {
      const up =
        node.resolved === 'upvalue' ? `:upvalue#${node.upvalueIndex}` : ':local'
      return `:local ${node.name} slot=${node.slot} ${up}`
    }
    case 'var':
      return `:var ${node.ns ? `${node.ns}/` : ''}${node.name} ${node.resolved ? 'resolved' : 'unresolved'}`
    case 'the-var': {
      const cands =
        node.lexicalCandidates.length > 0
          ? ` lexical=[${node.lexicalCandidates.map((c) => `${c.kind}#${c.slot}`).join(' ')}]`
          : ''
      return `:the-var ${node.ns ? `${node.ns}/` : ''}${node.name}${cands}`
    }
    case 'js-var':
      return `:js-var ${node.name}`
    case 'host-call':
      return `:host-call .${node.method}`
    case 'host-field':
      return `:host-field .-${node.field}`
    case 'new':
      return ':new'
    case 'do':
      return node.body ? ':do <body>' : ':do'
    case 'if':
      return ':if'
    case 'let':
      return ':let'
    case 'loop':
      return `:loop arity=${node.loopArity}`
    case 'letfn':
      return ':letfn'
    case 'fn': {
      const name = node.name ? ` "${node.name}"` : ' <anonymous>'
      const caps =
        node.captures.length > 0
          ? ` captures=[${node.captures.map((c) => c.name).join(' ')}]`
          : ''
      const variadic = node.variadic ? ' variadic' : ''
      return `:fn${name}${caps}${variadic} max-fixed=${node.maxFixedArity}`
    }
    case 'fn-method':
      return `:fn-method fixed=${node.fixedArity}${node.variadic ? ' variadic' : ''}`
    case 'invoke':
      return ':invoke'
    case 'recur':
      return `:recur target=${node.targetKind ?? 'none'}/${node.targetArity ?? '?'}`
    case 'throw':
      return ':throw'
    case 'try':
      return ':try'
    case 'catch':
      return ':catch'
    case 'def':
      return `:def ${node.name}${node.isMacro ? ' <macro>' : ''}`
    case 'binding': {
      const captured = node.binding.cell.captured ? ' captured' : ''
      return `:binding ${node.name} :${node.localKind} slot=${node.slot}${captured}`
    }
    case 'async': {
      const caps =
        node.captures.length > 0
          ? ` captures=[${node.captures.map((c) => c.name).join(' ')}]`
          : ''
      return `:async${caps}`
    }
    case 'dynamic':
      return ':dynamic'
    case 'set!':
      return ':set!'
    case 'invalid':
      return `:invalid (${node.kind}) ${node.message}`
  }
}

function emit(node: AstNode, depth: number, out: string[]): void {
  out.push(`${indent(depth)}${header(node)}${tailMark(node)}`)

  const rawForms = node.rawForms
  if (rawForms !== undefined && rawForms.length > 1) {
    // Show the original (pre-expansion) form so macroexpansion is traceable.
    out.push(`${indent(depth + 1)}; expanded-from ${printString(rawForms[0])}`)
  }

  for (const key of node.children) {
    const child = (node as unknown as Record<string, unknown>)[key]
    if (Array.isArray(child)) {
      if (child.length === 0) continue
      out.push(`${indent(depth + 1)}:${key}`)
      for (const c of child) emit(c as AstNode, depth + 2, out)
    } else if (child !== null && child !== undefined) {
      out.push(`${indent(depth + 1)}:${key}`)
      emit(child as AstNode, depth + 2, out)
    }
  }
}
