import { language as clojureLang } from 'monaco-editor/esm/vs/basic-languages/clojure/clojure'
import type * as Monaco from 'monaco-editor'

export const THEME_ID = 'github-dark-clj'

/**
 * Override Monaco's built-in Clojure Monarch tokenizer to distinguish token
 * types that the default grammar collapses into a single "constant" bucket:
 *
 *   :keywords  → "keyword.key"     (teal)
 *   true/false → "constant.language" (yellow)
 *   nil        → "constant.other"  (peach)
 *
 * This mirrors the same tag-level distinction we achieved in CodeMirror by
 * building LRLanguage manually.
 */
export function registerClojureLanguage(monaco: typeof Monaco): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base = clojureLang as any

  const customLang = {
    ...base,
    // Split the original "constants" array into separate typed arrays so the
    // Monarch `cases` matcher can emit distinct token names for each group.
    booleans: ['true', 'false'],
    nil: ['nil'],
    constants: [], // intentionally empty — handled by booleans/nil above
    tokenizer: {
      ...base.tokenizer,
      root: [
        // Keep all existing rules (whitespace, numbers, strings, brackets,
        // regexps, reader macros) and only replace the symbol-matching rule
        // at the end of the array.
        ...base.tokenizer.root.slice(0, -1),
        [
          base.qualifiedSymbols,
          {
            cases: {
              '^:.+$': 'keyword.key',        // :foo, :ns/foo  → teal
              '@specialForms': 'keyword',    // def, if, let … → mauve
              '@coreSymbols': 'keyword',     // defn, map, fn … → mauve
              '@booleans': 'constant.language', // true, false → yellow
              '@nil': 'constant.other',      // nil            → peach
              '@default': 'identifier',      // user symbols   → base text
            },
          },
        ],
      ],
    },
  }

  monaco.languages.setMonarchTokensProvider('clojure', customLang)
}

/**
 * Register the GitHub Dark theme for Monaco.
 * Colours are sourced from primer/primitives (dark palette).
 * Token names include the `.clj` postfix appended by the Monarch tokenizer.
 *
 * Palette reference (dark):
 *   fg.default          #e6edf3   base text
 *   fg.muted            #8b949e   dim text / line numbers
 *   canvas.default      #0d1117   editor background
 *   canvas.subtle       #161b22   line highlight / header
 *   border.default      #30363d   borders
 *   scale.gray[3]       #8b949e   comments
 *   scale.red[3]        #ff7b72   keywords (def, fn, if…)
 *   scale.blue[1]       #79c0ff   strings / numbers
 *   scale.blue[2]       #a5d6ff   :keywords / constants / nil
 *   scale.purple[2]     #d2a8ff   function definitions
 *   scale.orange[2]     #ffa657   reader macros
 *   scale.green[1]      #7ee787   success (accent)
 *   accent.fg           #58a6ff   cursor / selection
 */
export function defineMonacoTheme(monaco: typeof Monaco): void {
  monaco.editor.defineTheme(THEME_ID, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword.clj',           foreground: 'ff7b72' }, // def, fn, if…   — red
      { token: 'keyword.key.clj',       foreground: 'a5d6ff' }, // :keywords      — blue constant
      { token: 'constant.language.clj', foreground: 'a5d6ff' }, // true / false   — blue
      { token: 'constant.other.clj',    foreground: 'a5d6ff' }, // nil            — blue
      { token: 'number.clj',            foreground: '79c0ff' }, // numbers        — light blue
      { token: 'string.clj',            foreground: '79c0ff' }, // strings        — light blue
      { token: 'string.escape.clj',     foreground: '79c0ff' }, // escape sequences
      { token: 'comment.clj',           foreground: '8b949e', fontStyle: 'italic' },
      { token: 'identifier.clj',        foreground: 'e6edf3' }, // user symbols   — base text
      { token: 'delimiter.clj',         foreground: '6e7781' }, // parens/brackets — subdued
      { token: 'meta.clj',              foreground: 'ffa657' }, // reader macros  — orange
    ],
    colors: {
      'editor.background':                  '#0d1117',
      'editor.foreground':                  '#e6edf3',
      'editor.lineHighlightBackground':     '#161b2280',
      'editorCursor.foreground':            '#58a6ff',
      'editor.selectionBackground':         '#264f7840',
      'editor.inactiveSelectionBackground': '#264f7820',
      'editorLineNumber.foreground':        '#6e7781',
      'editorLineNumber.activeForeground':  '#e6edf3',
      'editorBracketMatch.background':      '#3392ff22',
      'editorBracketMatch.border':          '#58a6ff',
      'editorIndentGuide.background1':      '#21262d',
      'editorIndentGuide.activeBackground1':'#30363d',
      'scrollbarSlider.background':         '#30363d55',
      'scrollbarSlider.hoverBackground':    '#484f5844',
      'editorWidget.background':            '#161b22',
      'editorSuggestWidget.background':     '#161b22',
      'editorSuggestWidget.border':         '#30363d',
    },
  })
}
