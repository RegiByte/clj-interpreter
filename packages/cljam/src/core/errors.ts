import type { CljValue, Pos, StackFrame } from './types'

export class TokenizerError extends Error {
  context: unknown
  constructor(message: string, context: unknown) {
    super(message)
    this.name = 'TokenizerError'
    this.context = context
  }
}

export class ReaderError extends Error {
  context: unknown
  pos?: Pos
  constructor(message: string, context: unknown, pos?: Pos) {
    super(message)
    this.name = 'ReaderError'
    this.context = context
    this.pos = pos
  }
}

export class EvaluationError extends Error {
  context: unknown
  pos?: Pos
  data?: Record<string, unknown>
  frames?: StackFrame[]
  /**
   * Machine-readable error code for programmatic handling.
   * Known codes:
   *   'namespace/access-denied' — namespace blocked by allowedPackages
   *   'namespace/not-found'     — namespace does not exist anywhere
   */
  code?: string
  constructor(message: string, context: unknown, pos?: Pos) {
    super(message)
    this.name = 'EvaluationError'
    this.context = context
    this.pos = pos
  }

  /** Convenience factory: create an error that points at a specific argument. */
  static atArg(message: string, context: unknown, argIndex: number): EvaluationError {
    const err = new EvaluationError(message, context)
    err.data = { argIndex }
    return err
  }
}

export class CljThrownSignal {
  value: CljValue
  constructor(value: CljValue) {
    this.value = value
  }
}

