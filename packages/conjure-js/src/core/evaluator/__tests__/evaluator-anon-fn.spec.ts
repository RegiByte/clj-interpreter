import { describe, expect, it } from 'vitest'
import { cljNumber, cljString, cljVector } from '../../factories'
import { freshSession } from './evaluator-test-utils'

describe('anonymous function reader macro #(...)', () => {
  it('should evaluate a single-arg #(* 2 %)', () => {
    const s = freshSession()
    expect(s.evaluate('(#(* 2 %) 5)')).toMatchObject(cljNumber(10))
  })

  it('should evaluate a two-arg #(+ %1 %2)', () => {
    const s = freshSession()
    expect(s.evaluate('(#(+ %1 %2) 3 4)')).toMatchObject(cljNumber(7))
  })

  it('should use % and %1 interchangeably', () => {
    const s = freshSession()
    expect(s.evaluate('(#(str % "-" %1) "x")')).toMatchObject(
      cljString('x-x')
    )
  })

  it('should work with map: (map #(* % 2) (range 5))', () => {
    const s = freshSession()
    expect(
      s.evaluate('(into [] (map #(* % 2) (range 5)))')
    ).toMatchObject(
      cljVector([
        cljNumber(0),
        cljNumber(2),
        cljNumber(4),
        cljNumber(6),
        cljNumber(8),
      ])
    )
  })

  it('should support a rest-arg #(apply + %&)', () => {
    const s = freshSession()
    expect(s.evaluate('(#(apply + %&) 1 2 3 4)')).toMatchObject(
      cljNumber(10)
    )
  })

  it('should support mixed fixed and rest args', () => {
    const s = freshSession()
    expect(
      s.evaluate('(#(str %1 " " (apply str %&)) "hello" "world" "!")')
    ).toMatchObject(cljString('hello world!'))
  })

  it('should support a zero-arg #(...)', () => {
    const s = freshSession()
    expect(s.evaluate('(#(+ 1 2))')).toMatchObject(cljNumber(3))
  })

  it('should infer arity from highest %N index', () => {
    const s = freshSession()
    expect(s.evaluate('(#(+ %1 %3) 10 0 5)')).toMatchObject(
      cljNumber(15)
    )
  })

  it('should be composable with filter', () => {
    const s = freshSession()
    expect(
      s.evaluate('(into [] (filter #(even? %) (range 6)))')
    ).toMatchObject(cljVector([cljNumber(0), cljNumber(2), cljNumber(4)]))
  })
})
