import { makeCoreEnv } from '../core/core-env'
import { evaluateForms, EvaluationError } from '../core/evaluator'
import { parseForms } from '../core/parser'
import { printString } from '../core/printer'
import { tokenize } from '../core/tokenizer'
import type { Env } from '../core/types'

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
  env: Env
  /** Submitted expression history for Up/Down navigation */
  history: string[]
  /** Rendered output entries */
  entries: ReplEntry[]
  /** Output collector for current evaluation */
  outputs: string[]
}

export function makeRepl(): ReplState {
  const state: ReplState = {
    env: undefined as any,
    history: [],
    entries: [],
    outputs: [],
  }
  
  // Create env with output handler that writes to state.outputs
  const outputHandler = (text: string) => {
    state.outputs.push(text)
  }
  
  state.env = makeCoreEnv(outputHandler)
  return state
}

export function evalSource(state: ReplState, source: string): ReplEntry[] {
  const trimmed = source.trim()
  if (!trimmed) return []

  state.history.push(trimmed)
  
  // Clear outputs from previous evaluation
  state.outputs = []

  try {
    const tokens = tokenize(trimmed)
    const forms = parseForms(tokens)
    if (forms.length === 0) return []

    const result = evaluateForms(forms, state.env)

    // Build entries in correct order: source, outputs, result
    const entries: ReplEntry[] = []

    // 1. Source entry
    entries.push({ kind: 'source', text: trimmed })

    // 2. Output entries from println
    for (const text of state.outputs) {
      entries.push({ kind: 'output', text })
    }

    // 3. Result entry
    entries.push({ kind: 'result', output: printString(result) })

    // Add to state
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
  // Create new env with output handler
  const outputHandler = (text: string) => {
    state.outputs.push(text)
  }
  state.env = makeCoreEnv(outputHandler)
  state.outputs = []
}

export function getAllForms(state: ReplState): string {
  return state.history.join('\n')
}
