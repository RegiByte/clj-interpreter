// Native backing for clojure.edn.
// The public API (read-string, pr-str) lives in src/clojure/edn.clj.
// These natives are registered in clojure.core and called from that namespace.

import { EvaluationError, asRuntimeReadError } from '../../../errors'
import { DocGroups, docMeta, v } from '../../../factories'
import { is } from '../../../assertions'
import { derefValue, lookupVar } from '../../../env'
import { tokenize } from '../../../tokenizer'
import { readFormsEdn } from '../../../reader'
import { printString } from '../../../printer'
import type { CljMap, CljValue, Env, EvaluationContext } from '../../../types'

// ---------------------------------------------------------------------------
// Built-in EDN reader tag handlers
// ---------------------------------------------------------------------------

function instHandler(form: CljValue): CljValue {
  if (!is.string(form)) {
    throw new EvaluationError(`#inst requires a string, got ${form.kind}`, {
      form,
    })
  }
  const date = new Date(form.value)
  if (isNaN(date.getTime())) {
    throw new EvaluationError(`#inst: invalid date string "${form.value}"`, {
      form,
    })
  }
  return v.jsValue(date)
}

function uuidHandler(form: CljValue): CljValue {
  if (!is.string(form)) {
    throw new EvaluationError(`#uuid requires a string, got ${form.kind}`, {
      form,
    })
  }
  return form // pass through as-is; UUID is just a string in cljam
}

const DEFAULT_READERS = new Map<string, (form: CljValue) => CljValue>([
  ['inst', instHandler],
  ['uuid', uuidHandler],
])

// ---------------------------------------------------------------------------
// buildDataReaders — merge *data-readers* + opts :readers into one map.
// Resolution order (lowest to highest priority):
//   1. built-in defaults (#inst, #uuid)
//   2. *data-readers* dynamic var from clojure.core
//   3. :readers from the opts map passed to read-string
// ---------------------------------------------------------------------------
function buildDataReaders(
  optsArg: CljValue | null,
  callEnv: Env,
  ctx: EvaluationContext
): {
  readers: Map<string, (form: CljValue) => CljValue>
  defaultFn: ((tagName: string, form: CljValue) => CljValue) | undefined
} {
  const readers = new Map(DEFAULT_READERS)

  // Merge *data-readers* from clojure.core (respects binding stack)
  const dataReadersVar = lookupVar('*data-readers*', callEnv)
  if (dataReadersVar) {
    const effective = derefValue(dataReadersVar)
    if (is.map(effective)) {
      mergeReaderMap(effective, readers, ctx, callEnv)
    }
  }

  let defaultFn: ((tagName: string, form: CljValue) => CljValue) | undefined

  // Merge opts map if provided
  if (optsArg && is.map(optsArg)) {
    const readersEntry = optsArg.entries.find(
      ([k]) => is.keyword(k) && k.name === ':readers'
    )
    if (readersEntry) {
      const readersMap = readersEntry[1]
      if (is.map(readersMap)) {
        mergeReaderMap(readersMap, readers, ctx, callEnv)
      }
    }

    const defaultEntry = optsArg.entries.find(
      ([k]) => is.keyword(k) && k.name === ':default'
    )
    if (defaultEntry) {
      const defaultFnVal = defaultEntry[1]
      if (
        is.function(defaultFnVal) ||
        is.nativeFunction(defaultFnVal)
      ) {
        const captured = defaultFnVal
        defaultFn = (tagName, form) =>
          ctx.applyCallable(captured, [v.string(tagName), form], callEnv)
      }
    }
  }

  return { readers, defaultFn }
}

// Adds entries from a CljMap keyed by symbols/keywords into the readers map.
// Keys should be symbols like 'myapp/Foo; the tag name is the symbol's name.
function mergeReaderMap(
  map: CljMap,
  readers: Map<string, (form: CljValue) => CljValue>,
  ctx: EvaluationContext,
  callEnv: Env
): void {
  for (const [k, fn] of map.entries) {
    if (
      (is.symbol(k) || is.keyword(k)) &&
      (is.function(fn) ||
        is.nativeFunction(fn) ||
        is.multiMethod(fn))
    ) {
      const tagName = is.symbol(k) ? k.name : k.name.slice(1)
      const captured = fn
      readers.set(tagName, (form) =>
        ctx.applyCallable(captured, [form], callEnv)
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Native functions
// ---------------------------------------------------------------------------

export const ednFunctions = {
  // edn-read-string* — backing native for clojure.edn/read-string.
  // 1-arg form: (edn-read-string* s)
  // 2-arg form: (edn-read-string* opts s) — opts is {:readers {...} :default fn}
  'edn-read-string*': v
    .nativeFnCtx(
      'edn-read-string*',
      (ctx: EvaluationContext, callEnv: Env, ...args: CljValue[]) => {
        if (args.length === 0 || args.length > 2) {
          throw new EvaluationError(
            `edn-read-string* expects 1 or 2 arguments, got ${args.length}`,
            {}
          )
        }

        let optsArg: CljValue | null = null
        let sourceArg: CljValue

        if (args.length === 1) {
          sourceArg = args[0]
        } else {
          optsArg = args[0]
          sourceArg = args[1]
        }

        if (!is.string(sourceArg)) {
          throw new EvaluationError(
            `edn-read-string*: expected string, got ${printString(sourceArg)}`,
            { sourceArg }
          )
        }

        const { readers, defaultFn } = buildDataReaders(optsArg, callEnv, ctx)

        let forms: CljValue[]
        try {
          const tokens = tokenize(sourceArg.value)
          forms = readFormsEdn(
            tokens,
            {
              dataReaders: readers,
              defaultDataReader: defaultFn,
            },
            sourceArg.value
          )
        } catch (e) {
          throw asRuntimeReadError(e)
        }

        if (forms.length === 0) {
          throw new EvaluationError('edn-read-string*: empty input', {})
        }

        return forms[0]
      }
    )
    .withMeta([
      ...docMeta({
        doc: 'Reads one EDN value from string s and returns it.',
        arglists: [['s']],
        docGroup: DocGroups.edn,
        extra: {
          'no-doc': true,
        },
      }),
    ]),

  // edn-pr-str* — EDN-safe serialisation. Delegates to printString for now;
  // EDN output is identical to Clojure's pr-str for all standard types.
  'edn-pr-str*': v
    .nativeFn('edn-pr-str*', (...args: CljValue[]) => {
      if (args.length !== 1) {
        throw new EvaluationError(
          `edn-pr-str* expects 1 argument, got ${args.length}`,
          {}
        )
      }
      return v.string(printString(args[0]))
    })
    .withMeta([
      ...docMeta({
        doc: 'Returns a string representation of val in EDN format.',
        arglists: [['val']],
        docGroup: DocGroups.edn,
        extra: {
          'no-doc': true,
        },
      }),
    ]),
}

// *data-readers* — global dynamic var; maps tag symbols → reader functions.
// Merged with :readers opts in edn-read-string*. Defaults to empty map.
export const ednDynamicVars = {
  '*data-readers*': v.map([]),
}
