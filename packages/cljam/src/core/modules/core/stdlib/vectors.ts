// Vector-specific operations: vector, vec, subvec, peek, pop
//
// These functions are exclusively concerned with vectors (or lists treated as
// a stack for peek/pop). Pure vector construction and stack operations.

import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { DocGroups, docMeta, v } from '../../../factories'
import { printString } from '../../../printer'
import { toSeq } from '../../../transformations'
import {
  vectorCount,
  vectorPeek,
  vectorPop,
  vectorSlice,
} from '../../../persistent/vector-helpers'
import { type CljValue } from '../../../types'

export const vectorFunctions: Record<string, CljValue> = {
  vector: v
    .nativeFn('vector', function vectorImpl(...args: CljValue[]) {
      if (args.length === 0) {
        return v.vector([])
      }
      return v.vector(args)
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns a new vector containing the given values.',
        arglists: [['&', 'args']],
        docGroup: DocGroups.collections,
      }),
    ]),

  vec: v
    .nativeFn('vec', function vecImpl(coll: CljValue) {
      if (coll === undefined || is.nil(coll)) return v.vector([])
      if (is.vector(coll)) return coll
      if (!is.seqable(coll)) {
        throw EvaluationError.atArg(
          `vec expects a collection or string, got ${printString(coll)}`,
          { coll },
          0
        )
      }
      return v.vector(toSeq(coll))
    })
    .withMeta([
      ...docMeta({
        doc: 'Creates a new vector containing the contents of coll.',
        arglists: [['coll']],
        docGroup: DocGroups.collections,
      }),
    ]),

  subvec: v
    .nativeFn(
      'subvec',
      function subvecImpl(vector: CljValue, start: CljValue, end?: CljValue) {
        if (vector === undefined || !is.vector(vector)) {
          throw EvaluationError.atArg(
            `subvec expects a vector, got ${printString(vector)}`,
            { v: vector },
            0
          )
        }
        if (start === undefined || !is.number(start)) {
          throw EvaluationError.atArg(
            `subvec expects a number start index`,
            { start },
            1
          )
        }
        const s = start.value
        const len = vectorCount(vector)
        const e = end !== undefined && is.number(end) ? end.value : len
        if (s < 0 || e > len || s > e) {
          throw new EvaluationError(
            `subvec index out of bounds: start=${s}, end=${e}, length=${len}`,
            { v: vector, start, end }
          )
        }
        return v.vector(vectorSlice(vector, s, e))
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns a vector of the items in vector from start (inclusive) to end (exclusive).',
        arglists: [
          ['v', 'start'],
          ['v', 'start', 'end'],
        ],
        docGroup: DocGroups.collections,
      }),
    ]),

  peek: v
    .nativeFn('peek', function peekImpl(coll: CljValue) {
      if (coll === undefined || is.nil(coll)) return v.nil()
      if (is.vector(coll)) {
        return vectorCount(coll) === 0 ? v.nil() : vectorPeek(coll)
      }
      if (is.list(coll)) {
        return coll.value.length === 0 ? v.nil() : coll.value[0]
      }
      throw EvaluationError.atArg(
        `peek expects a list or vector, got ${printString(coll)}`,
        { coll },
        0
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'For a list, same as first. For a vector, same as last.',
        arglists: [['coll']],
        docGroup: DocGroups.collections,
      }),
    ]),

  pop: v
    .nativeFn('pop', function popImpl(coll: CljValue) {
      if (coll === undefined || is.nil(coll)) {
        throw EvaluationError.atArg("Can't pop empty list", { coll }, 0)
      }
      if (is.vector(coll)) {
        if (vectorCount(coll) === 0)
          throw EvaluationError.atArg("Can't pop empty vector", { coll }, 0)
        return vectorPop(coll)
      }
      if (is.list(coll)) {
        if (coll.value.length === 0)
          throw EvaluationError.atArg("Can't pop empty list", { coll }, 0)
        return v.list(coll.value.slice(1))
      }
      throw EvaluationError.atArg(
        `pop expects a list or vector, got ${printString(coll)}`,
        { coll },
        0
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'For a list, returns a new list without the first item. For a vector, returns a new vector without the last item.',
        arglists: [['coll']],
        docGroup: DocGroups.collections,
      }),
    ]),
}
