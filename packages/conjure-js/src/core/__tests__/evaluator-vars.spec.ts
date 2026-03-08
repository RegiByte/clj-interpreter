import { describe, it, expect, beforeAll } from 'bun:test'
import { createSession, snapshotSession, createSessionFromSnapshot } from '../session'
import type { Session, SessionSnapshot } from '../session'
import { printString } from '../printer'

let snapshot: SessionSnapshot

beforeAll(() => {
  snapshot = snapshotSession(createSession())
})

function mkSession(): Session {
  return createSessionFromSnapshot(snapshot)
}

describe('Var system', () => {
  it('def + lookup auto-deref', () => {
    const s = mkSession()
    s.evaluate('(def x 5)')
    expect(s.evaluate('x').kind).toBe('number')
    expect((s.evaluate('x') as any).value).toBe(5)
  })

  it('def re-def mutates Var in place', () => {
    const s = mkSession()
    s.evaluate('(def x 5)')
    s.evaluate('(def x 10)')
    expect((s.evaluate('x') as any).value).toBe(10)
  })

  it('var? on a Var returns true', () => {
    const s = mkSession()
    s.evaluate('(def x 5)')
    expect((s.evaluate("(var? #'x)") as any).value).toBe(true)
  })

  it('var? on non-Var returns false', () => {
    const s = mkSession()
    expect((s.evaluate('(var? 42)') as any).value).toBe(false)
  })

  it('var-get returns the current value', () => {
    const s = mkSession()
    s.evaluate('(def x 5)')
    expect((s.evaluate("(var-get #'x)") as any).value).toBe(5)
  })

  it('alter-var-root updates the value', () => {
    const s = mkSession()
    s.evaluate('(def x 5)')
    expect((s.evaluate("(alter-var-root #'x inc)") as any).value).toBe(6)
    expect((s.evaluate('x') as any).value).toBe(6)
  })

  it('printer formats Var as #\'ns/name', () => {
    const s = mkSession()
    s.evaluate('(def x 5)')
    const v = s.evaluate("#'x")
    expect(printString(v)).toBe("#'user/x")
  })

  it('#\'x returns a Var object', () => {
    const s = mkSession()
    s.evaluate('(def x 42)')
    const v = s.evaluate("#'x")
    expect(v.kind).toBe('var')
  })

  it(':refer aliasing — redef in source ns propagates', () => {
    const s = mkSession()
    // Load a source namespace
    s.loadFile('(ns mylib)\n(def x 1)')
    // Load a consumer that refers x
    s.loadFile('(ns consumer (:require [mylib :refer [x]]))')
    // Value via consumer ns
    s.setNs('consumer')
    expect((s.evaluate('x') as any).value).toBe(1)
    // Redefine in source ns
    s.loadFile('(ns mylib)\n(def x 99)')
    // Consumer should see new value via aliased Var
    s.setNs('consumer')
    expect((s.evaluate('x') as any).value).toBe(99)
  })

  it('sessions are isolated — def in one does not affect the other', () => {
    const s1 = mkSession()
    const s2 = mkSession()
    s1.evaluate('(def x 100)')
    // s2 should not have x (or should have its own)
    expect(() => s2.evaluate('(def y 200)')).not.toThrow()
    expect((s2.evaluate('y') as any).value).toBe(200)
    // x in s1 is 100
    expect((s1.evaluate('x') as any).value).toBe(100)
  })
})
