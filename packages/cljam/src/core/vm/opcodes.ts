import type { OpCode } from '../types'

export const Op = {
  Constant: 0,
  Nil: 1,
  True: 2,
  False: 3,
  Pop: 4,

  LoadGlobal: 12,

  Call: 30,
  Return: 32,

  Jump: 40,
  JumpIfFalsy: 41,
} as const

export const opNames = new Map<OpCode, string>(
  Object.entries(Op).map(([name, code]) => [code, name])
)

export function opcodeName(opcode: OpCode): string {
  return opNames.get(opcode) ?? `Unknown(${opcode})`
}
