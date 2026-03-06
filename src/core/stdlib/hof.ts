// Higher-order functions: map, filter, reduce, apply, partial, comp,
// map-indexed, identity
import { isAFunction, isCollection, isReduced } from '../assertions'
import { EvaluationError } from '../errors'
import {
  cljNativeFunction,
  cljNativeFunctionWithContext,
  withDoc,
} from '../factories'
import { printString } from '../printer'
import { toSeq } from '../transformations'
import type {
  CljFunction,
  CljNativeFunction,
  CljValue,
  Env,
  EvaluationContext,
} from '../types'

export const hofFunctions: Record<string, CljValue> = {
  // map: cljNativeFunctionWithContext(
  //   'map',
  //   (
  //     ctx: EvaluationContext,
  //     fn: CljValue | undefined,
  //     collection: CljValue | undefined
  //   ): CljValue => {
  //     if (fn === undefined) {
  //       throw new EvaluationError(
  //         `map expects a function as first argument, got nil`,
  //         { fn }
  //       )
  //     }
  //     if (!isAFunction(fn)) {
  //       throw new EvaluationError(
  //         `map expects a function as first argument, got ${printString(fn)}`,
  //         { fn }
  //       )
  //     }
  //     if (collection === undefined) {
  //       return cljNil()
  //     }
  //     if (!isCollection(collection)) {
  //       throw new EvaluationError(
  //         `map expects a collection, got ${printString(collection)}`,
  //         { collection }
  //       )
  //     }

  //     const wrap = isVector(collection) ? cljVector : cljList
  //     return wrap(
  //       toSeq(collection).map((item) => ctx.applyFunction(fn, [item]))
  //     )
  //   }
  // ),
  // filter: cljNativeFunctionWithContext(
  //   'filter',
  //   (
  //     ctx: EvaluationContext,
  //     fn: CljValue | undefined,
  //     collection: CljValue | undefined
  //   ): CljValue => {
  //     if (fn === undefined) {
  //       throw new EvaluationError(
  //         `filter expects a function as first argument, got nil`,
  //         { fn }
  //       )
  //     }
  //     if (!isAFunction(fn)) {
  //       throw new EvaluationError(
  //         `filter expects a function as first argument, got ${printString(fn)}`,
  //         { fn }
  //       )
  //     }
  //     if (collection === undefined) {
  //       return cljNil()
  //     }
  //     if (!isCollection(collection)) {
  //       throw new EvaluationError(
  //         `filter expects a collection, got ${printString(collection)}`,
  //         { collection }
  //       )
  //     }

  //     const wrap = isVector(collection) ? cljVector : cljList
  //     return wrap(
  //       toSeq(collection).filter((item) =>
  //         isTruthy(ctx.applyFunction(fn, [item]))
  //       )
  //     )
  //   }
  // ),
  reduce: withDoc(
    cljNativeFunctionWithContext(
      'reduce',
      (
        ctx: EvaluationContext,
        callEnv: Env,
        fn: CljValue,
        ...rest: CljValue[]
      ) => {
        if (fn === undefined || !isAFunction(fn)) {
          throw new EvaluationError(
            `reduce expects a function as first argument${fn !== undefined ? `, got ${printString(fn)}` : ''}`,
            { fn }
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

        if (!isCollection(collection)) {
          throw new EvaluationError(
            `reduce expects a collection, got ${printString(collection)}`,
            { collection }
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
            if (isReduced(result)) return result.value
            acc = result
          }
          return acc
        }

        let acc = init!
        for (const item of items) {
          const result = ctx.applyFunction(fn, [acc, item], callEnv)
          if (isReduced(result)) return result.value
          acc = result
        }
        return acc
      }
    ),
    'Reduces a collection to a single value by iteratively applying f. (reduce f coll) or (reduce f init coll).',
    [
      ['f', 'coll'],
      ['f', 'val', 'coll'],
    ]
  ),

  apply: withDoc(
    cljNativeFunctionWithContext(
      'apply',
      (
        ctx: EvaluationContext,
        callEnv: Env,
        fn: CljValue | undefined,
        ...rest: CljValue[]
      ) => {
        if (fn === undefined || !isAFunction(fn)) {
          throw new EvaluationError(
            `apply expects a function as first argument${fn !== undefined ? `, got ${printString(fn)}` : ''}`,
            { fn }
          )
        }
        if (rest.length === 0) {
          throw new EvaluationError('apply expects at least 2 arguments', {
            fn,
          })
        }
        const lastArg = rest[rest.length - 1]
        if (!isCollection(lastArg)) {
          throw new EvaluationError(
            `apply expects a collection as last argument, got ${printString(lastArg)}`,
            { lastArg }
          )
        }

        const args = [...rest.slice(0, -1), ...toSeq(lastArg)]
        return ctx.applyFunction(fn, args, callEnv)
      }
    ),
    'Calls f with the elements of the last argument (a collection) as its arguments, optionally prepended by fixed args.',
    [
      ['f', 'args'],
      ['f', '&', 'args'],
    ]
  ),

  partial: withDoc(
    cljNativeFunction('partial', (fn: CljValue, ...preArgs: CljValue[]) => {
      if (fn === undefined || !isAFunction(fn)) {
        throw new EvaluationError(
          `partial expects a function as first argument${fn !== undefined ? `, got ${printString(fn)}` : ''}`,
          { fn }
        )
      }
      const capturedFn = fn as CljFunction | CljNativeFunction
      return cljNativeFunctionWithContext(
        'partial',
        (ctx: EvaluationContext, callEnv: Env, ...moreArgs: CljValue[]) => {
          return ctx.applyFunction(capturedFn, [...preArgs, ...moreArgs], callEnv)
        }
      )
    }),
    'Returns a function that calls f with pre-applied args prepended to any additional arguments.',
    [['f', '&', 'args']]
  ),

  comp: withDoc(
    cljNativeFunction('comp', (...fns: CljValue[]) => {
      if (fns.length === 0) {
        return cljNativeFunction('identity', (x: CljValue) => x)
      }
      if (fns.some((f) => !isAFunction(f))) {
        throw new EvaluationError('comp expects functions', { fns })
      }
      const capturedFns = fns as Array<CljFunction | CljNativeFunction>
      return cljNativeFunctionWithContext(
        'composed',
        (ctx: EvaluationContext, callEnv: Env, ...args: CljValue[]) => {
          let result = ctx.applyFunction(
            capturedFns[capturedFns.length - 1] as
              | CljFunction
              | CljNativeFunction,
            args,
            callEnv
          )
          for (let i = capturedFns.length - 2; i >= 0; i--) {
            result = ctx.applyFunction(
              capturedFns[i] as CljFunction | CljNativeFunction,
              [result],
              callEnv
            )
          }
          return result
        }
      )
    }),
    'Returns the composition of fns, applied right-to-left. (comp f g) is equivalent to (fn [x] (f (g x))).',
    [[], ['f'], ['f', 'g'], ['f', 'g', '&', 'fns']]
  ),

  // 'map-indexed': cljNativeFunctionWithContext(
  //   'map-indexed',
  //   (ctx: EvaluationContext, fn: CljValue, coll: CljValue): CljValue => {
  //     if (fn === undefined || !isAFunction(fn)) {
  //       throw new EvaluationError(
  //         `map-indexed expects a function as first argument${fn !== undefined ? `, got ${printString(fn)}` : ''}`,
  //         { fn }
  //       )
  //     }
  //     if (coll === undefined || !isCollection(coll)) {
  //       throw new EvaluationError(
  //         `map-indexed expects a collection as second argument${coll !== undefined ? `, got ${printString(coll)}` : ''}`,
  //         { coll }
  //       )
  //     }
  //     const items = toSeq(coll)
  //     const wrap = isVector(coll) ? cljVector : cljList
  //     return wrap(
  //       items.map((item, idx) =>
  //         ctx.applyFunction(fn as CljFunction | CljNativeFunction, [
  //           cljNumber(idx),
  //           item,
  //         ])
  //       )
  //     )
  //   }
  // ),

  identity: withDoc(
    cljNativeFunction('identity', (x: CljValue) => {
      if (x === undefined) {
        throw new EvaluationError('identity expects one argument', {})
      }
      return x
    }),
    'Returns its single argument unchanged.',
    [['x']]
  ),
}
