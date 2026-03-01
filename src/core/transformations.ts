import { isList, isMap, isVector } from './assertions'
import { EvaluationError } from './errors'
import { cljVector } from './factories'
import { printString } from './printer'
import { type CljValue, valueKeywords } from './types'

export function valueToString(value: CljValue): string {
  switch (value.kind) {
    case valueKeywords.string:
      return value.value
    case valueKeywords.number:
      return value.value.toString()
    case valueKeywords.boolean:
      return value.value ? 'true' : 'false'
    case valueKeywords.keyword:
      return value.name
    case valueKeywords.symbol:
      return value.name
    case valueKeywords.list:
      return `(${value.value.map(valueToString).join(' ')})`
    case valueKeywords.vector:
      return `[${value.value.map(valueToString).join(' ')}]`
    case valueKeywords.map:
      return `{${value.entries.map(([key, value]) => `${valueToString(key)} ${valueToString(value)}`).join(' ')}}`
    case valueKeywords.function: {
      if (value.arities.length === 1) {
        const a = value.arities[0]
        const params = a.restParam
          ? [...a.params, { kind: 'symbol' as const, name: '&' }, a.restParam]
          : a.params
        return `(fn [${params.map(valueToString).join(' ')}] ${a.body.map(valueToString).join(' ')})`
      }
      const clauses = value.arities.map((a) => {
        const params = a.restParam
          ? [...a.params, { kind: 'symbol' as const, name: '&' }, a.restParam]
          : a.params
        return `([${params.map(valueToString).join(' ')}] ${a.body.map(valueToString).join(' ')})`
      })
      return `(fn ${clauses.join(' ')})`
    }
    case valueKeywords.nativeFunction:
      return `(native-fn ${value.name})`
    case valueKeywords.nil:
      return 'nil'
    default:
      throw new EvaluationError(`unhandled value type: ${value.kind}`, {
        value,
      })
  }
}

export const toSeq = (collection: CljValue): CljValue[] => {
  if (isList(collection)) {
    return collection.value
  }
  if (isVector(collection)) {
    return collection.value
  }
  if (isMap(collection)) {
    return collection.entries.map(([k, v]) => cljVector([k, v]))
  }
  throw new EvaluationError(
    `toSeq expects a collection, got ${printString(collection)}`,
    { collection }
  )
}
