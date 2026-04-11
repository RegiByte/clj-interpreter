import type { RuntimeModule } from './module'

/**
 * CljamLibrary — the user-facing unit of capability for cljam.
 *
 * A library bundles Clojure source namespaces (as strings) and an optional
 * native RuntimeModule. Users pass libraries to createSession():
 *
 *   createSession({ ...nodePreset(), libraries: [dateLib, schemaLib] })
 *
 * Internally, createSession decomposes each library:
 *   - sources → registered in the runtime's source registry (lazy, loaded on :require)
 *   - module  → handed to runtime.installModules()
 */
export type CljamLibrary = {
  /** Unique identifier — used in error messages and deduplication. */
  id: string
  /**
   * Clojure source files, keyed by namespace name.
   * Each value is the full source text of the .clj file.
   * These namespaces become resolvable via (:require [my-lib.ns]) after the
   * library is installed — they are NOT loaded eagerly.
   */
  sources?: Record<string, string>
  /**
   * Optional native RuntimeModule — installs JS-backed functions into namespaces.
   * Use this for functions that must call into JS directly (constructors,
   * async APIs, DOM access, etc.).
   */
  module?: RuntimeModule
}
