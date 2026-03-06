import { describe, expect, it } from 'vitest'
import {
  cljBoolean,
  cljKeyword,
  cljMap,
  cljNil,
  cljNumber,
  cljString,
} from '../factories'
import { EvaluationError } from '../errors'
import { expectError, freshSession } from './evaluator-test-utils'

describe('try / catch / finally / throw', () => {
  describe('try with no error', () => {
    it('returns body value when no exception is thrown', () => {
      const s = freshSession()
      expect(s.evaluate('(try 42)')).toEqual(cljNumber(42))
    })

    it('returns last body form value', () => {
      const s = freshSession()
      expect(s.evaluate('(try 1 2 3)')).toEqual(cljNumber(3))
    })

    it('discards finally result and returns body value', () => {
      const s = freshSession()
      expect(s.evaluate('(try 42 (finally "ignored"))')).toEqual(cljNumber(42))
    })

    it('returns catch-body result — catch clause is not evaluated when no throw', () => {
      const s = freshSession()
      expect(
        s.evaluate('(try 42 (catch :default e "should-not-see-this"))')
      ).toEqual(cljNumber(42))
    })

    it('should fail with multiple finally clauses', () => {
      expectError(
        '(try 42 (finally "ignored") (finally "also-ignored"))',
        'finally clause must be the last in try expression'
      )
    })
  })

  describe('throw', () => {
    it('unhandled throw surfaces as EvaluationError at session boundary', () => {
      expectError(
        '(throw {:type :error/test :message "oops"})',
        'Unhandled throw'
      )
    })

    it('thrown value appears in the error message via printString', () => {
      const s = freshSession()
      let msg = ''
      try {
        s.evaluate('(throw "bare string")')
      } catch (e) {
        if (e instanceof EvaluationError) msg = e.message
      }
      expect(msg).toContain('bare string')
    })
  })

  describe('catch with keyword discriminator', () => {
    it('catches by :type keyword match', () => {
      const s = freshSession()
      expect(
        s.evaluate(`
          (try
            (throw {:type :error/test :message "oops"})
            (catch :error/test e (:message e)))
        `)
      ).toEqual(cljString('oops'))
    })

    it('first matching catch clause wins', () => {
      const s = freshSession()
      expect(
        s.evaluate(`
          (try
            (throw {:type :error/test})
            (catch :error/other e "wrong")
            (catch :error/test e "right")
            (catch :default e "also-wrong"))
        `)
      ).toEqual(cljString('right'))
    })

    it('non-matching keyword clause does not catch', () => {
      expectError(
        `(try
           (throw {:type :error/test})
           (catch :error/other e "nope"))`,
        'Unhandled throw'
      )
    })
  })

  describe('catch with :default', () => {
    it('catches any thrown value', () => {
      const s = freshSession()
      expect(
        s.evaluate(`
          (try
            (throw {:type :error/anything})
            (catch :error/random e "caught random")
            (catch :default e "caught"))
        `)
      ).toEqual(cljString('caught'))
    })

    it('catches a bare non-map thrown value', () => {
      const s = freshSession()
      expect(s.evaluate('(try (throw 99) (catch :default e e))')).toEqual(
        cljNumber(99)
      )
    })

    it('binds the thrown value to the catch symbol', () => {
      const s = freshSession()
      expect(
        s.evaluate(`
          (try
            (throw {:type :error/test :message "hello"})
            (catch :default e (:message e)))
        `)
      ).toEqual(cljString('hello'))
    })
  })

  describe('catch with predicate function', () => {
    it('catches when predicate returns truthy', () => {
      const s = freshSession()
      expect(
        s.evaluate(`
          (try
            (throw {:type :error/test})
            (catch map? e "is-a-map"))
        `)
      ).toEqual(cljString('is-a-map'))
    })

    it('does not catch when predicate returns falsy', () => {
      expectError(
        `(try
           (throw {:type :error/test})
           (catch string? e "nope"))`,
        'Unhandled throw'
      )
    })

    it('catches a thrown string with string? predicate', () => {
      const s = freshSession()
      expect(
        s.evaluate('(try (throw "oops") (catch string? e (str "got: " e)))')
      ).toEqual(cljString('got: oops'))
    })
  })

  describe('catching EvaluationErrors (runtime errors)', () => {
    it('catches a runtime evaluation error with :error/runtime', () => {
      const s = freshSession()
      expect(
        s.evaluate('(try (+ "a" 1) (catch :error/runtime e "runtime-error"))')
      ).toEqual(cljString('runtime-error'))
    })

    it('catches a runtime evaluation error with :default', () => {
      const s = freshSession()
      expect(
        s.evaluate('(try (+ "a" 1) (catch :default e (:type e)))')
      ).toEqual(cljKeyword(':error/runtime'))
    })

    it('synthesized map has a :message key with the error text', () => {
      expectError('(+ "a" 1)', {
        message: /expects all arguments to be numbers/,
      })
    })

    it('domain-specific keyword does not catch a runtime error', () => {
      expectError(
        '(try (+ "a" 1) (catch :error/not-found e "x"))',
        'expects all arguments to be numbers'
      )
    })
  })

  describe('finally', () => {
    it('runs finally when no error occurs', () => {
      const s = freshSession()
      s.evaluate('(def ran (atom false))')
      s.evaluate('(try 42 (finally (reset! ran true)))')
      expect(s.evaluate('@ran')).toEqual(cljBoolean(true))
    })

    it('runs finally when error is caught', () => {
      const s = freshSession()
      s.evaluate('(def ran (atom false))')
      const result = s.evaluate(`
        (try
          (throw {:type :error/test})
          (catch :default e nil)
          (finally (reset! ran true)))
      `)
      expect(result).toEqual(cljNil())
      expect(s.evaluate('@ran')).toEqual(cljBoolean(true))
    })

    it('runs finally even when error is not caught (observed via outer try)', () => {
      const s = freshSession()
      s.evaluate('(def ran (atom false))')
      const result = s.evaluate(`
        (try
          (try
            (throw {:type :error/test})
            (finally (reset! ran true)))
          (catch :default e nil))
      `)
      expect(result).toEqual(cljNil())
      expect(s.evaluate('@ran')).toEqual(cljBoolean(true))
    })

    it('finally result is discarded — catch result is returned', () => {
      const s = freshSession()
      expect(
        s.evaluate(`
          (try
            (throw {:type :error/test})
            (catch :default e "catch-result")
            (finally "finally-result"))
        `)
      ).toEqual(cljString('catch-result'))
    })
  })

  describe('nested try', () => {
    it('inner catch handles; outer never sees the error', () => {
      const s = freshSession()
      expect(
        s.evaluate(`
          (try
            (try
              (throw {:type :error/inner})
              (catch :error/inner e "handled-inner"))
            (catch :default e "outer-should-not-run"))
        `)
      ).toEqual(cljString('handled-inner'))
    })

    it('inner does not catch; outer does', () => {
      const s = freshSession()
      expect(
        s.evaluate(`
          (try
            (try
              (throw {:type :error/escaped})
              (catch :error/other e "wrong"))
            (catch :error/escaped e "caught-by-outer"))
        `)
      ).toEqual(cljString('caught-by-outer'))
    })
  })

  describe('ex-info / ex-message / ex-data / ex-cause', () => {
    it('ex-info 2-arity returns a map with :message and :data', () => {
      const s = freshSession()
      expect(s.evaluate('(ex-info "oops" {:id 1})')).toEqual(
        cljMap([
          [cljKeyword(':message'), cljString('oops')],
          [cljKeyword(':data'), cljMap([[cljKeyword(':id'), cljNumber(1)]])],
        ])
      )
    })

    it('ex-info 3-arity includes :cause', () => {
      const s = freshSession()
      const result = s.evaluate('(ex-info "outer" {:k 1} (ex-info "root" {}))')
      expect(result.kind).toBe('map')
      if (result.kind === 'map') {
        const causeEntry = result.entries.find(
          ([k]) => k.kind === 'keyword' && k.name === ':cause'
        )
        expect(causeEntry).toBeDefined()
      }
    })

    it('ex-message returns the :message string', () => {
      const s = freshSession()
      expect(s.evaluate('(ex-message (ex-info "my-error" {}))')).toEqual(
        cljString('my-error')
      )
    })

    it('ex-data returns the :data map', () => {
      const s = freshSession()
      expect(s.evaluate('(ex-data (ex-info "err" {:code 42}))')).toEqual(
        cljMap([[cljKeyword(':code'), cljNumber(42)]])
      )
    })

    it('ex-cause returns the :cause value', () => {
      const s = freshSession()
      expect(
        s.evaluate('(ex-cause (ex-info "outer" {} (ex-info "inner" {})))')
      ).toEqual(
        cljMap([
          [cljKeyword(':message'), cljString('inner')],
          [cljKeyword(':data'), cljMap([])],
        ])
      )
    })

    it('ex-message returns nil on a non-map', () => {
      const s = freshSession()
      expect(s.evaluate('(ex-message 42)')).toEqual(cljNil())
    })

    it('ex-data returns nil on a non-map', () => {
      const s = freshSession()
      expect(s.evaluate('(ex-data nil)')).toEqual(cljNil())
    })

    it('ex-cause returns nil when :cause is absent', () => {
      const s = freshSession()
      expect(s.evaluate('(ex-cause (ex-info "no-cause" {}))')).toEqual(cljNil())
    })

    it('expectError supports partial shape matching on :message/:data/:cause', () => {
      expectError('(throw (ex-info "not found" {:id 99}))', {
        message: 'not found',
        data: { id: 99 },
      })
    })

    it('expectError supports nested cause partial matching', () => {
      expectError(
        '(throw (ex-info "outer" {:id 1} (ex-info "inner" {:deep true :partial "yeah!"})))',
        {
          cause: {
            message: 'inner',
            data: { deep: true },
          },
        }
      )
      expectError(
        '(throw (ex-info "outer" {:id 1} (ex-info "inner" {:deep true :partial "yeah!"})))',
        {
          cause: {
            message: 'inner',
            data: { partial: 'yeah!' },
          },
        }
      )
    })
  })
})
