import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { closeBrackets } from '@codemirror/autocomplete'
import { Prec } from '@codemirror/state'
import { cljTheme, cljSyntax, highlightSource } from './theme'
import { evalSource, getAllForms, makeRepl, resetEnv } from './repl'
import type { ReplEntry, ReplState } from './repl'

// ─── History navigation state ──────────────────────────────────────────────

interface NavState {
  /** -1 = not in history mode (at current draft) */
  index: number
  /** draft saved before entering history navigation */
  draft: string
}

function makeNavState(): NavState {
  return { index: -1, draft: '' }
}

// ─── DOM helpers ────────────────────────────────────────────────────────────

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  attrs?: Record<string, string>
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      e.setAttribute(k, v)
    }
  }
  return e
}

// ─── Output entry rendering ─────────────────────────────────────────────────

function renderEntry(entry: ReplEntry): HTMLElement | HTMLElement[] {
  if (entry.kind === 'source') {
    const sourceEl = el('div', 'repl-entry__source')
    sourceEl.appendChild(highlightSource(entry.text))
    return sourceEl
  }

  if (entry.kind === 'output') {
    const outputEl = el('div', 'repl-entry__output')
    outputEl.textContent = entry.text
    return outputEl
  }

  if (entry.kind === 'result') {
    const resultEl = el('div', 'repl-entry__result repl-entry__result--ok')
    resultEl.textContent = entry.output
    return resultEl
  }

  const sourceEl = el('div', 'repl-entry__source')
  sourceEl.textContent = entry.source

  const errorEl = el('div', 'repl-entry__result repl-entry__result--error')
  errorEl.textContent = `Error: ${entry.message}`

  return [sourceEl, errorEl]
}

// ─── Editor helpers ─────────────────────────────────────────────────────────

function getEditorContent(view: EditorView): string {
  return view.state.doc.toString()
}

function setEditorContent(view: EditorView, content: string) {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: content },
    selection: { anchor: content.length },
  })
}

function clearEditor(view: EditorView) {
  setEditorContent(view, '')
}

function isAtFirstLine(view: EditorView): boolean {
  const cursor = view.state.selection.main.head
  const firstLine = view.state.doc.lineAt(0)
  return cursor <= firstLine.to
}

function isAtLastLine(view: EditorView): boolean {
  const cursor = view.state.selection.main.head
  const lastLine = view.state.doc.lineAt(view.state.doc.length)
  return cursor >= lastLine.from
}

// ─── REPL UI ─────────────────────────────────────────────────────────────────

export function createReplUI(container: HTMLElement) {
  const state: ReplState = makeRepl()
  const nav: NavState = makeNavState()

  // ── Layout skeleton ──────────────────────────────────────────────────────

  const appEl = el('div', 'repl-app')

  // Header
  const headerEl = el('header', 'repl-header')
  const titleEl = el('span', 'repl-header__title')
  titleEl.textContent = 'regibyte repl'

  const actionsEl = el('div', 'repl-header__actions')

  const copyBtn = el('button', 'repl-btn')
  copyBtn.textContent = 'copy forms'
  copyBtn.title = 'Copy all submitted forms to clipboard'

  const resetBtn = el('button', 'repl-btn repl-btn--danger')
  resetBtn.textContent = 'reset env'
  resetBtn.title = 'Reset the environment to its initial state'

  actionsEl.appendChild(copyBtn)
  actionsEl.appendChild(resetBtn)
  headerEl.appendChild(titleEl)
  headerEl.appendChild(actionsEl)

  // Output pane
  const outputEl = el('div', 'repl-output')
  const outputInnerEl = el('div', 'repl-output__inner')
  outputEl.appendChild(outputInnerEl)

  // Editor pane
  const editorWrapEl = el('div', 'repl-editor-wrap')
  const promptEl = el('span', 'repl-prompt')
  promptEl.textContent = 'λ'
  const editorMountEl = el('div', 'repl-editor-mount')
  editorWrapEl.appendChild(promptEl)
  editorWrapEl.appendChild(editorMountEl)

  appEl.appendChild(headerEl)
  appEl.appendChild(outputEl)
  appEl.appendChild(editorWrapEl)
  container.appendChild(appEl)

  // ── Submit logic ─────────────────────────────────────────────────────────

  function submit(view: EditorView) {
    const source = getEditorContent(view)
    if (!source.trim()) return

    const entriesCountBefore = state.entries.length
    evalSource(state, source)
    nav.index = -1
    nav.draft = ''
    clearEditor(view)

    // Render all new entries (includes println outputs + final result)
    const newEntries = state.entries.slice(entriesCountBefore)
    for (const newEntry of newEntries) {
      const entryEl = renderEntry(newEntry)
      if (Array.isArray(entryEl)) {
        for (const el of entryEl) {
          outputInnerEl.appendChild(el)
        }
      } else {
        outputInnerEl.appendChild(entryEl)
      }
    }

    outputEl.scrollTop = outputEl.scrollHeight
  }

  // ── Copy button ──────────────────────────────────────────────────────────

  copyBtn.addEventListener('click', () => {
    const forms = getAllForms(state)
    if (!forms) return
    navigator.clipboard.writeText(forms).then(() => {
      copyBtn.textContent = 'copied!'
      copyBtn.classList.add('repl-btn--success')
      setTimeout(() => {
        copyBtn.textContent = 'copy forms'
        copyBtn.classList.remove('repl-btn--success')
      }, 1500)
    })
  })

  // ── Reset button ─────────────────────────────────────────────────────────

  resetBtn.addEventListener('click', () => {
    resetEnv(state)
    const notice = el('div', 'repl-notice')
    notice.textContent = '— environment reset —'
    outputInnerEl.appendChild(notice)
    outputEl.scrollTop = outputEl.scrollHeight
  })

  // ── CodeMirror editor ────────────────────────────────────────────────────

  const submitKeymap = Prec.highest(
    keymap.of([
      {
        key: 'Enter',
        run(view) {
          submit(view)
          return true
        },
      },
      {
        key: 'Shift-Enter',
        // fall through so CodeMirror inserts a newline
        run() {
          return false
        },
      },
      {
        key: 'ArrowUp',
        run(view) {
          if (!isAtFirstLine(view)) return false
          if (state.history.length === 0) return false

          // Save draft on first entry into history
          if (nav.index === -1) {
            nav.draft = getEditorContent(view)
          }

          const nextIndex =
            nav.index === -1
              ? state.history.length - 1
              : Math.max(0, nav.index - 1)

          if (nextIndex === nav.index) return true // already at oldest

          nav.index = nextIndex
          setEditorContent(view, state.history[nav.index])
          return true
        },
      },
      {
        key: 'ArrowDown',
        run(view) {
          if (!isAtLastLine(view)) return false
          if (nav.index === -1) return false // not in history mode

          const nextIndex = nav.index + 1

          if (nextIndex >= state.history.length) {
            // Back to draft
            nav.index = -1
            setEditorContent(view, nav.draft)
            return true
          }

          nav.index = nextIndex
          setEditorContent(view, state.history[nav.index])
          return true
        },
      },
    ])
  )

  new EditorView({
    extensions: [
      submitKeymap,
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      lineNumbers(),
      closeBrackets(),
      cljSyntax(),
      ...cljTheme,
    ],
    parent: editorMountEl,
  })

  // Focus the editor on mount
  editorMountEl.querySelector<HTMLElement>('.cm-editor')?.focus()
}
