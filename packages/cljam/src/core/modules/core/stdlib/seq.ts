// Sequence abstraction: list, seq, first, rest, cons, conj, count, empty?, empty,
// nth, get, contains?, last, reverse, repeat*, range*, concat*
//
// These are the "core sequence protocol" operations — they apply uniformly across
// all collection types. conj lives here because it implements the sequence
// construction protocol (prepend for lists, append for vectors, kv-pair for maps,
// element dedup for sets).

import { is } from '../../../assertions.ts'
import { EvaluationError } from '../../../errors.ts'
import { v } from '../../../factories.ts'
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
    .doc('Returns a new list containing the given values.', [['&', 'args']]),

  seq: v
    .nativeFn('seq', function seqImpl(coll: CljValue): CljValue {
      if (coll.kind === 'nil') return v.nil()
      if (is.lazySeq(coll)) {
        const realized = realizeLazySeq(coll)
        if (is.nil(realized)) return v.nil()
        return seqImpl(realized)
      }
      if (is.cons(coll)) return coll
      if (!is.seqable(coll)) {
        throw EvaluationError.atArg(
          `seq expects a collection, string, or nil, got ${printString(coll)}`,
          { collection: coll },
          0
        )
      }
      const items = toSeq(coll)
      return items.length === 0 ? v.nil() : v.list(items)
    })
    .doc(
      'Returns a sequence of the given collection or string. Strings yield a sequence of single-character strings.',
      [['coll']]
    ),

  first: v
    .nativeFn('first', function firstImpl(collection: CljValue): CljValue {
      if (collection.kind === 'nil') return v.nil()
      if (is.lazySeq(collection)) {
        const realized = realizeLazySeq(collection)
        if (is.nil(realized)) return v.nil()
        return firstImpl(realized)
      }
      if (is.cons(collection)) return collection.head
      if (!is.seqable(collection)) {
        throw EvaluationError.atArg(
          'first expects a collection or string',
          { collection },
          0
        )
      }
      const entries = toSeq(collection)
      return entries.length === 0 ? v.nil() : entries[0]
    })
    .doc('Returns the first element of the given collection or string.', [
      ['coll'],
    ]),

  rest: v
    .nativeFn('rest', function restImpl(collection: CljValue): CljValue {
      if (collection.kind === 'nil') return v.list([])
      if (is.lazySeq(collection)) {
        const realized = realizeLazySeq(collection)
        if (is.nil(realized)) return v.list([])
        return restImpl(realized)
      }
      if (is.cons(collection)) return collection.tail
      if (!is.seqable(collection)) {
        throw EvaluationError.atArg(
          'rest expects a collection or string',
          { collection },
          0
        )
      }
      if (is.list(collection)) {
        if (collection.value.length === 0) {
          return collection // return the empty list
        }
        return v.list(collection.value.slice(1))
      }
      if (is.vector(collection)) {
        return v.vector(collection.value.slice(1))
      }
      if (is.map(collection)) {
        if (collection.entries.length === 0) {
          return collection // return the empty map
        }
        return v.map(collection.entries.slice(1))
      }
      if (collection.kind === 'string') {
        const chars = toSeq(collection)
        return v.list(chars.slice(1))
      }
      throw EvaluationError.atArg(
        `rest expects a collection or string, got ${printString(collection)}`,
        { collection },
        0
      )
    })
    .doc(
      'Returns a sequence of the given collection or string excluding the first element.',
      [['coll']]
    ),

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
          return v.vector([...collection.value, ...args])
        }
        if (is.map(collection)) {
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
              return is.equal(entry[0], key)
            })
            if (keyIdx === -1) {
              newEntries.push([key, pair.value[1]])
            } else {
              newEntries[keyIdx] = [key, pair.value[1]]
            }
          }
          return v.map([...newEntries])
        }

        if (is.set(collection)) {
          const newValues = [...collection.values]
          for (const v of args) {
            if (!newValues.some((existing) => is.equal(existing, v))) {
              newValues.push(v)
            }
          }
          return v.set(newValues)
        }

        throw new EvaluationError(
          `unhandled collection type, got ${printString(collection)}`,
          { collection }
        )
      }
    )
    .doc(
      'Appends args to the given collection. Lists append in reverse order to the head, vectors append to the tail, sets add unique elements.',
      [['collection', '&', 'args']]
    ),

  cons: v
    .nativeFn('cons', function consImpl(x: CljValue, xs: CljValue) {
      // When tail is lazy-seq or cons, create a cons cell to preserve laziness
      if (is.lazySeq(xs) || is.cons(xs)) {
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
      if (is.map(xs) || is.set(xs)) {
        throw EvaluationError.atArg(
          'cons on maps and sets is not supported, use vectors instead',
          { xs },
          1
        )
      }

      const wrap = is.list(xs) ? v.list : v.vector
      const newItems = [x, ...xs.value]

      return wrap(newItems)
    })
    .doc('Returns a new collection with x prepended to the head of xs.', [
      ['x', 'xs'],
    ]),

  get: v
    .nativeFn(
      'get',
      function getImpl(target: CljValue, key: CljValue, notFound?: CljValue) {
        const defaultValue = notFound ?? v.nil()

        switch (target.kind) {
          case valueKeywords.map: {
            const entries = target.entries
            for (const [k, v] of entries) {
              if (is.equal(k, key)) {
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
    )
    .doc(
      'Returns the value associated with key in target. If target is a map, returns the value associated with key, otherwise returns the value at index key in target. If not-found is provided, it is returned if the key is not found, otherwise nil is returned.',
      [
        ['target', 'key'],
        ['target', 'key', 'not-found'],
      ]
    ),

  nth: v
    .nativeFn(
      'nth',
      function nthImpl(coll: CljValue, n: CljValue, notFound?: CljValue) {
        if (n === undefined || n.kind !== 'number') {
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
        // Lazy/cons seqs: materialize to array
        if (is.lazySeq(coll) || is.cons(coll)) {
          const items = toSeq(coll)
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
        if (!is.list(coll) && !is.vector(coll)) {
          throw new EvaluationError(
            `nth expects a list or vector, got ${printString(coll)}`,
            { coll }
          )
        }
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
    )
    .doc(
      'Returns the nth element of the given collection. If not-found is provided, it is returned if the index is out of bounds, otherwise an error is thrown.',
      [['coll', 'n', 'not-found']]
    ),

  last: v
    .nativeFn('last', function lastImpl(coll: CljValue) {
      if (coll === undefined || (!is.list(coll) && !is.vector(coll))) {
        throw new EvaluationError(
          `last expects a list or vector${coll !== undefined ? `, got ${printString(coll)}` : ''}`,
          { coll }
        )
      }
      const items = coll.value
      return items.length === 0 ? v.nil() : items[items.length - 1]
    })
    .doc('Returns the last element of the given collection.', [['coll']]),

  reverse: v
    .nativeFn('reverse', function reverseImpl(coll: CljValue) {
      if (coll === undefined || (!is.list(coll) && !is.vector(coll))) {
        throw EvaluationError.atArg(
          `reverse expects a list or vector${coll !== undefined ? `, got ${printString(coll)}` : ''}`,
          { coll },
          0
        )
      }
      return v.list([...coll.value].reverse())
    })
    .doc(
      'Returns a new sequence with the elements of the given collection in reverse order.',
      [['coll']]
    ),

  'empty?': v
    .nativeFn('empty?', function emptyPredImpl(coll: CljValue) {
      if (coll === undefined) {
        throw EvaluationError.atArg('empty? expects one argument', {}, 0)
      }
      // nil and empty string count as empty, matching Clojure semantics
      if (coll.kind === 'nil') return v.boolean(true)
      if (!is.seqable(coll)) {
        throw EvaluationError.atArg(
          `empty? expects a collection, string, or nil, got ${printString(coll)}`,
          { coll },
          0
        )
      }
      return v.boolean(toSeq(coll).length === 0)
    })
    .doc(
      'Returns true if coll has no items. Accepts collections, strings, and nil.',
      [['coll']]
    ),

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
        if (coll.kind === 'nil') return v.boolean(false)
        if (is.map(coll)) {
          return v.boolean(
            coll.entries.some(function checkKeyMatch([k]) {
              return is.equal(k, key)
            })
          )
        }
        if (is.vector(coll)) {
          if (key.kind !== 'number') return v.boolean(false)
          return v.boolean(key.value >= 0 && key.value < coll.value.length)
        }
        if (is.set(coll)) {
          return v.boolean(coll.values.some((v) => is.equal(v, key)))
        }
        throw EvaluationError.atArg(
          `contains? expects a map, set, vector, or nil, got ${printString(coll)}`,
          { coll },
          0
        )
      }
    )
    .doc(
      'Returns true if key is present in coll. For maps checks key existence (including keys with nil values). For vectors checks index bounds.',
      [['coll', 'key']]
    ),

  'repeat*': v
    .nativeFn('repeat*', function repeatImpl(n: CljValue, x: CljValue) {
      if (n === undefined || n.kind !== 'number') {
        throw EvaluationError.atArg(
          `repeat expects a number as first argument${n !== undefined ? `, got ${printString(n)}` : ''}`,
          { n },
          0
        )
      }
      return v.list(Array(n.value).fill(x))
    })
    .doc('Returns a finite sequence of n copies of x (native helper).', [
      ['n', 'x'],
    ]),

  // ── Range ────────────────────────────────────────────────────────────────

  'range*': v
    .nativeFn('range*', function rangeImpl(...args: CljValue[]) {
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
        throw EvaluationError.atArg(
          'range expects number arguments',
          { args },
          badIdx
        )
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
        throw EvaluationError.atArg(
          'range step cannot be zero',
          { args },
          args.length - 1
        )
      }
      const result: CljValue[] = []
      if (step > 0) {
        for (let i = start; i < end; i += step) {
          result.push(v.number(i))
        }
      } else {
        for (let i = start; i > end; i += step) {
          result.push(v.number(i))
        }
      }
      return v.list(result)
    })
    .doc('Returns a finite sequence of numbers (native helper).', [
      ['n'],
      ['start', 'end'],
      ['start', 'end', 'step'],
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
          result.push(...arg.value)
        } else if (is.cons(arg) || is.lazySeq(arg)) {
          result.push(...toSeq(arg))
        } else if (is.set(arg)) {
          result.push(...arg.values)
        } else {
          throw new EvaluationError(
            `concat* expects seqable arguments, got ${printString(arg)}`,
            { arg }
          )
        }
      }
      return v.list(result)
    })
    .doc('Eagerly concatenates seqable collections into a list (quasiquote bootstrap helper).', [
      ['&', 'colls'],
    ]),

  count: v
    .nativeFn('count', function countImpl(countable: CljValue) {
      if (countable.kind === 'nil') return v.number(0)
      if (is.lazySeq(countable) || is.cons(countable)) {
        return v.number(toSeq(countable).length)
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
          return v.number((countable as CljVector).value.length)
        case valueKeywords.map:
          return v.number((countable as CljMap).entries.length)
        case valueKeywords.set:
          return v.number((countable as CljSet).values.length)
        case valueKeywords.string:
          return v.number((countable as CljString).value.length)
        default:
          throw new EvaluationError(
            `count expects a countable value, got ${printString(countable)}`,
            { countable }
          )
      }
    })
    .doc('Returns the number of elements in the given countable value.', [
      ['countable'],
    ]),

  empty: v
    .nativeFn('empty', function emptyImpl(coll: CljValue) {
      if (coll === undefined || coll.kind === 'nil') return v.nil()
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
    .doc('Returns an empty collection of the same category as coll, or nil.', [
      ['coll'],
    ]),
}
