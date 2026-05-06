import type { OpCode } from '../types'

export const Op = {
  Constant: 0,
  Nil: 1,
  True: 2,
  False: 3,
  Return: 32,
} as const

export const opNames = new Map<OpCode, string>(
  Object.entries(Op).map(([name, code]) => [code, name])
)

export function opcodeName(opcode: OpCode): string {
  return opNames.get(opcode) ?? `Unknown(${opcode})`
}
