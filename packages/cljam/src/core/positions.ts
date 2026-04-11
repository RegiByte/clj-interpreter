import { EvaluationError } from './errors'
import { v } from './factories'
import type { CljList, CljValue, Pos, StackFrame } from './types'

export function setPos(val: CljValue, pos: Pos): void {
  Object.defineProperty(val, '_pos', {
    value: pos,
    enumerable: false,
    writable: true,
    configurable: true,
  })
}

export function getPos(val: CljValue): Pos | undefined {
  return (val as unknown as { _pos?: Pos })._pos
}

export function getLineCol(
  source: string,
  offset: number
): { line: number; col: number; lineText: string } {
  const lines = source.split('\n')
  let pos = 0
  for (let i = 0; i < lines.length; i++) {
    const lineEnd = pos + lines[i].length
    if (offset <= lineEnd) {
      return { line: i + 1, col: offset - pos, lineText: lines[i] }
    }
    pos = lineEnd + 1 // +1 for the consumed '\n'
  }
  const last = lines[lines.length - 1]
  return { line: lines.length, col: last.length, lineText: last }
}

export function formatErrorContext(
  source: string,
  pos: Pos,
  opts?: { lineOffset?: number; colOffset?: number }
): string {
  const { line, col, lineText } = getLineCol(source, pos.start)
  const absLine = line + (opts?.lineOffset ?? 0)
  const absCol = line === 1 ? col + (opts?.colOffset ?? 0) : col
  const span = Math.max(1, pos.end - pos.start)
  // Caret uses raw col so it aligns with the displayed lineText snippet.
  const caret = ' '.repeat(col) + '^'.repeat(span)
  return `\n  at line ${absLine}, col ${absCol + 1}:\n  ${lineText}\n  ${caret}`
}

/**
 * Converts a StackFrame array to a Clojure vector of maps.
 * Each frame map has :fn (string or nil), :line, :col, :source.
 * Caller is responsible for ordering (innermost-first convention).
 */
export function framesToClj(frames: StackFrame[]): CljValue {
  return v.vector(
    frames.map((frame) =>
      v.map([
        [v.keyword(':fn'), frame.fnName !== null ? v.string(frame.fnName) : v.nil()],
        [v.keyword(':line'), frame.line !== null ? v.number(frame.line) : v.nil()],
        [v.keyword(':col'), frame.col !== null ? v.number(frame.col) : v.nil()],
        [v.keyword(':source'), frame.source !== null ? v.string(frame.source) : v.nil()],
      ])
    )
  )
}

/**
 * Mutable function to hydrate the inner position of an EvaluationError
 * If the error has an argIndex in its data and no position,
 * if it already has a position stamped, do nothing.
 */
export function maybeHydrateErrorPos(error: unknown, list: CljList) {
  if (
    error instanceof EvaluationError &&
    error.data?.argIndex !== undefined &&
    !error.pos
  ) {
    const argForm = list.value[(error.data.argIndex as number) + 1]
    if (argForm) {
      const pos = getPos(argForm)
      if (pos) error.pos = pos
    }
  }
}
