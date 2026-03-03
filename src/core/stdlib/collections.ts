// Collections: list, vector, hash-map, first, rest, seq, cons, conj, count,
// nth, get, assoc, dissoc, keys, vals, take, drop, concat, into, zipmap,
// last, reverse, empty?, repeat, range

import { isCollection, isEqual, isList, isMap, isVector } from '../assertions'
import { EvaluationError } from '../errors'
import {
  cljBoolean,
  cljList,
  cljMap,
  cljNativeFunction,
  cljNil,
  cljNumber,
  cljVector,
  withDoc,
} from '../factories'
import { printString } from '../printer'
import { toSeq } from '../transformations'
import {
  valueKeywords,
  type CljList,
  type CljMap,
  type CljNumber,
  type CljString,
  type CljValue,
  type CljVector,
} from '../types'

export const collectionFunctions: Record<string, CljValue> = {
  list: withDoc(
    cljNativeFunction('list', (...args: CljValue[]) => {
      if (args.length === 0) {
        return cljList([])
      }
      return cljList(args)
    }),
    'Returns a new list containing the given values.',
    [['&', 'args']]
  ),
  vector: withDoc(
    cljNativeFunction('vector', (...args: CljValue[]) => {
      if (args.length === 0) {
        return cljVector([])
      }
      return cljVector(args)
    }),
    'Returns a new vector containing the given values.',
    [['&', 'args']]
  ),
  'hash-map': withDoc(
    cljNativeFunction('hash-map', (...kvals: CljValue[]) => {
      if (kvals.length === 0) {
        return cljMap([])
      }
      if (kvals.length % 2 !== 0) {
        throw new EvaluationError(
          `hash-map expects an even number of arguments, got ${kvals.length}`,
          { args: kvals }
        )
      }
      const entries: [CljValue, CljValue][] = []
      for (let i = 0; i < kvals.length; i += 2) {
        const key = kvals[i]
        const value = kvals[i + 1]
        entries.push([key, value])
      }
      return cljMap(entries)
    }),
    'Returns a new hash-map containing the given key-value pairs.',
    [['&', 'kvals']]
  ),
  seq: withDoc(
    cljNativeFunction('seq', (coll: CljValue) => {
      if (coll.kind === 'nil') return cljNil()
      if (!isCollection(coll)) {
        throw new EvaluationError(
          `seq expects a collection or nil, got ${printString(coll)}`,
          { collection: coll }
        )
      }
      const items = toSeq(coll)
      return items.length === 0 ? cljNil() : cljList(items)
    }),
    'Returns a sequence of the given collection.',
    [['coll']]
  ),
  first: withDoc(
    cljNativeFunction('first', (collection: CljValue) => {
      if (!isCollection(collection)) {
        throw new EvaluationError('first expects a collection', { collection })
      }
      const entries = toSeq(collection)
      return entries.length === 0 ? cljNil() : entries[0]
    }),
    'Returns the first element of the given collection.',
    [['coll']]
  ),
  rest: withDoc(
    cljNativeFunction('rest', (collection: CljValue) => {
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
    'Returns a sequence of the given collection excluding the first element.',
    [['coll']]
  ),
  conj: withDoc(
    cljNativeFunction('conj', (collection: CljValue, ...args: CljValue[]) => {
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
          const keyIdx = newEntries.findIndex((entry) => isEqual(entry[0], key))
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
    }),
    'Appends args to the given collection. Lists append in reverse order to the head, vectors append to the tail.',
    [['collection', '&', 'args']]
  ),
  cons: withDoc(
    cljNativeFunction('cons', (x: CljValue, xs: CljValue) => {
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

      const wrap = isList(xs) ? cljList : cljVector
      const newItems = [x, ...xs.value]

      return wrap(newItems)
    }),
    'Returns a new collection with x prepended to the head of xs.',
    [['x', 'xs']]
  ),
  assoc: withDoc(
    cljNativeFunction('assoc', (collection: CljValue, ...args: CljValue[]) => {
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
    }),
    'Associates the value val with the key k in collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the new value at index k.',
    [['collection', '&', 'kvals']]
  ),
  dissoc: withDoc(
    cljNativeFunction('dissoc', (collection: CljValue, ...args: CljValue[]) => {
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
    }),
    'Dissociates the key k from collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the value at index k removed.',
    [['collection', '&', 'keys']]
  ),
  get: withDoc(
    cljNativeFunction(
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
    'Returns the value associated with key in target. If target is a map, returns the value associated with key, otherwise returns the value at index key in target. If not-found is provided, it is returned if the key is not found, otherwise nil is returned.',
    [
      ['target', 'key'],
      ['target', 'key', 'not-found'],
    ]
  ),
  nth: withDoc(
    cljNativeFunction(
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
    'Returns the nth element of the given collection. If not-found is provided, it is returned if the index is out of bounds, otherwise an error is thrown.',
    [['coll', 'n', 'not-found']]
  ),

  // take: cljNativeFunction('take', (n: CljValue, coll: CljValue) => {
  //   if (n === undefined || n.kind !== 'number') {
  //     throw new EvaluationError(
  //       `take expects a number as first argument${n !== undefined ? `, got ${printString(n)}` : ''}`,
  //       { n }
  //     )
  //   }
  //   if (coll === undefined || !isCollection(coll)) {
  //     throw new EvaluationError(
  //       `take expects a collection as second argument${coll !== undefined ? `, got ${printString(coll)}` : ''}`,
  //       { coll }
  //     )
  //   }
  //   const count = (n as CljNumber).value
  //   if (count <= 0) return cljList([])
  //   return cljList(toSeq(coll).slice(0, count))
  // }),

  // drop: cljNativeFunction('drop', (n: CljValue, coll: CljValue) => {
  //   if (n === undefined || n.kind !== 'number') {
  //     throw new EvaluationError(
  //       `drop expects a number as first argument${n !== undefined ? `, got ${printString(n)}` : ''}`,
  //       { n }
  //     )
  //   }
  //   if (coll === undefined || !isCollection(coll)) {
  //     throw new EvaluationError(
  //       `drop expects a collection as second argument${coll !== undefined ? `, got ${printString(coll)}` : ''}`,
  //       { coll }
  //     )
  //   }
  //   const count = (n as CljNumber).value
  //   if (count <= 0) return cljList(toSeq(coll))
  //   return cljList(toSeq(coll).slice(count))
  // }),

  // ── Collection building ──────────────────────────────────────────────────

  concat: withDoc(
    cljNativeFunction('concat', (...colls: CljValue[]) => {
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
    'Returns a new sequence that is the concatenation of the given sequences.',
    [['&', 'colls']]
  ),

  // into: cljNativeFunction('into', (to: CljValue, from: CljValue) => {
  //   if (to === undefined || !isCollection(to)) {
  //     throw new EvaluationError(
  //       `into expects a collection as first argument${to !== undefined ? `, got ${printString(to)}` : ''}`,
  //       { to }
  //     )
  //   }
  //   if (from === undefined || !isCollection(from)) {
  //     throw new EvaluationError(
  //       `into expects a collection as second argument${from !== undefined ? `, got ${printString(from)}` : ''}`,
  //       { from }
  //     )
  //   }
  //   // reduce conj semantics: destination type drives insertion order
  //   let acc = to
  //   for (const item of toSeq(from)) {
  //     if (isList(acc)) {
  //       acc = cljList([item, ...acc.value])
  //     } else if (isVector(acc)) {
  //       acc = cljVector([...acc.value, item])
  //     } else if (isMap(acc)) {
  //       const pair = item
  //       if (pair.kind !== 'vector' || pair.value.length !== 2) {
  //         throw new EvaluationError(
  //           `into on a map expects each source element to be a [k v] vector, got ${printString(pair)}`,
  //           { pair }
  //         )
  //       }
  //       const [k, v] = pair.value
  //       const newEntries: [CljValue, CljValue][] = [...acc.entries]
  //       const idx = newEntries.findIndex((entry) => isEqual(entry[0], k))
  //       if (idx === -1) {
  //         newEntries.push([k, v])
  //       } else {
  //         newEntries[idx] = [k, v]
  //       }
  //       acc = cljMap(newEntries)
  //     }
  //   }
  //   return acc
  // }),

  zipmap: withDoc(
    cljNativeFunction('zipmap', (ks: CljValue, vs: CljValue) => {
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
    'Returns a new map with the keys and values of the given collections.',
    [['ks', 'vs']]
  ),
  last: withDoc(
    cljNativeFunction('last', (coll: CljValue) => {
      if (coll === undefined || (!isList(coll) && !isVector(coll))) {
        throw new EvaluationError(
          `last expects a list or vector${coll !== undefined ? `, got ${printString(coll)}` : ''}`,
          { coll }
        )
      }
      const items = coll.value
      return items.length === 0 ? cljNil() : items[items.length - 1]
    }),
    'Returns the last element of the given collection.',
    [['coll']]
  ),

  reverse: withDoc(
    cljNativeFunction('reverse', (coll: CljValue) => {
      if (coll === undefined || (!isList(coll) && !isVector(coll))) {
        throw new EvaluationError(
          `reverse expects a list or vector${coll !== undefined ? `, got ${printString(coll)}` : ''}`,
          { coll }
        )
      }
      return cljList([...coll.value].reverse())
    }),
    'Returns a new sequence with the elements of the given collection in reverse order.',
    [['coll']]
  ),

  'empty?': withDoc(
    cljNativeFunction('empty?', (coll: CljValue) => {
      if (coll === undefined || !isCollection(coll)) {
        throw new EvaluationError(
          `empty? expects a collection${coll !== undefined ? `, got ${printString(coll)}` : ''}`,
          { coll }
        )
      }
      return cljBoolean(toSeq(coll).length === 0)
    }),
    'Returns true if the given collection is empty, false otherwise.',
    [['coll']]
  ),

  repeat: withDoc(
    cljNativeFunction('repeat', (n: CljValue, x: CljValue) => {
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
    'Returns a sequence of n copies of x.',
    [['n', 'x']]
  ),

  // ── Range ────────────────────────────────────────────────────────────────

  range: withDoc(
    cljNativeFunction('range', (...args: CljValue[]) => {
      if (args.length === 0 || args.length > 3) {
        throw new EvaluationError(
          'range expects 1, 2, or 3 arguments: (range n), (range start end), or (range start end step)',
          { args }
        )
      }
      if (args.some((a) => a.kind !== 'number')) {
        throw new EvaluationError('range expects number arguments', { args })
      }
      let start: number
      let end: number
      let step: number
      if (args.length === 1) {
        start = 0
        end = (args[0] as CljNumber).value
        step = 1
      } else if (args.length === 2) {
        start = (args[0] as CljNumber).value
        end = (args[1] as CljNumber).value
        step = 1
      } else {
        start = (args[0] as CljNumber).value
        end = (args[1] as CljNumber).value
        step = (args[2] as CljNumber).value
      }
      if (step === 0) {
        throw new EvaluationError('range step cannot be zero', { args })
      }
      const result: CljValue[] = []
      if (step > 0) {
        for (let i = start; i < end; i += step) {
          result.push(cljNumber(i))
        }
      } else {
        for (let i = start; i > end; i += step) {
          result.push(cljNumber(i))
        }
      }
      return cljList(result)
    }),
    'Returns a sequence of numbers from start (inclusive) to end (exclusive), incrementing by step. If step is positive, the sequence is generated from start to end, otherwise it is generated from end to start.',
    [['n'], ['start', 'end'], ['start', 'end', 'step']]
  ),
  keys: withDoc(
    cljNativeFunction('keys', (m: CljValue) => {
      if (m === undefined || !isMap(m)) {
        throw new EvaluationError(
          `keys expects a map${m !== undefined ? `, got ${printString(m)}` : ''}`,
          { m }
        )
      }
      return cljVector(m.entries.map(([k]) => k))
    }),
    'Returns a vector of the keys of the given map.',
    [['m']]
  ),
  vals: withDoc(
    cljNativeFunction('vals', (m: CljValue) => {
      if (m === undefined || !isMap(m)) {
        throw new EvaluationError(
          `vals expects a map${m !== undefined ? `, got ${printString(m)}` : ''}`,
          { m }
        )
      }
      return cljVector(m.entries.map(([, v]) => v))
    }),
    'Returns a vector of the values of the given map.',
    [['m']]
  ),
  count: withDoc(
    cljNativeFunction('count', (countable: CljValue) => {
      if (
        !(
          [
            valueKeywords.list,
            valueKeywords.vector,
            valueKeywords.map,
            valueKeywords.string,
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
        case valueKeywords.string:
          return cljNumber((countable as CljString).value.length)
        default:
          throw new EvaluationError(
            `count expects a countable value, got ${printString(countable)}`,
            { countable }
          )
      }
    }),
    'Returns the number of elements in the given countable value.',
    [['countable']]
  ),
}
