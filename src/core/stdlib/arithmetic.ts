import { EvaluationError } from '../errors'
import { cljBoolean, cljNativeFunction, cljNumber } from '../factories'
import { isEqual } from '../assertions'
import { printString } from '../printer'
import type { CljNumber, CljValue } from '../types'

export const arithmeticFunctions: Record<string, CljValue> = {
  '+': cljNativeFunction('+', (...args: CljValue[]) => {
    if (args.length === 0) {
      return cljNumber(0)
    }
    if (args.some((arg) => arg.kind !== 'number')) {
      throw new EvaluationError('+ expects all arguments to be numbers', {
        args,
      })
    }
    return args.reduce((acc, arg) => {
      return cljNumber((acc as CljNumber).value + (arg as CljNumber).value)
    }, cljNumber(0))
  }),

  '-': cljNativeFunction('-', (...args: CljValue[]) => {
    if (args.length === 0) {
      throw new EvaluationError('- expects at least one argument', { args })
    }
    if (args.some((arg) => arg.kind !== 'number')) {
      throw new EvaluationError('- expects all arguments to be numbers', {
        args,
      })
    }
    return args.slice(1).reduce((acc, arg) => {
      return cljNumber((acc as CljNumber).value - (arg as CljNumber).value)
    }, args[0] as CljNumber)
  }),

  '*': cljNativeFunction('*', (...args: CljValue[]) => {
    if (args.length === 0) {
      return cljNumber(1)
    }
    if (args.some((arg) => arg.kind !== 'number')) {
      throw new EvaluationError('* expects all arguments to be numbers', {
        args,
      })
    }
    return args.slice(1).reduce((acc, arg) => {
      return cljNumber((acc as CljNumber).value * (arg as CljNumber).value)
    }, args[0] as CljNumber)
  }),

  '/': cljNativeFunction('/', (...args: CljValue[]) => {
    if (args.length === 0) {
      throw new EvaluationError('/ expects at least one argument', { args })
    }
    if (args.some((arg) => arg.kind !== 'number')) {
      throw new EvaluationError('/ expects all arguments to be numbers', {
        args,
      })
    }
    return args.slice(1).reduce((acc, arg) => {
      if ((arg as CljNumber).value === 0) {
        throw new EvaluationError('division by zero', { args })
      }
      return cljNumber((acc as CljNumber).value / (arg as CljNumber).value)
    }, args[0] as CljNumber)
  }),

  '>': cljNativeFunction('>', (...args: CljValue[]) => {
    if (args.length < 2) {
      throw new EvaluationError('> expects at least two arguments', { args })
    }
    if (args.some((arg) => arg.kind !== 'number')) {
      throw new EvaluationError('> expects all arguments to be numbers', {
        args,
      })
    }
    for (let i = 1; i < args.length; i++) {
      if ((args[i] as CljNumber).value >= (args[i - 1] as CljNumber).value) {
        return cljBoolean(false)
      }
    }
    return cljBoolean(true)
  }),

  '<': cljNativeFunction('<', (...args: CljValue[]) => {
    if (args.length < 2) {
      throw new EvaluationError('< expects at least two arguments', { args })
    }
    if (args.some((arg) => arg.kind !== 'number')) {
      throw new EvaluationError('< expects all arguments to be numbers', {
        args,
      })
    }
    for (let i = 1; i < args.length; i++) {
      if ((args[i] as CljNumber).value <= (args[i - 1] as CljNumber).value) {
        return cljBoolean(false)
      }
    }
    return cljBoolean(true)
  }),

  '>=': cljNativeFunction('>=', (...args: CljValue[]) => {
    if (args.length < 2) {
      throw new EvaluationError('>= expects at least two arguments', { args })
    }
    if (args.some((arg) => arg.kind !== 'number')) {
      throw new EvaluationError('>= expects all arguments to be numbers', {
        args,
      })
    }
    for (let i = 1; i < args.length; i++) {
      if ((args[i] as CljNumber).value > (args[i - 1] as CljNumber).value) {
        return cljBoolean(false)
      }
    }
    return cljBoolean(true)
  }),

  '<=': cljNativeFunction('<=', (...args: CljValue[]) => {
    if (args.length < 2) {
      throw new EvaluationError('<= expects at least two arguments', { args })
    }
    if (args.some((arg) => arg.kind !== 'number')) {
      throw new EvaluationError('<= expects all arguments to be numbers', {
        args,
      })
    }
    for (let i = 1; i < args.length; i++) {
      if ((args[i] as CljNumber).value < (args[i - 1] as CljNumber).value) {
        return cljBoolean(false)
      }
    }
    return cljBoolean(true)
  }),

  '=': cljNativeFunction('=', (...args: CljValue[]) => {
    if (args.length < 2) {
      throw new EvaluationError('= expects at least two arguments', { args })
    }
    for (let i = 1; i < args.length; i++) {
      if (!isEqual(args[i], args[i - 1])) {
        return cljBoolean(false)
      }
    }
    return cljBoolean(true)
  }),

  inc: cljNativeFunction('inc', (x: CljValue) => {
    if (x === undefined || x.kind !== 'number') {
      throw new EvaluationError(
        `inc expects a number${x !== undefined ? `, got ${printString(x)}` : ''}`,
        { x }
      )
    }
    return cljNumber((x as CljNumber).value + 1)
  }),

  dec: cljNativeFunction('dec', (x: CljValue) => {
    if (x === undefined || x.kind !== 'number') {
      throw new EvaluationError(
        `dec expects a number${x !== undefined ? `, got ${printString(x)}` : ''}`,
        { x }
      )
    }
    return cljNumber((x as CljNumber).value - 1)
  }),

  max: cljNativeFunction('max', (...args: CljValue[]) => {
    if (args.length === 0) {
      throw new EvaluationError('max expects at least one argument', { args })
    }
    if (args.some((arg) => arg.kind !== 'number')) {
      throw new EvaluationError('max expects all arguments to be numbers', {
        args,
      })
    }
    return args.reduce((best, arg) =>
      (arg as CljNumber).value > (best as CljNumber).value ? arg : best
    )
  }),

  min: cljNativeFunction('min', (...args: CljValue[]) => {
    if (args.length === 0) {
      throw new EvaluationError('min expects at least one argument', { args })
    }
    if (args.some((arg) => arg.kind !== 'number')) {
      throw new EvaluationError('min expects all arguments to be numbers', {
        args,
      })
    }
    return args.reduce((best, arg) =>
      (arg as CljNumber).value < (best as CljNumber).value ? arg : best
    )
  }),

  mod: cljNativeFunction('mod', (n: CljValue, d: CljValue) => {
    if (n === undefined || n.kind !== 'number') {
      throw new EvaluationError(
        `mod expects a number as first argument${n !== undefined ? `, got ${printString(n)}` : ''}`,
        { n }
      )
    }
    if (d === undefined || d.kind !== 'number') {
      throw new EvaluationError(
        `mod expects a number as second argument${d !== undefined ? `, got ${printString(d)}` : ''}`,
        { d }
      )
    }
    if ((d as CljNumber).value === 0) {
      throw new EvaluationError('mod: division by zero', { n, d })
    }
    // Clojure mod always returns non-negative when divisor is positive
    const result = (n as CljNumber).value % (d as CljNumber).value
    return cljNumber(
      result < 0 ? result + Math.abs((d as CljNumber).value) : result
    )
  }),

  'even?': cljNativeFunction('even?', (n: CljValue) => {
    if (n === undefined || n.kind !== 'number') {
      throw new EvaluationError(
        `even? expects a number${n !== undefined ? `, got ${printString(n)}` : ''}`,
        { n }
      )
    }
    return cljBoolean((n as CljNumber).value % 2 === 0)
  }),

  'odd?': cljNativeFunction('odd?', (n: CljValue) => {
    if (n === undefined || n.kind !== 'number') {
      throw new EvaluationError(
        `odd? expects a number${n !== undefined ? `, got ${printString(n)}` : ''}`,
        { n }
      )
    }
    return cljBoolean(Math.abs((n as CljNumber).value) % 2 !== 0)
  }),
}
