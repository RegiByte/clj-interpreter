declare module '@nextjournal/clojure-mode' {
  import type { Extension } from '@codemirror/state'
  export function syntax(): Extension
  export const default_extensions: Extension[]
  export const complete_keymap: readonly import('@codemirror/view').KeyBinding[]
}
