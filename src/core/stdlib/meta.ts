// Metadata: with-meta, meta
import { EvaluationError } from '../errors'
import { cljNativeFunction, cljNil, withDoc } from '../factories'
import { printString } from '../printer'
import type { CljMap, CljValue } from '../types'

export const metaFunctions: Record<string, CljValue> = {
  meta: withDoc(
    cljNativeFunction('meta', (val: CljValue) => {
      if (val === undefined) {
        throw new EvaluationError('meta expects one argument', {})
      }
      if (val.kind === 'function' || val.kind === 'native-function') {
        return val.meta ?? cljNil()
      }
      return cljNil()
    }),
    'Returns the metadata map of a value, or nil if the value has no metadata.',
    [['val']]
  ),

  'with-meta': withDoc(
    cljNativeFunction('with-meta', (val: CljValue, m: CljValue) => {
      if (val === undefined) {
        throw new EvaluationError('with-meta expects two arguments', {})
      }
      if (m === undefined) {
        throw new EvaluationError('with-meta expects two arguments', {})
      }
      if (m.kind !== 'map' && m.kind !== 'nil') {
        throw new EvaluationError(
          `with-meta expects a map as second argument, got ${printString(m)}`,
          { m }
        )
      }
      if (val.kind !== 'function' && val.kind !== 'native-function') {
        throw new EvaluationError(
          `with-meta only supports functions, got ${printString(val)}`,
          { val }
        )
      }
      const meta = m.kind === 'nil' ? undefined : (m as CljMap)
      return { ...val, meta }
    }),
    'Returns a new value with the metadata map m applied to val.',
    [['val', 'm']]
  ),
}
