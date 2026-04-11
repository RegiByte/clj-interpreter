import { execSync } from 'child_process'
import { mkdirSync } from 'fs'

mkdirSync('dist-vite-plugin', { recursive: true })

execSync(
  'bun build src/vite-plugin-cljam/index.ts --outfile dist-vite-plugin/index.mjs --target node --external vite',
  { stdio: 'inherit' }
)

console.log('Built dist-vite-plugin/index.mjs')
