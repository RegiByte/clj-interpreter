// Higher-order functions: map, filter, reduce, apply, partial, comp,
// map-indexed, identity
import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { DocGroups, docMeta, v } from '../../../factories'
import { printString } from '../../../printer'
import { toSeq } from '../../../transformations'
import type {
  CljNumber,
  CljValue,
  Env,
  EvaluationContext,
} from '../../../types'

function compareKeyValues(x: CljValue, y: CljValue): number {
  if (is.number(x) && is.number(y)) {
    const xv = (x as CljNumber).value
    const yv = (y as CljNumber).value
    return xv < yv ? -1 : xv > yv ? 1 : 0
  }
  throw new EvaluationError(
    `key values are not comparable: ${printString(x)} and ${printString(y)}`,
    { x, y }
  )
}

function predicateArgOrder(
  predCount: number,
  argCount: number,
  restByArgument: boolean
): Array<[predIdx: number, argIdx: number]> {
  const order: Array<[predIdx: number, argIdx: number]> = []
  const leadingCount = Math.min(argCount, 3)
  for (let predIdx = 0; predIdx < predCount; predIdx++) {
    for (let argIdx = 0; argIdx < leadingCount; argIdx++) {
      order.push([predIdx, argIdx])
    }
  }
  if (restByArgument) {
    for (let argIdx = 3; argIdx < argCount; argIdx++) {
      for (let predIdx = 0; predIdx < predCount; predIdx++) {
        order.push([predIdx, argIdx])
      }
    }
  } else {
    for (let predIdx = 0; predIdx < predCount; predIdx++) {
      for (let argIdx = 3; argIdx < argCount; argIdx++) {
        order.push([predIdx, argIdx])
      }
    }
  }
  return order
}

export const hofFunctions: Record<string, CljValue> = {
  reduce: v
    .nativeFnCtx(
      'reduce',
      function reduce(
        ctx: EvaluationContext,
        callEnv: Env,
        fn: CljValue,
        ...rest: CljValue[]
      ) {
        if (fn === undefined || !is.aFunction(fn)) {
          throw EvaluationError.atArg(
            `reduce expects a function as first argument${fn !== undefined ? `, got ${printString(fn)}` : ''}`,
            { fn },
            0
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

        // nil is treated as an empty collection (matches Clojure semantics)
        if (is.nil(collection)) {
          if (!hasInit) {
            throw new EvaluationError(
              'reduce called on empty collection with no initial value',
              { fn }
            )
          }
          return init!
        }

        if (!is.seqable(collection)) {
          // collection is at args[rest.length]: 1 for (reduce f coll), 2 for (reduce f init coll)
          throw EvaluationError.atArg(
            `reduce expects a collection or string, got ${printString(collection)}`,
            { collection },
            rest.length
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
            const result = ctx.applyFunction(fn, [acc, items[i]], callEnv)
            if (is.reduced(result)) return result.value
            acc = result
          }
          return acc
        }

        let acc = init!
        for (const item of items) {
          const result = ctx.applyFunction(fn, [acc, item], callEnv)
          if (is.reduced(result)) return result.value
          acc = result
        }
        return acc
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Reduces a collection to a single value by iteratively applying f. (reduce f coll) or (reduce f init coll).',
        arglists: [
          ['f', 'coll'],
          ['f', 'val', 'coll'],
        ],
        docGroup: DocGroups.collections,
      }),
    ]),

  apply: v
    .nativeFnCtx(
      'apply',
      (
        ctx: EvaluationContext,
        callEnv: Env,
        fn: CljValue | undefined,
        ...rest: CljValue[]
      ) => {
        if (fn === undefined || !is.callable(fn)) {
          throw EvaluationError.atArg(
            `apply expects a callable as first argument${fn !== undefined ? `, got ${printString(fn)}` : ''}`,
            { fn },
            0
          )
        }
        if (rest.length === 0) {
          throw new EvaluationError('apply expects at least 2 arguments', {
            fn,
          })
        }
        const lastArg = rest[rest.length - 1]
        if (!is.nil(lastArg) && !is.seqable(lastArg)) {
          // last arg is at index rest.length (fn=0, rest[0]=1, ..., rest[n-1]=n)
          throw EvaluationError.atArg(
            `apply expects a collection or string as last argument, got ${printString(lastArg)}`,
            { lastArg },
            rest.length
          )
        }

        const args = [
          ...rest.slice(0, -1),
          ...(is.nil(lastArg) ? [] : toSeq(lastArg)),
        ]
        return ctx.applyCallable(fn, args, callEnv)
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Calls f with the elements of the last argument (a collection) as its arguments, optionally prepended by fixed args.',
        arglists: [
          ['f', 'args'],
          ['f', '&', 'args'],
        ],
        docGroup: DocGroups.higher_order,
      }),
    ]),

  partial: v
    .nativeFn('partial', (fn: CljValue, ...preArgs: CljValue[]) => {
      if (fn === undefined || !is.callable(fn)) {
        throw EvaluationError.atArg(
          `partial expects a callable as first argument${fn !== undefined ? `, got ${printString(fn)}` : ''}`,
          { fn },
          0
        )
      }
      const capturedFn = fn
      return v.nativeFnCtx(
        'partial',
        (ctx: EvaluationContext, callEnv: Env, ...moreArgs: CljValue[]) => {
          return ctx.applyCallable(
            capturedFn,
            [...preArgs, ...moreArgs],
            callEnv
          )
        }
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns a function that calls f with pre-applied args prepended to any additional arguments.',
        arglists: [['f', '&', 'args']],
        docGroup: DocGroups.higher_order,
      }),
    ]),

  comp: v
    .nativeFn('comp', (...fns: CljValue[]) => {
      if (fns.length === 0) {
        return v.nativeFn('identity', (x: CljValue) => x)
      }
      const badIdx = fns.findIndex((f) => !is.callable(f))
      if (badIdx !== -1) {
        throw EvaluationError.atArg(
          'comp expects functions or other callable values (keywords, collections)',
          { fns },
          badIdx
        )
      }
      const capturedFns = fns
      return v.nativeFnCtx(
        'composed',
        (ctx: EvaluationContext, callEnv: Env, ...args: CljValue[]) => {
          let result = ctx.applyCallable(
            capturedFns[capturedFns.length - 1],
            args,
            callEnv
          )
          for (let i = capturedFns.length - 2; i >= 0; i--) {
            result = ctx.applyCallable(capturedFns[i], [result], callEnv)
          }
          return result
        }
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns the composition of fns, applied right-to-left. (comp f g) is equivalent to (fn [x] (f (g x))). Accepts any callable: functions, keywords, and collections.',
        arglists: [[], ['f'], ['f', 'g'], ['f', 'g', '&', 'fns']],
        docGroup: DocGroups.higher_order,
      }),
    ]),

  'some-fn': v
    .nativeFn('some-fn', (...preds: CljValue[]) => {
      if (preds.length === 0) {
        throw new EvaluationError('some-fn expects at least one predicate', {
          preds,
        })
      }
      const capturedPreds = preds
      return v.nativeFnCtx(
        'some-fn',
        (ctx: EvaluationContext, callEnv: Env, ...args: CljValue[]) => {
          if (args.length === 0) return v.nil()
          const restByArgument =
            capturedPreds.length > 1 && capturedPreds.length <= 3
          for (const [predIdx, argIdx] of predicateArgOrder(
            capturedPreds.length,
            args.length,
            restByArgument
          )) {
            const result = ctx.applyCallable(
              capturedPreds[predIdx],
              [args[argIdx]],
              callEnv
            )
            if (is.truthy(result)) return result
          }
          return v.boolean(false)
        }
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns a function that returns the first truthy result from applying any predicate to any argument, or false.',
        arglists: [
          ['p'],
          ['p1', 'p2'],
          ['p1', 'p2', 'p3'],
          ['p1', 'p2', 'p3', '&', 'ps'],
        ],
        docGroup: DocGroups.higher_order,
      }),
    ]),

  'every-pred': v
    .nativeFn('every-pred', (...preds: CljValue[]) => {
      if (preds.length === 0) {
        throw new EvaluationError('every-pred expects at least one predicate', {
          preds,
        })
      }
      const capturedPreds = preds
      return v.nativeFnCtx(
        'every-pred',
        (ctx: EvaluationContext, callEnv: Env, ...args: CljValue[]) => {
          if (args.length === 0) return v.boolean(true)
          const restByArgument =
            capturedPreds.length > 1 && capturedPreds.length <= 3
          for (const [predIdx, argIdx] of predicateArgOrder(
            capturedPreds.length,
            args.length,
            restByArgument
          )) {
            const result = ctx.applyCallable(
              capturedPreds[predIdx],
              [args[argIdx]],
              callEnv
            )
            if (is.falsy(result)) return v.boolean(false)
          }
          return v.boolean(true)
        }
      )
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns a function that returns true when every predicate is truthy for every argument, otherwise false.',
        arglists: [
          ['p'],
          ['p1', 'p2'],
          ['p1', 'p2', 'p3'],
          ['p1', 'p2', 'p3', '&', 'ps'],
        ],
        docGroup: DocGroups.higher_order,
      }),
    ]),

  'max-key': v
    .nativeFnCtx(
      'max-key',
      (
        ctx: EvaluationContext,
        callEnv: Env,
        k: CljValue | undefined,
        x: CljValue | undefined,
        ...rest: CljValue[]
      ) => {
        if (k === undefined || x === undefined) {
          throw new EvaluationError('max-key expects at least 2 arguments', {
            k,
            x,
          })
        }
        if (rest.length === 0) return x
        if (!is.callable(k)) {
          throw EvaluationError.atArg(
            `max-key expects a callable as first argument, got ${printString(k)}`,
            { k },
            0
          )
        }
        let best = x
        let bestKey = ctx.applyCallable(k, [x], callEnv)
        for (const candidate of rest) {
          const candidateKey = ctx.applyCallable(k, [candidate], callEnv)
          if (compareKeyValues(candidateKey, bestKey) >= 0) {
            best = candidate
            bestKey = candidateKey
          }
        }
        return best
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns the item whose key value is greatest. On ties, returns the later item.',
        arglists: [
          ['k', 'x'],
          ['k', 'x', 'y'],
          ['k', 'x', 'y', '&', 'more'],
        ],
        docGroup: DocGroups.higher_order,
      }),
    ]),

  'min-key': v
    .nativeFnCtx(
      'min-key',
      (
        ctx: EvaluationContext,
        callEnv: Env,
        k: CljValue | undefined,
        x: CljValue | undefined,
        ...rest: CljValue[]
      ) => {
        if (k === undefined || x === undefined) {
          throw new EvaluationError('min-key expects at least 2 arguments', {
            k,
            x,
          })
        }
        if (rest.length === 0) return x
        if (!is.callable(k)) {
          throw EvaluationError.atArg(
            `min-key expects a callable as first argument, got ${printString(k)}`,
            { k },
            0
          )
        }
        let best = x
        let bestKey = ctx.applyCallable(k, [x], callEnv)
        for (const candidate of rest) {
          const candidateKey = ctx.applyCallable(k, [candidate], callEnv)
          if (compareKeyValues(candidateKey, bestKey) <= 0) {
            best = candidate
            bestKey = candidateKey
          }
        }
        return best
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Returns the item whose key value is least. On ties, returns the later item.',
        arglists: [
          ['k', 'x'],
          ['k', 'x', 'y'],
          ['k', 'x', 'y', '&', 'more'],
        ],
        docGroup: DocGroups.higher_order,
      }),
    ]),

  identity: v
    .nativeFn('identity', (x: CljValue) => {
      if (x === undefined) {
        throw EvaluationError.atArg('identity expects one argument', {}, 0)
      }
      return x
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns its single argument unchanged.',
        arglists: [['x']],
        docGroup: DocGroups.higher_order,
      }),
    ]),
}
