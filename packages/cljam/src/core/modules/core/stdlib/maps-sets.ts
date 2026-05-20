// Associative and set operations: hash-map, assoc, dissoc, find, key, val,
// keys, vals, zipmap, hash-set, set, set?, disj
//
// assoc and dissoc handle both maps and vectors (by numeric index). They live
// here because their primary semantic is associative (key→value update/remove);
// the vector branch is an edge case within the same dispatch.

import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { DocGroups, docMeta, v } from '../../../factories'
import { mapAssoc, mapDissoc, mapEntries, setDisj } from '../../../persistent/map-helpers'
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
    .withMeta([
      ...docMeta({
        doc: 'Returns a new hash-map containing the given key-value pairs.',
        arglists: [['&', 'kvals']],
        docGroup: DocGroups.maps,
      }),
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
            if (!is.number(index)) {
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
        // Records: assoc on a declared field returns the same record type (JVM parity).
        // Assoc-ing any unknown key demotes the whole result to a plain map.
        if (is.record(collection)) {
          const newEntries: [CljValue, CljValue][] = [...collection.fields]
          let hasUnknownKey = false
          for (let i = 0; i < args.length; i += 2) {
            const key = args[i]
            const value = args[i + 1]
            const entryIdx = newEntries.findIndex(([k]) => is.equal(k, key))
            if (entryIdx === -1) {
              hasUnknownKey = true
              newEntries.push([key, value])
            } else {
              newEntries[entryIdx] = [key, value]
            }
          }
          if (hasUnknownKey) return v.map(newEntries)
          return v.record(collection.recordType, collection.ns, newEntries)
        }
        if (is.map(collection)) {
          let result = collection
          for (let i = 0; i < args.length; i += 2) {
            result = mapAssoc(result, args[i], args[i + 1])
          }
          return result
        }
        throw new EvaluationError(
          `unhandled collection type, got ${printString(collection)}`,
          { collection }
        )
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Associates the value val with the key k in collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the new value at index k.',
        arglists: [['collection', '&', 'kvals']],
        docGroup: DocGroups.collections,
      }),
    ]),

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
            if (!is.number(index)) {
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
        // Records: dissoc always returns a plain map
        if (is.record(collection)) {
          const newEntries: [CljValue, CljValue][] = [...collection.fields]
          for (let i = 0; i < args.length; i += 1) {
            const key = args[i]
            const entryIdx = newEntries.findIndex(([k]) => is.equal(k, key))
            if (entryIdx !== -1) newEntries.splice(entryIdx, 1)
          }
          return v.map(newEntries)
        }
        if (is.map(collection)) {
          let result = collection
          for (let i = 0; i < args.length; i += 1) {
            result = mapDissoc(result, args[i])
          }
          return result
        }
        throw new EvaluationError(
          `unhandled collection type, got ${printString(collection)}`,
          { collection }
        )
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Dissociates the key k from collection. If collection is a map, returns a new map with the same mappings, otherwise returns a vector with the value at index k removed.',
        arglists: [['collection', '&', 'keys']],
        docGroup: DocGroups.collections,
      }),
    ]),

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
    .withMeta([
      ...docMeta({
        doc: 'Returns a new map with the keys and values of the given collections.',
        arglists: [['ks', 'vs']],
        docGroup: DocGroups.maps,
      }),
    ]),

  find: v
    .nativeFn('find', function findImpl(m: CljValue, key: CljValue) {
      if (m === undefined || is.nil(m)) return v.nil()
      if (!is.map(m) && !is.record(m)) {
        throw EvaluationError.atArg(
          `find expects a map, record, or nil${m !== undefined ? `, got ${printString(m)}` : ''}`,
          { m },
          0
        )
      }
      const entries = is.record(m) ? m.fields : mapEntries(m)
      const found = entries.find(([entryKey]) => is.equal(entryKey, key))
      return found === undefined ? v.nil() : v.mapEntry(found[0], found[1])
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns the map entry for key in m, or nil if key is not present.',
        arglists: [['m', 'key']],
        docGroup: DocGroups.maps,
      }),
    ]),

  key: v
    .nativeFn('key', function keyImpl(entry: CljValue) {
      if (entry === undefined || !is.mapEntry(entry)) {
        throw EvaluationError.atArg(
          `key expects a map entry${entry !== undefined ? `, got ${printString(entry)}` : ''}`,
          { entry },
          0
        )
      }
      return entry.value[0]
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns the key from a map entry.',
        arglists: [['entry']],
        docGroup: DocGroups.maps,
      }),
    ]),

  val: v
    .nativeFn('val', function valImpl(entry: CljValue) {
      if (entry === undefined || !is.mapEntry(entry)) {
        throw EvaluationError.atArg(
          `val expects a map entry${entry !== undefined ? `, got ${printString(entry)}` : ''}`,
          { entry },
          0
        )
      }
      return entry.value[1]
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns the value from a map entry.',
        arglists: [['entry']],
        docGroup: DocGroups.maps,
      }),
    ]),

  keys: v
    .nativeFn('keys', function keysImpl(m: CljValue) {
      if (m === undefined || (!is.map(m) && !is.record(m))) {
        throw EvaluationError.atArg(
          `keys expects a map or record${m !== undefined ? `, got ${printString(m)}` : ''}`,
          { m },
          0
        )
      }
      const entries = is.record(m) ? m.fields : mapEntries(m)
      return v.vector(
        entries.map(function extractKey([k]) {
          return k
        })
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns a vector of the keys of the given map or record.',
        arglists: [['m']],
        docGroup: DocGroups.maps,
      }),
    ]),

  vals: v
    .nativeFn('vals', function valsImpl(m: CljValue) {
      if (m === undefined || (!is.map(m) && !is.record(m))) {
        throw EvaluationError.atArg(
          `vals expects a map or record${m !== undefined ? `, got ${printString(m)}` : ''}`,
          { m },
          0
        )
      }
      const entries = is.record(m) ? m.fields : mapEntries(m)
      return v.vector(
        entries.map(function extractVal([, val]) {
          return val
        })
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns a vector of the values of the given map or record.',
        arglists: [['m']],
        docGroup: DocGroups.maps,
      }),
    ]),

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
    .withMeta([
      ...docMeta({
        doc: 'Returns a set containing the given values.',
        arglists: [['&', 'xs']],
        docGroup: DocGroups.sets,
      }),
    ]),

  set: v
    .nativeFn('set', function setImpl(coll: CljValue) {
      if (coll === undefined || is.nil(coll)) return v.set([])
      const items = toSeq(coll)
      const deduped: CljValue[] = []
      for (const v of items) {
        if (!deduped.some((existing) => is.equal(existing, v))) {
          deduped.push(v)
        }
      }
      return v.set(deduped)
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns a set of the distinct elements of the given collection.',
        arglists: [['coll']],
        docGroup: DocGroups.collections,
      }),
    ]),

  'set?': v
    .nativeFn('set?', function setPredicateImpl(x: CljValue) {
      return v.boolean(x !== undefined && is.set(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if x is a set.',
        arglists: [['x']],
        docGroup: DocGroups.predicates,
      }),
    ]),

  disj: v
    .nativeFn('disj', function disjImpl(s: CljValue, ...items: CljValue[]) {
      if (s === undefined || is.nil(s)) return v.set([])
      if (!is.set(s)) {
        throw EvaluationError.atArg(
          `disj expects a set, got ${printString(s)}`,
          { s },
          0
        )
      }
      let result = s
      for (const item of items) {
        result = setDisj(result, item)
      }
      return result
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns a set with the given items removed.',
        arglists: [['s', '&', 'items']],
        docGroup: DocGroups.sets,
      }),
    ]),
}
