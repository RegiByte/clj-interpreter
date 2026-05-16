import type { OpCode } from '../types'

export const Op = {
  Constant: 0,
  Nil: 1,
  True: 2,
  False: 3,
  Pop: 4,

  LoadLocal: 10,
  StoreLocal: 11,
  LoadGlobal: 12,
  LoadQualified: 13,
  LoadUpvalue: 14,

  MakeVector: 20,
  MakeMap: 21,
  MakeSet: 22,
  WithMeta: 23,

  Call: 30,
  Closure: 31,
  Return: 32,

  Jump: 40,
  JumpIfFalsy: 41,
  Loop: 42,
  Recur: 43,
  FnRecur: 44,
  FnRecurRest: 45,
  Throw: 46,
  PushTry: 47,
  PopTry: 48,
  EnterFinally: 49,
  EndFinally: 50,
  PushBindingFrame: 51,
  PushDynamicBinding: 52,
  PopBindingFrame: 53,
  SetDynamic: 54,
  LoadVar: 55,
  LoadLexicalVar: 56,
  Def: 57,

  Add: 70,
  Sub: 71,
  Mul: 72,
  Div: 73,
  Lt: 74,
  Lte: 75,
  Gt: 76,
  Gte: 77,
  Eq: 78,
} as const

export const opNames = new Map<OpCode, string>(
  Object.entries(Op).map(([name, code]) => [code, name])
)

export function opcodeName(opcode: OpCode): string {
  return opNames.get(opcode) ?? `Unknown(${opcode})`
}
