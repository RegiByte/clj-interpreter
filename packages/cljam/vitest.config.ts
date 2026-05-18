import { resolve } from 'path'
import { defineConfig } from 'vitest/config'
import { cljTestPlugin } from './src/vite-plugin-cljam/index'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  resolve: {
    // When vitest (Node env) resolves @regibyte/cljam, it would normally pick
    // the "node" export condition → dist/index.mjs (compiled artifact).
    // Tests must run against the live source so changes are visible immediately
    // without a rebuild step.
    alias: {
      '@regibyte/cljam': resolve('./src/core/index.ts'),
    },
  },
  plugins: [
    // Transforms *.{test,spec}.clj files → vitest test modules.
    // Must be listed before any other plugin that handles .clj files.
    cljTestPlugin({
      sourceRoots: ['src/clojure', 'src'],
    }),
  ],
  test: {
    // Keep the default TypeScript patterns + add Clojure test files.
    include: [
      '**/*.{test,spec}.{js,mjs,cjs,jsx,ts,mts,cts,tsx}',
      '**/*.{test,spec}.clj',
    ],
    exclude: ['**/node_modules/**', '**/dist-vite-plugin/**', '**/dist/**'],
    // browser: {
    //   provider: playwright(),
    //   enabled: true,
    //   // at least one instance is required
    //   instances: [{ browser: 'chromium' }],
    // },
  },
})
