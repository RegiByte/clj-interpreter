import macrosSource from '../clojure/macros.clj?raw'
import { EvaluationError } from '../core/evaluator'
import { printString } from '../core/printer'
import { createSession } from '../core/session'
import type { Session } from '../core/session'

export type ReplEntrySource = {
  kind: 'source'
  text: string
}

export type ReplEntryResult = {
  kind: 'result'
  output: string
}

export type ReplEntryError = {
  kind: 'error'
  source: string
  message: string
}

export type ReplEntryOutput = {
  kind: 'output'
  text: string
}

export type ReplEntry =
  | ReplEntrySource
  | ReplEntryResult
  | ReplEntryError
  | ReplEntryOutput

export interface ReplState {
  session: Session
  /** Submitted expression history for Up/Down navigation */
  history: string[]
  /** Rendered output entries */
  entries: ReplEntry[]
  /** Output collector for current evaluation */
  outputs: string[]
}

function makeSession(addOutput: (text: string) => void): Session {
  return createSession({
    output: addOutput,
    entries: [macrosSource],
  })
}

export function makeRepl(): ReplState {
  const state: ReplState = {
    session: undefined as unknown as Session,
    history: [],
    entries: [],
    outputs: [],
  }
  state.session = makeSession((text) => state.outputs.push(text))
  return state
}

export function evalSource(state: ReplState, source: string): ReplEntry[] {
  const trimmed = source.trim()
  if (!trimmed) return []

  state.history.push(trimmed)

  // Clear outputs from previous evaluation
  state.outputs = []

  try {
    const result = state.session.evaluate(trimmed)

    // Build entries in correct order: source, outputs, result
    const entries: ReplEntry[] = []

    entries.push({ kind: 'source', text: trimmed })

    for (const text of state.outputs) {
      entries.push({ kind: 'output', text })
    }

    entries.push({ kind: 'result', output: printString(result) })

    state.entries.push(...entries)
    return entries
  } catch (e) {
    const entry = makeErrorEntry(trimmed, e)
    state.entries.push(entry)
    return [entry]
  }
}

function makeErrorEntry(source: string, e: unknown): ReplEntryError {
  const message =
    e instanceof EvaluationError || e instanceof Error ? e.message : String(e)
  return { kind: 'error', source, message }
}

export function resetEnv(state: ReplState): void {
  state.outputs = []
  state.session = makeSession((text) => state.outputs.push(text))
}

export function getAllForms(state: ReplState): string {
  return state.history.join('\n')
}
