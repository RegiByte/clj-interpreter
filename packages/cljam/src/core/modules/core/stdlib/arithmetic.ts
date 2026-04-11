import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { v } from '../../../factories'
import { printString } from '../../../printer'
import { toSeq } from '../../../transformations'
import type { CljList, CljNumber, CljValue, CljVector } from '../../../types'

export const arithmeticFunctions: Record<string, CljValue> = {
  '+': v
    .nativeFn('+', function add(...nums: CljValue[]) {
      if (nums.length === 0) {
        return v.number(0)
      }
      const badIdx = nums.findIndex(function isNotNumber(a) {
        return a.kind !== 'number'
      })
      if (badIdx !== -1) {
        throw EvaluationError.atArg(
          '+ expects all arguments to be numbers',
          { args: nums },
          badIdx
        )
      }
      return nums.reduce(function sumNumbers(acc, arg) {
        return v.number((acc as CljNumber).value + (arg as CljNumber).value)
      }, v.number(0))
    })
    .doc('Returns the sum of the arguments. Throws on non-number arguments.', [
      ['&', 'nums'],
    ]),

  '-': v
    .nativeFn('-', function subtract(...nums: CljValue[]) {
      if (nums.length === 0) {
        throw new EvaluationError('- expects at least one argument', {
          args: nums,
        })
      }
      const badIdx = nums.findIndex(function isNotNumber(a) {
        return a.kind !== 'number'
      })
      if (badIdx !== -1) {
        throw EvaluationError.atArg(
          '- expects all arguments to be numbers',
          { args: nums },
          badIdx
        )
      }
      return nums.slice(1).reduce(function subtractNumbers(acc, arg) {
        return v.number((acc as CljNumber).value - (arg as CljNumber).value)
      }, nums[0] as CljNumber)
    })
    .doc(
      'Returns the difference of the arguments. Throws on non-number arguments.',
      [['&', 'nums']]
    ),

  '*': v
    .nativeFn('*', function multiply(...nums: CljValue[]) {
      if (nums.length === 0) {
        return v.number(1)
      }
      const badIdx = nums.findIndex(function isNotNumber(a) {
        return a.kind !== 'number'
      })
      if (badIdx !== -1) {
        throw EvaluationError.atArg(
          '* expects all arguments to be numbers',
          { args: nums },
          badIdx
        )
      }
      return nums.slice(1).reduce(function multiplyNumbers(acc, arg) {
        return v.number((acc as CljNumber).value * (arg as CljNumber).value)
      }, nums[0] as CljNumber)
    })
    .doc(
      'Returns the product of the arguments. Throws on non-number arguments.',
      [['&', 'nums']]
    ),

  '/': v
    .nativeFn('/', function divide(...nums: CljValue[]) {
      if (nums.length === 0) {
        throw new EvaluationError('/ expects at least one argument', {
          args: nums,
        })
      }
      const badIdx = nums.findIndex(function isNotNumber(a) {
        return a.kind !== 'number'
      })
      if (badIdx !== -1) {
        throw EvaluationError.atArg(
          '/ expects all arguments to be numbers',
          { args: nums },
          badIdx
        )
      }
      return nums.slice(1).reduce(function divideNumbers(acc, arg, reduceIdx) {
        if ((arg as CljNumber).value === 0) {
          const err = new EvaluationError('division by zero', { args: nums })
          err.data = { argIndex: reduceIdx + 1 }
          throw err
        }
        return v.number((acc as CljNumber).value / (arg as CljNumber).value)
      }, nums[0] as CljNumber)
    })
    .doc(
      'Returns the quotient of the arguments. Throws on non-number arguments or division by zero.',
      [['&', 'nums']]
    ),

  '>': v
    .nativeFn('>', function greaterThan(...nums: CljValue[]) {
      if (nums.length < 2) {
        throw new EvaluationError('> expects at least two arguments', {
          args: nums,
        })
      }
      const badIdx = nums.findIndex(function isNotNumber(a) {
        return a.kind !== 'number'
      })
      if (badIdx !== -1) {
        throw EvaluationError.atArg(
          '> expects all arguments to be numbers',
          { args: nums },
          badIdx
        )
      }
      for (let i = 1; i < nums.length; i++) {
        if ((nums[i] as CljNumber).value >= (nums[i - 1] as CljNumber).value) {
          return v.boolean(false)
        }
      }
      return v.boolean(true)
    })
    .doc(
      'Compares adjacent arguments left to right, returns true if all values are in ascending order, false otherwise.',
      [['&', 'nums']]
    ),

  '<': v
    .nativeFn('<', function lessThan(...nums: CljValue[]) {
      if (nums.length < 2) {
        throw new EvaluationError('< expects at least two arguments', {
          args: nums,
        })
      }
      const badIdx = nums.findIndex(function isNotNumber(a) {
        return a.kind !== 'number'
      })
      if (badIdx !== -1) {
        throw EvaluationError.atArg(
          '< expects all arguments to be numbers',
          { args: nums },
          badIdx
        )
      }
      for (let i = 1; i < nums.length; i++) {
        if ((nums[i] as CljNumber).value <= (nums[i - 1] as CljNumber).value) {
          return v.boolean(false)
        }
      }
      return v.boolean(true)
    })
    .doc(
      'Compares adjacent arguments left to right, returns true if all values are in descending order, false otherwise.',
      [['&', 'nums']]
    ),

  '>=': v
    .nativeFn('>=', function greaterThanOrEqual(...nums: CljValue[]) {
      if (nums.length < 2) {
        throw new EvaluationError('>= expects at least two arguments', {
          args: nums,
        })
      }
      const badIdx = nums.findIndex(function isNotNumber(a) {
        return a.kind !== 'number'
      })
      if (badIdx !== -1) {
        throw EvaluationError.atArg(
          '>= expects all arguments to be numbers',
          { args: nums },
          badIdx
        )
      }
      for (let i = 1; i < nums.length; i++) {
        if ((nums[i] as CljNumber).value > (nums[i - 1] as CljNumber).value) {
          return v.boolean(false)
        }
      }
      return v.boolean(true)
    })
    .doc(
      'Compares adjacent arguments left to right, returns true if all comparisons returns true for greater than or equal to checks, false otherwise.',
      [['&', 'nums']]
    ),

  '<=': v
    .nativeFn('<=', function lessThanOrEqual(...nums: CljValue[]) {
      if (nums.length < 2) {
        throw new EvaluationError('<= expects at least two arguments', {
          args: nums,
        })
      }
      const badIdx = nums.findIndex(function isNotNumber(a) {
        return a.kind !== 'number'
      })
      if (badIdx !== -1) {
        throw EvaluationError.atArg(
          '<= expects all arguments to be numbers',
          { args: nums },
          badIdx
        )
      }
      for (let i = 1; i < nums.length; i++) {
        if ((nums[i] as CljNumber).value < (nums[i - 1] as CljNumber).value) {
          return v.boolean(false)
        }
      }
      return v.boolean(true)
    })
    .doc(
      'Compares adjacent arguments left to right, returns true if all comparisons returns true for less than or equal to checks, false otherwise.',
      [['&', 'nums']]
    ),

  '=': v
    .nativeFn('=', function equals(...vals: CljValue[]) {
      if (vals.length < 2) {
        throw new EvaluationError('= expects at least two arguments', {
          args: vals,
        })
      }
      for (let i = 1; i < vals.length; i++) {
        if (!is.equal(vals[i], vals[i - 1])) {
          return v.boolean(false)
        }
      }
      return v.boolean(true)
    })
    .doc(
      'Compares adjacent arguments left to right, returns true if all values are structurally equal, false otherwise.',
      [['&', 'vals']]
    ),

  inc: v
    .nativeFn('inc', function increment(x: CljValue) {
      if (x === undefined || x.kind !== 'number') {
        throw EvaluationError.atArg(
          `inc expects a number${x !== undefined ? `, got ${printString(x)}` : ''}`,
          { x },
          0
        )
      }
      return v.number((x as CljNumber).value + 1)
    })
    .doc(
      'Returns the argument incremented by 1. Throws on non-number arguments.',
      [['x']]
    ),

  dec: v
    .nativeFn('dec', function decrement(x: CljValue) {
      if (x === undefined || x.kind !== 'number') {
        throw EvaluationError.atArg(
          `dec expects a number${x !== undefined ? `, got ${printString(x)}` : ''}`,
          { x },
          0
        )
      }
      return v.number((x as CljNumber).value - 1)
    })
    .doc(
      'Returns the argument decremented by 1. Throws on non-number arguments.',
      [['x']]
    ),

  max: v
    .nativeFn('max', function maximum(...nums: CljValue[]) {
      if (nums.length === 0) {
        throw new EvaluationError('max expects at least one argument', {
          args: nums,
        })
      }
      const badIdx = nums.findIndex(function isNotNumber(a) {
        return a.kind !== 'number'
      })
      if (badIdx !== -1) {
        throw EvaluationError.atArg(
          'max expects all arguments to be numbers',
          { args: nums },
          badIdx
        )
      }
      return nums.reduce(function findMax(best, arg) {
        return (arg as CljNumber).value > (best as CljNumber).value ? arg : best
      })
    })
    .doc(
      'Returns the largest of the arguments. Throws on non-number arguments.',
      [['&', 'nums']]
    ),

  min: v
    .nativeFn('min', function minimum(...nums: CljValue[]) {
      if (nums.length === 0) {
        throw new EvaluationError('min expects at least one argument', {
          args: nums,
        })
      }
      const badIdx = nums.findIndex(function isNotNumber(a) {
        return a.kind !== 'number'
      })
      if (badIdx !== -1) {
        throw EvaluationError.atArg(
          'min expects all arguments to be numbers',
          { args: nums },
          badIdx
        )
      }
      return nums.reduce(function findMin(best, arg) {
        return (arg as CljNumber).value < (best as CljNumber).value ? arg : best
      })
    })
    .doc(
      'Returns the smallest of the arguments. Throws on non-number arguments.',
      [['&', 'nums']]
    ),

  mod: v
    .nativeFn('mod', function modulo(n: CljValue, d: CljValue) {
      if (n === undefined || n.kind !== 'number') {
        throw EvaluationError.atArg(
          `mod expects a number as first argument${n !== undefined ? `, got ${printString(n)}` : ''}`,
          { n },
          0
        )
      }
      if (d === undefined || d.kind !== 'number') {
        throw EvaluationError.atArg(
          `mod expects a number as second argument${d !== undefined ? `, got ${printString(d)}` : ''}`,
          { d },
          1
        )
      }
      if ((d as CljNumber).value === 0) {
        const err = new EvaluationError('mod: division by zero', { n, d })
        err.data = { argIndex: 1 }
        throw err
      }
      // Clojure mod always returns non-negative when divisor is positive
      const result = (n as CljNumber).value % (d as CljNumber).value
      return v.number(
        result < 0 ? result + Math.abs((d as CljNumber).value) : result
      )
    })
    .doc(
      'Returns the remainder of the first argument divided by the second argument. Throws on non-number arguments or division by zero.',
      [['n', 'd']]
    ),

  'even?': v
    .nativeFn('even?', function isEven(n: CljValue) {
      if (n === undefined || n.kind !== 'number') {
        throw EvaluationError.atArg(
          `even? expects a number${n !== undefined ? `, got ${printString(n)}` : ''}`,
          { n },
          0
        )
      }
      return v.boolean((n as CljNumber).value % 2 === 0)
    })
    .doc('Returns true if the argument is an even number, false otherwise.', [
      ['n'],
    ]),

  'odd?': v
    .nativeFn('odd?', function isOdd(n: CljValue) {
      if (n === undefined || n.kind !== 'number') {
        throw EvaluationError.atArg(
          `odd? expects a number${n !== undefined ? `, got ${printString(n)}` : ''}`,
          { n },
          0
        )
      }
      return v.boolean(Math.abs((n as CljNumber).value) % 2 !== 0)
    })
    .doc('Returns true if the argument is an odd number, false otherwise.', [
      ['n'],
    ]),

  'pos?': v
    .nativeFn('pos?', function isPositive(n: CljValue) {
      if (n === undefined || n.kind !== 'number') {
        throw EvaluationError.atArg(
          `pos? expects a number${n !== undefined ? `, got ${printString(n)}` : ''}`,
          { n },
          0
        )
      }
      return v.boolean((n as CljNumber).value > 0)
    })
    .doc(
      'Returns true if the argument is a positive number, false otherwise.',
      [['n']]
    ),

  'neg?': v
    .nativeFn('neg?', function isNegative(n: CljValue) {
      if (n === undefined || n.kind !== 'number') {
        throw EvaluationError.atArg(
          `neg? expects a number${n !== undefined ? `, got ${printString(n)}` : ''}`,
          { n },
          0
        )
      }
      return v.boolean((n as CljNumber).value < 0)
    })
    .doc(
      'Returns true if the argument is a negative number, false otherwise.',
      [['n']]
    ),

  'zero?': v
    .nativeFn('zero?', function isZero(n: CljValue) {
      if (n === undefined || n.kind !== 'number') {
        throw EvaluationError.atArg(
          `zero? expects a number${n !== undefined ? `, got ${printString(n)}` : ''}`,
          { n },
          0
        )
      }
      return v.boolean((n as CljNumber).value === 0)
    })
    .doc('Returns true if the argument is zero, false otherwise.', [['n']]),

  abs: v
    .nativeFn('abs', function absImpl(n: CljValue) {
      if (n === undefined || n.kind !== 'number') {
        throw EvaluationError.atArg(
          `abs expects a number${n !== undefined ? `, got ${printString(n)}` : ''}`,
          { n },
          0
        )
      }
      return v.number(Math.abs((n as CljNumber).value))
    })
    .doc('Returns the absolute value of a.', [['a']]),

  quot: v
    .nativeFn('quot', function quotImpl(num: CljValue, div: CljValue) {
      if (num === undefined || num.kind !== 'number') {
        throw EvaluationError.atArg(
          `quot expects a number as first argument`,
          { num },
          0
        )
      }
      if (div === undefined || div.kind !== 'number') {
        throw EvaluationError.atArg(
          `quot expects a number as second argument`,
          { div },
          1
        )
      }
      if ((div as CljNumber).value === 0) {
        throw EvaluationError.atArg('quot: division by zero', { num, div }, 1)
      }
      return v.number(
        Math.trunc((num as CljNumber).value / (div as CljNumber).value)
      )
    })
    .doc('quot[ient] of dividing numerator by denominator.', [['num', 'div']]),

  rem: v
    .nativeFn('rem', function remImpl(num: CljValue, div: CljValue) {
      if (num === undefined || num.kind !== 'number') {
        throw EvaluationError.atArg(
          `rem expects a number as first argument`,
          { num },
          0
        )
      }
      if (div === undefined || div.kind !== 'number') {
        throw EvaluationError.atArg(
          `rem expects a number as second argument`,
          { div },
          1
        )
      }
      if ((div as CljNumber).value === 0) {
        throw EvaluationError.atArg('rem: division by zero', { num, div }, 1)
      }
      return v.number((num as CljNumber).value % (div as CljNumber).value)
    })
    .doc('remainder of dividing numerator by denominator.', [['num', 'div']]),

  rand: v
    .nativeFn('rand', function randImpl(...args: CljValue[]) {
      if (args.length === 0) return v.number(Math.random())
      if (args[0].kind !== 'number') {
        throw EvaluationError.atArg(`rand expects a number`, { n: args[0] }, 0)
      }
      return v.number(Math.random() * (args[0] as CljNumber).value)
    })
    .doc(
      'Returns a random floating point number between 0 (inclusive) and n (default 1) (exclusive).',
      [[], ['n']]
    ),

  'rand-int': v
    .nativeFn('rand-int', function randIntImpl(n: CljValue) {
      if (n === undefined || n.kind !== 'number') {
        throw EvaluationError.atArg(`rand-int expects a number`, { n }, 0)
      }
      return v.number(Math.floor(Math.random() * (n as CljNumber).value))
    })
    .doc('Returns a random integer between 0 (inclusive) and n (exclusive).', [
      ['n'],
    ]),

  'rand-nth': v
    .nativeFn('rand-nth', function randNthImpl(coll: CljValue) {
      if (coll === undefined || (!is.list(coll) && !is.vector(coll))) {
        throw EvaluationError.atArg(
          `rand-nth expects a list or vector`,
          { coll },
          0
        )
      }
      const items = (coll as CljList | CljVector).value
      if (items.length === 0) {
        throw EvaluationError.atArg('rand-nth called on empty collection', { coll }, 0)
      }
      return items[Math.floor(Math.random() * items.length)]
    })
    .doc('Return a random element of the (sequential) collection.', [['coll']]),

  shuffle: v
    .nativeFn('shuffle', function shuffleImpl(coll: CljValue) {
      if (coll === undefined || coll.kind === 'nil') return v.vector([])
      if (!is.seqable(coll)) {
        throw EvaluationError.atArg(
          `shuffle expects a collection, got ${printString(coll)}`,
          { coll },
          0
        )
      }
      const arr = [...toSeq(coll)]
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return v.vector(arr)
    })
    .doc('Return a random permutation of coll.', [['coll']]),

  'bit-and': v
    .nativeFn('bit-and', function bitAndImpl(x: CljValue, y: CljValue) {
      if (x?.kind !== 'number')
        throw EvaluationError.atArg('bit-and expects numbers', { x }, 0)
      if (y?.kind !== 'number')
        throw EvaluationError.atArg('bit-and expects numbers', { y }, 1)
      return v.number((x as CljNumber).value & (y as CljNumber).value)
    })
    .doc('Bitwise and', [['x', 'y']]),

  'bit-or': v
    .nativeFn('bit-or', function bitOrImpl(x: CljValue, y: CljValue) {
      if (x?.kind !== 'number')
        throw EvaluationError.atArg('bit-or expects numbers', { x }, 0)
      if (y?.kind !== 'number')
        throw EvaluationError.atArg('bit-or expects numbers', { y }, 1)
      return v.number((x as CljNumber).value | (y as CljNumber).value)
    })
    .doc('Bitwise or', [['x', 'y']]),

  'bit-xor': v
    .nativeFn('bit-xor', function bitXorImpl(x: CljValue, y: CljValue) {
      if (x?.kind !== 'number')
        throw EvaluationError.atArg('bit-xor expects numbers', { x }, 0)
      if (y?.kind !== 'number')
        throw EvaluationError.atArg('bit-xor expects numbers', { y }, 1)
      return v.number((x as CljNumber).value ^ (y as CljNumber).value)
    })
    .doc('Bitwise exclusive or', [['x', 'y']]),

  'bit-not': v
    .nativeFn('bit-not', function bitNotImpl(x: CljValue) {
      if (x?.kind !== 'number')
        throw EvaluationError.atArg('bit-not expects a number', { x }, 0)
      return v.number(~(x as CljNumber).value)
    })
    .doc('Bitwise complement', [['x']]),

  'bit-shift-left': v
    .nativeFn(
      'bit-shift-left',
      function bitShiftLeftImpl(x: CljValue, n: CljValue) {
        if (x?.kind !== 'number')
          throw EvaluationError.atArg(
            'bit-shift-left expects numbers',
            { x },
            0
          )
        if (n?.kind !== 'number')
          throw EvaluationError.atArg(
            'bit-shift-left expects numbers',
            { n },
            1
          )
        return v.number((x as CljNumber).value << (n as CljNumber).value)
      }
    )
    .doc('Bitwise shift left', [['x', 'n']]),

  'bit-shift-right': v
    .nativeFn(
      'bit-shift-right',
      function bitShiftRightImpl(x: CljValue, n: CljValue) {
        if (x?.kind !== 'number')
          throw EvaluationError.atArg(
            'bit-shift-right expects numbers',
            { x },
            0
          )
        if (n?.kind !== 'number')
          throw EvaluationError.atArg(
            'bit-shift-right expects numbers',
            { n },
            1
          )
        return v.number((x as CljNumber).value >> (n as CljNumber).value)
      }
    )
    .doc('Bitwise shift right', [['x', 'n']]),

  'unsigned-bit-shift-right': v
    .nativeFn(
      'unsigned-bit-shift-right',
      function unsignedBitShiftRightImpl(x: CljValue, n: CljValue) {
        if (x?.kind !== 'number')
          throw EvaluationError.atArg(
            'unsigned-bit-shift-right expects numbers',
            { x },
            0
          )
        if (n?.kind !== 'number')
          throw EvaluationError.atArg(
            'unsigned-bit-shift-right expects numbers',
            { n },
            1
          )
        return v.number((x as CljNumber).value >>> (n as CljNumber).value)
      }
    )
    .doc('Bitwise shift right, without sign-extension', [['x', 'n']]),
}
