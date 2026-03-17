// Higher-order functions: map, filter, reduce, apply, partial, comp,
// map-indexed, identity
import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { v } from '../../../factories'
import { printString } from '../../../printer'
import { toSeq } from '../../../transformations'
import type { CljValue, Env, EvaluationContext } from '../../../types'

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
        if (collection.kind === 'nil') {
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
    .doc(
      'Reduces a collection to a single value by iteratively applying f. (reduce f coll) or (reduce f init coll).',
      [
        ['f', 'coll'],
        ['f', 'val', 'coll'],
      ]
    ),

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
    .doc(
      'Calls f with the elements of the last argument (a collection) as its arguments, optionally prepended by fixed args.',
      [
        ['f', 'args'],
        ['f', '&', 'args'],
      ]
    ),

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
    .doc(
      'Returns a function that calls f with pre-applied args prepended to any additional arguments.',
      [['f', '&', 'args']]
    ),

  comp: v
    .nativeFn('comp', (...fns: CljValue[]) => {
      if (fns.length === 0) {
        return v.nativeFn('identity', (x: CljValue) => x)
      }
      const badIdx = fns.findIndex((f) => !is.callable(f))
      if (badIdx !== -1) {
        throw EvaluationError.atArg(
          'comp expects functions or other callable values (keywords, maps)',
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
    .doc(
      'Returns the composition of fns, applied right-to-left. (comp f g) is equivalent to (fn [x] (f (g x))). Accepts any callable: functions, keywords, and maps.',
      [[], ['f'], ['f', 'g'], ['f', 'g', '&', 'fns']]
    ),

  identity: v
    .nativeFn('identity', (x: CljValue) => {
      if (x === undefined) {
        throw EvaluationError.atArg('identity expects one argument', {}, 0)
      }
      return x
    })
    .doc('Returns its single argument unchanged.', [['x']]),
}
