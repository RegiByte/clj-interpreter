import { createSession } from '@regibyte/cljam'
import type { ImportMap } from '@regibyte/cljam'

// Mode 2 user-defined session factory.
// The plugin scanned all .clj files for string requires (finding "date-fns")
// and built a static import table. This factory receives it as importMap.
//
// Users control: importModule routing, hostBindings, output, stderr, etc.
export default function conjureFactory(
  importMap: ImportMap,
  onOutput?: (text: string) => void
) {
  return createSession({
    importModule: (s) => importMap[s],
    // Expose Math as js/Math — validates Mode 2 hostBindings work in Clojure
    hostBindings: { Math, console },
    // onOutput is provided by the vite plugin to forward output to Calva (REPL :out).
    // Falls back to console.log alone if not provided (e.g. standalone use).
    output: (text) => {
      onOutput?.(text)
      console.log(text)
    },
  })
}
