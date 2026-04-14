// Predicates & logical: nil?, true?, false?, truthy?, falsy?, not, not=,
// number?, string?, boolean?, vector?, list?, map?, keyword?, symbol?, fn?,
// coll?, some, every?
import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { v } from '../../../factories'
import { printString } from '../../../printer'
import { toSeq } from '../../../transformations'
import type { CljNumber, CljValue, Env, EvaluationContext } from '../../../types'

export const predicateFunctions: Record<string, CljValue> = {
  'nil?': v
    .nativeFn('nil?', function nilPredImpl(arg: CljValue) {
      return v.boolean(arg.kind === 'nil')
    })
    .doc('Returns true if the value is nil, false otherwise.', [['arg']]),
  'true?': v
    .nativeFn('true?', function truePredImpl(arg: CljValue) {
      // returns true if the value is a boolean and true
      if (arg.kind !== 'boolean') {
        return v.boolean(false)
      }
      return v.boolean(arg.value === true)
    })
    .doc('Returns true if the value is a boolean and true, false otherwise.', [
      ['arg'],
    ]),
  'false?': v
    .nativeFn('false?', function falsePredImpl(arg: CljValue) {
      // returns true if the value is a boolean and false
      if (arg.kind !== 'boolean') {
        return v.boolean(false)
      }
      return v.boolean(arg.value === false)
    })
    .doc('Returns true if the value is a boolean and false, false otherwise.', [
      ['arg'],
    ]),
  'truthy?': v
    .nativeFn('truthy?', function truthyPredImpl(arg: CljValue) {
      return v.boolean(is.truthy(arg))
    })
    .doc('Returns true if the value is not nil or false, false otherwise.', [
      ['arg'],
    ]),
  'falsy?': v
    .nativeFn('falsy?', function falsyPredImpl(arg: CljValue) {
      return v.boolean(is.falsy(arg))
    })
    .doc('Returns true if the value is nil or false, false otherwise.', [
      ['arg'],
    ]),
  'not=': v
    .nativeFn('not=', function notEqualImpl(...vals: CljValue[]) {
      if (vals.length < 2) {
        throw new EvaluationError('not= expects at least two arguments', {
          args: vals,
        })
      }
      for (let i = 1; i < vals.length; i++) {
        if (!is.equal(vals[i], vals[i - 1])) {
          return v.boolean(true)
        }
      }
      return v.boolean(false)
    })
    .doc(
      'Returns true if any two adjacent arguments are not equal, false otherwise.',
      [['&', 'vals']]
    ),
  'char?': v
    .nativeFn('char?', function charPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.char(x))
    })
    .doc('Returns true if the value is a character, false otherwise.', [['x']]),

  char: v
    .nativeFn('char', function charImpl(n: CljValue) {
      if (n === undefined || n.kind !== 'number') {
        throw new EvaluationError(
          `char expects a number, got ${n !== undefined ? printString(n) : 'nothing'}`,
          { n }
        )
      }
      const cp = Math.trunc(n.value)
      if (cp < 0 || cp > 0x10ffff) {
        throw new EvaluationError(
          `char: code point ${cp} is out of Unicode range`,
          { n }
        )
      }
      return v.char(String.fromCodePoint(cp))
    })
    .doc('Returns the character at the given Unicode code point.', [['n']]),

  int: v
    .nativeFn('int', function intImpl(x: CljValue) {
      if (x === undefined) {
        throw new EvaluationError('int expects one argument', {})
      }
      if (x.kind === 'character') {
        return v.number(x.value.codePointAt(0)!)
      }
      if (x.kind === 'number') {
        return v.number(Math.trunc(x.value))
      }
      throw new EvaluationError(
        `int expects a number or character, got ${printString(x)}`,
        { x }
      )
    })
    .doc('Coerces x to int. For characters, returns the Unicode code point.', [
      ['x'],
    ]),

  'number?': v
    .nativeFn('number?', function numberPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && x.kind === 'number')
    })
    .doc('Returns true if the value is a number, false otherwise.', [['x']]),

  'string?': v
    .nativeFn('string?', function stringPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.string(x))
    })
    .doc('Returns true if the value is a string, false otherwise.', [['x']]),

  'boolean?': v
    .nativeFn('boolean?', function booleanPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && x.kind === 'boolean')
    })
    .doc('Returns true if the value is a boolean, false otherwise.', [['x']]),

  'vector?': v
    .nativeFn('vector?', function vectorPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.vector(x))
    })
    .doc('Returns true if the value is a vector, false otherwise.', [['x']]),

  'list?': v
    .nativeFn('list?', function listPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.list(x))
    })
    .doc('Returns true if the value is a list, false otherwise.', [['x']]),

  'map?': v
    .nativeFn('map?', function mapPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.map(x))
    })
    .doc('Returns true if the value is a map, false otherwise.', [['x']]),

  'keyword?': v
    .nativeFn('keyword?', function keywordPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.keyword(x))
    })
    .doc('Returns true if the value is a keyword, false otherwise.', [['x']]),

  'qualified-keyword?': v
    .nativeFn(
      'qualified-keyword?',
      function qualifiedKeywordPredImpl(x: CljValue) {
        return v.boolean(
          x !== undefined && is.keyword(x) && x.name.includes('/')
        )
      }
    )
    .doc('Returns true if the value is a qualified keyword, false otherwise.', [
      ['x'],
    ]),

  'symbol?': v
    .nativeFn('symbol?', function symbolPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.symbol(x))
    })
    .doc('Returns true if the value is a symbol, false otherwise.', [['x']]),

  'namespace?': v
    .nativeFn('namespace?', function namespaceQImpl(x: CljValue) {
      return v.boolean(x !== undefined && x.kind === 'namespace')
    })
    .doc('Returns true if x is a namespace.', [['x']]),

  'qualified-symbol?': v
    .nativeFn(
      'qualified-symbol?',
      function qualifiedSymbolPredImpl(x: CljValue) {
        return v.boolean(
          x !== undefined && is.symbol(x) && x.name.includes('/')
        )
      }
    )
    .doc('Returns true if the value is a qualified symbol, false otherwise.', [
      ['x'],
    ]),

  'ident?': v
    .nativeFn('ident?', function identPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && (is.keyword(x) || is.symbol(x)))
    })
    .doc('Returns true if x is a symbol or keyword.', [['x']]),

  'simple-ident?': v
    .nativeFn('simple-ident?', function simpleIdentPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          ((is.keyword(x) && !x.name.includes('/')) ||
            (is.symbol(x) && !x.name.includes('/')))
      )
    })
    .doc(
      'Returns true if x is a symbol or keyword with no namespace component.',
      [['x']]
    ),

  'qualified-ident?': v
    .nativeFn(
      'qualified-ident?',
      function qualifiedIdentPredImpl(x: CljValue) {
        return v.boolean(
          x !== undefined &&
            ((is.keyword(x) && x.name.includes('/')) ||
              (is.symbol(x) && x.name.includes('/')))
        )
      }
    )
    .doc(
      'Returns true if x is a symbol or keyword with a namespace component.',
      [['x']]
    ),

  'simple-keyword?': v
    .nativeFn('simple-keyword?', function simpleKeywordPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined && is.keyword(x) && !x.name.includes('/')
      )
    })
    .doc(
      'Returns true if x is a keyword with no namespace component.',
      [['x']]
    ),

  'simple-symbol?': v
    .nativeFn('simple-symbol?', function simpleSymbolPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined && is.symbol(x) && !x.name.includes('/')
      )
    })
    .doc(
      'Returns true if x is a symbol with no namespace component.',
      [['x']]
    ),

  'fn?': v
    .nativeFn('fn?', function fnPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.aFunction(x))
    })
    .doc('Returns true if the value is a function, false otherwise.', [['x']]),

  'coll?': v
    .nativeFn('coll?', function collPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.collection(x))
    })
    .doc('Returns true if the value is a collection, false otherwise.', [
      ['x'],
    ]),
  some: v
    .nativeFnCtx(
      'some',
      function someImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        pred: CljValue,
        coll: CljValue
      ): CljValue {
        if (pred === undefined || !is.callable(pred)) {
          throw EvaluationError.atArg(
            `some expects a callable as first argument${pred !== undefined ? `, got ${printString(pred)}` : ''}`,
            { pred },
            0
          )
        }
        if (coll === undefined) {
          return v.nil()
        }
        if (!is.seqable(coll)) {
          throw EvaluationError.atArg(
            `some expects a collection or string as second argument, got ${printString(coll)}`,
            { coll },
            1
          )
        }
        for (const item of toSeq(coll)) {
          const result = ctx.applyCallable(pred, [item], callEnv)
          if (is.truthy(result)) {
            return result
          }
        }
        return v.nil()
      }
    )
    .doc(
      'Returns the first truthy result of applying pred to each item in coll, or nil if no item satisfies pred.',
      [['pred', 'coll']]
    ),

  'every?': v
    .nativeFnCtx(
      'every?',
      function everyPredImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        pred: CljValue,
        coll: CljValue
      ): CljValue {
        if (pred === undefined || !is.callable(pred)) {
          throw EvaluationError.atArg(
            `every? expects a callable as first argument${pred !== undefined ? `, got ${printString(pred)}` : ''}`,
            { pred },
            0
          )
        }
        if (coll === undefined || !is.seqable(coll)) {
          throw EvaluationError.atArg(
            `every? expects a collection or string as second argument${coll !== undefined ? `, got ${printString(coll)}` : ''}`,
            { coll },
            1
          )
        }
        for (const item of toSeq(coll)) {
          if (is.falsy(ctx.applyCallable(pred, [item], callEnv))) {
            return v.boolean(false)
          }
        }
        return v.boolean(true)
      }
    )
    .doc('Returns true if all items in coll satisfy pred, false otherwise.', [
      ['pred', 'coll'],
    ]),

  'identical?': v
    .nativeFn(
      'identical?',
      function identicalPredImpl(x: CljValue, y: CljValue) {
        return v.boolean(x === y)
      }
    )
    .doc('Tests if 2 arguments are the same object (reference equality).', [
      ['x', 'y'],
    ]),

  'seqable?': v
    .nativeFn('seqable?', function seqablePredImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.seqable(x))
    })
    .doc('Return true if the seq function is supported for x.', [['x']]),

  'sequential?': v
    .nativeFn('sequential?', function sequentialPredImpl(x: CljValue) {
      return v.boolean(x !== undefined && (is.list(x) || is.vector(x)))
    })
    .doc('Returns true if coll is a sequential collection (list or vector).', [
      ['coll'],
    ]),

  'associative?': v
    .nativeFn('associative?', function associativePredImpl(x: CljValue) {
      return v.boolean(x !== undefined && (is.map(x) || is.vector(x)))
    })
    .doc('Returns true if coll implements Associative (map or vector).', [
      ['coll'],
    ]),

  'counted?': v
    .nativeFn('counted?', function countedPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          (is.list(x) ||
            is.vector(x) ||
            is.map(x) ||
            x.kind === 'set' ||
            is.string(x))
      )
    })
    .doc('Returns true if coll implements count in constant time.', [['coll']]),

  'int?': v
    .nativeFn('int?', function intPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          x.kind === 'number' &&
          Number.isInteger((x as import('../../../types').CljNumber).value)
      )
    })
    .doc('Return true if x is a fixed precision integer.', [['x']]),

  'pos-int?': v
    .nativeFn('pos-int?', function posIntPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          x.kind === 'number' &&
          Number.isInteger((x as CljNumber).value) &&
          (x as CljNumber).value > 0
      )
    })
    .doc('Return true if x is a positive fixed precision integer.', [['x']]),

  'neg-int?': v
    .nativeFn('neg-int?', function negIntPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          x.kind === 'number' &&
          Number.isInteger((x as CljNumber).value) &&
          (x as CljNumber).value < 0
      )
    })
    .doc('Return true if x is a negative fixed precision integer.', [['x']]),

  'nat-int?': v
    .nativeFn('nat-int?', function natIntPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          x.kind === 'number' &&
          Number.isInteger((x as CljNumber).value) &&
          (x as CljNumber).value >= 0
      )
    })
    .doc(
      'Return true if x is a non-negative fixed precision integer.',
      [['x']]
    ),

  'double?': v
    .nativeFn('double?', function doublePredImpl(x: CljValue) {
      return v.boolean(x !== undefined && x.kind === 'number')
    })
    .doc('Return true if x is a Double (all numbers in JS are doubles).', [
      ['x'],
    ]),

  'NaN?': v
    .nativeFn('NaN?', function nanPredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined && x.kind === 'number' && isNaN((x as CljNumber).value)
      )
    })
    .doc('Returns true if num is NaN, else false.', [['num']]),

  'infinite?': v
    .nativeFn('infinite?', function infinitePredImpl(x: CljValue) {
      return v.boolean(
        x !== undefined &&
          x.kind === 'number' &&
          !isFinite((x as CljNumber).value) &&
          !isNaN((x as CljNumber).value)
      )
    })
    .doc('Returns true if num is positive or negative infinity, else false.', [
      ['num'],
    ]),

  compare: v
    .nativeFn(
      'compare',
      function compareImpl(x: CljValue, y: CljValue): CljValue {
        if (is.nil(x) && is.nil(y)) return v.number(0)
        if (is.nil(x)) return v.number(-1)
        if (is.nil(y)) return v.number(1)
        if (is.number(x) && is.number(y)) {
          return v.number(
            (x as CljNumber).value < (y as CljNumber).value
              ? -1
              : (x as CljNumber).value > (y as CljNumber).value
                ? 1
                : 0
          )
        }
        if (is.string(x) && is.string(y)) {
          return v.number(x.value < y.value ? -1 : x.value > y.value ? 1 : 0)
        }
        if (is.char(x) && is.char(y)) {
          return v.number(x.value < y.value ? -1 : x.value > y.value ? 1 : 0)
        }
        if (is.keyword(x) && is.keyword(y)) {
          return v.number(x.name < y.name ? -1 : x.name > y.name ? 1 : 0)
        }
        throw new EvaluationError(
          `compare: cannot compare ${printString(x)} to ${printString(y)}`,
          { x, y }
        )
      }
    )
    .doc('Comparator. Returns a negative number, zero, or a positive number.', [
      ['x', 'y'],
    ]),

  hash: v
    .nativeFn('hash', function hashImpl(x: CljValue) {
      // Simple hash — consistent within a session, not cryptographic
      const s = printString(x)
      let h = 0
      for (let i = 0; i < s.length; i++) {
        h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
      }
      return v.number(h)
    })
    .doc('Returns the hash code of its argument.', [['x']]),
}
