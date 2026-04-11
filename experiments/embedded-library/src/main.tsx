import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { createSession, printString } from 'cljam'
import { foo } from './clojure/webrepl.clj'

console.log(foo)

const session = createSession({
  output: (text) => console.log(text),
  sourceRoots: ['src/clojure'],
  readFile: (path) => import.meta.resolve(path),
})

const result = session.evaluate('(map inc [1 2 3])')
console.log(printString(result)) // (2 3 4)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
