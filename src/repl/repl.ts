import { makeCoreEnv } from '../core/core-env'
import { evaluateForms, EvaluationError } from '../core/evaluator'
import { parseForms } from '../core/parser'
import { printString } from '../core/printer'
import { tokenize } from '../core/tokenizer'
import type { Env } from '../core/types'

export type ReplEntryOk = {
  kind: 'ok'
  source: string
  output: string
}

export type ReplEntryError = {
  kind: 'error'
  source: string
  message: string
}

export type ReplEntry = ReplEntryOk | ReplEntryError

export interface ReplState {
  env: Env
  /** Submitted expression history for Up/Down navigation */
  history: string[]
  /** Rendered output entries */
  entries: ReplEntry[]
}

export function makeRepl(): ReplState {
  return {
    env: makeCoreEnv(),
    history: [],
    entries: [],
  }
}

export function evalSource(state: ReplState, source: string): ReplEntry | null {
  const trimmed = source.trim()
  if (!trimmed) return null

  state.history.push(trimmed)

  try {
    const tokens = tokenize(trimmed)
    const forms = parseForms(tokens)
    if (forms.length === 0) return null

    const result = evaluateForms(forms, state.env)
    const entry: ReplEntryOk = {
      kind: 'ok',
      source: trimmed,
      output: printString(result),
    }
    state.entries.push(entry)
    return entry
  } catch (e) {
    const entry = makeErrorEntry(trimmed, e)
    state.entries.push(entry)
    return entry
  }
}

function makeErrorEntry(source: string, e: unknown): ReplEntryError {
  const message =
    e instanceof EvaluationError || e instanceof Error
      ? e.message
      : String(e)
  return { kind: 'error', source, message }
}

export function resetEnv(state: ReplState): void {
  state.env = makeCoreEnv()
}

export function getAllForms(state: ReplState): string {
  return state.history.join('\n')
}
