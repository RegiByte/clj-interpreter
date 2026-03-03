import { EvaluationError } from '../errors'
import { cljBoolean, cljNativeFunction, cljNumber, withDoc } from '../factories'
import { isEqual } from '../assertions'
import { printString } from '../printer'
import type { CljNumber, CljValue } from '../types'

export const arithmeticFunctions: Record<string, CljValue> = {
  '+': withDoc(
    cljNativeFunction('+', (...nums: CljValue[]) => {
      if (nums.length === 0) {
        return cljNumber(0)
      }
      if (nums.some((arg) => arg.kind !== 'number')) {
        throw new EvaluationError('+ expects all arguments to be numbers', {
          args: nums,
        })
      }
      return nums.reduce((acc, arg) => {
        return cljNumber((acc as CljNumber).value + (arg as CljNumber).value)
      }, cljNumber(0))
    }),
    'Returns the sum of the arguments. Throws on non-number arguments.',
    [['&', 'nums']]
  ),

  '-': withDoc(
    cljNativeFunction('-', (...nums: CljValue[]) => {
      if (nums.length === 0) {
        throw new EvaluationError('- expects at least one argument', {
          args: nums,
        })
      }
      if (nums.some((arg) => arg.kind !== 'number')) {
        throw new EvaluationError('- expects all arguments to be numbers', {
          args: nums,
        })
      }
      return nums.slice(1).reduce((acc, arg) => {
        return cljNumber((acc as CljNumber).value - (arg as CljNumber).value)
      }, nums[0] as CljNumber)
    }),
    'Returns the difference of the arguments. Throws on non-number arguments.',
    [['&', 'nums']]
  ),

  '*': withDoc(
    cljNativeFunction('*', (...nums: CljValue[]) => {
      if (nums.length === 0) {
        return cljNumber(1)
      }
      if (nums.some((arg) => arg.kind !== 'number')) {
        throw new EvaluationError('* expects all arguments to be numbers', {
          args: nums,
        })
      }
      return nums.slice(1).reduce((acc, arg) => {
        return cljNumber((acc as CljNumber).value * (arg as CljNumber).value)
      }, nums[0] as CljNumber)
    }),
    'Returns the product of the arguments. Throws on non-number arguments.',
    [['&', 'nums']]
  ),

  '/': withDoc(
    cljNativeFunction('/', (...nums: CljValue[]) => {
      if (nums.length === 0) {
        throw new EvaluationError('/ expects at least one argument', {
          args: nums,
        })
      }
      if (nums.some((arg) => arg.kind !== 'number')) {
        throw new EvaluationError('/ expects all arguments to be numbers', {
          args: nums,
        })
      }
      return nums.slice(1).reduce((acc, arg) => {
        if ((arg as CljNumber).value === 0) {
          throw new EvaluationError('division by zero', { args: nums })
        }
        return cljNumber((acc as CljNumber).value / (arg as CljNumber).value)
      }, nums[0] as CljNumber)
    }),
    'Returns the quotient of the arguments. Throws on non-number arguments or division by zero.',
    [['&', 'nums']]
  ),

  '>': withDoc(
    cljNativeFunction('>', (...nums: CljValue[]) => {
      if (nums.length < 2) {
        throw new EvaluationError('> expects at least two arguments', {
          args: nums,
        })
      }
      if (nums.some((arg) => arg.kind !== 'number')) {
        throw new EvaluationError('> expects all arguments to be numbers', {
          args: nums,
        })
      }
      for (let i = 1; i < nums.length; i++) {
        if ((nums[i] as CljNumber).value >= (nums[i - 1] as CljNumber).value) {
          return cljBoolean(false)
        }
      }
      return cljBoolean(true)
    }),
    'Compares adjacent arguments left to right, returns true if all values are in ascending order, false otherwise.',
    [['&', 'nums']]
  ),

  '<': withDoc(
    cljNativeFunction('<', (...nums: CljValue[]) => {
      if (nums.length < 2) {
        throw new EvaluationError('< expects at least two arguments', {
          args: nums,
        })
      }
      if (nums.some((arg) => arg.kind !== 'number')) {
        throw new EvaluationError('< expects all arguments to be numbers', {
          args: nums,
        })
      }
      for (let i = 1; i < nums.length; i++) {
        if ((nums[i] as CljNumber).value <= (nums[i - 1] as CljNumber).value) {
          return cljBoolean(false)
        }
      }
      return cljBoolean(true)
    }),
    'Compares adjacent arguments left to right, returns true if all values are in descending order, false otherwise.',
    [['&', 'nums']]
  ),

  '>=': withDoc(
    cljNativeFunction('>=', (...nums: CljValue[]) => {
      if (nums.length < 2) {
        throw new EvaluationError('>= expects at least two arguments', {
          args: nums,
        })
      }
      if (nums.some((arg) => arg.kind !== 'number')) {
        throw new EvaluationError('>= expects all arguments to be numbers', {
          args: nums,
        })
      }
      for (let i = 1; i < nums.length; i++) {
        if ((nums[i] as CljNumber).value > (nums[i - 1] as CljNumber).value) {
          return cljBoolean(false)
        }
      }
      return cljBoolean(true)
    }),
    'Compares adjacent arguments left to right, returns true if all comparisons returns true for greater than or equal to checks, false otherwise.',
    [['&', 'nums']]
  ),

  '<=': withDoc(
    cljNativeFunction('<=', (...nums: CljValue[]) => {
      if (nums.length < 2) {
        throw new EvaluationError('<= expects at least two arguments', {
          args: nums,
        })
      }
      if (nums.some((arg) => arg.kind !== 'number')) {
        throw new EvaluationError('<= expects all arguments to be numbers', {
          args: nums,
        })
      }
      for (let i = 1; i < nums.length; i++) {
        if ((nums[i] as CljNumber).value < (nums[i - 1] as CljNumber).value) {
          return cljBoolean(false)
        }
      }
      return cljBoolean(true)
    }),
    'Compares adjacent arguments left to right, returns true if all comparisons returns true for less than or equal to checks, false otherwise.',
    [['&', 'nums']]
  ),

  '=': withDoc(
    cljNativeFunction('=', (...vals: CljValue[]) => {
      if (vals.length < 2) {
        throw new EvaluationError('= expects at least two arguments', {
          args: vals,
        })
      }
      for (let i = 1; i < vals.length; i++) {
        if (!isEqual(vals[i], vals[i - 1])) {
          return cljBoolean(false)
        }
      }
      return cljBoolean(true)
    }),
    'Compares adjacent arguments left to right, returns true if all values are structurally equal, false otherwise.',
    [['&', 'vals']]
  ),

  inc: withDoc(
    cljNativeFunction('inc', (x: CljValue) => {
      if (x === undefined || x.kind !== 'number') {
        throw new EvaluationError(
          `inc expects a number${x !== undefined ? `, got ${printString(x)}` : ''}`,
          { x }
        )
      }
      return cljNumber((x as CljNumber).value + 1)
    }),
    'Returns the argument incremented by 1. Throws on non-number arguments.',
    [['x']]
  ),

  dec: withDoc(
    cljNativeFunction('dec', (x: CljValue) => {
      if (x === undefined || x.kind !== 'number') {
        throw new EvaluationError(
          `dec expects a number${x !== undefined ? `, got ${printString(x)}` : ''}`,
          { x }
        )
      }
      return cljNumber((x as CljNumber).value - 1)
    }),
    'Returns the argument decremented by 1. Throws on non-number arguments.',
    [['x']]
  ),

  max: withDoc(
    cljNativeFunction('max', (...nums: CljValue[]) => {
      if (nums.length === 0) {
        throw new EvaluationError('max expects at least one argument', {
          args: nums,
        })
      }
      if (nums.some((arg) => arg.kind !== 'number')) {
        throw new EvaluationError('max expects all arguments to be numbers', {
          args: nums,
        })
      }
      return nums.reduce((best, arg) =>
        (arg as CljNumber).value > (best as CljNumber).value ? arg : best
      )
    }),
    'Returns the largest of the arguments. Throws on non-number arguments.',
    [['&', 'nums']]
  ),

  min: withDoc(
    cljNativeFunction('min', (...nums: CljValue[]) => {
      if (nums.length === 0) {
        throw new EvaluationError('min expects at least one argument', {
          args: nums,
        })
      }
      if (nums.some((arg) => arg.kind !== 'number')) {
        throw new EvaluationError('min expects all arguments to be numbers', {
          args: nums,
        })
      }
      return nums.reduce((best, arg) =>
        (arg as CljNumber).value < (best as CljNumber).value ? arg : best
      )
    }),
    'Returns the smallest of the arguments. Throws on non-number arguments.',
    [['&', 'nums']]
  ),

  mod: withDoc(
    cljNativeFunction('mod', (n: CljValue, d: CljValue) => {
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
    'Returns the remainder of the first argument divided by the second argument. Throws on non-number arguments or division by zero.',
    [['n', 'd']]
  ),

  'even?': withDoc(
    cljNativeFunction('even?', (n: CljValue) => {
      if (n === undefined || n.kind !== 'number') {
        throw new EvaluationError(
          `even? expects a number${n !== undefined ? `, got ${printString(n)}` : ''}`,
          { n }
        )
      }
      return cljBoolean((n as CljNumber).value % 2 === 0)
    }),
    'Returns true if the argument is an even number, false otherwise.',
    [['n']]
  ),

  'odd?': withDoc(
    cljNativeFunction('odd?', (n: CljValue) => {
      if (n === undefined || n.kind !== 'number') {
        throw new EvaluationError(
          `odd? expects a number${n !== undefined ? `, got ${printString(n)}` : ''}`,
          { n }
        )
      }
      return cljBoolean(Math.abs((n as CljNumber).value) % 2 !== 0)
    }),
    'Returns true if the argument is an odd number, false otherwise.',
    [['n']]
  ),

  'pos?': withDoc(
    cljNativeFunction('pos?', (n: CljValue) => {
      if (n === undefined || n.kind !== 'number') {
        throw new EvaluationError(
          `pos? expects a number${n !== undefined ? `, got ${printString(n)}` : ''}`,
          { n }
        )
      }
      return cljBoolean((n as CljNumber).value > 0)
    }),
    'Returns true if the argument is a positive number, false otherwise.',
    [['n']]
  ),

  'neg?': withDoc(
    cljNativeFunction('neg?', (n: CljValue) => {
      if (n === undefined || n.kind !== 'number') {
        throw new EvaluationError(
          `neg? expects a number${n !== undefined ? `, got ${printString(n)}` : ''}`,
          { n }
        )
      }
      return cljBoolean((n as CljNumber).value < 0)
    }),
    'Returns true if the argument is a negative number, false otherwise.',
    [['n']]
  ),

  'zero?': withDoc(
    cljNativeFunction('zero?', (n: CljValue) => {
      if (n === undefined || n.kind !== 'number') {
        throw new EvaluationError(
          `zero? expects a number${n !== undefined ? `, got ${printString(n)}` : ''}`,
          { n }
        )
      }
      return cljBoolean((n as CljNumber).value === 0)
    }),
    'Returns true if the argument is zero, false otherwise.',
    [['n']]
  ),
}
