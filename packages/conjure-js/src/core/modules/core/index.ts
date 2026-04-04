import type {
  RuntimeModule,
  VarDeclaration,
  VarMap,
  ModuleContext,
} from '../../module'
import type { CljMap } from '../../types'
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
import { multimethodFunctions } from './stdlib/multimethods'
// --- ASYNC (experimental) ---
import { asyncFunctions } from './stdlib/async-fns'
import { printFunctions, printVars } from './stdlib/print'
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
  ...multimethodFunctions,
  ...lazyFunctions,
  ...printFunctions,
  // --- ASYNC (experimental) ---
  ...asyncFunctions,
  // --- END ASYNC ---
}

const nativeDynamicVars = {
  ...printVars,
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

          // Dynamic vars
          for (const [name, value] of Object.entries(nativeDynamicVars)) {
            map.set(name, { value, dynamic: true })
          }

          return map
        },
      },
    ],
  }
}
