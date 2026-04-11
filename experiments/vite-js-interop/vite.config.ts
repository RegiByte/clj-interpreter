import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cljPlugin } from 'cljam/vite-plugin'

// Vite JS Interop Experiment
// Validates: static import table, two-mode session entrypoint, complex CLJ dependency chains.
// Built as a library (ESM), testable with Bun after build.
export default defineConfig({
  plugins: [
    react(),
    cljPlugin({
      sourceRoots: ['src/clojure'],
      // Mode 2: user-defined factory (src/conjure.ts) receives the import map
      // and can add custom hostBindings, output handlers, etc.
      entrypoint: 'src/conjure.ts',
    }),
  ],
})
