import * as monaco from 'monaco-editor'
import { makeRepl, evalSource } from '../repl/repl'
import type { ReplEntry } from '../repl/repl'
import { THEME_ID, registerClojureLanguage, defineMonacoTheme } from './clojure-tokens'
import { findFormBeforeCursor } from './find-form'

// ── Monaco worker setup ──────────────────────────────────────────────────────
// Vite only resolves the worker-bundling pattern for relative paths.
// We use a thin wrapper (./editor.worker.ts) so Vite can bundle it correctly.
// Workers are created lazily on editor.create(); setting MonacoEnvironment here
// is sufficient because monaco reads it when it first needs to spawn a worker.
window.MonacoEnvironment = {
  getWorker(_moduleId: string, _label: string) {
    return new Worker(
      new URL('./editor.worker.ts', import.meta.url),
      { type: 'module' },
    )
  },
}

// ── Starter code ─────────────────────────────────────────────────────────────

const INITIAL_CODE = `\
;; Regibyte Clojure Playground — press \u2318Enter (or Ctrl+Enter) to evaluate

(defn fib [n]
  (loop [a 0 b 1 i n]
    (if (= i 0) a
      (recur b (+ a b) (dec i)))))

;; First 10 Fibonacci numbers
(map fib [0 1 2 3 4 5 6 7 8 9])
`

// ── DOM helpers ───────────────────────────────────────────────────────────────

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  return e
}

// ── Output rendering ──────────────────────────────────────────────────────────

function appendEntries(
  entries: ReplEntry[],
  outputInner: HTMLElement,
  source: string,
): void {
  const entryEl = el('div', 'pg-entry')

  // Source header — dim echo of what was evaluated
  const sourceEl = el('div', 'pg-entry__source')
  sourceEl.textContent = source
  entryEl.appendChild(sourceEl)

  for (const entry of entries) {
    if (entry.kind === 'output') {
      const outEl = el('div', 'pg-entry__output')
      outEl.textContent = entry.text
      entryEl.appendChild(outEl)
    } else if (entry.kind === 'result') {
      const resEl = el('div', 'pg-entry__result')
      resEl.textContent = `→ ${entry.output}`
      entryEl.appendChild(resEl)
    } else if (entry.kind === 'error') {
      const errEl = el('div', 'pg-entry__result pg-entry__result--error')
      errEl.textContent = `✗ ${entry.message}`
      entryEl.appendChild(errEl)
    }
  }

  outputInner.appendChild(entryEl)
}

// ── Playground bootstrap ──────────────────────────────────────────────────────

function createPlayground(appEl: HTMLElement): void {
  const state = makeRepl()

  // ── DOM skeleton ───────────────────────────────────────────────────────────

  const pgEl = el('div', 'pg')

  // Header
  const headerEl = el('header', 'pg-header')

  const leftEl = el('div', 'pg-header__left')
  const titleEl = el('span', 'pg-header__title')
  titleEl.textContent = 'Regibyte Clojure Playground'
  const hintEl = el('span', 'pg-header__hint')
  hintEl.innerHTML = '<kbd>⌘Enter</kbd> eval form &nbsp;·&nbsp; <kbd>Shift+⌘Enter</kbd> run all'
  leftEl.appendChild(titleEl)
  leftEl.appendChild(hintEl)

  const actionsEl = el('div', 'pg-header__actions')

  const runBtn = el('button', 'pg-btn pg-btn--primary')
  runBtn.textContent = 'Run all'
  runBtn.title = 'Evaluate the entire editor buffer (Shift+⌘Enter)'

  const clearBtn = el('button', 'pg-btn pg-btn--danger')
  clearBtn.textContent = 'Clear output'
  clearBtn.title = 'Clear the output panel'

  actionsEl.appendChild(runBtn)
  actionsEl.appendChild(clearBtn)
  headerEl.appendChild(leftEl)
  headerEl.appendChild(actionsEl)

  // Body
  const bodyEl = el('div', 'pg-body')
  const editorWrapEl = el('div', 'pg-editor-wrap')
  const outputEl = el('div', 'pg-output')
  const outputInnerEl = el('div', 'pg-output-inner')

  const emptyEl = el('div', 'pg-empty')
  emptyEl.innerHTML =
    'Place cursor inside a form and press <kbd>⌘Enter</kbd><br>Results appear here'

  outputEl.appendChild(outputInnerEl)
  outputEl.appendChild(emptyEl)
  bodyEl.appendChild(editorWrapEl)
  bodyEl.appendChild(outputEl)
  pgEl.appendChild(headerEl)
  pgEl.appendChild(bodyEl)
  appEl.appendChild(pgEl)

  // ── Monaco setup ───────────────────────────────────────────────────────────

  registerClojureLanguage(monaco)
  defineMonacoTheme(monaco)

  const editor = monaco.editor.create(editorWrapEl, {
    value: INITIAL_CODE,
    language: 'clojure',
    theme: THEME_ID,
    fontSize: 14,
    fontFamily:
      "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'SF Mono', ui-monospace, monospace",
    fontLigatures: true,
    lineNumbers: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 16, bottom: 16 },
    renderLineHighlight: 'gutter',
    bracketPairColorization: { enabled: false },
    // Clojure uses () [] {} — turn on bracket matching
    matchBrackets: 'always',
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
  })

  // ── Inline result widget ──────────────────────────────────────────────────
  // Monaco's `after` InjectedText relies on DOM view-lines being rendered in the
  // viewport; content widgets live in a separate always-present DOM layer and are
  // positioned absolutely by Monaco — they work regardless of scroll state.

  let inlineWidget: monaco.editor.IContentWidget | null = null
  let clearOnEdit: monaco.IDisposable | null = null

  function showInlineResult(
    endOffset: number,
    text: string,
    isError: boolean,
  ): void {
    clearInlineResult()

    const model = editor.getModel()
    if (!model) return

    // Resolve the last line of the evaluated form.
    const endCharPos = model.getPositionAt(Math.max(0, endOffset - 1))
    const line = endCharPos.lineNumber
    const col = model.getLineMaxColumn(line)

    const domNode = document.createElement('span')
    domNode.className = isError ? 'pg-inline-error' : 'pg-inline-result'
    domNode.textContent = `  ⇒ ${text}`

    const widget: monaco.editor.IContentWidget = {
      getId: () => 'pg.inline',
      getDomNode: () => domNode,
      getPosition: () => ({
        position: { lineNumber: line, column: col },
        preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
      }),
    }

    inlineWidget = widget
    editor.addContentWidget(widget)

    clearOnEdit = editor.onDidChangeModelContent(() => clearInlineResult())
  }

  function clearInlineResult(): void {
    if (inlineWidget) {
      editor.removeContentWidget(inlineWidget)
      inlineWidget = null
    }
    clearOnEdit?.dispose()
    clearOnEdit = null
  }

  // ── Eval logic ─────────────────────────────────────────────────────────────

  /**
   * Calva-style eval: find the innermost complete form whose end is closest to
   * (and ≤) the cursor, evaluate it in the persistent session, show the result
   * as an inline ghost-text decorator, and append it to the output panel.
   *
   * Falls back to evaluating the whole buffer if nothing is found before the
   * cursor (e.g. cursor is at the very start of the file).
   */
  function evalAtCursor(): void {
    const source = editor.getValue()
    if (!source.trim()) return

    const model = editor.getModel()
    const pos = editor.getPosition()
    const offset = model && pos ? model.getOffsetAt(pos) : source.length

    const form = findFormBeforeCursor(source, offset)
    const formSource = form
      ? source.slice(form.start, form.end)
      : source.trim()
    const formEnd = form ? form.end : source.trimEnd().length

    const entries = evalSource(state, formSource)
    emptyEl.style.display = 'none'
    appendEntries(entries, outputInnerEl, formSource)
    outputEl.scrollTop = outputEl.scrollHeight

    // Show inline decorator for the result (or error) of the last entry
    const last = entries[entries.length - 1]
    if (last?.kind === 'result') {
      showInlineResult(formEnd, last.output, false)
    } else if (last?.kind === 'error') {
      showInlineResult(formEnd, last.message, true)
    }
  }

  /** Evaluate the entire buffer — useful when you want to re-run everything. */
  function evalAll(): void {
    const source = editor.getValue()
    if (!source.trim()) return

    clearInlineResult()
    const entries = evalSource(state, source.trim())
    emptyEl.style.display = 'none'
    appendEntries(entries, outputInnerEl, source.trim())
    outputEl.scrollTop = outputEl.scrollHeight
  }

  // ⌘Enter → eval form at cursor
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    evalAtCursor()
  })

  // Shift+⌘Enter → eval whole buffer
  editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter,
    () => {
      evalAll()
    },
  )

  runBtn.addEventListener('click', () => evalAll())

  clearBtn.addEventListener('click', () => {
    outputInnerEl.innerHTML = ''
    emptyEl.style.display = ''
    clearInlineResult()
  })
}

createPlayground(document.getElementById('app')!)
