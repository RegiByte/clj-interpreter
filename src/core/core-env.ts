import {
  isAFunction,
  isCollection,
  isEqual,
  isFalsy,
  isList,
  isMacro,
  isMap,
  isTruthy,
  isVector,
  isKeyword,
  isSymbol,
} from './assertions'
import { define, lookup, makeEnv } from './env'
import {
  applyFunction,
  applyMacro,
  evaluate,
  EvaluationError,
} from './evaluator'
import {
  cljBoolean,
  cljKeyword,
  cljList,
  cljMap,
  cljNativeFunction,
  cljNil,
  cljNumber,
  cljString,
  cljVector,
} from './factories'
import { printString } from './printer'
import { valueToString } from './transformations'
import {
  valueKeywords,
  type CljList,
  type CljMap,
  type CljNumber,
  type CljValue,
  type CljVector,
  type Env,
} from './types'

const toSeq = (collection: CljValue): CljValue[] => {
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

function getCoreFunctions(globalEnv: Env) {
  const nativeFunctions = {
    list: cljNativeFunction('list', (...args: CljValue[]) => {
      if (args.length === 0) {
        return cljList([])
      }
      return cljList(args)
    }),
    vector: cljNativeFunction('vector', (...args: CljValue[]) => {
      if (args.length === 0) {
        return cljVector([])
      }
      return cljVector(args)
    }),
    'hash-map': cljNativeFunction('hash-map', (...args: CljValue[]) => {
      if (args.length === 0) {
        return cljMap([])
      }
      if (args.length % 2 !== 0) {
        throw new EvaluationError(
          `hash-map expects an even number of arguments, got ${args.length}`,
          { args }
        )
      }
      const entries: [CljValue, CljValue][] = []
      for (let i = 0; i < args.length; i += 2) {
        const key = args[i]
        const value = args[i + 1]
        entries.push([key, value])
      }
      return cljMap(entries)
    }),
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
          throw new EvaluationError('division by zero', {
            args,
          })
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
          throw new EvaluationError(
            `count expects a countable value, got ${printString(countable)}`,
            { countable }
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
        if (!isEqual(args[i], args[i - 1])) {
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
      throw new EvaluationError(
        `first expects a collection, got ${printString(collection)}`,
        { collection }
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
      throw new EvaluationError(
        `rest expects a collection, got ${printString(collection)}`,
        { collection }
      )
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
            const keyIdx = newEntries.findIndex((entry) =>
              isEqual(entry[0], key)
            )
            if (keyIdx === -1) {
              newEntries.push([key, pair.value[1]])
            } else {
              newEntries[keyIdx] = [key, pair.value[1]]
            }
          }
          return cljMap([...newEntries])
        }

        throw new EvaluationError(
          `unhandled collection type, got ${printString(collection)}`,
          { collection }
        )
      }
    ),
    cons: cljNativeFunction('cons', (x: CljValue, xs: CljValue) => {
      if (!isCollection(xs)) {
        throw new EvaluationError(
          `cons expects a collection as second argument, got ${printString(xs)}`,
          { xs }
        )
      }
      if (isMap(xs)) {
        throw new EvaluationError(
          'cons on maps is not supported, use vectors instead',
          { xs }
        )
      }

      if (isList(xs)) {
        return cljList([x, ...xs.value])
      }
      if (isVector(xs)) {
        return cljVector([x, ...xs.value])
      }

      throw new EvaluationError(
        `unhandled collection type, got ${printString(xs)}`,
        { xs }
      )
    }),
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
          throw new EvaluationError(
            'assoc expects an even number of binding arguments',
            {
              args,
            }
          )
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
            const entryIdx = newEntries.findIndex((entry) =>
              isEqual(entry[0], key)
            )
            if (entryIdx === -1) {
              newEntries.push([key, value])
            } else {
              newEntries[entryIdx] = [key, value]
            }
          }
          return cljMap(newEntries)
        }
        throw new EvaluationError(
          `unhandled collection type, got ${printString(collection)}`,
          { collection }
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
            const entryIdx = newEntries.findIndex((entry) =>
              isEqual(entry[0], key)
            )
            if (entryIdx === -1) {
              return collection // not found, unchanged
            }
            newEntries.splice(entryIdx, 1)
          }
          return cljMap(newEntries)
        }
        throw new EvaluationError(
          `unhandled collection type, got ${printString(collection)}`,
          { collection }
        )
      }
    ),
    get: cljNativeFunction(
      'get',
      (target: CljValue, key: CljValue, notFound?: CljValue) => {
        const defaultValue = notFound ?? cljNil()

        switch (target.kind) {
          case valueKeywords.map: {
            const entries = target.entries
            for (const [k, v] of entries) {
              if (isEqual(k, key)) {
                return v
              }
            }
            return defaultValue
          }
          case valueKeywords.vector: {
            const values = target.value
            if (key.kind !== 'number') {
              throw new EvaluationError(
                'get on vectors expects a 0-based index as parameter',
                { key }
              )
            }
            if (key.value < 0 || key.value >= values.length) {
              return defaultValue
            }
            return values[key.value]
          }
          default:
            return defaultValue
        }
      }
    ),
    str: cljNativeFunction('str', (...args: CljValue[]) => {
      return cljString(args.map(valueToString).join(''))
    }),
    map: cljNativeFunction(
      'map',
      (
        fn: CljValue | undefined,
        collection: CljValue | undefined
      ): CljValue => {
        if (fn === undefined) {
          throw new EvaluationError(
            `map expects a function as first argument, got nil`,
            { fn }
          )
        }
        if (!isAFunction(fn)) {
          throw new EvaluationError(
            `map expects a function as first argument, got ${printString(fn)}`,
            { fn }
          )
        }
        if (collection === undefined) {
          return cljNil()
        }
        if (!isCollection(collection)) {
          throw new EvaluationError(
            `map expects a collection, got ${printString(collection)}`,
            { collection }
          )
        }

        const wrap = isVector(collection) ? cljVector : cljList
        return wrap(toSeq(collection).map((item) => applyFunction(fn, [item])))
      }
    ),
    filter: cljNativeFunction(
      'filter',
      (
        fn: CljValue | undefined,
        collection: CljValue | undefined
      ): CljValue => {
        if (fn === undefined) {
          throw new EvaluationError(
            `filter expects a function as first argument, got nil`,
            { fn }
          )
        }
        if (!isAFunction(fn)) {
          throw new EvaluationError(
            `filter expects a function as first argument, got ${printString(fn)}`,
            { fn }
          )
        }
        if (collection === undefined) {
          return cljNil()
        }
        if (!isCollection(collection)) {
          throw new EvaluationError(
            `filter expects a collection, got ${printString(collection)}`,
            { collection }
          )
        }

        const wrap = isVector(collection) ? cljVector : cljList
        return wrap(
          toSeq(collection).filter((item) =>
            isTruthy(applyFunction(fn, [item]))
          )
        )
      }
    ),
    seq: cljNativeFunction('seq', (collection: CljValue) => {
      if (collection.kind === 'nil') return cljNil()
      if (!isCollection(collection)) {
        throw new EvaluationError(
          `seq expects a collection or nil, got ${printString(collection)}`,
          { collection }
        )
      }
      const items = toSeq(collection)
      return items.length === 0 ? cljNil() : cljList(items)
    }),
    reduce: cljNativeFunction('reduce', (fn: CljValue, ...rest: CljValue[]) => {
      if (fn === undefined || !isAFunction(fn)) {
        throw new EvaluationError(
          `reduce expects a function as first argument${fn !== undefined ? `, got ${printString(fn)}` : ''}`,
          { fn }
        )
      }
      if (rest.length === 0 || rest.length > 2) {
        throw new EvaluationError(
          'reduce expects 2 or 3 arguments: (reduce f coll) or (reduce f init coll)',
          { fn }
        )
      }

      const hasInit = rest.length === 2
      const init: CljValue | undefined = hasInit ? rest[0] : undefined
      const collection = hasInit ? rest[1] : rest[0]

      if (!isCollection(collection)) {
        throw new EvaluationError(
          `reduce expects a collection, got ${printString(collection)}`,
          { collection }
        )
      }

      const items = toSeq(collection)

      if (!hasInit) {
        if (items.length === 0) {
          throw new EvaluationError(
            'reduce called on empty collection with no initial value',
            { fn }
          )
        }
        if (items.length === 1) return items[0]
        let acc = items[0]
        for (let i = 1; i < items.length; i++) {
          acc = applyFunction(fn, [acc, items[i]])
        }
        return acc
      }

      let acc = init!
      for (const item of items) {
        acc = applyFunction(fn, [acc, item])
      }
      return acc
    }),
    eval: cljNativeFunction('eval', (form: CljValue | undefined) => {
      if (form === undefined) {
        throw new EvaluationError('eval expects a form as argument', {
          form,
        })
      }
      return evaluate(form, globalEnv)
    }),
    apply: cljNativeFunction(
      'apply',
      (fn: CljValue | undefined, ...rest: CljValue[]) => {
        if (fn === undefined || !isAFunction(fn)) {
          throw new EvaluationError(
            `apply expects a function as first argument${fn !== undefined ? `, got ${printString(fn)}` : ''}`,
            { fn }
          )
        }
        if (rest.length === 0) {
          throw new EvaluationError('apply expects at least 2 arguments', {
            fn,
          })
        }
        const lastArg = rest[rest.length - 1]
        if (!isCollection(lastArg)) {
          throw new EvaluationError(
            `apply expects a collection as last argument, got ${printString(lastArg)}`,
            { lastArg }
          )
        }

        const args = [...rest.slice(0, -1), ...toSeq(lastArg)]
        return applyFunction(fn, args)
      }
    ),

    // ── Comparison gaps ──────────────────────────────────────────────────────

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

    // ── Map projections ──────────────────────────────────────────────────────

    keys: cljNativeFunction('keys', (m: CljValue) => {
      if (m === undefined || !isMap(m)) {
        throw new EvaluationError(
          `keys expects a map${m !== undefined ? `, got ${printString(m)}` : ''}`,
          { m }
        )
      }
      return cljVector(m.entries.map(([k]) => k))
    }),

    vals: cljNativeFunction('vals', (m: CljValue) => {
      if (m === undefined || !isMap(m)) {
        throw new EvaluationError(
          `vals expects a map${m !== undefined ? `, got ${printString(m)}` : ''}`,
          { m }
        )
      }
      return cljVector(m.entries.map(([, v]) => v))
    }),

    // ── Sequence slicing ─────────────────────────────────────────────────────

    nth: cljNativeFunction(
      'nth',
      (coll: CljValue, n: CljValue, notFound?: CljValue) => {
        if (coll === undefined || (!isList(coll) && !isVector(coll))) {
          throw new EvaluationError(
            `nth expects a list or vector${coll !== undefined ? `, got ${printString(coll)}` : ''}`,
            { coll }
          )
        }
        if (n === undefined || n.kind !== 'number') {
          throw new EvaluationError(
            `nth expects a number index${n !== undefined ? `, got ${printString(n)}` : ''}`,
            { n }
          )
        }
        const index = (n as CljNumber).value
        const items = coll.value
        if (index < 0 || index >= items.length) {
          if (notFound !== undefined) return notFound
          throw new EvaluationError(
            `nth index ${index} is out of bounds for collection of length ${items.length}`,
            { coll, n }
          )
        }
        return items[index]
      }
    ),

    take: cljNativeFunction('take', (n: CljValue, coll: CljValue) => {
      if (n === undefined || n.kind !== 'number') {
        throw new EvaluationError(
          `take expects a number as first argument${n !== undefined ? `, got ${printString(n)}` : ''}`,
          { n }
        )
      }
      if (coll === undefined || !isCollection(coll)) {
        throw new EvaluationError(
          `take expects a collection as second argument${coll !== undefined ? `, got ${printString(coll)}` : ''}`,
          { coll }
        )
      }
      const count = (n as CljNumber).value
      if (count <= 0) return cljList([])
      return cljList(toSeq(coll).slice(0, count))
    }),

    drop: cljNativeFunction('drop', (n: CljValue, coll: CljValue) => {
      if (n === undefined || n.kind !== 'number') {
        throw new EvaluationError(
          `drop expects a number as first argument${n !== undefined ? `, got ${printString(n)}` : ''}`,
          { n }
        )
      }
      if (coll === undefined || !isCollection(coll)) {
        throw new EvaluationError(
          `drop expects a collection as second argument${coll !== undefined ? `, got ${printString(coll)}` : ''}`,
          { coll }
        )
      }
      const count = (n as CljNumber).value
      if (count <= 0) return cljList(toSeq(coll))
      return cljList(toSeq(coll).slice(count))
    }),

    // ── Collection building ──────────────────────────────────────────────────

    concat: cljNativeFunction('concat', (...colls: CljValue[]) => {
      const result: CljValue[] = []
      for (const coll of colls) {
        if (!isCollection(coll)) {
          throw new EvaluationError(
            `concat expects collections, got ${printString(coll)}`,
            { coll }
          )
        }
        result.push(...toSeq(coll))
      }
      return cljList(result)
    }),

    into: cljNativeFunction('into', (to: CljValue, from: CljValue) => {
      if (to === undefined || !isCollection(to)) {
        throw new EvaluationError(
          `into expects a collection as first argument${to !== undefined ? `, got ${printString(to)}` : ''}`,
          { to }
        )
      }
      if (from === undefined || !isCollection(from)) {
        throw new EvaluationError(
          `into expects a collection as second argument${from !== undefined ? `, got ${printString(from)}` : ''}`,
          { from }
        )
      }
      // reduce conj semantics: destination type drives insertion order
      let acc = to
      for (const item of toSeq(from)) {
        if (isList(acc)) {
          acc = cljList([item, ...acc.value])
        } else if (isVector(acc)) {
          acc = cljVector([...acc.value, item])
        } else if (isMap(acc)) {
          const pair = item
          if (pair.kind !== 'vector' || pair.value.length !== 2) {
            throw new EvaluationError(
              `into on a map expects each source element to be a [k v] vector, got ${printString(pair)}`,
              { pair }
            )
          }
          const [k, v] = pair.value
          const newEntries: [CljValue, CljValue][] = [...acc.entries]
          const idx = newEntries.findIndex((entry) => isEqual(entry[0], k))
          if (idx === -1) {
            newEntries.push([k, v])
          } else {
            newEntries[idx] = [k, v]
          }
          acc = cljMap(newEntries)
        }
      }
      return acc
    }),

    zipmap: cljNativeFunction('zipmap', (ks: CljValue, vs: CljValue) => {
      if (ks === undefined || !isCollection(ks)) {
        throw new EvaluationError(
          `zipmap expects a collection as first argument${ks !== undefined ? `, got ${printString(ks)}` : ''}`,
          { ks }
        )
      }
      if (vs === undefined || !isCollection(vs)) {
        throw new EvaluationError(
          `zipmap expects a collection as second argument${vs !== undefined ? `, got ${printString(vs)}` : ''}`,
          { vs }
        )
      }
      const keys = toSeq(ks)
      const vals = toSeq(vs)
      const len = Math.min(keys.length, vals.length)
      const entries: [CljValue, CljValue][] = []
      for (let i = 0; i < len; i++) {
        entries.push([keys[i], vals[i]])
      }
      return cljMap(entries)
    }),

    // ── Type predicates ──────────────────────────────────────────────────────

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

    'symbol?': cljNativeFunction('symbol?', (x: CljValue) =>
      cljBoolean(x !== undefined && isSymbol(x))
    ),

    'fn?': cljNativeFunction('fn?', (x: CljValue) =>
      cljBoolean(x !== undefined && isAFunction(x))
    ),

    'coll?': cljNativeFunction('coll?', (x: CljValue) =>
      cljBoolean(x !== undefined && isCollection(x))
    ),

    // ── Macro utilities ──────────────────────────────────────────────────────

    'macroexpand-1': cljNativeFunction('macroexpand-1', (form: CljValue) => {
      if (!isList(form) || form.value.length === 0) return form
      const head = form.value[0]
      if (!isSymbol(head)) return form
      let macroValue: CljValue
      try {
        macroValue = lookup(head.name, globalEnv)
      } catch {
        return form
      }
      if (!isMacro(macroValue)) return form
      return applyMacro(macroValue, form.value.slice(1))
    }),

    macroexpand: cljNativeFunction('macroexpand', (form: CljValue) => {
      let current = form
      while (true) {
        if (!isList(current) || current.value.length === 0) return current
        const head = current.value[0]
        if (!isSymbol(head)) return current
        let macroValue: CljValue
        try {
          macroValue = lookup(head.name, globalEnv)
        } catch {
          return current
        }
        if (!isMacro(macroValue)) return current
        current = applyMacro(macroValue, current.value.slice(1))
      }
    }),

    type: cljNativeFunction('type', (x: CljValue) => {
      if (x === undefined) {
        throw new EvaluationError('type expects an argument', { x })
      }
      const kindToKeyword: Record<string, string> = {
        number: ':number',
        string: ':string',
        boolean: ':boolean',
        nil: ':nil',
        keyword: ':keyword',
        symbol: ':symbol',
        list: ':list',
        vector: ':vector',
        map: ':map',
        function: ':function',
        'native-function': ':function',
      }
      const name = kindToKeyword[x.kind]
      if (!name) {
        throw new EvaluationError(`type: unhandled kind ${x.kind}`, { x })
      }
      return cljKeyword(name)
    }),

    repeat: cljNativeFunction('repeat', (n: CljValue, x: CljValue) => {
      if (n === undefined || n.kind !== 'number') {
        // In real clojure, repeat with a single argument creates an infinite seq
        // since we don't support infinite seqs, we throw an error for now
        throw new EvaluationError(
          `repeat expects a number as first argument${n !== undefined ? `, got ${printString(n)}` : ''}`,
          { n }
        )
      }
      return cljList(Array(n.value).fill(x))
    }),
  }

  return nativeFunctions
}

export function loadCoreFunctions(env: Env, output?: (text: string) => void) {
  const coreFunctions = getCoreFunctions(env)
  for (const [key, value] of Object.entries(coreFunctions)) {
    define(key, value, env)
  }
  if (output) {
    define(
      'println',
      cljNativeFunction('println', (...args: CljValue[]) => {
        const text = args.map(valueToString).join(' ')
        output(text)
        return cljNil()
      }),
      env
    )
  }
}

export function makeCoreEnv(output?: (text: string) => void): Env {
  const env = makeEnv()
  loadCoreFunctions(env, output)
  return env
}
