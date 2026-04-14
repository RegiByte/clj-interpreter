// cljam-schema — data-driven schema validation and JSON Schema generation for cljam.
// Inspired by malli. Schemas are plain data: keywords for primitives, vectors for compound types.
//
// Usage:
//   import { library as schemaLib } from '@regibyte/cljam-schema'
//   createSession({ ...nodePreset(), libraries: [schemaLib], allowedPackages: ['cljam-schema', 'cljam.schema'] })
//
// Then in Clojure:
//   (ns my-app (:require [cljam.schema.core :as s]))
//
//   (s/validate :string "hello")
//   ;; {:ok true :value "hello"}
//
//   (s/validate [:map [:name :string] [:age [:int {:min 0}]]] {:name "Alice" :age 30})
//   ;; {:ok true :value {:name "Alice" :age 30}}
//
//   (s/json-schema [:map [:name :string] [:age :int]])
//   ;; {:type "object" :properties {:name {:type "string"} :age {:type "integer"}} :required ["name" "age"]}

import type { CljamLibrary } from '@regibyte/cljam'
import { makeSchemaModule } from './src/native'
import { sources } from './src/generated/sources'

// ---------------------------------------------------------------------------
// Library manifest
// ---------------------------------------------------------------------------

export const library: CljamLibrary = {
  id: 'cljam-schema',
  sources,
  module: makeSchemaModule(),
}
