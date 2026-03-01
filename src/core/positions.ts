import type { CljValue, Pos } from './types'

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

export function formatErrorContext(source: string, pos: Pos): string {
  const { line, col, lineText } = getLineCol(source, pos.start)
  const span = Math.max(1, pos.end - pos.start)
  const caret = ' '.repeat(col) + '^'.repeat(span)
  return `\n  at line ${line}, col ${col + 1}:\n  ${lineText}\n  ${caret}`
}
