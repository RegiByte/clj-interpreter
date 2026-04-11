import { describe, expect, it } from 'vitest'
import { cljNumber, cljNil } from '../factories'
import { isSymbol } from '../assertions'
import {
  createSession as createPristineSession,
  createSessionFromSnapshot,
  snapshotSession,
} from '../session'
import { makeGensym, resetGensymCounter } from '../gensym'

const _snapshot = snapshotSession(createPristineSession())

const session = () => createSessionFromSnapshot(_snapshot)

describe('makeGensym', () => {
  it('returns a unique string each call', () => {
    resetGensymCounter()
    const a = makeGensym()
    const b = makeGensym()
    expect(a).not.toBe(b)
  })

  it('uses G as default prefix', () => {
    resetGensymCounter()
    expect(makeGensym()).toMatch(/^G__\d+$/)
  })

  it('uses the provided prefix', () => {
    resetGensymCounter()
    expect(makeGensym('foo')).toMatch(/^foo__\d+$/)
  })

  it('increments counter across calls', () => {
    resetGensymCounter()
    const a = makeGensym()
    const b = makeGensym()
    const numA = parseInt(a.split('__')[1])
    const numB = parseInt(b.split('__')[1])
    expect(numB).toBe(numA + 1)
  })
})

describe('gensym native function', () => {
  it('(gensym) returns a symbol', () => {
    const s = session()
    const result = s.evaluate('(gensym)')
    expect(isSymbol(result)).toBe(true)
  })

  it('(gensym) returns a symbol matching G__N pattern', () => {
    const s = session()
    const result = s.evaluate('(gensym)')
    expect(isSymbol(result) && result.name).toMatch(/^G__\d+$/)
  })

  it('(gensym "prefix") uses the provided prefix', () => {
    const s = session()
    const result = s.evaluate('(gensym "foo")')
    expect(isSymbol(result) && result.name).toMatch(/^foo__\d+$/)
  })

  it('each call returns a different symbol', () => {
    const s = session()
    const a = s.evaluate('(gensym)')
    const b = s.evaluate('(gensym)')
    expect(isSymbol(a) && isSymbol(b) && a.name !== b.name).toBe(true)
  })

  it('throws if more than one argument', () => {
    const s = session()
    expect(() => s.evaluate('(gensym "a" "b")')).toThrow()
  })

  it('throws if argument is not a string', () => {
    const s = session()
    expect(() => s.evaluate('(gensym 42)')).toThrow()
  })
})

describe('auto-gensym in quasiquote', () => {
  it('sym# expands to a unique symbol', () => {
    const s = session()
    const result = s.evaluate('`x#')
    expect(isSymbol(result)).toBe(true)
    expect(isSymbol(result) && result.name).toMatch(/^x__\d+$/)
  })

  it('two occurrences of the same sym# in one quasiquote expand to the same symbol', () => {
    const s = session()
    // (let [v# 1] v#) should work correctly — both v# expand to the same name
    const result = s.evaluate('`(let [v# 1] v#)')
    // result is (let [<gensym> 1] <gensym>) — check both positions are equal
    // The result is a list: (let [sym 1] sym)
    expect(result.kind).toBe('list')
    if (result.kind === 'list') {
      const letVec = result.value[1]
      const bodyRef = result.value[2]
      expect(letVec.kind).toBe('vector')
      if (letVec.kind === 'vector') {
        const bindingSym = letVec.value[0]
        expect(isSymbol(bindingSym)).toBe(true)
        expect(isSymbol(bodyRef)).toBe(true)
        if (isSymbol(bindingSym) && isSymbol(bodyRef)) {
          expect(bindingSym.name).toBe(bodyRef.name)
          expect(bindingSym.name).not.toBe('v#')
          expect(bindingSym.name).toMatch(/^v__\d+$/)
        }
      }
    }
  })

  it('two separate quasiquotes produce different gensyms for the same sym#', () => {
    const s = session()
    const a = s.evaluate('`x#')
    const b = s.evaluate('`x#')
    expect(isSymbol(a) && isSymbol(b) && a.name !== b.name).toBe(true)
  })

  it('different sym# names in the same quasiquote expand to different symbols', () => {
    const s = session()
    const result = s.evaluate('`[a# b#]')
    expect(result.kind).toBe('vector')
    if (result.kind === 'vector') {
      const [symA, symB] = result.value
      expect(isSymbol(symA) && isSymbol(symB)).toBe(true)
      if (isSymbol(symA) && isSymbol(symB)) {
        expect(symA.name).not.toBe(symB.name)
        expect(symA.name).toMatch(/^a__\d+$/)
        expect(symB.name).toMatch(/^b__\d+$/)
      }
    }
  })
})

describe('macro hygiene: and / or', () => {
  it('and is hygienic when user binding shares the old __v name', () => {
    // Before the fix, __v inside the macro would shadow (or be shadowed by)
    // a user binding named __v. After the fix with v#, there is no collision.
    const s = session()
    expect(s.evaluate('(let [__v 99] (and true __v))')).toEqual(cljNumber(99))
  })

  it('or is hygienic when user binding shares the old __v name', () => {
    const s = session()
    expect(s.evaluate('(let [__v 99] (or false __v))')).toEqual(cljNumber(99))
  })

  it('and still short-circuits correctly', () => {
    const s = session()
    expect(s.evaluate('(and 1 nil 3)')).toEqual(cljNil())
  })

  it('or still short-circuits correctly', () => {
    const s = session()
    expect(s.evaluate('(or nil false 42)')).toEqual(cljNumber(42))
  })

  it('nested and/or do not clash with each other', () => {
    const s = session()
    expect(s.evaluate('(and 1 (or nil 2) 3)')).toEqual(cljNumber(3))
    expect(s.evaluate('(or nil (and 1 2))')).toEqual(cljNumber(2))
  })

  it('defmacro using v# produces hygienic bindings', () => {
    // A user-defined macro using v# should not conflict with caller variables
    const s = session()
    s.evaluate('(defmacro my-or [a b] `(let [v# ~a] (if v# v# ~b)))')
    expect(s.evaluate('(let [v 10] (my-or false v))')).toEqual(cljNumber(10))
  })
})
