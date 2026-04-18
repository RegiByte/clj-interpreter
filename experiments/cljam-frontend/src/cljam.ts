import type { ImportMap, SessionOptions } from '@regibyte/cljam'

// Mode 2 user-defined session factory.
// Returns SessionOptions only — the plugin injects `importModule` and `output`.
// The plugin scanned all .clj files for string requires and built `importMap`.
export default function cljamFactory(_importMap: ImportMap): SessionOptions {
  return {
    // Expose Math as js/Math — validates Mode 2 hostBindings work in Clojure
    hostBindings: { Math, console, document },
  }
}
