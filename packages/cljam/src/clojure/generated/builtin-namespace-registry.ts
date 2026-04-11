// Auto-generated — do not edit directly.
// Re-generate with: npm run gen:core-source
import { clojure_coreSource } from './clojure-core-source'
import { clojure_setSource } from './clojure-set-source'
import { clojure_stringSource } from './clojure-string-source'
import { clojure_walkSource } from './clojure-walk-source'

export const builtInNamespaceSources: Record<string, () => string> = {
  'clojure.core': () => clojure_coreSource,
  'clojure.set': () => clojure_setSource,
  'clojure.string': () => clojure_stringSource,
  'clojure.walk': () => clojure_walkSource,
}

export function getBuiltInNamespaceSource(nsName: string): string | null {
  const loader = builtInNamespaceSources[nsName]
  return loader ? loader() : null
}
