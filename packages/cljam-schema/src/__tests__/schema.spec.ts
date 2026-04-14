import { describe, expect, it } from 'vitest'
import { createSession, cljToJs } from '@regibyte/cljam'
import type { FunctionApplier } from '@regibyte/cljam'
import { library as schemaLib } from '../../schema'

// Schema results are plain data — no Clojure functions expected in conversion output
const noFnApplier: FunctionApplier = {
  applyFunction: () => {
    throw new Error('cljToJs: unexpected function in schema result')
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession() {
  return createSession({
    libraries: [schemaLib],
    allowedPackages: ['cljam.schema'],
  })
}

/** Evaluate a source string, return the raw CljValue result. */
function run(source: string) {
  return makeSession().evaluate(source)
}

/** Evaluate and convert to JS for easy assertions. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function runJs(source: string): any {
  return cljToJs(run(source), noFnApplier)
}

/** Prefix with require and evaluate. */
function withS(source: string) {
  return runJs(`
    (ns t (:require [cljam.schema.core :as s]))
    ${source}
  `)
}

type ValidateRow = {
  label: string
  form: string
  match: Record<string, unknown>
  /** When present, assert first issue message matches */
  msg?: RegExp
}

function expectValidate(row: ValidateRow) {
  const r = withS(row.form)
  expect(r).toMatchObject(row.match)
  if (row.msg) {
    // validate has no :message — use s/explain for message assertions
    const explainForm = row.form.replace(/s\/validate/g, 's/explain')
    const explained = withS(explainForm)
    expect(explained.issues[0].message).toMatch(row.msg)
  }
}

// ---------------------------------------------------------------------------
// 1. Library setup
// ---------------------------------------------------------------------------

describe('cljam-schema — library setup', () => {
  it('installs without error', () => {
    expect(() => makeSession()).not.toThrow()
  })

  it('appears in session.capabilities.libraries', () => {
    const session = makeSession()
    expect(session.capabilities.libraries).toContain('cljam-schema')
  })

  it.each([
    {
      label: 'cljam.schema.core loads on :require',
      src: '(ns t (:require [cljam.schema.core :as s]))',
    },
    {
      label: 'native namespace is accessible',
      src: '(ns t (:require [cljam.schema.native :as sn]))',
    },
  ])('$label', ({ src }) => {
    expect(() => makeSession().evaluate(src)).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// 2. Primitive schemas — validate
// ---------------------------------------------------------------------------

describe('cljam-schema — primitive validate', () => {
  it.each<ValidateRow>([
    {
      label: ':string accepts a string',
      form: '(s/validate :string "hello")',
      match: { ok: true, value: 'hello' },
    },
    {
      label: ':string rejects a number',
      form: '(s/validate :string 42)',
      match: { ok: false },
      msg: /expected a string/,
    },
    {
      label: ':int accepts an integer',
      form: '(s/validate :int 42)',
      match: { ok: true, value: 42 },
    },
    {
      label: ':int rejects a float',
      form: '(s/validate :int 3.14)',
      match: { ok: false },
      msg: /expected an integer/,
    },
    {
      label: ':int rejects a string',
      form: '(s/validate :int "oops")',
      match: { ok: false },
    },
    {
      label: ':number accepts an integer',
      form: '(s/validate :number 42)',
      match: { ok: true, value: 42 },
    },
    {
      label: ':number accepts a float',
      form: '(s/validate :number 3.14)',
      match: { ok: true, value: 3.14 },
    },
    {
      label: ':number rejects a string',
      form: '(s/validate :number "x")',
      match: { ok: false },
    },
    {
      label: ':boolean accepts true',
      form: '(s/validate :boolean true)',
      match: { ok: true, value: true },
    },
    {
      label: ':boolean accepts false',
      form: '(s/validate :boolean false)',
      match: { ok: true, value: false },
    },
    {
      label: ':boolean rejects nil',
      form: '(s/validate :boolean nil)',
      match: { ok: false },
    },
    {
      label: ':keyword accepts a keyword',
      form: '(s/validate :keyword :foo)',
      match: { ok: true },
    },
    {
      label: ':keyword rejects a string',
      form: '(s/validate :keyword "foo")',
      match: { ok: false },
    },
    {
      label: ':nil accepts nil',
      form: '(s/validate :nil nil)',
      match: { ok: true },
    },
    {
      label: ':nil rejects false',
      form: '(s/validate :nil false)',
      match: { ok: false },
    },
    {
      label: ':uuid accepts a valid UUID string',
      form: '(s/validate :uuid "550e8400-e29b-41d4-a716-446655440000")',
      match: { ok: true },
    },
    {
      label: ':uuid rejects an invalid UUID',
      form: '(s/validate :uuid "not-a-uuid")',
      match: { ok: false },
    },
    {
      label: ':uuid rejects a non-string',
      form: '(s/validate :uuid 42)',
      match: { ok: false },
    },
  ])('$label', (row) => {
    expectValidate(row)
  })

  it.each([
    { label: 'number', form: '(s/validate :any 42)' },
    { label: 'string', form: '(s/validate :any "x")' },
    { label: 'nil', form: '(s/validate :any nil)' },
    { label: 'map', form: '(s/validate :any {:a 1})' },
  ])(':any accepts $label', ({ form }) => {
    expect(withS(form)).toMatchObject({ ok: true })
  })
})

// ---------------------------------------------------------------------------
// 3. Primitive schemas with props
// ---------------------------------------------------------------------------

describe('cljam-schema — primitive schemas with props', () => {
  it.each<ValidateRow>([
    {
      label: '[:string {:min 3}] accepts long enough string',
      form: '(s/validate [:string {:min 3}] "hello")',
      match: { ok: true },
    },
    {
      label: '[:string {:min 3}] rejects short string',
      form: '(s/validate [:string {:min 3}] "hi")',
      match: { ok: false },
      msg: /minimum length is 3/,
    },
    {
      label: '[:string {:max 5}] accepts short string',
      form: '(s/validate [:string {:max 5}] "hi")',
      match: { ok: true },
    },
    {
      label: '[:string {:max 5}] rejects long string',
      form: '(s/validate [:string {:max 5}] "toolong")',
      match: { ok: false },
    },
    {
      label: '[:string {:pattern "^\\\\d+$"}] accepts digits',
      form: '(s/validate [:string {:pattern "^\\\\d+$"}] "12345")',
      match: { ok: true },
    },
    {
      label: '[:string {:pattern "^\\\\d+$"}] rejects non-digits',
      form: '(s/validate [:string {:pattern "^\\\\d+$"}] "abc")',
      match: { ok: false },
    },
    {
      label: '[:int {:min 0 :max 100}] accepts in-range value',
      form: '(s/validate [:int {:min 0 :max 100}] 42)',
      match: { ok: true },
    },
    {
      label: '[:int {:min 0}] rejects negative',
      form: '(s/validate [:int {:min 0}] -1)',
      match: { ok: false },
    },
    {
      label: '[:int {:max 10}] rejects too large',
      form: '(s/validate [:int {:max 10}] 11)',
      match: { ok: false },
    },
    {
      label: '[:number {:min 0.5}] rejects below threshold',
      form: '(s/validate [:number {:min 0.5}] 0.1)',
      match: { ok: false },
    },
  ])('$label', expectValidate)

  it('min-length / max-length aliases work', () => {
    expect(withS('(s/validate [:string {:min-length 2}] "ab")')).toMatchObject({
      ok: true,
    })
    expect(withS('(s/validate [:string {:max-length 2}] "abc")')).toMatchObject(
      { ok: false }
    )
  })
})

// ---------------------------------------------------------------------------
// 4. valid? and explain
// ---------------------------------------------------------------------------

describe('cljam-schema — valid? and explain', () => {
  it.each([
    {
      label: 'valid? returns true on success',
      form: '(s/valid? :string "hello")',
      assert: (v: unknown) => expect(v).toBe(true),
    },
    {
      label: 'valid? returns false on failure',
      form: '(s/valid? :string 42)',
      assert: (v: unknown) => expect(v).toBe(false),
    },
    {
      label: 'explain returns same shape as validate',
      form: '(s/explain :string "hi")',
      assert: (v: unknown) =>
        expect(v).toMatchObject({ ok: true, value: 'hi' }),
    },
  ])('$label', ({ form, assert }) => {
    assert(withS(form))
  })
})

// ---------------------------------------------------------------------------
// 5. [:map ...] schema
// ---------------------------------------------------------------------------

describe('cljam-schema — [:map ...] schema', () => {
  it('validates a simple map', () => {
    expect(
      withS(
        '(s/validate [:map [:name :string] [:age :int]] {:name "Alice" :age 30})'
      )
    ).toMatchObject({ ok: true })
  })

  it.each<
    ValidateRow & { pathLen?: number }
  >([
    {
      label: 'rejects non-map value',
      form: '(s/validate [:map [:name :string]] "not a map")',
      match: { ok: false },
    },
    {
      label: 'reports missing required key',
      form: '(s/validate [:map [:name :string] [:age :int]] {:name "Alice"})',
      match: { ok: false },
      msg: /missing required key :age/,
    },
    {
      label: 'validates optional key when present (wrong type fails)',
      form: `
      (s/validate
        [:map [:name :string] [:email {:optional true} :string]]
        {:name "Alice" :email 42})`,
      match: { ok: false },
      msg: /expected a string/,
    },
    {
      label: 'path includes the failing field key',
      form: `
      (s/validate [:map [:name :string] [:age :int]] {:name "Alice" :age "oops"})`,
      match: { ok: false },
      pathLen: 1,
    },
    {
      label: '{:closed true} rejects extra keys',
      form: `
      (s/validate [:map {:closed true} [:name :string]] {:name "Alice" :extra "not ok"})`,
      match: { ok: false },
      msg: /unexpected key/,
    },
    {
      label: 'nested failure path includes both levels',
      form: `
      (s/validate
        [:map [:user [:map [:name :string]]]]
        {:user {:name 42}})`,
      match: { ok: false },
      pathLen: 2,
    },
    {
      label: 'optional field with schema constraints: present and invalid fails',
      form: `
      (s/validate
        [:map [:bio {:optional true} [:string {:max 3}]]]
        {:bio "too long string"})`,
      match: { ok: false },
    },
  ])('$label', (row) => {
    const r = withS(row.form)
    expect(r).toMatchObject(row.match)
    if (row.msg) {
      const explained = withS(row.form.replace(/s\/validate/g, 's/explain'))
      expect(explained.issues[0].message).toMatch(row.msg)
    }
    if (row.pathLen !== undefined) {
      expect(r.issues[0].path).toHaveLength(row.pathLen)
    }
  })

  it('collects all missing key issues at once', () => {
    const r = withS(
      '(s/validate [:map [:name :string] [:age :int] [:email :string]] {})'
    )
    expect(r.issues).toHaveLength(3)
  })

  it('accepts optional key being absent', () => {
    expect(
      withS(`
      (s/validate
        [:map [:name :string] [:email {:optional true} :string]]
        {:name "Alice"})
    `)
    ).toMatchObject({ ok: true })
  })

  it('is open by default (ignores extra keys)', () => {
    expect(
      withS(`
      (s/validate [:map [:name :string]] {:name "Alice" :extra "ok"})
    `)
    ).toMatchObject({ ok: true })
  })

  it('validates nested map schemas', () => {
    expect(
      withS(`
      (s/validate
        [:map [:user [:map [:name :string] [:age :int]]]]
        {:user {:name "Alice" :age 30}})
    `)
    ).toMatchObject({ ok: true })
  })

  it.each([
    {
      label: 'optional field with schema constraints: absent is ok',
      form: `
      (s/validate
        [:map [:bio {:optional true} [:string {:max 500}]]]
        {})`,
    },
    {
      label: 'optional field with schema constraints: present and valid passes',
      form: `
      (s/validate
        [:map [:bio {:optional true} [:string {:max 100}]]]
        {:bio "short"})`,
    },
  ])('$label', ({ form }) => {
    expect(withS(form)).toMatchObject({ ok: true })
  })
})

// ---------------------------------------------------------------------------
// 6. [:vector ...] schema
// ---------------------------------------------------------------------------

describe('cljam-schema — [:vector ...] schema', () => {
  it.each([
    {
      label: 'validates a vector of strings',
      form: '(s/validate [:vector :string] ["a" "b" "c"])',
    },
    {
      label: 'validates an empty vector',
      form: '(s/validate [:vector :string] [])',
    },
  ])('$label', ({ form }) => {
    expect(withS(form)).toMatchObject({ ok: true })
  })

  it.each<ValidateRow>([
    {
      label: 'rejects non-vector',
      form: '(s/validate [:vector :string] "not a vector")',
      match: { ok: false },
    },
    {
      label: '[:vector {:min 2} :string] rejects too short',
      form: '(s/validate [:vector {:min 2} :string] ["a"])',
      match: { ok: false },
    },
    {
      label: '[:vector {:max 2} :string] rejects too long',
      form: '(s/validate [:vector {:max 2} :string] ["a" "b" "c"])',
      match: { ok: false },
    },
  ])('$label', expectValidate)

  it('reports element-level failure with index in path', () => {
    const r = withS('(s/validate [:vector :int] [1 2 "oops" 4])')
    expect(r).toMatchObject({ ok: false })
    expect(r.issues[0].path).toHaveLength(1)
  })

  it('collects all element issues', () => {
    const r = withS('(s/validate [:vector :int] ["a" "b" "c"])')
    expect(r.issues).toHaveLength(3)
  })

  it('validates vector of maps', () => {
    expect(
      withS(`
      (s/validate
        [:vector [:map [:name :string]]]
        [{:name "Alice"} {:name "Bob"}])
    `)
    ).toMatchObject({ ok: true })
  })
})

// ---------------------------------------------------------------------------
// 7. [:tuple ...] schema
// ---------------------------------------------------------------------------

describe('cljam-schema — [:tuple ...] schema', () => {
  it.each<ValidateRow>([
    {
      label: 'validates a matching tuple',
      form: '(s/validate [:tuple :string :int :boolean] ["hello" 42 true])',
      match: { ok: true },
    },
    {
      label: 'rejects wrong length',
      form: '(s/validate [:tuple :string :int] ["hello"])',
      match: { ok: false },
      msg: /expected tuple of length 2/,
    },
    {
      label: 'reports element-level type mismatch',
      form: '(s/validate [:tuple :string :int] ["hello" "notint"])',
      match: { ok: false },
      msg: /expected an integer/,
    },
    {
      label: 'rejects non-vector',
      form: '(s/validate [:tuple :string] "x")',
      match: { ok: false },
    },
  ])('$label', expectValidate)
})

// ---------------------------------------------------------------------------
// 8. [:maybe ...] schema
// ---------------------------------------------------------------------------

describe('cljam-schema — [:maybe ...] schema', () => {
  it.each<ValidateRow>([
    {
      label: 'accepts nil',
      form: '(s/validate [:maybe :string] nil)',
      match: { ok: true },
    },
    {
      label: 'accepts valid non-nil value',
      form: '(s/validate [:maybe :string] "hello")',
      match: { ok: true },
    },
    {
      label: 'rejects invalid non-nil value',
      form: '(s/validate [:maybe :string] 42)',
      match: { ok: false },
    },
  ])('$label', expectValidate)

  it.each([
    {
      label: 'nil',
      form: '(s/validate [:maybe [:map [:name :string]]] nil)',
      ok: true,
    },
    {
      label: 'valid map',
      form: '(s/validate [:maybe [:map [:name :string]]] {:name "Alice"})',
      ok: true,
    },
    {
      label: 'invalid map',
      form: '(s/validate [:maybe [:map [:name :string]]] {:name 42})',
      ok: false,
    },
  ])('compound child: $label', ({ form, ok }) => {
    expect(withS(form)).toMatchObject({ ok })
  })
})

// ---------------------------------------------------------------------------
// 9. [:or ...] schema
// ---------------------------------------------------------------------------

describe('cljam-schema — [:or ...] schema', () => {
  it.each<ValidateRow>([
    {
      label: 'accepts value matching first branch',
      form: '(s/validate [:or :string :int] "hello")',
      match: { ok: true },
    },
    {
      label: 'accepts value matching second branch',
      form: '(s/validate [:or :string :int] 42)',
      match: { ok: true },
    },
    {
      label: 'rejects value matching no branch',
      form: '(s/validate [:or :string :int] true)',
      match: { ok: false },
    },
  ])('$label', expectValidate)

  it('returns an issue when none match', () => {
    const r = withS('(s/validate [:or :string :int] :keyword)')
    expect(r.issues).toHaveLength(1)
    expect(r.issues[0]['error-code']).toBe('or/no-match')
    const explained = withS('(s/explain [:or :string :int] :keyword)')
    expect(explained.issues[0].message).toMatch(/does not match any of the allowed schemas/)
  })
})

// ---------------------------------------------------------------------------
// 10. [:and ...] schema
// ---------------------------------------------------------------------------

describe('cljam-schema — [:and ...] schema', () => {
  it.each<ValidateRow>([
    {
      label: 'accepts value passing all constraints',
      form: '(s/validate [:and :string [:string {:min 3}]] "hello")',
      match: { ok: true },
    },
    {
      label: 'rejects value failing any constraint',
      form: '(s/validate [:and :string [:string {:min 10}]] "hi")',
      match: { ok: false },
    },
  ])('$label', expectValidate)

  it('collects issues from all failing branches', () => {
    const r = withS(
      '(s/validate [:and [:string {:min 5}] [:string {:max 3}]] "abc")'
    )
    expect(r.issues).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// 11. [:enum ...] schema
// ---------------------------------------------------------------------------

describe('cljam-schema — [:enum ...] schema', () => {
  it.each<ValidateRow>([
    {
      label: 'accepts keyword in enum',
      form: '(s/validate [:enum :red :green :blue] :red)',
      match: { ok: true },
    },
    {
      label: 'rejects keyword not in enum',
      form: '(s/validate [:enum :red :green :blue] :purple)',
      match: { ok: false },
    },
    {
      label: 'string enum: accept',
      form: '(s/validate [:enum "a" "b" "c"] "b")',
      match: { ok: true },
    },
    {
      label: 'string enum: reject',
      form: '(s/validate [:enum "a" "b" "c"] "d")',
      match: { ok: false },
    },
    {
      label: 'integer enum: accept',
      form: '(s/validate [:enum 1 2 3] 2)',
      match: { ok: true },
    },
    {
      label: 'integer enum: reject',
      form: '(s/validate [:enum 1 2 3] 4)',
      match: { ok: false },
    },
  ])('$label', expectValidate)

  it('includes allowed values in explained message', () => {
    const r = withS('(s/explain [:enum :a :b] :c)')
    expect(r.issues[0].message).toMatch(/:a/)
    expect(r.issues[0].message).toMatch(/:b/)
  })
})

// ---------------------------------------------------------------------------
// 12. [:fn ...] schema
// ---------------------------------------------------------------------------

describe('cljam-schema — [:fn ...] schema', () => {
  it.each<ValidateRow>([
    {
      label: 'accepts value where predicate returns truthy',
      form: '(s/validate [:fn pos?] 42)',
      match: { ok: true },
    },
    {
      label: 'rejects value where predicate returns falsy',
      form: '(s/validate [:fn pos?] -1)',
      match: { ok: false },
    },
    {
      label: 'anon fn predicate: pass',
      form: '(s/validate [:fn (fn [x] (> x 10))] 42)',
      match: { ok: true },
    },
    {
      label: 'anon fn predicate: fail',
      form: '(s/validate [:fn (fn [x] (> x 10))] 5)',
      match: { ok: false },
    },
  ])('$label', expectValidate)
})

// ---------------------------------------------------------------------------
// 13. Schema DSL is plain data — composable and inspectable
// ---------------------------------------------------------------------------

describe('cljam-schema — schema DSL is plain data', () => {
  it('schemas can be stored in vars and reused', () => {
    expect(
      withS(`
      (def name-schema [:string {:min 1 :max 100}])
      (s/validate name-schema "Alice")
    `)
    ).toMatchObject({ ok: true })
  })

  it('schemas can be nested inside other schemas', () => {
    expect(
      withS(`
      (def name-schema [:string {:min 1}])
      (def user-schema [:map [:name name-schema] [:age :int]])
      (s/validate user-schema {:name "Alice" :age 30})
    `)
    ).toMatchObject({ ok: true })
  })

  it('schemas can be inspected with pr-str', () => {
    const r = withS(`
      (def user-schema [:map [:name :string] [:age :int]])
      (pr-str user-schema)
    `)
    expect(typeof r).toBe('string')
    expect(r).toContain(':map')
  })

  it('keyword schemas are just keywords — no magic', () => {
    const r = withS('(= :string :string)')
    expect(r).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 14. json-schema generation
// ---------------------------------------------------------------------------

describe('cljam-schema — json-schema', () => {
  it.each([
    {
      label: ':string',
      form: '(s/json-schema :string)',
      match: { type: 'string' },
    },
    {
      label: ':int',
      form: '(s/json-schema :int)',
      match: { type: 'integer' },
    },
    {
      label: ':number',
      form: '(s/json-schema :number)',
      match: { type: 'number' },
    },
    {
      label: ':boolean',
      form: '(s/json-schema :boolean)',
      match: { type: 'boolean' },
    },
    {
      label: ':nil',
      form: '(s/json-schema :nil)',
      match: { type: 'null' },
    },
    {
      label: ':any',
      form: '(s/json-schema :any)',
      match: {},
    },
  ])('$label → JSON type', ({ form, match }) => {
    expect(withS(form)).toMatchObject(match)
  })

  it(':uuid → {type: string, format: uuid}', () => {
    expect(withS('(s/json-schema :uuid)')).toMatchObject({
      type: 'string',
      format: 'uuid',
    })
  })

  it.each([
    {
      label: 'string min/max length',
      form: '(s/json-schema [:string {:min 3 :max 100}])',
      match: { type: 'string', minLength: 3, maxLength: 100 },
    },
    {
      label: 'int min/max',
      form: '(s/json-schema [:int {:min 0 :max 150}])',
      match: { type: 'integer', minimum: 0, maximum: 150 },
    },
  ])('props: $label', ({ form, match }) => {
    expect(withS(form)).toMatchObject(match)
  })

  it('[:map [:name :string] [:age :int]] emits object schema', () => {
    const r = withS('(s/json-schema [:map [:name :string] [:age :int]])')
    expect(r).toMatchObject({
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'integer' } },
      required: ['name', 'age'],
    })
  })

  it('optional fields are not in required array', () => {
    const r = withS(`
      (s/json-schema [:map [:name :string] [:email {:optional true} :string]])
    `)
    expect(r.required).toEqual(['name'])
    expect(r.properties).toHaveProperty('email')
  })

  it('[:map {:closed true} ...] emits additionalProperties: false', () => {
    const r = withS('(s/json-schema [:map {:closed true} [:name :string]])')
    expect(r).toMatchObject({ additionalProperties: false })
  })

  it.each([
    {
      label: '[:vector :string]',
      form: '(s/json-schema [:vector :string])',
      match: { type: 'array', items: { type: 'string' } },
    },
    {
      label: '[:vector {:min 1 :max 10} :string]',
      form: '(s/json-schema [:vector {:min 1 :max 10} :string])',
      match: { type: 'array', minItems: 1, maxItems: 10 },
    },
  ])('$label', ({ form, match }) => {
    expect(withS(form)).toMatchObject(match)
  })

  it('[:tuple :string :int] emits prefixItems', () => {
    const r = withS('(s/json-schema [:tuple :string :int])')
    expect(r).toMatchObject({
      type: 'array',
      minItems: 2,
      maxItems: 2,
    })
    expect(r.prefixItems).toHaveLength(2)
  })

  it('[:maybe :string] emits oneOf with null', () => {
    const r = withS('(s/json-schema [:maybe :string])')
    expect(r.oneOf).toHaveLength(2)
    expect(r.oneOf).toContainEqual({ type: 'string' })
    expect(r.oneOf).toContainEqual({ type: 'null' })
  })

  it.each([
    {
      label: '[:or :string :int]',
      form: '(s/json-schema [:or :string :int])',
      check: (r: { oneOf: unknown[] }) => expect(r.oneOf).toHaveLength(2),
    },
    {
      label: '[:and :string [:string {:min 3}]]',
      form: '(s/json-schema [:and :string [:string {:min 3}]])',
      check: (r: { allOf: unknown[] }) => expect(r.allOf).toHaveLength(2),
    },
    {
      label: '[:enum :red :green :blue]',
      form: '(s/json-schema [:enum :red :green :blue])',
      check: (r: { enum: unknown[] }) => {
        expect(r).toHaveProperty('enum')
        expect(r.enum).toHaveLength(3)
      },
    },
  ])('$label', ({ form, check }) => {
    check(withS(form))
  })

  it('nested map → nested object schema', () => {
    const r = withS(`
      (s/json-schema [:map [:user [:map [:name :string] [:age :int]]]])
    `)
    expect(r.properties.user).toMatchObject({
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'integer' } },
    })
  })
})

// ---------------------------------------------------------------------------
// 15. Issue path tracking
// ---------------------------------------------------------------------------

describe('cljam-schema — issue path tracking', () => {
  it.each([
    {
      label: 'top-level failure has empty path',
      form: '(s/validate :string 42)',
      pathLen: 0,
    },
    {
      label: 'map field failure has field key in path',
      form: '(s/validate [:map [:name :int]] {:name "oops"})',
      pathLen: 1,
    },
    {
      label: 'nested map failure has 2-element path',
      form: `
      (s/validate
        [:map [:user [:map [:name :int]]]]
        {:user {:name "oops"}})`,
      pathLen: 2,
    },
    {
      label: 'vector element failure has numeric index in path',
      form: '(s/validate [:vector :int] [1 2 "oops"])',
      pathLen: 1,
    },
  ])('$label', ({ form, pathLen }) => {
    const r = withS(form)
    expect(r.issues[0].path).toHaveLength(pathLen)
  })
})

// ---------------------------------------------------------------------------
// 16. Practical real-world schema example
// ---------------------------------------------------------------------------

describe('cljam-schema — real-world schema', () => {
  const userSchema = `
    [:map
     [:id :uuid]
     [:name [:string {:min 1 :max 100}]]
     [:age [:int {:min 0 :max 150}]]
     [:role [:enum :admin :user :guest]]
     [:email {:optional true} [:string {:pattern "@"}]]
     [:tags {:optional true} [:vector :string]]]
  `

  it.each([
    {
      label: 'complete valid user',
      body: `{:id "550e8400-e29b-41d4-a716-446655440000"
         :name "Alice"
         :age 30
         :role :user
         :email "alice@example.com"
         :tags ["clojure" "typescript"]}`,
    },
    {
      label: 'minimal valid user (no optional fields)',
      body: `{:id "550e8400-e29b-41d4-a716-446655440000"
         :name "Bob"
         :age 25
         :role :guest}`,
    },
  ])('accepts $label', ({ body }) => {
    expect(
      withS(`
      (s/validate ${userSchema}
        ${body})
    `)
    ).toMatchObject({ ok: true })
  })

  it('rejects invalid role', () => {
    const r = withS(`
      (s/explain ${userSchema}
        {:id "550e8400-e29b-41d4-a716-446655440000"
         :name "Bob"
         :age 25
         :role :superadmin})
    `)
    expect(r).toMatchObject({ ok: false })
    expect(r.issues[0].message).toMatch(/expected one of/)
  })

  it('can generate JSON Schema for the user schema', () => {
    const r = withS(`(s/json-schema ${userSchema})`)
    expect(r).toMatchObject({ type: 'object' })
    expect(r.required).toContain('id')
    expect(r.required).toContain('name')
    expect(r.required).not.toContain('email')
    expect(r.required).not.toContain('tags')
  })
})

// ---------------------------------------------------------------------------
// 17. Error codes — every failure emits a typed :error-code keyword
// ---------------------------------------------------------------------------

describe('cljam-schema — error codes', () => {
  it.each([
    // Strings
    { label: ':string wrong type', form: '(s/validate :string 42)', code: 'string/wrong-type' },
    { label: ':string too short', form: '(s/validate [:string {:min 5}] "hi")', code: 'string/too-short' },
    { label: ':string too long', form: '(s/validate [:string {:max 2}] "hello")', code: 'string/too-long' },
    { label: ':string pattern fail', form: '(s/validate [:string {:pattern "^\\\\d+$"}] "abc")', code: 'string/pattern-mismatch' },
    // Integers
    { label: ':int wrong type', form: '(s/validate :int "hello")', code: 'int/wrong-type' },
    { label: ':int float rejected', form: '(s/validate :int 3.14)', code: 'int/wrong-type' },
    { label: ':int too small', form: '(s/validate [:int {:min 5}] 2)', code: 'int/too-small' },
    { label: ':int too large', form: '(s/validate [:int {:max 5}] 10)', code: 'int/too-large' },
    // Numbers
    { label: ':number wrong type', form: '(s/validate :number "x")', code: 'number/wrong-type' },
    { label: ':number too small', form: '(s/validate [:number {:min 1.0}] 0.5)', code: 'number/too-small' },
    { label: ':number too large', form: '(s/validate [:number {:max 1.0}] 2.0)', code: 'number/too-large' },
    // Primitives
    { label: ':boolean wrong type', form: '(s/validate :boolean "oops")', code: 'boolean/wrong-type' },
    { label: ':keyword wrong type', form: '(s/validate :keyword 42)', code: 'keyword/wrong-type' },
    { label: ':symbol wrong type', form: '(s/validate :symbol 42)', code: 'symbol/wrong-type' },
    { label: ':nil wrong type', form: '(s/validate :nil 42)', code: 'nil/wrong-type' },
    { label: ':uuid wrong type (non-string)', form: '(s/validate :uuid 42)', code: 'uuid/wrong-type' },
    { label: ':uuid invalid format', form: '(s/validate :uuid "not-a-uuid")', code: 'uuid/invalid-format' },
    // Map
    { label: ':map wrong type', form: '(s/validate [:map [:a :string]] "oops")', code: 'map/wrong-type' },
    { label: ':map missing required key', form: '(s/validate [:map [:a :string]] {})', code: 'map/missing-key' },
    { label: ':map extra key (closed)', form: '(s/validate [:map {:closed true} [:a :string]] {:a "ok" :b "extra"})', code: 'map/extra-key' },
    // Vector
    { label: ':vector wrong type', form: '(s/validate [:vector :string] "oops")', code: 'vector/wrong-type' },
    { label: ':vector too short', form: '(s/validate [:vector {:min 3} :string] ["a"])', code: 'vector/too-short' },
    { label: ':vector too long', form: '(s/validate [:vector {:max 1} :string] ["a" "b"])', code: 'vector/too-long' },
    // Tuple
    { label: ':tuple wrong type', form: '(s/validate [:tuple :string] "oops")', code: 'tuple/wrong-type' },
    { label: ':tuple wrong length', form: '(s/validate [:tuple :string :int] ["only-one"])', code: 'tuple/wrong-length' },
    // Logical
    { label: ':or no match', form: '(s/validate [:or :string :int] true)', code: 'or/no-match' },
    { label: ':enum no match', form: '(s/validate [:enum :a :b] :c)', code: 'enum/no-match' },
    { label: ':fn predicate failed', form: '(s/validate [:fn pos?] -1)', code: 'fn/predicate-failed' },
  ])('$label → error-code :$code', ({ form, code }) => {
    const r = withS(form)
    expect(r.ok).toBe(false)
    expect(r.issues[0]['error-code']).toBe(code)
  })

  it('validate result has no :message field on issues', () => {
    const r = withS('(s/validate :string 42)')
    expect(r.issues[0]).not.toHaveProperty('message')
    expect(r.issues[0]).toHaveProperty('error-code')
    expect(r.issues[0]).toHaveProperty('path')
    expect(r.issues[0]).toHaveProperty('schema')
  })
})

// ---------------------------------------------------------------------------
// 18. s/explain — message formatting with default and custom registries
// ---------------------------------------------------------------------------

describe('cljam-schema — s/explain message formatting', () => {
  it('explain on success returns {:ok true :value v} (same as validate)', () => {
    expect(withS('(s/explain :string "hello")')).toMatchObject({ ok: true, value: 'hello' })
  })

  it('explain adds :message to each issue using default-messages', () => {
    const r = withS('(s/explain :string 42)')
    expect(r.ok).toBe(false)
    expect(r.issues[0]).toHaveProperty('message')
    expect(r.issues[0].message).toBe('expected a string')
  })

  it('explain :string/too-short includes the min length from schema props', () => {
    const r = withS('(s/explain [:string {:min 8}] "hi")')
    expect(r.issues[0].message).toContain('8')
  })

  it('explain :int/too-large includes the max value', () => {
    const r = withS('(s/explain [:int {:max 10}] 42)')
    expect(r.issues[0].message).toContain('10')
  })

  it('explain :map/missing-key includes the key name', () => {
    const r = withS('(s/explain [:map [:email :string]] {})')
    expect(r.issues[0].message).toContain(':email')
  })

  it('explain :map/extra-key includes the extra key name', () => {
    const r = withS('(s/explain [:map {:closed true} [:a :string]] {:a "ok" :b "extra"})')
    expect(r.issues[0].message).toContain(':b')
  })

  it('explain :tuple/wrong-length includes the expected count', () => {
    const r = withS('(s/explain [:tuple :string :int :boolean] ["only"])')
    expect(r.issues[0].message).toContain('3')
  })

  it('explain :enum/no-match lists all allowed values', () => {
    const r = withS('(s/explain [:enum :red :green :blue] :purple)')
    expect(r.issues[0].message).toContain(':red')
    expect(r.issues[0].message).toContain(':green')
    expect(r.issues[0].message).toContain(':blue')
  })

  it('custom static string overrides a specific error code', () => {
    const r = withS(`
      (s/explain :string 42 {:messages {:string/wrong-type "not a string, pal!"}})
    `)
    expect(r.issues[0].message).toBe('not a string, pal!')
  })

  it('custom fn message receives the full issue map', () => {
    const r = withS(`
      (s/explain [:map [:name :string]] {}
        {:messages {:map/missing-key (fn [iss] (str "need field " (last (:path iss))))}})
    `)
    expect(r.issues[0].message).toContain(':name')
    expect(r.issues[0].message).toContain('need field')
  })

  it('custom messages are merged on top of defaults — other codes still work', () => {
    const r = withS(`
      (s/explain
        [:map [:name :string] [:age :int]]
        {:name 42}
        {:messages {:string/wrong-type "must be text"}})
    `)
    // :name has wrong type → custom message
    // :age is missing → default message
    const nameIss = r.issues.find((i: Record<string, string>) => i['error-code'] === 'string/wrong-type')
    const ageIss  = r.issues.find((i: Record<string, string>) => i['error-code'] === 'map/missing-key')
    expect(nameIss.message).toBe('must be text')
    expect(ageIss.message).toContain(':age')
  })

  it('default-messages is exported and is a map', () => {
    expect(withS('(map? s/default-messages)')).toBe(true)
  })

  it('default-options is exported and contains :messages', () => {
    expect(withS('(map? s/default-options)')).toBe(true)
    expect(withS('(map? (:messages s/default-options))')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 19. Namespace-qualified / multi-namespace keys
// ---------------------------------------------------------------------------

describe('cljam-schema — namespace-qualified keys', () => {
  it('validates a map with qualified keyword keys', () => {
    expect(
      withS(`
        (s/validate
          [:map [:user/name :string] [:user/age :int]]
          {:user/name "Alice" :user/age 30})
      `)
    ).toMatchObject({ ok: true })
  })

  it('reports missing qualified key with error-code :map/missing-key', () => {
    const r = withS(`
      (s/validate
        [:map [:db/id :uuid] [:user/name :string]]
        {:db/id "550e8400-e29b-41d4-a716-446655440000"})
    `)
    expect(r.ok).toBe(false)
    expect(r.issues[0]['error-code']).toBe('map/missing-key')
  })

  it('path for missing qualified key contains the qualified key string', () => {
    const r = withS('(s/validate [:map [:user/email :string]] {})')
    expect(r.issues[0].path).toHaveLength(1)
    expect(r.issues[0].path[0]).toBe('user/email')
  })

  it('validates a cross-namespace schema (db + user + billing keys)', () => {
    expect(
      withS(`
        (s/validate
          [:map
           [:db/id :uuid]
           [:user/name :string]
           [:billing/plan [:enum :free :pro :enterprise]]]
          {:db/id "550e8400-e29b-41d4-a716-446655440000"
           :user/name "Alice"
           :billing/plan :pro})
      `)
    ).toMatchObject({ ok: true })
  })

  it('json-schema uses qualified key name as property name', () => {
    const r = withS('(s/json-schema [:map [:user/name :string] [:db/id :uuid]])')
    expect(r.properties).toHaveProperty('user/name')
    expect(r.properties).toHaveProperty('db/id')
  })

  it('schemas with qualified keys are reusable vars', () => {
    expect(
      withS(`
        (def entity-schema [:map [:db/id :uuid] [:db/created :string]])
        (s/valid? entity-schema {:db/id "550e8400-e29b-41d4-a716-446655440000" :db/created "2024-01-01"})
      `)
    ).toBe(true)
  })

  it('explain formats missing qualified key message with key name', () => {
    const r = withS('(s/explain [:map [:acl/role :keyword]] {})')
    expect(r.issues[0].message).toContain(':acl/role')
  })
})

// ---------------------------------------------------------------------------
// 20. [:map-of key-schema value-schema] — homogeneous maps
// ---------------------------------------------------------------------------

describe('cljam-schema — [:map-of ...] schema', () => {
  it('validates a string→int map', () => {
    expect(withS('(s/validate [:map-of :string :int] {"a" 1 "b" 2})')).toMatchObject({ ok: true })
  })

  it('accepts an empty map', () => {
    expect(withS('(s/validate [:map-of :string :int] {})')).toMatchObject({ ok: true })
  })

  it('rejects a non-map value with error-code :map-of/wrong-type', () => {
    const r = withS('(s/validate [:map-of :string :int] "oops")')
    expect(r.ok).toBe(false)
    expect(r.issues[0]['error-code']).toBe('map-of/wrong-type')
  })

  it('rejects map with wrong value type — error is on the value', () => {
    const r = withS('(s/validate [:map-of :string :int] {"a" 1 "b" "not-int"})')
    expect(r.ok).toBe(false)
    expect(r.issues[0]['error-code']).toBe('int/wrong-type')
  })

  it('validates keyword→string map', () => {
    expect(
      withS('(s/validate [:map-of :keyword :string] {:a "hello" :b "world"})')
    ).toMatchObject({ ok: true })
  })

  it('validates map with compound value schema', () => {
    expect(
      withS(`
        (s/validate
          [:map-of :string [:map [:name :string]]]
          {"alice" {:name "Alice"} "bob" {:name "Bob"}})
      `)
    ).toMatchObject({ ok: true })
  })

  it('collects issues for all invalid entries', () => {
    const r = withS(`
      (s/validate [:map-of :string :int] {"a" "bad1" "b" "bad2"})
    `)
    expect(r.ok).toBe(false)
    expect(r.issues).toHaveLength(2)
  })

  it('value failure path includes the map key', () => {
    const r = withS('(s/validate [:map-of :string :int] {"x" "wrong"})')
    expect(r.ok).toBe(false)
    expect(r.issues[0].path[0]).toBe('x')
  })

  it('json-schema for [:map-of :string :int] uses additionalProperties', () => {
    const r = withS('(s/json-schema [:map-of :string :int])')
    expect(r).toMatchObject({
      type: 'object',
      additionalProperties: { type: 'integer' },
    })
  })

  it('json-schema for [:map-of :keyword [:map [:n :string]]] nests correctly', () => {
    const r = withS('(s/json-schema [:map-of :keyword [:map [:n :string]]])')
    expect(r.type).toBe('object')
    expect(r.additionalProperties).toMatchObject({ type: 'object' })
  })
})

// ---------------------------------------------------------------------------
// 21. Complex path tracking — vector indices, nested maps, qualified keys
// ---------------------------------------------------------------------------

describe('cljam-schema — complex path tracking', () => {
  it('vector element failure path is [numeric-index]', () => {
    const r = withS('(s/validate [:vector :int] [1 "oops" 3])')
    expect(r.ok).toBe(false)
    expect(r.issues[0].path).toEqual([1])
    expect(r.issues[0]['error-code']).toBe('int/wrong-type')
  })

  it('vector of maps: path is [index, field-key]', () => {
    const r = withS(`
      (s/validate
        [:vector [:map [:name :string] [:age :int]]]
        [{:name "Alice" :age 30} {:name "Bob" :age "oops"}])
    `)
    expect(r.ok).toBe(false)
    expect(r.issues[0].path).toEqual([1, 'age'])
    expect(r.issues[0]['error-code']).toBe('int/wrong-type')
  })

  it('deeply nested map path has one segment per nesting level', () => {
    const r = withS(`
      (s/validate
        [:map [:user [:map [:name :string]]]]
        {:user {:name 42}})
    `)
    expect(r.ok).toBe(false)
    expect(r.issues[0].path).toEqual(['user', 'name'])
    expect(r.issues[0]['error-code']).toBe('string/wrong-type')
  })

  it('tuple element failure path is [index]', () => {
    const r = withS(`
      (s/validate [:tuple :string :int :boolean] ["ok" "not-int" true])
    `)
    expect(r.ok).toBe(false)
    expect(r.issues[0].path).toEqual([1])
    expect(r.issues[0]['error-code']).toBe('int/wrong-type')
  })

  it('map-of value failure path is [key]', () => {
    const r = withS('(s/validate [:map-of :string :int] {"x" "wrong"})')
    expect(r.ok).toBe(false)
    expect(r.issues[0].path).toEqual(['x'])
  })

  it('qualified key in path is the full qualified name (without colon)', () => {
    const r = withS(`
      (s/validate
        [:map [:org/name :string] [:org/id :uuid]]
        {:org/name 42 :org/id "550e8400-e29b-41d4-a716-446655440000"})
    `)
    expect(r.ok).toBe(false)
    expect(r.issues[0].path[0]).toBe('org/name')
  })

  it('explain formats message correctly for nested vector-of-maps path', () => {
    const r = withS(`
      (s/explain
        [:vector [:map [:score :int]]]
        [{:score 100} {:score "oops"}])
    `)
    expect(r.ok).toBe(false)
    expect(r.issues[0].message).toBe('expected an integer')
    expect(r.issues[0].path).toEqual([1, 'score'])
  })

  it('collects multiple issues across vector elements with correct paths', () => {
    const r = withS(`
      (s/validate
        [:vector [:map [:id :int]]]
        [{:id "bad1"} {:id 2} {:id "bad3"}])
    `)
    expect(r.ok).toBe(false)
    expect(r.issues).toHaveLength(2)
    expect(r.issues[0].path[0]).toBe(0)
    expect(r.issues[1].path[0]).toBe(2)
  })
})
