import { describe, expect, it } from 'vitest'
import { cljKeyword, cljNumber } from '../factories'
import { freshSession } from './evaluator-test-utils'

function sessionWithNs(nsName: string, defs: string) {
  const s = freshSession()
  s.loadFile(`(ns ${nsName})\n${defs}`)
  return s
}

describe('qualified symbol resolution', () => {
  it('resolves ns/sym by full namespace name without require', () => {
    const s = sessionWithNs('my.utils', '(def helper 42)')
    s.setNs('user')
    expect(s.evaluate('my.utils/helper')).toEqual(cljNumber(42))
  })

  it('resolves user/sym for bindings defined in the user namespace', () => {
    const s = freshSession()
    s.evaluate('(def answer 42)')
    expect(s.evaluate('user/answer')).toEqual(cljNumber(42))
  })

  it('alias takes precedence over direct namespace name', () => {
    const s = sessionWithNs('math.ops', '(def pi 3)')
    s.setNs('user')
    s.evaluate("(require '[math.ops :as m])")
    expect(s.evaluate('m/pi')).toEqual(cljNumber(3))
    expect(s.evaluate('math.ops/pi')).toEqual(cljNumber(3))
  })

  it('throws for nonexistent namespace', () => {
    const s = freshSession()
    expect(() => s.evaluate('nonexistent.ns/foo')).toThrow(
      'No such namespace or alias: nonexistent.ns'
    )
  })

  it('throws for symbol not found in a valid namespace', () => {
    const s = sessionWithNs('my.ns', '(def x 1)')
    s.setNs('user')
    expect(() => s.evaluate('my.ns/nonexistent')).toThrow('not found')
  })
})

describe('auto-qualified keyword expansion (::)', () => {
  it('::foo expands to :user/foo in the user namespace', () => {
    const s = freshSession()
    expect(s.evaluate('::foo')).toEqual(cljKeyword(':user/foo'))
  })

  it('::foo expands to the namespace declared in the file', () => {
    const s = freshSession()
    s.loadFile('(ns my.domain)\n(def k ::event)')
    s.setNs('user')
    expect(s.evaluate('my.domain/k')).toEqual(cljKeyword(':my.domain/event'))
  })

  it('::foo expanded keyword can be used as a map key', () => {
    const s = freshSession()
    s.evaluate('(def m {::status :ok})')
    expect(s.evaluate('(:user/status m)')).toEqual(cljKeyword(':ok'))
  })
})
