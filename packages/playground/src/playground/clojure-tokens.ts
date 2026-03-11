import { language as clojureLang } from 'monaco-editor/esm/vs/basic-languages/clojure/clojure'
import type * as Monaco from 'monaco-editor'

export const THEME_ID = 'vscode-clj-dark'

/**
 * Keep Monaco's native Clojure highlighting, but stop treating `(comment ...)`
 * as a real comment block. In Clojure that form is a macro and its contents
 * should still be tokenized as normal code.
 */
export function registerClojureLanguage(monaco: typeof Monaco): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base = clojureLang as any

  const filteredWhitespace = base.tokenizer.whitespace.filter(
    // Monaco's built-in Clojure grammar marks `(comment ... )` as comment.
    // We keep `;` comments, but drop this macro-specific rule.
    (rule: unknown) =>
      !(
        Array.isArray(rule) &&
        rule[0] instanceof RegExp &&
        rule[1] === 'comment' &&
        rule[0].source === '\\(comment\\b'
      )
  )

  monaco.languages.setMonarchTokensProvider('clojure', {
    ...base,
    specialForms: [...(base.specialForms ?? []), 'async'],
    coreSymbols: [
      ...(base.coreSymbols ?? []),
      'then',
      'catch*',
      'pending?',
      'promise-of',
      'all',
    ],
    tokenizer: {
      ...base.tokenizer,
      whitespace: filteredWhitespace,
    },
  })
}

/**
 * Small VSCode-like theme override:
 * - keep Monaco's default tokenization behavior
 * - use neutral dark background/colors similar to VS Code Dark+
 */
export function defineMonacoTheme(monaco: typeof Monaco): void {
  monaco.editor.defineTheme(THEME_ID, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment.clj', foreground: '6a9955' },
      { token: 'string.clj', foreground: 'ce9178' },
      { token: 'number.clj', foreground: 'b5cea8' },
      { token: 'keyword.clj', foreground: 'c586c0' },
      { token: 'constant.clj', foreground: '4fc1ff' },
      { token: 'meta.clj', foreground: 'd7ba7d' },
      { token: 'identifier.clj', foreground: 'd4d4d4' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#2a2d2e',
      'editorCursor.foreground': '#aeafad',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#3a3d41',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#c6c6c6',
      'editorBracketMatch.background': '#0064001a',
      'editorBracketMatch.border': '#888888',
    },
  })
}
