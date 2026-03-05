import { defineConfig } from 'vite'
import { cljPlugin } from './src/vite-plugin-clj/index'

export default defineConfig({
  base: '/clj-interpreter/',
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
