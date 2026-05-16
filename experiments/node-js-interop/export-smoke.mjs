import { createSession, printString } from '@regibyte/cljam'
import { startNreplServer } from '@regibyte/cljam/nrepl'

const session = createSession()
const result = printString(session.evaluate('(+ 20 22)'))

if (result !== '42') {
  throw new Error(`@regibyte/cljam evaluate smoke returned ${result}`)
}

if (typeof startNreplServer !== 'function') {
  throw new Error('@regibyte/cljam/nrepl did not export startNreplServer')
}

console.log('package export smoke passed')
