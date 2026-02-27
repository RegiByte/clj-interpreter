import { EvaluationError } from './evaluator'
import { valueKeywords, type CljValue } from './types'

export function printString(value: CljValue): string {
  switch (value.kind) {
    case valueKeywords.number:
      return value.value.toString()
    case valueKeywords.string:
      let escapedBuffer = ''
      for (const char of value.value) {
        switch (char) {
          case '"':
            escapedBuffer += '\\"'
            break
          case '\\':
            escapedBuffer += '\\\\'
            break
          case '\n':
            escapedBuffer += '\\n'
            break
          case '\r':
            escapedBuffer += '\\r'
            break
          case '\t':
            escapedBuffer += '\\t'
            break
          default:
            escapedBuffer += char
        }
      }
      return `"${escapedBuffer}"`
    case valueKeywords.boolean:
      return value.value ? 'true' : 'false'
    case valueKeywords.nil:
      return 'nil'
    case valueKeywords.keyword:
      return `${value.name}`
    case valueKeywords.symbol:
      return `${value.name}`
    case valueKeywords.list:
      return `(${value.value.map(printString).join(' ')})`
    case valueKeywords.vector:
      return `[${value.value.map(printString).join(' ')}]`
    case valueKeywords.map:
      return `{${value.entries.map(([key, value]) => `${printString(key)} ${printString(value)}`).join(' ')}}`
    case valueKeywords.function: {
      if (value.arities.length === 1) {
        const a = value.arities[0]
        const params = a.restParam
          ? [...a.params, { kind: 'symbol' as const, name: '&' }, a.restParam]
          : a.params
        return `(fn [${params.map(printString).join(' ')}] ${a.body.map(printString).join(' ')})`
      }
      const clauses = value.arities.map((a) => {
        const params = a.restParam
          ? [...a.params, { kind: 'symbol' as const, name: '&' }, a.restParam]
          : a.params
        return `([${params.map(printString).join(' ')}] ${a.body.map(printString).join(' ')})`
      })
      return `(fn ${clauses.join(' ')})`
    }
    case valueKeywords.nativeFunction:
      return `(native-fn ${value.name})`
    default:
      throw new EvaluationError(`unhandled value type: ${value.kind}`, {
        value,
      })
  }
}
