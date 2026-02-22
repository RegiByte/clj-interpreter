import {
  isCollection,
  isFalsy,
  isList,
  isMap,
  isTruthy,
  isVector,
} from './assertions'
import { define, makeEnv } from './env'
import { EvaluationError } from './evaluator'
import {
  cljBoolean,
  cljList,
  cljMap,
  cljNativeFunction,
  cljNil,
  cljNumber,
  cljVector,
} from './factories'
import { printString } from './printer'
import {
  valueKeywords,
  type CljList,
  type CljMap,
  type CljNumber,
  type CljValue,
  type CljVector,
  type Env,
} from './types'

const nativeFunctions = {
  '+': cljNativeFunction('+', (...args: CljValue[]) => {
    if (args.length === 0) {
      return cljNumber(0)
    }
    if (args.some((arg) => arg.kind !== 'number')) {
      throw new Error('+ expects all arguments to be numbers')
    }
    return args.reduce((acc, arg) => {
      return cljNumber((acc as CljNumber).value + (arg as CljNumber).value)
    }, cljNumber(0))
  }),
  '-': cljNativeFunction('-', (...args: CljValue[]) => {
    if (args.length === 0) {
      throw new Error('- expects at least one argument')
    }
    if (args.some((arg) => arg.kind !== 'number')) {
      throw new Error('- expects all arguments to be numbers')
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
      throw new Error('* expects all arguments to be numbers')
    }
    return args.slice(1).reduce((acc, arg) => {
      return cljNumber((acc as CljNumber).value * (arg as CljNumber).value)
    }, args[0] as CljNumber)
  }),
  '/': cljNativeFunction('/', (...args: CljValue[]) => {
    if (args.length === 0) {
      throw new Error('/ expects at least one argument')
    }
    if (args.some((arg) => arg.kind !== 'number')) {
      throw new Error('/ expects all arguments to be numbers')
    }
    return args.slice(1).reduce((acc, arg) => {
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
  count: cljNativeFunction('count', (countable: CljValue) => {
    if (
      !(
        [
          valueKeywords.list,
          valueKeywords.vector,
          valueKeywords.map,
        ] as string[]
      ).includes(countable.kind)
    ) {
      throw new EvaluationError(
        `count expects a countable value, got ${printString(countable)}`,
        {
          countable,
        }
      )
    }

    switch (countable.kind) {
      case valueKeywords.list:
        return cljNumber((countable as CljList).value.length)
      case valueKeywords.vector:
        return cljNumber((countable as CljVector).value.length)
      case valueKeywords.map:
        return cljNumber((countable as CljMap).entries.length)
      default:
        throw new Error(
          `count expects a countable value, got ${printString(countable)}`
        )
    }
  }),
  'truthy?': cljNativeFunction('truthy?', (arg: CljValue) => {
    return cljBoolean(isTruthy(arg))
  }),
  'falsy?': cljNativeFunction('falsy?', (arg: CljValue) => {
    return cljBoolean(isFalsy(arg))
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

  'nil?': cljNativeFunction('nil?', (arg: CljValue) => {
    return cljBoolean(arg.kind === 'nil')
  }),

  not: cljNativeFunction('not', (arg: CljValue) => {
    return cljBoolean(!isTruthy(arg))
  }),

  '=': cljNativeFunction('=', (...args: CljValue[]) => {
    if (args.length < 2) {
      throw new EvaluationError('= expects at least two arguments', { args })
    }
    for (let i = 1; i < args.length; i++) {
      if (printString(args[i]) !== printString(args[i - 1])) {
        return cljBoolean(false)
      }
    }
    return cljBoolean(true)
  }),
  first: cljNativeFunction('first', (collection: CljValue) => {
    if (!isCollection(collection)) {
      throw new EvaluationError('first expects a collection', { collection })
    }
    if (isList(collection)) {
      return collection.value.length === 0 ? cljNil() : collection.value[0]
    }
    if (isVector(collection)) {
      return collection.value.length === 0 ? cljNil() : collection.value[0]
    }
    if (isMap(collection)) {
      return collection.entries.length === 0
        ? cljNil()
        : cljVector(collection.entries[0])
    }
    throw new Error(
      `first expects a collection, got ${printString(collection)}`
    )
  }),
  rest: cljNativeFunction('rest', (collection: CljValue) => {
    if (!isCollection(collection)) {
      throw new EvaluationError('rest expects a collection', { collection })
    }
    if (isList(collection)) {
      if (collection.value.length === 0) {
        return collection // return the empty list
      }
      return cljList(collection.value.slice(1))
    }
    if (isVector(collection)) {
      return cljVector(collection.value.slice(1))
    }
    if (isMap(collection)) {
      if (collection.entries.length === 0) {
        return collection // return the empty map
      }
      return cljMap(collection.entries.slice(1))
    }
    throw new Error(`rest expects a collection, got ${printString(collection)}`)
  }),
  conj: cljNativeFunction(
    'conj',
    (collection: CljValue, ...args: CljValue[]) => {
      if (!collection) {
        throw new EvaluationError(
          'conj expects a collection as first argument',
          { collection }
        )
      }
      if (args.length === 0) {
        return collection
      }
      if (!isCollection(collection)) {
        throw new EvaluationError(
          `conj expects a collection, got ${printString(collection)}`,
          { collection }
        )
      }
      if (isList(collection)) {
        const newItems = [] as CljValue[]
        for (let i = args.length - 1; i >= 0; i--) {
          newItems.push(args[i])
        }
        return cljList([...newItems, ...collection.value])
      }
      if (isVector(collection)) {
        return cljVector([...collection.value, ...args])
      }
      if (isMap(collection)) {
        // each argument should be a vector key-pair
        const newEntries: [CljValue, CljValue][] = [...collection.entries]
        for (let i = 0; i < args.length; i += 1) {
          const pair = args[i] as CljVector

          if (pair.kind !== 'vector') {
            throw new EvaluationError(
              `conj on maps expects each argument to be a vector key-pair for maps, got ${printString(pair)}`,
              { pair }
            )
          }
          if (pair.value.length !== 2) {
            throw new EvaluationError(
              `conj on maps expects each argument to be a vector key-pair for maps, got ${printString(pair)}`,
              { pair }
            )
          }
          const key = pair.value[0]
          const keyIdx = newEntries.findIndex(
            (entry) => printString(entry[0]) === printString(key)
          )
          if (keyIdx === -1) {
            newEntries.push([key, pair.value[1]])
          } else {
            newEntries[keyIdx] = [key, pair.value[1]]
          }
        }
        return cljMap([...newEntries])
      }

      throw new Error(
        `unhandled collection type, got ${printString(collection)}`
      )
    }
  ),
  assoc: cljNativeFunction(
    'assoc',
    (collection: CljValue, ...args: CljValue[]) => {
      if (!collection) {
        throw new EvaluationError(
          'assoc expects a collection as first argument',
          { collection }
        )
      }
      if (isList(collection)) {
        throw new EvaluationError(
          'assoc on lists is not supported, use vectors instead',
          { collection }
        )
      }
      if (!isCollection(collection)) {
        throw new EvaluationError(
          `assoc expects a collection, got ${printString(collection)}`,
          { collection }
        )
      }
      if (args.length < 2) {
        throw new EvaluationError('assoc expects at least two arguments', {
          args,
        })
      }
      if (args.length % 2 !== 0) {
        throw new EvaluationError('assoc expects an even number of binding arguments', {
          args,
        })
      }
      if (isVector(collection)) {
        const newValues = [...collection.value]
        for (let i = 0; i < args.length; i += 2) {
          const index = args[i]
          if (index.kind !== 'number') {
            throw new EvaluationError(
              `assoc on vectors expects each key argument to be a index (number), got ${printString(index)}`,
              { index }
            )
          }
          if (index.value > newValues.length) {
            throw new EvaluationError(
              `assoc index ${index.value} is out of bounds for vector of length ${newValues.length}`,
              { index, collection }
            )
          }
          newValues[(index as CljNumber).value] = args[i + 1]
        }
        return cljVector(newValues)
      }
      if (isMap(collection)) {
        const newEntries: [CljValue, CljValue][] = [...collection.entries]
        // need to find the entry with the same key and replace it, if it doesn't exist, add it
        for (let i = 0; i < args.length; i += 2) {
          const key = args[i]
          const value = args[i + 1]
          const entryIdx = newEntries.findIndex(
            (entry) => printString(entry[0]) === printString(key)
          )
          if (entryIdx === -1) {
            newEntries.push([key, value])
          } else {
            newEntries[entryIdx] = [key, value]
          }
        }
        return cljMap(newEntries)
      }
      throw new Error(
        `unhandled collection type, got ${printString(collection)}`
      )
    }
  ),
  dissoc: cljNativeFunction(
    'dissoc',
    (collection: CljValue, ...args: CljValue[]) => {
      if (!collection) {
        throw new EvaluationError(
          'dissoc expects a collection as first argument',
          { collection }
        )
      }
      if (isList(collection)) {
        throw new EvaluationError(
          'dissoc on lists is not supported, use vectors instead',
          { collection }
        )
      }
      if (!isCollection(collection)) {
        throw new EvaluationError(
          `dissoc expects a collection, got ${printString(collection)}`,
          { collection }
        )
      }
      if (isVector(collection)) {
        if (collection.value.length === 0) {
          return collection // return the empty vector
        }
        const newValues = [...collection.value]
        for (let i = 0; i < args.length; i += 1) {
          const index = args[i]
          if (index.kind !== 'number') {
            throw new EvaluationError(
              `dissoc on vectors expects each key argument to be a index (number), got ${printString(index)}`,
              { index }
            )
          }
          if (index.value >= newValues.length) {
            throw new EvaluationError(
              `dissoc index ${index.value} is out of bounds for vector of length ${newValues.length}`,
              { index, collection }
            )
          }
          newValues.splice(index.value, 1)
        }
        return cljVector(newValues)
      }
      if (isMap(collection)) {
        if (collection.entries.length === 0) {
          return collection // return the empty map
        }
        const newEntries: [CljValue, CljValue][] = [...collection.entries]
        for (let i = 0; i < args.length; i += 1) {
          const key = args[i]
          const entryIdx = newEntries.findIndex(
            (entry) => printString(entry[0]) === printString(key)
          )
          if (entryIdx === -1) {
            return collection // not found, unchanged
          }
          newEntries.splice(entryIdx, 1)
        }
        return cljMap(newEntries)
      }
      throw new Error(
        `unhandled collection type, got ${printString(collection)}`
      )
    }
  ),
}

export function makeCoreEnv(): Env {
  const env = makeEnv()
  for (const [key, value] of Object.entries(nativeFunctions)) {
    define(key, value, env)
  }
  return env
}
