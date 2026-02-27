import { defineConfig } from 'vite'
import { cljPlugin } from './src/vite-plugin-clj/index'

export default defineConfig({
  plugins: [cljPlugin({ sourceRoots: ['src/clojure'] })],
})
