// Auto-generated — do not edit directly.
// Re-generate with: npm run gen:core-source
//
// Browser variant: excludes namespaces not needed in browser production builds.
// Swapped in automatically by bundlers that respect the package.json "browser" field.
// Excluded:
//   - cljam.handbook
//   - clojure.test
import { cljam_vmSource } from './cljam-vm-source'
import { clojure_coreSource } from './clojure-core-source'
import { clojure_ednSource } from './clojure-edn-source'
import { clojure_mathSource } from './clojure-math-source'
import { clojure_setSource } from './clojure-set-source'
import { clojure_stringSource } from './clojure-string-source'
import { clojure_walkSource } from './clojure-walk-source'

export const builtInNamespaceSources: Record<string, () => string> = {
  'cljam.vm': () => cljam_vmSource,
  'clojure.core': () => clojure_coreSource,
  'clojure.edn': () => clojure_ednSource,
  'clojure.math': () => clojure_mathSource,
  'clojure.set': () => clojure_setSource,
  'clojure.string': () => clojure_stringSource,
  'clojure.walk': () => clojure_walkSource,
}

export function getBuiltInNamespaceSource(nsName: string): string | null {
  const loader = builtInNamespaceSources[nsName]
  return loader ? loader() : null
}
