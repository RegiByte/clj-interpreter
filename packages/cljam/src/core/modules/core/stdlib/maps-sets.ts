// Associative and set operations: hash-map, assoc, dissoc, keys, vals, zipmap,
// hash-set, set, set?, disj
//
// assoc and dissoc handle both maps and vectors (by numeric index). They live
// here because their primary semantic is associative (key→value update/remove);
// the vector branch is an edge case within the same dispatch.

import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { v } from '../../../factories'
import { printString } from '../../../printer'
import { toSeq } from '../../../transformations'
import { type CljNumber, type CljValue } from '../../../types'

export const mapsSetsFunctions: Record<string, CljValue> = {
  'hash-map': v
    .nativeFn('hash-map', function hashMapImpl(...kvals: CljValue[]) {
      if (kvals.length === 0) {
        return v.map([])
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
      return v.map(entries)
    })
    .doc('Returns a new hash-map containing the given key-value pairs.', [
      ['&', 'kvals'],
    ]),

  assoc: v
    .nativeFn(
      'assoc',
      function assocImpl(collection: CljValue, ...args: CljValue[]) {
        if (!collection) {
          throw new EvaluationError(
            'assoc expects a collection as first argument',
            { collection }
          )
        }
        // nil is treated as an empty map, matching Clojure: (assoc nil :k v) => {:k v}
        if (is.nil(collection)) {
          collection = v.map([])
        }
        if (is.list(collection)) {
          throw new EvaluationError(
            'assoc on lists is not supported, use vectors instead',
            { collection }
          )
        }
        if (!is.collection(collection)) {
          throw EvaluationError.atArg(
            `assoc expects a collection, got ${printString(collection)}`,
            { collection },
            0
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
        if (is.vector(collection)) {
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
          return v.vector(newValues)
        }
        if (is.map(collection)) {
          const newEntries: [CljValue, CljValue][] = [...collection.entries]
          // need to find the entry with the same key and replace it, if it doesn't exist, add it
          for (let i = 0; i < args.length; i += 2) {
            const key = args[i]
            const value = args[i + 1]
            const entryIdx = newEntries.findIndex(
              function findEntryByKey(entry) {
                return is.equal(entry[0], key)
              }
            )
            if (entryIdx === -1) {
              newEntries.push([key, value])
            } else {
              newEntries[entryIdx] = [key, value]
            }
          }
          return v.map(newEntries)
        }
        throw new EvaluationError(
          `unhandled collection type, got ${printString(collection)}`,
          { collection }
        )
      }
    )
    .doc(
      'Associates the value val with the key k in collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the new value at index k.',
      [['collection', '&', 'kvals']]
    ),

  dissoc: v
    .nativeFn(
      'dissoc',
      function dissocImpl(collection: CljValue, ...args: CljValue[]) {
        if (!collection) {
          throw new EvaluationError(
            'dissoc expects a collection as first argument',
            { collection }
          )
        }
        if (is.list(collection)) {
          throw EvaluationError.atArg(
            'dissoc on lists is not supported, use vectors instead',
            { collection },
            0
          )
        }
        if (!is.collection(collection)) {
          throw EvaluationError.atArg(
            `dissoc expects a collection, got ${printString(collection)}`,
            { collection },
            0
          )
        }
        if (is.vector(collection)) {
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
          return v.vector(newValues)
        }
        if (is.map(collection)) {
          if (collection.entries.length === 0) {
            return collection // return the empty map
          }
          const newEntries: [CljValue, CljValue][] = [...collection.entries]
          for (let i = 0; i < args.length; i += 1) {
            const key = args[i]
            const entryIdx = newEntries.findIndex(
              function findEntryByKey(entry) {
                return is.equal(entry[0], key)
              }
            )
            if (entryIdx === -1) {
              continue // key not present — skip, don't bail
            }
            newEntries.splice(entryIdx, 1)
          }
          return v.map(newEntries)
        }
        throw new EvaluationError(
          `unhandled collection type, got ${printString(collection)}`,
          { collection }
        )
      }
    )
    .doc(
      'Dissociates the key k from collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the value at index k removed.',
      [['collection', '&', 'keys']]
    ),

  zipmap: v
    .nativeFn('zipmap', function zipmapImpl(ks: CljValue, vs: CljValue) {
      if (ks === undefined || !is.seqable(ks)) {
        throw new EvaluationError(
          `zipmap expects a collection or string as first argument${ks !== undefined ? `, got ${printString(ks)}` : ''}`,
          { ks }
        )
      }
      if (vs === undefined || !is.seqable(vs)) {
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
      return v.map(entries)
    })
    .doc(
      'Returns a new map with the keys and values of the given collections.',
      [['ks', 'vs']]
    ),

  keys: v
    .nativeFn('keys', function keysImpl(m: CljValue) {
      if (m === undefined || !is.map(m)) {
        throw EvaluationError.atArg(
          `keys expects a map${m !== undefined ? `, got ${printString(m)}` : ''}`,
          { m },
          0
        )
      }
      return v.vector(
        m.entries.map(function extractKey([k]) {
          return k
        })
      )
    })
    .doc('Returns a vector of the keys of the given map.', [['m']]),

  vals: v
    .nativeFn('vals', function valsImpl(m: CljValue) {
      if (m === undefined || !is.map(m)) {
        throw EvaluationError.atArg(
          `vals expects a map${m !== undefined ? `, got ${printString(m)}` : ''}`,
          { m },
          0
        )
      }
      return v.vector(
        m.entries.map(function extractVal([, v]) {
          return v
        })
      )
    })
    .doc('Returns a vector of the values of the given map.', [['m']]),

  'hash-set': v
    .nativeFn('hash-set', function hashSetImpl(...args: CljValue[]) {
      const deduped: CljValue[] = []
      for (const v of args) {
        if (!deduped.some((existing) => is.equal(existing, v))) {
          deduped.push(v)
        }
      }
      return v.set(deduped)
    })
    .doc('Returns a set containing the given values.', [['&', 'xs']]),

  set: v
    .nativeFn('set', function setImpl(coll: CljValue) {
      if (coll === undefined || coll.kind === 'nil') return v.set([])
      const items = toSeq(coll)
      const deduped: CljValue[] = []
      for (const v of items) {
        if (!deduped.some((existing) => is.equal(existing, v))) {
          deduped.push(v)
        }
      }
      return v.set(deduped)
    })
    .doc('Returns a set of the distinct elements of the given collection.', [
      ['coll'],
    ]),

  'set?': v
    .nativeFn('set?', function setPredicateImpl(x: CljValue) {
      return v.boolean(x !== undefined && x.kind === 'set')
    })
    .doc('Returns true if x is a set.', [['x']]),

  disj: v
    .nativeFn('disj', function disjImpl(s: CljValue, ...items: CljValue[]) {
      if (s === undefined || s.kind === 'nil') return v.set([])
      if (s.kind !== 'set') {
        throw EvaluationError.atArg(
          `disj expects a set, got ${printString(s)}`,
          { s },
          0
        )
      }
      const newValues = s.values.filter(
        (v) => !items.some((item) => is.equal(item, v))
      )
      return v.set(newValues)
    })
    .doc('Returns a set with the given items removed.', [['s', '&', 'items']]),
}
