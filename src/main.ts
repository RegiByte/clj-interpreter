import './style.css'
import { createReplUI } from './repl/repl-ui'

const app = document.querySelector<HTMLDivElement>('#app')!
createReplUI(app)
