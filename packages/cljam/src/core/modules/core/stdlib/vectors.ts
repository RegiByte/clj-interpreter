// Vector-specific operations: vector, vec, subvec, peek, pop
//
// These functions are exclusively concerned with vectors (or lists treated as
// a stack for peek/pop). Pure vector construction and stack operations.

import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { v } from '../../../factories'
import { printString } from '../../../printer'
import { toSeq } from '../../../transformations'
import { type CljValue } from '../../../types'

export const vectorFunctions: Record<string, CljValue> = {
  vector: v
    .nativeFn('vector', function vectorImpl(...args: CljValue[]) {
      if (args.length === 0) {
        return v.vector([])
      }
      return v.vector(args)
    })
    .doc('Returns a new vector containing the given values.', [['&', 'args']]),

  vec: v
    .nativeFn('vec', function vecImpl(coll: CljValue) {
      if (coll === undefined || coll.kind === 'nil') return v.vector([])
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
    .doc('Creates a new vector containing the contents of coll.', [['coll']]),

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
        if (start === undefined || start.kind !== 'number') {
          throw EvaluationError.atArg(
            `subvec expects a number start index`,
            { start },
            1
          )
        }
        const s = start.value
        const e =
          end !== undefined && end.kind === 'number'
            ? end.value
            : vector.value.length
        if (s < 0 || e > vector.value.length || s > e) {
          throw new EvaluationError(
            `subvec index out of bounds: start=${s}, end=${e}, length=${vector.value.length}`,
            { v: vector, start, end }
          )
        }
        return v.vector(vector.value.slice(s, e))
      }
    )
    .doc(
      'Returns a persistent vector of the items in vector from start (inclusive) to end (exclusive).',
      [
        ['v', 'start'],
        ['v', 'start', 'end'],
      ]
    ),

  peek: v
    .nativeFn('peek', function peekImpl(coll: CljValue) {
      if (coll === undefined || coll.kind === 'nil') return v.nil()
      if (is.vector(coll)) {
        return coll.value.length === 0
          ? v.nil()
          : coll.value[coll.value.length - 1]
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
    .doc('For a list, same as first. For a vector, same as last.', [['coll']]),

  pop: v
    .nativeFn('pop', function popImpl(coll: CljValue) {
      if (coll === undefined || coll.kind === 'nil') {
        throw EvaluationError.atArg("Can't pop empty list", { coll }, 0)
      }
      if (is.vector(coll)) {
        if (coll.value.length === 0)
          throw EvaluationError.atArg("Can't pop empty vector", { coll }, 0)
        return v.vector(coll.value.slice(0, -1))
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
    .doc(
      'For a list, returns a new list without the first item. For a vector, returns a new vector without the last item.',
      [['coll']]
    ),
}
