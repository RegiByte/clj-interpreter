import { describe, it } from 'vitest'
import {
  expectVmEqualsInterpreter,
  expectVmFallsBack,
  expectVmThrowsLikeInterpreter,
} from './helpers'

describe('VM compiler equivalence helpers', () => {
  it.each([
    '42',
    '"hello"',
    ':ok',
    'nil',
    'true',
    'false',
    '(do 1 2 3)',
    '(if true 1 2)',
    '[1 (+ 2 3)]',
    '{:a 1 :b (+ 2 3)}',
    '#{1 (+ 1 2)}',
    '(:k {:k 1})',
    '([1 2] 0)',
    '((if true + -) 1 2)',
    '((if false + -) 1 2)',
  ])('matches interpreter result for %s', (code) => {
    expectVmEqualsInterpreter(code)
  })

  it.each(['(if true 1 2 3)'])(
    'expects VM fallback for %s',
    (code) => {
      expectVmFallsBack(code)
    }
  )

  it.each(['missing', '(+ missing 1)', 'source.ns/missing'])(
    'throws like the interpreter for %s',
    (code) => {
      expectVmThrowsLikeInterpreter(code)
    }
  )
})
