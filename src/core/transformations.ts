import { EvaluationError } from './evaluator'
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
    case valueKeywords.function:
      return `(fn [${value.params.map(valueToString).join(' ')}] ${value.body.map(valueToString).join(' ')})`
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
