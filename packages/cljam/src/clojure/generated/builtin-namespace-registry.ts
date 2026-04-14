// Auto-generated — do not edit directly.
// Re-generate with: npm run gen:core-source
import { cljam_handbookSource } from './cljam-handbook-source'
import { clojure_coreSource } from './clojure-core-source'
import { clojure_ednSource } from './clojure-edn-source'
import { clojure_mathSource } from './clojure-math-source'
import { clojure_setSource } from './clojure-set-source'
import { clojure_stringSource } from './clojure-string-source'
import { clojure_testSource } from './clojure-test-source'
import { clojure_walkSource } from './clojure-walk-source'

export const builtInNamespaceSources: Record<string, () => string> = {
  'cljam.handbook': () => cljam_handbookSource,
  'clojure.core': () => clojure_coreSource,
  'clojure.edn': () => clojure_ednSource,
  'clojure.math': () => clojure_mathSource,
  'clojure.set': () => clojure_setSource,
  'clojure.string': () => clojure_stringSource,
  'clojure.test': () => clojure_testSource,
  'clojure.walk': () => clojure_walkSource,
}

export function getBuiltInNamespaceSource(nsName: string): string | null {
  const loader = builtInNamespaceSources[nsName]
  return loader ? loader() : null
}
