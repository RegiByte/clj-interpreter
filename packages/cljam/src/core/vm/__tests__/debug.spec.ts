import { describe, expect, it } from 'vitest'
import { addConstant, emit, emitOperand, makeChunk } from '../chunk'
import { v } from '../../factories'
import { disassembleChunk } from '../debug'
import { Op } from '../opcodes'

describe('VM disassembler', () => {
  it('disassembles constants and returns', () => {
    const chunk = makeChunk('disassemble-test')
    const index = addConstant(chunk, v.number(42))

    emit(chunk, Op.Constant)
    emitOperand(chunk, index)
    emit(chunk, Op.Return)

    expect(disassembleChunk(chunk)).toBe(
      ['== disassemble-test ==', '0000 Constant 0 ; 42', '0002 Return'].join(
        '\n'
      )
    )
  })

  it('disassembles local loads', () => {
    const chunk = makeChunk('load-local-disassemble-test')

    emit(chunk, Op.LoadLocal)
    emitOperand(chunk, 0)
    emit(chunk, Op.Return)

    expect(disassembleChunk(chunk)).toBe(
      [
        '== load-local-disassemble-test ==',
        '0000 LoadLocal 0',
        '0002 Return',
      ].join('\n')
    )
  })

  it('disassembles local stores', () => {
    const chunk = makeChunk('store-local-disassemble-test')

    emit(chunk, Op.StoreLocal)
    emitOperand(chunk, 0)
    emit(chunk, Op.Return)

    expect(disassembleChunk(chunk)).toBe(
      [
        '== store-local-disassemble-test ==',
        '0000 StoreLocal 0',
        '0002 Return',
      ].join('\n')
    )
  })

  it('disassembles recur with its loop target', () => {
    const chunk = makeChunk('recur-disassemble-test')

    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(2)))
    emit(chunk, Op.Constant)
    emitOperand(chunk, addConstant(chunk, v.number(1)))
    emit(chunk, Op.Recur)
    emitOperand(chunk, 0)
    emitOperand(chunk, 2)
    emitOperand(chunk, 8)
    emit(chunk, Op.Return)

    expect(disassembleChunk(chunk)).toBe(
      [
        '== recur-disassemble-test ==',
        '0000 Constant 0 ; 2',
        '0002 Constant 1 ; 1',
        '0004 Recur 0 2 -> 0008',
        '0008 Return',
      ].join('\n')
    )
  })

  it('disassembles closures with their template index', () => {
    const chunk = makeChunk('closure-disassemble-test')

    emit(chunk, Op.Closure)
    emitOperand(chunk, 0)
    emit(chunk, Op.Return)

    expect(disassembleChunk(chunk)).toBe(
      [
        '== closure-disassemble-test ==',
        '0000 Closure 0',
        '0002 Return',
      ].join('\n')
    )
  })

  it('disassembles WithMeta with its metadata constant', () => {
    const chunk = makeChunk('with-meta-disassemble-test')
    const meta = addConstant(
      chunk,
      v.map([[v.keyword(':fast'), v.boolean(true)]])
    )

    emit(chunk, Op.MakeVector)
    emitOperand(chunk, 0)
    emit(chunk, Op.WithMeta)
    emitOperand(chunk, meta)
    emit(chunk, Op.Return)

    expect(disassembleChunk(chunk)).toBe(
      [
        '== with-meta-disassemble-test ==',
        '0000 MakeVector ; 0',
        '0002 WithMeta 0 ; {:fast true}',
        '0004 Return',
      ].join('\n')
    )
  })

  it.each([
    ['Add', Op.Add],
    ['Sub', Op.Sub],
    ['Mul', Op.Mul],
    ['Div', Op.Div],
    ['Lt', Op.Lt],
    ['Lte', Op.Lte],
    ['Gt', Op.Gt],
    ['Gte', Op.Gte],
    ['Eq', Op.Eq],
  ])('disassembles %s with argc', (name, op) => {
    const chunk = makeChunk('intrinsic-disassemble-test')

    emit(chunk, op)
    emitOperand(chunk, 2)
    emit(chunk, Op.Return)

    expect(disassembleChunk(chunk)).toBe(
      ['== intrinsic-disassemble-test ==', `0000 ${name} 2`, '0002 Return'].join(
        '\n'
      )
    )
  })
})
