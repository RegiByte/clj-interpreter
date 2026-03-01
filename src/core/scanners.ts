import type { Token } from './types'

const createCursor = (line: number, col: number, offset: number) => ({
  line,
  col,
  offset,
})
type Cursor = ReturnType<typeof createCursor>

const makeScannerPrimitives = <TData extends string | unknown[]>(
  input: TData,
  cursor: Cursor
) => {
  type PeekType = TData extends string ? string : TData[number]
  return {
    peek: (ahead: number = 0): PeekType | null => {
      const idx = cursor.offset + ahead
      if (idx >= input.length) return null
      return input[idx] as PeekType
    },
    isAtEnd: () => {
      return cursor.offset >= input.length
    },
    position: () => {
      return {
        offset: cursor.offset,
        line: cursor.line,
        col: cursor.col,
      }
    },
  }
}

export function makeCharScanner(input: string) {
  const cursor = createCursor(0, 0, 0)

  const api = {
    ...makeScannerPrimitives<string>(input, cursor),
    advance: () => {
      if (cursor.offset >= input.length) return null
      const ch = input[cursor.offset]
      cursor.offset++
      if (ch === '\n') {
        cursor.line++
        cursor.col = 0
      } else {
        cursor.col++
      }
      return ch
    },
    consumeWhile(predicate: (char: string) => boolean) {
      const buffer: string[] = []
      while (!api.isAtEnd() && predicate(api.peek()!)) {
        buffer.push(api.advance()!)
      }
      return buffer.join('')
    },
  }

  return api
}

export type CharScanner = ReturnType<typeof makeCharScanner>

export function makeTokenScanner(input: Token[]) {
  const cursor = createCursor(0, 0, 0)
  const api = {
    ...makeScannerPrimitives<Token[]>(input, cursor),
    advance: () => {
      if (cursor.offset >= input.length) return null
      const token = input[cursor.offset]
      cursor.offset++
      cursor.col = token.end.col
      cursor.line = token.end.line
      return token
    },
    consumeWhile(predicate: (token: Token) => boolean) {
      const buffer: Token[] = []
      while (!api.isAtEnd() && predicate(api.peek()!)) {
        buffer.push(api.advance()!)
      }
      return buffer
    },
    consumeN(n: number) {
      for (let i = 0; i < n; i++) {
        api.advance()
      }
    },
  }

  return api
}
export type TokenScanner = ReturnType<typeof makeTokenScanner>
