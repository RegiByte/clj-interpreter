import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cljPlugin } from 'cljam/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cljPlugin({
      sourceRoots: ['src/clojure'],
      nreplPort: 7888,
    }),
  ],
})
