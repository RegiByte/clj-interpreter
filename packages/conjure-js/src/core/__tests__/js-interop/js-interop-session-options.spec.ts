import { describe, expect, it } from 'vitest'
import { createSession } from '../../session'

// ---------------------------------------------------------------------------
// createSession options — clobber guard
// ---------------------------------------------------------------------------

describe('createSession — hostBindings clobber guard', () => {
  it('throws when hostBindings key clashes with js/get', () => {
    expect(() =>
      createSession({ hostBindings: { get: (x: unknown) => x } })
    ).toThrow("hostBindings key 'get' conflicts with built-in js/get")
  })

  it('throws when hostBindings key clashes with js/set!', () => {
    expect(() =>
      createSession({ hostBindings: { 'set!': () => {} } })
    ).toThrow("hostBindings key 'set!' conflicts with built-in js/set!")
  })

  it('throws when hostBindings key clashes with js/call', () => {
    expect(() =>
      createSession({ hostBindings: { call: () => {} } })
    ).toThrow("hostBindings key 'call' conflicts with built-in js/call")
  })

  it('throws when hostBindings key clashes with js/merge', () => {
    expect(() =>
      createSession({ hostBindings: { merge: () => {} } })
    ).toThrow("hostBindings key 'merge' conflicts with built-in js/merge")
  })

  it('does not throw for non-conflicting keys', () => {
    expect(() =>
      createSession({
        hostBindings: { Math, console, window: globalThis },
      })
    ).not.toThrow()
  })

  it('interns non-conflicting hostBindings into the js namespace', () => {
    const session = createSession({
      hostBindings: { myLib: { version: '1.0' } },
    })
    const result = session.evaluate('js/myLib')
    expect(result.kind).toBe('js-value')
    expect((result as any).value).toEqual({ version: '1.0' })
  })
})
