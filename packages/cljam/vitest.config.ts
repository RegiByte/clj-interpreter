import { defineConfig } from 'vitest/config'
import { cljTestPlugin } from './src/vite-plugin-cljam/index'

export default defineConfig({
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
  },
})
