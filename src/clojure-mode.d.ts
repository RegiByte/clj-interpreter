declare module '@nextjournal/clojure-mode' {
  import type { Extension } from '@codemirror/state'
  import type { Tree, SyntaxNode } from '@lezer/common'
  import type { Tag } from '@lezer/highlight'
  import type { LRParser } from '@lezer/lr'
  export function syntax(): Extension
  export const default_extensions: Extension[]
  export const complete_keymap: readonly import('@codemirror/view').KeyBinding[]
  export const parser: LRParser & { parse(input: string): Tree }
  export const style_tags: Record<string, Tag | readonly Tag[]>
  export const fold_node_props: Record<
    string,
    (node: SyntaxNode) => { from: number; to: number } | null
  >
}

declare module 'clj-formatting' {
  import type { NodePropSource } from '@lezer/common'
  export const props: NodePropSource
}

// Monaco internal sub-paths not listed in its exports field.
declare module 'monaco-editor/esm/vs/basic-languages/clojure/clojure' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const conf: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const language: any
}

declare module 'monaco-editor/esm/vs/editor/editor.worker' {
  // Side-effect only import — no exports.
}
