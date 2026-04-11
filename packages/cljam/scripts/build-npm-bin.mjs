import { readFileSync, writeFileSync, chmodSync } from 'fs'
import { execSync } from 'child_process'

const outfile = 'dist-cli/conjure-js.mjs'

execSync(`bun build src/bin/cli.ts --outfile ${outfile} --target node`, {
  stdio: 'inherit',
})

const content = readFileSync(outfile, 'utf8')
writeFileSync(outfile, '#!/usr/bin/env node\n' + content)
chmodSync(outfile, 0o755)

console.log(`Built ${outfile} with shebang`)
