import type {
  RuntimeModule,
  VarDeclaration,
  VarMap,
  ModuleContext,
} from './module'
import { buildPrintContext, prettyPrintString, printString, withPrintContext } from './printer'
import { derefValue } from './env'
import { valueToString } from './transformations'
import type { CljMap, CljValue, Env, EvaluationContext } from './types'
import { arithmeticFunctions } from './stdlib/arithmetic'
import { atomFunctions } from './stdlib/atoms'
import { mapsSetsFunctions } from './stdlib/maps-sets'
import { seqFunctions } from './stdlib/seq'
import { vectorFunctions } from './stdlib/vectors'
import { errorFunctions } from './stdlib/errors'
import { hofFunctions } from './stdlib/hof'
import { metaFunctions } from './stdlib/meta'
import { predicateFunctions } from './stdlib/predicates'
import { regexFunctions } from './stdlib/regex'
import { stringFunctions } from './stdlib/strings'
import { transducerFunctions } from './stdlib/transducers'
import { utilFunctions } from './stdlib/utils'
import { lazyFunctions } from './stdlib/lazy'
import { varFunctions } from './stdlib/vars'
// --- ASYNC (experimental) ---
import { asyncFunctions } from './stdlib/async-fns'
import { v } from './factories'
import { is } from './assertions'
import { EvaluationError } from './errors'
import { cljToJs as cljToJsDeep, jsToClj as jsToCljDeep, type FunctionApplier } from './conversions'
// --- END ASYNC ---

// ---------------------------------------------------------------------------
// Native function registry — installed as the initial clojure.core binding
// set by createRuntime.
//
// INTENTIONAL BOOTSTRAP OVERRIDES:
// Several functions below are redefined by clojure.core.clj after bootstrap.
// They serve as scaffolding during the bootstrap phase only. The Clojure
// source versions (lazy / transducer-aware) become authoritative once loaded.
// Overridden by clojure.core.clj:
//   concat      → lazy recursive version (shadows eager native)
//   map         → lazy + transducer 2-arity
//   filter      → lazy + transducer 2-arity
//   take        → lazy + stateful transducer
//   drop        → lazy + stateful transducer
//   take-while  → lazy + stateless transducer
//   drop-while  → lazy + stateful transducer
//   map-indexed → lazy + stateful transducer
//   keep        → lazy + transducer
//   keep-indexed→ lazy + stateful transducer
//   mapcat      → lazy + transducer
//   partition-by→ lazy + stateful transducer
//   iterate     → lazy infinite sequence
//   repeatedly  → lazy infinite sequence
//   cycle       → lazy infinite sequence
//   repeat      → lazy infinite (delegates to repeat* for finite arity)
//   range       → lazy infinite (delegates to range* for finite arity)
//   into        → 2-arity uses reduce+conj; 3-arity uses transduce
//   sequence    → materialise via into
//   completing  → 0-arity init + 1-arity completion wrapper
//   newline     → redefined as (defn newline [] (println ""))
//   not         → redefined as pure Clojure (if x false true)
//   dorun       → redefined in Clojure
//   doall       → redefined in Clojure
//
// Dynamic vars declared here (NOT overridden by clojure.core.clj):
//   *out*       → nil by default; bound by with-out-str to capture stdout
//   *err*       → nil by default; bound by with-err-str to capture stderr
//   *print-length*, *print-level* → print control
//
// range* and repeat* are intentionally kept — clojure.core.clj calls them
// explicitly as private native helpers for finite-arity range/repeat.
// ---------------------------------------------------------------------------

const nativeFunctions = {
  ...arithmeticFunctions,
  ...atomFunctions,
  ...seqFunctions,
  ...vectorFunctions,
  ...mapsSetsFunctions,
  ...errorFunctions,
  ...predicateFunctions,
  ...hofFunctions,
  ...metaFunctions,
  ...transducerFunctions,
  ...regexFunctions,
  ...stringFunctions,
  ...utilFunctions,
  ...varFunctions,
  ...lazyFunctions,
  // --- ASYNC (experimental) ---
  ...asyncFunctions,
  // --- END ASYNC ---
}


/**
 * Emit text to the current output channel.
 * If *out* is dynamically bound to a callable (e.g. inside with-out-str),
 * invoke it. Otherwise fall back to ctx.io.stdout.
 *
 * NOTE: We look up *out* via ctx.resolveNs('clojure.core') rather than
 * tryLookup(callEnv) because Clojure functions close over the original
 * snapshot env. After a snapshot restore, those closure envs point to the
 * old CljVar objects, not the session's freshly cloned ones. resolveNs goes
 * through the runtime registry and always returns the session's own var.
 */
function emitToOut(ctx: EvaluationContext, callEnv: Env, text: string): void {
  const outVar = ctx.resolveNs('clojure.core')?.vars.get('*out*')
  const out = outVar ? derefValue(outVar) : undefined
  if (out && (out.kind === 'function' || out.kind === 'native-function')) {
    ctx.applyCallable(out, [v.string(text)], callEnv)
  } else {
    ctx.io.stdout(text)
  }
}

/**
 * Emit text to the current error channel.
 * If *err* is dynamically bound to a callable (e.g. inside with-err-str),
 * invoke it. Otherwise fall back to ctx.io.stderr.
 * Same snapshot-env rationale as emitToOut.
 */
function emitToErr(ctx: EvaluationContext, callEnv: Env, text: string): void {
  const errVar = ctx.resolveNs('clojure.core')?.vars.get('*err*')
  const err = errVar ? derefValue(errVar) : undefined
  if (err && (err.kind === 'function' || err.kind === 'native-function')) {
    ctx.applyCallable(err, [v.string(text)], callEnv)
  } else {
    ctx.io.stderr(text)
  }
}

/**
 * Returns the full clojure.core RuntimeModule.
 *
 * IO functions (println, print, newline, pr, prn, pprint) read ctx.io.stdout
 * at call time instead of closing over an emit callback. This means:
 * - No output parameter needed here
 * - Snapshot clones automatically use the correct output without reinstalling
 *   any IO vars (restoreRuntime no longer needs makeIOModule)
 */
export function makeCoreModule(): RuntimeModule {
  return {
    id: 'clojure/core',
    declareNs: [
      {
        name: 'clojure.core',
        vars(_ctx: ModuleContext): VarMap {
          const map = new Map<string, VarDeclaration>()

          // Pure stdlib functions (all have .meta via .doc())
          for (const [name, fn] of Object.entries(nativeFunctions)) {
            const meta = (fn as { meta?: CljMap }).meta
            map.set(name, { value: fn, ...(meta ? { meta } : {}) })
          }

          // IO functions — route through emitToOut/emitToErr so that
          // *out*/*err* dynamic bindings (e.g. inside with-out-str) are honoured.
          map.set('println', {
            value: v.nativeFnCtx(
              'println',
              (ctx, callEnv, ...args: CljValue[]) => {
                withPrintContext(buildPrintContext(ctx), () => {
                  emitToOut(
                    ctx,
                    callEnv,
                    args.map(valueToString).join(' ') + '\n'
                  )
                })
                return v.nil()
              }
            ),
          })
          map.set('print', {
            value: v.nativeFnCtx(
              'print',
              (ctx, callEnv, ...args: CljValue[]) => {
                withPrintContext(buildPrintContext(ctx), () => {
                  emitToOut(ctx, callEnv, args.map(valueToString).join(' '))
                })
                return v.nil()
              }
            ),
          })
          map.set('newline', {
            value: v.nativeFnCtx('newline', (ctx, callEnv) => {
              emitToOut(ctx, callEnv, '\n')
              return v.nil()
            }),
          })
          map.set('pr', {
            value: v.nativeFnCtx('pr', (ctx, callEnv, ...args: CljValue[]) => {
              withPrintContext(buildPrintContext(ctx), () => {
                emitToOut(
                  ctx,
                  callEnv,
                  args.map((v) => printString(v)).join(' ')
                )
              })
              return v.nil()
            }),
          })
          map.set('prn', {
            value: v.nativeFnCtx('prn', (ctx, callEnv, ...args: CljValue[]) => {
              withPrintContext(buildPrintContext(ctx), () => {
                emitToOut(
                  ctx,
                  callEnv,
                  args.map((v) => printString(v)).join(' ') + '\n'
                )
              })
              return v.nil()
            }),
          })
          map.set('pprint', {
            value: v.nativeFnCtx(
              'pprint',
              (ctx, callEnv, form: CljValue, widthArg?: CljValue) => {
                if (form === undefined) return v.nil()
                const maxWidth =
                  widthArg?.kind === 'number' ? widthArg.value : 80
                withPrintContext(buildPrintContext(ctx), () => {
                  emitToOut(
                    ctx,
                    callEnv,
                    prettyPrintString(form, maxWidth) + '\n'
                  )
                })
                return v.nil()
              }
            ),
          })
          map.set('warn', {
            value: v.nativeFnCtx(
              'warn',
              (ctx, callEnv, ...args: CljValue[]) => {
                withPrintContext(buildPrintContext(ctx), () => {
                  emitToErr(
                    ctx,
                    callEnv,
                    args.map(valueToString).join(' ') + '\n'
                  )
                })
                return v.nil()
              }
            ),
          })

          // Dynamic output-channel vars. IO functions check these first before
          // falling back to ctx.io.stdout / ctx.io.stderr. Bound by with-out-str
          // and with-err-str macros defined in clojure.core.
          map.set('*out*', { value: v.nil(), dynamic: true })
          map.set('*err*', { value: v.nil(), dynamic: true })

          // Dynamic print-control vars
          map.set('*print-length*', { value: v.nil(), dynamic: true })
          map.set('*print-level*', { value: v.nil(), dynamic: true })

          // Compatibility var for IDE tooling
          map.set('*compiler-options*', { value: v.map([]) })

          // JS interop — deep conversion functions
          map.set('clj->js', {
            value: v.nativeFnCtx('clj->js', (ctx: EvaluationContext, callEnv: Env, val: CljValue) => {
              if (is.jsValue(val)) return val
              const applier: FunctionApplier = {
                applyFunction: (fn, args) => ctx.applyCallable(fn, args, callEnv),
              }
              return v.jsValue(cljToJsDeep(val, applier))
            }),
          })

          map.set('js->clj', {
            value: v.nativeFn('js->clj', (val: CljValue, opts?: CljValue) => {
              if (val.kind === 'nil') return val
              if (!is.jsValue(val)) {
                throw new EvaluationError(
                  `js->clj expects a js-value, got ${val.kind}`,
                  { val }
                )
              }
              const keywordizeKeys = (() => {
                if (!opts || opts.kind !== 'map') return false
                for (const [k, flag] of opts.entries) {
                  if (k.kind === 'keyword' && k.name === ':keywordize-keys') {
                    return flag.kind !== 'boolean' || flag.value !== false
                  }
                }
                return false
              })()
              return jsToCljDeep(val.value, { keywordizeKeys })
            }),
          })

          return map
        },
      },
    ],
  }
}
