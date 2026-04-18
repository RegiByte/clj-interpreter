import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cljPlugin } from '@regibyte/cljam/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cljPlugin({ sourceRoots: ['src/clojure'], entrypoint: 'src/cljam.ts' })],
})
