// Predicates & logical: nil?, true?, false?, truthy?, falsy?, not, not=,
// number?, string?, boolean?, vector?, list?, map?, keyword?, symbol?, fn?,
// coll?, some, every?
import {
  isAFunction,
  isCollection,
  isEqual,
  isFalsy,
  isKeyword,
  isSymbol,
  isTruthy,
  isList,
  isVector,
  isMap,
} from '../assertions'
import { applyFunction } from '../evaluator'
import { EvaluationError } from '../errors'
import { cljBoolean, cljNativeFunction, cljNil, withDoc } from '../factories'
import { printString } from '../printer'
import { toSeq } from '../transformations'
import type { CljValue } from '../types'

export const predicateFunctions: Record<string, CljValue> = {
  'nil?': withDoc(
    cljNativeFunction('nil?', (arg: CljValue) => {
      return cljBoolean(arg.kind === 'nil')
    }),
    'Returns true if the value is nil, false otherwise.',
    [['arg']]
  ),
  'true?': withDoc(
    cljNativeFunction('true?', (arg: CljValue) => {
      // returns true if the value is a boolean and true
      if (arg.kind !== 'boolean') {
        return cljBoolean(false)
      }
      return cljBoolean(arg.value === true)
    }),
    'Returns true if the value is a boolean and true, false otherwise.',
    [['arg']]
  ),
  'false?': withDoc(
    cljNativeFunction('false?', (arg: CljValue) => {
      // returns true if the value is a boolean and false
      if (arg.kind !== 'boolean') {
        return cljBoolean(false)
      }
      return cljBoolean(arg.value === false)
    }),
    'Returns true if the value is a boolean and false, false otherwise.',
    [['arg']]
  ),
  'truthy?': withDoc(
    cljNativeFunction('truthy?', (arg: CljValue) => {
      return cljBoolean(isTruthy(arg))
    }),
    'Returns true if the value is not nil or false, false otherwise.',
    [['arg']]
  ),
  'falsy?': withDoc(
    cljNativeFunction('falsy?', (arg: CljValue) => {
      return cljBoolean(isFalsy(arg))
    }),
    'Returns true if the value is nil or false, false otherwise.',
    [['arg']]
  ),
  // not: withDoc(
  //   cljNativeFunction('not', (arg: CljValue) => {
  //     return cljBoolean(!isTruthy(arg))
  //   }),
  //   'Returns the negation of the truthiness of the value.',
  //   [['arg']]
  // ),
  'not=': withDoc(
    cljNativeFunction('not=', (...vals: CljValue[]) => {
      if (vals.length < 2) {
        throw new EvaluationError('not= expects at least two arguments', {
          args: vals,
        })
      }
      for (let i = 1; i < vals.length; i++) {
        if (!isEqual(vals[i], vals[i - 1])) {
          return cljBoolean(true)
        }
      }
      return cljBoolean(false)
    }),
    'Returns true if any two adjacent arguments are not equal, false otherwise.',
    [['&', 'vals']]
  ),
  'number?': withDoc(
    cljNativeFunction('number?', (x: CljValue) =>
      cljBoolean(x !== undefined && x.kind === 'number')
    ),
    'Returns true if the value is a number, false otherwise.',
    [['x']]
  ),

  'string?': withDoc(
    cljNativeFunction('string?', (x: CljValue) =>
      cljBoolean(x !== undefined && x.kind === 'string')
    ),
    'Returns true if the value is a string, false otherwise.',
    [['x']]
  ),

  'boolean?': withDoc(
    cljNativeFunction('boolean?', (x: CljValue) =>
      cljBoolean(x !== undefined && x.kind === 'boolean')
    ),
    'Returns true if the value is a boolean, false otherwise.',
    [['x']]
  ),

  'vector?': withDoc(
    cljNativeFunction('vector?', (x: CljValue) =>
      cljBoolean(x !== undefined && isVector(x))
    ),
    'Returns true if the value is a vector, false otherwise.',
    [['x']]
  ),

  'list?': withDoc(
    cljNativeFunction('list?', (x: CljValue) =>
      cljBoolean(x !== undefined && isList(x))
    ),
    'Returns true if the value is a list, false otherwise.',
    [['x']]
  ),

  'map?': withDoc(
    cljNativeFunction('map?', (x: CljValue) =>
      cljBoolean(x !== undefined && isMap(x))
    ),
    'Returns true if the value is a map, false otherwise.',
    [['x']]
  ),

  'keyword?': withDoc(
    cljNativeFunction('keyword?', (x: CljValue) =>
      cljBoolean(x !== undefined && isKeyword(x))
    ),
    'Returns true if the value is a keyword, false otherwise.',
    [['x']]
  ),

  'qualified-keyword?': withDoc(
    cljNativeFunction('qualified-keyword?', (x: CljValue) =>
      cljBoolean(x !== undefined && isKeyword(x) && x.name.includes('/'))
    ),
    'Returns true if the value is a qualified keyword, false otherwise.',
    [['x']]
  ),

  'symbol?': withDoc(
    cljNativeFunction('symbol?', (x: CljValue) =>
      cljBoolean(x !== undefined && isSymbol(x))
    ),
    'Returns true if the value is a symbol, false otherwise.',
    [['x']]
  ),

  'qualified-symbol?': withDoc(
    cljNativeFunction('qualified-symbol?', (x: CljValue) =>
      cljBoolean(x !== undefined && isSymbol(x) && x.name.includes('/'))
    ),
    'Returns true if the value is a qualified symbol, false otherwise.',
    [['x']]
  ),

  'fn?': withDoc(
    cljNativeFunction('fn?', (x: CljValue) =>
      cljBoolean(x !== undefined && isAFunction(x))
    ),
    'Returns true if the value is a function, false otherwise.',
    [['x']]
  ),

  'coll?': withDoc(
    cljNativeFunction('coll?', (x: CljValue) =>
      cljBoolean(x !== undefined && isCollection(x))
    ),
    'Returns true if the value is a collection, false otherwise.',
    [['x']]
  ),
  some: withDoc(
    cljNativeFunction('some', (pred: CljValue, coll: CljValue): CljValue => {
      if (pred === undefined || !isAFunction(pred)) {
        throw new EvaluationError(
          `some expects a function as first argument${pred !== undefined ? `, got ${printString(pred)}` : ''}`,
          { pred }
        )
      }
      if (coll === undefined) {
        return cljNil()
      }
      if (!isCollection(coll)) {
        throw new EvaluationError(
          `some expects a collection as second argument, got ${printString(coll)}`,
          { coll }
        )
      }
      for (const item of toSeq(coll)) {
        const result = applyFunction(pred, [item])
        if (isTruthy(result)) {
          return result
        }
      }
      return cljNil()
    }),
    'Returns the first truthy result of applying pred to each item in coll, or nil if no item satisfies pred.',
    [['pred', 'coll']]
  ),

  'every?': withDoc(
    cljNativeFunction('every?', (pred: CljValue, coll: CljValue): CljValue => {
      if (pred === undefined || !isAFunction(pred)) {
        throw new EvaluationError(
          `every? expects a function as first argument${pred !== undefined ? `, got ${printString(pred)}` : ''}`,
          { pred }
        )
      }
      if (coll === undefined || !isCollection(coll)) {
        throw new EvaluationError(
          `every? expects a collection as second argument${coll !== undefined ? `, got ${printString(coll)}` : ''}`,
          { coll }
        )
      }
      for (const item of toSeq(coll)) {
        if (isFalsy(applyFunction(pred, [item]))) {
          return cljBoolean(false)
        }
      }
      return cljBoolean(true)
    }),
    'Returns true if all items in coll satisfy pred, false otherwise.',
    [['pred', 'coll']]
  ),
}
