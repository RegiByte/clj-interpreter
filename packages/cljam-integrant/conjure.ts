// cljam-integrant — data-driven system composition for cljam.
// A faithful port of Integrant (github.com/weavejester/integrant).
//
// Usage:
//   import { library as integrantLib } from '@regibyte/cljam-integrant'
//   createSession({ ...nodePreset(), libraries: [integrantLib], allowedPackages: ['cljam.integrant'] })
//
// Then in Clojure:
//   (ns my-app (:require [cljam.integrant.core :as ig]))
//
//   (def config
//     {:app/db     {:url "postgresql://localhost/mydb"}
//      :app/server {:port 3000 :db (ig/ref :app/db)}})
//
//   (defmethod ig/init-key :app/db [_ {:keys [url]}]
//     (connect! url))
//
//   (defmethod ig/init-key :app/server [_ {:keys [port db]}]
//     (start-server! port db))
//
//   (def *system (atom nil))
//   (-> (ig/init config)
//       (then #(reset! *system %)))

import type { CljamLibrary } from '@regibyte/cljam'
import { makeIntegrantNativeModule } from './src/native'
import { sources } from './src/generated/sources'

// ---------------------------------------------------------------------------
// Library manifest
// ---------------------------------------------------------------------------

export const library: CljamLibrary = {
  id: 'cljam-integrant',
  sources,
  module: makeIntegrantNativeModule(),
}
