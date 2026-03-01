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
import { cljBoolean, cljNativeFunction, cljNil } from '../factories'
import { printString } from '../printer'
import { toSeq } from '../transformations'
import type { CljValue } from '../types'

export const predicateFunctions: Record<string, CljValue> = {
  'nil?': cljNativeFunction('nil?', (arg: CljValue) => {
    return cljBoolean(arg.kind === 'nil')
  }),
  'true?': cljNativeFunction('true?', (arg: CljValue) => {
    // returns true if the value is a boolean and true
    if (arg.kind !== 'boolean') {
      return cljBoolean(false)
    }
    return cljBoolean(arg.value === true)
  }),
  'false?': cljNativeFunction('false?', (arg: CljValue) => {
    // returns true if the value is a boolean and false
    if (arg.kind !== 'boolean') {
      return cljBoolean(false)
    }
    return cljBoolean(arg.value === false)
  }),
  'truthy?': cljNativeFunction('truthy?', (arg: CljValue) => {
    return cljBoolean(isTruthy(arg))
  }),
  'falsy?': cljNativeFunction('falsy?', (arg: CljValue) => {
    return cljBoolean(isFalsy(arg))
  }),
  not: cljNativeFunction('not', (arg: CljValue) => {
    return cljBoolean(!isTruthy(arg))
  }),
  'not=': cljNativeFunction('not=', (...args: CljValue[]) => {
    if (args.length < 2) {
      throw new EvaluationError('not= expects at least two arguments', {
        args,
      })
    }
    for (let i = 1; i < args.length; i++) {
      if (!isEqual(args[i], args[i - 1])) {
        return cljBoolean(true)
      }
    }
    return cljBoolean(false)
  }),
  'number?': cljNativeFunction('number?', (x: CljValue) =>
    cljBoolean(x !== undefined && x.kind === 'number')
  ),

  'string?': cljNativeFunction('string?', (x: CljValue) =>
    cljBoolean(x !== undefined && x.kind === 'string')
  ),

  'boolean?': cljNativeFunction('boolean?', (x: CljValue) =>
    cljBoolean(x !== undefined && x.kind === 'boolean')
  ),

  'vector?': cljNativeFunction('vector?', (x: CljValue) =>
    cljBoolean(x !== undefined && isVector(x))
  ),

  'list?': cljNativeFunction('list?', (x: CljValue) =>
    cljBoolean(x !== undefined && isList(x))
  ),

  'map?': cljNativeFunction('map?', (x: CljValue) =>
    cljBoolean(x !== undefined && isMap(x))
  ),

  'keyword?': cljNativeFunction('keyword?', (x: CljValue) =>
    cljBoolean(x !== undefined && isKeyword(x))
  ),

  'qualified-keyword?': cljNativeFunction('qualified-keyword?', (x: CljValue) =>
    cljBoolean(x !== undefined && isKeyword(x) && x.name.includes('/'))
  ),

  'symbol?': cljNativeFunction('symbol?', (x: CljValue) =>
    cljBoolean(x !== undefined && isSymbol(x))
  ),

  'qualified-symbol?': cljNativeFunction('qualified-symbol?', (x: CljValue) =>
    cljBoolean(x !== undefined && isSymbol(x) && x.name.includes('/'))
  ),

  'fn?': cljNativeFunction('fn?', (x: CljValue) =>
    cljBoolean(x !== undefined && isAFunction(x))
  ),

  'coll?': cljNativeFunction('coll?', (x: CljValue) =>
    cljBoolean(x !== undefined && isCollection(x))
  ),
  some: cljNativeFunction(
    'some',
    (pred: CljValue, coll: CljValue): CljValue => {
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
    }
  ),

  'every?': cljNativeFunction(
    'every?',
    (pred: CljValue, coll: CljValue): CljValue => {
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
    }
  ),
}
