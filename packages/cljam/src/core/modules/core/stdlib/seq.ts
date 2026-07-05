// Sequence abstraction: list, seq, first, rest, cons, conj, count, empty?, empty,
// nth, get, contains?, last, reverse, repeat*, concat*
//
// These are the "core sequence protocol" operations — they apply uniformly across
// all collection types. conj lives here because it implements the sequence
// construction protocol (prepend for lists, append for vectors, kv-pair for maps,
// element dedup for sets).

import { is } from '../../../assertions.ts'
import { EvaluationError } from '../../../errors.ts'
import { DocGroups, docMeta, v } from '../../../factories.ts'
import {
  mapAssoc,
  mapContains,
  mapCount,
  mapGet,
  NOT_FOUND,
  setContains,
  setConj,
  setValues,
} from '../../../persistent/map-helpers.ts'
import {
  vectorConj,
  vectorCount,
  vectorNth,
  vectorPeek,
  vectorSlice,
  vectorToArray,
} from '../../../persistent/vector-helpers.ts'
import { printString } from '../../../printer.ts'
import { realizeLazySeq, toSeq } from '../../../transformations.ts'
import {
  type CljList,
  type CljMap,
  type CljNumber,
  type CljSet,
  type CljString,
  type CljValue,
  type CljVector,
} from '../../../types.ts'
import { valueKeywords } from '../../../keywords.ts'

export const seqFunctions: Record<string, CljValue> = {
  list: v
    .nativeFn('list', function listImpl(...args: CljValue[]) {
      if (args.length === 0) {
        return v.list([])
      }
      return v.list(args)
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns a new list containing the given values.',
        arglists: [['&', 'args']],
        docGroup: DocGroups.sequences,
      }),
    ]),

  seq: v
    .nativeFnCtx(
      'seq',
      function seqImpl(ctx, callEnv, coll: CljValue): CljValue {
        if (is.nil(coll)) return v.nil()
        if (is.lazySeq(coll)) {
          const realized = realizeLazySeq(coll, ctx, callEnv)
          if (is.nil(realized)) return v.nil()
          return seqImpl(ctx, callEnv, realized)
        }
        if (is.cons(coll)) return coll
        if (is.indexedSeq(coll)) return coll
        // A list is already its own seq (Clojure parity: (seq a-list) returns the
        // list itself, (list? (seq '(1 2 3))) → true). Empty → nil per the seq
        // contract. The O(1) indexed-seq win lands on the first `rest`, not here.
        if (is.list(coll)) return coll.value.length === 0 ? v.nil() : coll
        if (!is.seqable(coll)) {
          throw EvaluationError.atArg(
            `seq expects a collection, string, or nil, got ${printString(coll)}`,
            { collection: coll },
            0
          )
        }
        // toSeq returns the live backing array for a list (no copy) and a once-
        // materialized array for a vector/string — wrap it in an O(1) indexed-seq
        // view so downstream first/rest stepping stays O(1) per step.
        const items = toSeq(coll)
        return items.length === 0 ? v.nil() : v.indexedSeq(items, 0)
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns a sequence of the given collection or string. Strings yield a sequence of single-character strings.',
        arglists: [['coll']],
        docGroup: DocGroups.sequences,
      }),
    ]),

  first: v
    .nativeFnCtx(
      'first',
      function firstImpl(ctx, callEnv, collection: CljValue): CljValue {
        if (is.nil(collection)) return v.nil()
        if (is.lazySeq(collection)) {
          const realized = realizeLazySeq(collection, ctx, callEnv)
          if (is.nil(realized)) return v.nil()
          return firstImpl(ctx, callEnv, realized)
        }
        if (is.cons(collection)) return collection.head
        // O(1) head read; the factory invariant guarantees offset is in-bounds.
        if (is.indexedSeq(collection))
          return collection.array[collection.offset]
        // INV-1: read the head straight off the trie — never seq/materialize a
        // vector just to look at one element.
        if (is.vector(collection)) {
          return vectorCount(collection) === 0
            ? v.nil()
            : vectorNth(collection, 0)
        }
        if (!is.seqable(collection)) {
          throw EvaluationError.atArg(
            'first expects a collection or string',
            { collection },
            0
          )
        }
        const entries = toSeq(collection)
        return entries.length === 0 ? v.nil() : entries[0]
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns the first element of the given collection or string.',
        arglists: [['coll']],
        docGroup: DocGroups.sequences,
      }),
    ]),

  rest: v
    .nativeFnCtx(
      'rest',
      function restImpl(ctx, callEnv, collection: CljValue): CljValue {
        if (is.nil(collection)) return v.list([])
        if (is.lazySeq(collection)) {
          const realized = realizeLazySeq(collection, ctx, callEnv)
          if (is.nil(realized)) return v.list([])
          return restImpl(ctx, callEnv, realized)
        }
        if (is.cons(collection)) return collection.tail
        if (is.indexedSeq(collection)) {
          // O(1) step: bump the offset over the shared immutable array. At the end
          // of the view, rest yields () (empty list) — Clojure's rest-vs-next rule.
          const nextOffset = collection.offset + 1
          return nextOffset >= collection.array.length
            ? v.list([])
            : v.indexedSeq(collection.array, nextOffset)
        }
        if (!is.seqable(collection)) {
          throw EvaluationError.atArg(
            'rest expects a collection or string',
            { collection },
            0
          )
        }
        if (is.list(collection)) {
          // Return an O(1) view over the (immutable) backing array instead of the
          // O(n) slice(1) copy — this is the read-side cure for the lazy-seq O(n²)
          // pathology (every filter/map step did a full-array copy here).
          if (collection.value.length <= 1) {
            return v.list([])
          }
          return v.indexedSeq(collection.value, 1)
        }
        if (is.vector(collection)) {
          return v.vector(vectorSlice(collection, 1))
        }
        if (is.map(collection) || is.record(collection)) {
          const entries = toSeq(collection)
          return v.list(entries.slice(1))
        }
        if (is.string(collection)) {
          const chars = toSeq(collection)
          return v.list(chars.slice(1))
        }
        throw EvaluationError.atArg(
          `rest expects a collection or string, got ${printString(collection)}`,
          { collection },
          0
        )
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns a sequence of the given collection or string excluding the first element.',
        arglists: [['coll']],
        docGroup: DocGroups.sequences,
      }),
    ]),

  // conj dispatches across all collection types — it belongs here as the primary
  // sequence construction operation (cons-cell prepend for lists, append for
  // vectors, kv-pair insert for maps, deduplicating add for sets).
  conj: v
    .nativeFn(
      'conj',
      function conjImpl(collection: CljValue, ...args: CljValue[]) {
        if (!collection) {
          throw new EvaluationError(
            'conj expects a collection as first argument',
            { collection }
          )
        }
        if (args.length === 0) {
          return collection
        }
        if (!is.collection(collection)) {
          throw EvaluationError.atArg(
            `conj expects a collection, got ${printString(collection)}`,
            { collection },
            0
          )
        }
        if (is.list(collection)) {
          const newItems = [] as CljValue[]
          for (let i = args.length - 1; i >= 0; i--) {
            newItems.push(args[i])
          }
          return v.list([...newItems, ...collection.value])
        }
        if (is.vector(collection)) {
          return vectorConj(collection, ...args)
        }
        if (is.map(collection)) {
          let result = collection
          for (let i = 0; i < args.length; i += 1) {
            const pair = args[i] as CljVector
            const pairArgIndex = i + 1
            if (!is.vector(pair)) {
              throw EvaluationError.atArg(
                `conj on maps expects each argument to be a vector key-pair for maps, got ${printString(pair)}`,
                { pair },
                pairArgIndex
              )
            }
            if (vectorCount(pair) !== 2) {
              throw EvaluationError.atArg(
                `conj on maps expects each argument to be a vector key-pair for maps, got ${printString(pair)}`,
                { pair },
                pairArgIndex
              )
            }
            result = mapAssoc(result, vectorNth(pair, 0), vectorNth(pair, 1))
          }
          return result
        }

        if (is.set(collection)) {
          let result = collection
          for (const val of args) {
            result = setConj(result, val)
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
        doc: 'Appends args to the given collection. Lists append in reverse order to the head, vectors append to the tail, sets add unique elements.',
        arglists: [['collection', '&', 'args']],
        docGroup: DocGroups.sequences,
      }),
    ]),

  cons: v
    .nativeFn('cons', function consImpl(x: CljValue, xs: CljValue) {
      // When tail is lazy-seq, cons, or an indexed-seq view, create a cons cell
      // (preserves laziness for lazy-seq; for indexed-seq keeps the O(1) view intact
      // rather than materializing its backing array)
      if (is.lazySeq(xs) || is.cons(xs) || is.indexedSeq(xs)) {
        return v.cons(x, xs)
      }
      if (is.nil(xs)) {
        return v.list([x])
      }
      if (!is.collection(xs)) {
        throw EvaluationError.atArg(
          `cons expects a collection as second argument, got ${printString(xs)}`,
          { xs },
          1
        )
      }
      if (is.map(xs) || is.set(xs) || is.record(xs)) {
        throw EvaluationError.atArg(
          'cons on maps, sets, and records is not supported, use vectors instead',
          { xs },
          1
        )
      }

      const wrap = is.list(xs) ? v.list : v.vector
      const tail = is.vector(xs) ? vectorToArray(xs) : xs.value
      const newItems = [x, ...tail]

      return wrap(newItems)
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns a new collection with x prepended to the head of xs.',
        arglists: [['x', 'xs']],
        docGroup: DocGroups.sequences,
      }),
    ]),

  get: v
    .nativeFn(
      'get',
      function getImpl(target: CljValue, key: CljValue, notFound?: CljValue) {
        const defaultValue = notFound ?? v.nil()

        switch (target.kind) {
          case valueKeywords.map: {
            const found = mapGet(target as CljMap, key)
            return found === NOT_FOUND ? defaultValue : found
          }
          case valueKeywords.record: {
            for (const [k, val] of target.fields) {
              if (is.equal(k, key)) return val
            }
            return defaultValue
          }
          case valueKeywords.vector: {
            if (!is.number(key)) {
              throw new EvaluationError(
                'get on vectors expects a 0-based index as parameter',
                { key }
              )
            }
            // Index through the trie (O(log₃₂ n)) instead of materializing the whole
            // vector to read its length and one slot, as `target.value` would.
            const vec = target as CljVector
            if (key.value < 0 || key.value >= vectorCount(vec)) {
              return defaultValue
            }
            return vectorNth(vec, key.value)
          }
          default:
            return defaultValue
        }
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns the value associated with key in target. If target is a map, returns the value associated with key, otherwise returns the value at index key in target. If not-found is provided, it is returned if the key is not found, otherwise nil is returned.',
        arglists: [
          ['target', 'key'],
          ['target', 'key', 'not-found'],
        ],
        docGroup: DocGroups.sequences,
      }),
    ]),

  nth: v
    .nativeFnCtx(
      'nth',
      function nthImpl(
        _ctx,
        callEnv,
        coll: CljValue,
        n: CljValue,
        notFound?: CljValue
      ) {
        if (n === undefined || !is.number(n)) {
          throw new EvaluationError(
            `nth expects a number index${n !== undefined ? `, got ${printString(n)}` : ''}`,
            { n }
          )
        }
        const index = (n as CljNumber).value
        // nil: out-of-bounds semantics (return notFound or throw)
        if (coll === undefined || is.nil(coll)) {
          if (notFound !== undefined) return notFound
          throw new EvaluationError(
            `nth index ${index} is out of bounds for collection of length 0`,
            { coll, n }
          )
        }
        // Lazy/cons seqs: walk lazily so nth on infinite sequences doesn't hang.
        // toSeq would try to materialize the entire sequence — fatal for (range), (iterate ...), etc.
        if (is.lazySeq(coll) || is.cons(coll)) {
          let current: CljValue = coll
          let i = 0
          while (true) {
            // Peel any lazy-seq wrappers before inspecting the head
            while (is.lazySeq(current)) {
              current = realizeLazySeq(current, _ctx, callEnv)
            }
            if (is.nil(current)) {
              // Sequence ended before reaching index
              if (notFound !== undefined) return notFound
              const err = new EvaluationError(
                `nth index ${index} is out of bounds`,
                { coll, n }
              )
              err.data = { argIndex: 1 }
              throw err
            }
            if (is.cons(current)) {
              if (i === index) return current.head
              current = current.tail
              i++
              continue
            }
            // Sequence terminated in a realized list, vector, or indexed-seq view
            // (a cons tail can now be an indexed-seq) — index into it directly.
            if (
              is.list(current) ||
              is.vector(current) ||
              is.indexedSeq(current)
            ) {
              const relativeIndex = index - i
              const length = is.vector(current)
                ? vectorCount(current)
                : is.indexedSeq(current)
                  ? current.array.length - current.offset
                  : current.value.length
              if (relativeIndex < 0 || relativeIndex >= length) {
                if (notFound !== undefined) return notFound
                const err = new EvaluationError(
                  `nth index ${index} is out of bounds for collection of length ${i + length}`,
                  { coll, n }
                )
                err.data = { argIndex: 1 }
                throw err
              }
              return is.vector(current)
                ? vectorNth(current, relativeIndex)
                : is.indexedSeq(current)
                  ? current.array[current.offset + relativeIndex]
                  : current.value[relativeIndex]
            }
            // Non-sequential terminal (shouldn't happen in well-formed sequences)
            if (notFound !== undefined) return notFound
            const err = new EvaluationError(
              `nth index ${index} is out of bounds`,
              { coll, n }
            )
            err.data = { argIndex: 1 }
            throw err
          }
        }
        if (is.indexedSeq(coll)) {
          const absoluteIndex = coll.offset + index
          if (index < 0 || absoluteIndex >= coll.array.length) {
            if (notFound !== undefined) return notFound
            const err = new EvaluationError(
              `nth index ${index} is out of bounds for collection of length ${coll.array.length - coll.offset}`,
              { coll, n }
            )
            err.data = { argIndex: 1 }
            throw err
          }
          return coll.array[absoluteIndex]
        }
        if (!is.list(coll) && !is.vector(coll)) {
          throw new EvaluationError(
            `nth expects a list or vector, got ${printString(coll)}`,
            { coll }
          )
        }
        // Vectors index through the trie (O(log₃₂ n)) instead of materializing the
        // whole structure just to read one slot, which `.value[i]` would do.
        const length = is.vector(coll) ? vectorCount(coll) : coll.value.length
        if (index < 0 || index >= length) {
          if (notFound !== undefined) return notFound
          const err = new EvaluationError(
            `nth index ${index} is out of bounds for collection of length ${length}`,
            { coll, n }
          )
          err.data = { argIndex: 1 }
          throw err
        }
        return is.vector(coll) ? vectorNth(coll, index) : coll.value[index]
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns the nth element of the given collection. If not-found is provided, it is returned if the index is out of bounds, otherwise an error is thrown.',
        arglists: [['coll', 'n', 'not-found']],
        docGroup: DocGroups.sequences,
      }),
    ]),

  last: v
    .nativeFn('last', function lastImpl(coll: CljValue) {
      if (coll === undefined || (!is.list(coll) && !is.vector(coll))) {
        throw new EvaluationError(
          `last expects a list or vector${coll !== undefined ? `, got ${printString(coll)}` : ''}`,
          { coll }
        )
      }
      if (is.vector(coll)) {
        return vectorCount(coll) === 0 ? v.nil() : vectorPeek(coll)
      }
      const items = coll.value
      return items.length === 0 ? v.nil() : items[items.length - 1]
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns the last element of the given collection.',
        arglists: [['coll']],
        docGroup: DocGroups.sequences,
      }),
    ]),

  reverse: v
    .nativeFn('reverse', function reverseImpl(coll: CljValue) {
      if (coll === undefined || (!is.list(coll) && !is.vector(coll))) {
        throw EvaluationError.atArg(
          `reverse expects a list or vector${coll !== undefined ? `, got ${printString(coll)}` : ''}`,
          { coll },
          0
        )
      }
      // vectorToArray returns the live items array for the array rep, so copy
      // before the in-place .reverse() (gotchas.md #1 — the old [...coll.value]
      // did this implicitly).
      const items = is.vector(coll) ? vectorToArray(coll) : coll.value
      return v.list([...items].reverse())
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns a new sequence with the elements of the given collection in reverse order.',
        arglists: [['coll']],
        docGroup: DocGroups.sequences,
      }),
    ]),

  'empty?': v
    .nativeFn('empty?', function emptyPredImpl(coll: CljValue) {
      if (coll === undefined) {
        throw EvaluationError.atArg('empty? expects one argument', {}, 0)
      }
      // nil and empty string count as empty, matching Clojure semantics
      if (is.nil(coll)) return v.boolean(true)
      if (!is.seqable(coll)) {
        throw EvaluationError.atArg(
          `empty? expects a collection, string, or nil, got ${printString(coll)}`,
          { coll },
          0
        )
      }
      return v.boolean(toSeq(coll).length === 0)
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns true if coll has no items. Accepts collections, strings, and nil.',
        arglists: [['coll']],
        docGroup: DocGroups.predicates,
      }),
    ]),

  'contains?': v
    .nativeFn(
      'contains?',
      function containsPredImpl(coll: CljValue, key: CljValue) {
        if (coll === undefined) {
          throw EvaluationError.atArg(
            'contains? expects a collection as first argument',
            {},
            0
          )
        }
        if (key === undefined) {
          throw EvaluationError.atArg(
            'contains? expects a key as second argument',
            {},
            1
          )
        }
        if (is.nil(coll)) return v.boolean(false)
        if (is.map(coll)) {
          return v.boolean(mapContains(coll, key))
        }
        if (is.record(coll)) {
          return v.boolean(coll.fields.some(([k]) => is.equal(k, key)))
        }
        if (is.vector(coll)) {
          if (!is.number(key)) return v.boolean(false)
          return v.boolean(key.value >= 0 && key.value < vectorCount(coll))
        }
        if (is.set(coll)) {
          return v.boolean(setContains(coll, key))
        }
        throw EvaluationError.atArg(
          `contains? expects a map, record, set, vector, or nil, got ${printString(coll)}`,
          { coll },
          0
        )
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns true if key is present in coll. For maps checks key existence (including keys with nil values). For vectors checks index bounds.',
        arglists: [['coll', 'key']],
        docGroup: DocGroups.predicates,
      }),
    ]),

  'repeat*': v
    .nativeFn('repeat*', function repeatImpl(n: CljValue, x: CljValue) {
      if (n === undefined || !is.number(n)) {
        throw EvaluationError.atArg(
          `repeat expects a number as first argument${n !== undefined ? `, got ${printString(n)}` : ''}`,
          { n },
          0
        )
      }
      return v.list(Array(n.value).fill(x))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns a finite sequence of n copies of x (native helper).',
        arglists: [['n', 'x']],
        docGroup: DocGroups.sequences,
        extra: {
          'no-doc': true,
        },
      }),
    ]),

  // ── Quasiquote bootstrap helper ──────────────────────────────────────────
  // Used internally by quasiquote-expanded splice code (e.g. `(a ~@xs b)).
  // Eager unlike the lazy clojure.core/concat — safe because the result is
  // immediately consumed by (apply list ...). Not meant for user code.

  'concat*': v
    .nativeFn('concat*', function concatStarImpl(...args: CljValue[]) {
      const result: CljValue[] = []
      for (const arg of args) {
        if (is.nil(arg)) continue
        if (is.list(arg) || is.vector(arg)) {
          result.push(...(is.vector(arg) ? vectorToArray(arg) : arg.value))
        } else if (is.cons(arg) || is.lazySeq(arg) || is.indexedSeq(arg)) {
          result.push(...toSeq(arg))
        } else if (is.set(arg)) {
          result.push(...setValues(arg))
        } else {
          throw new EvaluationError(
            `concat* expects seqable arguments, got ${printString(arg)}`,
            { arg }
          )
        }
      }
      return v.list(result)
    })
    .withMeta([
      ...docMeta({
        doc: 'Eagerly concatenates seqable collections into a list (quasiquote bootstrap helper).',
        arglists: [['&', 'colls']],
        docGroup: DocGroups.sequences,
        extra: {
          'no-doc': true,
        },
      }),
    ]),

  count: v
    .nativeFn('count', function countImpl(countable: CljValue) {
      if (is.nil(countable)) return v.number(0)
      if (is.lazySeq(countable) || is.cons(countable)) {
        return v.number(toSeq(countable).length)
      }
      if (is.indexedSeq(countable)) {
        return v.number(countable.array.length - countable.offset)
      }
      if (
        !(
          [
            valueKeywords.list,
            valueKeywords.vector,
            valueKeywords.map,
            valueKeywords.record,
            valueKeywords.set,
            valueKeywords.string,
          ] as string[]
        ).includes(countable.kind)
      ) {
        throw EvaluationError.atArg(
          `count expects a countable value, got ${printString(countable)}`,
          { countable },
          0
        )
      }

      switch (countable.kind) {
        case valueKeywords.list:
          return v.number((countable as CljList).value.length)
        case valueKeywords.vector:
          return v.number(vectorCount(countable as CljVector))
        case valueKeywords.map:
          return v.number(mapCount(countable as CljMap))
        case valueKeywords.record:
          return v.number(countable.fields.length)
        case valueKeywords.set:
          return v.number(mapCount((countable as CljSet)._map))
        case valueKeywords.string:
          return v.number((countable as CljString).value.length)
        default:
          throw new EvaluationError(
            `count expects a countable value, got ${printString(countable)}`,
            { countable }
          )
      }
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns the number of elements in the given countable value.',
        arglists: [['countable']],
        docGroup: DocGroups.sequences,
      }),
    ]),

  empty: v
    .nativeFn('empty', function emptyImpl(coll: CljValue) {
      if (coll === undefined || is.nil(coll)) return v.nil()
      switch (coll.kind) {
        case 'list':
          return v.list([])
        case 'vector':
          return v.vector([])
        case 'map':
          return v.map([])
        case 'set':
          return v.set([])
        default:
          return v.nil()
      }
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns an empty collection of the same category as coll, or nil.',
        arglists: [['coll']],
        docGroup: DocGroups.sequences,
      }),
    ]),
}
