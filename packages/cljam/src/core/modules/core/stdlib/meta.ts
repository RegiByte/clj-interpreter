// Metadata: with-meta, meta, alter-meta!
import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { v } from '../../../factories'
import { printString } from '../../../printer'
import type {
  CljAtom,
  CljMap,
  CljValue,
  Env,
  EvaluationContext,
} from '../../../types'

export const metaFunctions: Record<string, CljValue> = {
  meta: v
    .nativeFn('meta', function metaImpl(val: CljValue) {
      if (val === undefined) {
        throw EvaluationError.atArg('meta expects one argument', {}, 0)
      }
      if (
        val.kind === 'function' ||
        val.kind === 'native-function' ||
        val.kind === 'var' ||
        val.kind === 'list' ||
        val.kind === 'vector' ||
        val.kind === 'map' ||
        val.kind === 'symbol' ||
        val.kind === 'atom'
      ) {
        return val.meta ?? v.nil()
      }
      return v.nil()
    })
    .doc(
      'Returns the metadata map of a value, or nil if the value has no metadata.',
      [['val']]
    ),

  'with-meta': v
    .nativeFn('with-meta', function withMetaImpl(val: CljValue, m: CljValue) {
      if (val === undefined) {
        throw EvaluationError.atArg('with-meta expects two arguments', {}, 0)
      }
      if (m === undefined) {
        throw EvaluationError.atArg('with-meta expects two arguments', {}, 1)
      }
      if (m.kind !== 'map' && m.kind !== 'nil') {
        throw EvaluationError.atArg(
          `with-meta expects a map as second argument, got ${printString(m)}`,
          { m },
          1
        )
      }
      const metaSupported =
        val.kind === 'function' ||
        val.kind === 'native-function' ||
        val.kind === 'list' ||
        val.kind === 'vector' ||
        val.kind === 'map' ||
        val.kind === 'symbol'
      if (!metaSupported) {
        throw EvaluationError.atArg(
          `with-meta does not support ${val.kind}, got ${printString(val)}`,
          { val },
          0
        )
      }
      const meta = m.kind === 'nil' ? undefined : (m as CljMap)
      return { ...val, meta }
    })
    .doc('Returns a new value with the metadata map m applied to val.', [
      ['val', 'm'],
    ]),

  'alter-meta!': v
    .nativeFnCtx(
      'alter-meta!',
      function alterMetaImpl(
        ctx: EvaluationContext,
        callEnv: Env,
        ref: CljValue,
        f: CljValue,
        ...args: CljValue[]
      ) {
        if (ref === undefined) {
          throw EvaluationError.atArg(
            'alter-meta! expects at least two arguments',
            {},
            0
          )
        }
        if (f === undefined) {
          throw EvaluationError.atArg(
            'alter-meta! expects at least two arguments',
            {},
            1
          )
        }
        if (ref.kind !== 'var' && ref.kind !== 'atom') {
          throw EvaluationError.atArg(
            `alter-meta! expects a Var or Atom as first argument, got ${ref.kind}`,
            {},
            0
          )
        }
        if (!is.aFunction(f)) {
          throw EvaluationError.atArg(
            `alter-meta! expects a function as second argument, got ${f.kind}`,
            {},
            1
          )
        }
        const currentMeta: CljValue = ref.meta ?? v.nil()
        const newMeta = ctx.applyCallable(f, [currentMeta, ...args], callEnv)
        if (newMeta.kind !== 'map' && newMeta.kind !== 'nil') {
          throw new EvaluationError(
            `alter-meta! function must return a map or nil, got ${newMeta.kind}`,
            {}
          )
        }
        ;(ref as CljAtom).meta =
          newMeta.kind === 'nil' ? undefined : (newMeta as CljMap)
        return newMeta
      }
    )
    .doc(
      "Applies f to ref's current metadata (with optional args), sets the result as the new metadata, and returns it.",
      [['ref', 'f', '&', 'args']]
    ),
}
