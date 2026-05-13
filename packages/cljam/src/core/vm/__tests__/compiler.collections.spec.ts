import { describe, expect, it } from 'vitest'
import { v } from '../../factories'
import { compileVm } from '../compiler'
import { disassembleChunk } from '../debug'
import { expectVmEqualsInterpreter } from './helpers'
import { expectVmCallCompilesTo, formToNode } from './compiler-test-utils'

describe('VM collection compilation', () => {
  it.each(['[]', '[1 2]', '{:a 1}', '#{1}'])(
    'Can compile literal collections %s',
    (code) => {
      const chunk = compileVm(formToNode(code))

      expect(chunk).not.toBeNull()
    }
  )

  it.each([
    ['[1 2 3]', v.vector([v.number(1), v.number(2), v.number(3)])],
    ['[1 (+ 2 3)]', v.vector([v.number(1), v.number(5)])],
    ['[:a :b]', v.vector([v.keyword(':a'), v.keyword(':b')])],
    [
      '[:a (+ 1 2) :b (- 10 3)]',
      v.vector([v.keyword(':a'), v.number(3), v.keyword(':b'), v.number(7)]),
    ],
    [
      '{:a 1 :b 2}',
      v.map([
        [v.keyword(':a'), v.number(1)],
        [v.keyword(':b'), v.number(2)],
      ]),
    ],
    [
      '{:a 1 :b (+ 2 3)}',
      v.map([
        [v.keyword(':a'), v.number(1)],
        [v.keyword(':b'), v.number(5)],
      ]),
    ],
    ['#{1 2 3}', v.set([v.number(1), v.number(2), v.number(3)])],
    ['#{1 (+ 1 2)}', v.set([v.number(1), v.number(3)])],
    ['(do [1 2] [3 4])', v.vector([v.number(3), v.number(4)])],
    [
      '^:fast []',
      {
        ...v.vector([]),
        meta: v.map([[v.keyword(':fast'), v.boolean(true)]]),
      },
    ],
    [
      '^:fast [1 (+ 2 3)]',
      {
        ...v.vector([v.number(1), v.number(5)]),
        meta: v.map([[v.keyword(':fast'), v.boolean(true)]]),
      },
    ],
    [
      '^{:a 1} {}',
      { ...v.map([]), meta: v.map([[v.keyword(':a'), v.number(1)]]) },
    ],
    [
      '^{:a 1} {:b 2}',
      {
        ...v.map([[v.keyword(':b'), v.number(2)]]),
        meta: v.map([[v.keyword(':a'), v.number(1)]]),
      },
    ],
  ])('executes compiled collection expressions %s', (code, expected) => {
    expectVmCallCompilesTo(code, expected)
  })

  it.each(['(meta ^:fast [])', '(meta ^:fast {:b 2})'])(
    'matches interpreter metadata result for %s',
    (code) => {
      expectVmEqualsInterpreter(code)
    }
  )

  it.each([
    [
      '[(+ 1 2)]',
      [
        '== vm-expression ==',
        '0000 Constant 0 ; 1',
        '0002 Constant 1 ; 2',
        '0004 Add 2',
        '0006 MakeVector ; 1',
        '0008 Return',
      ],
    ],
    [
      '[:a (+ 1 2) :b (- 10 3)]',
      [
        '== vm-expression ==',
        '0000 Constant 0 ; :a',
        '0002 Constant 1 ; 1',
        '0004 Constant 2 ; 2',
        '0006 Add 2',
        '0008 Constant 3 ; :b',
        '0010 Constant 4 ; 10',
        '0012 Constant 5 ; 3',
        '0014 Sub 2',
        '0016 MakeVector ; 4',
        '0018 Return',
      ],
    ],
    [
      '{:a 1 :b (+ 2 3)}',
      [
        '== vm-expression ==',
        '0000 Constant 0 ; :a',
        '0002 Constant 1 ; 1',
        '0004 Constant 2 ; :b',
        '0006 Constant 3 ; 2',
        '0008 Constant 4 ; 3',
        '0010 Add 2',
        '0012 MakeMap ; 2',
        '0014 Return',
      ],
    ],
    [
      '#{1 (+ 1 2)}',
      [
        '== vm-expression ==',
        '0000 Constant 0 ; 1',
        '0002 Constant 1 ; 1',
        '0004 Constant 2 ; 2',
        '0006 Add 2',
        '0008 MakeSet ; 2',
        '0010 Return',
      ],
    ],
    [
      '^:fast []',
      [
        '== vm-expression ==',
        '0000 MakeVector ; 0',
        '0002 WithMeta 0 ; {:fast true}',
        '0004 Return',
      ],
    ],
    [
      '^:fast [1 (+ 2 3)]',
      [
        '== vm-expression ==',
        '0000 Constant 0 ; 1',
        '0002 Constant 1 ; 2',
        '0004 Constant 2 ; 3',
        '0006 Add 2',
        '0008 MakeVector ; 2',
        '0010 WithMeta 3 ; {:fast true}',
        '0012 Return',
      ],
    ],
    [
      '^{:a 1} {}',
      [
        '== vm-expression ==',
        '0000 MakeMap ; 0',
        '0002 WithMeta 0 ; {:a 1}',
        '0004 Return',
      ],
    ],
    [
      '^{:a 1} {:b 2}',
      [
        '== vm-expression ==',
        '0000 Constant 0 ; :b',
        '0002 Constant 1 ; 2',
        '0004 MakeMap ; 1',
        '0006 WithMeta 2 ; {:a 1}',
        '0008 Return',
      ],
    ],
    [
      '[1 2 (if 1 3 4)]',
      [
        '== vm-expression ==',
        '0000 Constant 0 ; 1',
        '0002 Constant 1 ; 2',
        '0004 Constant 2 ; 1',
        '0006 JumpIfFalsy 4 -> 0012',
        '0008 Constant 3 ; 3',
        '0010 Jump 2 -> 0014',
        '0012 Constant 4 ; 4',
        '0014 MakeVector ; 3',
        '0016 Return',
      ],
    ],
  ])('Compiles collection expressions to bytecode %s', (code, expected) => {
    const chunk = compileVm(formToNode(code))

    expect(chunk).not.toBeNull()
    if (chunk === null) return

    expect(disassembleChunk(chunk)).toBe(expected.join('\n'))
  })
})
