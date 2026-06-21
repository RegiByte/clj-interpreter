import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // Vitest (Node env) would resolve @regibyte/cljam to dist/index.mjs via the
    // "node" export condition. Tests must run against the live source so changes
    // are visible immediately without a rebuild step.
    //
    // Exact-match (anchored regex) per subpath, NOT a bare string prefix: a string
    // alias for '@regibyte/cljam' also rewrites '@regibyte/cljam/nrepl' to
    // 'src/core/index.ts/nrepl' (ENOTDIR). Each export subpath maps to its own
    // source entry, mirroring the package's `exports` map.
    alias: [
      { find: /^@regibyte\/cljam\/nrepl$/, replacement: resolve('../cljam/src/nrepl/nrepl.ts') },
      { find: /^@regibyte\/cljam$/, replacement: resolve('../cljam/src/core/index.ts') },
    ],
  },
})
