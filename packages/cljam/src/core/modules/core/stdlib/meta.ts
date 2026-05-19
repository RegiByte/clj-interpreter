// Metadata: with-meta, meta, alter-meta!
import { is } from '../../../assertions'
import { EvaluationError } from '../../../errors'
import { DocGroups, docMeta, v, cljWithMeta } from '../../../factories'
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
        is.function(val) ||
        is.nativeFunction(val) ||
        is.var(val) ||
        is.list(val) ||
        is.vector(val) ||
        is.map(val) ||
        is.symbol(val) ||
        is.atom(val)
      ) {
        return val.meta ?? v.nil()
      }
      return v.nil()
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns the metadata map of a value, or nil if the value has no metadata.',
        arglists: [['val']],
        docGroup: DocGroups.metadata,
      }),
    ]),

  'with-meta': v
    .nativeFn('with-meta', function withMetaImpl(val: CljValue, m: CljValue) {
      if (val === undefined) {
        throw EvaluationError.atArg('with-meta expects two arguments', {}, 0)
      }
      if (m === undefined) {
        throw EvaluationError.atArg('with-meta expects two arguments', {}, 1)
      }
      if (!is.map(m) && !is.nil(m)) {
        throw EvaluationError.atArg(
          `with-meta expects a map as second argument, got ${printString(m)}`,
          { m },
          1
        )
      }
      const metaSupported =
        is.function(val) ||
        is.nativeFunction(val) ||
        is.list(val) ||
        is.vector(val) ||
        is.map(val) ||
        is.symbol(val)
      if (!metaSupported) {
        throw EvaluationError.atArg(
          `with-meta does not support ${val.kind}, got ${printString(val)}`,
          { val },
          0
        )
      }
      const meta = is.nil(m) ? undefined : (m as CljMap)
      return cljWithMeta(val, meta)
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns a new value with the metadata map m applied to val.',
        arglists: [['val', 'm']],
        docGroup: DocGroups.metadata,
      }),
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
        if (!is.var(ref) && !is.atom(ref)) {
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
        if (!is.map(newMeta) && !is.nil(newMeta)) {
          throw new EvaluationError(
            `alter-meta! function must return a map or nil, got ${newMeta.kind}`,
            {}
          )
        }
        ;(ref as CljAtom).meta =
          is.nil(newMeta) ? undefined : (newMeta as CljMap)
        return newMeta
      }
    )
    .withMeta([
      ...docMeta({
        doc: "Applies f to ref's current metadata (with optional args), sets the result as the new metadata, and returns it.",
        arglists: [['ref', 'f', '&', 'args']],
        docGroup: DocGroups.metadata,
      }),
    ]),
}
