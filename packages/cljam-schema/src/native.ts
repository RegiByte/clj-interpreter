// native.ts — cljam.schema.native RuntimeModule.
//
// Provides:
//   validate*    (schema value) → {:ok true/:false :value/:issues ...}
//   json-schema* (schema) → JSON Schema as CljMap
//
// Schema DSL (data-driven, malli-inspired):
//
//   Primitive keywords:
//     :string  :int  :number  :boolean  :keyword  :symbol  :nil  :any  :uuid
//
//   Compound vectors:
//     [:string  {:min N :max N :pattern "..."}]     — string with constraints
//     [:int     {:min N :max N}]                    — integer with constraints
//     [:number  {:min N :max N}]                    — number with constraints
//     [:map  ?{:closed true}  [key ?{:optional true} schema] ...]
//     [:map-of  key-schema  value-schema]           — homogeneous map
//     [:vector  ?{:min N :max N}  child-schema]
//     [:tuple   child1  child2  ...]                — fixed-length heterogeneous
//     [:maybe   child-schema]                       — nil | child-schema
//     [:or      s1  s2  ...]                        — union (first match wins)
//     [:and     s1  s2  ...]                        — intersection (all must pass)
//     [:enum    v1  v2  ...]                        — enumeration
//     [:fn      pred]                               — arbitrary predicate (escape hatch)
//
// Map entry format:  [key ?field-props schema]
//   - field-props are about PRESENCE  (optional, default)
//   - schema-props are about VALIDITY (min, max, pattern, closed)
//
// Issues contain :error-code (a keyword), :path, and :schema — no message strings.
// Message formatting is handled in Clojure by s/explain using the messages map.

import { v, EvaluationError, printString, is } from '@regibyte/cljam'
import type {
  CljValue,
  CljMap,
  RuntimeModule,
  VarMap,
  EvaluationContext,
  Env,
} from '@regibyte/cljam'

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type Issue = {
  errorCode: CljValue
  path: CljValue[]
  schema: CljValue
}

type ValidationResult = {
  ok: boolean
  value?: CljValue
  issues?: Issue[]
}

// ---------------------------------------------------------------------------
// Lightweight CljValue constructors
// ---------------------------------------------------------------------------
function kw(name: string): CljValue {
  return v.keyword(`:${name}`)
}

// ---------------------------------------------------------------------------
// Error code constants
// All issues carry one of these as :error-code — enables typed dispatch in
// Clojure's default-messages map and in user-supplied override maps.
// ---------------------------------------------------------------------------

const EC = {
  // String primitives
  STRING_TYPE:    kw('string/wrong-type'),
  STRING_SHORT:   kw('string/too-short'),
  STRING_LONG:    kw('string/too-long'),
  STRING_PATTERN: kw('string/pattern-mismatch'),
  // Integer
  INT_TYPE:       kw('int/wrong-type'),
  INT_SMALL:      kw('int/too-small'),
  INT_LARGE:      kw('int/too-large'),
  // Number (float-inclusive)
  NUM_TYPE:       kw('number/wrong-type'),
  NUM_SMALL:      kw('number/too-small'),
  NUM_LARGE:      kw('number/too-large'),
  // Remaining primitives
  BOOL_TYPE:      kw('boolean/wrong-type'),
  KW_TYPE:        kw('keyword/wrong-type'),
  SYM_TYPE:       kw('symbol/wrong-type'),
  NIL_TYPE:       kw('nil/wrong-type'),
  UUID_TYPE:      kw('uuid/wrong-type'),
  UUID_FMT:       kw('uuid/invalid-format'),
  // Map
  MAP_TYPE:       kw('map/wrong-type'),
  MAP_MISSING:    kw('map/missing-key'),
  MAP_EXTRA:      kw('map/extra-key'),
  // Map-of (homogeneous)
  MAP_OF_TYPE:    kw('map-of/wrong-type'),
  // Vector
  VEC_TYPE:       kw('vector/wrong-type'),
  VEC_SHORT:      kw('vector/too-short'),
  VEC_LONG:       kw('vector/too-long'),
  // Tuple
  TUPLE_TYPE:     kw('tuple/wrong-type'),
  TUPLE_LEN:      kw('tuple/wrong-length'),
  // Or / Enum / Fn
  OR_NO_MATCH:    kw('or/no-match'),
  ENUM_NO_MATCH:  kw('enum/no-match'),
  FN_FAILED:      kw('fn/predicate-failed'),
  FN_THREW:       kw('fn/predicate-threw'),
}

// ---------------------------------------------------------------------------
// Map property helpers
// ---------------------------------------------------------------------------

function mapGet(map: CljMap, key: CljValue): CljValue | null {
  const ks = printString(key)
  for (const [k, val] of map.entries) {
    if (printString(k) === ks) return val
  }
  return null
}

function propNum(map: CljMap, name: string): number | null {
  const val = mapGet(map, kw(name))
  if (val === null || !is.number(val)) return null
  return val.value
}

function propStr(map: CljMap, name: string): string | null {
  const val = mapGet(map, kw(name))
  if (val === null || !is.string(val)) return null
  return val.value
}

function propBool(map: CljMap, name: string): boolean {
  const val = mapGet(map, kw(name))
  if (val === null) return false
  if (is.boolean(val)) return val.value
  return !is.nil(val)
}

// ---------------------------------------------------------------------------
// Schema parsing helpers
// ---------------------------------------------------------------------------

/**
 * In a vector schema [type ?props ...children], the optional props map
 * always appears immediately after the type keyword. This helper splits them.
 *
 * [:vector :string]           → { props: null, children: [:string] }
 * [:vector {:min 1} :string]  → { props: {min:1}, children: [:string] }
 */
function extractPropsAndChildren(rest: CljValue[]): {
  props: CljMap | null
  children: CljValue[]
} {
  if (rest.length > 0 && is.map(rest[0])) {
    return { props: rest[0] as CljMap, children: rest.slice(1) }
  }
  return { props: null, children: rest }
}

/**
 * A map entry is [key ?field-props schema].
 *
 * 2-element form: [key schema]              — required, no field metadata
 * 3-element form: [key {field-props} schema] — field has presence metadata
 *
 * The two props maps serve completely different purposes:
 *   field-props → PRESENCE  (is the key required? does it have a default?)
 *   schema-props → VALIDITY (if present, what shape must it have?)
 */
type ParsedMapEntry = {
  key: CljValue
  fieldProps: CljMap | null
  schema: CljValue
}

function parseMapEntry(entry: CljValue, index: number): ParsedMapEntry {
  if (!is.vector(entry)) {
    throw new EvaluationError(
      `schema/validate*: map entry at index ${index} must be a vector, got ${entry.kind}`,
      { entry }
    )
  }
  const items = entry.value
  if (items.length < 2) {
    throw new EvaluationError(
      `schema/validate*: map entry must be [key schema] or [key {props} schema], got ${items.length} element(s)`,
      { entry }
    )
  }
  if (items.length === 2) {
    return { key: items[0], fieldProps: null, schema: items[1] }
  }
  // 3+ elements: if the second is a map → field props
  if (is.map(items[1])) {
    return { key: items[0], fieldProps: items[1] as CljMap, schema: items[2] }
  }
  return { key: items[0], fieldProps: null, schema: items[1] }
}

// ---------------------------------------------------------------------------
// Result helpers
// ---------------------------------------------------------------------------

function ok(value: CljValue): ValidationResult {
  return { ok: true, value }
}

function fail(issues: Issue[]): ValidationResult {
  return { ok: false, issues }
}

function issue(errorCode: CljValue, path: CljValue[], schema: CljValue): Issue {
  return { errorCode, path, schema }
}

// ---------------------------------------------------------------------------
// Core dispatcher
// ---------------------------------------------------------------------------

function validateSchema(
  schema: CljValue,
  value: CljValue,
  path: CljValue[],
  ctx: EvaluationContext,
  callEnv: Env
): ValidationResult {
  // Bare keyword → primitive type
  if (is.keyword(schema)) {
    return validatePrimitive(schema.name, schema, value, path, null)
  }

  // Vector → compound schema
  if (is.vector(schema)) {
    const items = schema.value
    if (items.length === 0) {
      throw new EvaluationError(
        'schema/validate*: empty vector is not a valid schema',
        { schema }
      )
    }
    const typeKw = items[0]
    if (!is.keyword(typeKw)) {
      throw new EvaluationError(
        `schema/validate*: first element of compound schema must be a keyword, got ${typeKw.kind}`,
        { schema }
      )
    }

    const { props, children } = extractPropsAndChildren(items.slice(1))
    const typeName = typeKw.name

    // Primitive types can also appear in compound form with props: [:string {:min 3}]
    if (isPrimitiveType(typeName)) {
      return validatePrimitive(typeName, schema, value, path, props)
    }

    switch (typeName) {
      case ':map':
        return validateMap(children, props, schema, value, path, ctx, callEnv)
      case ':map-of': {
        if (children.length < 2) {
          throw new EvaluationError(
            'schema/validate*: [:map-of] requires key and value schemas, e.g. [:map-of :string :int]',
            { schema }
          )
        }
        return validateMapOf(children[0], children[1], schema, value, path, ctx, callEnv)
      }
      case ':vector': {
        if (children.length === 0) {
          throw new EvaluationError(
            'schema/validate*: [:vector] requires a child schema',
            { schema }
          )
        }
        return validateVector(
          children[0],
          props,
          schema,
          value,
          path,
          ctx,
          callEnv
        )
      }
      case ':tuple':
        return validateTuple(children, schema, value, path, ctx, callEnv)
      case ':maybe': {
        if (children.length === 0) {
          throw new EvaluationError(
            'schema/validate*: [:maybe] requires a child schema',
            { schema }
          )
        }
        return validateMaybe(children[0], schema, value, path, ctx, callEnv)
      }
      case ':or':
        return validateOr(children, schema, value, path, ctx, callEnv)
      case ':and':
        return validateAnd(children, schema, value, path, ctx, callEnv)
      case ':enum':
        return validateEnum(children, schema, value, path)
      case ':fn': {
        if (children.length === 0) {
          throw new EvaluationError(
            'schema/validate*: [:fn] requires a predicate',
            { schema }
          )
        }
        return validateFn(children[0], schema, value, path, ctx, callEnv)
      }
      default:
        throw new EvaluationError(
          `schema/validate*: unknown schema type ${typeName}`,
          { schema }
        )
    }
  }

  throw new EvaluationError(
    `schema/validate*: invalid schema — expected keyword or vector, got ${schema.kind}`,
    { schema }
  )
}

function isPrimitiveType(name: string): boolean {
  return [
    ':string',
    ':int',
    ':number',
    ':boolean',
    ':keyword',
    ':symbol',
    ':nil',
    ':any',
    ':uuid',
  ].includes(name)
}

// ---------------------------------------------------------------------------
// Primitive validator
// ---------------------------------------------------------------------------

function validatePrimitive(
  type: string,
  schema: CljValue,
  value: CljValue,
  path: CljValue[],
  props: CljMap | null
): ValidationResult {
  switch (type) {
    case ':string': {
      if (!is.string(value)) {
        return fail([issue(EC.STRING_TYPE, path, schema)])
      }
      if (props) {
        const issues: Issue[] = []
        const min = propNum(props, 'min') ?? propNum(props, 'min-length')
        const max = propNum(props, 'max') ?? propNum(props, 'max-length')
        const pattern = propStr(props, 'pattern')
        if (min !== null && value.value.length < min) {
          issues.push(issue(EC.STRING_SHORT, path, schema))
        }
        if (max !== null && value.value.length > max) {
          issues.push(issue(EC.STRING_LONG, path, schema))
        }
        if (pattern !== null && !new RegExp(pattern).test(value.value)) {
          issues.push(issue(EC.STRING_PATTERN, path, schema))
        }
        if (issues.length > 0) return fail(issues)
      }
      return ok(value)
    }

    case ':int': {
      if (!is.number(value) || !Number.isInteger(value.value)) {
        return fail([issue(EC.INT_TYPE, path, schema)])
      }
      if (props) {
        const issues: Issue[] = []
        const min = propNum(props, 'min')
        const max = propNum(props, 'max')
        if (min !== null && value.value < min) {
          issues.push(issue(EC.INT_SMALL, path, schema))
        }
        if (max !== null && value.value > max) {
          issues.push(issue(EC.INT_LARGE, path, schema))
        }
        if (issues.length > 0) return fail(issues)
      }
      return ok(value)
    }

    case ':number': {
      if (!is.number(value)) {
        return fail([issue(EC.NUM_TYPE, path, schema)])
      }
      if (props) {
        const issues: Issue[] = []
        const min = propNum(props, 'min')
        const max = propNum(props, 'max')
        if (min !== null && value.value < min) {
          issues.push(issue(EC.NUM_SMALL, path, schema))
        }
        if (max !== null && value.value > max) {
          issues.push(issue(EC.NUM_LARGE, path, schema))
        }
        if (issues.length > 0) return fail(issues)
      }
      return ok(value)
    }

    case ':boolean':
      if (!is.boolean(value)) {
        return fail([issue(EC.BOOL_TYPE, path, schema)])
      }
      return ok(value)

    case ':keyword':
      if (!is.keyword(value)) {
        return fail([issue(EC.KW_TYPE, path, schema)])
      }
      return ok(value)

    case ':symbol':
      if (!is.symbol(value)) {
        return fail([issue(EC.SYM_TYPE, path, schema)])
      }
      return ok(value)

    case ':nil':
      if (!is.nil(value)) {
        return fail([issue(EC.NIL_TYPE, path, schema)])
      }
      return ok(value)

    case ':any':
      return ok(value)

    case ':uuid': {
      if (!is.string(value)) {
        return fail([issue(EC.UUID_TYPE, path, schema)])
      }
      const UUID_RE =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!UUID_RE.test(value.value)) {
        return fail([issue(EC.UUID_FMT, path, schema)])
      }
      return ok(value)
    }

    default:
      throw new EvaluationError(
        `schema/validate*: unknown primitive type ${type}`,
        { schema }
      )
  }
}

// ---------------------------------------------------------------------------
// Compound validators
// ---------------------------------------------------------------------------

function validateMap(
  entries: CljValue[],
  schemaProps: CljMap | null,
  schema: CljValue,
  value: CljValue,
  path: CljValue[],
  ctx: EvaluationContext,
  callEnv: Env
): ValidationResult {
  if (!is.map(value)) {
    return fail([issue(EC.MAP_TYPE, path, schema)])
  }

  const closed = schemaProps ? propBool(schemaProps, 'closed') : false
  const issues: Issue[] = []
  const declaredKeyStrs = new Set<string>()

  for (let i = 0; i < entries.length; i++) {
    const {
      key,
      fieldProps,
      schema: fieldSchema,
    } = parseMapEntry(entries[i], i)
    const keyStr = printString(key)
    declaredKeyStrs.add(keyStr)

    const optional = fieldProps ? propBool(fieldProps, 'optional') : false
    const fieldValue = mapGet(value, key)

    if (fieldValue === null) {
      if (!optional) {
        issues.push(issue(EC.MAP_MISSING, [...path, key], fieldSchema))
      }
    } else {
      const result = validateSchema(
        fieldSchema,
        fieldValue,
        [...path, key],
        ctx,
        callEnv
      )
      if (!result.ok && result.issues) {
        issues.push(...result.issues)
      }
    }
  }

  // Closed maps reject extra keys
  if (closed) {
    for (const [k] of value.entries) {
      if (!declaredKeyStrs.has(printString(k))) {
        issues.push(issue(EC.MAP_EXTRA, [...path, k], schema))
      }
    }
  }

  return issues.length > 0 ? fail(issues) : ok(value)
}

/**
 * Homogeneous map: every key matches keySchema, every value matches valueSchema.
 * [:map-of :keyword :string]  →  validates {:a "hello" :b "world"}
 * [:map-of :string [:map [:name :string]]]  →  string-keyed nested maps
 *
 * Key validation issues sit at the parent path (the key that's wrong).
 * Value validation issues sit at [...path, key] (i.e. inside the entry).
 */
function validateMapOf(
  keySchema: CljValue,
  valueSchema: CljValue,
  schema: CljValue,
  value: CljValue,
  path: CljValue[],
  ctx: EvaluationContext,
  callEnv: Env
): ValidationResult {
  if (!is.map(value)) {
    return fail([issue(EC.MAP_OF_TYPE, path, schema)])
  }

  const issues: Issue[] = []
  for (const [k, val] of value.entries) {
    // Validate key — key errors sit at the parent path (the key itself is the subject)
    const keyResult = validateSchema(keySchema, k, path, ctx, callEnv)
    if (!keyResult.ok && keyResult.issues) issues.push(...keyResult.issues)

    // Validate value — path descends into the entry via the key
    const valResult = validateSchema(valueSchema, val, [...path, k], ctx, callEnv)
    if (!valResult.ok && valResult.issues) issues.push(...valResult.issues)
  }

  return issues.length > 0 ? fail(issues) : ok(value)
}

function validateVector(
  childSchema: CljValue,
  schemaProps: CljMap | null,
  schema: CljValue,
  value: CljValue,
  path: CljValue[],
  ctx: EvaluationContext,
  callEnv: Env
): ValidationResult {
  if (!is.vector(value)) {
    return fail([issue(EC.VEC_TYPE, path, schema)])
  }

  if (schemaProps) {
    const min = propNum(schemaProps, 'min')
    const max = propNum(schemaProps, 'max')
    if (min !== null && value.value.length < min) {
      return fail([issue(EC.VEC_SHORT, path, schema)])
    }
    if (max !== null && value.value.length > max) {
      return fail([issue(EC.VEC_LONG, path, schema)])
    }
  }

  const issues: Issue[] = []
  for (let i = 0; i < value.value.length; i++) {
    const result = validateSchema(
      childSchema,
      value.value[i],
      [...path, v.number(i)],
      ctx,
      callEnv
    )
    if (!result.ok && result.issues) issues.push(...result.issues)
  }
  return issues.length > 0 ? fail(issues) : ok(value)
}

function validateTuple(
  children: CljValue[],
  schema: CljValue,
  value: CljValue,
  path: CljValue[],
  ctx: EvaluationContext,
  callEnv: Env
): ValidationResult {
  if (!is.vector(value)) {
    return fail([issue(EC.TUPLE_TYPE, path, schema)])
  }
  if (value.value.length !== children.length) {
    return fail([issue(EC.TUPLE_LEN, path, schema)])
  }
  const issues: Issue[] = []
  for (let i = 0; i < children.length; i++) {
    const result = validateSchema(
      children[i],
      value.value[i],
      [...path, v.number(i)],
      ctx,
      callEnv
    )
    if (!result.ok && result.issues) issues.push(...result.issues)
  }
  return issues.length > 0 ? fail(issues) : ok(value)
}

function validateMaybe(
  childSchema: CljValue,
  _schema: CljValue,
  value: CljValue,
  path: CljValue[],
  ctx: EvaluationContext,
  callEnv: Env
): ValidationResult {
  if (is.nil(value)) return ok(value)
  return validateSchema(childSchema, value, path, ctx, callEnv)
}

function validateOr(
  children: CljValue[],
  schema: CljValue,
  value: CljValue,
  path: CljValue[],
  ctx: EvaluationContext,
  callEnv: Env
): ValidationResult {
  if (children.length === 0) {
    throw new EvaluationError(
      'schema/validate*: [:or] requires at least one schema',
      { schema }
    )
  }
  for (const child of children) {
    const result = validateSchema(child, value, path, ctx, callEnv)
    if (result.ok) return result
  }
  return fail([issue(EC.OR_NO_MATCH, path, schema)])
}

function validateAnd(
  children: CljValue[],
  schema: CljValue,
  value: CljValue,
  path: CljValue[],
  ctx: EvaluationContext,
  callEnv: Env
): ValidationResult {
  if (children.length === 0) {
    throw new EvaluationError(
      'schema/validate*: [:and] requires at least one schema',
      { schema }
    )
  }
  const issues: Issue[] = []
  for (const child of children) {
    const result = validateSchema(child, value, path, ctx, callEnv)
    if (!result.ok && result.issues) issues.push(...result.issues)
  }
  return issues.length > 0 ? fail(issues) : ok(value)
}

function validateEnum(
  values: CljValue[],
  schema: CljValue,
  value: CljValue,
  path: CljValue[]
): ValidationResult {
  for (const enumVal of values) {
    if (is.equal(enumVal, value)) return ok(value)
  }
  return fail([issue(EC.ENUM_NO_MATCH, path, schema)])
}

function validateFn(
  predicate: CljValue,
  schema: CljValue,
  value: CljValue,
  path: CljValue[],
  ctx: EvaluationContext,
  callEnv: Env
): ValidationResult {
  let result: CljValue
  try {
    result = ctx.applyCallable(predicate, [value], callEnv)
  } catch (_e) {
    return fail([issue(EC.FN_THREW, path, schema)])
  }
  const isFalsy = is.nil(result) || (is.boolean(result) && !result.value)
  if (isFalsy) {
    return fail([issue(EC.FN_FAILED, path, schema)])
  }
  return ok(value)
}

// ---------------------------------------------------------------------------
// ValidationResult → CljValue
// Issues carry :error-code, :path, :schema — no :message.
// Message formatting is the responsibility of s/explain in Clojure.
// ---------------------------------------------------------------------------

function issueToCljValue(iss: Issue): CljValue {
  return v.map([
    [kw('error-code'), iss.errorCode],
    [kw('path'), v.vector(iss.path)],
    [kw('schema'), iss.schema],
  ])
}

function resultToCljValue(result: ValidationResult): CljValue {
  if (result.ok) {
    return v.map([
      [kw('ok'), v.boolean(true)],
      [kw('value'), result.value!],
    ])
  }
  return v.map([
    [kw('ok'), v.boolean(false)],
    [kw('issues'), v.vector((result.issues ?? []).map(issueToCljValue))],
  ])
}

// ---------------------------------------------------------------------------
// JSON Schema converter
// ---------------------------------------------------------------------------

function toJsonSchema(schema: CljValue): CljValue {
  if (is.keyword(schema)) {
    return primitiveToJsonSchema(schema.name, null)
  }
  if (is.vector(schema)) {
    const items = schema.value
    if (items.length === 0) {
      throw new EvaluationError(
        'schema/json-schema*: empty vector is not a valid schema',
        { schema }
      )
    }
    const typeKw = items[0]
    if (!is.keyword(typeKw)) {
      throw new EvaluationError(
        `schema/json-schema*: schema type must be a keyword, got ${typeKw.kind}`,
        { schema }
      )
    }
    const { props, children } = extractPropsAndChildren(items.slice(1))
    const typeName = typeKw.name

    if (isPrimitiveType(typeName)) {
      return primitiveToJsonSchema(typeName, props)
    }
    return compoundToJsonSchema(typeName, props, children)
  }
  throw new EvaluationError(
    `schema/json-schema*: invalid schema — expected keyword or vector, got ${schema.kind}`,
    { schema }
  )
}

function primitiveToJsonSchema(type: string, props: CljMap | null): CljValue {
  const entries: Array<[CljValue, CljValue]> = []

  switch (type) {
    case ':string': {
      entries.push([kw('type'), v.string('string')])
      if (props) {
        const min = propNum(props, 'min') ?? propNum(props, 'min-length')
        const max = propNum(props, 'max') ?? propNum(props, 'max-length')
        const pattern = propStr(props, 'pattern')
        if (min !== null) entries.push([kw('minLength'), v.number(min)])
        if (max !== null) entries.push([kw('maxLength'), v.number(max)])
        if (pattern !== null) entries.push([kw('pattern'), v.string(pattern)])
      }
      break
    }
    case ':int': {
      entries.push([kw('type'), v.string('integer')])
      if (props) {
        const min = propNum(props, 'min')
        const max = propNum(props, 'max')
        if (min !== null) entries.push([kw('minimum'), v.number(min)])
        if (max !== null) entries.push([kw('maximum'), v.number(max)])
      }
      break
    }
    case ':number': {
      entries.push([kw('type'), v.string('number')])
      if (props) {
        const min = propNum(props, 'min')
        const max = propNum(props, 'max')
        if (min !== null) entries.push([kw('minimum'), v.number(min)])
        if (max !== null) entries.push([kw('maximum'), v.number(max)])
      }
      break
    }
    case ':boolean':
      entries.push([kw('type'), v.string('boolean')])
      break
    case ':nil':
      entries.push([kw('type'), v.string('null')])
      break
    case ':any':
      // Empty schema = accepts anything in JSON Schema
      break
    case ':keyword':
    case ':symbol':
      // Keywords/symbols serialise to strings in JSON
      entries.push([kw('type'), v.string('string')])
      break
    case ':uuid':
      entries.push([kw('type'), v.string('string')])
      entries.push([kw('format'), v.string('uuid')])
      break
    default:
      throw new EvaluationError(
        `schema/json-schema*: unknown primitive type: ${type}`,
        { type }
      )
  }

  return v.map(entries)
}

function compoundToJsonSchema(
  type: string,
  props: CljMap | null,
  children: CljValue[]
): CljValue {
  switch (type) {
    case ':map': {
      const entries: Array<[CljValue, CljValue]> = [[kw('type'), v.string('object')]]
      if (children.length > 0) {
        const propertyEntries: Array<[CljValue, CljValue]> = []
        const requiredKeys: CljValue[] = []

        for (let i = 0; i < children.length; i++) {
          const {
            key,
            fieldProps,
            schema: fieldSchema,
          } = parseMapEntry(children[i], i)
          const optional = fieldProps ? propBool(fieldProps, 'optional') : false
          const keyStr = keyToJsonStr(key)
          propertyEntries.push([v.string(keyStr), toJsonSchema(fieldSchema)])
          if (!optional) requiredKeys.push(v.string(keyStr))
        }

        entries.push([kw('properties'), v.map(propertyEntries)])
        if (requiredKeys.length > 0) {
          entries.push([kw('required'), v.vector(requiredKeys)])
        }
        // Closed maps → additionalProperties: false
        if (props && propBool(props, 'closed')) {
          entries.push([kw('additionalProperties'), v.boolean(false)])
        }
      }
      return v.map(entries)
    }

    case ':map-of': {
      if (children.length < 2) {
        throw new EvaluationError(
          'schema/json-schema*: [:map-of] requires key and value schemas',
          { type }
        )
      }
      // JSON Schema expresses homogeneous maps via additionalProperties (value schema).
      // Key schema is not representable directly — JSON object keys are always strings.
      return v.map([
        [kw('type'), v.string('object')],
        [kw('additionalProperties'), toJsonSchema(children[1])],
      ])
    }

    case ':vector': {
      const entries: Array<[CljValue, CljValue]> = [[kw('type'), v.string('array')]]
      if (children.length > 0)
        entries.push([kw('items'), toJsonSchema(children[0])])
      if (props) {
        const min = propNum(props, 'min')
        const max = propNum(props, 'max')
        if (min !== null) entries.push([kw('minItems'), v.number(min)])
        if (max !== null) entries.push([kw('maxItems'), v.number(max)])
      }
      return v.map(entries)
    }

    case ':tuple': {
      return v.map([
        [kw('type'), v.string('array')],
        [kw('prefixItems'), v.vector(children.map(toJsonSchema))],
        [kw('minItems'), v.number(children.length)],
        [kw('maxItems'), v.number(children.length)],
      ])
    }

    case ':maybe': {
      if (children.length === 0) {
        throw new EvaluationError(
          'schema/json-schema*: [:maybe] requires a child schema',
          {}
        )
      }
      return v.map([
        [
          kw('oneOf'),
          v.vector([
            toJsonSchema(children[0]),
            v.map([[kw('type'), v.string('null')]]),
          ]),
        ],
      ])
    }

    case ':or': {
      return v.map([[kw('oneOf'), v.vector(children.map(toJsonSchema))]])
    }

    case ':and': {
      return v.map([[kw('allOf'), v.vector(children.map(toJsonSchema))]])
    }

    case ':enum': {
      return v.map([[kw('enum'), v.vector(children)]])
    }

    case ':fn': {
      // Predicates have no JSON Schema representation — emit empty (any)
      return v.map([])
    }

    default:
      throw new EvaluationError(
        `schema/json-schema*: unknown compound schema type: ${type}`,
        { type }
      )
  }
}

/** Convert a CljValue key to a JSON Schema property name string. */
function keyToJsonStr(key: CljValue): string {
  if (is.keyword(key)) return key.name.slice(1) // strip leading ':'
  if (is.string(key)) return key.value
  return printString(key)
}

// ---------------------------------------------------------------------------
// Native function registry
// ---------------------------------------------------------------------------

const nativeFns: Record<string, CljValue> = {
  // (validate* schema value) → {:ok true/:false :value/:issues ...}
  'validate*': v.nativeFnCtx(
    'cljam.schema.native/validate*',
    (
      ctx: EvaluationContext,
      callEnv: Env,
      schema: CljValue,
      value: CljValue
    ) => {
      const result = validateSchema(schema, value, [], ctx, callEnv)
      return resultToCljValue(result)
    }
  ),

  // (json-schema* schema) → JSON Schema as CljMap
  'json-schema*': v.nativeFn(
    'cljam.schema.native/json-schema*',
    (schema: CljValue) => {
      return toJsonSchema(schema)
    }
  ),
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

export function makeSchemaModule(): RuntimeModule {
  return {
    id: 'cljam-schema/native',
    declareNs: [
      {
        name: 'cljam.schema.native',
        vars(_ctx): VarMap {
          const map = new Map()
          for (const [name, fn] of Object.entries(nativeFns)) {
            map.set(name, { value: fn })
          }
          return map
        },
      },
    ],
  }
}
