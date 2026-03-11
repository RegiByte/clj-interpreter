// Collections: list, vector, hash-map, first, rest, seq, cons, conj, count,
// nth, get, assoc, dissoc, keys, vals, zipmap,
// last, reverse, empty?, repeat*, range*, vec, subvec, peek, pop, empty

import {
  isCollection,
  isCons,
  isEqual,
  isLazySeq,
  isList,
  isMap,
  isNil,
  isSeqable,
  isSet,
  isVector,
} from '../assertions'
import { EvaluationError } from '../errors'
import {
  cljBoolean,
  cljCons,
  cljList,
  cljMap,
  cljNil,
  cljNumber,
  cljSet,
  cljVector,
  v,
} from '../factories'
import { printString } from '../printer'
import { realizeLazySeq, toSeq } from '../transformations'
import {
  valueKeywords,
  type CljList,
  type CljMap,
  type CljNumber,
  type CljSet,
  type CljString,
  type CljValue,
  type CljVector,
} from '../types'

export const collectionFunctions: Record<string, CljValue> = {
  list: v.nativeFn('list', function listImpl(...args: CljValue[]) {
    if (args.length === 0) {
      return cljList([])
    }
    return cljList(args)
  }).doc(
    'Returns a new list containing the given values.',
    [['&', 'args']]
  ),
  vector: v.nativeFn('vector', function vectorImpl(...args: CljValue[]) {
    if (args.length === 0) {
      return cljVector([])
    }
    return cljVector(args)
  }).doc(
    'Returns a new vector containing the given values.',
    [['&', 'args']]
  ),
  'hash-map': v.nativeFn('hash-map', function hashMapImpl(...kvals: CljValue[]) {
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
  }).doc(
    'Returns a new hash-map containing the given key-value pairs.',
    [['&', 'kvals']]
  ),
  seq: v.nativeFn('seq', function seqImpl(coll: CljValue): CljValue {
    if (coll.kind === 'nil') return cljNil()
    if (isLazySeq(coll)) {
      const realized = realizeLazySeq(coll)
      if (isNil(realized)) return cljNil()
      return seqImpl(realized)
    }
    if (isCons(coll)) return coll
    if (!isSeqable(coll)) {
      throw EvaluationError.atArg(`seq expects a collection, string, or nil, got ${printString(coll)}`, { collection: coll }, 0)
    }
    const items = toSeq(coll)
    return items.length === 0 ? cljNil() : cljList(items)
  }).doc(
    'Returns a sequence of the given collection or string. Strings yield a sequence of single-character strings.',
    [['coll']]
  ),
  first: v.nativeFn('first', function firstImpl(collection: CljValue): CljValue {
    if (collection.kind === 'nil') return cljNil()
    if (isLazySeq(collection)) {
      const realized = realizeLazySeq(collection)
      if (isNil(realized)) return cljNil()
      return firstImpl(realized)
    }
    if (isCons(collection)) return collection.head
    if (!isSeqable(collection)) {
      throw EvaluationError.atArg('first expects a collection or string', { collection }, 0)
    }
    const entries = toSeq(collection)
    return entries.length === 0 ? cljNil() : entries[0]
  }).doc(
    'Returns the first element of the given collection or string.',
    [['coll']]
  ),
  rest: v.nativeFn('rest', function restImpl(collection: CljValue): CljValue {
    if (collection.kind === 'nil') return cljList([])
    if (isLazySeq(collection)) {
      const realized = realizeLazySeq(collection)
      if (isNil(realized)) return cljList([])
      return restImpl(realized)
    }
    if (isCons(collection)) return collection.tail
    if (!isSeqable(collection)) {
      throw EvaluationError.atArg('rest expects a collection or string', { collection }, 0)
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
    if (collection.kind === 'string') {
      const chars = toSeq(collection)
      return cljList(chars.slice(1))
    }
    throw EvaluationError.atArg(`rest expects a collection or string, got ${printString(collection)}`, { collection }, 0)
  }).doc(
    'Returns a sequence of the given collection or string excluding the first element.',
    [['coll']]
  ),
  conj: v.nativeFn('conj', function conjImpl(collection: CljValue, ...args: CljValue[]) {
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
      throw EvaluationError.atArg(`conj expects a collection, got ${printString(collection)}`, { collection }, 0)
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
        // pair args start at index 1 in the call (collection is index 0)
        const pairArgIndex = i + 1

        if (pair.kind !== 'vector') {
          throw EvaluationError.atArg(
            `conj on maps expects each argument to be a vector key-pair for maps, got ${printString(pair)}`,
            { pair },
            pairArgIndex
          )
        }
        if (pair.value.length !== 2) {
          throw EvaluationError.atArg(
            `conj on maps expects each argument to be a vector key-pair for maps, got ${printString(pair)}`,
            { pair },
            pairArgIndex
          )
        }
        const key = pair.value[0]
        const keyIdx = newEntries.findIndex(function findKeyEntry(entry) {
          return isEqual(entry[0], key)
        })
        if (keyIdx === -1) {
          newEntries.push([key, pair.value[1]])
        } else {
          newEntries[keyIdx] = [key, pair.value[1]]
        }
      }
      return cljMap([...newEntries])
    }

    if (isSet(collection)) {
      const newValues = [...collection.values]
      for (const v of args) {
        if (!newValues.some(existing => isEqual(existing, v))) {
          newValues.push(v)
        }
      }
      return cljSet(newValues)
    }

    throw new EvaluationError(
      `unhandled collection type, got ${printString(collection)}`,
      { collection }
    )
  }).doc(
    'Appends args to the given collection. Lists append in reverse order to the head, vectors append to the tail, sets add unique elements.',
    [['collection', '&', 'args']]
  ),
  cons: v.nativeFn('cons', function consImpl(x: CljValue, xs: CljValue) {
    // When tail is lazy-seq or cons, create a cons cell to preserve laziness
    if (isLazySeq(xs) || isCons(xs)) {
      return cljCons(x, xs)
    }
    if (isNil(xs)) {
      return cljList([x])
    }
    if (!isCollection(xs)) {
      throw EvaluationError.atArg(`cons expects a collection as second argument, got ${printString(xs)}`, { xs }, 1)
    }
    if (isMap(xs) || isSet(xs)) {
      throw EvaluationError.atArg('cons on maps and sets is not supported, use vectors instead', { xs }, 1)
    }

    const wrap = isList(xs) ? cljList : cljVector
    const newItems = [x, ...xs.value]

    return wrap(newItems)
  }).doc(
    'Returns a new collection with x prepended to the head of xs.',
    [['x', 'xs']]
  ),
  assoc: v.nativeFn('assoc', function assocImpl(collection: CljValue, ...args: CljValue[]) {
    if (!collection) {
      throw new EvaluationError(
        'assoc expects a collection as first argument',
        { collection }
      )
    }
    // nil is treated as an empty map, matching Clojure: (assoc nil :k v) => {:k v}
    if (isNil(collection)) {
      collection = cljMap([])
    }
    if (isList(collection)) {
      throw new EvaluationError(
        'assoc on lists is not supported, use vectors instead',
        { collection }
      )
    }
    if (!isCollection(collection)) {
      throw EvaluationError.atArg(`assoc expects a collection, got ${printString(collection)}`, { collection }, 0)
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
          throw EvaluationError.atArg(
            `assoc on vectors expects each key argument to be a index (number), got ${printString(index)}`,
            { index },
            i + 1
          )
        }
        if (index.value > newValues.length) {
          throw EvaluationError.atArg(
            `assoc index ${index.value} is out of bounds for vector of length ${newValues.length}`,
            { index, collection },
            i + 1
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
        const entryIdx = newEntries.findIndex(function findEntryByKey(entry) {
          return isEqual(entry[0], key)
        })
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
  }).doc(
    'Associates the value val with the key k in collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the new value at index k.',
    [['collection', '&', 'kvals']]
  ),
  dissoc: v.nativeFn('dissoc', function dissocImpl(collection: CljValue, ...args: CljValue[]) {
    if (!collection) {
      throw new EvaluationError(
        'dissoc expects a collection as first argument',
        { collection }
      )
    }
    if (isList(collection)) {
      throw EvaluationError.atArg('dissoc on lists is not supported, use vectors instead', { collection }, 0)
    }
    if (!isCollection(collection)) {
      throw EvaluationError.atArg(`dissoc expects a collection, got ${printString(collection)}`, { collection }, 0)
    }
    if (isVector(collection)) {
      if (collection.value.length === 0) {
        return collection // return the empty vector
      }
      const newValues = [...collection.value]
      for (let i = 0; i < args.length; i += 1) {
        const index = args[i]
        if (index.kind !== 'number') {
          throw EvaluationError.atArg(
            `dissoc on vectors expects each key argument to be a index (number), got ${printString(index)}`,
            { index },
            i + 1
          )
        }
        if (index.value >= newValues.length) {
          throw EvaluationError.atArg(
            `dissoc index ${index.value} is out of bounds for vector of length ${newValues.length}`,
            { index, collection },
            i + 1
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
        const entryIdx = newEntries.findIndex(function findEntryByKey(entry) {
          return isEqual(entry[0], key)
        })
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
  }).doc(
    'Dissociates the key k from collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the value at index k removed.',
    [['collection', '&', 'keys']]
  ),
  get: v.nativeFn(
    'get',
    function getImpl(target: CljValue, key: CljValue, notFound?: CljValue) {
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
  ).doc(
    'Returns the value associated with key in target. If target is a map, returns the value associated with key, otherwise returns the value at index key in target. If not-found is provided, it is returned if the key is not found, otherwise nil is returned.',
    [
      ['target', 'key'],
      ['target', 'key', 'not-found'],
    ]
  ),
  nth: v.nativeFn(
    'nth',
    function nthImpl(coll: CljValue, n: CljValue, notFound?: CljValue) {
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
        const err = new EvaluationError(
          `nth index ${index} is out of bounds for collection of length ${items.length}`,
          { coll, n }
        )
        err.data = { argIndex: 1 }
        throw err
      }
      return items[index]
    }
  ).doc(
    'Returns the nth element of the given collection. If not-found is provided, it is returned if the index is out of bounds, otherwise an error is thrown.',
    [['coll', 'n', 'not-found']]
  ),


  zipmap: v.nativeFn('zipmap', function zipmapImpl(ks: CljValue, vs: CljValue) {
    if (ks === undefined || !isSeqable(ks)) {
      throw new EvaluationError(
        `zipmap expects a collection or string as first argument${ks !== undefined ? `, got ${printString(ks)}` : ''}`,
        { ks }
      )
    }
    if (vs === undefined || !isSeqable(vs)) {
      throw new EvaluationError(
        `zipmap expects a collection or string as second argument${vs !== undefined ? `, got ${printString(vs)}` : ''}`,
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
  }).doc(
    'Returns a new map with the keys and values of the given collections.',
    [['ks', 'vs']]
  ),
  last: v.nativeFn('last', function lastImpl(coll: CljValue) {
    if (coll === undefined || (!isList(coll) && !isVector(coll))) {
      throw new EvaluationError(
        `last expects a list or vector${coll !== undefined ? `, got ${printString(coll)}` : ''}`,
        { coll }
      )
    }
    const items = coll.value
    return items.length === 0 ? cljNil() : items[items.length - 1]
  }).doc(
    'Returns the last element of the given collection.',
    [['coll']]
  ),

  reverse: v.nativeFn('reverse', function reverseImpl(coll: CljValue) {
    if (coll === undefined || (!isList(coll) && !isVector(coll))) {
      throw EvaluationError.atArg(`reverse expects a list or vector${coll !== undefined ? `, got ${printString(coll)}` : ''}`, { coll }, 0)
    }
    return cljList([...coll.value].reverse())
  }).doc(
    'Returns a new sequence with the elements of the given collection in reverse order.',
    [['coll']]
  ),

  'empty?': v.nativeFn('empty?', function emptyPredImpl(coll: CljValue) {
    if (coll === undefined) {
      throw EvaluationError.atArg('empty? expects one argument', {}, 0)
    }
    // nil and empty string count as empty, matching Clojure semantics
    if (coll.kind === 'nil') return cljBoolean(true)
    if (!isSeqable(coll)) {
      throw EvaluationError.atArg(`empty? expects a collection, string, or nil, got ${printString(coll)}`, { coll }, 0)
    }
    return cljBoolean(toSeq(coll).length === 0)
  }).doc(
    'Returns true if coll has no items. Accepts collections, strings, and nil.',
    [['coll']]
  ),

  'contains?': v.nativeFn('contains?', function containsPredImpl(coll: CljValue, key: CljValue) {
    if (coll === undefined) {
      throw EvaluationError.atArg('contains? expects a collection as first argument', {}, 0)
    }
    if (key === undefined) {
      throw EvaluationError.atArg('contains? expects a key as second argument', {}, 1)
    }
    if (coll.kind === 'nil') return cljBoolean(false)
    if (isMap(coll)) {
      return cljBoolean(coll.entries.some(function checkKeyMatch([k]) {
        return isEqual(k, key)
      }))
    }
    if (isVector(coll)) {
      if (key.kind !== 'number') return cljBoolean(false)
      return cljBoolean(key.value >= 0 && key.value < coll.value.length)
    }
    if (isSet(coll)) {
      return cljBoolean(coll.values.some(v => isEqual(v, key)))
    }
    throw EvaluationError.atArg(`contains? expects a map, set, vector, or nil, got ${printString(coll)}`, { coll }, 0)
  }).doc(
    'Returns true if key is present in coll. For maps checks key existence (including keys with nil values). For vectors checks index bounds.',
    [['coll', 'key']]
  ),

  'repeat*': v.nativeFn('repeat*', function repeatImpl(n: CljValue, x: CljValue) {
    if (n === undefined || n.kind !== 'number') {
      throw EvaluationError.atArg(`repeat expects a number as first argument${n !== undefined ? `, got ${printString(n)}` : ''}`, { n }, 0)
    }
    return cljList(Array(n.value).fill(x))
  }).doc(
    'Returns a finite sequence of n copies of x (native helper).',
    [['n', 'x']]
  ),

  // ── Range ────────────────────────────────────────────────────────────────

  'range*': v.nativeFn('range*', function rangeImpl(...args: CljValue[]) {
    if (args.length === 0 || args.length > 3) {
      throw new EvaluationError(
        'range expects 1, 2, or 3 arguments: (range n), (range start end), or (range start end step)',
        { args }
      )
    }
    const badIdx = args.findIndex(function checkIsNumber(a) {
      return a.kind !== 'number'
    })
    if (badIdx !== -1) {
      throw EvaluationError.atArg('range expects number arguments', { args }, badIdx)
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
      // step is always the last arg: index args.length - 1
      throw EvaluationError.atArg('range step cannot be zero', { args }, args.length - 1)
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
  }).doc(
    'Returns a finite sequence of numbers (native helper).',
    [['n'], ['start', 'end'], ['start', 'end', 'step']]
  ),
  keys: v.nativeFn('keys', function keysImpl(m: CljValue) {
    if (m === undefined || !isMap(m)) {
      throw EvaluationError.atArg(`keys expects a map${m !== undefined ? `, got ${printString(m)}` : ''}`, { m }, 0)
    }
    return cljVector(m.entries.map(function extractKey([k]) {
      return k
    }))
  }).doc(
    'Returns a vector of the keys of the given map.',
    [['m']]
  ),
  vals: v.nativeFn('vals', function valsImpl(m: CljValue) {
    if (m === undefined || !isMap(m)) {
      throw EvaluationError.atArg(`vals expects a map${m !== undefined ? `, got ${printString(m)}` : ''}`, { m }, 0)
    }
    return cljVector(m.entries.map(function extractVal([, v]) {
      return v
    }))
  }).doc(
    'Returns a vector of the values of the given map.',
    [['m']]
  ),
  count: v.nativeFn('count', function countImpl(countable: CljValue) {
    if (countable.kind === 'nil') return cljNumber(0)
    if (isLazySeq(countable) || isCons(countable)) {
      return cljNumber(toSeq(countable).length)
    }
    if (
      !(
        [
          valueKeywords.list,
          valueKeywords.vector,
          valueKeywords.map,
          valueKeywords.set,
          valueKeywords.string,
        ] as string[]
      ).includes(countable.kind)
    ) {
      throw EvaluationError.atArg(`count expects a countable value, got ${printString(countable)}`, { countable }, 0)
    }

    switch (countable.kind) {
      case valueKeywords.list:
        return cljNumber((countable as CljList).value.length)
      case valueKeywords.vector:
        return cljNumber((countable as CljVector).value.length)
      case valueKeywords.map:
        return cljNumber((countable as CljMap).entries.length)
      case valueKeywords.set:
        return cljNumber((countable as CljSet).values.length)
      case valueKeywords.string:
        return cljNumber((countable as CljString).value.length)
      default:
        throw new EvaluationError(
          `count expects a countable value, got ${printString(countable)}`,
          { countable }
        )
    }
  }).doc(
    'Returns the number of elements in the given countable value.',
    [['countable']]
  ),

  'hash-set': v.nativeFn('hash-set', function hashSetImpl(...args: CljValue[]) {
    const deduped: CljValue[] = []
    for (const v of args) {
      if (!deduped.some(existing => isEqual(existing, v))) {
        deduped.push(v)
      }
    }
    return cljSet(deduped)
  }).doc(
    'Returns a set containing the given values.',
    [['&', 'xs']]
  ),

  set: v.nativeFn('set', function setImpl(coll: CljValue) {
    if (coll === undefined || coll.kind === 'nil') return cljSet([])
    const items = toSeq(coll)
    const deduped: CljValue[] = []
    for (const v of items) {
      if (!deduped.some(existing => isEqual(existing, v))) {
        deduped.push(v)
      }
    }
    return cljSet(deduped)
  }).doc(
    'Returns a set of the distinct elements of the given collection.',
    [['coll']]
  ),

  'set?': v.nativeFn('set?', function setPredicateImpl(x: CljValue) {
    return cljBoolean(x !== undefined && x.kind === 'set')
  }).doc(
    'Returns true if x is a set.',
    [['x']]
  ),

  disj: v.nativeFn('disj', function disjImpl(s: CljValue, ...items: CljValue[]) {
    if (s === undefined || s.kind === 'nil') return cljSet([])
    if (s.kind !== 'set') {
      throw EvaluationError.atArg(`disj expects a set, got ${printString(s)}`, { s }, 0)
    }
    const newValues = s.values.filter(v => !items.some(item => isEqual(item, v)))
    return cljSet(newValues)
  }).doc(
    'Returns a set with the given items removed.',
    [['s', '&', 'items']]
  ),

  vec: v.nativeFn('vec', function vecImpl(coll: CljValue) {
    if (coll === undefined || coll.kind === 'nil') return cljVector([])
    if (isVector(coll)) return coll
    if (!isSeqable(coll)) {
      throw EvaluationError.atArg(`vec expects a collection or string, got ${printString(coll)}`, { coll }, 0)
    }
    return cljVector(toSeq(coll))
  }).doc(
    'Creates a new vector containing the contents of coll.',
    [['coll']]
  ),

  subvec: v.nativeFn('subvec', function subvecImpl(v: CljValue, start: CljValue, end?: CljValue) {
    if (v === undefined || !isVector(v)) {
      throw EvaluationError.atArg(`subvec expects a vector, got ${printString(v)}`, { v }, 0)
    }
    if (start === undefined || start.kind !== 'number') {
      throw EvaluationError.atArg(`subvec expects a number start index`, { start }, 1)
    }
    const s = start.value
    const e = end !== undefined && end.kind === 'number' ? end.value : v.value.length
    if (s < 0 || e > v.value.length || s > e) {
      throw new EvaluationError(`subvec index out of bounds: start=${s}, end=${e}, length=${v.value.length}`, { v, start, end })
    }
    return cljVector(v.value.slice(s, e))
  }).doc(
    'Returns a persistent vector of the items in vector from start (inclusive) to end (exclusive).',
    [['v', 'start'], ['v', 'start', 'end']]
  ),

  peek: v.nativeFn('peek', function peekImpl(coll: CljValue) {
    if (coll === undefined || coll.kind === 'nil') return cljNil()
    if (isVector(coll)) {
      return coll.value.length === 0 ? cljNil() : coll.value[coll.value.length - 1]
    }
    if (isList(coll)) {
      return coll.value.length === 0 ? cljNil() : coll.value[0]
    }
    throw EvaluationError.atArg(`peek expects a list or vector, got ${printString(coll)}`, { coll }, 0)
  }).doc(
    'For a list, same as first. For a vector, same as last.',
    [['coll']]
  ),

  pop: v.nativeFn('pop', function popImpl(coll: CljValue) {
    if (coll === undefined || coll.kind === 'nil') {
      throw EvaluationError.atArg("Can't pop empty list", { coll }, 0)
    }
    if (isVector(coll)) {
      if (coll.value.length === 0) throw new EvaluationError("Can't pop empty vector", { coll })
      return cljVector(coll.value.slice(0, -1))
    }
    if (isList(coll)) {
      if (coll.value.length === 0) throw new EvaluationError("Can't pop empty list", { coll })
      return cljList(coll.value.slice(1))
    }
    throw EvaluationError.atArg(`pop expects a list or vector, got ${printString(coll)}`, { coll }, 0)
  }).doc(
    'For a list, returns a new list without the first item. For a vector, returns a new vector without the last item.',
    [['coll']]
  ),

  empty: v.nativeFn('empty', function emptyImpl(coll: CljValue) {
    if (coll === undefined || coll.kind === 'nil') return cljNil()
    switch (coll.kind) {
      case 'list': return cljList([])
      case 'vector': return cljVector([])
      case 'map': return cljMap([])
      case 'set': return cljSet([])
      default: return cljNil()
    }
  }).doc(
    'Returns an empty collection of the same category as coll, or nil.',
    [['coll']]
  ),
}
