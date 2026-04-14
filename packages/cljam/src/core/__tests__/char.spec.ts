import { describe, expect, it } from 'vitest'
import { freshSession as session } from '../evaluator/__tests__/evaluator-test-utils'

// ---------------------------------------------------------------------------
// Character literal tests — full round-trip from source through evaluator.
//
// Clojure character literals: \a  \space  \newline  \tab  \uXXXX
// They are a distinct type (kind: 'character'), NOT strings.
// ---------------------------------------------------------------------------

describe('character literals', () => {
  describe('basic literals', () => {
    it('evaluates \\a to a character value', () => {
      expect(session().evaluate('\\a')).toMatchObject({ kind: 'character', value: 'a' })
    })

    it('evaluates \\Z (uppercase)', () => {
      expect(session().evaluate('\\Z')).toMatchObject({ kind: 'character', value: 'Z' })
    })

    it('evaluates \\1 (digit)', () => {
      expect(session().evaluate('\\1')).toMatchObject({ kind: 'character', value: '1' })
    })

    it('evaluates \\! (punctuation)', () => {
      expect(session().evaluate('\\!')).toMatchObject({ kind: 'character', value: '!' })
    })
  })

  describe('named character literals', () => {
    it('\\space → space character', () => {
      expect(session().evaluate('\\space')).toMatchObject({ kind: 'character', value: ' ' })
    })

    it('\\newline → newline character', () => {
      expect(session().evaluate('\\newline')).toMatchObject({ kind: 'character', value: '\n' })
    })

    it('\\tab → tab character', () => {
      expect(session().evaluate('\\tab')).toMatchObject({ kind: 'character', value: '\t' })
    })

    it('\\return → carriage return', () => {
      expect(session().evaluate('\\return')).toMatchObject({ kind: 'character', value: '\r' })
    })

    it('\\backspace → backspace', () => {
      expect(session().evaluate('\\backspace')).toMatchObject({ kind: 'character', value: '\b' })
    })

    it('\\formfeed → form feed', () => {
      expect(session().evaluate('\\formfeed')).toMatchObject({ kind: 'character', value: '\f' })
    })
  })

  describe('unicode escape', () => {
    it('\\u0041 → A', () => {
      expect(session().evaluate('\\u0041')).toMatchObject({ kind: 'character', value: 'A' })
    })

    it('\\u03BB → λ', () => {
      expect(session().evaluate('\\u03BB')).toMatchObject({ kind: 'character', value: 'λ' })
    })

    it('\\u0020 → space character', () => {
      expect(session().evaluate('\\u0020')).toMatchObject({ kind: 'character', value: ' ' })
    })
  })

  describe('equality', () => {
    it('(= \\a \\a) → true', () => {
      expect(session().evaluate('(= \\a \\a)')).toMatchObject({ kind: 'boolean', value: true })
    })

    it('(= \\a \\b) → false', () => {
      expect(session().evaluate('(= \\a \\b)')).toMatchObject({ kind: 'boolean', value: false })
    })

    it('(= \\space \\ ) is not equal — different literals, but same value', () => {
      // Both resolve to the same character: space
      // Note: \space and \u0020 both produce the space character
      expect(session().evaluate('(= \\space \\u0020)')).toMatchObject({ kind: 'boolean', value: true })
    })

    it('chars are not equal to strings containing the same content', () => {
      expect(session().evaluate('(= \\a "a")')).toMatchObject({ kind: 'boolean', value: false })
    })
  })

  describe('char? predicate', () => {
    it('(char? \\a) → true', () => {
      expect(session().evaluate('(char? \\a)')).toMatchObject({ kind: 'boolean', value: true })
    })

    it('(char? \\space) → true', () => {
      expect(session().evaluate('(char? \\space)')).toMatchObject({ kind: 'boolean', value: true })
    })

    it('(char? "a") → false — strings are not chars', () => {
      expect(session().evaluate('(char? "a")')).toMatchObject({ kind: 'boolean', value: false })
    })

    it('(char? 65) → false — numbers are not chars', () => {
      expect(session().evaluate('(char? 65)')).toMatchObject({ kind: 'boolean', value: false })
    })

    it('(char? nil) → false', () => {
      expect(session().evaluate('(char? nil)')).toMatchObject({ kind: 'boolean', value: false })
    })
  })

  describe('char function (codepoint → char)', () => {
    it('(char 65) → \\A', () => {
      expect(session().evaluate('(char 65)')).toMatchObject({ kind: 'character', value: 'A' })
    })

    it('(char 97) → \\a', () => {
      expect(session().evaluate('(char 97)')).toMatchObject({ kind: 'character', value: 'a' })
    })

    it('(char 32) → \\space', () => {
      expect(session().evaluate('(char 32)')).toMatchObject({ kind: 'character', value: ' ' })
    })

    it('(char 955) → \\λ (lambda)', () => {
      expect(session().evaluate('(char 955)')).toMatchObject({ kind: 'character', value: 'λ' })
    })

    it('throws on non-number argument', () => {
      expect(() => session().evaluate('(char "a")')).toThrow()
    })
  })

  describe('int function (char → codepoint)', () => {
    it('(int \\A) → 65', () => {
      expect(session().evaluate('(int \\A)')).toMatchObject({ kind: 'number', value: 65 })
    })

    it('(int \\a) → 97', () => {
      expect(session().evaluate('(int \\a)')).toMatchObject({ kind: 'number', value: 97 })
    })

    it('(int \\space) → 32', () => {
      expect(session().evaluate('(int \\space)')).toMatchObject({ kind: 'number', value: 32 })
    })

    it('(int \\newline) → 10', () => {
      expect(session().evaluate('(int \\newline)')).toMatchObject({ kind: 'number', value: 10 })
    })

    it('(int 3.7) → 3 — truncates floats', () => {
      expect(session().evaluate('(int 3.7)')).toMatchObject({ kind: 'number', value: 3 })
    })

    it('(int -3.7) → -3 — truncates towards zero', () => {
      expect(session().evaluate('(int -3.7)')).toMatchObject({ kind: 'number', value: -3 })
    })

    it('char → int → char round-trip', () => {
      // (char (int \Z)) → \Z
      const result = session().evaluate('(char (int \\Z))')
      expect(result).toMatchObject({ kind: 'character', value: 'Z' })
    })
  })

  describe('str with characters', () => {
    it('(str \\a) → "a" — char contributes its raw value, no backslash', () => {
      expect(session().evaluate('(str \\a)')).toMatchObject({ kind: 'string', value: 'a' })
    })

    it('(str \\h \\e \\l \\l \\o) → "hello"', () => {
      expect(session().evaluate('(str \\h \\e \\l \\l \\o)')).toMatchObject({
        kind: 'string',
        value: 'hello',
      })
    })

    it('(str \\space) → " "', () => {
      expect(session().evaluate('(str \\space)')).toMatchObject({ kind: 'string', value: ' ' })
    })

    it('(str "prefix" \\! "suffix") → "prefix!suffix"', () => {
      expect(session().evaluate('(str "prefix" \\! "suffix")')).toMatchObject({
        kind: 'string',
        value: 'prefix!suffix',
      })
    })
  })

  describe('compare with characters', () => {
    it('(compare \\a \\b) → negative', () => {
      const result = session().evaluate('(compare \\a \\b)')
      expect(result).toMatchObject({ kind: 'number' })
      if (result.kind === 'number') expect(result.value).toBeLessThan(0)
    })

    it('(compare \\b \\a) → positive', () => {
      const result = session().evaluate('(compare \\b \\a)')
      expect(result).toMatchObject({ kind: 'number' })
      if (result.kind === 'number') expect(result.value).toBeGreaterThan(0)
    })

    it('(compare \\a \\a) → 0', () => {
      expect(session().evaluate('(compare \\a \\a)')).toMatchObject({ kind: 'number', value: 0 })
    })
  })

  describe('idiomatic Clojure patterns', () => {
    it('(= c \\space) pattern — checking for space character', () => {
      const result = session().evaluate('(let [c \\space] (= c \\space))')
      expect(result).toMatchObject({ kind: 'boolean', value: true })
    })

    it('character in a vector', () => {
      const result = session().evaluate('[\\a \\b \\c]')
      expect(result).toMatchObject({
        kind: 'vector',
        value: [
          { kind: 'character', value: 'a' },
          { kind: 'character', value: 'b' },
          { kind: 'character', value: 'c' },
        ],
      })
    })

    it('character as a map key', () => {
      const result = session().evaluate('(get {\\a 1 \\b 2} \\a)')
      expect(result).toMatchObject({ kind: 'number', value: 1 })
    })

    it('sorting characters with compare: (sort compare [\\c \\a \\b]) → [\\a \\b \\c]', () => {
      // cljam sort defaults to <, which is number-only; use compare for chars
      const result = session().evaluate('(sort compare [\\c \\a \\b])')
      // sort returns a vector in cljam (reduce starts with [])
      expect(result.kind === 'list' || result.kind === 'vector').toBe(true)
      if (result.kind === 'list' || result.kind === 'vector') {
        expect(result.value).toMatchObject([
          { kind: 'character', value: 'a' },
          { kind: 'character', value: 'b' },
          { kind: 'character', value: 'c' },
        ])
      }
    })
  })
})
