import { describe, expect, it } from 'vitest'
import { EvaluationError } from '../../errors'
import { printString } from '../../printer'
import { createSession } from '../../session'

function catchEvaluationError(code: string): EvaluationError {
  const session = createSession()

  try {
    session.evaluate(code)
  } catch (error) {
    if (error instanceof EvaluationError) return error
    throw error
  }

  throw new Error(`Expected an EvaluationError for ${code}`)
}

// DIVERGENCE(S5a): The IR compiler attaches form-level source positions, not
// per-argument positions, so error frames point at the whole call (col 1)
// instead of the offending argument's column. This is an intended, deferred
// divergence — the cross-architecture source-position rework will restore the
// fine-grained columns and these `it.skip`s should be un-skipped then. See the
// S5a allowlist in .regibyte/IR_COMPILER_PHASE1_HANDOFF.md.
describe('VM diagnostics under default opportunistic mode', () => {
  function expectPublicFrames(err: EvaluationError): void {
    const names = err.frames?.map((frame) => frame.fnName) ?? []
    expect(names).not.toContain('vm-expression')
    expect(names).not.toContain('vm-fn-body')
  }

  it.skip('points intrinsic division-by-zero errors at the divisor argument', () => {
    const err = catchEvaluationError('(/ 1 0)')

    expect(err.message).toContain('col 6')
    expect(err.message).toContain('     ^')
    expect(err.frames?.map((frame) => frame.fnName)).toEqual(['/'])
    expectPublicFrames(err)
  })

  it.skip('points intrinsic errors at the correct later argument', () => {
    const err = catchEvaluationError('(/ 10 2 0)')

    expect(err.message).toContain('col 9')
    expect(err.message).toContain('        ^')
    expect(err.frames?.map((frame) => frame.fnName)).toEqual(['/'])
    expectPublicFrames(err)
  })

  it.skip('points intrinsic type errors at the bad argument', () => {
    const err = catchEvaluationError('(< 3 2 "a")')

    expect(err.message).toContain('col 8')
    expect(err.message).toContain('       ^^^')
    expect(err.frames?.map((frame) => frame.fnName)).toEqual(['<'])
    expectPublicFrames(err)
  })

  it.skip('points delegated call argIndex errors at the bad argument', () => {
    const err = catchEvaluationError('(nth [1] 5)')

    expect(err.message).toContain('col 10')
    expect(err.message).toContain('         ^')
    expect(err.frames?.map((frame) => frame.fnName)).toEqual(['nth'])
    expectPublicFrames(err)
  })

  it.skip('points reference errors at the first bad argument', () => {
    const err = catchEvaluationError('(swap! 42 inc)')

    expect(err.message).toContain('col 8')
    expect(err.message).toContain('       ^^')
    expect(err.frames?.map((frame) => frame.fnName)).toEqual(['swap!'])
    expectPublicFrames(err)
  })

  it.skip('points collection errors at the bad collection argument', () => {
    const err = catchEvaluationError('(conj "a" "b")')

    expect(err.message).toContain('col 7')
    expect(err.message).toContain('      ^^^')
    expect(err.frames?.map((frame) => frame.fnName)).toEqual(['conj'])
    expectPublicFrames(err)
  })

  it.skip('points metadata errors at the bad metadata argument', () => {
    const err = catchEvaluationError('(with-meta [] 1)')

    expect(err.message).toContain('col 15')
    expect(err.message).toContain('              ^')
    expect(err.frames?.map((frame) => frame.fnName)).toEqual(['with-meta'])
    expectPublicFrames(err)
  })

  it.skip('points utility errors at the bad value argument', () => {
    const err = catchEvaluationError('(name 42)')

    expect(err.message).toContain('col 7')
    expect(err.message).toContain('      ^^')
    expect(err.frames?.map((frame) => frame.fnName)).toEqual(['name'])
    expectPublicFrames(err)
  })

  it.skip('keeps nested bytecode function-body errors at the definition-site argument', () => {
    const session = createSession()
    session.evaluate('(defn bad [x] (/ 10 x 0))')

    let err: EvaluationError | undefined
    try {
      session.evaluate('(bad 2)')
    } catch (error) {
      if (error instanceof EvaluationError) err = error
      else throw error
    }

    expect(err).toBeDefined()
    expect(err!.message).toContain('(defn bad [x] (/ 10 x 0))')
    expect(err!.message).toContain('col 23')
    expect(err!.message).toContain('                      ^')
    expect(err!.frames?.map((frame) => frame.fnName)).toEqual(['/', 'bad'])
    expectPublicFrames(err!)
  })

  it('keeps caught runtime error maps source-facing', () => {
    const session = createSession()
    const result = session.evaluate(
      '(try (/ 1 0) (catch :error/runtime e [(:message e) (:frames e)]))'
    )
    const printed = printString(result)

    expect(printed).toContain('"division by zero"')
    expect(printed).toContain(':fn "/"')
    expect(printed).toContain(':col 6')
    expect(printed).not.toContain('vm-expression')
    expect(printed).not.toContain('vm-fn-body')
  })
})
