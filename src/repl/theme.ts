import {
  HighlightStyle,
  syntaxHighlighting,
  LRLanguage,
  LanguageSupport,
  foldNodeProp,
} from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags, highlightCode, styleTags } from '@lezer/highlight'
import { parser, style_tags, fold_node_props } from '@nextjournal/clojure-mode'
import { props as formatProps } from 'clj-formatting'
import type { Extension } from '@codemirror/state'

// ─── Palette (Catppuccin Mocha, tuned for our #0d0f11 background) ─────────────

const C = {
  mauve:    '#cba6f7', // special forms, operators, defn/def/ns keywords
  teal:     '#94e2d5', // Clojure :keywords (propertyName)
  yellow:   '#f9e2af', // true / false (bool)
  peach:    '#fab387', // nil and numbers
  green:    '#a6e3a1', // strings
  red:      '#f38ba8', // regexp
  blue:     '#89b4fa', // defined function names
  subtext:  '#a6adc8', // docstrings
  overlay:  '#6c7086', // comments
  text:     '#cdd6f4', // plain variable names
}

// ─── Custom style tags ────────────────────────────────────────────────────────
//
// clojure-mode maps both "Keyword" (:foo) and "Boolean" (true/false) to
// tags.atom, making them indistinguishable in the highlight style.
// We override those two entries to use distinct tags so we can color them
// separately, then pass this into LRLanguage.define() manually.

const customStyleTags = {
  ...style_tags,
  Keyword: tags.propertyName,  // :foo → teal
  Boolean: tags.bool,          // true/false → yellow
}

// ─── Syntax highlight style ───────────────────────────────────────────────────
//
// Effective tag → clojure-mode node mapping after our overrides:
//   tags.keyword              ← DefLike (defn/def/defmacro), Operator/Symbol (=/+/cond), NS
//   tags.propertyName         ← Keyword (:foo)       ← our override
//   tags.bool                 ← Boolean (true/false)  ← our override
//   tags.null                 ← Nil
//   tags.number               ← Number
//   tags.string               ← StringContent + opening quote
//   tags.regexp               ← RegExp
//   tags.definition(variableName) ← VarName/Symbol (the name in defn foo)
//   tags.variableName         ← plain symbols
//   tags.lineComment          ← ; line comment
//   tags.comment              ← #_ discard reader macro
//   tags.emphasis             ← DocString

export const cljHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword,                          color: C.mauve },
  { tag: tags.propertyName,                     color: C.teal },
  { tag: tags.bool,                             color: C.yellow },
  { tag: tags.null,                             color: C.peach },
  { tag: tags.number,                           color: C.peach },
  { tag: tags.string,                           color: C.green },
  { tag: tags.regexp,                           color: C.red },
  { tag: tags.definition(tags.variableName),    color: C.blue, fontWeight: '600' },
  { tag: tags.variableName,                     color: C.text },
  { tag: tags.lineComment,                      color: C.overlay, fontStyle: 'italic' },
  { tag: tags.comment,                          color: C.overlay, fontStyle: 'italic' },
  { tag: tags.emphasis,                         color: C.subtext, fontStyle: 'italic' },
])

// ─── Custom language (preserves smart indentation from format.props) ──────────

const cljLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      formatProps,
      foldNodeProp.add(fold_node_props),
      styleTags(customStyleTags),
    ],
  }),
})

export function cljSyntax(): Extension {
  return new LanguageSupport(cljLanguage)
}

// ─── Editor chrome ────────────────────────────────────────────────────────────

const cljEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    fontSize: '1rem',
    fontFamily: 'var(--font-mono)',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    lineHeight: '1.6',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    borderRight: '1px solid var(--border)',
    color: 'var(--text-muted)',
  },
  '.cm-content': {
    padding: '0.5rem 0',
    minHeight: '2.4rem',
  },
  '.cm-focused': {
    outline: 'none',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: 'var(--accent)',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: '#313244 !important',
  },
  '.cm-matchingBracket': {
    color: '#a6e3a1',
    backgroundColor: 'rgba(166, 227, 161, 0.12)',
    outline: 'none',
  },
  '.cm-nonmatchingBracket': {
    color: '#f38ba8',
  },
})

// Combined extension to drop into the editor
export const cljTheme: readonly Extension[] = [
  cljEditorTheme,
  syntaxHighlighting(cljHighlightStyle),
]

// ─── Highlighted source rendering (for past REPL entries) ─────────────────────
//
// Uses the same HighlightStyle as the live editor so colors are identical.
// The CSS for the generated class names is injected automatically by CodeMirror
// when cljTheme is used in an EditorView.

export function highlightSource(source: string): HTMLElement {
  const container = document.createElement('span')
  const tree = parser.parse(source)

  highlightCode(
    source,
    tree,
    cljHighlightStyle,
    (text, classes) => {
      if (classes) {
        const span = document.createElement('span')
        span.className = classes
        span.textContent = text
        container.appendChild(span)
      } else {
        container.appendChild(document.createTextNode(text))
      }
    },
    () => {
      container.appendChild(document.createTextNode('\n'))
    },
  )

  return container
}
