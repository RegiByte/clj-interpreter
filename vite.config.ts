import path from 'node:path'
import { defineConfig } from 'vite'
import { cljPlugin } from './src/vite-plugin-clj/index'

export default defineConfig({
  base: '/clj-interpreter/',
  resolve: {
    alias: {
      // Direct file alias so Vite can import the formatting module without
      // being blocked by @nextjournal/clojure-mode's restrictive exports field.
      'clj-formatting': path.resolve(
        import.meta.dirname,
        'node_modules/@nextjournal/clojure-mode/dist/nextjournal/clojure_mode/extensions/formatting.mjs',
      ),
    },
  },
  plugins: [cljPlugin({ sourceRoots: ['src/clojure'] })],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        demo: 'demo.html',
      },
    },
  },
})
