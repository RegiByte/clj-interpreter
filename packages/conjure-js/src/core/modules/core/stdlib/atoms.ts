import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { v } from '../../../factories'
import { printString } from '../../../printer'
import { realizeDelay } from '../../../transformations'
import type {
  CljAtom,
  CljFunction,
  CljNativeFunction,
  CljValue,
  Env,
} from '../../../types'

function validateAtom(
  a: CljAtom,
  newVal: CljValue,
  ctx: import('../../../types').EvaluationContext,
  callEnv: Env
) {
  if (a.validator && is.aFunction(a.validator)) {
    const result = ctx.applyFunction(a.validator, [newVal], callEnv)
    if (is.falsy(result)) {
      throw new EvaluationError('Invalid reference state', { newVal })
    }
  }
}

function notifyWatches(a: CljAtom, oldVal: CljValue, newVal: CljValue) {
  if (a.watches) {
    for (const [, { key, fn, ctx, callEnv }] of a.watches) {
      ctx.applyFunction(
        fn as CljFunction | CljNativeFunction,
        [key, { kind: 'atom', value: newVal } as CljValue, oldVal, newVal],
        callEnv
      )
    }
  }
}

export const atomFunctions: Record<string, CljValue> = {
  atom: v
    .nativeFn('atom', function atom(value: CljValue) {
      return v.atom(value)
    })
    .doc('Returns a new atom holding the given value.', [['value']]),

  deref: v
    .nativeFn('deref', function deref(value: CljValue) {
      if (is.atom(value)) return value.value
      if (is.volatile(value)) return value.value
      if (is.reduced(value)) return value.value
      if (is.delay(value)) return realizeDelay(value)
      // --- ASYNC (experimental) ---
      if (value.kind === 'pending') {
        throw EvaluationError.atArg(
          '@ on a pending value requires an (async ...) context. Use (async @x) or compose with then/catch.',
          { value },
          0
        )
      }
      // --- END ASYNC ---
      throw EvaluationError.atArg(
        `deref expects an atom, volatile, reduced, or delay value, got ${value.kind}`,
        { value },
        0
      )
    })
    .doc(
      'Returns the wrapped value from an atom, volatile, reduced, or delay value.',
      [['value']]
    ),

  'swap!': v
    .nativeFnCtx(
      'swap!',
      function swap(
        ctx,
        callEnv: Env,
        atomVal: CljValue,
        fn: CljValue,
        ...extraArgs: CljValue[]
      ) {
        if (!is.atom(atomVal)) {
          throw EvaluationError.atArg(
            `swap! expects an atom as its first argument, got ${atomVal.kind}`,
            { atomVal },
            0
          )
        }
        if (!is.aFunction(fn)) {
          throw EvaluationError.atArg(
            `swap! expects a function as its second argument, got ${fn.kind}`,
            { fn },
            1
          )
        }
        const a = atomVal as CljAtom
        const oldVal = a.value
        const newVal = ctx.applyFunction(fn, [oldVal, ...extraArgs], callEnv)
        validateAtom(a, newVal, ctx, callEnv)
        a.value = newVal
        notifyWatches(a, oldVal, newVal)
        return newVal
      }
    )
    .doc(
      'Applies fn to the current value of the atom, replacing the current value with the result. Returns the new value.',
      [['atomVal', 'fn', '&', 'extraArgs']]
    ),

  'reset!': v
    .nativeFnCtx(
      'reset!',
      function reset(ctx, callEnv: Env, atomVal: CljValue, newVal: CljValue) {
        if (!is.atom(atomVal)) {
          throw EvaluationError.atArg(
            `reset! expects an atom as its first argument, got ${atomVal.kind}`,
            { atomVal },
            0
          )
        }
        const a = atomVal as CljAtom
        const oldVal = a.value
        validateAtom(a, newVal, ctx, callEnv)
        a.value = newVal
        notifyWatches(a, oldVal, newVal)
        return newVal
      }
    )
    .doc('Sets the value of the atom to newVal and returns the new value.', [
      ['atomVal', 'newVal'],
    ]),

  'atom?': v
    .nativeFn('atom?', function isAtomPredicate(value: CljValue) {
      return v.boolean(is.atom(value))
    })
    .doc('Returns true if the value is an atom, false otherwise.', [['value']]),

  'swap-vals!': v
    .nativeFnCtx(
      'swap-vals!',
      function swapVals(
        ctx,
        callEnv: Env,
        atomVal: CljValue,
        fn: CljValue,
        ...extraArgs: CljValue[]
      ) {
        if (!is.atom(atomVal)) {
          throw EvaluationError.atArg(
            `swap-vals! expects an atom, got ${printString(atomVal)}`,
            { atomVal },
            0
          )
        }
        if (!is.aFunction(fn)) {
          throw EvaluationError.atArg(
            `swap-vals! expects a function, got ${printString(fn)}`,
            { fn },
            1
          )
        }
        const oldVal = atomVal.value
        const newVal = ctx.applyFunction(fn, [oldVal, ...extraArgs], callEnv)
        atomVal.value = newVal
        return v.vector([oldVal, newVal])
      }
    )
    .doc(
      'Atomically swaps the value of atom to be (apply f current-value-of-atom args). Returns [old new].',
      [['atom', 'f', '&', 'args']]
    ),

  'reset-vals!': v
    .nativeFn(
      'reset-vals!',
      function resetVals(atomVal: CljValue, newVal: CljValue) {
        if (!is.atom(atomVal)) {
          throw EvaluationError.atArg(
            `reset-vals! expects an atom, got ${printString(atomVal)}`,
            { atomVal },
            0
          )
        }
        const oldVal = atomVal.value
        atomVal.value = newVal
        return v.vector([oldVal, newVal])
      }
    )
    .doc('Sets the value of atom to newVal. Returns [old new].', [
      ['atom', 'newval'],
    ]),

  'compare-and-set!': v
    .nativeFn(
      'compare-and-set!',
      function compareAndSet(
        atomVal: CljValue,
        oldv: CljValue,
        newv: CljValue
      ) {
        if (!is.atom(atomVal)) {
          throw EvaluationError.atArg(
            `compare-and-set! expects an atom, got ${printString(atomVal)}`,
            { atomVal },
            0
          )
        }
        if (is.equal(atomVal.value, oldv)) {
          atomVal.value = newv
          return v.boolean(true)
        }
        return v.boolean(false)
      }
    )
    .doc(
      'Atomically sets the value of atom to newval if and only if the current value of the atom is identical to oldval. Returns true if set happened, else false.',
      [['atom', 'oldval', 'newval']]
    ),

  'add-watch': v
    .nativeFnCtx(
      'add-watch',
      function addWatch(
        ctx,
        callEnv: Env,
        atomVal: CljValue,
        key: CljValue,
        fn: CljValue
      ) {
        if (!is.atom(atomVal)) {
          throw EvaluationError.atArg(
            `add-watch expects an atom, got ${printString(atomVal)}`,
            { atomVal },
            0
          )
        }
        if (!is.aFunction(fn)) {
          throw EvaluationError.atArg(
            `add-watch expects a function, got ${printString(fn)}`,
            { fn },
            2
          )
        }
        const a = atomVal as CljAtom
        if (!a.watches) a.watches = new Map()
        // Store a wrapper that calls the user fn through the evaluator
        a.watches.set(printString(key), { key, fn, ctx, callEnv })
        return atomVal
      }
    )
    .doc(
      'Adds a watch function to an atom. The watch fn must be a fn of 4 args: a key, the atom, its old-state, its new-state.',
      [['atom', 'key', 'fn']]
    ),

  'remove-watch': v
    .nativeFn(
      'remove-watch',
      function removeWatch(atomVal: CljValue, key: CljValue) {
        if (!is.atom(atomVal)) {
          throw EvaluationError.atArg(
            `remove-watch expects an atom, got ${printString(atomVal)}`,
            { atomVal },
            0
          )
        }
        const a = atomVal as CljAtom
        if (a.watches) a.watches.delete(printString(key))
        return atomVal
      }
    )
    .doc('Removes a watch (set by add-watch) from an atom.', [['atom', 'key']]),

  'set-validator!': v
    .nativeFnCtx(
      'set-validator!',
      function setValidator(
        _ctx,
        _callEnv: Env,
        atomVal: CljValue,
        fn: CljValue
      ) {
        if (!is.atom(atomVal)) {
          throw EvaluationError.atArg(
            `set-validator! expects an atom, got ${printString(atomVal)}`,
            { atomVal },
            0
          )
        }
        if (fn.kind === 'nil') {
          ;(atomVal as CljAtom).validator = undefined
          return v.nil()
        }
        if (!is.aFunction(fn)) {
          throw EvaluationError.atArg(
            `set-validator! expects a function or nil, got ${printString(fn)}`,
            { fn },
            1
          )
        }
        ;(atomVal as CljAtom).validator = fn
        return v.nil()
      }
    )
    .doc(
      'Sets the validator-fn for an atom. fn must be nil or a side-effect-free fn of one argument.',
      [['atom', 'fn']]
    ),
}
