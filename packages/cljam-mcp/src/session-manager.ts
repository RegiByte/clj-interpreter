import {
  createSession,
  nodePreset,
  sandboxPreset,
  type Session,
  type CljamLibrary,
} from '@regibyte/cljam'
import { readFileSync } from 'node:fs'
import { resolve, isAbsolute } from 'node:path'
import { randomUUID } from 'node:crypto'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Preset = 'sandbox' | 'node'

export type SessionRecord = {
  id: string
  session: Session
  preset: Preset
  rootDir?: string
  /** IDs of libraries installed into this session (for display). */
  libraryIds: string[]
  createdAt: Date
  /** Mutable buffer — the session's output callback appends here. Reset before each eval. */
  outputBuffer: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReadFile(rootDir?: string) {
  if (!rootDir) return undefined
  return (filePath: string) => {
    const abs = isAbsolute(filePath) ? filePath : resolve(rootDir, filePath)
    return readFileSync(abs, 'utf-8')
  }
}

function makeSessionOptions(
  preset: Preset,
  rootDir: string | undefined,
  outputBuffer: string[],
  libraries?: CljamLibrary[]
) {
  const base = preset === 'node' ? nodePreset() : sandboxPreset()
  return {
    ...base,
    // Override the preset's output/stderr to capture into our buffer
    output: (text: string) => outputBuffer.push(text),
    stderr: (text: string) => outputBuffer.push(`[stderr] ${text}`),
    ...(rootDir
      ? {
          readFile: makeReadFile(rootDir),
          sourceRoots: [rootDir],
        }
      : {}),
    ...(libraries && libraries.length > 0 ? { libraries } : {}),
  }
}

// ---------------------------------------------------------------------------
// SessionManager
// ---------------------------------------------------------------------------

export class SessionManager {
  private sessions = new Map<string, SessionRecord>()

  create(preset: Preset = 'sandbox', rootDir?: string, libraries?: CljamLibrary[]): SessionRecord {
    const id = randomUUID()
    const outputBuffer: string[] = []
    const session = createSession(makeSessionOptions(preset, rootDir, outputBuffer, libraries))

    const record: SessionRecord = {
      id,
      session,
      preset,
      rootDir,
      libraryIds: (libraries ?? []).map((l) => l.id),
      createdAt: new Date(),
      outputBuffer,
    }
    this.sessions.set(id, record)
    return record
  }

  get(id: string): SessionRecord | undefined {
    return this.sessions.get(id)
  }

  delete(id: string): boolean {
    return this.sessions.delete(id)
  }

  list(): SessionRecord[] {
    return [...this.sessions.values()]
  }
}
