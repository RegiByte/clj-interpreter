import { defineConfig } from 'vite'
import { monaco } from '@bithero/monaco-editor-vite-plugin'

export default defineConfig({
  base: '/cljam/',
  plugins: [
    monaco({
      features: 'all',
      languages: ['clojure'], // Only include Clojure language support
      globalAPI: false,
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
})
