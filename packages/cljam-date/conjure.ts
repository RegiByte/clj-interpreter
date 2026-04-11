// cljam-date — date handling library for cljam.
//
// Usage:
//   import { library as dateLib } from '@regibyte/cljam-date'
//   createSession({ ...nodePreset(), libraries: [dateLib], allowedPackages: ['cljam.date'] })
//
// Then in Clojure:
//   (ns my-app (:require [cljam.date :as d]))
//   (def today (d/now))
//   (def tomorrow (d/add-days today 1))
//   (println (d/to-iso tomorrow))

import type { CljamLibrary } from '@regibyte/cljam'
import { makeDateNativeModule } from './src/native'
import { sources } from './src/generated/sources'

// ---------------------------------------------------------------------------
// Library manifest
// ---------------------------------------------------------------------------

export const library: CljamLibrary = {
  id: 'cljam-date',
  sources,
  module: makeDateNativeModule(),
}
