import { describe, expect, it } from 'vitest'
import { createSession } from '../session'
import { is } from '../assertions'
import type {
  CljMap,
  CljValue,
  CljVector,
  EvalEvent,
  VmExecutionMode,
} from '../types'
import { v } from '../factories'

function entry(map: CljMap, keyName: string): CljValue {
  const found = map.entries.find(
    ([key]) => is.keyword(key) && key.name === keyName
  )
  if (!found) throw new Error(`missing map key ${keyName}`)
  return found[1]
}

function expectMap(value: CljValue): CljMap {
  if (!is.map(value)) throw new Error(`expected map, got ${value.kind}`)
  return value
}

function expectVector(value: CljValue): CljVector {
  if (!is.vector(value)) throw new Error(`expected vector, got ${value.kind}`)
  return value
}

function expectNumber(value: CljValue): number {
  if (!is.number(value)) throw new Error(`expected number, got ${value.kind}`)
  return value.value
}

function expectKeywordName(value: CljValue): string {
  if (!is.keyword(value)) throw new Error(`expected keyword, got ${value.kind}`)
  return value.name
}

function measure(code: string, vmExecutionMode?: VmExecutionMode): CljMap {
  const session = createSession(
    vmExecutionMode === undefined ? undefined : { vmExecutionMode }
  )
  return expectMap(session.evaluate(code))
}

function stages(result: CljMap): CljMap[] {
  return expectVector(entry(result, ':stages')).value.map(expectMap)
}

function stageNames(result: CljMap): string[] {
  return stages(result).map((stage) =>
    expectKeywordName(entry(stage, ':stage'))
  )
}

describe('measurement utilities', () => {
  it('returns the measured value and non-negative elapsed time', () => {
    const result = measure('(measure* (+ 1 2))')

    expect(entry(result, ':value')).toEqual(v.number(3))
    expect(expectNumber(entry(result, ':elapsed-ms'))).toBeGreaterThanOrEqual(0)
    expect(expectKeywordName(entry(result, ':path'))).toBe(':ast/top-level')
  })

  it('reports AST analyze and walk stages for walker-executed forms', () => {
    const result = measure('(measure* (+ 1 (* 2 3)))')

    expect(stageNames(result)).toEqual(
      expect.arrayContaining([':macroexpand', ':ast/analyze', ':ast/walk'])
    )
    expect(expectKeywordName(entry(result, ':path'))).toBe(':ast/top-level')
  })

  it('evaluates multiple body forms in order and returns the last value', () => {
    const result = measure(`
      (measure*
        (def measured-x 1)
        (def measured-x (+ measured-x 1))
        measured-x)
    `)

    expect(entry(result, ':value')).toEqual(v.number(2))
    expect(stageNames(result).filter((name) => name === ':macroexpand')).toHaveLength(3)
  })

  it('reports VM compile and execute stages for VM-ready forms', () => {
    const result = measure('(measure* (+ 1 (* 2 3)))', 'opportunistic')

    expect(stageNames(result)).toEqual(
      expect.arrayContaining([':macroexpand', ':vm/compile', ':vm/execute'])
    )
    expect(expectKeywordName(entry(result, ':path'))).toBe(':vm/top-level')
  })

  it('reports VM fallback and final walker path honestly (VM mode)', () => {
    // Under the DEFAULT mode nothing public falls back anymore (Phase 4 S1 —
    // `ns` walks). The VM's ns refusal is the surviving fallback specimen;
    // since S4a the refusal lands on the WALKER (the base engine), so the
    // honesty contract is: :fallback stage recorded, then :ast/* stages.
    const result = measure(
      '(measure* (ns measure-fallback-probe))',
      'opportunistic'
    )
    const names = stageNames(result)
    const fallbackStage = stages(result).find(
      (stage) => expectKeywordName(entry(stage, ':stage')) === ':fallback'
    )

    expect(names).toEqual(
      expect.arrayContaining([':fallback', ':ast/analyze', ':ast/walk'])
    )
    expect(expectKeywordName(entry(result, ':path'))).toBe(':ast/top-level')
    expect(fallbackStage).toBeDefined()
    expect(
      expectKeywordName(entry(expectMap(entry(fallbackStage!, ':reason')), ':category'))
    ).toBe(':unsupported-top-level-mutation')
  })

  it('walks (ns …) on the AST path — no fallback (Phase 4 S1)', () => {
    const result = measure('(measure* (ns measure-ns-walk-probe))')

    expect(stageNames(result)).toEqual(
      expect.arrayContaining([':macroexpand', ':ast/analyze', ':ast/walk'])
    )
    expect(stageNames(result)).not.toContain(':fallback')
    expect(expectKeywordName(entry(result, ':path'))).toBe(':ast/top-level')
  })

  it('walks (async …) on the AST path — no fallback (Phase 3)', () => {
    const result = measure('(measure* (async 42))')

    expect(stageNames(result)).toEqual(
      expect.arrayContaining([':macroexpand', ':ast/analyze', ':ast/walk'])
    )
    expect(stageNames(result)).not.toContain(':fallback')
    expect(expectKeywordName(entry(result, ':path'))).toBe(':ast/top-level')
  })

  it('records macro expansion before execution for macro-heavy input', () => {
    const result = measure('(measure* (when true (+ 1 2)))')

    expect(entry(result, ':value')).toEqual(v.number(3))
    expect(stageNames(result)[0]).toBe(':macroexpand')
  })

  it('time prints elapsed time and returns the measured value', () => {
    const output: string[] = []
    const session = createSession({ output: (text) => output.push(text) })

    expect(session.evaluate('(time (+ 1 2))')).toEqual(v.number(3))
    expect(output.join('')).toMatch(/^Elapsed time: .+ msecs\n$/)
  })

  it('preserves normal errors from measured code', () => {
    const session = createSession()

    expect(() => session.evaluate('(measure* (/ 1 0))')).toThrow(
      'division by zero'
    )
  })

  it('leaves instrumentation events working when no measurement is active', () => {
    const events: EvalEvent[] = []
    const session = createSession({
      instrumentation: { onEvent: (event) => events.push(event) },
    })

    expect(session.evaluate('(+ 1 2)')).toEqual(v.number(3))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'ast:top-level' }),
      ])
    )
  })
})
